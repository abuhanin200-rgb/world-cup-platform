import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

export type HighlightUser = {
  id: string;
  fullName: string;
  points: number;
  total: number;
  correct: number;
  wrong: number;
  currentRank: number;
  bestStreak: number;
  currentStreak: number;
};

export type ExactHit = {
  id: string;
  userName: string;

  homeTeamName: string;
  homeTeamEmoji: string;
  awayTeamName: string;
  awayTeamEmoji: string;

  actualHomeScore: number;
  actualAwayScore: number;

  calculatedAt: string;
};

export type HomeHighlights = {
  predictionKing: HighlightUser | null;
  bestStreakUser: HighlightUser | null;
  exactHits: ExactHit[];
};

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toText(value: unknown) {
  return String(value || "").trim();
}

function isWithinLast24Hours(dateText: string) {
  if (!dateText) return false;

  const dateTime = new Date(dateText).getTime();
  if (!Number.isFinite(dateTime)) return false;

  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  return now - dateTime <= twentyFourHours;
}

async function getExactHits(): Promise<ExactHit[]> {
  const predictionsRef = collection(db, "predictions");
  const q = query(
    predictionsRef,
    where("isCalculated", "==", true),
    where("resultType", "==", "exact")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();
      const calculatedAt = toText(data.calculatedAt) || toText(data.createdAt);

      return {
        id: docSnap.id,
        userName: toText(data.userName) || "عضو",

        homeTeamName: toText(data.homeTeamName),
        homeTeamEmoji: toText(data.homeTeamEmoji),
        awayTeamName: toText(data.awayTeamName),
        awayTeamEmoji: toText(data.awayTeamEmoji),

        actualHomeScore: toNumber(data.actualHomeScore),
        actualAwayScore: toNumber(data.actualAwayScore),

        calculatedAt,
      };
    })
    .filter((hit) => isWithinLast24Hours(hit.calculatedAt))
    .sort((a, b) => {
      const aTime = a.calculatedAt ? new Date(a.calculatedAt).getTime() : 0;
      const bTime = b.calculatedAt ? new Date(b.calculatedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 8);
}

export async function getHomeHighlights(): Promise<HomeHighlights> {
  const [usersSnapshot, exactHits] = await Promise.all([
    getDocs(collection(db, "users")),
    getExactHits(),
  ]);

  const users: HighlightUser[] = usersSnapshot.docs.map((docSnap) => {
    const data = docSnap.data();

    return {
      id: docSnap.id,
      fullName: String(data.fullName || "عضو بدون اسم"),
      points: toNumber(data.points),
      total: toNumber(data.total),
      correct: toNumber(data.correct),
      wrong: toNumber(data.wrong),
      currentRank: toNumber(data.currentRank),
      bestStreak: toNumber(data.bestStreak),
      currentStreak: toNumber(data.currentStreak),
    };
  });

  const activeUsers = users.filter((user) => user.total > 0 || user.points > 0);

  const predictionKing =
    activeUsers.length > 0
      ? [...activeUsers].sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.correct !== a.correct) return b.correct - a.correct;
          if (a.total !== b.total) return a.total - b.total;
          return a.fullName.localeCompare(b.fullName, "ar");
        })[0]
      : null;

  const bestStreakUser =
    activeUsers.length > 0
      ? [...activeUsers].sort((a, b) => {
          if (b.bestStreak !== a.bestStreak) {
            return b.bestStreak - a.bestStreak;
          }

          if (b.points !== a.points) return b.points - a.points;
          if (b.correct !== a.correct) return b.correct - a.correct;

          return a.fullName.localeCompare(b.fullName, "ar");
        })[0]
      : null;

  return {
    predictionKing,
    bestStreakUser,
    exactHits,
  };
}