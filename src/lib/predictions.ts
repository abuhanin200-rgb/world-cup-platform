import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

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
  isCalculated: boolean;

  createdAt?: string;
  createdAtServer?: unknown;
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
  createdAt?: string;
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
    isCalculated: Boolean(data.isCalculated),

    createdAt: toText(data.createdAt),
    createdAtServer: data.createdAtServer,
  };
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

    actualHomeScore: null,
    actualAwayScore: null,
    calculatedAt: null,

    createdAt: now,
    createdAtServer: serverTimestamp(),
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, "predictions"), predictionData);

  return {
    id: docRef.id,
    ...predictionData,
  } as Prediction;
}

export async function getLatestPredictions(
  maxItems = 12
): Promise<LatestPrediction[]> {
  const snapshot = await getDocs(collection(db, "predictions"));

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => mapPrediction(docSnap.id, docSnap.data()))
    .filter((prediction) => {
      return (
        prediction.userName &&
        prediction.matchId &&
        prediction.homeTeamName &&
        prediction.awayTeamName
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
      createdAt: prediction.createdAt,
    }));
}