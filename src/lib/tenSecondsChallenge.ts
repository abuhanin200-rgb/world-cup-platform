import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { syncPlatformGameXp } from "@/lib/platformGameXpClient";

export const TEN_SECONDS_TARGET_MS = 10000;

export type TenSecondsSettings = {
  enabled: boolean;
  dailyAttempts: number;
  toleranceMs: number;
  awardedPoints: number;
  memberNotice: string;
  updatedAt?: unknown;
};

export const DEFAULT_TEN_SECONDS_SETTINGS: TenSecondsSettings = {
  enabled: true,
  dailyAttempts: 3,
  toleranceMs: 20,
  awardedPoints: 5,
  memberNotice:
    "أوقف المؤقت عند 00:10.000 بالضبط. لديك 3 محاولات يوميًا، والفوز يمنحك XP مستقلًا عن نقاط البطولات.",
};

export type TenSecondsAttempt = {
  attemptNumber: number;
  elapsedMs: number;
  diffMs: number;
  displayTime: string;
  won: boolean;
  createdAt: string;
};

export type TenSecondsDailyResult = {
  id: string;
  userId: string;
  userName: string;
  dateKey: string;
  attemptsCount: number;
  attempts: TenSecondsAttempt[];
  bestElapsedMs: number | null;
  bestDiffMs: number | null;
  bestDisplayTime: string;
  won: boolean;
  pointsAwarded: boolean;
  awardedPoints: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type SaveTenSecondsAttemptInput = {
  userId: string;
  userName: string;
  elapsedMs: number;
};

const settingsCollection = "settings";
const tenSecondsSettingsDocId = "tenSecondsChallenge";
const tenSecondsDailyCollection = "tenSecondsChallengeDaily";

function cleanText(value: string) {
  return value.trim();
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toNullableNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeDailyAttempts(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue)) {
    return DEFAULT_TEN_SECONDS_SETTINGS.dailyAttempts;
  }

  if (numberValue < 1) return 1;
  if (numberValue > 10) return 10;

  return numberValue;
}

function normalizeToleranceMs(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue)) {
    return DEFAULT_TEN_SECONDS_SETTINGS.toleranceMs;
  }

  if (numberValue < 0) return 0;
  if (numberValue > 200) return 200;

  return numberValue;
}

function normalizeAwardedPoints(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue)) {
    return DEFAULT_TEN_SECONDS_SETTINGS.awardedPoints;
  }

  if (numberValue < 0) return 0;
  if (numberValue > 50) return 50;

  return numberValue;
}

function normalizeMemberNotice(value: unknown) {
  if (typeof value !== "string") {
    return DEFAULT_TEN_SECONDS_SETTINGS.memberNotice;
  }

  const text = value.trim().slice(0, 240);

  return text || DEFAULT_TEN_SECONDS_SETTINGS.memberNotice;
}

function mapTenSecondsSettings(
  data: Record<string, unknown> | null | undefined
): TenSecondsSettings {
  if (!data) return DEFAULT_TEN_SECONDS_SETTINGS;

  return {
    enabled:
      typeof data.enabled === "boolean"
        ? data.enabled
        : DEFAULT_TEN_SECONDS_SETTINGS.enabled,
    dailyAttempts: normalizeDailyAttempts(data.dailyAttempts),
    toleranceMs: normalizeToleranceMs(data.toleranceMs),
    awardedPoints: normalizeAwardedPoints(data.awardedPoints),
    memberNotice: normalizeMemberNotice(data.memberNotice),
    updatedAt: data.updatedAt,
  };
}

export async function getTenSecondsSettings() {
  const settingsRef = doc(db, settingsCollection, tenSecondsSettingsDocId);
  const snapshot = await getDoc(settingsRef);

  if (!snapshot.exists()) {
    return DEFAULT_TEN_SECONDS_SETTINGS;
  }

  return mapTenSecondsSettings(snapshot.data());
}

