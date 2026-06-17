import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { PredictionType } from "./matches";

export type Prediction = {
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
  resultType?: string;
  isCalculated: boolean;

  predictionType: PredictionType;

  actualHomeScore?: number | null;
  actualAwayScore?: number | null;
  calculatedAt?: string | null;

  createdAt?: string;
  createdAtServer?: unknown;
  updatedAt?: string;
};

export type SubmitPredictionInput = {
  userId: string;
  userName: string;

  matchId: string;

  homeTeamName: string;
  homeTeamEmoji: string;
  awayTeamName: string;
  awayTeamEmoji: string;

  homeScore: number;
  awayScore: number;
};

export type LatestPrediction = {
  id: string;
  userName: string;
  homeTeamName: string;
  homeTeamEmoji: string;
  awayTeamName: string;
  awayTeamEmoji: string;
  homeScore: number;
  awayScore: number;
  predictionType: PredictionType;
  createdAt?: string;
};

type MatchForTicker = {
  id: string;
  startAt: string;
  status: string;
  isActive: boolean;
};

function validateScore(score: number) {
  return Number.isInteger(score) && score >= 0 && score <= 30;
}

function toText(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizePredictionType(value: unknown): PredictionType {
  return value === "golden" ? "golden" : "normal";
}

async function getPredictionTypeForMatch(
  matchId: string
): Promise<PredictionType> {
  if (!matchId) return "normal";

  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);

  if (!matchSnap.exists()) {
    return "normal";
  }

  const data = matchSnap.data();

  return normalizePredictionType(data.predictionType);
}

function getTimeValue(createdAt?: string) {
  if (!createdAt) return 0;

  const time = new Date(createdAt).getTime();

  return Number.isFinite(time) ? time : 0;
}

function mapPrediction(id: string, data: Record<string, unknown>): Prediction {
  return {
    id,

    userId: toText(data.userId),
    userName: toText(data.userName) || "عضو",

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

    predictionType: normalizePredictionType(data.predictionType),

    actualHomeScore:
      data.actualHomeScore === null || data.actualHomeScore === undefined
        ? null
        : toNumber(data.actualHomeScore),

    actualAwayScore:
      data.actualAwayScore === null || data.actualAwayScore === undefined
        ? null
        : toNumber(data.actualAwayScore),

    calculatedAt:
      data.calculatedAt === null || data.calculatedAt === undefined
        ? null
        : toText(data.calculatedAt),

    createdAt: toText(data.createdAt),
    createdAtServer: data.createdAtServer,
    updatedAt: toText(data.updatedAt),
  };
}

function mapMatch(id: string, data: Record<string, unknown>): MatchForTicker {
  return {
    id,
    startAt: toText(data.startAt),
    status: toText(data.status) || "scheduled",
    isActive: Boolean(data.isActive),
  };
}

function isMatchStillBeforeStart(match?: MatchForTicker) {
  if (!match) return false;

  if (!match.isActive) return false;
  if (match.status !== "scheduled") return false;

  const startTime = new Date(match.startAt).getTime();

  if (!Number.isFinite(startTime)) return false;

  return startTime > Date.now();
}

export async function getUserPredictionForMatch(
  userId: string,
  matchId: string
): Promise<Prediction | null> {
  if (!userId || !matchId) return null;

  const predictionsRef = collection(db, "predictions");

  const q = query(
    predictionsRef,
    where("userId", "==", userId),
    where("matchId", "==", matchId),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];

  return mapPrediction(docSnap.id, docSnap.data());
}

export async function submitPrediction(input: SubmitPredictionInput) {
  if (!input.userId) {
    throw new Error("يجب تسجيل الدخول أولًا لاعتماد التوقع");
  }

  if (!input.matchId) {
    throw new Error("بيانات المباراة غير مكتملة");
  }

  if (!validateScore(input.homeScore) || !validateScore(input.awayScore)) {
    throw new Error("أدخل نتيجة صحيحة من 0 إلى 30");
  }

  const existingPrediction = await getUserPredictionForMatch(
    input.userId,
    input.matchId
  );

  if (existingPrediction) {
    throw new Error("تم اعتماد توقعك مسبقًا لهذه المباراة ولا يمكن تعديله");
  }

  const predictionType = await getPredictionTypeForMatch(input.matchId);

  const now = new Date().toISOString();

  const predictionData = {
    userId: input.userId,
    userName: input.userName || "عضو",

    matchId: input.matchId,

    homeTeamName: input.homeTeamName,
    homeTeamEmoji: input.homeTeamEmoji,
    awayTeamName: input.awayTeamName,
    awayTeamEmoji: input.awayTeamEmoji,

    homeScore: input.homeScore,
    awayScore: input.awayScore,

    points: 0,
    resultType: "",
    isCalculated: false,

    predictionType,

    actualHomeScore: null,
    actualAwayScore: null,
    calculatedAt: null,

    createdAt: now,
    createdAtServer: serverTimestamp(),
    updatedAt: now,
  };

  /**
   * نحفظ التوقع ونحدث وقت آخر توقع للعضو في عملية واحدة.
   * هذا لا يغير النقاط ولا الحسبة.
   * فقط يساعد لوحة الصدارة على ترتيب المتساوين حسب الأسرع.
   */
  const predictionRef = doc(collection(db, "predictions"));
  const userRef = doc(db, "users", input.userId);

  const batch = writeBatch(db);

  batch.set(predictionRef, predictionData);

  batch.set(
    userRef,
    {
      lastPredictionAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  await batch.commit();

  return {
    id: predictionRef.id,
    ...predictionData,
  } as Prediction;
}

export async function getLatestPredictions(
  maxItems = 100
): Promise<LatestPrediction[]> {
  const [predictionsSnapshot, matchesSnapshot] = await Promise.all([
    getDocs(collection(db, "predictions")),
    getDocs(collection(db, "matches")),
  ]);

  const matchesMap = new Map<string, MatchForTicker>();

  matchesSnapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .forEach((docSnap) => {
      matchesMap.set(docSnap.id, mapMatch(docSnap.id, docSnap.data()));
    });

  return predictionsSnapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => mapPrediction(docSnap.id, docSnap.data()))
    .filter((prediction) => {
      const match = matchesMap.get(prediction.matchId);

      const hasPredictionData =
        prediction.userName &&
        prediction.matchId &&
        prediction.homeTeamName &&
        prediction.awayTeamName;

      return (
        hasPredictionData &&
        !prediction.isCalculated &&
        isMatchStillBeforeStart(match)
      );
    })
    .sort((a, b) => getTimeValue(b.createdAt) - getTimeValue(a.createdAt))
    .slice(0, maxItems)
    .map((prediction) => ({
      id: prediction.id,
      userName: prediction.userName,
      homeTeamName: prediction.homeTeamName,
      homeTeamEmoji: prediction.homeTeamEmoji,
      awayTeamName: prediction.awayTeamName,
      awayTeamEmoji: prediction.awayTeamEmoji,
      homeScore: prediction.homeScore,
      awayScore: prediction.awayScore,
      predictionType: prediction.predictionType,
      createdAt: prediction.createdAt,
    }));
}

export async function getPredictionsByUserId(
  userId: string
): Promise<Prediction[]> {
  if (!userId) return [];

  const predictionsRef = collection(db, "predictions");

  const q = query(predictionsRef, where("userId", "==", userId));

  const snapshot = await getDocs(q);

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => mapPrediction(docSnap.id, docSnap.data()))
    .sort((a, b) => getTimeValue(b.createdAt) - getTimeValue(a.createdAt));
}