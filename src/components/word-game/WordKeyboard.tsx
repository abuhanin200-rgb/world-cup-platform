import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CornerDownLeft, Delete } from "lucide-react";
import type { WordGameTileStatus } from "@/types/wordGame";

type WordKeyboardProps = {
  disabled: boolean;
  letterStatuses: Record<string, WordGameTileStatus>;
  onLetterClick: (letter: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
};

const KEYBOARD_ROWS = [
  ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح", "ج"],
  ["ش", "س", "ي", "ب", "ل", "ا", "ت", "ن", "م", "ك", "ط"],
  ["ة", "ئ", "ء", "ؤ", "ر", "ى", "ز", "و", "ظ", "د", "ذ"],
];

function getKeyClass(status: WordGameTileStatus | undefined) {
  if (status === "correct") return "border-emerald-300/70 bg-emerald-500 text-white shadow-emerald-500/15";
  if (status === "present") return "border-amber-200/70 bg-amber-400 text-[#17142f] shadow-amber-400/15";
  if (status === "absent") return "border-slate-700/70 bg-slate-800/65 text-slate-500 opacity-50";
  return "border-violet-300/12 bg-[#171b43]/90 text-white shadow-[0_5px_14px_rgba(5,7,28,.18)] hover:border-cyan-300/25 hover:bg-[#1d2251]";
}

function getKeyStatusLabel(status: WordGameTileStatus | undefined) {
  if (status === "correct") return "صحيح";
  if (status === "present") return "موجود";
  if (status === "absent") return "غير موجود";
  return "";
}

function WordKeyboard({ disabled, letterStatuses, onLetterClick, onBackspace, onEnter }: WordKeyboardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="mx-auto w-full max-w-[430px] space-y-1.5 sm:space-y-2" dir="rtl">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="grid min-w-0 grid-cols-11 gap-[3px] sm:gap-1">
          {row.map((letter) => {
            const status = letterStatuses[letter];
            const isAbsent = status === "absent";
            const statusLabel = getKeyStatusLabel(status);
            return (
              <motion.button
                key={letter}
                type="button"
                disabled={disabled || isAbsent}
                onClick={() => !isAbsent && onLetterClick(letter)}
                whileTap={disabled || isAbsent || reduceMotion ? undefined : { scale: 0.87, y: 1 }}
                className={[
                  "relative flex h-[clamp(34px,9vw,42px)] min-w-0 items-center justify-center overflow-hidden rounded-[10px] border text-[clamp(.8rem,4vw,1.03rem)] font-black transition active:brightness-90 disabled:cursor-not-allowed sm:rounded-xl",
                  getKeyClass(status),
                ].join(" ")}
              >
                <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,.10),transparent_48%)]" />
                <span className="relative leading-none">{letter}</span>
                {statusLabel && <span className="sr-only">{letter} - {statusLabel}</span>}
              </motion.button>
            );
          })}
        </div>
      ))}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <motion.button
          type="button"
          disabled={disabled}
          onClick={onEnter}
          whileTap={disabled || reduceMotion ? undefined : { scale: 0.96 }}
          className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[15px] bg-gradient-to-l from-violet-500 to-cyan-400 px-3 text-sm font-black text-white shadow-[0_10px_26px_rgba(99,102,241,.18)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <CornerDownLeft className="h-4 w-4" /> إدخال
        </motion.button>
        <motion.button
          type="button"
          disabled={disabled}
          onClick={onBackspace}
          whileTap={disabled || reduceMotion ? undefined : { scale: 0.96 }}
          className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[15px] border border-fuchsia-300/15 bg-fuchsia-400/[0.07] px-3 text-sm font-black text-fuchsia-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Delete className="h-4 w-4 text-fuchsia-200" /> حذف
        </motion.button>
      </div>
    </div>
  );
}

export default memo(WordKeyboard);
