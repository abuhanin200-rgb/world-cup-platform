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
    <button
      type="button"
      disabled={disabled}
      onClick={handleShare}
      className="mx-auto inline-flex w-full max-w-[300px] items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-lg transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="text-base leading-none"></span>
      <span>مشاركة النتيجة واتساب</span>
    </button>
  );
}