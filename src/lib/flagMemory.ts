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
import { db } from "@/lib/firebase";

export type FlagMemoryResult = {
  id: string;
  userId: string;
  userName: string;
  dateKey: string;
  timeSeconds: number;
  moves: number;
  mistakes: number;
  matchesCount: number;
  score: number;
  completed: boolean;
  createdAt?: unknown;
};

export type SaveFlagMemoryResultInput = {
  userId: string;
  userName: string;
  timeSeconds: number;
  moves: number;
  mistakes: number;
  matchesCount: number;
};

export function getSaudiDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

export function calculateFlagMemoryScore(input: {
  timeSeconds: number;
  moves: number;
  mistakes: number;
  matchesCount: number;
}) {
  const timeSeconds = Math.max(1, Math.floor(input.timeSeconds));
  const moves = Math.max(0, Math.floor(input.moves));
  const mistakes = Math.max(0, Math.floor(input.mistakes));
  const matchesCount = Math.max(1, Math.floor(input.matchesCount));

  const baseScore = matchesCount * 20;
  const perfectMoves = matchesCount * 2;
  const extraMoves = Math.max(0, moves - perfectMoves);

  const speedBonus =
    timeSeconds <= 45
      ? 50
      : timeSeconds <= 60
      ? 40
      : timeSeconds <= 90
      ? 30
      : timeSeconds <= 120
      ? 20
      : timeSeconds <= 180
      ? 10
      : 0;

  const movesPenalty = extraMoves * 2;
  const mistakesPenalty = mistakes * 3;
  const timePenalty = Math.floor(timeSeconds / 30);

  return Math.max(
    0,
    baseScore + speedBonus - movesPenalty - mistakesPenalty - timePenalty
  );
}

function mapFlagMemoryResult(
  id: string,
  data: Record<string, unknown>
): FlagMemoryResult {
  return {
    id,
    userId: String(data.userId || ""),
    userName: String(data.userName || ""),
    dateKey: String(data.dateKey || ""),
    timeSeconds: Number(data.timeSeconds || 0),
    moves: Number(data.moves || 0),
    mistakes: Number(data.mistakes || 0),
    matchesCount: Number(data.matchesCount || 0),
    score: Number(data.score || 0),
    completed: Boolean(data.completed),
    createdAt: data.createdAt,
  };
}

export async function getTodayFlagMemoryResult(userId: string) {
  if (!userId) return null;

  const dateKey = getSaudiDateKey();

  const q = query(
    collection(db, "flagMemoryResults"),
    where("userId", "==", userId),
    where("dateKey", "==", dateKey),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return mapFlagMemoryResult(docSnap.id, docSnap.data());
}

export async function saveFlagMemoryResult(input: SaveFlagMemoryResultInput) {
  if (!input.userId) {
    throw new Error("معرّف العضو غير موجود");
  }

  if (!input.userName.trim()) {
    throw new Error("اسم العضو غير موجود");
  }

  const existing = await getTodayFlagMemoryResult(input.userId);

  if (existing) {
    throw new Error("لديك نتيجة مسجلة اليوم. المحاولة الرسمية مرة واحدة يوميًا.");
  }

  const dateKey = getSaudiDateKey();

  const score = calculateFlagMemoryScore({
    timeSeconds: input.timeSeconds,
    moves: input.moves,
    mistakes: input.mistakes,
    matchesCount: input.matchesCount,
  });

  const docRef = await addDoc(collection(db, "flagMemoryResults"), {
    userId: input.userId,
    userName: input.userName.trim(),
    dateKey,
    timeSeconds: Math.max(1, Math.floor(input.timeSeconds)),
    moves: Math.max(0, Math.floor(input.moves)),
    mistakes: Math.max(0, Math.floor(input.mistakes)),
    matchesCount: Math.max(1, Math.floor(input.matchesCount)),
    score,
    completed: true,
    createdAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    dateKey,
    score,
  };
}

export async function getFlagMemoryDailyLeaderboard(maxItems = 20) {
  const dateKey = getSaudiDateKey();

  const q = query(
    collection(db, "flagMemoryResults"),
    where("dateKey", "==", dateKey),
    orderBy("score", "desc"),
    orderBy("timeSeconds", "asc"),
    orderBy("moves", "asc"),
    limit(maxItems)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) =>
    mapFlagMemoryResult(docSnap.id, docSnap.data())
  );
}

export async function getFlagMemoryAllTimeLeaderboard(maxItems = 20) {
  const q = query(
    collection(db, "flagMemoryResults"),
    orderBy("score", "desc"),
    orderBy("timeSeconds", "asc"),
    orderBy("moves", "asc"),
    limit(maxItems)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) =>
    mapFlagMemoryResult(docSnap.id, docSnap.data())
  );
}