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
import { auth, db } from "./firebase";
import type {
  FinalBonusPrediction,
  FinalBonusResult,
  KnockoutRound,
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
  homeTeamCode?: string | null;
  awayTeamCode?: string | null;

  homeScore: number;
  awayScore: number;

  qualifiedTeamCode?: string | null;
  qualificationMethod?: QualificationMethod | null;

  finalBonusPrediction?: FinalBonusPrediction | null;
  finalBonusResult?: FinalBonusResult | null;
  finalBonusPoints?: number;

  points: number;
  resultType?: string;
  isCalculated: boolean;

  predictionType: PredictionType;
  matchStage: MatchStage;
  knockoutRound?: KnockoutRound;

  actualHomeScore?: number | null;
  actualAwayScore?: number | null;
  actualQualifiedTeamCode?: string | null;
  actualQualificationMethod?: QualificationMethod | null;
  calculatedAt?: string | null;

  createdAt?: string;
  createdAtServer?: unknown;
  updatedAt?: string;
  editedAt?: string | null;
  editCount?: number;
};

export type SubmitPredictionInput = {
  userId: string;
  userName: string;

  matchId: string;

  homeTeamName: string;
  homeTeamEmoji: string;
  awayTeamName: string;
  awayTeamEmoji: string;
  homeTeamCode?: string;
  awayTeamCode?: string;

  homeScore: number;
  awayScore: number;

  qualifiedTeamCode?: string;
  qualificationMethod?: QualificationMethod;

  finalBonusPrediction?: FinalBonusPrediction | null;

  adminOverride?: boolean;
};

export type UpdatePredictionInput = {
  userId: string;
  matchId: string;

  homeScore: number;
  awayScore: number;

  qualifiedTeamCode?: string;
  qualificationMethod?: QualificationMethod;

  finalBonusPrediction?: FinalBonusPrediction | null;
};

export type LatestPrediction = {
  id: string;

  userName: string;

  matchId: string;

  homeTeamName: string;
  homeTeamEmoji: string;
  homeTeamCode?: string | null;

  awayTeamName: string;
  awayTeamEmoji: string;
  awayTeamCode?: string | null;

  homeScore: number;
  awayScore: number;

  qualifiedTeamCode?: string | null;
  qualificationMethod?: QualificationMethod | null;

  predictionType: PredictionType;
  matchStage: MatchStage;
  knockoutRound?: KnockoutRound;

  createdAt?: string;
};

type PredictionMatchInfo = {
  predictionType: PredictionType;
  matchStage: MatchStage;
  knockoutRound?: KnockoutRound;
  homeTeamCode: string;
  awayTeamCode: string;
  startAt: string;
  status: string;
  isActive: boolean;
};

export const PREDICTION_EDIT_WINDOW_MS = 5 * 60 * 1000;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePredictionType(value: unknown): PredictionType {
  return value === "golden" ? "golden" : "normal";
}

function normalizeMatchStage(value: unknown): MatchStage {
  return value === "knockout" ? "knockout" : "group";
}

function normalizeKnockoutRound(
  value: unknown
): KnockoutRound | undefined {
  if (
    value === "general" ||
    value === "semiFinal" ||
    value === "thirdPlace" ||
    value === "final"
  ) {
    return value;
  }

  return undefined;
}

function normalizeQualificationMethod(
  value: unknown
): QualificationMethod | null {
  if (value === "extraTime" || value === "penalties") {
    return value;
  }

  return null;
}

function normalizeFinalBonusFields(
  value: unknown
): FinalBonusPrediction | null {
  if (!isRecord(value)) return null;

  const firstScoringTeamCode = toText(value.firstScoringTeamCode);
  const firstSpainScorer = toText(value.firstSpainScorer);
  const firstArgentinaScorer = toText(value.firstArgentinaScorer);

  if (
    !firstScoringTeamCode ||
    !firstSpainScorer ||
    !firstArgentinaScorer
  ) {
    return null;
  }

  return {
    firstScoringTeamCode,
    firstSpainScorer,
    firstArgentinaScorer,
  };
}

function isWorldCupFinalMatchInfo(matchInfo: PredictionMatchInfo) {
  return (
    matchInfo.matchStage === "knockout" &&
    matchInfo.knockoutRound === "final"
  );
}

