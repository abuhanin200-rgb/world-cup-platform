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

export default function ShareResultButton({ won, attemptsUsed, maxAttempts, durationMs, guesses, disabled = false }: ShareResultButtonProps) {
  const guessSquares = guesses.map((guess) => guess.letters.map((letter) => getShareSquare(letter.status)).join("")).join("\n");
  const shareText = [
    "🎮 خمن كلمة اليوم",
    "",
    won ? `✅ النتيجة: ${attemptsUsed}/${maxAttempts}` : `❌ النتيجة: ${attemptsUsed}/${maxAttempts}`,
    `⏱️ الوقت: ${formatDurationMs(durationMs)}`,
    "",
    guessSquares,
    "",
    "👇 جربها بدون ما نحرق الكلمة",
    "https://world-cup-platform.vercel.app/word-game",
  ].join("\n");

  function handleShare() {
    if (disabled) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={handleShare}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      className={`mx-auto inline-flex min-h-[48px] w-full max-w-[320px] items-center justify-center gap-2 rounded-[16px] px-4 py-3 text-sm font-black shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
        won
          ? "bg-gradient-to-l from-violet-500 to-cyan-400 text-white shadow-violet-500/15"
          : "border border-white/10 bg-white/[0.07] text-white shadow-black/15"
      }`}
    >
      {won ? <Trophy className="h-4 w-4 text-amber-100" /> : <Share2 className="h-4 w-4 text-violet-100" />}
      <span>مشاركة النتيجة واتساب</span>
      <Share2 className="h-4 w-4" />
    </motion.button>
  );
}
