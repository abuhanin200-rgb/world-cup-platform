import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
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

type RebuildPrediction = {
  id: string;
  points: number;
  isCalculated: boolean;
  createdAt: string;
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

function buildSingleUserStats(predictions: RebuildPrediction[]) {
  const sorted = [...predictions].sort(
    (a, b) => getTimeValue(a.createdAt) - getTimeValue(b.createdAt)
  );

  let points = 0;
  let total = 0;
  let correct = 0;
  let wrong = 0;
  let currentStreak = 0;
  let bestStreak = 0;

  sorted.forEach((prediction) => {
    if (!prediction.isCalculated) return;

    const predictionPoints = Number(prediction.points || 0);

    total += 1;
    points += predictionPoints;

    if (predictionPoints > 0) {
      correct += 1;
      currentStreak += 1;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      wrong += 1;
      currentStreak = 0;
    }
  });

  return {
    points,
    total,
    correct,
    wrong,
    currentStreak,
    bestStreak,
  };
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

export async function deleteAdminPredictionAndFixUserStats(
  predictionId: string
) {
  if (!predictionId) {
    throw new Error("معرف التوقع غير موجود");
  }

  const predictionRef = doc(db, "predictions", predictionId);
  const predictionSnap = await getDoc(predictionRef);

  if (!predictionSnap.exists()) {
    throw new Error("التوقع غير موجود أو تم حذفه مسبقًا");
  }

  const predictionData = predictionSnap.data();
  const userId = toText(predictionData.userId);

  if (!userId) {
    throw new Error("معرف العضو غير موجود في التوقع");
  }

  const userPredictionsQuery = query(
    collection(db, "predictions"),
    where("userId", "==", userId)
  );

  const userPredictionsSnapshot = await getDocs(userPredictionsQuery);

  const remainingCalculatedPredictions = userPredictionsSnapshot.docs
    .filter((docSnap) => docSnap.id !== predictionId)
    .filter((docSnap) => Boolean(docSnap.data().isCalculated))
    .map((docSnap) => {
      const data = docSnap.data();

      return {
        id: docSnap.id,
        points: toNumber(data.points),
        isCalculated: Boolean(data.isCalculated),
        createdAt: toText(data.createdAt),
      };
    });

  const stats = buildSingleUserStats(remainingCalculatedPredictions);

  const now = new Date().toISOString();

  const batch = writeBatch(db);

  batch.delete(predictionRef);

  batch.set(
    doc(db, "users", userId),
    {
      points: stats.points,
      total: stats.total,
      correct: stats.correct,
      wrong: stats.wrong,
      currentStreak: stats.currentStreak,
      bestStreak: stats.bestStreak,
      lastUpdated: now,
    },
    { merge: true }
  );

  await batch.commit();

  return stats;
}
export type UserStatsAuditItem = {
  userId: string;
  userName: string;

  savedPoints: number;
  realPoints: number;
  pointsDiff: number;

  savedTotal: number;
  realTotal: number;
  totalDiff: number;

  savedCorrect: number;
  realCorrect: number;
  correctDiff: number;

  savedWrong: number;
  realWrong: number;
  wrongDiff: number;
};

export async function auditUserStats(): Promise<UserStatsAuditItem[]> {
  const [usersSnapshot, predictionsSnapshot] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "predictions")),
  ]);

  const calculatedPredictionsByUser = new Map<string, RebuildPrediction[]>();

  predictionsSnapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .forEach((docSnap) => {
      const data = docSnap.data();

      if (!Boolean(data.isCalculated)) return;

      const userId = toText(data.userId);
      if (!userId) return;

      const list = calculatedPredictionsByUser.get(userId) || [];

      list.push({
        id: docSnap.id,
        points: toNumber(data.points),
        isCalculated: Boolean(data.isCalculated),
        createdAt: toText(data.createdAt),
      });

      calculatedPredictionsByUser.set(userId, list);
    });

  return usersSnapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();
      const userId = docSnap.id;

      const realStats = buildSingleUserStats(
        calculatedPredictionsByUser.get(userId) || []
      );

      const savedPoints = toNumber(data.points);
      const savedTotal = toNumber(data.total);
      const savedCorrect = toNumber(data.correct);
      const savedWrong = toNumber(data.wrong);

      return {
        userId,
        userName: toText(data.fullName) || "عضو بدون اسم",

        savedPoints,
        realPoints: realStats.points,
        pointsDiff: savedPoints - realStats.points,

        savedTotal,
        realTotal: realStats.total,
        totalDiff: savedTotal - realStats.total,

        savedCorrect,
        realCorrect: realStats.correct,
        correctDiff: savedCorrect - realStats.correct,

        savedWrong,
        realWrong: realStats.wrong,
        wrongDiff: savedWrong - realStats.wrong,
      };
    })
    .filter((item) => {
      return (
        item.pointsDiff !== 0 ||
        item.totalDiff !== 0 ||
        item.correctDiff !== 0 ||
        item.wrongDiff !== 0
      );
    });
}