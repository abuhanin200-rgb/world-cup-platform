import { NextResponse } from "next/server";
import type { TournamentQualificationMethod } from "@/domain/tournaments";
import { verifyFirebaseIdTokenViaRest } from "@/lib/serverFirebaseRest";
import {
  saveTournamentPredictionOnServerV2,
  TournamentPredictionSubmissionError,
} from "@/lib/serverTournamentPredictionsV2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");
  return scheme === "Bearer" ? token : "";
}

export async function POST(request: Request) {
  try {
    const token = bearerToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "سجّل الدخول مرة أخرى لحفظ توقعك.", code: "PREDICTION_AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const userId = await verifyFirebaseIdTokenViaRest(token);
    const body = (await request.json().catch(() => null)) as {
      tournamentId?: string;
      matchId?: string;
      homeScore?: number;
      awayScore?: number;
      qualifiedTeamId?: string | null;
      qualificationMethod?: TournamentQualificationMethod | null;
    } | null;
    if (!body) {
      return NextResponse.json(
        { error: "صيغة طلب التوقع غير صحيحة.", code: "PREDICTION_INVALID_JSON" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const result = await saveTournamentPredictionOnServerV2({
      tournamentId: String(body.tournamentId || ""),
      matchId: String(body.matchId || ""),
      userId,
      homeScore: Number(body.homeScore),
      awayScore: Number(body.awayScore),
      qualifiedTeamId: body.qualifiedTeamId,
      qualificationMethod: body.qualificationMethod,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof TournamentPredictionSubmissionError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }

    const message = error instanceof Error ? error.message : String(error || "");
    const authError = /IDENTITY_TOKEN_INVALID/i.test(message);
    if (!authError) {
      console.error("Tournament prediction server save error:", error);
    }
    return NextResponse.json(
      {
        error: authError
          ? "انتهت جلسة الدخول. سجّل الدخول مرة أخرى ثم أعد المحاولة."
          : "تعذر حفظ التوقع الآن. بقيت بقية توقعاتك دون تغيير.",
        code: authError ? "PREDICTION_AUTH_INVALID" : "PREDICTION_SERVER_ERROR",
      },
      { status: authError ? 401 : 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
