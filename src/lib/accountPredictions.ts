import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import type { PredictionType } from "./matches";

export type AccountPredictionResultType = "exact" | "winner" | "wrong" | "";

export type AccountPrediction = {
  id: string;
  matchId: string;

  homeTeamName: string;
  homeTeamEmoji: string;
  awayTeamName: string;
  awayTeamEmoji: string;

  homeScore: number;
  awayScore: number;

  actualHomeScore: number | null;
  actualAwayScore: number | null;

  points: number;
  resultType: AccountPredictionResultType;
  isCalculated: boolean;

  predictionType: PredictionType;

  createdAt: string;
  calculatedAt: string;
};

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toText(value: unknown) {
  return String(value || "").trim();
}

function toNullableNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeResultType(value: unknown): AccountPredictionResultType {
  if (value === "exact" || value === "winner" || value === "wrong") {
    return value;
  }

  return "";
}

function normalizePredictionType(value: unknown): PredictionType {
  return value === "golden" ? "golden" : "normal";
}

export async function getAccountPredictions(
  userId: string
): Promise<AccountPrediction[]> {
  const predictionsRef = collection(db, "predictions");

  const q = query(predictionsRef, where("userId", "==", userId));

  const snapshot = await getDocs(q);

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();

      return {
        id: docSnap.id,
        matchId: toText(data.matchId),

        homeTeamName: toText(data.homeTeamName),
        homeTeamEmoji: toText(data.homeTeamEmoji),
        awayTeamName: toText(data.awayTeamName),
        awayTeamEmoji: toText(data.awayTeamEmoji),

        homeScore: toNumber(data.homeScore),
        awayScore: toNumber(data.awayScore),

        actualHomeScore: toNullableNumber(data.actualHomeScore),
        actualAwayScore: toNullableNumber(data.actualAwayScore),

        points: toNumber(data.points),
        resultType: normalizeResultType(data.resultType),
        isCalculated: Boolean(data.isCalculated),

        predictionType: normalizePredictionType(data.predictionType),

        createdAt: toText(data.createdAt),
        calculatedAt: toText(data.calculatedAt),
      };
    })
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      return bTime - aTime;
    });
}