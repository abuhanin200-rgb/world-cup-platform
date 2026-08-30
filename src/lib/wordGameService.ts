import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { syncPlatformGameXp } from "@/lib/platformGameXpClient";
import type {
  WordGameDailyGame,
  WordGameDailyResult,
  WordGameLeaderboardItem,
  WordGameUserStats,
} from "@/types/wordGame";
import {
  evaluateWordGameGuess,
  getMakkahDateKey,
  getWordForUserByDate,
  isValidWordGameWord,
  normalizeWordGameText,
  WORD_GAME_MAX_ATTEMPTS,
} from "@/lib/wordGameLogic";
import {
  getWordGameCategoryLabel,
  getWordGameWordCategory,
} from "@/lib/wordGameWords";

const gamesCollection = "wordGameDailyGames";
const resultsCollection = "wordGameDailyResults";
const statsCollection = "wordGameUserStats";

export type WordGameAdminGameItem = {
  userId: string;
  targetWord: string;
  status: WordGameDailyGame["status"];
  attemptsUsed: number;
  durationMs: number | null;
  won: boolean;
};

export async function getOrCreateTodayWordGame(params: {
  userId: string;
}): Promise<WordGameDailyGame> {
  const dateKey = getMakkahDateKey();
  const gameId = `${params.userId}_${dateKey}`;
  const gameRef = doc(db, gamesCollection, gameId);

  const existingGame = await getDoc(gameRef);

  if (existingGame.exists()) {
    return existingGame.data() as WordGameDailyGame;
  }

  const previousDateResultsQuery = query(
    collection(db, gamesCollection),
    where("userId", "==", params.userId),
    orderBy("dateKey", "desc"),
    limit(1)
  );

  const todayGamesQuery = query(
    collection(db, gamesCollection),
    where("dateKey", "==", dateKey)
  );

  const [previousGamesSnapshot, todayGamesSnapshot] = await Promise.all([
    getDocs(previousDateResultsQuery),
    getDocs(todayGamesQuery),
  ]);

  const previousGame = previousGamesSnapshot.docs[0]?.data() as
    | WordGameDailyGame
    | undefined;

  const usedWordsToday = todayGamesSnapshot.docs
    .map((docItem) => docItem.data() as WordGameDailyGame)
    .filter((game) => game.userId !== params.userId)
    .map((game) => game.targetWord);

  const targetWord = getWordForUserByDate({
    userId: params.userId,
    dateKey,
    previousWord: previousGame?.targetWord ?? null,
    usedWordsToday,
  });

  const newGame: WordGameDailyGame = {
    id: gameId,
    userId: params.userId,
    dateKey,
    targetWord,
    guesses: [],
    status: "playing",
    attemptsUsed: 0,
    startedAt: Date.now(),
    firstGuessAt: null,
    finishedAt: null,
    durationMs: null,
    won: false,
  };

  await setDoc(gameRef, {
    ...newGame,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return newGame;
}

export function buildWordGameGuessResult(params: {
  currentGame: WordGameDailyGame;
  guess: string;
}): WordGameDailyGame {
  const normalizedGuess = normalizeWordGameText(params.guess);

  if (!isValidWordGameWord(normalizedGuess)) {
    throw new Error("اكتب كلمة عربية من 5 حروف.");
  }

  if (params.currentGame.status !== "playing") {
    throw new Error("انتهت محاولاتك لهذا اليوم.");
  }

  if (params.currentGame.guesses.length >= WORD_GAME_MAX_ATTEMPTS) {
    throw new Error("انتهت محاولاتك لهذا اليوم.");
  }

  const now = Date.now();

  const letters = evaluateWordGameGuess(
    normalizedGuess,
    params.currentGame.targetWord
  );

  const guesses = [
    ...params.currentGame.guesses,
    {
      word: normalizedGuess,
      letters,
    },
  ];

  const won =
    normalizedGuess === normalizeWordGameText(params.currentGame.targetWord);

  const attemptsUsed = guesses.length;
  const isFinished = won || attemptsUsed >= WORD_GAME_MAX_ATTEMPTS;
  const isFirstGuess = params.currentGame.guesses.length === 0;

  const firstGuessAt = isFirstGuess
    ? now
    : params.currentGame.firstGuessAt ?? now;

  const finishedAt = isFinished ? now : null;
  const durationMs = isFinished && finishedAt ? finishedAt - firstGuessAt : null;

  return {
    ...params.currentGame,
    guesses,
    won,
    attemptsUsed,
    firstGuessAt,
    status: won ? "won" : isFinished ? "lost" : "playing",
    finishedAt,
    durationMs,
  };
}

export async function saveWordGameProgress(params: {
  updatedGame: WordGameDailyGame;
  userName: string;
}): Promise<void> {
  const gameRef = doc(db, gamesCollection, params.updatedGame.id);
  const resultRef = doc(db, resultsCollection, params.updatedGame.id);
  const statsRef = doc(db, statsCollection, params.updatedGame.userId);

  await runTransaction(db, async (transaction) => {
    const isFinished =
      params.updatedGame.status === "won" ||
      params.updatedGame.status === "lost";

    const resultSnap = isFinished ? await transaction.get(resultRef) : null;
    const statsSnap = isFinished ? await transaction.get(statsRef) : null;

    transaction.set(
      gameRef,
      {
        ...params.updatedGame,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    if (!isFinished || !params.updatedGame.finishedAt) return;
    if (resultSnap?.exists()) return;

    const result: WordGameDailyResult = {
      id: params.updatedGame.id,
      userId: params.updatedGame.userId,
      userName: params.userName,
      dateKey: params.updatedGame.dateKey,
      won: params.updatedGame.won,
      attemptsUsed: params.updatedGame.attemptsUsed,
      durationMs: params.updatedGame.durationMs,
      finishedAt: params.updatedGame.finishedAt,
    };

    transaction.set(resultRef, result, { merge: true });

    const currentStats = statsSnap?.exists()
      ? (statsSnap.data() as WordGameUserStats)
      : null;

    const gamesPlayed = (currentStats?.gamesPlayed ?? 0) + 1;
    const gamesWon =
      (currentStats?.gamesWon ?? 0) + (params.updatedGame.won ? 1 : 0);

    const currentWinStreak = params.updatedGame.won
      ? (currentStats?.currentWinStreak ?? 0) + 1
      : 0;

    const bestWinStreak = Math.max(
      currentStats?.bestWinStreak ?? 0,
      currentWinStreak
    );

    const updatedStats: WordGameUserStats = {
      userId: params.updatedGame.userId,
      gamesPlayed,
      gamesWon,
      winRate:
        gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0,
      currentWinStreak,
      bestWinStreak,
      lastPlayedDateKey: params.updatedGame.dateKey,
    };

    transaction.set(statsRef, updatedStats, { merge: true });
  });

  if (
    params.updatedGame.status === "won" ||
    params.updatedGame.status === "lost"
  ) {
    try {
      await syncPlatformGameXp({
        gameId: "word-game",
        sourceResultId: params.updatedGame.id,
      });
    } catch (error) {
      console.warn("Word game XP sync skipped:", error);
    }
  }
}

export async function submitWordGameGuess(params: {
  userId: string;
  userName: string;
  guess: string;
}): Promise<WordGameDailyGame> {
  const dateKey = getMakkahDateKey();
  const gameId = `${params.userId}_${dateKey}`;
  const gameRef = doc(db, gamesCollection, gameId);

  const gameSnap = await getDoc(gameRef);

  if (!gameSnap.exists()) {
    throw new Error("لم يتم العثور على لعبة اليوم.");
  }

  const currentGame = gameSnap.data() as WordGameDailyGame;

  const updatedGame = buildWordGameGuessResult({
    currentGame,
    guess: params.guess,
  });

  await saveWordGameProgress({
    updatedGame,
    userName: params.userName,
  });

  return updatedGame;
}

export async function getTodayWordGameLeaderboard(): Promise<
  WordGameLeaderboardItem[]
> {
  const dateKey = getMakkahDateKey();

  const [resultsSnapshot, gamesSnapshot] = await Promise.all([
    getDocs(
      query(collection(db, resultsCollection), where("dateKey", "==", dateKey))
    ),
    getDocs(
      query(collection(db, gamesCollection), where("dateKey", "==", dateKey))
    ),
  ]);

  const gamesByUserId = new Map<string, WordGameDailyGame>();

  gamesSnapshot.docs.forEach((docItem) => {
    const game = docItem.data() as WordGameDailyGame;
    gamesByUserId.set(game.userId, game);
  });

  return resultsSnapshot.docs
    .map((item) => item.data() as WordGameDailyResult)
    .sort((a, b) => {
      if (a.won !== b.won) return a.won ? -1 : 1;

      const aDuration = a.durationMs ?? Number.MAX_SAFE_INTEGER;
      const bDuration = b.durationMs ?? Number.MAX_SAFE_INTEGER;

      if (aDuration !== bDuration) return aDuration - bDuration;

      if (a.attemptsUsed !== b.attemptsUsed) {
        return a.attemptsUsed - b.attemptsUsed;
      }

      return a.finishedAt - b.finishedAt;
    })
    .map((item, index) => {
      const game = gamesByUserId.get(item.userId);
      const categoryLabel = game?.targetWord
        ? getWordGameCategoryLabel(getWordGameWordCategory(game.targetWord))
        : "عامّة";

      return {
        userId: item.userId,
        userName: item.userName,
        won: item.won,
        attemptsUsed: item.attemptsUsed,
        durationMs: item.durationMs,
        finishedAt: item.finishedAt,
        rank: index + 1,
        categoryLabel,
      };
    });
}

export async function getTodayWordGameAdminGames(): Promise<
  WordGameAdminGameItem[]
> {
  const dateKey = getMakkahDateKey();

  const gamesQuery = query(
    collection(db, gamesCollection),
    where("dateKey", "==", dateKey)
  );

  const snapshot = await getDocs(gamesQuery);

  return snapshot.docs.map((docItem) => {
    const game = docItem.data() as WordGameDailyGame;

    return {
      userId: game.userId,
      targetWord: game.targetWord,
      status: game.status,
      attemptsUsed: game.attemptsUsed,
      durationMs: game.durationMs,
      won: game.won,
    };
  });
}

async function rebuildWordGameUserStats(userId: string) {
  const resultsQuery = query(
    collection(db, resultsCollection),
    where("userId", "==", userId)
  );

  const snapshot = await getDocs(resultsQuery);
  const results = snapshot.docs
    .map((item) => item.data() as WordGameDailyResult)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  const statsRef = doc(db, statsCollection, userId);

  if (results.length === 0) {
    await deleteDoc(statsRef);
    return;
  }

  let gamesWon = 0;
  let currentWinStreak = 0;
  let bestWinStreak = 0;

  results.forEach((result) => {
    if (result.won) {
      gamesWon += 1;
      currentWinStreak += 1;
      bestWinStreak = Math.max(bestWinStreak, currentWinStreak);
    } else {
      currentWinStreak = 0;
    }
  });

  const gamesPlayed = results.length;

  const updatedStats: WordGameUserStats = {
    userId,
    gamesPlayed,
    gamesWon,
    winRate:
      gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0,
    currentWinStreak,
    bestWinStreak,
    lastPlayedDateKey: results[results.length - 1]?.dateKey ?? null,
  };

  await setDoc(statsRef, updatedStats, { merge: true });
}

export async function adminDeleteUserTodayWordGameResult(userId: string) {
  const dateKey = getMakkahDateKey();
  const gameId = `${userId}_${dateKey}`;

  await Promise.all([
    deleteDoc(doc(db, gamesCollection, gameId)),
    deleteDoc(doc(db, resultsCollection, gameId)),
  ]);

  await rebuildWordGameUserStats(userId);
}

export async function adminDeleteTodayWordGameResults() {
  const dateKey = getMakkahDateKey();

  const [gamesSnapshot, resultsSnapshot] = await Promise.all([
    getDocs(
      query(collection(db, gamesCollection), where("dateKey", "==", dateKey))
    ),
    getDocs(
      query(collection(db, resultsCollection), where("dateKey", "==", dateKey))
    ),
  ]);

  const affectedUserIds = new Set<string>();

  gamesSnapshot.docs.forEach((item) => {
    const game = item.data() as WordGameDailyGame;
    affectedUserIds.add(game.userId);
  });

  resultsSnapshot.docs.forEach((item) => {
    const result = item.data() as WordGameDailyResult;
    affectedUserIds.add(result.userId);
  });

  await Promise.all([
    ...gamesSnapshot.docs.map((item) => deleteDoc(item.ref)),
    ...resultsSnapshot.docs.map((item) => deleteDoc(item.ref)),
  ]);

  await Promise.all(
    Array.from(affectedUserIds).map((userId) =>
      rebuildWordGameUserStats(userId)
    )
  );

  return {
    deletedGames: gamesSnapshot.size,
    deletedResults: resultsSnapshot.size,
  };
}

export async function getWordGameUserStats(
  userId: string
): Promise<WordGameUserStats | null> {
  const statsRef = doc(db, statsCollection, userId);
  const statsSnap = await getDoc(statsRef);

  if (!statsSnap.exists()) return null;

  return statsSnap.data() as WordGameUserStats;
}