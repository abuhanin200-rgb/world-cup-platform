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
  wrong: number;

  currentRank: number;
  previousRank: number;
  rankChange: number;
  rankDirection: "up" | "down" | "-";

  currentStreak: number;
  bestStreak: number;
};

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export async function getLeaderboardUsers(): Promise<LeaderboardUser[]> {
  const snapshot = await getDocs(collection(db, "users"));

  const users = snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();

      return {
        id: docSnap.id,
        fullName: String(data.fullName || "عضو بدون اسم"),
        favoriteTeam: String(data.favoriteTeam || ""),
        teamEmoji: String(data.teamEmoji || ""),

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
      } as LeaderboardUser;
    });

  return users
    .sort((a, b) => {
      const aHasPredictions = a.total > 0;
      const bHasPredictions = b.total > 0;

      /**
       * الأعضاء الذين لديهم توقعات يظهرون أولًا،
       * حتى لو كانت توقعاتهم خاطئة.
       * الأعضاء بدون أي توقعات يذهبون لآخر الجدول.
       */
      if (aHasPredictions !== bHasPredictions) {
        return aHasPredictions ? -1 : 1;
      }

      if (b.points !== a.points) return b.points - a.points;
      if (b.correct !== a.correct) return b.correct - a.correct;
      if (a.wrong !== b.wrong) return a.wrong - b.wrong;
      if (a.total !== b.total) return a.total - b.total;

      return a.fullName.localeCompare(b.fullName, "ar");
    })
    .map((user, index) => ({
      ...user,
      currentRank: index + 1,
    }));
}