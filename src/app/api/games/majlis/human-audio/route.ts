import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const HF_DATASET_SERVER = "https://datasets-server.huggingface.co";
const NADI_DATASET = "UBC-NLP/NADI_2026_ADI20_micro";
const FLEURS_ARCHIVE_ROOT = "https://huggingface.co/datasets/google/fleurs/resolve/main/data";
const SESSION_COLLECTION = "majlisGameSessions";
const NADI_ROW_BASE: Record<string, number> = {
  BAH: 5000, TUN: 8000, ALG: 11500, EGY: 14000, IRA: 17000, JOR: 20500,
  KSA: 23000, KUW: 26000, LEB: 29000, LIB: 32000, MOR: 38000, OMA: 41000,
  PAL: 45000, QAT: 48000, SUD: 53000, SYR: 56000, UAE: 60000, YEM: 64000,
};

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

function safeRemoteAudio(value: unknown) {
  const url = new URL(text(value));
  if (url.protocol !== "https:") throw new Error("AUDIO_SOURCE_PROTOCOL");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "0.0.0.0" || hostname === "::1" || /^127\./.test(hostname) || /^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^169\.254\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) {
    throw new Error("AUDIO_SOURCE_PRIVATE");
  }
  return url.toString();
}

function findAudioSrc(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return /^https:\/\//i.test(value) ? value : "";
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
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`HF_${path}_${response.status}`);
  return response.json() as Promise<{ rows?: DatasetRow[] }>;
}

async function nadiSource(questionId: string, dialectCode: string, retry: number) {
  const safeCode = dialectCode.replace(/[^A-Z]/g, "").slice(0, 4);
  const base = NADI_ROW_BASE[safeCode];
  if (!safeCode || base === undefined) throw new Error("NADI_CODE_INVALID");
  // NADI is grouped by dialect. Interior windows avoid the viewer's expensive
  // global filter while the browser still receives neither the code nor raw URL.
  const offset = base + ((stableHash(`${questionId}:${retry}`) + retry * 97) % 800);
  const params = new URLSearchParams({
    dataset: NADI_DATASET,
    config: "default",
    split: "train",
    offset: String(offset),
    length: "1",
  });
  const json = await fetchDatasetJson("rows", params);
  if (text(json.rows?.[0]?.row?.dialect) !== safeCode) throw new Error("NADI_DIALECT_MISMATCH");
  const src = findAudioSrc(json.rows?.[0]);
  if (!src) throw new Error("NADI_AUDIO_SRC_MISSING");
  return src;
}

async function safeRemoteFetch(value: string, init: RequestInit, maxRedirects = 5) {
  let current = safeRemoteAudio(value);
  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    const response = await fetch(current, { ...init, redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    response.body?.cancel().catch(() => undefined);
    if (!location || redirects === maxRedirects) throw new Error("AUDIO_REDIRECT_INVALID");
    current = safeRemoteAudio(new URL(location, current).toString());
  }
  throw new Error("AUDIO_REDIRECT_INVALID");
}

async function extractTarWav(response: Response, targetIndex: number) {
  if (!response.body) throw new Error("FLEURS_ARCHIVE_EMPTY");
  const input = Readable.fromWeb(response.body as never);
  const gunzip = createGunzip();
  input.pipe(gunzip);

  let pending = Buffer.alloc(0);
  let remaining = 0;
  let padding = 0;
  let capture = false;
  let wavIndex = 0;
  let scanned = 0;
  const captured: Buffer[] = [];

  try {
    for await (const rawChunk of gunzip) {
      const chunk = Buffer.from(rawChunk as Uint8Array);
      scanned += chunk.length;
      if (scanned > 64 * 1024 * 1024) throw new Error("FLEURS_ARCHIVE_SCAN_LIMIT");
      pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;

      while (pending.length) {
        if (remaining > 0) {
          const take = Math.min(remaining, pending.length);
          if (capture) captured.push(Buffer.from(pending.subarray(0, take)));
          pending = pending.subarray(take);
          remaining -= take;
          if (remaining === 0 && capture) return Buffer.concat(captured);
          continue;
        }
        if (padding > 0) {
          const take = Math.min(padding, pending.length);
          pending = pending.subarray(take);
          padding -= take;
          continue;
        }
        if (pending.length < 512) break;

        const header = pending.subarray(0, 512);
        pending = pending.subarray(512);
        if (header.every((byte) => byte === 0)) throw new Error("FLEURS_WAV_NOT_FOUND");
        const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
        const sizeText = header.subarray(124, 136).toString("ascii").replace(/\0.*$/, "").trim();
        const size = Number.parseInt(sizeText || "0", 8);
        if (!Number.isFinite(size) || size < 0 || size > 8 * 1024 * 1024) throw new Error("FLEURS_TAR_ENTRY_INVALID");
        const isWav = /\.wav$/i.test(name);
        capture = isWav && wavIndex === targetIndex;
        if (isWav) wavIndex += 1;
        remaining = size;
        padding = (512 - (size % 512)) % 512;
        if (remaining === 0 && capture) return Buffer.alloc(0);
      }
    }
  } finally {
    gunzip.destroy();
    input.destroy();
  }
  throw new Error("FLEURS_WAV_NOT_FOUND");
}

function bufferedAudioResponse(request: NextRequest, audio: Buffer) {
  const range = request.headers.get("range");
  let start = 0;
  let end = audio.length - 1;
  let status = 200;
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/i.exec(range.trim());
    if (!match) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${audio.length}` } });
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), end) : end;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= audio.length) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${audio.length}` } });
    }
    status = 206;
  }
  const body = new Uint8Array(audio.subarray(start, end + 1));
  const headers = new Headers({
    "Content-Type": "audio/wav",
    "Content-Length": String(body.byteLength),
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    "X-Majlis-Audio": "human-recording",
  });
  if (status === 206) headers.set("Content-Range", `bytes ${start}-${end}/${audio.length}`);
  return new NextResponse(body, { status, headers });
}

