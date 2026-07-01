import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
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

const flagMemoryResultsCollection = "flagMemoryResults";

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
    id: String(data.id || id),
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

function sortFlagMemoryResults(results: FlagMemoryResult[]) {
  return [...results].sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.timeSeconds !== b.timeSeconds) return a.timeSeconds - b.timeSeconds;
    if (a.moves !== b.moves) return a.moves - b.moves;
    if (a.mistakes !== b.mistakes) return a.mistakes - b.mistakes;

    return a.userName.localeCompare(b.userName, "ar");
  });
}

export async function getTodayFlagMemoryResult(userId: string) {
  if (!userId) return null;

  const dateKey = getSaudiDateKey();
  const resultId = `${userId}_${dateKey}`;
  const resultRef = doc(db, flagMemoryResultsCollection, resultId);
  const snapshot = await getDoc(resultRef);

  if (!snapshot.exists()) return null;

  return mapFlagMemoryResult(snapshot.id, snapshot.data());
}

export async function saveFlagMemoryResult(input: SaveFlagMemoryResultInput) {
  if (!input.userId) {
    throw new Error("معرّف العضو غير موجود");
  }

  if (!input.userName.trim()) {
    throw new Error("اسم العضو غير موجود");
  }

  const dateKey = getSaudiDateKey();
  const resultId = `${input.userId}_${dateKey}`;
  const resultRef = doc(db, flagMemoryResultsCollection, resultId);
  const existingSnapshot = await getDoc(resultRef);

  if (existingSnapshot.exists()) {
    throw new Error("لديك نتيجة مسجلة اليوم. المحاولة الرسمية مرة واحدة يوميًا.");
  }

  const timeSeconds = Math.max(1, Math.floor(input.timeSeconds));
  const moves = Math.max(0, Math.floor(input.moves));
  const mistakes = Math.max(0, Math.floor(input.mistakes));
  const matchesCount = Math.max(1, Math.floor(input.matchesCount));

  const score = calculateFlagMemoryScore({
    timeSeconds,
    moves,
    mistakes,
    matchesCount,
  });

  await setDoc(resultRef, {
    id: resultId,
    userId: input.userId,
    userName: input.userName.trim(),
    dateKey,
    timeSeconds,
    moves,
    mistakes,
    matchesCount,
    score,
    completed: true,
    createdAt: serverTimestamp(),
  });

  return {
    id: resultId,
    dateKey,
    score,
  };
}

export async function getFlagMemoryDailyLeaderboard(maxItems = 20) {
  const dateKey = getSaudiDateKey();

  const resultsQuery = query(
    collection(db, flagMemoryResultsCollection),
    where("dateKey", "==", dateKey)
  );

  const snapshot = await getDocs(resultsQuery);

  const results = snapshot.docs.map((docSnap) =>
    mapFlagMemoryResult(docSnap.id, docSnap.data())
  );

  return sortFlagMemoryResults(results).slice(0, maxItems);
}

export async function getFlagMemoryAllTimeLeaderboard(maxItems = 20) {
  const snapshot = await getDocs(collection(db, flagMemoryResultsCollection));

  const results = snapshot.docs.map((docSnap) =>
    mapFlagMemoryResult(docSnap.id, docSnap.data())
  );

  return sortFlagMemoryResults(results).slice(0, maxItems);
}