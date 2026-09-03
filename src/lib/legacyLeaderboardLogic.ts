export type LeaderboardUser = {
  id: string;
  fullName: string;
  favoriteTeam?: string;
  teamEmoji?: string;
  points: number;
  total: number;
  correct: number;
  exact: number;
  winner: number;
  wrong: number;
  currentRank: number;
  previousRank: number;
  rankChange: number;
  rankDirection: "up" | "down" | "-";
  currentStreak: number;
  bestStreak: number;
  lastPredictionAt?: string;
};

type RecordWithId = { id: string; data: Record<string, unknown> };
type PredictionTieBreakData = { predictionTimesByUserId: Map<string, number> };
type PredictionStats = { exact: number; winner: number; wrong: number; correct: number };

function toNumber(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function toText(value: unknown) { return String(value || "").trim(); }
function toTime(value: unknown) { const parsed = new Date(toText(value)).getTime(); return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER; }
function toRealTime(value: unknown) { const parsed = new Date(toText(value)).getTime(); return Number.isFinite(parsed) ? parsed : 0; }
function isExactPrediction(data: Record<string, unknown>) { return toText(data.resultType) === "exact" || toNumber(data.points) === 3 || toNumber(data.points) === 6; }
function isWinnerPrediction(data: Record<string, unknown>) { return toText(data.resultType) === "winner" || toNumber(data.points) === 1 || toNumber(data.points) === 2; }

function predictionStatsByUserId(predictions: RecordWithId[]) {
  const stats = new Map<string, PredictionStats>();
  predictions.filter((item) => item.id !== "_init").forEach(({ data }) => {
    const userId = toText(data.userId);
    if (!userId || !data.isCalculated) return;
    const current = stats.get(userId) || { exact: 0, winner: 0, wrong: 0, correct: 0 };
    if (isExactPrediction(data)) { current.exact += 1; current.correct += 1; }
    else if (isWinnerPrediction(data)) { current.winner += 1; current.correct += 1; }
    else if (toNumber(data.points) === 0) current.wrong += 1;
    stats.set(userId, current);
  });
  return stats;
}

function tieBreakData(predictions: RecordWithId[]): PredictionTieBreakData {
  const calculated = predictions.filter((item) => item.id !== "_init").map(({ data }) => ({
    userId: toText(data.userId), matchId: toText(data.matchId), createdTimeValue: toRealTime(data.createdAt),
    calculatedTimeValue: toRealTime(data.calculatedAt), isCalculated: Boolean(data.isCalculated),
  })).filter((item) => item.isCalculated && item.matchId && item.calculatedTimeValue > 0);
  if (!calculated.length) return { predictionTimesByUserId: new Map() };
  const lastCalculatedMatchId = [...calculated].sort((a, b) => b.calculatedTimeValue - a.calculatedTimeValue)[0].matchId;
  const predictionTimesByUserId = new Map<string, number>();
  calculated.filter((item) => item.matchId === lastCalculatedMatchId).forEach((item) => {
    if (!item.userId || item.createdTimeValue <= 0) return;
    const current = predictionTimesByUserId.get(item.userId);
    if (!current || item.createdTimeValue < current) predictionTimesByUserId.set(item.userId, item.createdTimeValue);
  });
  return { predictionTimesByUserId };
}

/** Builds the public leaderboard from server-fetched legacy documents. */
export function buildLegacyLeaderboard(users: RecordWithId[], predictions: RecordWithId[]): LeaderboardUser[] {
  const ties = tieBreakData(predictions);
  const predictionStats = predictionStatsByUserId(predictions);
  return users.filter((item) => item.id !== "_init").map(({ id, data }) => {
    const stats = predictionStats.get(id);
    const rankDirection: LeaderboardUser["rankDirection"] = data.rankDirection === "up" || data.rankDirection === "down" || data.rankDirection === "-"
      ? data.rankDirection
      : "-";
    return {
      id, fullName: toText(data.fullName) || "عضو بدون اسم", favoriteTeam: toText(data.favoriteTeam), teamEmoji: toText(data.teamEmoji),
      points: toNumber(data.points), total: toNumber(data.total), correct: stats?.correct ?? toNumber(data.correct),
      exact: stats?.exact ?? 0, winner: stats?.winner ?? 0, wrong: stats?.wrong ?? toNumber(data.wrong),
      currentRank: toNumber(data.currentRank), previousRank: toNumber(data.previousRank), rankChange: toNumber(data.rankChange),
      rankDirection,
      currentStreak: toNumber(data.currentStreak), bestStreak: toNumber(data.bestStreak), lastPredictionAt: toText(data.lastPredictionAt),
    };
  }).sort((a, b) => {
    const aHasPredictions = a.total > 0; const bHasPredictions = b.total > 0;
    if (aHasPredictions !== bHasPredictions) return aHasPredictions ? -1 : 1;
    if (b.points !== a.points) return b.points - a.points;
    if (b.correct !== a.correct) return b.correct - a.correct;
    if (b.exact !== a.exact) return b.exact - a.exact;
    if (b.winner !== a.winner) return b.winner - a.winner;
    if (b.total !== a.total) return b.total - a.total;
    if (a.wrong !== b.wrong) return a.wrong - b.wrong;
    const aLast = ties.predictionTimesByUserId.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bLast = ties.predictionTimesByUserId.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    const aPredicted = aLast !== Number.MAX_SAFE_INTEGER; const bPredicted = bLast !== Number.MAX_SAFE_INTEGER;
    if (aPredicted !== bPredicted) return aPredicted ? -1 : 1;
    if (aLast !== bLast) return aLast - bLast;
    const aFallback = toTime(a.lastPredictionAt); const bFallback = toTime(b.lastPredictionAt);
    if (aFallback !== bFallback) return aFallback - bFallback;
    return a.fullName.localeCompare(b.fullName, "ar");
  }).map((user, index) => ({ ...user, currentRank: index + 1 }));
}
