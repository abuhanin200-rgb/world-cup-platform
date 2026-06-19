"use client";

import type { LetterStatus } from "@/lib/wordGameLogic";

const KEYBOARD_ROWS = [
  ["ا", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ"],
  ["ر", "ز", "س", "ش", "ص", "ض", "ط", "ظ"],
  ["ع", "غ", "ف", "ق", "ك", "ل", "م"],
  ["ن", "ه", "ة", "و", "ي", "ء"],
];

type WordKeyboardProps = {
  disabled?: boolean;
  currentGuess: string;
  letterStatuses: Record<string, LetterStatus | undefined>;
  onLetterClick: (letter: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
};

function getKeyClass(status?: LetterStatus, isDisabled?: boolean) {
  if (status === "correct") {
    return "border-emerald-400 bg-emerald-500 text-white shadow-emerald-950/30";
  }

  if (status === "present") {
    return "border-amber-300 bg-amber-400 text-slate-950 shadow-amber-950/30";
  }

  if (status === "absent") {
    return "border-slate-600 bg-slate-700 text-slate-400 opacity-60";
  }

  if (isDisabled) {
    return "border-white/10 bg-white/5 text-slate-500 opacity-60";
  }

  return "border-white/10 bg-white/10 text-white hover:bg-white/15";
}

export default function WordKeyboard({
  disabled = false,
  currentGuess,
  letterStatuses,
  onLetterClick,
  onBackspace,
  onEnter,
}: WordKeyboardProps) {
  const isGuessComplete = [...currentGuess].length === 5;

  return (
    <div
      className="mx-auto mt-3 w-full max-w-[330px] space-y-1.5 sm:max-w-2xl sm:space-y-2"
      dir="rtl"
    >
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 md:gap-2"
        >
          {row.map((letter) => {
            const normalizedLetter = letter === "ة" ? "ه" : letter;
            const status = letterStatuses[normalizedLetter];
            const keyDisabled = disabled || status === "absent";

            return (
              <button
                key={letter}
                type="button"
                disabled={keyDisabled}
                onClick={() => onLetterClick(letter)}
                className={[
                  "flex h-9 min-w-8 items-center justify-center rounded-lg border px-1.5 text-sm font-black shadow-sm transition",
                  "sm:h-10 sm:min-w-9 sm:rounded-xl sm:px-2 sm:text-sm",
                  "md:h-12 md:min-w-[44px] md:px-3 md:text-base",
                  "disabled:cursor-not-allowed",
                  getKeyClass(status, keyDisabled),
                ].join(" ")}
              >
                {letter}
              </button>
            );
          })}
        </div>
      ))}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onBackspace}
          className="h-10 rounded-xl border border-red-300/30 bg-red-500 text-sm font-black text-white shadow-lg shadow-red-950/20 transition hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:h-12"
        >
          حذف
        </button>

        <button
          type="button"
          disabled={disabled || !isGuessComplete}
          onClick={onEnter}
          className="h-10 rounded-xl border border-emerald-300/30 bg-emerald-500 text-sm font-black text-white shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:h-12"
        >
          تأكيد
        </button>
      </div>
    </div>
  );
}