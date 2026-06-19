"use client";

import { getShareSquares } from "@/lib/wordGameLogic";
import type { LetterResult } from "@/lib/wordGameLogic";

type ShareResultButtonProps = {
  won: boolean;
  attempts: number;
  maxAttempts?: number;
  durationSeconds: number;
  streak?: number;
  guessesResults: LetterResult[][];
};

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

export default function ShareResultButton({
  won,
  attempts,
  maxAttempts = 6,
  durationSeconds,
  streak = 0,
  guessesResults,
}: ShareResultButtonProps) {
  function handleShare() {
    const siteUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/word-game`
        : "";

    const resultText = won ? `${attempts}/${maxAttempts}` : "خسرت";

    const message = [
      "🎮 خمن كلمة اليوم",
      "",
      won ? `✅ النتيجة: ${resultText}` : "❌ انتهت المحاولات",
      `⏱️ الوقت: ${formatDuration(durationSeconds)}`,
      `🔥 السلسلة: ${streak} ${streak === 1 ? "يوم" : "أيام"}`,
      "",
      getShareSquares(guessesResults),
      "",
      "جربها بدون ما نحرق الكلمة 👇",
      siteUrl,
    ].join("\n");

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="mx-auto flex h-12 w-full max-w-sm items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-500 px-4 font-black text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400"
    >
      مشاركة النتيجة في واتساب
    </button>
  );
}