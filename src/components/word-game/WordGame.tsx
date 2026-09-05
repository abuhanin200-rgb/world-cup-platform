"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  Gamepad2,
  Loader2,
  PartyPopper,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import AuthGateCard from "@/components/auth/AuthGateCard";
import {
  isInteractionSoundEnabled,
  setInteractionSoundEnabled,
  subscribeInteractionSound,
} from "@/lib/interactionFeedback";
import { playWordGameSound, prepareWordGameAudio } from "@/lib/wordGameAudio";
import GameBoard from "@/components/word-game/GameBoard";
import GuessInput from "@/components/word-game/GuessInput";
import WordKeyboard from "@/components/word-game/WordKeyboard";
import ShareResultButton from "@/components/word-game/ShareResultButton";
import TomorrowCountdown from "@/components/word-game/TomorrowCountdown";
import DailyLeaderboard from "@/components/word-game/DailyLeaderboard";
import WordGameStats from "@/components/word-game/WordGameStats";

import type { WordGameLeaderboardItem, WordGameTileStatus, WordGameUserStats } from "@/types/wordGame";
import {
  getTodayWordGameState,
  submitWordGameGuess,
  type WordGameClientGame,
} from "@/lib/wordGameService";
import {
  normalizeWordGameText,
  WORD_GAME_MAX_ATTEMPTS,
  WORD_GAME_WORD_LENGTH,
} from "@/lib/wordGameLogic";

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

function buildMiniConfetti() {
  return Array.from({ length: 16 }).map((_, index) => ({
    id: index,
    left: (index * 37) % 100,
    delay: (index % 6) * 0.07,
    duration: 1.45 + (index % 4) * 0.16,
    size: 6 + (index % 3),
  }));
}

