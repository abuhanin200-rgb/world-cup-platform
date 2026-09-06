import { NextRequest, NextResponse } from "next/server";
import { getEffectiveMajlisBank } from "@/lib/serverMajlisQuestionBank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const HF_DATASET_SERVER = "https://datasets-server.huggingface.co";
const NADI_DATASET = "UBC-NLP/NADI_2026_ADI20_micro";
const FLEURS_DATASET = "google/fleurs";

function text(value: unknown) { return String(value ?? "").trim(); }
function number(value: unknown, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function stableHash(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function findAudioSrc(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return /^https?:\/\//i.test(value) ? value : "";
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findAudioSrc(item);
      if (found) return found;
    }
    return "";
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of ["src", "url", "href"]) {
      const found = findAudioSrc(obj[key]);
      if (found) return found;
    }
    for (const key of ["audio", "row", "value", "data"]) {
      const found = findAudioSrc(obj[key]);
      if (found) return found;
    }
  }
  return "";
}

type DatasetRow = { row?: Record<string, unknown> };

async function fetchDatasetJson(path: string, params: URLSearchParams) {
  const response = await fetch(`${HF_DATASET_SERVER}/${path}?${params.toString()}`, {
    headers: { "User-Agent": "Altahaddi-Majlis/17.0 (+https://world-cup-platform.vercel.app)" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HF_${path}_${response.status}`);
  return response.json() as Promise<{ rows?: DatasetRow[] }>;
}

async function nadiSource(questionId: string, dialectCode: string, retry: number) {
  const safeCode = dialectCode.replace(/[^A-Z]/g, "").slice(0, 4);
  if (!safeCode) throw new Error("NADI_CODE_INVALID");
  // The dataset is intentionally filtered server-side. The browser never receives the dialect code.
  const where = `\"dialect\"='${safeCode}'`;
  const offset = (stableHash(`${questionId}:${retry}`) + retry * 97) % 1200;
  const params = new URLSearchParams({
    dataset: NADI_DATASET,
    config: "default",
    split: "train",
    where,
    offset: String(offset),
    length: "1",
  });
  const json = await fetchDatasetJson("filter", params);
  const src = findAudioSrc(json.rows?.[0]);
  if (!src) throw new Error("NADI_AUDIO_SRC_MISSING");
  return src;
}

async function fleursSource(questionId: string, config: string, retry: number) {
  if (!/^[a-z0-9_]+$/i.test(config)) throw new Error("FLEURS_CONFIG_INVALID");

  // Prefer 9–17.5 second utterances (FLEURS is 16 kHz and exposes num_samples).
  // `filter` may be unavailable for some large viewer shards, therefore `first-rows` is a fallback.
  const where = `\"num_samples\">=144000 AND \"num_samples\"<=280000`;
  try {
    const offset = (stableHash(`${questionId}:${retry}`) + retry * 53) % 300;
    const params = new URLSearchParams({
      dataset: FLEURS_DATASET,
      config,
      split: "train",
      where,
      offset: String(offset),
      length: "1",
    });
    const json = await fetchDatasetJson("filter", params);
    const src = findAudioSrc(json.rows?.[0]);
    if (src) return src;
  } catch {
    // Fall through to cached first rows.
  }

  const params = new URLSearchParams({ dataset: FLEURS_DATASET, config, split: "train" });
  const json = await fetchDatasetJson("first-rows", params);
  const rows = json.rows || [];
  const candidates = rows.filter((entry) => {
    const samples = Number(entry.row?.num_samples || 0);
    return samples >= 128000 && samples <= 288000 && Boolean(findAudioSrc(entry));
  });
  const pool = candidates.length ? candidates : rows.filter((entry) => Boolean(findAudioSrc(entry)));
  if (!pool.length) throw new Error("FLEURS_AUDIO_SRC_MISSING");
  const picked = pool[(stableHash(`${questionId}:${retry}:fleurs`) + retry * 31) % pool.length]!;
  const src = findAudioSrc(picked);
  if (!src) throw new Error("FLEURS_AUDIO_SRC_MISSING");
  return src;
}

async function proxyAudio(request: NextRequest, sourceUrl: string) {
  const range = request.headers.get("range");
  const upstream = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "Altahaddi-Majlis/17.0 (+https://world-cup-platform.vercel.app)",
      ...(range ? { Range: range } : {}),
    },
    cache: "no-store",
    redirect: "follow",
  });
  if (!upstream.ok && upstream.status !== 206) throw new Error(`AUDIO_UPSTREAM_${upstream.status}`);

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") || "audio/mpeg");
  headers.set("Cache-Control", "private, max-age=3600");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Majlis-Audio", "human-recording");
  for (const name of ["content-length", "content-range", "accept-ranges"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}

export async function GET(request: NextRequest) {
  try {
    const questionId = text(request.nextUrl.searchParams.get("questionId"));
    const retry = Math.max(0, Math.min(6, Math.floor(number(request.nextUrl.searchParams.get("retry"), 0))));
    if (!questionId) return NextResponse.json({ error: "QUESTION_REQUIRED" }, { status: 400 });

    const bank = await getEffectiveMajlisBank();
    const question = bank.questions.find((item) => item.id === questionId && item.enabled && item.type === "audio");
    if (!question) return NextResponse.json({ error: "AUDIO_NOT_AVAILABLE" }, { status: 404 });

    let sourceUrl = "";
    const sourceKey = text(question.audioSourceKey);

    if (question.categoryId === "reciter") {
      // Reciter URLs are never returned to the browser; rotate to fallback on retry.
      sourceUrl = retry % 2 === 1
        ? (text(question.audioFallbackUrl) || text(question.audioUrl))
        : (text(question.audioUrl) || text(question.audioFallbackUrl));
    } else if (sourceKey.startsWith("nadi:")) {
      sourceUrl = await nadiSource(questionId, sourceKey.slice("nadi:".length), retry);
    } else if (sourceKey.startsWith("fleurs:")) {
      sourceUrl = await fleursSource(questionId, sourceKey.slice("fleurs:".length), retry);
    }

    if (!/^https?:\/\//i.test(sourceUrl)) return NextResponse.json({ error: "HUMAN_AUDIO_SOURCE_MISSING" }, { status: 404 });
    return proxyAudio(request, sourceUrl);
  } catch (error) {
    console.error("Majlis human audio error:", error);
    return NextResponse.json({ error: "تعذر تحميل التسجيل البشري، جرّب المقطع البديل." }, { status: 502 });
  }
}
