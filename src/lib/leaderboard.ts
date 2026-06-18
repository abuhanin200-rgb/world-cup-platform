import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

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

type PredictionTieBreakData = {
  lastCalculatedMatchId: string;
  predictionTimesByUserId: Map<string, number>;
};

type PredictionStats = {
  exact: number;
  winner: number;
  wrong: number;
  correct: number;
};

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toText(value: unknown) {
  return String(value || "").trim();
}

function toTime(value: unknown) {
  const text = toText(value);

  if (!text) return Number.MAX_SAFE_INTEGER;

  const time = new Date(text).getTime();

  if (!Number.isFinite(time)) return Number.MAX_SAFE_INTEGER;

  return time;
}

function toRealTime(value: unknown) {
  const text = toText(value);

  if (!text) return 0;

  const time = new Date(text).getTime();

  if (!Number.isFinite(time)) return 0;

  return time;
}

function isExactPrediction(data: Record<string, unknown>) {
  const points = toNumber(data.points);
  const resultType = toText(data.resultType);

  return resultType === "exact" || points === 3 || points === 6;
}

function isWinnerPrediction(data: Record<string, unknown>) {
  const points = toNumber(data.points);
  const resultType = toText(data.resultType);

  return resultType === "winner" || points === 1 || points === 2;
}

async function getPredictionStatsByUserId(): Promise<
  Map<string, PredictionStats>
> {
  const snapshot = await getDocs(collection(db, "predictions"));
  const map = new Map<string, PredictionStats>();

  snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .forEach((docSnap) => {
      const data = docSnap.data();
      const userId = toText(data.userId);

      if (!userId || !Boolean(data.isCalculated)) return;

      const current = map.get(userId) || {
        exact: 0,
        winner: 0,
        wrong: 0,
        correct: 0,
      };

      if (isExactPrediction(data)) {
        current.exact += 1;
        current.correct += 1;
      } else if (isWinnerPrediction(data)) {
        current.winner += 1;
        current.correct += 1;
      } else if (toNumber(data.points) === 0) {
        current.wrong += 1;
      }

      map.set(userId, current);
    });

  return map;
}

async function getLastCalculatedMatchTieBreakData(): Promise<PredictionTieBreakData> {
  const snapshot = await getDocs(collection(db, "predictions"));

  const predictions = snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();

      return {
        id: docSnap.id,
        userId: toText(data.userId),
        matchId: toText(data.matchId),
        createdAt: toText(data.createdAt),
        createdTimeValue: toRealTime(data.createdAt),
        calculatedAt: toText(data.calculatedAt),
        calculatedTimeValue: toRealTime(data.calculatedAt),
        isCalculated: Boolean(data.isCalculated),
      };
    })
    .filter((prediction) => {
      return (
        prediction.isCalculated &&
        prediction.matchId &&
        prediction.calculatedTimeValue > 0
      );
    });

  if (predictions.length === 0) {
    return {
      lastCalculatedMatchId: "",
      predictionTimesByUserId: new Map<string, number>(),
    };
  }

  const latestCalculatedPrediction = predictions.sort((a, b) => {
    return b.calculatedTimeValue - a.calculatedTimeValue;
  })[0];

  const lastCalculatedMatchId = latestCalculatedPrediction.matchId;

  const predictionTimesByUserId = new Map<string, number>();

  predictions
    .filter((prediction) => prediction.matchId === lastCalculatedMatchId)
    .forEach((prediction) => {
      if (!prediction.userId || prediction.createdTimeValue <= 0) return;

      const currentSavedTime = predictionTimesByUserId.get(prediction.userId);

      if (!currentSavedTime || prediction.createdTimeValue < currentSavedTime) {
        predictionTimesByUserId.set(
          prediction.userId,
          prediction.createdTimeValue
        );
      }
    });

  return {
    lastCalculatedMatchId,
    predictionTimesByUserId,
  };
}

export async function getLeaderboardUsers(): Promise<LeaderboardUser[]> {
  const [usersSnapshot, tieBreakData, predictionStatsByUserId] =
    await Promise.all([
      getDocs(collection(db, "users")),
      getLastCalculatedMatchTieBreakData(),
      getPredictionStatsByUserId(),
    ]);

  const users = usersSnapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();
      const userId = docSnap.id;
      const predictionStats = predictionStatsByUserId.get(userId);

      const exact = predictionStats?.exact ?? 0;
      const winner = predictionStats?.winner ?? 0;
      const wrong = predictionStats?.wrong ?? toNumber(data.wrong);
      const correct = predictionStats?.correct ?? toNumber(data.correct);

      return {
        id: userId,
        fullName: String(data.fullName || "عضو بدون اسم"),
        favoriteTeam: String(data.favoriteTeam || ""),
        teamEmoji: String(data.teamEmoji || ""),

        points: toNumber(data.points),
        total: toNumber(data.total),

        correct,
        exact,
        winner,
        wrong,

        currentRank: toNumber(data.currentRank),
        previousRank: toNumber(data.previousRank),
        rankChange: toNumber(data.rankChange),
        rankDirection:
          data.rankDirection === "up" ||
          data.rankDirection === "down" ||
          data.rankDirection === "-"
            ? data.rankDirection
            : "-",

        currentStreak: toNumber(data.currentStreak),
        bestStreak: toNumber(data.bestStreak),

        lastPredictionAt: toText(data.lastPredictionAt),
      } as LeaderboardUser;
    });

  return users
    .sort((a, b) => {
      const aHasPredictions = a.total > 0;
      const bHasPredictions = b.total > 0;

      if (aHasPredictions !== bHasPredictions) {
        return aHasPredictions ? -1 : 1;
      }

      if (b.points !== a.points) return b.points - a.points;
      if (b.correct !== a.correct) return b.correct - a.correct;
      if (b.exact !== a.exact) return b.exact - a.exact;
      if (b.winner !== a.winner) return b.winner - a.winner;
      if (b.total !== a.total) return b.total - a.total;
      if (a.wrong !== b.wrong) return a.wrong - b.wrong;

      const aLastCalculatedMatchPredictionTime =
        tieBreakData.predictionTimesByUserId.get(a.id) ??
        Number.MAX_SAFE_INTEGER;

      const bLastCalculatedMatchPredictionTime =
        tieBreakData.predictionTimesByUserId.get(b.id) ??
        Number.MAX_SAFE_INTEGER;

      const aPredictedLastCalculatedMatch =
        aLastCalculatedMatchPredictionTime !== Number.MAX_SAFE_INTEGER;

      const bPredictedLastCalculatedMatch =
        bLastCalculatedMatchPredictionTime !== Number.MAX_SAFE_INTEGER;

      if (aPredictedLastCalculatedMatch !== bPredictedLastCalculatedMatch) {
        return aPredictedLastCalculatedMatch ? -1 : 1;
      }

      if (
        aLastCalculatedMatchPredictionTime !==
        bLastCalculatedMatchPredictionTime
      ) {
        return (
          aLastCalculatedMatchPredictionTime -
          bLastCalculatedMatchPredictionTime
        );
      }

      const aFallbackTime = toTime(a.lastPredictionAt);
      const bFallbackTime = toTime(b.lastPredictionAt);

      if (aFallbackTime !== bFallbackTime) {
        return aFallbackTime - bFallbackTime;
      }

      return a.fullName.localeCompare(b.fullName, "ar");
    })
    .map((user, index) => ({
      ...user,
      currentRank: index + 1,
    }));
}