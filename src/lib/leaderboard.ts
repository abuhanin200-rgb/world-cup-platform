import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";

export type LeaderboardUser = {
  id: string;
  fullName: string;
  points: number;
  total: number;
  correct: number;
  wrong: number;
  currentRank: number;
  previousRank: number;
  rankChange: number;
  rankDirection: "-" | "up" | "down";
};

export async function getLeaderboardUsers(): Promise<LeaderboardUser[]> {
  const usersRef = collection(db, "users");

  const q = query(
    usersRef,
    orderBy("points", "desc"),
    orderBy("correct", "desc"),
    orderBy("total", "asc")
  );

  const snapshot = await getDocs(q);

  const users = snapshot.docs.map((docSnap, index) => {
    const data = docSnap.data();

    const currentRank = index + 1;
    const previousRank =
      typeof data.previousRank === "number" && data.previousRank > 0
        ? data.previousRank
        : currentRank;

    let rankDirection: "-" | "up" | "down" = "-";
    let rankChange = 0;

    if (previousRank > currentRank) {
      rankDirection = "up";
      rankChange = previousRank - currentRank;
    } else if (previousRank < currentRank) {
      rankDirection = "down";
      rankChange = currentRank - previousRank;
    }

    return {
      id: docSnap.id,
      fullName: data.fullName || "عضو بدون اسم",
      points: Number(data.points || 0),
      total: Number(data.total || 0),
      correct: Number(data.correct || 0),
      wrong: Number(data.wrong || 0),
      currentRank,
      previousRank,
      rankChange,
      rankDirection,
    };
  });

  return users.filter((user) => user.total > 0 || user.points > 0);
}