export async function saveTenSecondsSettings(input: TenSecondsSettings) {
  const settingsRef = doc(db, settingsCollection, tenSecondsSettingsDocId);

  const settings: TenSecondsSettings = {
    enabled: Boolean(input.enabled),
    dailyAttempts: normalizeDailyAttempts(input.dailyAttempts),
    toleranceMs: normalizeToleranceMs(input.toleranceMs),
    awardedPoints: normalizeAwardedPoints(input.awardedPoints),
    memberNotice: normalizeMemberNotice(input.memberNotice),
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

export function getMakkahDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

export function formatTenSecondsTime(milliseconds: number) {
  const safeMs = Math.max(0, Math.round(milliseconds));
  const minutes = Math.floor(safeMs / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const ms = safeMs % 1000;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}.${String(ms).padStart(3, "0")}`;
}

function mapAttempt(value: unknown): TenSecondsAttempt | null {
  if (!value || typeof value !== "object") return null;

  const data = value as Record<string, unknown>;

  return {
    attemptNumber: toNumber(data.attemptNumber),
    elapsedMs: toNumber(data.elapsedMs),
    diffMs: toNumber(data.diffMs),
    displayTime: String(data.displayTime || ""),
    won: Boolean(data.won),
    createdAt: String(data.createdAt || ""),
  };
}

function mapDailyResult(
  id: string,
  data: Record<string, unknown>
): TenSecondsDailyResult {
  const attempts = Array.isArray(data.attempts)
    ? data.attempts
        .map((attempt) => mapAttempt(attempt))
        .filter((attempt): attempt is TenSecondsAttempt => Boolean(attempt))
    : [];

  return {
    id,
    userId: String(data.userId || ""),
    userName: String(data.userName || ""),
    dateKey: String(data.dateKey || ""),
    attemptsCount: toNumber(data.attemptsCount),
    attempts,
    bestElapsedMs: toNullableNumber(data.bestElapsedMs),
    bestDiffMs: toNullableNumber(data.bestDiffMs),
    bestDisplayTime: String(data.bestDisplayTime || ""),
    won: Boolean(data.won),
    pointsAwarded: Boolean(data.pointsAwarded),
    awardedPoints: toNumber(data.awardedPoints),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function getFirstAttemptTime(result: TenSecondsDailyResult) {
  const firstAttempt = result.attempts[0];
  const time = firstAttempt?.createdAt
    ? new Date(firstAttempt.createdAt).getTime()
    : 0;

  return Number.isFinite(time) ? time : 0;
}

export function sortTenSecondsResults(results: TenSecondsDailyResult[]) {
  return [...results].sort((first, second) => {
    if (first.won !== second.won) return first.won ? -1 : 1;

    const firstDiff = first.bestDiffMs ?? Number.POSITIVE_INFINITY;
    const secondDiff = second.bestDiffMs ?? Number.POSITIVE_INFINITY;

    if (firstDiff !== secondDiff) return firstDiff - secondDiff;

    const firstTime = getFirstAttemptTime(first);
    const secondTime = getFirstAttemptTime(second);

    if (firstTime !== secondTime) return firstTime - secondTime;

    return first.userName.localeCompare(second.userName, "ar");
  });
}

async function getTodayTenSecondsResultsRaw() {
  const dateKey = getMakkahDateKey();

  const resultsQuery = query(
    collection(db, tenSecondsDailyCollection),
    where("dateKey", "==", dateKey)
  );

  const snapshot = await getDocs(resultsQuery);

  return snapshot.docs.map((docSnap) =>
    mapDailyResult(docSnap.id, docSnap.data())
  );
}

export async function getTodayTenSecondsResult(userId: string) {
  const cleanUserId = cleanText(userId);
  if (!cleanUserId) return null;

  const dateKey = getMakkahDateKey();
  const resultRef = doc(
    db,
    tenSecondsDailyCollection,
    `${cleanUserId}_${dateKey}`
  );
  const resultSnap = await getDoc(resultRef);

  if (!resultSnap.exists()) return null;

  return mapDailyResult(resultSnap.id, resultSnap.data());
}

export async function getTenSecondsDailyLeaderboard(maxResults = 20) {
  const results = await getTodayTenSecondsResultsRaw();

  return sortTenSecondsResults(results).slice(0, maxResults);
}

export async function getTodayTenSecondsAdminResults() {
  const results = await getTodayTenSecondsResultsRaw();

  return sortTenSecondsResults(results);
}

export async function saveTenSecondsAttempt(
  input: SaveTenSecondsAttemptInput
): Promise<TenSecondsDailyResult> {
  const userId = cleanText(input.userId);
  const userName = cleanText(input.userName) || "عضو";

  if (!userId) {
    throw new Error("سجّل دخولك أولًا عشان تحفظ نتيجتك.");
  }

  return saveTenSecondsAttemptViaApi(input);

  const settings = await getTenSecondsSettings();

  if (!settings.enabled) {
    throw new Error("تحدي العشر ثواني متوقف مؤقتًا من إدارة المنصة.");
  }

  const elapsedMs = Math.max(0, Math.round(input.elapsedMs));
  const diffMs = Math.abs(elapsedMs - TEN_SECONDS_TARGET_MS);
  const won = diffMs <= settings.toleranceMs;
  const displayTime = won ? "00:10.000" : formatTenSecondsTime(elapsedMs);

  const dateKey = getMakkahDateKey();
  const resultId = `${userId}_${dateKey}`;

  const resultRef = doc(db, tenSecondsDailyCollection, resultId);

  await runTransaction(db, async (transaction) => {
    const resultSnap = await transaction.get(resultRef);
    const nowIso = new Date().toISOString();

    if (!resultSnap.exists()) {
      const firstAttempt: TenSecondsAttempt = {
        attemptNumber: 1,
        elapsedMs,
        diffMs,
        displayTime,
        won,
        createdAt: nowIso,
      };

      transaction.set(resultRef, {
        userId,
        userName,
        dateKey,

        // مهم:
        // المحاولة الخاطئة فقط تُستهلك.
        // الفوز لا يستهلك محاولة، لكنه يوقف لعب اليوم عبر won=true.
        attemptsCount: won ? 0 : firstAttempt.attemptNumber,

        attempts: [firstAttempt],

        bestElapsedMs: elapsedMs,
        bestDiffMs: diffMs,
        bestDisplayTime: displayTime,

        won,
        // حقول Legacy محفوظة للتوافق فقط. من الآن XP الألعاب مستقل عن users.points.
        pointsAwarded: false,
        awardedPoints: 0,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return;
    }

    const current = mapDailyResult(resultSnap.id, resultSnap.data());

    if (current.won) {
      throw new Error("فزت اليوم بالفعل. محاولاتك توقفت إلى تحدي بكرة.");
    }

    if (current.attemptsCount >= settings.dailyAttempts) {
      throw new Error("استهلكت محاولاتك اليومية. ننتظرك بكرة.");
    }

    const attemptNumber = current.attempts.length + 1;

    const nextAttempt: TenSecondsAttempt = {
      attemptNumber,
      elapsedMs,
      diffMs,
      displayTime,
      won,
      createdAt: nowIso,
    };

    const currentBestDiff =
      current.bestDiffMs === null
        ? Number.POSITIVE_INFINITY
        : current.bestDiffMs;

    const shouldUpdateBest = diffMs < currentBestDiff;

    transaction.update(resultRef, {
      userName,

      // مهم:
      // نربط عدد المحاولات الخاطئة برقم المحاولة الحالي بدل +1 اليدوية.
      // هذا يمنع تصفير أو عدم تطابق العد بعد تحديث الصفحة.
      attemptsCount: won ? current.attemptsCount : attemptNumber,

      attempts: arrayUnion(nextAttempt),

      bestElapsedMs: shouldUpdateBest ? elapsedMs : current.bestElapsedMs,
      bestDiffMs: shouldUpdateBest ? diffMs : current.bestDiffMs,
      bestDisplayTime: shouldUpdateBest ? displayTime : current.bestDisplayTime,

      won,
      pointsAwarded: current.pointsAwarded,
      awardedPoints: current.awardedPoints || 0,

      updatedAt: serverTimestamp(),
    });

  });

  const updatedSnap = await getDoc(resultRef);

  if (!updatedSnap.exists()) {
    throw new Error("تعذر تحميل نتيجة تحدي العشر ثواني بعد الحفظ.");
  }

  const updatedResult = mapDailyResult(updatedSnap.id, updatedSnap.data()!);

  try {
    await syncPlatformGameXp({
      gameId: "ten-seconds",
      sourceResultId: resultId,
    });
  } catch (error) {
    console.warn("Ten seconds XP sync skipped:", error);
  }

  return updatedResult;
}

async function saveTenSecondsAttemptViaApi(
  input: SaveTenSecondsAttemptInput,
): Promise<TenSecondsDailyResult> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser || firebaseUser.uid !== cleanText(input.userId)) {
    throw new Error("انتهت جلسة الدخول. سجّل الدخول مرة أخرى ثم أعد المحاولة.");
  }
  const response = await fetch("/api/games/legacy-results", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await firebaseUser.getIdToken()}` },
    body: JSON.stringify({ action: "ten-seconds", elapsedMs: input.elapsedMs }),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as { result?: TenSecondsDailyResult; error?: string } | null;
  if (!response.ok || !data?.result) throw new Error(data?.error || "تعذر حفظ النتيجة الآن.");
  return data.result;
}

export async function adminDeleteTenSecondsResult(resultId: string) {
  if (!resultId) {
    throw new Error("معرّف النتيجة غير موجود");
  }

  await deleteDoc(doc(db, tenSecondsDailyCollection, resultId));
}

export async function adminDeleteTodayTenSecondsResults() {
  const results = await getTodayTenSecondsAdminResults();

  await Promise.all(
    results.map((result) => adminDeleteTenSecondsResult(result.id))
  );

  return {
    deletedResults: results.length,
  };
}