function validateFinalBonusPredictionFields({
  matchInfo,
  finalBonusPrediction,
}: {
  matchInfo: PredictionMatchInfo;
  finalBonusPrediction?: FinalBonusPrediction | null;
}) {
  if (!isWorldCupFinalMatchInfo(matchInfo)) return null;

  if (!isRecord(finalBonusPrediction)) {
    throw new Error("أكمل اختيارات إضافات النهائي");
  }

  const firstScoringTeamCode = toText(
    finalBonusPrediction.firstScoringTeamCode
  );
  const firstSpainScorer = toText(
    finalBonusPrediction.firstSpainScorer
  );
  const firstArgentinaScorer = toText(
    finalBonusPrediction.firstArgentinaScorer
  );

  const validFirstScoringTeam =
    firstScoringTeamCode === matchInfo.homeTeamCode ||
    firstScoringTeamCode === matchInfo.awayTeamCode ||
    firstScoringTeamCode === "none";

  if (!validFirstScoringTeam) {
    throw new Error("اختر من يبدأ التسجيل في النهائي");
  }

  if (!firstSpainScorer) {
    throw new Error("اختر أول مسجل من إسبانيا");
  }

  if (!firstArgentinaScorer) {
    throw new Error("اختر أول مسجل من الأرجنتين");
  }

  return {
    firstScoringTeamCode,
    firstSpainScorer,
    firstArgentinaScorer,
  } satisfies FinalBonusPrediction;
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
      knockoutRound: undefined,
      homeTeamCode: "",
      awayTeamCode: "",
      startAt: "",
      status: "scheduled",
      isActive: false,
    };
  }

  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);

  if (!matchSnap.exists()) {
    return {
      predictionType: "normal",
      matchStage: "group",
      knockoutRound: undefined,
      homeTeamCode: "",
      awayTeamCode: "",
      startAt: "",
      status: "scheduled",
      isActive: false,
    };
  }

  const data = matchSnap.data();
  const matchStage = normalizeMatchStage(data.matchStage);

  return {
    predictionType: normalizePredictionType(data.predictionType),
    matchStage,
    knockoutRound:
      matchStage === "knockout"
        ? normalizeKnockoutRound(data.knockoutRound) || "general"
        : undefined,
    homeTeamCode: toText(data.homeTeamCode),
    awayTeamCode: toText(data.awayTeamCode),
    startAt: toText(data.startAt),
    status: toText(data.status) || "scheduled",
    isActive: Boolean(data.isActive),
  };
}

function getTimeValue(createdAt?: string) {
  if (!createdAt) return 0;

  const time = new Date(createdAt).getTime();

  return Number.isFinite(time) ? time : 0;
}

function mapPrediction(
  id: string,
  data: Record<string, unknown>
): Prediction {
  const matchStage = normalizeMatchStage(data.matchStage);
  const knockoutRound =
    matchStage === "knockout"
      ? normalizeKnockoutRound(data.knockoutRound)
      : undefined;

  return {
    id,

    userId: toText(data.userId),
    userName: toText(data.userName) || "عضو",

    matchId: toText(data.matchId),

    homeTeamName: toText(data.homeTeamName),
    homeTeamEmoji: toText(data.homeTeamEmoji),
    awayTeamName: toText(data.awayTeamName),
    awayTeamEmoji: toText(data.awayTeamEmoji),

    homeTeamCode:
      data.homeTeamCode === null || data.homeTeamCode === undefined
        ? null
        : toText(data.homeTeamCode),

    awayTeamCode:
      data.awayTeamCode === null || data.awayTeamCode === undefined
        ? null
        : toText(data.awayTeamCode),

    homeScore: toNumber(data.homeScore),
    awayScore: toNumber(data.awayScore),

    qualifiedTeamCode:
      data.qualifiedTeamCode === null ||
      data.qualifiedTeamCode === undefined
        ? null
        : toText(data.qualifiedTeamCode),

    qualificationMethod: normalizeQualificationMethod(
      data.qualificationMethod
    ),

    finalBonusPrediction: normalizeFinalBonusFields(
      data.finalBonusPrediction
    ),
    finalBonusResult: normalizeFinalBonusFields(
      data.finalBonusResult
    ) as FinalBonusResult | null,
    finalBonusPoints: toNumber(data.finalBonusPoints),

    points: toNumber(data.points),
    resultType: toText(data.resultType),
    isCalculated: Boolean(data.isCalculated),

    predictionType: normalizePredictionType(data.predictionType),
    matchStage,
    knockoutRound,

    actualHomeScore:
      data.actualHomeScore === null ||
      data.actualHomeScore === undefined
        ? null
        : toNumber(data.actualHomeScore),

    actualAwayScore:
      data.actualAwayScore === null ||
      data.actualAwayScore === undefined
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

    editedAt:
      data.editedAt === null || data.editedAt === undefined
        ? null
        : toText(data.editedAt),

    editCount: toNumber(data.editCount),
  };
}

