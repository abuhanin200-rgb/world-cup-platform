import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
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

  matchStage?: "group" | "knockout";
  knockoutRound?: "general" | "semiFinal" | "thirdPlace" | "final";

  homeTeamName: string;
  homeTeamEmoji: string;
  homeTeamCode: string | null;

  awayTeamName: string;
  awayTeamEmoji: string;
  awayTeamCode: string | null;

  homeScore: number;
  awayScore: number;

  qualifiedTeamCode: string | null;
  qualificationMethod: "extraTime" | "penalties" | string | null;

  actualHomeScore: number | null;
  actualAwayScore: number | null;
  actualQualifiedTeamCode: string | null;
  actualQualificationMethod: "extraTime" | "penalties" | string | null;

  finalBonusPrediction: {
    firstScoringTeamCode?: string | null;
    firstSpainScorer?: string | null;
    firstArgentinaScorer?: string | null;
  } | null;

  finalBonusResult: {
    firstScoringTeamCode?: string | null;
    firstSpainScorer?: string | null;
    firstArgentinaScorer?: string | null;
  } | null;

  finalBonusPoints: number | null;
  basePoints: number | null;

  points: number;
  resultType: string;
  isCalculated: boolean;

  createdAt: string;
  editedAt: string | null;
  editCount: number;
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

type MatchAdminMetadata = {
  predictionType: PredictionType;
  matchStage?: "group" | "knockout";
  knockoutRound?: "general" | "semiFinal" | "thirdPlace" | "final";
  homeTeamCode: string | null;
  awayTeamCode: string | null;
};

function normalizeMatchStage(value: unknown): "group" | "knockout" | undefined {
  return value === "group" || value === "knockout" ? value : undefined;
}

function normalizeKnockoutRound(
  value: unknown,
): "general" | "semiFinal" | "thirdPlace" | "final" | undefined {
  return value === "general" ||
    value === "semiFinal" ||
    value === "thirdPlace" ||
    value === "final"
    ? value
    : undefined;
}

function toNullableText(value: unknown) {
  const text = toText(value);
  return text || null;
}

function toOptionalObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

async function getMatchAdminMetadataMap() {
  const snapshot = await getDocs(collection(db, "matches"));
  const map = new Map<string, MatchAdminMetadata>();

  snapshot.docs.forEach((docSnap) => {
    if (docSnap.id === "_init") return;

    const data = docSnap.data();

    map.set(docSnap.id, {
      predictionType: normalizePredictionType(data.predictionType),
      matchStage: normalizeMatchStage(data.matchStage),
      knockoutRound: normalizeKnockoutRound(data.knockoutRound),
      homeTeamCode: toNullableText(data.homeTeamCode),
      awayTeamCode: toNullableText(data.awayTeamCode),
    });
  });

  return map;
}

function buildSingleUserStats(predictions: RebuildPrediction[]) {
  const sorted = [...predictions].sort(
    (a, b) => getTimeValue(a.createdAt) - getTimeValue(b.createdAt),
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
  const [predictionsSnapshot, matchMetadataMap] = await Promise.all([
    getDocs(collection(db, "predictions")),
    getMatchAdminMetadataMap(),
  ]);

  return predictionsSnapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();
      const matchId = toText(data.matchId);
      const matchMetadata = matchMetadataMap.get(matchId);

      const finalBonusPrediction = toOptionalObject(data.finalBonusPrediction);
      const finalBonusResult = toOptionalObject(data.finalBonusResult);

      const storedPredictionType = toText(data.predictionType);
      const predictionType =
        storedPredictionType === "golden" || storedPredictionType === "normal"
          ? normalizePredictionType(storedPredictionType)
          : matchMetadata?.predictionType || "normal";

      return {
        id: docSnap.id,

        userId: toText(data.userId),
        userName: toText(data.userName) || "عضو",

        matchId,
        predictionType,

        matchStage:
          normalizeMatchStage(data.matchStage) || matchMetadata?.matchStage,
        knockoutRound:
          normalizeKnockoutRound(data.knockoutRound) ||
          matchMetadata?.knockoutRound,

        homeTeamName: toText(data.homeTeamName),
        homeTeamEmoji: toText(data.homeTeamEmoji),
        homeTeamCode:
          toNullableText(data.homeTeamCode) ||
          matchMetadata?.homeTeamCode ||
          null,

        awayTeamName: toText(data.awayTeamName),
        awayTeamEmoji: toText(data.awayTeamEmoji),
        awayTeamCode:
          toNullableText(data.awayTeamCode) ||
          matchMetadata?.awayTeamCode ||
          null,

        homeScore: toNumber(data.homeScore),
        awayScore: toNumber(data.awayScore),

        qualifiedTeamCode: toNullableText(data.qualifiedTeamCode),
        qualificationMethod: toNullableText(data.qualificationMethod),

        actualHomeScore: toNullableNumber(data.actualHomeScore),
        actualAwayScore: toNullableNumber(data.actualAwayScore),
        actualQualifiedTeamCode: toNullableText(data.actualQualifiedTeamCode),
        actualQualificationMethod: toNullableText(
          data.actualQualificationMethod,
        ),

        finalBonusPrediction: finalBonusPrediction
          ? {
              firstScoringTeamCode: toNullableText(
                finalBonusPrediction.firstScoringTeamCode,
              ),
              firstSpainScorer: toNullableText(
                finalBonusPrediction.firstSpainScorer,
              ),
              firstArgentinaScorer: toNullableText(
                finalBonusPrediction.firstArgentinaScorer,
              ),
            }
          : null,

        finalBonusResult: finalBonusResult
          ? {
              firstScoringTeamCode: toNullableText(
                finalBonusResult.firstScoringTeamCode,
              ),
              firstSpainScorer: toNullableText(
                finalBonusResult.firstSpainScorer,
              ),
              firstArgentinaScorer: toNullableText(
                finalBonusResult.firstArgentinaScorer,
              ),
            }
          : null,

        finalBonusPoints: toNullableNumber(data.finalBonusPoints),
        basePoints: toNullableNumber(data.basePoints),

        points: toNumber(data.points),
        resultType: toText(data.resultType),
        isCalculated: Boolean(data.isCalculated),

        createdAt: toText(data.createdAt),
        editedAt: toNullableText(data.editedAt),
        editCount: toNumber(data.editCount),
        calculatedAt: toNullableText(data.calculatedAt),
      };
    })
    .sort((a, b) => getTimeValue(b.createdAt) - getTimeValue(a.createdAt));
}

export function getPredictionMatchOptions(
  predictions: AdminPrediction[],
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
  predictionId: string,
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
  const deletedPredictionPoints = Boolean(predictionData.isCalculated)
    ? toNumber(predictionData.points)
    : 0;

  if (!userId) {
    throw new Error("معرف العضو غير موجود في التوقع");
  }

  const userPredictionsQuery = query(
    collection(db, "predictions"),
    where("userId", "==", userId),
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
      // لا نعيد بناء users.points من التوقعات فقط، لأن points يشمل نقاط الألعاب
      // مثل تحدي العشر ثواني. نحذف فقط نقاط التوقع المحذوف.
      points: increment(-deletedPredictionPoints),
      total: stats.total,
      correct: stats.correct,
      wrong: stats.wrong,
      currentStreak: stats.currentStreak,
      bestStreak: stats.bestStreak,
      lastUpdated: now,
    },
    { merge: true },
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
        calculatedPredictionsByUser.get(userId) || [],
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