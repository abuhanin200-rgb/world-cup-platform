import type {
  TournamentMatchV2,
  TournamentPredictionV2,
  TournamentUserStatsV2,
} from "./v2Types";

function cleanName(value: unknown) {
  return String(value ?? "").trim();
}

export function buildTournamentLeaderboardRowsV2({
  tournamentId,
  matches,
  predictions,
  now = Date.now(),
}: {
  tournamentId: string;
  matches: Array<Pick<TournamentMatchV2, "id" | "kickoffAt">>;
  predictions: TournamentPredictionV2[];
  now?: number;
}): TournamentUserStatsV2[] {
  const matchById = new Map(matches.map((match) => [match.id, match]));
  const calculatedPredictions = predictions
    .filter(
      (prediction) =>
        prediction.isCalculated === true &&
        prediction.points != null &&
        prediction.resultType != null &&
        matchById.has(prediction.matchId),
    )
    .sort((a, b) => {
      const aKickoff = matchById.get(a.matchId)?.kickoffAt ?? 0;
      const bKickoff = matchById.get(b.matchId)?.kickoffAt ?? 0;
      if (aKickoff !== bKickoff) return aKickoff - bKickoff;
      return a.matchId.localeCompare(b.matchId);
    });

  const aggregate = new Map<string, TournamentUserStatsV2>();

  for (const prediction of calculatedPredictions) {
    const current = aggregate.get(prediction.userId) ?? {
      id: `${tournamentId}_${prediction.userId}`,
      tournamentId,
      userId: prediction.userId,
      fullName: cleanName(prediction.userName) || "عضو",
      points: 0,
      rank: null,
      played: 0,
      exact: 0,
      correctOutcome: 0,
      wrong: 0,
      currentStreak: 0,
      bestStreak: 0,
      updatedAt: now,
    };

    current.fullName = cleanName(prediction.userName) || current.fullName;
    current.points += prediction.points ?? 0;
    current.played += 1;

    if (prediction.resultType === "exact") {
      current.exact += 1;
      current.currentStreak += 1;
    } else if (prediction.resultType === "outcome") {
      current.correctOutcome += 1;
      current.currentStreak += 1;
    } else {
      current.wrong += 1;
      current.currentStreak = 0;
    }

    current.bestStreak = Math.max(current.bestStreak, current.currentStreak);
    current.updatedAt = now;
    aggregate.set(prediction.userId, current);
  }

  return [...aggregate.values()]
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.exact !== a.exact) return b.exact - a.exact;
      if (b.correctOutcome !== a.correctOutcome) {
        return b.correctOutcome - a.correctOutcome;
      }
      if (a.wrong !== b.wrong) return a.wrong - b.wrong;
      return a.fullName.localeCompare(b.fullName, "ar");
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
}
