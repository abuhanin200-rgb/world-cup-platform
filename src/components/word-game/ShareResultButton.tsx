import { motion } from "framer-motion";
import { Share2, Trophy } from "lucide-react";
import type { WordGameGuess } from "@/types/wordGame";
import { formatDurationMs } from "@/lib/wordGameLogic";

type ShareResultButtonProps = {
  won: boolean;
  attemptsUsed: number;
  maxAttempts: number;
  durationMs: number | null;
  guesses: WordGameGuess[];
  disabled?: boolean;
};

function getShareSquare(status: string) {
  if (status === "correct") return "🟩";
  if (status === "present") return "🟨";
  return "⬜";
}

export default function ShareResultButton({
  won,
  attemptsUsed,
  maxAttempts,
  durationMs,
  guesses,
  disabled = false,
}: ShareResultButtonProps) {
  const guessSquares = guesses
    .map((guess) =>
      guess.letters.map((letter) => getShareSquare(letter.status)).join("")
    )
    .join("\n");

  const shareText = [
    "🎮 خمن كلمة اليوم",
    "",
    won
      ? `✅ النتيجة: ${attemptsUsed}/${maxAttempts}`
      : `❌ النتيجة: ${attemptsUsed}/${maxAttempts}`,
    `⏱️ الوقت: ${formatDurationMs(durationMs)}`,
    "",
    guessSquares,
    "",
    "👇 جربها بدون ما نحرق الكلمة",
    "https://world-cup-platform.vercel.app/word-game",
  ].join("\n");

  function handleShare() {
    if (disabled) return;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={handleShare}
      initial={{ opacity: 0, y: 14, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileTap={disabled ? undefined : { scale: 0.94, y: 2 }}
      transition={{ duration: 0.34, ease: "easeOut" }}
      className={`group relative mx-auto inline-flex min-h-[48px] w-full max-w-[300px] items-center justify-center gap-2 overflow-hidden rounded-2xl px-4 py-3 text-sm font-black shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
        won
          ? "bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-400"
          : "bg-slate-700 text-white shadow-slate-950/20 hover:bg-slate-600"
      }`}
    >
      <span className="pointer-events-none absolute inset-0 translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition duration-700 group-hover:translate-x-[-120%]" />

      <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
        {won ? (
          <Trophy className="h-4 w-4 text-amber-200" />
        ) : (
          <Share2 className="h-4 w-4 text-slate-100" />
        )}
      </span>

      <span className="relative">مشاركة النتيجة واتساب</span>

      <Share2 className="relative h-4 w-4" />
    </motion.button>
  );
}