function getMatchStartTime(startAt: string) {
  const startTime = new Date(startAt).getTime();

  return Number.isFinite(startTime) ? startTime : 0;
}

export function getPredictionEditWindowRemainingMs(
  prediction: Prediction,
  matchStartAt: string,
  nowTime = Date.now()
) {
  if (!prediction || prediction.isCalculated) return 0;

  const startTime = getMatchStartTime(matchStartAt);

  if (!startTime) return 0;

  const createdTime = prediction.createdAt
    ? new Date(prediction.createdAt).getTime()
    : 0;

  if (!createdTime || !Number.isFinite(createdTime)) {
    return 0;
  }

  const editDeadline = createdTime + PREDICTION_EDIT_WINDOW_MS;
  const closeTime = Math.min(startTime, editDeadline);

  return Math.max(0, closeTime - nowTime);
}

function isPredictionEditWindowOpen(
  prediction: Prediction,
  matchInfo: Pick<
    PredictionMatchInfo,
    "startAt" | "status" | "isActive"
  >,
  nowTime = Date.now()
) {
  if (!prediction || prediction.isCalculated) return false;
  if (!matchInfo.isActive || matchInfo.status !== "scheduled") return false;

  const remainingMs = getPredictionEditWindowRemainingMs(
    prediction,
    matchInfo.startAt,
    nowTime
  );

  return remainingMs > 0;
}

function validateKnockoutPredictionFields({
  matchInfo,
  homeScore,
  awayScore,
  qualifiedTeamCode,
  qualificationMethod,
}: {
  matchInfo: PredictionMatchInfo;
  homeScore: number;
  awayScore: number;
  qualifiedTeamCode?: string;
  qualificationMethod?: QualificationMethod | null;
}) {
  const isKnockoutDrawPrediction =
    matchInfo.matchStage === "knockout" &&
    homeScore === awayScore;

  const isFinal = isWorldCupFinalMatchInfo(matchInfo);

  const cleanQualifiedTeamCode = isKnockoutDrawPrediction
    ? toText(qualifiedTeamCode)
    : "";

  const cleanQualificationMethod = isKnockoutDrawPrediction
    ? normalizeQualificationMethod(qualificationMethod)
    : null;

  if (isKnockoutDrawPrediction) {
    const validQualifiedTeam =
      cleanQualifiedTeamCode === matchInfo.homeTeamCode ||
      cleanQualifiedTeamCode === matchInfo.awayTeamCode;

    if (!validQualifiedTeam) {
      throw new Error(
        isFinal ? "اختر بطل كأس العالم" : "اختر المنتخب المتأهل"
      );
    }

    if (!cleanQualificationMethod) {
      throw new Error(
        isFinal ? "اختر طريقة حسم اللقب" : "اختر طريقة التأهل"
      );
    }
  }

  return {
    qualifiedTeamCode: isKnockoutDrawPrediction
      ? cleanQualifiedTeamCode
      : null,

    qualificationMethod: isKnockoutDrawPrediction
      ? cleanQualificationMethod
      : null,
  };
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
    return mapPrediction(
      fixedPredictionSnap.id,
      fixedPredictionSnap.data()
    );
  }

  const predictionsRef = collection(db, "predictions");

  const predictionsQuery = query(
    predictionsRef,
    where("userId", "==", userId),
    where("matchId", "==", matchId),
    limit(1)
  );

  const snapshot = await getDocs(predictionsQuery);

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];

  return mapPrediction(docSnap.id, docSnap.data());
}

