import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export type HomeHighlightUser = {
  id: string;
  fullName: string;
  favoriteTeam: string;
  teamEmoji: string;

  points: number;
  total: number;
  correct: number;
  wrong: number;

  currentStreak: number;
  bestStreak: number;

  currentRank: number;
  previousRank: number;
  rankChange: number;
  rankDirection: "up" | "down" | "-";

  lastPredictionAt: string;
};

export type ExactHit = {
  id: string;
  userId: string;
  userName: string;

  homeTeamName: string;
  homeTeamEmoji: string;
  awayTeamName: string;
  awayTeamEmoji: string;

  homeScore: number;
  awayScore: number;

  calculatedAt: string;
};

type HighlightPrediction = {
  id: string;

  userId: string;
  userName: string;

  homeTeamName: string;
  homeTeamEmoji: string;
  awayTeamName: string;
  awayTeamEmoji: string;

  homeScore: number;
  awayScore: number;

  points: number;
  resultType: string;
  isCalculated: boolean;

  createdAt: string;
  updatedAt: string;
  calculatedAt: string;

  createdTimeValue: number;
  calculatedTimeValue: number;
};

export type HomeHighlightsData = {
  predictionKing: HomeHighlightUser | null;
  bestStreakUser: HomeHighlightUser | null;
  fastestRiserUser: HomeHighlightUser | null;
  firstArriverUser: HomeHighlightUser | null;
  exactHits: ExactHit[];
};

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toText(value: unknown) {
  return String(value || "").trim();
}

function normalizeRankDirection(value: unknown): "up" | "down" | "-" {
  if (value === "up" || value === "down" || value === "-") {
    return value;
  }

  return "-";
}

function getTimeValue(...dates: unknown[]) {
  for (const dateValue of dates) {
    const text = toText(dateValue);

    if (!text) continue;

    const time = new Date(text).getTime();

    if (Number.isFinite(time)) {
      return time;
    }
  }

  return 0;
}

function mapHighlightUser(
  id: string,
  data: Record<string, unknown>
): HomeHighlightUser {
  return {
    id,
    fullName: toText(data.fullName) || "عضو بدون اسم",
    favoriteTeam: toText(data.favoriteTeam),
    teamEmoji: toText(data.teamEmoji),

    points: toNumber(data.points),
    total: toNumber(data.total),
    correct: toNumber(data.correct),
    wrong: toNumber(data.wrong),

    currentStreak: toNumber(data.currentStreak),
    bestStreak: toNumber(data.bestStreak),

    currentRank: toNumber(data.currentRank),
    previousRank: toNumber(data.previousRank),
    rankChange: toNumber(data.rankChange),
    rankDirection: normalizeRankDirection(data.rankDirection),

    lastPredictionAt: toText(data.lastPredictionAt),
  };
}

function mapHighlightPrediction(
  id: string,
  data: Record<string, unknown>
): HighlightPrediction {
  const createdAt = toText(data.createdAt);
  const updatedAt = toText(data.updatedAt);
  const calculatedAt =
    toText(data.calculatedAt) || toText(data.updatedAt) || toText(data.createdAt);

  return {
    id,

    userId: toText(data.userId),
    userName: toText(data.userName) || "عضو",

    homeTeamName: toText(data.homeTeamName),
    homeTeamEmoji: toText(data.homeTeamEmoji),
    awayTeamName: toText(data.awayTeamName),
    awayTeamEmoji: toText(data.awayTeamEmoji),

    homeScore: toNumber(data.homeScore),
    awayScore: toNumber(data.awayScore),

    points: toNumber(data.points),
    resultType: toText(data.resultType),
    isCalculated: Boolean(data.isCalculated),

    createdAt,
    updatedAt,
    calculatedAt,

    createdTimeValue: getTimeValue(createdAt, updatedAt, calculatedAt),
    calculatedTimeValue: getTimeValue(calculatedAt, updatedAt, createdAt),
  };
}

async function getUsersForHighlights() {
  const snapshot = await getDocs(collection(db, "users"));

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => mapHighlightUser(docSnap.id, docSnap.data()));
}

async function getPredictionsForHighlights(): Promise<HighlightPrediction[]> {
  const snapshot = await getDocs(collection(db, "predictions"));

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => mapHighlightPrediction(docSnap.id, docSnap.data()));
}

