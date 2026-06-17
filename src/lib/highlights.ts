import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import type { PredictionType } from "./matches";

export type HomeHighlightUser = {
  id: string;
  fullName: string;
  favoriteTeam: string;
  teamEmoji: string;

  points: number;
  total: number;
  correct: number;
  wrong: number;

  currentRank: number;
  previousRank: number;
  rankChange: number;
  rankDirection: "up" | "down" | "-";

  currentStreak: number;
  bestStreak: number;

  lastPredictionAt?: string;
};

export type ExactHit = {
  id: string;
  userId: string;
  userName: string;

  matchId: string;

  homeTeamName: string;
  awayTeamName: string;
  homeTeamEmoji: string;
  awayTeamEmoji: string;

  homeScore: number;
  awayScore: number;

  points: number;
  predictionType: PredictionType;

  createdAt: string;
  calculatedAt: string;
};

type HighlightPrediction = {
  id: string;
  userId: string;
  userName: string;

  matchId: string;

  homeTeamName: string;
  awayTeamName: string;
  homeTeamEmoji: string;
  awayTeamEmoji: string;

  homeScore: number;
  awayScore: number;

  actualHomeScore: number | null;
  actualAwayScore: number | null;

  points: number;
  resultType: string;
  isCalculated: boolean;
  predictionType: PredictionType;

  createdAt: string;
  createdTimeValue: number;

  calculatedAt: string;
  calculatedTimeValue: number;
};

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toText(value: unknown) {
  return String(value || "").trim();
}

function normalizePredictionType(value: unknown): PredictionType {
  return value === "golden" ? "golden" : "normal";
}

function toTimeValue(value: unknown) {
  const text = toText(value);

  if (!text) return 0;

  const time = new Date(text).getTime();

  if (!Number.isFinite(time)) return 0;

  return time;
}

function toLeaderboardTimeValue(value: unknown) {
  const text = toText(value);

  if (!text) return Number.MAX_SAFE_INTEGER;

  const time = new Date(text).getTime();

  if (!Number.isFinite(time)) return Number.MAX_SAFE_INTEGER;

  return time;
}

function getSaudiDateKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getTodaySaudiDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function getUsersForHighlights(): Promise<HomeHighlightUser[]> {
  const snapshot = await getDocs(collection(db, "users"));

  const users = snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();

      return {
        id: docSnap.id,
        fullName: toText(data.fullName) || "عضو بدون اسم",
        favoriteTeam: toText(data.favoriteTeam),
        teamEmoji: toText(data.teamEmoji),

        points: toNumber(data.points),
        total: toNumber(data.total),
        correct: toNumber(data.correct),
        wrong: toNumber(data.wrong),

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
      } as HomeHighlightUser;
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
      if (b.total !== a.total) return b.total - a.total;
      if (a.wrong !== b.wrong) return a.wrong - b.wrong;

      const aPredictionTime = toLeaderboardTimeValue(a.lastPredictionAt);
      const bPredictionTime = toLeaderboardTimeValue(b.lastPredictionAt);

      if (aPredictionTime !== bPredictionTime) {
        return aPredictionTime - bPredictionTime;
      }

      return a.fullName.localeCompare(b.fullName, "ar");
    })
    .map((user, index) => {
      return {
        ...user,
        currentRank: index + 1,
      };
    });
}

async function getPredictionsForHighlights(): Promise<HighlightPrediction[]> {
  const snapshot = await getDocs(collection(db, "predictions"));

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();

      const createdAt = toText(data.createdAt);
      const calculatedAt = toText(data.calculatedAt);

      return {
        id: docSnap.id,
        userId: toText(data.userId),
        userName: toText(data.userName) || "عضو بدون اسم",

        matchId: toText(data.matchId),

        homeTeamName: toText(data.homeTeamName),
        awayTeamName: toText(data.awayTeamName),
        homeTeamEmoji: toText(data.homeTeamEmoji),
        awayTeamEmoji: toText(data.awayTeamEmoji),

        homeScore: toNumber(data.homeScore),
        awayScore: toNumber(data.awayScore),

        actualHomeScore:
          data.actualHomeScore === undefined || data.actualHomeScore === null
            ? null
            : toNumber(data.actualHomeScore),

        actualAwayScore:
          data.actualAwayScore === undefined || data.actualAwayScore === null
            ? null
            : toNumber(data.actualAwayScore),

        points: toNumber(data.points),
        resultType: toText(data.resultType),
        isCalculated: Boolean(data.isCalculated),
        predictionType: normalizePredictionType(data.predictionType),

        createdAt,
        createdTimeValue: toTimeValue(createdAt),

        calculatedAt,
        calculatedTimeValue: toTimeValue(calculatedAt),
      };
    });
}

function pickPredictionKing(users: HomeHighlightUser[]) {
  return (
    users.find((user) => {
      return user.total > 0 && user.points > 0;
    }) || null
  );
}