async function fleursAudio(request: NextRequest, questionId: string, config: string, retry: number) {
  if (!/^[a-z0-9_]+$/i.test(config)) throw new Error("FLEURS_CONFIG_INVALID");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    // Stream only the beginning of the official archive and stop after a small,
    // deterministic WAV index. This bypasses the oversized Parquet viewer.
    const archiveUrl = `${FLEURS_ARCHIVE_ROOT}/${config}/audio/dev.tar.gz`;
    const upstream = await safeRemoteFetch(archiveUrl, {
      headers: { "User-Agent": "Altahaddi-Majlis/18.0 (+https://world-cup-platform.vercel.app)" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!upstream.ok) throw new Error(`FLEURS_ARCHIVE_${upstream.status}`);
    const targetIndex = (stableHash(`${questionId}:${retry}:fleurs`) + retry * 5) % 8;
    const audio = await extractTarWav(upstream, targetIndex);
    if (audio.length < 44) throw new Error("FLEURS_WAV_INVALID");
    return bufferedAudioResponse(request, audio);
  } finally {
    clearTimeout(timeout);
  }
}

async function proxyAudio(request: NextRequest, sourceUrl: string) {
  const range = request.headers.get("range");
  const upstream = await safeRemoteFetch(sourceUrl, {
    headers: {
      "User-Agent": "Altahaddi-Majlis/17.0 (+https://world-cup-platform.vercel.app)",
      ...(range ? { Range: range } : {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!upstream.ok && upstream.status !== 206) throw new Error(`AUDIO_UPSTREAM_${upstream.status}`);

  const contentType = text(upstream.headers.get("content-type")).toLowerCase();
  if (contentType && !contentType.startsWith("audio/") && !contentType.startsWith("application/octet-stream")) {
    upstream.body?.cancel().catch(() => undefined);
    throw new Error("AUDIO_CONTENT_TYPE_INVALID");
  }

  const headers = new Headers();
  headers.set("Content-Type", contentType || "audio/mpeg");
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
    const sessionId = text(request.nextUrl.searchParams.get("sessionId"));
    const audioId = text(request.nextUrl.searchParams.get("audioId"));
    const retry = Math.max(0, Math.min(2, Math.floor(number(request.nextUrl.searchParams.get("retry"), 0))));
    if (!sessionId || !audioId) return NextResponse.json({ error: "AUDIO_ACCESS_REQUIRED" }, { status: 400 });

    const snap = await adminDb.collection(SESSION_COLLECTION).doc(sessionId).get();
    if (!snap.exists) return NextResponse.json({ error: "AUDIO_SESSION_EXPIRED" }, { status: 404 });
    const session = snap.data() || {};
    if (number(session.expiresAt) < Date.now()) return NextResponse.json({ error: "AUDIO_SESSION_EXPIRED" }, { status: 410 });
    const assets = Array.isArray(session.audioAssets) ? session.audioAssets as Array<Record<string, unknown>> : [];
    const asset = assets.find((item) => text(item.audioId) === audioId);
    if (!asset) return NextResponse.json({ error: "AUDIO_NOT_AVAILABLE" }, { status: 404 });

    let sourceUrl = "";
    const sourceKey = text(asset.audioSourceKey);
    const categoryId = text(asset.categoryId);
    const questionKey = text(asset.questionId) || audioId;
    const sources = Array.isArray(asset.sources) ? asset.sources.map(text).filter((value) => /^https:\/\//i.test(value)).slice(0, 3) : [];

    if (categoryId === "reciter" || (!sourceKey.startsWith("nadi:") && !sourceKey.startsWith("fleurs:"))) {
      // Raw URLs remain in the private session document and rotate primary/fallback1/fallback2.
      sourceUrl = sources[retry] || sources[0] || "";
    } else if (sourceKey.startsWith("nadi:")) {
      sourceUrl = await nadiSource(questionKey, sourceKey.slice("nadi:".length), retry);
    } else if (sourceKey.startsWith("fleurs:")) {
      return fleursAudio(request, questionKey, sourceKey.slice("fleurs:".length), retry);
    }

    if (!/^https:\/\//i.test(sourceUrl)) return NextResponse.json({ error: "HUMAN_AUDIO_SOURCE_MISSING" }, { status: 404 });
    return proxyAudio(request, sourceUrl);
  } catch (error) {
    console.error("Majlis human audio error:", error);
    return NextResponse.json({ error: "تعذر تحميل التسجيل البشري، جرّب المقطع البديل." }, { status: 502 });
  }
}