export async function submitPrediction(
  input: SubmitPredictionInput
) {
  if (!input.userId) {
    throw new Error("يجب تسجيل الدخول أولًا لاعتماد التوقع");
  }

  if (!input.matchId) {
    throw new Error("بيانات المباراة غير مكتملة");
  }

  if (
    !validateScore(input.homeScore) ||
    !validateScore(input.awayScore)
  ) {
    throw new Error("أدخل نتيجة صحيحة من 0 إلى 30");
  }

  return saveLegacyPredictionViaApi(input);

  const predictionDocId = getPredictionDocId(
    input.userId,
    input.matchId
  );

  const predictionRef = doc(
    db,
    "predictions",
    predictionDocId
  );

  const existingFixedPrediction = await getDoc(predictionRef);

  if (
    existingFixedPrediction.exists() &&
    !input.adminOverride
  ) {
    throw new Error(
      "تم اعتماد توقعك مسبقًا لهذه المباراة ولا يمكن تعديله"
    );
  }

  const existingPrediction = await getUserPredictionForMatch(
    input.userId,
    input.matchId
  );

  if (existingPrediction && !input.adminOverride) {
    throw new Error(
      "تم اعتماد توقعك مسبقًا لهذه المباراة ولا يمكن تعديله"
    );
  }

  const matchInfo = await getPredictionMatchInfo(input.matchId);

  const { qualifiedTeamCode, qualificationMethod } =
    validateKnockoutPredictionFields({
      matchInfo,
      homeScore: input.homeScore,
      awayScore: input.awayScore,
      qualifiedTeamCode: input.qualifiedTeamCode,
      qualificationMethod: input.qualificationMethod,
    });

  const finalBonusPrediction = validateFinalBonusPredictionFields({
    matchInfo,
    finalBonusPrediction: input.finalBonusPrediction,
  });

  const now = new Date().toISOString();

  const predictionData = {
    userId: input.userId,
    userName: input.userName || "عضو",

    matchId: input.matchId,

    homeTeamName: input.homeTeamName,
    homeTeamEmoji: input.homeTeamEmoji,
    awayTeamName: input.awayTeamName,
    awayTeamEmoji: input.awayTeamEmoji,

    homeTeamCode:
      toText(input.homeTeamCode) || matchInfo.homeTeamCode,

    awayTeamCode:
      toText(input.awayTeamCode) || matchInfo.awayTeamCode,

    homeScore: input.homeScore,
    awayScore: input.awayScore,

    qualifiedTeamCode,
    qualificationMethod,

    points: 0,
    resultType: "",
    isCalculated: false,

    predictionType: matchInfo.predictionType,
    matchStage: matchInfo.matchStage,
    ...(matchInfo.matchStage === "knockout" && matchInfo.knockoutRound
      ? { knockoutRound: matchInfo.knockoutRound }
      : {}),

    ...(isWorldCupFinalMatchInfo(matchInfo)
      ? {
          finalBonusPrediction,
          finalBonusResult: null,
          finalBonusPoints: 0,
        }
      : {}),

    actualHomeScore: null,
    actualAwayScore: null,
    actualQualifiedTeamCode: null,
    actualQualificationMethod: null,
    calculatedAt: null,

    createdAt: now,
    createdAtServer: serverTimestamp(),
    updatedAt: now,
    editedAt: null,
    editCount: 0,
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

export async function updatePrediction(
  input: UpdatePredictionInput
) {
  if (!input.userId) {
    throw new Error("يجب تسجيل الدخول أولًا لتعديل التوقع");
  }

  if (!input.matchId) {
    throw new Error("بيانات المباراة غير مكتملة");
  }

  if (
    !validateScore(input.homeScore) ||
    !validateScore(input.awayScore)
  ) {
    throw new Error("أدخل نتيجة صحيحة من 0 إلى 30");
  }

  return saveLegacyPredictionViaApi(input);

  const predictionDocId = getPredictionDocId(
    input.userId,
    input.matchId
  );

  const predictionRef = doc(
    db,
    "predictions",
    predictionDocId
  );

  const predictionSnap = await getDoc(predictionRef);

  if (!predictionSnap.exists()) {
    throw new Error("لم يتم العثور على توقعك لهذه المباراة");
  }

  const currentPrediction = mapPrediction(
    predictionSnap.id,
    predictionSnap.data()!
  );

  const matchInfo = await getPredictionMatchInfo(input.matchId);

  if (!isPredictionEditWindowOpen(currentPrediction, matchInfo)) {
    throw new Error("انتهت مدة تعديل التوقع");
  }

  const { qualifiedTeamCode, qualificationMethod } =
    validateKnockoutPredictionFields({
      matchInfo,
      homeScore: input.homeScore,
      awayScore: input.awayScore,
      qualifiedTeamCode: input.qualifiedTeamCode,
      qualificationMethod: input.qualificationMethod,
    });

  const finalBonusPrediction = validateFinalBonusPredictionFields({
    matchInfo,
    finalBonusPrediction: input.finalBonusPrediction,
  });

  const now = new Date().toISOString();
  const editCount = (currentPrediction.editCount || 0) + 1;

  const predictionUpdate = {
    homeScore: input.homeScore,
    awayScore: input.awayScore,
    qualifiedTeamCode,
    qualificationMethod,
    ...(isWorldCupFinalMatchInfo(matchInfo)
      ? { finalBonusPrediction }
      : {}),
    updatedAt: now,
    editedAt: now,
    editCount,
  };

  const batch = writeBatch(db);

  batch.update(predictionRef, predictionUpdate);

  await batch.commit();

  return {
    ...currentPrediction,
    ...predictionUpdate,
  } as Prediction;
}

async function saveLegacyPredictionViaApi(
  input: Pick<
    SubmitPredictionInput,
    | "userId"
    | "matchId"
    | "homeScore"
    | "awayScore"
    | "qualifiedTeamCode"
    | "qualificationMethod"
    | "finalBonusPrediction"
    | "adminOverride"
  >
) {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser || (!input.adminOverride && firebaseUser.uid !== input.userId)) {
    throw new Error("انتهت جلسة الدخول. سجّل الدخول مرة أخرى ثم أعد المحاولة.");
  }

  const response = await fetch("/api/legacy/predictions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await firebaseUser.getIdToken()}`,
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as {
    prediction?: Prediction;
    error?: string;
  } | null;
  if (!response.ok || !data?.prediction) {
    throw new Error(data?.error || "تعذر حفظ التوقع الآن.");
  }
  return data.prediction;
}

export async function getLatestPredictions(
  maxItems = 100
): Promise<LatestPrediction[]> {
  const limit = Math.min(2_000, Math.max(1, Math.floor(maxItems)));
  const response = await fetch(`/api/public/legacy-community?view=latest-predictions&limit=${limit}`, {
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as {
    predictions?: LatestPrediction[];
    error?: string;
  } | null;
  if (!response.ok || !data?.predictions) {
    throw new Error(data?.error || "تعذر تحميل التوقعات المعلنة الآن.");
  }
  return data.predictions;
}

export async function getPredictionsByUserId(
  userId: string
): Promise<Prediction[]> {
  if (!userId) return [];

  const predictionsRef = collection(db, "predictions");

  const predictionsQuery = query(
    predictionsRef,
    where("userId", "==", userId)
  );

  const [predictionsSnapshot, matchesSnapshot] = await Promise.all([
    getDocs(predictionsQuery),
    getDocs(collection(db, "matches")),
  ]);

  const matchInfoById = new Map<
    string,
    {
      matchStage: MatchStage;
      knockoutRound?: KnockoutRound;
    }
  >();

  matchesSnapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .forEach((docSnap) => {
      const matchData = docSnap.data();
      const matchStage = normalizeMatchStage(matchData.matchStage);

      matchInfoById.set(docSnap.id, {
        matchStage,
        knockoutRound:
          matchStage === "knockout"
            ? normalizeKnockoutRound(matchData.knockoutRound) || "general"
            : undefined,
      });
    });

  return predictionsSnapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const prediction = mapPrediction(docSnap.id, docSnap.data());
      const matchInfo = matchInfoById.get(prediction.matchId);

      if (!matchInfo) return prediction;

      return {
        ...prediction,
        matchStage: matchInfo.matchStage,
        knockoutRound: matchInfo.knockoutRound,
      };
    })
    .sort(
      (a, b) =>
        getTimeValue(b.createdAt) -
        getTimeValue(a.createdAt)
    );
}
