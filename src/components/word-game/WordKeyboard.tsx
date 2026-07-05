import { motion, type Variants } from "framer-motion";
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

const keyboardMotion: Variants = {
  hidden: {
    opacity: 0,
  },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.025,
    },
  },
};

const rowMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.26,
      ease: "easeOut",
      staggerChildren: 0.018,
    },
  },
};

const keyMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
    scale: 0.92,
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
};

function getKeyClass(status: WordGameTileStatus | undefined) {
  if (status === "correct") {
    return "border-emerald-400 bg-emerald-500 text-white shadow-emerald-500/20";
  }

  if (status === "present") {
    return "border-amber-300 bg-amber-400 text-slate-950 shadow-amber-400/20";
  }

  if (status === "absent") {
    return "border-slate-700 bg-slate-800/60 text-slate-500 opacity-45 shadow-slate-950/10";
  }

  return "border-white/10 bg-slate-950/70 text-white shadow-slate-950/20 hover:border-emerald-400/40 hover:bg-white/10";
}

function getKeyStatusLabel(status: WordGameTileStatus | undefined) {
  if (status === "correct") return "صحيح";
  if (status === "present") return "موجود";
  if (status === "absent") return "غير موجود";
  return "";
}

export default function WordKeyboard({
  disabled,
  letterStatuses,
  onLetterClick,
  onBackspace,
  onEnter,
}: WordKeyboardProps) {
  return (
    <motion.div
      variants={keyboardMotion}
      initial="hidden"
      animate="show"
      className="mx-auto w-full max-w-[390px] space-y-2.5"
      dir="rtl"
    >
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <motion.div
          key={rowIndex}
          variants={rowMotion}
          className="grid grid-cols-11 gap-1.5"
        >
          {row.map((letter) => {
            const status = letterStatuses[letter];
            const isAbsent = status === "absent";
            const statusLabel = getKeyStatusLabel(status);

            return (
              <motion.button
                key={letter}
                type="button"
                variants={keyMotion}
                disabled={disabled || isAbsent}
                onClick={() => {
                  if (!isAbsent) onLetterClick(letter);
                }}
                whileTap={
                  disabled || isAbsent
                    ? undefined
                    : {
                        scale: 0.88,
                        y: 2,
                      }
                }
                animate={
                  status && status !== "empty"
                    ? {
                        scale: [1, 1.12, 1],
                        y: [0, -2, 0],
                      }
                    : {
                        scale: 1,
                        y: 0,
                      }
                }
                transition={{
                  duration: 0.24,
                  ease: "easeOut",
                }}
                className={[
                  "relative flex h-9 items-center justify-center overflow-hidden rounded-xl border text-base font-black shadow-sm transition active:brightness-90 disabled:cursor-not-allowed md:h-10 md:text-lg",
                  getKeyClass(status),
                ].join(" ")}
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-transparent" />

                {status === "correct" && (
                  <motion.span
                    aria-hidden="true"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{
                      opacity: [0, 0.7, 0],
                      scale: [0.7, 1.35, 1.8],
                    }}
                    transition={{
                      duration: 0.55,
                      ease: "easeOut",
                    }}
                    className="pointer-events-none absolute inset-1 rounded-xl border border-white/40"
                  />
                )}

                <span className="relative leading-none">{letter}</span>

                {statusLabel && (
                  <span className="sr-only">
                    {letter} - {statusLabel}
                  </span>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      ))}

      <motion.div
        variants={rowMotion}
        className="grid grid-cols-2 gap-2.5 pt-1"
      >
        <motion.button
          type="button"
          disabled={disabled}
          onClick={onEnter}
          whileTap={disabled ? undefined : { scale: 0.94, y: 2 }}
          className="group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-emerald-500 px-4 text-base font-black text-white shadow-lg shadow-emerald-500/15 transition hover:bg-emerald-400 active:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="pointer-events-none absolute inset-0 translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition duration-700 group-hover:translate-x-[-120%]" />
          <CornerDownLeft className="relative h-5 w-5" />
          <span className="relative">إدخال</span>
        </motion.button>

        <motion.button
          type="button"
          disabled={disabled}
          onClick={onBackspace}
          whileTap={disabled ? undefined : { scale: 0.94, y: 2 }}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-red-300/20 bg-white/10 px-4 text-base font-black text-white shadow-lg shadow-slate-950/20 transition hover:bg-white/15 active:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Delete className="h-5 w-5 text-red-200" />
          <span>حذف</span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}