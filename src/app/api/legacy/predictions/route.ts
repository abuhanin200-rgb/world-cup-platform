import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import {
  LegacyPredictionSubmissionError,
  saveLegacyPredictionOnServer,
} from "@/lib/serverLegacyPredictions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function bearerToken(request: NextRequest) {
  const [scheme, token] = (request.headers.get("authorization") || "").split(" ");
  if (scheme !== "Bearer" || !token) throw new Error("UNAUTHORIZED");
  return token;
}

export async function POST(request: NextRequest) {
  try {
    const decoded = await adminAuth.verifyIdToken(bearerToken(request));
    const input = await request.json();
    const result = await saveLegacyPredictionOnServer(decoded.uid, input || {});
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof LegacyPredictionSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    if (!unauthorized) console.error("Legacy prediction save error:", error);
    return NextResponse.json(
      { error: unauthorized ? "سجّل الدخول مرة أخرى لحفظ توقعك." : "تعذر حفظ التوقع الآن." },
      { status: unauthorized ? 401 : 500 },
    );
  }
}
