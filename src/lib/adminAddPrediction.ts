import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { QualificationMethod } from "./matches";
import type { AppUser } from "./users";

type AdminAddPredictionMatch = {
  id: string;
  homeTeamName: string;
  homeTeamEmoji: string;
  homeTeamCode: string;
  awayTeamName: string;
  awayTeamEmoji: string;
  awayTeamCode: string;
  predictionType: "normal" | "golden";
  matchStage: "group" | "knockout";
  resultCalculated: boolean;
};

type AddPredictionForUserInput = {
  userId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  qualifiedTeamCode?: string;
  qualificationMethod?: QualificationMethod;
  adminName?: string;
};

function toText(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function validateScore(score: number) {
  return Number.isInteger(score) && score >= 0 && score <= 30;
}

function getPredictionDocId(userId: string, matchId: string) {
  return `${userId}_${matchId}`;
}

function mapUser(id: string, data: Record<string, unknown>): AppUser {
  return {
    id,
    fullName: toText(data.fullName),
    phone: toText(data.phone),
    password: data.password ? toText(data.password) : undefined,

    favoriteTeam: toText(data.favoriteTeam),
    teamEmoji: toText(data.teamEmoji),

    points: toNumber(data.points),
    total: toNumber(data.total),
    correct: toNumber(data.correct),
    wrong: toNumber(data.wrong),

    currentRank: toNumber(data.currentRank),
    previousRank: toNumber(data.previousRank),
    rankChange: toNumber(data.rankChange),
    rankDirection:
      data.rankDirection === "up" || data.rankDirection === "down"
        ? data.rankDirection
        : "-",

    currentStreak: toNumber(data.currentStreak),
    bestStreak: toNumber(data.bestStreak),

    seenNotices: {},

    createdAt: data.createdAt ? toText(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? toText(data.updatedAt) : undefined,
    lastUpdated: data.lastUpdated ? toText(data.lastUpdated) : undefined,
  };
}

function mapMatch(
  id: string,
  data: Record<string, unknown>
): AdminAddPredictionMatch {
  return {
    id,
    homeTeamName: toText(data.homeTeamName),
    homeTeamEmoji: toText(data.homeTeamEmoji),
    homeTeamCode: toText(data.homeTeamCode),

    awayTeamName: toText(data.awayTeamName),
    awayTeamEmoji: toText(data.awayTeamEmoji),
    awayTeamCode: toText(data.awayTeamCode),

    predictionType: data.predictionType === "golden" ? "golden" : "normal",
    matchStage: data.matchStage === "knockout" ? "knockout" : "group",

    resultCalculated: Boolean(data.resultCalculated),
  };
}

export async function getAdminAddPredictionUsers(): Promise<AppUser[]> {
  const snapshot = await getDocs(collection(db, "users"));

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => mapUser(docSnap.id, docSnap.data()))
    .filter((user) => Boolean(user.fullName))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "ar"));
}

export async function getAdminAddPredictionMatches(): Promise<
  AdminAddPredictionMatch[]
> {
  const snapshot = await getDocs(collection(db, "matches"));

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => mapMatch(docSnap.id, docSnap.data()))
    .filter((match) => !match.resultCalculated)
    .sort((a, b) =>
      `${a.homeTeamName} ${a.awayTeamName}`.localeCompare(
        `${b.homeTeamName} ${b.awayTeamName}`,
        "ar"
      )
    );
}

export async function addPredictionForUser(input: AddPredictionForUserInput) {
  if (!input.userId) {
    throw new Error("اختر العضو");
  }

  if (!input.matchId) {
    throw new Error("اختر المباراة");
  }

  if (!validateScore(input.homeScore) || !validateScore(input.awayScore)) {
    throw new Error("أدخل نتيجة صحيحة من 0 إلى 30");
  }

  const userRef = doc(db, "users", input.userId);
  const matchRef = doc(db, "matches", input.matchId);

  const [userSnap, matchSnap] = await Promise.all([
    getDoc(userRef),
    getDoc(matchRef),
  ]);

  if (!userSnap.exists()) {
    throw new Error("العضو غير موجود");
  }

  if (!matchSnap.exists()) {
    throw new Error("المباراة غير موجودة");
  }

  const user = mapUser(userSnap.id, userSnap.data());
  const match = mapMatch(matchSnap.id, matchSnap.data());

  if (match.resultCalculated) {
    throw new Error("لا يمكن إضافة توقع بعد احتساب المباراة");
  }

  const predictionDocId = getPredictionDocId(input.userId, input.matchId);
  const predictionRef = doc(db, "predictions", predictionDocId);
  const existingPredictionSnap = await getDoc(predictionRef);

  if (existingPredictionSnap.exists()) {
    throw new Error("هذا العضو لديه توقع مسجل مسبقًا لهذه المباراة");
  }

  const isKnockoutDraw =
    match.matchStage === "knockout" && input.homeScore === input.awayScore;

  const cleanQualifiedTeamCode = isKnockoutDraw
    ? toText(input.qualifiedTeamCode)
    : "";

  const cleanQualificationMethod = isKnockoutDraw
    ? input.qualificationMethod
    : null;

  if (isKnockoutDraw) {
    const validQualifiedTeam =
      cleanQualifiedTeamCode === match.homeTeamCode ||
      cleanQualifiedTeamCode === match.awayTeamCode;

    if (!validQualifiedTeam) {
      throw new Error("اختر المنتخب المتأهل");
    }

    if (
      cleanQualificationMethod !== "extraTime" &&
      cleanQualificationMethod !== "penalties"
    ) {
      throw new Error("اختر طريقة التأهل");
    }
  }

  const now = new Date().toISOString();

  const predictionData = {
    userId: user.id,
    userName: user.fullName || "عضو",

    matchId: match.id,

    homeTeamName: match.homeTeamName,
    homeTeamEmoji: match.homeTeamEmoji,
    awayTeamName: match.awayTeamName,
    awayTeamEmoji: match.awayTeamEmoji,
    homeTeamCode: match.homeTeamCode,
    awayTeamCode: match.awayTeamCode,

    homeScore: input.homeScore,
    awayScore: input.awayScore,

    qualifiedTeamCode: isKnockoutDraw ? cleanQualifiedTeamCode : null,
    qualificationMethod: isKnockoutDraw ? cleanQualificationMethod : null,

    points: 0,
    resultType: "",
    isCalculated: false,

    predictionType: match.predictionType,
    matchStage: match.matchStage,

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

    addedByAdmin: true,
    addedByAdminName: input.adminName || "الأدمن",
    addedByAdminAt: serverTimestamp(),
  };

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
  };
}