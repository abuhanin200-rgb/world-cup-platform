import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { getTodayMakkahKey } from "@/lib/makkahDate";
import { getValidWordGameWords } from "@/lib/wordGameWords";
import type {
  WordGameDailyWord,
  WordGameLeaderboardItem,
  WordGameMetaState,
  WordGameResult,
} from "@/types/wordGame";

const DAILY_COLLECTION = "wordGameDaily";
const META_COLLECTION = "wordGameMeta";
const RESULTS_COLLECTION = "wordGameResults";

const META_DOC_ID = "state";

function pickRandomWord(words: string[]) {
  const index = Math.floor(Math.random() * words.length);
  return words[index];
}

function getResultDocId(date: string, userId: string) {
  return `${date}_${userId}`;
}

function getTimestampMillis(value: WordGameResult["completedAt"]): number {
  return value?.toMillis?.() ?? 0;
}

function sortLeaderboard(results: WordGameResult[]): WordGameLeaderboardItem[] {
  return results
    .sort((a, b) => {
      // 1. من حل الكلمة
      if (a.won !== b.won) return a.won ? -1 : 1;

      // الخاسرون بعد الفائزين، وترتيبهم حسب الأسبق في الإكمال
      if (!a.won && !b.won) {
        return getTimestampMillis(a.completedAt) - getTimestampMillis(b.completedAt);
      }

      // 2. الأقل محاولات
      if (a.attempts !== b.attempts) {
        return a.attempts - b.attempts;
      }

      // 3. الأسرع وقتًا
      if (a.durationSeconds !== b.durationSeconds) {
        return a.durationSeconds - b.durationSeconds;
      }

      // 4. الأسبق في الحل عند التساوي
      return getTimestampMillis(a.completedAt) - getTimestampMillis(b.completedAt);
    })
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
}

async function deleteDocsInBatches(
  docsToDelete: QueryDocumentSnapshot<DocumentData>[]
): Promise<number> {
  if (docsToDelete.length === 0) return 0;

  const chunkSize = 450;
  let deletedCount = 0;

  for (let i = 0; i < docsToDelete.length; i += chunkSize) {
    const chunk = docsToDelete.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    chunk.forEach((item) => {
      batch.delete(item.ref);
    });

    await batch.commit();
    deletedCount += chunk.length;
  }

  return deletedCount;
}

