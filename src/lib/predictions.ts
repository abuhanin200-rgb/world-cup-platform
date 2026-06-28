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
import type {
  MatchStage,
  PredictionType,
  QualificationMethod,
} from "./matches";

export type Prediction = {
  id: string;

  userId: string;
  userName: string;

  matchId: string;

  homeTeamName: string;
  homeTeamEmoji: string;
  awayTeamName: string;
  awayTeamEmoji: string;
  homeTeamCode: string;
  awayTeamCode: string;

  homeScore: number;
  awayScore: number;

  qualifiedTeamCode?: string | null;
  qualificationMethod?: QualificationMethod | null;

  points: number;
  resultType?: string;
  isCalculated: boolean;

  predictionType: PredictionType;
  matchStage: MatchStage;

  actualHomeScore?: number | null;
  actualAwayScore?: number | null;
  actualQualifiedTeamCode?: string | null;
  actualQualificationMethod?: QualificationMethod | null;
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

  qualifiedTeamCode?: string;
  qualificationMethod?: QualificationMethod;
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
  matchStage: MatchStage;
  createdAt?: string;
};

type MatchForTicker = {
  id: string;
  startAt: string;
  status: string;
  isActive: boolean;
};

type PredictionMatchInfo = {
  predictionType: PredictionType;
  matchStage: MatchStage;
  homeTeamCode: string;
  awayTeamCode: string;
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

function normalizeMatchStage(value: unknown): MatchStage {
  return value === "knockout" ? "knockout" : "group";
}

function normalizeQualificationMethod(
  value: unknown
): QualificationMethod | null {
  if (value === "extraTime" || value === "penalties") {
    return value;
  }

  return null;
}

function getPredictionDocId(userId: string, matchId: string) {
  return `${userId}_${matchId}`;
}

async function getPredictionMatchInfo(
  matchId: string
): Promise<PredictionMatchInfo> {
  if (!matchId) {
    return {
      predictionType: "normal",
      matchStage: "group",
      homeTeamCode: "",
      awayTeamCode: "",
    };
  }

  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);

  if (!matchSnap.exists()) {
    return {
      predictionType: "normal",
      matchStage: "group",
      homeTeamCode: "",
      awayTeamCode: "",
    };
  }

  const data = matchSnap.data();

  return {
    predictionType: normalizePredictionType(data.predictionType),
    matchStage: normalizeMatchStage(data.matchStage),
    homeTeamCode: toText(data.homeTeamCode),
    awayTeamCode: toText(data.awayTeamCode),
  };
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
    homeTeamCode: toText(data.homeTeamCode),
    awayTeamCode: toText(data.awayTeamCode),

    homeScore: toNumber(data.homeScore),
    awayScore: toNumber(data.awayScore),

    qualifiedTeamCode:
      data.qualifiedTeamCode === null || data.qualifiedTeamCode === undefined
        ? null
        : toText(data.qualifiedTeamCode),

    qualificationMethod: normalizeQualificationMethod(data.qualificationMethod),

    points: toNumber(data.points),
    resultType: toText(data.resultType),
    isCalculated: Boolean(data.isCalculated),

    predictionType: normalizePredictionType(data.predictionType),
    matchStage: normalizeMatchStage(data.matchStage),

    actualHomeScore:
      data.actualHomeScore === null || data.actualHomeScore === undefined
        ? null
        : toNumber(data.actualHomeScore),

    actualAwayScore:
      data.actualAwayScore === null || data.actualAwayScore === undefined
        ? null
        : toNumber(data.actualAwayScore),

    actualQualifiedTeamCode:
      data.actualQualifiedTeamCode === null ||
      data.actualQualifiedTeamCode === undefined
        ? null
        : toText(data.actualQualifiedTeamCode),

    actualQualificationMethod: normalizeQualificationMethod(
      data.actualQualificationMethod
    ),

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

  const fixedPredictionRef = doc(
    db,
    "predictions",
    getPredictionDocId(userId, matchId)
  );

  const fixedPredictionSnap = await getDoc(fixedPredictionRef);

  if (fixedPredictionSnap.exists()) {
    return mapPrediction(fixedPredictionSnap.id, fixedPredictionSnap.data());
  }

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

  const predictionDocId = getPredictionDocId(input.userId, input.matchId);
  const predictionRef = doc(db, "predictions", predictionDocId);

  const existingFixedPrediction = await getDoc(predictionRef);

  if (existingFixedPrediction.exists()) {
    throw new Error("تم اعتماد توقعك مسبقًا لهذه المباراة ولا يمكن تعديله");
  }

  const existingPrediction = await getUserPredictionForMatch(
    input.userId,
    input.matchId
  );

  if (existingPrediction) {
    throw new Error("تم اعتماد توقعك مسبقًا لهذه المباراة ولا يمكن تعديله");
  }

  const matchInfo = await getPredictionMatchInfo(input.matchId);
  const isKnockoutDrawPrediction =
    matchInfo.matchStage === "knockout" && input.homeScore === input.awayScore;

  const qualifiedTeamCode = isKnockoutDrawPrediction
    ? toText(input.qualifiedTeamCode)
    : "";

  const qualificationMethod = isKnockoutDrawPrediction
    ? normalizeQualificationMethod(input.qualificationMethod)
    : null;

  if (isKnockoutDrawPrediction) {
    const validQualifiedTeam =
      qualifiedTeamCode === matchInfo.homeTeamCode ||
      qualifiedTeamCode === matchInfo.awayTeamCode;

    if (!validQualifiedTeam) {
      throw new Error("اختر المنتخب المتأهل");
    }

    if (!qualificationMethod) {
      throw new Error("اختر طريقة التأهل");
    }
  }

  const now = new Date().toISOString();

  const predictionData = {
    userId: input.userId,
    userName: input.userName || "عضو",

    matchId: input.matchId,

    homeTeamName: input.homeTeamName,
    homeTeamEmoji: input.homeTeamEmoji,
    awayTeamName: input.awayTeamName,
    awayTeamEmoji: input.awayTeamEmoji,
    homeTeamCode: matchInfo.homeTeamCode,
    awayTeamCode: matchInfo.awayTeamCode,

    homeScore: input.homeScore,
    awayScore: input.awayScore,

    qualifiedTeamCode: isKnockoutDrawPrediction ? qualifiedTeamCode : null,
    qualificationMethod: isKnockoutDrawPrediction ? qualificationMethod : null,

    points: 0,
    resultType: "",
    isCalculated: false,

    predictionType: matchInfo.predictionType,
    matchStage: matchInfo.matchStage,

    actualHomeScore: null,
    actualAwayScore: null,
    actualQualifiedTeamCode: null,
    actualQualificationMethod: null,
    calculatedAt: null,

    createdAt: now,
    createdAtServer: serverTimestamp(),
    updatedAt: now,
  };

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
      matchStage: prediction.matchStage,
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