import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
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

  return {
    id: docSnap.id,
    ...(docSnap.data() as Omit<Prediction, "id">),
  };
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
    userName: input.userName,

    matchId: input.matchId,

    homeTeamName: input.homeTeamName,
    homeTeamEmoji: input.homeTeamEmoji,
    awayTeamName: input.awayTeamName,
    awayTeamEmoji: input.awayTeamEmoji,

    homeScore: input.homeScore,
    awayScore: input.awayScore,

    points: 0,
    isCalculated: false,

    createdAt: now,
    createdAtServer: serverTimestamp(),
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
  const predictionsRef = collection(db, "predictions");

  const q = query(
    predictionsRef,
    orderBy("createdAt", "desc"),
    limit(maxItems)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data() as Omit<Prediction, "id">;

      return {
        id: docSnap.id,
        userName: data.userName,
        homeTeamName: data.homeTeamName,
        homeTeamEmoji: data.homeTeamEmoji,
        awayTeamName: data.awayTeamName,
        awayTeamEmoji: data.awayTeamEmoji,
        homeScore: data.homeScore,
        awayScore: data.awayScore,
        createdAt: data.createdAt,
      };
    });
}