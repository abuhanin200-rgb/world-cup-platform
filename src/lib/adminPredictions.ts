import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export type PredictionType = "normal" | "golden";

export type AdminPrediction = {
  id: string;

  userId: string;
  userName: string;

  matchId: string;
  predictionType: PredictionType;

  homeTeamName: string;
  homeTeamEmoji: string;
  awayTeamName: string;
  awayTeamEmoji: string;

  homeScore: number;
  awayScore: number;

  actualHomeScore: number | null;
  actualAwayScore: number | null;

  points: number;
  resultType: string;
  isCalculated: boolean;

  createdAt: string;
  calculatedAt: string | null;
};

export type PredictionMatchOption = {
  matchId: string;
  label: string;
  count: number;
};

function toText(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizePredictionType(value: unknown): PredictionType {
  return value === "golden" ? "golden" : "normal";
}

function getTimeValue(value: unknown) {
  const text = toText(value);
  if (!text) return 0;

  const time = new Date(text).getTime();
  return Number.isFinite(time) ? time : 0;
}

function isGoldenPrediction(prediction: AdminPrediction) {
  return prediction.predictionType === "golden";
}

function isExactPrediction(prediction: AdminPrediction) {
  return (
    prediction.isCalculated &&
    (prediction.resultType === "exact" ||
      prediction.points === 3 ||
      prediction.points === 6)
  );
}

function isWinnerPrediction(prediction: AdminPrediction) {
  return (
    prediction.isCalculated &&
    (prediction.resultType === "winner" ||
      prediction.points === 1 ||
      prediction.points === 2)
  );
}

export function getPredictionResultLabel(prediction: AdminPrediction) {
  const golden = isGoldenPrediction(prediction);

  if (!prediction.isCalculated) return "لم يُحتسب";

  if (isExactPrediction(prediction)) {
    return golden ? "ذهبي بالملي +6" : "بالملي +3";
  }

  if (isWinnerPrediction(prediction)) {
    return golden ? "فائز ذهبي +2" : "الفائز +1";
  }

  return "خطأ +0";
}

export function getPredictionResultClass(prediction: AdminPrediction) {
  const golden = isGoldenPrediction(prediction);

  if (!prediction.isCalculated) {
    return golden
      ? "border-amber-300/30 bg-amber-400/10 text-amber-100"
      : "border-slate-400/20 bg-slate-400/10 text-slate-200";
  }

  if (isExactPrediction(prediction)) {
    return golden
      ? "border-amber-300/40 bg-amber-400/15 text-amber-100"
      : "border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
  }

  if (isWinnerPrediction(prediction)) {
    return golden
      ? "border-amber-300/40 bg-amber-400/15 text-amber-100"
      : "border-amber-400/20 bg-amber-400/10 text-amber-100";
  }

  return "border-red-400/20 bg-red-500/10 text-red-100";
}

async function getMatchPredictionTypeMap() {
  const snapshot = await getDocs(collection(db, "matches"));
  const map = new Map<string, PredictionType>();

  snapshot.docs.forEach((docSnap) => {
    if (docSnap.id === "_init") return;

    const data = docSnap.data();
    map.set(docSnap.id, normalizePredictionType(data.predictionType));
  });

  return map;
}

export async function getAdminPredictions(): Promise<AdminPrediction[]> {
  const [predictionsSnapshot, matchPredictionTypeMap] = await Promise.all([
    getDocs(collection(db, "predictions")),
    getMatchPredictionTypeMap(),
  ]);

  return predictionsSnapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();
      const matchId = toText(data.matchId);

      return {
        id: docSnap.id,

        userId: toText(data.userId),
        userName: toText(data.userName) || "عضو",

        matchId,
        predictionType:
          normalizePredictionType(data.predictionType) ||
          matchPredictionTypeMap.get(matchId) ||
          "normal",

        homeTeamName: toText(data.homeTeamName),
        homeTeamEmoji: toText(data.homeTeamEmoji),
        awayTeamName: toText(data.awayTeamName),
        awayTeamEmoji: toText(data.awayTeamEmoji),

        homeScore: toNumber(data.homeScore),
        awayScore: toNumber(data.awayScore),

        actualHomeScore: toNullableNumber(data.actualHomeScore),
        actualAwayScore: toNullableNumber(data.actualAwayScore),

        points: toNumber(data.points),
        resultType: toText(data.resultType),
        isCalculated: Boolean(data.isCalculated),

        createdAt: toText(data.createdAt),
        calculatedAt:
          data.calculatedAt === null || data.calculatedAt === undefined
            ? null
            : toText(data.calculatedAt),
      };
    })
    .sort((a, b) => getTimeValue(b.createdAt) - getTimeValue(a.createdAt));
}

export function getPredictionMatchOptions(
  predictions: AdminPrediction[]
): PredictionMatchOption[] {
  const map = new Map<string, PredictionMatchOption>();

  predictions.forEach((prediction) => {
    if (!prediction.matchId) return;

    const label = `${prediction.homeTeamEmoji} ${prediction.homeTeamName} × ${prediction.awayTeamName} ${prediction.awayTeamEmoji}`;

    const current = map.get(prediction.matchId);

    if (current) {
      map.set(prediction.matchId, {
        ...current,
        count: current.count + 1,
      });
    } else {
      map.set(prediction.matchId, {
        matchId: prediction.matchId,
        label,
        count: 1,
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}