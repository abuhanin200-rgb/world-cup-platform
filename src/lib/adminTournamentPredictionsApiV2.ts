import type { TournamentQualificationMethod } from "@/domain/tournaments";
import { auth } from "@/lib/firebase";

export async function requestAdminTournamentPredictionActionV2<T>(
  body: Record<string, unknown>,
): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("انتهت جلسة الإدارة");
  const token = await user.getIdToken();
  const response = await fetch("/api/admin/tournaments/predictions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok || !data) {
    throw new Error(data?.error || "تعذر تنفيذ إجراء التوقعات");
  }
  return data;
}

export function calculateTournamentMatchViaServerV2(input: {
  tournamentId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  qualifiedTeamId?: string | null;
  qualificationMethod?: TournamentQualificationMethod | null;
  extraTimeHomeScore?: number | null;
  extraTimeAwayScore?: number | null;
  penaltiesHomeScore?: number | null;
  penaltiesAwayScore?: number | null;
}) {
  return requestAdminTournamentPredictionActionV2<{
    predictionsCalculated: number;
    leaderboardRows: number;
    resultHash: string;
    calculationRunId: string;
    scoringVersion: string;
    alreadyCalculated: boolean;
  }>({ action: "calculate", ...input });
}

export function undoTournamentMatchCalculationViaServerV2(input: {
  tournamentId: string;
  matchId: string;
}) {
  return requestAdminTournamentPredictionActionV2<{
    predictionsReset: number;
    leaderboardRows: number;
  }>({ action: "undo", ...input });
}
