import {
  collection,
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

const gamesCollection = "wordGameDailyGames";
const resultsCollection = "wordGameDailyResults";
const statsCollection = "wordGameUserStats";

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

  const previousGamesSnapshot = await getDocs(previousDateResultsQuery);
  const previousGame = previousGamesSnapshot.docs[0]?.data() as
    | WordGameDailyGame
    | undefined;

  const targetWord = getWordForUserByDate({
    userId: params.userId,
    dateKey,
    previousWord: previousGame?.targetWord ?? null,
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
  const finishedAt = isFinished ? Date.now() : null;
  const durationMs =
    isFinished && finishedAt ? finishedAt - params.currentGame.startedAt : null;

  return {
    ...params.currentGame,
    guesses,
    won,
    attemptsUsed,
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
      params.updatedGame.status === "won" || params.updatedGame.status === "lost";

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

  const leaderboardQuery = query(
    collection(db, resultsCollection),
    where("dateKey", "==", dateKey)
  );

  const snapshot = await getDocs(leaderboardQuery);

  return snapshot.docs
    .map((item) => item.data() as WordGameDailyResult)
    .sort((a, b) => {
      if (a.won !== b.won) return a.won ? -1 : 1;
      if (a.attemptsUsed !== b.attemptsUsed) {
        return a.attemptsUsed - b.attemptsUsed;
      }

      const aDuration = a.durationMs ?? Number.MAX_SAFE_INTEGER;
      const bDuration = b.durationMs ?? Number.MAX_SAFE_INTEGER;

      if (aDuration !== bDuration) return aDuration - bDuration;

      return a.finishedAt - b.finishedAt;
    })
    .map((item, index) => ({
      userId: item.userId,
      userName: item.userName,
      won: item.won,
      attemptsUsed: item.attemptsUsed,
      durationMs: item.durationMs,
      finishedAt: item.finishedAt,
      rank: index + 1,
    }));
}

export async function getWordGameUserStats(
  userId: string
): Promise<WordGameUserStats | null> {
  const statsRef = doc(db, statsCollection, userId);
  const statsSnap = await getDoc(statsRef);

  if (!statsSnap.exists()) return null;

  return statsSnap.data() as WordGameUserStats;
}