function getExactHits(predictions: HighlightPrediction[]): ExactHit[] {
  return predictions
    .filter((prediction) => {
      const hasMatchData =
        prediction.userName &&
        prediction.homeTeamName &&
        prediction.awayTeamName;

      const isExact =
        prediction.resultType === "exact" || prediction.points === 3;

      return hasMatchData && prediction.isCalculated && isExact;
    })
    .sort((a, b) => b.calculatedTimeValue - a.calculatedTimeValue)
    .slice(0, 12)
    .map((prediction) => ({
      id: prediction.id,
      userId: prediction.userId,
      userName: prediction.userName,

      homeTeamName: prediction.homeTeamName,
      homeTeamEmoji: prediction.homeTeamEmoji,
      awayTeamName: prediction.awayTeamName,
      awayTeamEmoji: prediction.awayTeamEmoji,

      homeScore: prediction.homeScore,
      awayScore: prediction.awayScore,

      calculatedAt: prediction.calculatedAt,
    }));
}

function pickFirstArriverUser({
  users,
  predictions,
  excludedUserIds,
}: {
  users: HomeHighlightUser[];
  predictions: HighlightPrediction[];
  excludedUserIds: Set<string>;
}) {
  const usersMap = new Map(users.map((user) => [user.id, user]));

  const sortedPredictions = [...predictions]
    .filter((prediction) => {
      return prediction.userId && prediction.createdTimeValue > 0;
    })
    .sort((a, b) => a.createdTimeValue - b.createdTimeValue);

  const firstDifferentUser = sortedPredictions.find((prediction) => {
    return usersMap.has(prediction.userId) && !excludedUserIds.has(prediction.userId);
  });

  if (firstDifferentUser) {
    return usersMap.get(firstDifferentUser.userId) || null;
  }

  const firstAnyUser = sortedPredictions.find((prediction) => {
    return usersMap.has(prediction.userId);
  });

  if (!firstAnyUser) return null;

  return usersMap.get(firstAnyUser.userId) || null;
}

export async function getHomeHighlights(): Promise<HomeHighlightsData> {
  const [users, predictions] = await Promise.all([
    getUsersForHighlights(),
    getPredictionsForHighlights(),
  ]);

  const exactHits = getExactHits(predictions);

  const activeUsers = users.filter((user) => {
    return user.points > 0 || user.total > 0 || user.correct > 0;
  });

  const predictionKing =
    [...activeUsers].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.correct !== a.correct) return b.correct - a.correct;
      if (b.total !== a.total) return b.total - a.total;
      if (a.wrong !== b.wrong) return a.wrong - b.wrong;

      return a.fullName.localeCompare(b.fullName, "ar");
    })[0] || null;

  const excludedUserIds = new Set<string>();

  if (predictionKing) {
    excludedUserIds.add(predictionKing.id);
  }

  const bestStreakUser =
    [...activeUsers]
      .filter((user) => {
        if (activeUsers.length <= 1) return true;
        return !excludedUserIds.has(user.id);
      })
      .sort((a, b) => {
        if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;

        if (b.currentStreak !== a.currentStreak) {
          return b.currentStreak - a.currentStreak;
        }

        if (b.correct !== a.correct) return b.correct - a.correct;
        if (b.points !== a.points) return b.points - a.points;

        return a.fullName.localeCompare(b.fullName, "ar");
      })[0] || null;

  if (bestStreakUser) {
    excludedUserIds.add(bestStreakUser.id);
  }

  const fastestRiserUser =
    [...activeUsers]
      .filter((user) => {
        if (activeUsers.length <= excludedUserIds.size + 1) return true;

        return !excludedUserIds.has(user.id);
      })
      .filter((user) => {
        return user.rankDirection === "up" && user.rankChange > 0;
      })
      .sort((a, b) => {
        if (b.rankChange !== a.rankChange) return b.rankChange - a.rankChange;
        if (b.points !== a.points) return b.points - a.points;
        if (b.correct !== a.correct) return b.correct - a.correct;

        return a.fullName.localeCompare(b.fullName, "ar");
      })[0] || null;

  if (fastestRiserUser) {
    excludedUserIds.add(fastestRiserUser.id);
  }

  const firstArriverUser = pickFirstArriverUser({
    users: activeUsers.length > 0 ? activeUsers : users,
    predictions,
    excludedUserIds,
  });

  return {
    predictionKing,
    bestStreakUser,
    fastestRiserUser,
    firstArriverUser,
    exactHits,
  };
}