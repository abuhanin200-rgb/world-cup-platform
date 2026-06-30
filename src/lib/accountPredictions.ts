import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import type { PredictionType, QualificationMethod } from "./matches";

export type AccountPredictionResultType = "exact" | "winner" | "wrong" | "";

export type AccountPrediction = {
  id: string;
  matchId: string;

  homeTeamName: string;
  homeTeamEmoji: string;
  homeTeamCode: string;

  awayTeamName: string;
  awayTeamEmoji: string;
  awayTeamCode: string;

  homeScore: number;
  awayScore: number;

  qualifiedTeamCode?: string | null;
  qualificationMethod?: QualificationMethod | null;

  actualHomeScore: number | null;
  actualAwayScore: number | null;

  actualQualifiedTeamCode?: string | null;
actualQualificationMethod?: QualificationMethod | null;

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

function toNullableText(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return toText(value);
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

function normalizeQualificationMethod(
  value: unknown
): QualificationMethod | null {
  if (value === "extraTime" || value === "penalties") {
    return value;
  }

  return null;
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
        homeTeamCode: toText(data.homeTeamCode),

        awayTeamName: toText(data.awayTeamName),
        awayTeamEmoji: toText(data.awayTeamEmoji),
        awayTeamCode: toText(data.awayTeamCode),

        homeScore: toNumber(data.homeScore),
        awayScore: toNumber(data.awayScore),

        qualifiedTeamCode: toNullableText(data.qualifiedTeamCode),
        qualificationMethod: normalizeQualificationMethod(
          data.qualificationMethod
        ),

        actualHomeScore: toNullableNumber(data.actualHomeScore),
        actualAwayScore: toNullableNumber(data.actualAwayScore),

        actualQualifiedTeamCode: toNullableText(data.actualQualifiedTeamCode),
actualQualificationMethod: normalizeQualificationMethod(
  data.actualQualificationMethod
),

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