"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  Gamepad2,
  Loader2,
  Medal,
  PartyPopper,
  Sparkles,
  Trophy,
} from "lucide-react";

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

const containerMotion: Variants = {
  hidden: {
    opacity: 0,
  },
  show: {
    opacity: 1,
    transition: {
      duration: 0.24,
      ease: "easeOut",
    },
  },
};

const scrollOnceViewport = {
  once: true,
  amount: 0.18,
} as const;

const revealMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
    scale: 0.99,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.32,
      ease: "easeOut",
    },
  },
};

const smallRevealMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
    scale: 0.99,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.24,
      ease: "easeOut",
    },
  },
};

const messageMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
    scale: 0.98,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.98,
    transition: {
      duration: 0.16,
      ease: "easeIn",
    },
  },
};

const celebrationMotion: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.88,
  },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.28,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    transition: {
      duration: 0.18,
      ease: "easeIn",
    },
  },
};

function getCategoryIcon(label: string) {
  if (label === "رياضية") return "⚽";
  if (label === "لهجة سعودية") return "🇸🇦";
  return "📚";
}

function buildMiniConfetti() {
  return Array.from({ length: 18 }).map((_, index) => {
    return {
      id: index,
      left: (index * 37) % 100,
      delay: (index % 7) * 0.08,
      duration: 1.6 + (index % 5) * 0.18,
      size: 6 + (index % 4),
      rotate: (index * 31) % 360,
    };
  });
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
  const miniConfetti = useMemo(() => buildMiniConfetti(), []);

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
      setMessage(
        `انتهت محاولاتك لهذا اليوم. كلمتك اليوم: ${updatedGame.targetWord}`
      );
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
      <motion.div
        variants={revealMotion}
        initial="hidden"
        animate="show"
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.09] p-6 text-center shadow-lg shadow-slate-950/25 backdrop-blur-sm"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-amber-300/10" />

        <div className="relative inline-flex items-center justify-center gap-2 text-[14px] font-bold text-slate-200">
          <Loader2 className="h-5 w-5 animate-spin text-amber-300" />
          <span>جاري تحميل اللعبة...</span>
        </div>
      </motion.div>
    );
  }

  if (!isLoggedIn || !userId) {
    return (
      <motion.div
        variants={revealMotion}
        initial="hidden"
        animate="show"
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.09] p-6 text-center shadow-lg shadow-slate-950/25 backdrop-blur-sm"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-red-300/10" />

        <p className="relative text-[14px] font-bold text-slate-200">
          سجل دخولك أولًا عشان تلعب خمن كلمة اليوم.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerMotion}
      initial="hidden"
      animate="show"
      className="relative space-y-5"
      dir="rtl"
    >
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            variants={celebrationMotion}
            initial="hidden"
            animate="show"
            exit="exit"
            className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black/25 backdrop-blur-[2px]"
          >
            <div className="absolute inset-0 overflow-hidden">
              {miniConfetti.map((piece) => (
                <span
                  key={piece.id}
                  className="word-game-confetti absolute top-[-20px] rounded-sm"
                  style={{
                    left: `${piece.left}%`,
                    width: `${piece.size}px`,
                    height: `${piece.size * 1.45}px`,
                    animationDelay: `${piece.delay}s`,
                    animationDuration: `${piece.duration}s`,
                    transform: `rotate(${piece.rotate}deg)`,
                  }}
                />
              ))}
            </div>

            <motion.div
              initial={{ scale: 0.94, rotate: -3 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] border border-amber-300/40 bg-slate-950/80 text-6xl shadow-lg shadow-amber-500/20 md:h-32 md:w-32"
            >
              <PartyPopper className="h-14 w-14 text-amber-300 md:h-16 md:w-16" />
            </motion.div>

            <style jsx>{`
              .word-game-confetti:nth-child(5n + 1) {
                background: #fbbf24;
              }

              .word-game-confetti:nth-child(5n + 2) {
                background: #34d399;
              }

              .word-game-confetti:nth-child(5n + 3) {
                background: #60a5fa;
              }

              .word-game-confetti:nth-child(5n + 4) {
                background: #f472b6;
              }

              .word-game-confetti:nth-child(5n + 5) {
                background: #fb7185;
              }

              .word-game-confetti {
                animation-name: wordGameConfettiFall;
                animation-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1);
                animation-iteration-count: 1;
                opacity: 0;
              }

              @keyframes wordGameConfettiFall {
                0% {
                  transform: translateY(-40px) rotate(0deg);
                  opacity: 0;
                }

                10% {
                  opacity: 1;
                }

                80% {
                  opacity: 1;
                }

                100% {
                  transform: translateY(105vh) rotate(720deg);
                  opacity: 0;
                }
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={revealMotion}
        initial="hidden"
        whileInView="show"
        viewport={scrollOnceViewport}
        whileTap={{ scale: 0.995 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.09] p-4 shadow-lg shadow-slate-950/25 backdrop-blur-sm md:p-5"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-amber-300/10" />
        <div className="pointer-events-none absolute -right-24 top-10 h-44 w-44 rounded-full bg-amber-300/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-24 bottom-10 h-44 w-44 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

        <div className="relative">
          <motion.div
            variants={smallRevealMotion}
            className="mb-4 flex justify-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-[14px] font-black text-amber-100 shadow-md shadow-amber-950/10">
              <span>{categoryIcon}</span>
              <span>كلمة اليوم: {categoryLabel}</span>
              <Sparkles className="h-4 w-4 text-amber-300" />
            </div>
          </motion.div>

          <motion.div variants={smallRevealMotion}>
            <GameBoard guesses={game?.guesses ?? []} currentGuess={currentGuess} />
          </motion.div>

          <motion.div variants={smallRevealMotion} className="mt-5 space-y-4">
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
          </motion.div>

          <AnimatePresence mode="popLayout">
            {message && (
              <motion.div
                key={message}
                variants={messageMotion}
                initial="hidden"
                animate="show"
                exit="exit"
                className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-center text-[14px] font-black leading-6 text-amber-100 shadow-md shadow-amber-950/10"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {game?.status === "won" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  ) : game?.status === "lost" ? (
                    <BookOpen className="h-4 w-4 text-amber-300" />
                  ) : (
                    <Gamepad2 className="h-4 w-4 text-amber-300" />
                  )}

                  <span>{message}</span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {saving && (
              <motion.p
                variants={messageMotion}
                initial="hidden"
                animate="show"
                exit="exit"
                className="mt-3 text-center text-xs font-bold text-slate-400"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-300" />
                  <span>جاري حفظ المحاولة...</span>
                </span>
              </motion.p>
            )}
          </AnimatePresence>

          {gameFinished && game && (
            <motion.div
              variants={smallRevealMotion}
              initial="hidden"
              animate="show"
              className="mt-4 flex justify-center"
            >
              <ShareResultButton
                won={game.won}
                attemptsUsed={game.attemptsUsed}
                maxAttempts={WORD_GAME_MAX_ATTEMPTS}
                durationMs={game.durationMs}
                guesses={game.guesses}
              />
            </motion.div>
          )}
        </div>
      </motion.div>

      <motion.div
        variants={revealMotion}
        initial="hidden"
        whileInView="show"
        viewport={scrollOnceViewport}
      >
        <TomorrowCountdown />
      </motion.div>

      <motion.div
        variants={revealMotion}
        initial="hidden"
        whileInView="show"
        viewport={scrollOnceViewport}
      >
        <WordGameStats stats={stats} />
      </motion.div>

      <motion.div
        variants={revealMotion}
        initial="hidden"
        whileInView="show"
        viewport={scrollOnceViewport}
      >
        <DailyLeaderboard items={leaderboard} />
      </motion.div>
    </motion.div>
  );
}