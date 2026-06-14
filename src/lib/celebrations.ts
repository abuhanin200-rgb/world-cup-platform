import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

export type CelebrationPrediction = {
  id: string;
  userId: string;
  userName: string;

  matchId: string;

  homeTeamName: string;
  homeTeamEmoji: string;
  awayTeamName: string;
  awayTeamEmoji: string;

  homeScore: number;
  awayScore: number;

  points: number;
  resultType: string;
  isCalculated: boolean;

  calculatedAt?: string | null;
  createdAt?: string | null;
};

function toText(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getTimeValue(value: unknown) {
  const text = toText(value);

  if (!text) return 0;

  const time = new Date(text).getTime();

  return Number.isFinite(time) ? time : 0;
}

export async function getExactCelebrationsForUser(
  userId: string
): Promise<CelebrationPrediction[]> {
  if (!userId) return [];

  const predictionsRef = collection(db, "predictions");

  const q = query(predictionsRef, where("userId", "==", userId));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();

      return {
        id: docSnap.id,
        userId: toText(data.userId),
        userName: toText(data.userName),

        matchId: toText(data.matchId),

        homeTeamName: toText(data.homeTeamName),
        homeTeamEmoji: toText(data.homeTeamEmoji),
        awayTeamName: toText(data.awayTeamName),
        awayTeamEmoji: toText(data.awayTeamEmoji),

        homeScore: toNumber(data.homeScore),
        awayScore: toNumber(data.awayScore),

        points: toNumber(data.points),
        resultType: toText(data.resultType),
        isCalculated: Boolean(data.isCalculated),

        calculatedAt:
          data.calculatedAt === null || data.calculatedAt === undefined
            ? null
            : toText(data.calculatedAt),

        createdAt:
          data.createdAt === null || data.createdAt === undefined
            ? null
            : toText(data.createdAt),
      };
    })
    .filter((prediction) => {
      return (
        prediction.isCalculated &&
        (prediction.resultType === "exact" || prediction.points === 3)
      );
    })
    .sort((a, b) => {
      return (
        getTimeValue(b.calculatedAt || b.createdAt) -
        getTimeValue(a.calculatedAt || a.createdAt)
      );
    });
}