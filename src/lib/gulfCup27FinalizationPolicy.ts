/** Pure, side-effect-free gate: no date-only or final-only closure. */
export type FinalizationMatch = {
  id: string;
  tournamentId: string;
  status: string;
  calculationStatus: string;
  homeTeamId: string;
  awayTeamId: string;
  result?: {
    homeScore?: number | null;
    awayScore?: number | null;
    qualifiedTeamId?: string | null;
    qualificationMethod?: string | null;
  };
};

export type FinalizationDecision =
  | { ready: true; championTeamId: string; matchCount: number }
  | { ready: false; reason: string };

export function evaluateGulfCup27Finalization(
  matches: readonly FinalizationMatch[],
  expectedMatchIds: readonly string[],
): FinalizationDecision {
  const expected = new Set(expectedMatchIds);
  if (!expected.has("g27-final") || expected.size !== expectedMatchIds.length) {
    return { ready: false, reason: "invalid_expected_schedule" };
  }
  const byId = new Map(matches.map((match) => [match.id, match]));
  if (byId.size !== matches.length || byId.size !== expected.size) {
    return { ready: false, reason: "match_count_mismatch" };
  }
  for (const id of expected) {
    const match = byId.get(id);
    if (!match || match.tournamentId !== "gulf27") return { ready: false, reason: "missing_match" };
    if (
      match.status !== "finished" ||
      match.calculationStatus !== "calculated" ||
      !match.homeTeamId || !match.awayTeamId ||
      !Number.isInteger(match.result?.homeScore ?? NaN) ||
      !Number.isInteger(match.result?.awayScore ?? NaN)
    ) return { ready: false, reason: `not_calculated:${id}` };
  }
  const final = byId.get("g27-final")!;
  const winner = final.result?.qualifiedTeamId;
  if (
    !winner ||
    (winner !== final.homeTeamId && winner !== final.awayTeamId) ||
    !["regular", "extra_time", "penalties"].includes(final.result?.qualificationMethod || "")
  ) return { ready: false, reason: "final_champion_unconfirmed" };
  return { ready: true, championTeamId: winner, matchCount: expected.size };
}
