import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
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

  return snapshot.docs.map((docSnap) =>
    mapHighlightUser(docSnap.id, docSnap.data())
  );
}

async function getExactHits(): Promise<ExactHit[]> {
  const predictionsRef = collection(db, "predictions");

  const q = query(
    predictionsRef,
    where("isCalculated", "==", true),
    where("resultType", "==", "exact"),
    orderBy("calculatedAt", "desc"),
    limit(8)
  );

  const snapshot = await getDocs(q);

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();

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

        calculatedAt: toText(data.calculatedAt),
      };
    })
    .filter((hit) => {
      if (!hit.calculatedAt) return false;

      const calculatedTime = new Date(hit.calculatedAt).getTime();

      if (!Number.isFinite(calculatedTime)) return false;

      return calculatedTime >= oneDayAgo;
    });
}

export async function getHomeHighlights(): Promise<HomeHighlightsData> {
  const [users, exactHits] = await Promise.all([
    getUsersForHighlights(),
    getExactHits(),
  ]);

  const activeUsers = users.filter((user) => user.total > 0);

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
      if (b.points !== a.points) return b.points - a.points;
      if (b.correct !== a.correct) return b.correct - a.correct;
      return a.fullName.localeCompare(b.fullName, "ar");
    })[0] || null;

  return {
    predictionKing,
    bestStreakUser,
    exactHits,
  };
}