function pickBestStreakUser(
  users: HomeHighlightUser[],
  excludedUserIds: Set<string>
) {
  const usersWithStreak = users
    .filter((user) => user.bestStreak > 0)
    .sort((a, b) => {
      if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
      if (b.points !== a.points) return b.points - a.points;
      if (b.correct !== a.correct) return b.correct - a.correct;
      if (b.total !== a.total) return b.total - a.total;
      if (a.wrong !== b.wrong) return a.wrong - b.wrong;

      const aPredictionTime = toLeaderboardTimeValue(a.lastPredictionAt);
      const bPredictionTime = toLeaderboardTimeValue(b.lastPredictionAt);

      if (aPredictionTime !== bPredictionTime) {
        return aPredictionTime - bPredictionTime;
      }

      return a.fullName.localeCompare(b.fullName, "ar");
    });

  const differentUser = usersWithStreak.find(
    (user) => !excludedUserIds.has(user.id)
  );

  return differentUser || usersWithStreak[0] || null;
}

function pickFastestRiserUser(
  users: HomeHighlightUser[],
  excludedUserIds: Set<string>
) {
  const risers = users
    .filter((user) => {
      return user.rankDirection === "up" && user.rankChange > 0;
    })
    .sort((a, b) => {
      if (b.rankChange !== a.rankChange) return b.rankChange - a.rankChange;
      if (b.points !== a.points) return b.points - a.points;
      if (b.correct !== a.correct) return b.correct - a.correct;
      if (b.total !== a.total) return b.total - a.total;
      if (a.wrong !== b.wrong) return a.wrong - b.wrong;

      const aPredictionTime = toLeaderboardTimeValue(a.lastPredictionAt);
      const bPredictionTime = toLeaderboardTimeValue(b.lastPredictionAt);

      if (aPredictionTime !== bPredictionTime) {
        return aPredictionTime - bPredictionTime;
      }

      return a.fullName.localeCompare(b.fullName, "ar");
    });

  const differentUser = risers.find((user) => !excludedUserIds.has(user.id));

  return differentUser || risers[0] || null;
}

function pickFirstArriverUser(
  users: HomeHighlightUser[],
  predictions: HighlightPrediction[],
  excludedUserIds: Set<string>
) {
  const todaySaudiDateKey = getTodaySaudiDateKey();

  const todayPredictions = predictions
    .filter((prediction) => {
      if (!prediction.userId || !prediction.createdAt) return false;
      if (prediction.createdTimeValue <= 0) return false;

      return getSaudiDateKey(prediction.createdAt) === todaySaudiDateKey;
    })
    .sort((a, b) => a.createdTimeValue - b.createdTimeValue);

  if (todayPredictions.length === 0) return null;

  const firstDifferentUserPrediction = todayPredictions.find(
    (prediction) => !excludedUserIds.has(prediction.userId)
  );

  const selectedPrediction =
    firstDifferentUserPrediction || todayPredictions[0];

  return users.find((user) => user.id === selectedPrediction.userId) || null;
}

function getExactHits(predictions: HighlightPrediction[]): ExactHit[] {
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  return predictions
    .filter((prediction) => {
      if (!prediction.isCalculated) return false;

      const isExact =
        prediction.resultType === "exact" ||
        prediction.points === 3 ||
        prediction.points === 6;

      if (!isExact) return false;

      const referenceTime =
        prediction.calculatedTimeValue || prediction.createdTimeValue;

      if (!referenceTime) return false;

      return now - referenceTime <= twentyFourHours;
    })
    .sort((a, b) => {
      const aTime = a.calculatedTimeValue || a.createdTimeValue;
      const bTime = b.calculatedTimeValue || b.createdTimeValue;

      return bTime - aTime;
    })
    .map((prediction) => {
      return {
        id: prediction.id,
        userId: prediction.userId,
        userName: prediction.userName,

        matchId: prediction.matchId,

        homeTeamName: prediction.homeTeamName,
        awayTeamName: prediction.awayTeamName,
        homeTeamEmoji: prediction.homeTeamEmoji,
        awayTeamEmoji: prediction.awayTeamEmoji,

        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,

        points: prediction.points,
        predictionType: prediction.predictionType,

        createdAt: prediction.createdAt,
        calculatedAt: prediction.calculatedAt,
      };
    });
}

export async function getHomeHighlights() {
  const [users, predictions] = await Promise.all([
    getUsersForHighlights(),
    getPredictionsForHighlights(),
  ]);

  const excludedUserIds = new Set<string>();

  const predictionKing = pickPredictionKing(users);

  if (predictionKing) {
    excludedUserIds.add(predictionKing.id);
  }

  const bestStreakUser = pickBestStreakUser(users, excludedUserIds);

  if (bestStreakUser) {
    excludedUserIds.add(bestStreakUser.id);
  }

  const fastestRiserUser = pickFastestRiserUser(users, excludedUserIds);

  if (fastestRiserUser) {
    excludedUserIds.add(fastestRiserUser.id);
  }

  const firstArriverUser = pickFirstArriverUser(
    users,
    predictions,
    excludedUserIds
  );

  const exactHits = getExactHits(predictions);

  return {
    predictionKing,
    bestStreakUser,
    fastestRiserUser,
    firstArriverUser,
    exactHits,
  };
}