export default function WordGame() {
  const { user, loading, isLoggedIn } = useAuth();
  const reduceMotion = useReducedMotion();

  const [game, setGame] = useState<WordGameClientGame | null>(null);
  const [currentGuess, setCurrentGuess] = useState("");
  const [leaderboard, setLeaderboard] = useState<WordGameLeaderboardItem[]>([]);
  const [stats, setStats] = useState<WordGameUserStats | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [feedbackPulse, setFeedbackPulse] = useState<{ kind: "error" | "success" | "neutral"; tick: number }>({ kind: "neutral", tick: 0 });

  const userId = user?.id ?? "";
  const gameFinished = game?.status === "won" || game?.status === "lost";
  const inputDisabled = saving || !game || gameFinished;
  const categoryLabel = game?.categoryLabel || "عامة";
  const categoryIcon = getCategoryIcon(categoryLabel);
  const miniConfetti = useMemo(() => buildMiniConfetti(), []);
  const attemptsLeft = Math.max(0, WORD_GAME_MAX_ATTEMPTS - (game?.guesses.length ?? 0));

  const letterStatuses = useMemo(() => {
    const statuses: Record<string, WordGameTileStatus> = {};
    game?.guesses.forEach((guess) => {
      guess.letters.forEach((item) => {
        const currentStatus = statuses[item.letter] ?? "empty";
        if (STATUS_PRIORITY[item.status] > STATUS_PRIORITY[currentStatus]) statuses[item.letter] = item.status;
      });
    });
    return statuses;
  }, [game?.guesses]);

  useEffect(() => {
    setSoundEnabled(isInteractionSoundEnabled());
    return subscribeInteractionSound(setSoundEnabled);
  }, []);

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
        const state = await getTodayWordGameState({ userId });
        setGame(state.game);
        setLeaderboard(state.leaderboard);
        setStats(state.stats);
      } catch (error) {
        console.error(error);
        setMessage(error instanceof Error ? error.message : "حدث خطأ أثناء تحميل اللعبة.");
      } finally {
        setPageLoading(false);
      }
    }
    void loadGame();
  }, [loading, isLoggedIn, userId]);

  const handleGuessChange = useCallback((value: string) => {
    setCurrentGuess(normalizeWordGameText(value).slice(0, WORD_GAME_WORD_LENGTH));
  }, []);

  const handleLetterClick = useCallback((letter: string) => {
    if (inputDisabled) return;
    prepareWordGameAudio();
    playWordGameSound("key");
    setCurrentGuess((previous) => previous.length >= WORD_GAME_WORD_LENGTH ? previous : `${previous}${letter}`);
  }, [inputDisabled]);

  const handleBackspace = useCallback(() => {
    if (inputDisabled) return;
    prepareWordGameAudio();
    playWordGameSound("delete");
    setCurrentGuess((previous) => previous.slice(0, -1));
  }, [inputDisabled]);

  const handleToggleSound = useCallback(() => {
    prepareWordGameAudio();
    const nextValue = !soundEnabled;
    setInteractionSoundEnabled(nextValue);
    setSoundEnabled(nextValue);
    if (nextValue) playWordGameSound("key");
  }, [soundEnabled]);

  const pulse = useCallback((kind: "error" | "success" | "neutral") => {
    setFeedbackPulse((current) => ({ kind, tick: current.tick + 1 }));
  }, []);

  const handleSubmitGuess = useCallback(async () => {
    if (!userId || !game || inputDisabled) return;

    prepareWordGameAudio();
    if (currentGuess.length !== WORD_GAME_WORD_LENGTH) {
      setMessage("اكتب كلمة من 5 حروف.");
      playWordGameSound("invalid");
      pulse("error");
      return;
    }

    playWordGameSound("submit");

    try {
      setSaving(true);
      const nextState = await submitWordGameGuess({ userId, guess: currentGuess });
      const updatedGame = nextState.game;
      setGame(updatedGame);
      setLeaderboard(nextState.leaderboard);
      setStats(nextState.stats);
      setCurrentGuess("");

      if (updatedGame.status === "won") {
        setShowCelebration(true);
        setMessage("مبروك! كشفت كلمة اليوم 🎉");
        playWordGameSound("win");
        pulse("success");
        window.setTimeout(() => setShowCelebration(false), 2200);
      } else if (updatedGame.status === "lost") {
        setMessage(`انتهت محاولاتك لهذا اليوم. كلمتك اليوم: ${updatedGame.targetWord || "—"}`);
        playWordGameSound("lose");
        pulse("error");
      } else {
        setMessage("");
        playWordGameSound("reveal");
        pulse("neutral");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ أثناء إدخال الكلمة.");
      playWordGameSound("invalid");
      pulse("error");
    } finally {
      setSaving(false);
    }
  }, [currentGuess, game, inputDisabled, pulse, userId]);

  if (loading || pageLoading) {
    return (
      <div className="relative overflow-hidden rounded-[24px] border border-violet-300/12 bg-[#111537]/90 p-6 text-center shadow-[0_16px_44px_rgba(4,6,27,.22)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(139,92,246,.15),transparent_34%)]" />
        <div className="relative inline-flex items-center gap-2 text-[13px] font-bold text-white/70">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-200" /> جاري تحميل تحدي اليوم...
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !userId) {
    return <AuthGateCard returnTo="/word-game" title="سجّل دخولك لتخمين كلمة اليوم" description="ست محاولات يومية، ونتيجتك تُحفظ تلقائيًا في حسابك." benefit="ارجع إلى اللعبة مباشرة بعد الدخول وتابع تحدي اليوم دون خطوات إضافية." />;
  }

  return (
    <div className="relative min-w-0 space-y-4 sm:space-y-5" dir="rtl">
      <AnimatePresence>
        {showCelebration && !reduceMotion && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#080a22]/55 backdrop-blur-[2px]">
            <div className="absolute inset-0 overflow-hidden">
              {miniConfetti.map((piece) => (
                <span
                  key={piece.id}
                  className="word-game-confetti absolute top-[-20px] rounded-sm"
                  style={{ left: `${piece.left}%`, width: `${piece.size}px`, height: `${piece.size * 1.5}px`, animationDelay: `${piece.delay}s`, animationDuration: `${piece.duration}s` }}
                />
              ))}
            </div>
            <motion.div initial={{ scale: 0.82 }} animate={{ scale: 1 }} className="relative grid h-28 w-28 place-items-center rounded-[30px] border border-cyan-300/25 bg-[#111537]/95 shadow-[0_0_55px_rgba(139,92,246,.28)]">
              <PartyPopper className="h-14 w-14 text-cyan-200" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="relative min-w-0 overflow-hidden rounded-[26px] border border-violet-300/12 bg-[#111537]/94 p-3 shadow-[0_20px_58px_rgba(4,6,27,.26)] sm:p-4 md:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_8%,rgba(139,92,246,.16),transparent_28%),radial-gradient(circle_at_10%_88%,rgba(34,211,238,.09),transparent_26%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.11] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative min-w-0">
          <div className="mb-3 grid grid-cols-[1fr_auto_auto] items-center gap-2 sm:mb-4">
            <div className="min-w-0">
              <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-violet-300/15 bg-violet-400/[0.07] px-2.5 py-1.5 text-[10px] font-black text-violet-100">
                <span>{categoryIcon}</span><span className="truncate">{categoryLabel}</span><Sparkles className="h-3.5 w-3.5 shrink-0 text-cyan-200" />
              </div>
            </div>

            <div className="rounded-[13px] border border-white/[0.07] bg-black/15 px-2.5 py-1.5 text-center">
              <div className="text-[8px] font-bold text-white/35">متبقي</div>
              <div className="mt-0.5 text-xs font-black text-cyan-100" dir="ltr">{attemptsLeft}/6</div>
            </div>

            <button
              type="button"
              onClick={handleToggleSound}
              className="grid h-10 w-10 place-items-center rounded-[13px] border border-white/[0.08] bg-white/[0.045] text-white/70 transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              aria-label={soundEnabled ? "إيقاف أصوات اللعبة" : "تشغيل أصوات اللعبة"}
              aria-pressed={soundEnabled}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 text-cyan-200" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </div>

          <GameBoard guesses={game?.guesses ?? []} currentGuess={currentGuess} />

          <div className="mx-auto mt-4 max-w-[430px] border-t border-white/[0.06] pt-4 sm:mt-5">
            <motion.div
              key={feedbackPulse.tick}
              animate={
                reduceMotion || feedbackPulse.tick === 0
                  ? undefined
                  : feedbackPulse.kind === "error"
                    ? { x: [0, -7, 6, -3, 0] }
                    : feedbackPulse.kind === "success"
                      ? { scale: [1, 1.02, 1] }
                      : { y: [0, -2, 0] }
              }
              transition={{ duration: 0.26, ease: "easeOut" }}
            >
              <GuessInput value={currentGuess} disabled={inputDisabled} onChange={handleGuessChange} onSubmit={handleSubmitGuess} />
            </motion.div>

            <div className="mt-3">
              <WordKeyboard disabled={inputDisabled} letterStatuses={letterStatuses} onLetterClick={handleLetterClick} onBackspace={handleBackspace} onEnter={handleSubmitGuess} />
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {message && (
              <motion.div
                key={message}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className={`mx-auto mt-4 max-w-[430px] rounded-[16px] border px-3.5 py-3 text-center text-[12px] font-black leading-5 ${
                  game?.status === "won"
                    ? "border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-100"
                    : game?.status === "lost"
                      ? "border-rose-300/18 bg-rose-400/[0.07] text-rose-100"
                      : "border-violet-300/15 bg-violet-400/[0.07] text-violet-100"
                }`}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {game?.status === "won" ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : game?.status === "lost" ? <BookOpen className="h-4 w-4 text-rose-200" /> : <Gamepad2 className="h-4 w-4 text-violet-200" />}
                  <span>{message}</span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {saving && (
            <p className="mt-3 text-center text-[10px] font-bold text-white/32">
              <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-200" />جاري تحليل المحاولة...</span>
            </p>
          )}

          {gameFinished && game && (
            <div className="mt-4 flex justify-center">
              <ShareResultButton won={game.won} attemptsUsed={game.attemptsUsed} maxAttempts={WORD_GAME_MAX_ATTEMPTS} durationMs={game.durationMs} guesses={game.guesses} />
            </div>
          )}
        </div>
      </section>

      <TomorrowCountdown />
      <WordGameStats stats={stats} />
      <DailyLeaderboard items={leaderboard} />

      <style jsx>{`
        .word-game-confetti:nth-child(4n + 1) { background: #67e8f9; }
        .word-game-confetti:nth-child(4n + 2) { background: #a78bfa; }
        .word-game-confetti:nth-child(4n + 3) { background: #f0abfc; }
        .word-game-confetti:nth-child(4n + 4) { background: #fde68a; }
        .word-game-confetti {
          animation-name: wordGameConfettiFall;
          animation-timing-function: cubic-bezier(.2,.8,.2,1);
          animation-iteration-count: 1;
          opacity: 0;
        }
        @keyframes wordGameConfettiFall {
          0% { transform: translateY(-36px) rotate(0deg); opacity: 0; }
          12% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(105vh) rotate(650deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .word-game-confetti { display: none; }
        }
      `}</style>
    </div>
  );
}
