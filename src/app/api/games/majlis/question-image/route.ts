import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COLLECTION = "majlisGameSessions";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function safeRemoteImage(value: unknown) {
  const url = new URL(text(value));
  if (url.protocol !== "https:") throw new Error("مصدر الصورة غير آمن.");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "0.0.0.0" || hostname === "::1" || /^127\./.test(hostname) || /^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^169\.254\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) {
    throw new Error("مصدر الصورة غير مسموح.");
  }
  return url.toString();
}

async function fetchRemoteImage(value: unknown, init: RequestInit) {
  let current = safeRemoteImage(value);
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    const response = await fetch(current, { ...init, redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    response.body?.cancel().catch(() => undefined);
    if (!location || redirects === 5) throw new Error("إعادة توجيه الصورة غير صالحة.");
    current = safeRemoteImage(new URL(location, current).toString());
  }
  throw new Error("إعادة توجيه الصورة غير صالحة.");
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = text(request.nextUrl.searchParams.get("sessionId"));
    const imageId = text(request.nextUrl.searchParams.get("imageId"));
    if (!sessionId || !imageId || sessionId.length > 80 || imageId.length > 80) throw new Error("طلب الصورة غير مكتمل.");

    const snap = await adminDb.collection(SESSION_COLLECTION).doc(sessionId).get();
    if (!snap.exists) throw new Error("انتهت جلسة المجلس.");
    const session = snap.data() || {};
    if (!Number(session.expiresAt) || Date.now() > Number(session.expiresAt)) throw new Error("انتهت جلسة المجلس.");
    const assets = Array.isArray(session.imageAssets) ? session.imageAssets as Array<Record<string, unknown>> : [];
    const asset = assets.find((row) => text(row.imageId) === imageId);
    if (!asset) throw new Error("الصورة غير متاحة لهذه الجلسة.");

    const response = await fetchRemoteImage(asset.source, {
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8" },
    });
    if (!response.ok) throw new Error("تعذر تحميل صورة السؤال.");
    const contentType = text(response.headers.get("content-type")).split(";")[0];
    if (!contentType.startsWith("image/")) throw new Error("الملف المستلم ليس صورة.");
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_IMAGE_BYTES) throw new Error("حجم صورة السؤال كبير جدًا.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("حجم صورة السؤال كبير جدًا.");
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=900",
        "Content-Disposition": "inline; filename=majlis-question-image",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تحميل صورة السؤال.";
    return NextResponse.json({ error: message }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
}
