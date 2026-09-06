import { NextRequest, NextResponse } from "next/server";
import { getEffectiveMajlisBank } from "@/lib/serverMajlisQuestionBank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const ALLOWED_CODES = new Set([
  "arz", "ajp", "apc", "ary", "arq", "apd",
  "eng", "fra", "spa", "deu", "ita", "por", "rus", "tur", "nld", "pol",
  "swe", "fin", "ces", "hun", "ron", "ell", "jpn", "kor", "hin", "ind",
]);

type CommonsPage = {
  title?: string;
  imageinfo?: Array<{ url?: string; mime?: string }>;
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

async function commonsCandidates(code: string) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "categorymembers",
    gcmtitle: `Category:Lingua Libre pronunciation-${code}`,
    gcmtype: "file",
    gcmnamespace: "6",
    gcmlimit: "50",
    prop: "imageinfo",
    iiprop: "url|mime",
  });
  const response = await fetch(`${COMMONS_API}?${params.toString()}`, {
    headers: { "User-Agent": "Altahaddi-Majlis/16.0 (+https://world-cup-platform.vercel.app)" },
    next: { revalidate: 86400 },
  });
  if (!response.ok) throw new Error(`COMMONS_${response.status}`);
  const json = await response.json() as { query?: { pages?: Record<string, CommonsPage> } };
  return Object.values(json.query?.pages || {})
    .map((page) => ({ title: text(page.title), url: text(page.imageinfo?.[0]?.url), mime: text(page.imageinfo?.[0]?.mime) }))
    .filter((item) => item.url && (item.mime.startsWith("audio/") || /\.(wav|ogg|oga|mp3|webm)$/i.test(item.url)));
}

export async function GET(request: NextRequest) {
  try {
    const questionId = text(request.nextUrl.searchParams.get("questionId"));
    const retry = Math.max(0, Math.min(4, Math.floor(number(request.nextUrl.searchParams.get("retry"), 0))));
    if (!questionId) return NextResponse.json({ error: "QUESTION_REQUIRED" }, { status: 400 });

    const bank = await getEffectiveMajlisBank();
    const question = bank.questions.find((item) => item.id === questionId && item.enabled);
    if (!question?.audioSourceKey?.startsWith("commons:")) return NextResponse.json({ error: "AUDIO_NOT_AVAILABLE" }, { status: 404 });
    const code = question.audioSourceKey.slice("commons:".length);
    if (!ALLOWED_CODES.has(code)) return NextResponse.json({ error: "AUDIO_SOURCE_NOT_ALLOWED" }, { status: 400 });

    const candidates = await commonsCandidates(code);
    if (!candidates.length) return NextResponse.json({ error: "NO_HUMAN_AUDIO" }, { status: 404 });
    const index = (stableHash(`${questionId}:${retry}`) + retry * 17) % candidates.length;
    const selected = candidates[index]!;

    const range = request.headers.get("range");
    const upstream = await fetch(selected.url, {
      headers: {
        "User-Agent": "Altahaddi-Majlis/16.0 (+https://world-cup-platform.vercel.app)",
        ...(range ? { Range: range } : {}),
      },
      cache: "force-cache",
    });
    if (!upstream.ok && upstream.status !== 206) throw new Error(`UPSTREAM_${upstream.status}`);

    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") || selected.mime || "audio/wav");
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Majlis-Audio-License-Source", "Wikimedia-Commons-Lingua-Libre");
    for (const name of ["content-length", "content-range", "accept-ranges"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    console.error("Majlis human audio error:", error);
    return NextResponse.json({ error: "تعذر تحميل التسجيل البشري." }, { status: 502 });
  }
}
