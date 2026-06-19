"use client";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import {
  compareGuess,
  isCorrectGuess,
  isFiveLetters,
  normalizeArabicWord,
  type LetterResult,
  type LetterStatus,
} from "@/lib/wordGameLogic";
import {
  getOrCreateTodayWord,
  getTodayWordGameResult,
  getUserWinStreak,
  saveWordGameResult,
} from "@/lib/wordGameService";
import type {
  WordGameDailyWord,
  WordGameResult,
  WordGameStatus,
} from "@/types/wordGame";

import GameBoard from "@/components/word-game/GameBoard";
import GuessInput from "@/components/word-game/GuessInput";
import WordKeyboard from "@/components/word-game/WordKeyboard";
import TomorrowCountdown from "@/components/word-game/TomorrowCountdown";
import ShareResultButton from "@/components/word-game/ShareResultButton";
import DailyLeaderboard from "@/components/word-game/DailyLeaderboard";
import WordGameStats from "@/components/word-game/WordGameStats";

const MAX_ATTEMPTS = 6;

function getUserId(user: unknown): string {
  const currentUser = user as {
    uid?: string;
    id?: string;
    userId?: string;
  } | null;

  return currentUser?.uid || currentUser?.id || currentUser?.userId || "";
}

function getUserFullName(user: unknown): string {
  const currentUser = user as {
    fullName?: string;
    name?: string;
    displayName?: string;
    email?: string;
  } | null;

  return (
    currentUser?.fullName ||
    currentUser?.name ||
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "عضو"
  );
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

function getKeyboardStatuses(
  guessesResults: LetterResult[][]
): Record<string, LetterStatus | undefined> {
  const statusPriority: Record<LetterStatus, number> = {
    absent: 1,
    present: 2,
    correct: 3,
  };

  const letterStatuses: Record<string, LetterStatus | undefined> = {};

  for (const row of guessesResults) {
    for (const cell of row) {
      const letter = normalizeArabicWord(cell.letter);
      const existing = letterStatuses[letter];

      if (!existing || statusPriority[cell.status] > statusPriority[existing]) {
        letterStatuses[letter] = cell.status;
      }
    }
  }

  return letterStatuses;
}

export default function WordGame() {
  const { user, loading: authLoading, isLoggedIn } = useAuth();

  const userId = getUserId(user);
  const fullName = getUserFullName(user);

  const [dailyWord, setDailyWord] = useState<WordGameDailyWord | null>(null);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [guessesResults, setGuessesResults] = useState<LetterResult[][]>([]);
  const [status, setStatus] = useState<WordGameStatus>("playing");

  const [completedResult, setCompletedResult] =
    useState<WordGameResult | null>(null);

  const [durationSeconds, setDurationSeconds] = useState(0);
  const [streak, setStreak] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const startTimeRef = useRef<number>(Date.now());
  const savingRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    let isMounted = true;

    async function loadGame() {
      try {
        setLoading(true);
        setMessage("");

        const wordData = await getOrCreateTodayWord();

        if (!isMounted) return;

        setDailyWord(wordData);

        if (!isLoggedIn || !user || !userId) {
          setGuesses([]);
          setCurrentGuess("");
          setGuessesResults([]);
          setCompletedResult(null);
          setDurationSeconds(0);
          setStatus("playing");
          setStreak(0);
          setMessage("سجّل دخولك أولًا عشان تدخل ترتيب اليوم.");
          setLoading(false);
          return;
        }

        const previousResult = await getTodayWordGameResult(userId);
        const userStreak = await getUserWinStreak(userId);

        if (!isMounted) return;

        setStreak(userStreak);

        if (previousResult) {
          const previousGuessesResults = previousResult.guesses.map((guess) =>
            compareGuess(guess, wordData.word)
          );

          setGuesses(previousResult.guesses);
          setCurrentGuess("");
          setGuessesResults(previousGuessesResults);
          setCompletedResult(previousResult);
          setDurationSeconds(previousResult.durationSeconds);
          setStatus("already_completed");

          setMessage(
            previousResult.won
              ? "لعبت كلمة اليوم وفزت يا بطل 🎉"
              : `انتهت محاولاتك اليوم. الكلمة الصحيحة: ${wordData.word}`
          );
        } else {
          startTimeRef.current = Date.now();
          setGuesses([]);
          setCurrentGuess("");
          setGuessesResults([]);
          setCompletedResult(null);
          setDurationSeconds(0);
          setStatus("playing");
          setMessage("");
        }
      } catch (error) {
        console.error("Error loading word game:", error);

        if (isMounted) {
          setMessage("صار خطأ أثناء تحميل اللعبة. جرّب تحديث الصفحة.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadGame();

    return () => {
      isMounted = false;
    };
  }, [authLoading, isLoggedIn, user, userId]);

  async function finishGame(params: {
    won: boolean;
    nextGuesses: string[];
    nextResults: LetterResult[][];
  }) {
    if (!isLoggedIn || !user || !userId || !dailyWord || savingRef.current) {
      return;
    }

    savingRef.current = true;

    const finalDurationSeconds = Math.floor(
      (Date.now() - startTimeRef.current) / 1000
    );

    setDurationSeconds(finalDurationSeconds);

    const resultData: WordGameResult = {
      userId,
      fullName,
      date: dailyWord.date,
      won: params.won,
      attempts: params.nextGuesses.length,
      durationSeconds: finalDurationSeconds,
      guesses: params.nextGuesses,
    };

    try {
      await saveWordGameResult({
        userId,
        fullName,
        won: params.won,
        attempts: params.nextGuesses.length,
        durationSeconds: finalDurationSeconds,
        guesses: params.nextGuesses,
      });

      const userStreak = await getUserWinStreak(userId);

      setCompletedResult(resultData);
      setStreak(userStreak);
      setRefreshKey((prev) => prev + 1);

      if (params.won) {
        setStatus("won");
        setMessage("مبروك يا بطل! جبت كلمة اليوم 🎉");
      } else {
        setStatus("lost");
        setMessage(`انتهت المحاولات. الكلمة الصحيحة: ${dailyWord.word}`);
      }
    } catch (error) {
      console.error("Error saving word game result:", error);
      setMessage("تم إنهاء اللعبة، لكن صار خطأ أثناء حفظ النتيجة.");
    } finally {
      savingRef.current = false;
    }
  }

  function submitGuess(guess: string) {
    if (!dailyWord) return;

    if (!isLoggedIn || !user || !userId) {
      setMessage("سجّل دخولك أولًا عشان تنحفظ نتيجتك.");
      return;
    }

    if (status !== "playing") return;

    if (!isFiveLetters(guess)) {
      setMessage("الكلمة لازم تكون 5 حروف بالضبط.");
      return;
    }

    const result = compareGuess(guess, dailyWord.word);

    const nextGuesses = [...guesses, guess];
    const nextResults = [...guessesResults, result];

    setGuesses(nextGuesses);
    setCurrentGuess("");
    setGuessesResults(nextResults);

    const won = isCorrectGuess(guess, dailyWord.word);
    const usedAllAttempts = nextGuesses.length >= MAX_ATTEMPTS;

    if (won) {
      finishGame({
        won: true,
        nextGuesses,
        nextResults,
      });

      return;
    }

    if (usedAllAttempts) {
      finishGame({
        won: false,
        nextGuesses,
        nextResults,
      });

      return;
    }

    setMessage(`باقي لك ${MAX_ATTEMPTS - nextGuesses.length} محاولات.`);
  }

  function handleLetterClick(letter: string) {
    if (!isLoggedIn || !user || !userId) {
      setMessage("سجّل دخولك أولًا عشان تنحفظ نتيجتك.");
      return;
    }

    if (status !== "playing") return;

    const keyboardStatuses = getKeyboardStatuses(guessesResults);
    const normalizedLetter = normalizeArabicWord(letter);

    // يمنع ضغط الحروف الرمادية مرة ثانية
    if (keyboardStatuses[normalizedLetter] === "absent") {
      return;
    }

    if ([...currentGuess].length >= 5) return;

    const nextValue = normalizeArabicWord(currentGuess + normalizedLetter).slice(
      0,
      5
    );

    setCurrentGuess(nextValue);
    setMessage("");
  }

  function handleBackspace() {
    if (status !== "playing") return;

    const nextValue = [...currentGuess].slice(0, -1).join("");
    setCurrentGuess(nextValue);
  }

  function handleEnter() {
    if (status !== "playing") return;

    if (!isFiveLetters(currentGuess)) {
      setMessage("أكمل 5 حروف أولًا.");
      return;
    }

    submitGuess(currentGuess);
  }

  useEffect(() => {
    function handlePhysicalKeyboard(event: KeyboardEvent) {
      if (status !== "playing") return;
      if (!isLoggedIn || !user || !userId) return;
      if (savingRef.current) return;

      if (event.key === "Enter") {
        event.preventDefault();
        handleEnter();
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        handleBackspace();
        return;
      }

      const pressedKey = normalizeArabicWord(event.key);

      if (/^[\u0600-\u06FF]$/.test(pressedKey)) {
        event.preventDefault();
        handleLetterClick(pressedKey);
      }
    }

    window.addEventListener("keydown", handlePhysicalKeyboard);

    return () => {
      window.removeEventListener("keydown", handlePhysicalKeyboard);
    };
  }, [status, isLoggedIn, user, userId, currentGuess, guessesResults]);

  const isCompleted =
    status === "won" || status === "lost" || status === "already_completed";

  const shareResult = completedResult
    ? {
        won: completedResult.won,
        attempts: completedResult.attempts,
        durationSeconds: completedResult.durationSeconds,
      }
    : isCompleted
      ? {
          won: status === "won",
          attempts: guesses.length,
          durationSeconds,
        }
      : null;

  const keyboardStatuses = getKeyboardStatuses(guessesResults);

  return (
    <div className="w-full space-y-5" dir="rtl">
      <WordGameStats userId={userId || null} refreshKey={refreshKey} />

      <section className="w-full max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl md:p-7">
        {loading || authLoading ? (
          <div className="py-12 text-center font-black text-slate-300">
            جاري تحميل اللعبة...
          </div>
        ) : (
          <>
            <GameBoard guessesResults={guessesResults} />

            <GuessInput value={currentGuess} />

            <WordKeyboard
              currentGuess={currentGuess}
              letterStatuses={keyboardStatuses}
              disabled={
                !isLoggedIn ||
                !user ||
                !userId ||
                status !== "playing" ||
                savingRef.current
              }
              onLetterClick={handleLetterClick}
              onBackspace={handleBackspace}
              onEnter={handleEnter}
            />

            {message && (
              <div
                className={[
                  "mx-auto mt-4 w-full max-w-sm rounded-2xl p-3 text-center text-sm font-black",
                  status === "won"
                    ? "border border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                    : status === "lost"
                      ? "border border-red-300/30 bg-red-400/10 text-red-100"
                      : "border border-blue-300/30 bg-blue-400/10 text-blue-100",
                ].join(" ")}
              >
                {message}
              </div>
            )}

            {status === "won" && (
              <div className="mt-4 animate-bounce text-center text-4xl">
                🎉🏆🎉
              </div>
            )}

            {shareResult && (
              <div className="mt-4 flex justify-center">
                <ShareResultButton
                  won={shareResult.won}
                  attempts={shareResult.attempts}
                  durationSeconds={shareResult.durationSeconds}
                  streak={streak}
                  guessesResults={guessesResults}
                />
              </div>
            )}

            {shareResult && (
              <p className="mt-3 text-center text-xs font-semibold text-slate-300">
                وقتك: {formatDuration(shareResult.durationSeconds)}
              </p>
            )}
          </>
        )}
      </section>

      <TomorrowCountdown />

      <DailyLeaderboard refreshKey={refreshKey} />
    </div>
  );
}