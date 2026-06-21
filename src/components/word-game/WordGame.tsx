"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import GameBoard from "@/components/word-game/GameBoard";
import GuessInput from "@/components/word-game/GuessInput";
import WordKeyboard from "@/components/word-game/WordKeyboard";
import ShareResultButton from "@/components/word-game/ShareResultButton";
import TomorrowCountdown from "@/components/word-game/TomorrowCountdown";
import DailyLeaderboard from "@/components/word-game/DailyLeaderboard";
import WordGameStats from "@/components/word-game/WordGameStats";

import type {
  WordGameDailyGame,
  WordGameLeaderboardItem,
  WordGameTileStatus,
  WordGameUserStats,
} from "@/types/wordGame";

import {
  buildWordGameGuessResult,
  getOrCreateTodayWordGame,
  getTodayWordGameLeaderboard,
  getWordGameUserStats,
  saveWordGameProgress,
} from "@/lib/wordGameService";

import {
  normalizeWordGameText,
  WORD_GAME_MAX_ATTEMPTS,
  WORD_GAME_WORD_LENGTH,
} from "@/lib/wordGameLogic";

import {
  getWordGameCategoryLabel,
  getWordGameWordCategory,
} from "@/lib/wordGameWords";

const STATUS_PRIORITY: Record<WordGameTileStatus, number> = {
  empty: 0,
  absent: 1,
  present: 2,
  correct: 3,
};

function getCategoryIcon(label: string) {
  if (label === "رياضية") return "⚽";
  if (label === "لهجة سعودية") return "🇸🇦";
  return "📚";
}

export default function WordGame() {
  const { user, loading, isLoggedIn } = useAuth();

  const [game, setGame] = useState<WordGameDailyGame | null>(null);
  const [currentGuess, setCurrentGuess] = useState("");
  const [leaderboard, setLeaderboard] = useState<WordGameLeaderboardItem[]>([]);
  const [stats, setStats] = useState<WordGameUserStats | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);

  const userId = user?.id ?? "";
  const userName = user?.fullName || "عضو";

  const gameFinished = game?.status === "won" || game?.status === "lost";
  const inputDisabled = saving || !game || gameFinished;

  const categoryLabel = game
    ? getWordGameCategoryLabel(getWordGameWordCategory(game.targetWord))
    : "عامة";

  const categoryIcon = getCategoryIcon(categoryLabel);

  const letterStatuses = useMemo(() => {
    const statuses: Record<string, WordGameTileStatus> = {};

    game?.guesses.forEach((guess) => {
      guess.letters.forEach((item) => {
        const currentStatus = statuses[item.letter] ?? "empty";

        if (STATUS_PRIORITY[item.status] > STATUS_PRIORITY[currentStatus]) {
          statuses[item.letter] = item.status;
        }
      });
    });

    return statuses;
  }, [game?.guesses]);

  async function refreshExtraData(currentUserId: string) {
    const [leaderboardData, statsData] = await Promise.all([
      getTodayWordGameLeaderboard(),
      getWordGameUserStats(currentUserId),
    ]);

    setLeaderboard(leaderboardData);
    setStats(statsData);
  }

  useEffect(() => {
    async function loadGame() {
      if (loading) return;

      if (!isLoggedIn || !userId) {
        setPageLoading(false);
        return;
      }

      try {
        setPageLoading(true);
        setMessage("");

        const todayGame = await getOrCreateTodayWordGame({
          userId,
        });

        setGame(todayGame);
        await refreshExtraData(userId);
      } catch (error) {
        console.error(error);

        setMessage(
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء تحميل اللعبة."
        );
      } finally {
        setPageLoading(false);
      }
    }

    loadGame();
  }, [loading, isLoggedIn, userId]);

  function handleGuessChange(value: string) {
    const normalizedValue = normalizeWordGameText(value).slice(
      0,
      WORD_GAME_WORD_LENGTH
    );

    setCurrentGuess(normalizedValue);
  }

  function handleLetterClick(letter: string) {
    if (inputDisabled) return;

    setCurrentGuess((previous) => {
      if (previous.length >= WORD_GAME_WORD_LENGTH) return previous;
      return `${previous}${letter}`;
    });
  }

  function handleBackspace() {
    if (inputDisabled) return;
    setCurrentGuess((previous) => previous.slice(0, -1));
  }

  async function handleSubmitGuess() {
    if (!userId || !game || inputDisabled) return;

    if (currentGuess.length !== WORD_GAME_WORD_LENGTH) {
      setMessage("اكتب كلمة من 5 حروف.");
      return;
    }

    let updatedGame: WordGameDailyGame;

    try {
      updatedGame = buildWordGameGuessResult({
        currentGame: game,
        guess: currentGuess,
      });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "حدث خطأ أثناء إدخال الكلمة."
      );
      return;
    }

    setGame(updatedGame);
    setCurrentGuess("");

    if (updatedGame.status === "won") {
      setShowCelebration(true);
      setMessage("مبروك! جبت الكلمة صح 🎉");
      window.setTimeout(() => setShowCelebration(false), 2500);
    } else if (updatedGame.status === "lost") {
      setMessage("انتهت محاولاتك لهذا اليوم.");
    } else {
      setMessage("");
    }

    try {
      setSaving(true);

      await saveWordGameProgress({
        updatedGame,
        userName,
      });

      await refreshExtraData(userId);
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? `ظهرت النتيجة، لكن تعذر حفظها: ${error.message}`
          : "ظهرت النتيجة، لكن تعذر حفظها."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading || pageLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-center shadow-2xl">
        <p className="font-bold text-slate-200">جاري تحميل اللعبة...</p>
      </div>
    );
  }

  if (!isLoggedIn || !userId) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-center shadow-2xl">
        <p className="font-bold text-slate-200">
          سجل دخولك أولًا عشان تلعب خمن كلمة اليوم.
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-5" dir="rtl">
      {showCelebration && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/20 text-6xl">
          🎉
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl">
        <div className="mb-4 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-sm font-black text-amber-100">
            <span>{categoryIcon}</span>
            <span>كلمة اليوم: {categoryLabel}</span>
          </div>
        </div>

        <GameBoard guesses={game?.guesses ?? []} currentGuess={currentGuess} />

        <div className="mt-5 space-y-4">
          <GuessInput
            value={currentGuess}
            disabled={inputDisabled}
            onChange={handleGuessChange}
            onSubmit={handleSubmitGuess}
          />

          <WordKeyboard
            disabled={inputDisabled}
            letterStatuses={letterStatuses}
            onLetterClick={handleLetterClick}
            onBackspace={handleBackspace}
            onEnter={handleSubmitGuess}
          />
        </div>

        {message && (
          <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-center text-sm font-black text-amber-100">
            {message}
          </div>
        )}

        {saving && (
          <p className="mt-3 text-center text-xs font-bold text-slate-400">
            جاري حفظ المحاولة...
          </p>
        )}

        {gameFinished && game && (
          <div className="mt-4 flex justify-center">
            <ShareResultButton
              won={game.won}
              attemptsUsed={game.attemptsUsed}
              maxAttempts={WORD_GAME_MAX_ATTEMPTS}
              durationMs={game.durationMs}
              guesses={game.guesses}
            />
          </div>
        )}
      </div>

      <TomorrowCountdown />

      <WordGameStats stats={stats} />

      <DailyLeaderboard items={leaderboard} />
    </div>
  );
}