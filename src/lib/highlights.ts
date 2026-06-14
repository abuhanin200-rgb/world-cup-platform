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

export type HomeHighlightsData = {
  predictionKing: HomeHighlightUser | null;
  bestStreakUser: HomeHighlightUser | null;
  exactHits: ExactHit[];
};

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toText(value: unknown) {
  return String(value || "").trim();
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
  };
}

async function getUsersForHighlights() {
  const snapshot = await getDocs(collection(db, "users"));

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => mapHighlightUser(docSnap.id, docSnap.data()));
}

async function getExactHits(): Promise<ExactHit[]> {
  const snapshot = await getDocs(collection(db, "predictions"));

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();

      const points = toNumber(data.points);
      const resultType = toText(data.resultType);
      const isCalculated = Boolean(data.isCalculated);

      return {
        id: docSnap.id,

        userId: toText(data.userId),
        userName: toText(data.userName) || "عضو",

        homeTeamName: toText(data.homeTeamName),
        homeTeamEmoji: toText(data.homeTeamEmoji),
        awayTeamName: toText(data.awayTeamName),
        awayTeamEmoji: toText(data.awayTeamEmoji),

        homeScore: toNumber(data.homeScore),
        awayScore: toNumber(data.awayScore),

        calculatedAt:
          toText(data.calculatedAt) ||
          toText(data.updatedAt) ||
          toText(data.createdAt),

        points,
        resultType,
        isCalculated,

        timeValue: getTimeValue(data.calculatedAt, data.updatedAt, data.createdAt),
      };
    })
    .filter((prediction) => {
      const hasMatchData =
        prediction.userName &&
        prediction.homeTeamName &&
        prediction.awayTeamName;

      const isExact =
        prediction.resultType === "exact" ||
        prediction.points === 3;

      return hasMatchData && prediction.isCalculated && isExact;
    })
    .sort((a, b) => b.timeValue - a.timeValue)
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

export async function getHomeHighlights(): Promise<HomeHighlightsData> {
  const [users, exactHits] = await Promise.all([
    getUsersForHighlights(),
    getExactHits(),
  ]);

  const activeUsers = users.filter((user) => {
    return user.points > 0 || user.total > 0 || user.correct > 0;
  });

  const predictionKing =
    [...activeUsers].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.correct !== a.correct) return b.correct - a.correct;
      if (a.total !== b.total) return a.total - b.total;
      return a.fullName.localeCompare(b.fullName, "ar");
    })[0] || null;

  const bestStreakUser =
    [...activeUsers].sort((a, b) => {
      if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
      if (b.currentStreak !== a.currentStreak) {
        return b.currentStreak - a.currentStreak;
      }
      if (b.correct !== a.correct) return b.correct - a.correct;
      if (b.points !== a.points) return b.points - a.points;
      return a.fullName.localeCompare(b.fullName, "ar");
    })[0] || null;

  return {
    predictionKing,
    bestStreakUser,
    exactHits,
  };
}