export async function getOrCreateTodayWord(): Promise<WordGameDailyWord> {
  const todayKey = getTodayMakkahKey();

  const dailyRef = doc(db, DAILY_COLLECTION, todayKey);
  const metaRef = doc(db, META_COLLECTION, META_DOC_ID);

  const wordData = await runTransaction(db, async (transaction) => {
    const dailySnap = await transaction.get(dailyRef);

    if (dailySnap.exists()) {
      return dailySnap.data() as WordGameDailyWord;
    }

    const validWords = getValidWordGameWords();

    if (validWords.length === 0) {
      throw new Error("لا توجد كلمات صالحة للعبة. أضف كلمات من 5 حروف.");
    }

    const metaSnap = await transaction.get(metaRef);

    const currentMeta: WordGameMetaState = metaSnap.exists()
      ? (metaSnap.data() as WordGameMetaState)
      : {
          usedWords: [],
          lastWord: null,
          cycle: 1,
        };

    let availableWords = validWords.filter(
      (word) =>
        !currentMeta.usedWords.includes(word) && word !== currentMeta.lastWord
    );

    let nextCycle = currentMeta.cycle || 1;
    let nextUsedWords = [...(currentMeta.usedWords || [])];

    // إذا خلصت كل الكلمات، نبدأ دورة جديدة بشرط ما نختار كلمة أمس
    if (availableWords.length === 0) {
      nextCycle += 1;
      nextUsedWords = [];

      availableWords = validWords.filter(
        (word) => word !== currentMeta.lastWord
      );

      // احتياط لو القائمة فيها كلمة واحدة فقط
      if (availableWords.length === 0) {
        availableWords = validWords;
      }
    }

    const selectedWord = pickRandomWord(availableWords);

    const dailyData: WordGameDailyWord = {
      date: todayKey,
      word: selectedWord,
      cycle: nextCycle,
    };

    transaction.set(dailyRef, {
      ...dailyData,
      manuallyChanged: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.set(metaRef, {
      usedWords: [...nextUsedWords, selectedWord],
      lastWord: selectedWord,
      cycle: nextCycle,
      updatedAt: serverTimestamp(),
    });

    return dailyData;
  });

  return wordData;
}

export async function getTodayWordGameResult(
  userId: string
): Promise<WordGameResult | null> {
  const todayKey = getTodayMakkahKey();
  const resultRef = doc(db, RESULTS_COLLECTION, getResultDocId(todayKey, userId));
  const resultSnap = await getDoc(resultRef);

  if (!resultSnap.exists()) return null;

  return resultSnap.data() as WordGameResult;
}

export async function saveWordGameResult(params: {
  userId: string;
  fullName: string;
  won: boolean;
  attempts: number;
  durationSeconds: number;
  guesses: string[];
}): Promise<void> {
  const todayKey = getTodayMakkahKey();

  const resultRef = doc(
    db,
    RESULTS_COLLECTION,
    getResultDocId(todayKey, params.userId)
  );

  const existingSnap = await getDoc(resultRef);

  // يمنع حفظ أكثر من نتيجة لنفس العضو في نفس اليوم
  if (existingSnap.exists()) return;

  await setDoc(resultRef, {
    userId: params.userId,
    fullName: params.fullName,
    date: todayKey,
    won: params.won,
    attempts: params.attempts,
    durationSeconds: params.durationSeconds,
    guesses: params.guesses,
    createdAt: serverTimestamp(),
    completedAt: serverTimestamp(),
  });
}

export async function getTodayLeaderboard(
  limitCount = 20
): Promise<WordGameLeaderboardItem[]> {
  const todayKey = getTodayMakkahKey();

  const resultsQuery = query(
    collection(db, RESULTS_COLLECTION),
    where("date", "==", todayKey)
  );

  const snapshot = await getDocs(resultsQuery);

  const results = snapshot.docs.map((item) => item.data() as WordGameResult);

  return sortLeaderboard(results).slice(0, limitCount);
}

export async function getTodayFastestWinner(): Promise<WordGameLeaderboardItem | null> {
  const leaderboard = await getTodayLeaderboard(100);
  const winners = leaderboard.filter((item) => item.won);

  if (winners.length === 0) return null;

  return winners.sort((a, b) => a.durationSeconds - b.durationSeconds)[0];
}

export async function getUserWinStreak(userId: string): Promise<number> {
  const resultsQuery = query(
    collection(db, RESULTS_COLLECTION),
    where("userId", "==", userId)
  );

  const snapshot = await getDocs(resultsQuery);

  const results = snapshot.docs
    .map((item) => item.data() as WordGameResult)
    .sort((a, b) => b.date.localeCompare(a.date));

  let streak = 0;

  for (const result of results) {
    if (result.won) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

/* =========================
   Admin Word Game Functions
   ========================= */

export async function adminGetWordGameDashboard() {
  const todayKey = getTodayMakkahKey();

  const dailyRef = doc(db, DAILY_COLLECTION, todayKey);
  const metaRef = doc(db, META_COLLECTION, META_DOC_ID);

  const [dailySnap, metaSnap, leaderboard] = await Promise.all([
    getDoc(dailyRef),
    getDoc(metaRef),
    getTodayLeaderboard(50),
  ]);

  return {
    todayKey,
    dailyWord: dailySnap.exists()
      ? (dailySnap.data() as WordGameDailyWord)
      : null,
    meta: metaSnap.exists()
      ? (metaSnap.data() as WordGameMetaState)
      : null,
    leaderboard,
  };
}

export async function adminSetTodayWord(word: string): Promise<void> {
  const todayKey = getTodayMakkahKey();
  const cleanWord = word.trim();

  if ([...cleanWord].length !== 5) {
    throw new Error("الكلمة لازم تكون 5 حروف بالضبط");
  }

  const dailyRef = doc(db, DAILY_COLLECTION, todayKey);
  const metaRef = doc(db, META_COLLECTION, META_DOC_ID);

  const metaSnap = await getDoc(metaRef);

  const currentMeta: WordGameMetaState = metaSnap.exists()
    ? (metaSnap.data() as WordGameMetaState)
    : {
        usedWords: [],
        lastWord: null,
        cycle: 1,
      };

  const usedWords = currentMeta.usedWords || [];
  const nextUsedWords = usedWords.includes(cleanWord)
    ? usedWords
    : [...usedWords, cleanWord];

  await setDoc(
    dailyRef,
    {
      date: todayKey,
      word: cleanWord,
      cycle: currentMeta.cycle || 1,
      manuallyChanged: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
    metaRef,
    {
      usedWords: nextUsedWords,
      lastWord: cleanWord,
      cycle: currentMeta.cycle || 1,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function adminRandomizeTodayWord(): Promise<string> {
  const todayKey = getTodayMakkahKey();
  const dailyRef = doc(db, DAILY_COLLECTION, todayKey);
  const dailySnap = await getDoc(dailyRef);

  const currentWord = dailySnap.exists()
    ? (dailySnap.data() as WordGameDailyWord).word
    : "";

  const validWords = getValidWordGameWords();

  const availableWords = validWords.filter((word) => word !== currentWord);
  const finalWords = availableWords.length > 0 ? availableWords : validWords;

  if (finalWords.length === 0) {
    throw new Error("لا توجد كلمات صالحة");
  }

  const selectedWord = pickRandomWord(finalWords);

  await adminSetTodayWord(selectedWord);

  return selectedWord;
}

export async function adminDeleteTodayWordGameResults(): Promise<number> {
  const todayKey = getTodayMakkahKey();

  const resultsQuery = query(
    collection(db, RESULTS_COLLECTION),
    where("date", "==", todayKey)
  );

  const snapshot = await getDocs(resultsQuery);

  return deleteDocsInBatches(snapshot.docs);
}

export async function adminDeleteAllWordGameResults(): Promise<number> {
  const snapshot = await getDocs(collection(db, RESULTS_COLLECTION));

  return deleteDocsInBatches(snapshot.docs);
}

export async function adminDeleteUserWordGameResult(params: {
  date: string;
  userId: string;
}): Promise<void> {
  const resultRef = doc(
    db,
    RESULTS_COLLECTION,
    getResultDocId(params.date, params.userId)
  );

  const batch = writeBatch(db);
  batch.delete(resultRef);
  await batch.commit();
}

export async function adminResetWordGameCompletely(): Promise<{
  deletedResults: number;
  deletedDailyWords: number;
  resetMeta: boolean;
}> {
  const resultsSnap = await getDocs(collection(db, RESULTS_COLLECTION));
  const dailySnap = await getDocs(collection(db, DAILY_COLLECTION));
  const metaRef = doc(db, META_COLLECTION, META_DOC_ID);

  const deletedResults = await deleteDocsInBatches(resultsSnap.docs);
  const deletedDailyWords = await deleteDocsInBatches(dailySnap.docs);

  await setDoc(
    metaRef,
    {
      usedWords: [],
      lastWord: null,
      cycle: 1,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return {
    deletedResults,
    deletedDailyWords,
    resetMeta: true,
  };
}