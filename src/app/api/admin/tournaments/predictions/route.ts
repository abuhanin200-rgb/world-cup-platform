import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/serverAdminAuth";
import {
  calculateTournamentMatchManuallyServerV2,
  deleteTournamentMatchPredictionsByAdminServerV2,
  deleteTournamentPredictionByAdminServerV2,
  undoTournamentMatchCalculationServerV2,
  updateTournamentPredictionByAdminServerV2,
} from "@/lib/serverTournamentSportsSync";
import type { TournamentQualificationMethod } from "@/domain/tournaments";

type RequestBody = {
  action?: string;
  tournamentId?: string;
  matchId?: string;
  predictionId?: string;
  homeScore?: number;
  awayScore?: number;
  qualifiedTeamId?: string | null;
  qualificationMethod?: TournamentQualificationMethod | null;
  extraTimeHomeScore?: number | null;
  extraTimeAwayScore?: number | null;
  penaltiesHomeScore?: number | null;
  penaltiesAwayScore?: number | null;
};

export async function POST(request: NextRequest) {
  try {
    await requireAdminRequest(request);
    const body = (await request.json().catch(() => null)) as RequestBody | null;
    if (!body?.action) {
      return NextResponse.json({ error: "الطلب غير مكتمل" }, { status: 400 });
    }

    let result: unknown;
    if (body.action === "calculate") {
      result = await calculateTournamentMatchManuallyServerV2({
        tournamentId: String(body.tournamentId || ""),
        matchId: String(body.matchId || ""),
        homeScore: Number(body.homeScore),
        awayScore: Number(body.awayScore),
        qualifiedTeamId: body.qualifiedTeamId,
        qualificationMethod: body.qualificationMethod,
        extraTimeHomeScore: body.extraTimeHomeScore,
        extraTimeAwayScore: body.extraTimeAwayScore,
        penaltiesHomeScore: body.penaltiesHomeScore,
        penaltiesAwayScore: body.penaltiesAwayScore,
      });
    } else if (body.action === "undo") {
      result = await undoTournamentMatchCalculationServerV2({
        tournamentId: String(body.tournamentId || ""),
        matchId: String(body.matchId || ""),
      });
    } else if (body.action === "update_prediction") {
      result = await updateTournamentPredictionByAdminServerV2({
        predictionId: String(body.predictionId || ""),
        homeScore: Number(body.homeScore),
        awayScore: Number(body.awayScore),
        qualifiedTeamId: body.qualifiedTeamId,
        qualificationMethod: body.qualificationMethod,
      });
    } else if (body.action === "delete_prediction") {
      result = await deleteTournamentPredictionByAdminServerV2(
        String(body.predictionId || ""),
      );
    } else if (body.action === "delete_match_predictions") {
      result = await deleteTournamentMatchPredictionsByAdminServerV2({
        tournamentId: String(body.tournamentId || ""),
        matchId: String(body.matchId || ""),
      });
    } else {
      return NextResponse.json({ error: "إجراء غير مدعوم" }, { status: 400 });
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تنفيذ الإجراء";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    if (status >= 500) console.error("Tournament admin prediction action failed:", error);
    return NextResponse.json(
      { error: status === 401 || status === 403 ? "غير مصرح" : message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
