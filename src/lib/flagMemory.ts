import {
  collection,
  deleteDoc,
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

export type FlagMemorySettings = {
  enabled: boolean;
  pairsCount: number;
  oneAttemptPerDay: boolean;
  memberNotice: string;
  updatedAt?: unknown;
};

export type SaveFlagMemorySettingsInput = {
  enabled: boolean;
  pairsCount: number;
  oneAttemptPerDay: boolean;
  memberNotice: string;
};

const flagMemoryResultsCollection = "flagMemoryResults";
const settingsCollection = "settings";
const flagMemorySettingsDocId = "flagMemory";

export const DEFAULT_FLAG_MEMORY_SETTINGS: FlagMemorySettings = {
  enabled: true,
  pairsCount: 12,
  oneAttemptPerDay: true,
  memberNotice:
    "24 بطاقة، 12 علمًا متطابقًا، ومحاولة رسمية واحدة يوميًا. ركّز جيدًا؛ لا توجد إعادة ترتيب أثناء التحدي.",
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

function dedupeFlagMemoryResultsByUser(results: FlagMemoryResult[]) {
  const sorted = sortFlagMemoryResults(results);
  const seen = new Set<string>();
  const unique: FlagMemoryResult[] = [];

  sorted.forEach((result) => {
    const key = result.userId || result.userName;

    if (!key || seen.has(key)) return;

    seen.add(key);
    unique.push(result);
  });

  return unique;
}

function normalizePairsCount(value: unknown) {
  const count = Number(value);

  if (!Number.isInteger(count)) return DEFAULT_FLAG_MEMORY_SETTINGS.pairsCount;
  if (count < 4) return 4;
  if (count > 18) return 18;

  return count;
}

function mapFlagMemorySettings(
  data: Record<string, unknown> | null | undefined
): FlagMemorySettings {
  if (!data) return DEFAULT_FLAG_MEMORY_SETTINGS;

  return {
    enabled:
      typeof data.enabled === "boolean"
        ? data.enabled
        : DEFAULT_FLAG_MEMORY_SETTINGS.enabled,

    pairsCount: normalizePairsCount(data.pairsCount),

    oneAttemptPerDay: true,

    memberNotice:
      typeof data.memberNotice === "string" && data.memberNotice.trim()
        ? data.memberNotice.trim().slice(0, 240)
        : DEFAULT_FLAG_MEMORY_SETTINGS.memberNotice,

    updatedAt: data.updatedAt,
  };
}

export function formatFlagMemoryTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export async function getFlagMemorySettings() {
  const settingsRef = doc(db, settingsCollection, flagMemorySettingsDocId);
  const snapshot = await getDoc(settingsRef);

  if (!snapshot.exists()) {
    return DEFAULT_FLAG_MEMORY_SETTINGS;
  }

  return mapFlagMemorySettings(snapshot.data());
}

export async function saveFlagMemorySettings(
  input: SaveFlagMemorySettingsInput
) {
  const settingsRef = doc(db, settingsCollection, flagMemorySettingsDocId);

  const pairsCount = normalizePairsCount(input.pairsCount);
  const memberNotice = input.memberNotice.trim().slice(0, 240);

  const settings: FlagMemorySettings = {
    enabled: input.enabled,
    pairsCount,
    oneAttemptPerDay: true,
    memberNotice: memberNotice || DEFAULT_FLAG_MEMORY_SETTINGS.memberNotice,
  };

  await setDoc(
    settingsRef,
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return settings;
}

async function getTodayFlagMemoryResultsRaw() {
  const dateKey = getSaudiDateKey();

  const resultsQuery = query(
    collection(db, flagMemoryResultsCollection),
    where("dateKey", "==", dateKey)
  );

  const snapshot = await getDocs(resultsQuery);

  return snapshot.docs.map((docSnap) =>
    mapFlagMemoryResult(docSnap.id, docSnap.data())
  );
}

export async function getTodayFlagMemoryResult(userId: string) {
  if (!userId) return null;

  const dateKey = getSaudiDateKey();
  const stableResultId = `${userId}_${dateKey}`;
  const stableResultRef = doc(db, flagMemoryResultsCollection, stableResultId);
  const stableSnapshot = await getDoc(stableResultRef);

  if (stableSnapshot.exists()) {
    return mapFlagMemoryResult(stableSnapshot.id, stableSnapshot.data());
  }

  const todayResults = await getTodayFlagMemoryResultsRaw();
  const userResults = todayResults.filter((result) => result.userId === userId);

  if (userResults.length === 0) return null;

  return sortFlagMemoryResults(userResults)[0];
}

export async function saveFlagMemoryResult(input: SaveFlagMemoryResultInput) {
  if (!input.userId) {
    throw new Error("معرّف العضو غير موجود");
  }

  if (!input.userName.trim()) {
    throw new Error("اسم العضو غير موجود");
  }

  const settings = await getFlagMemorySettings();

  if (!settings.enabled) {
    throw new Error("تحدي الأعلام متوقف مؤقتًا من إدارة المنصة.");
  }

  const existing = await getTodayFlagMemoryResult(input.userId);

  if (existing) {
    throw new Error(
      "لديك نتيجة مسجلة اليوم. تبدأ محاولة جديدة بعد الساعة 12:00 منتصف الليل بتوقيت مكة."
    );
  }

  const dateKey = getSaudiDateKey();
  const resultId = `${input.userId}_${dateKey}`;
  const resultRef = doc(db, flagMemoryResultsCollection, resultId);

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
  const results = await getTodayFlagMemoryResultsRaw();

  return dedupeFlagMemoryResultsByUser(results).slice(0, maxItems);
}

export async function getFlagMemoryAllTimeLeaderboard(maxItems = 20) {
  const snapshot = await getDocs(collection(db, flagMemoryResultsCollection));

  const results = snapshot.docs.map((docSnap) =>
    mapFlagMemoryResult(docSnap.id, docSnap.data())
  );

  return dedupeFlagMemoryResultsByUser(results).slice(0, maxItems);
}

export async function getTodayFlagMemoryAdminResults() {
  const results = await getTodayFlagMemoryResultsRaw();

  return dedupeFlagMemoryResultsByUser(results);
}

export async function adminDeleteFlagMemoryResult(resultId: string) {
  if (!resultId) {
    throw new Error("معرّف النتيجة غير موجود");
  }

  await deleteDoc(doc(db, flagMemoryResultsCollection, resultId));
}

export async function adminDeleteUserTodayFlagMemoryResult(userId: string) {
  if (!userId) {
    throw new Error("معرّف العضو غير موجود");
  }

  const todayResults = await getTodayFlagMemoryResultsRaw();
  const userResults = todayResults.filter((result) => result.userId === userId);

  await Promise.all(
    userResults.map((result) =>
      deleteDoc(doc(db, flagMemoryResultsCollection, result.id))
    )
  );
}

export async function adminDeleteTodayFlagMemoryResults() {
  const dateKey = getSaudiDateKey();

  const resultsQuery = query(
    collection(db, flagMemoryResultsCollection),
    where("dateKey", "==", dateKey)
  );

  const snapshot = await getDocs(resultsQuery);

  await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));

  return {
    deletedResults: snapshot.size,
  };
}