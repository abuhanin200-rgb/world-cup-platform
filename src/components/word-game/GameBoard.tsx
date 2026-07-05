import { motion, type Variants } from "framer-motion";
import type { WordGameGuess } from "@/types/wordGame";
import {
  WORD_GAME_MAX_ATTEMPTS,
  WORD_GAME_WORD_LENGTH,
} from "@/lib/wordGameLogic";

type GameBoardProps = {
  guesses: WordGameGuess[];
  currentGuess: string;
};

const boardMotion: Variants = {
  hidden: {
    opacity: 0,
  },
  show: {
    opacity: 1,
    transition: {
      duration: 0.18,
      ease: "easeOut",
      staggerChildren: 0.025,
    },
  },
};

const rowMotion: Variants = {
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
      duration: 0.22,
      ease: "easeOut",
      staggerChildren: 0.02,
    },
  },
};

function getTileClass(status: WordGameGuess["letters"][number]["status"]) {
  if (status === "correct") {
    return "border-emerald-400 bg-emerald-500 text-white shadow-emerald-500/15";
  }

  if (status === "present") {
    return "border-amber-300 bg-amber-400 text-slate-950 shadow-amber-400/15";
  }

  if (status === "absent") {
    return "border-slate-500 bg-slate-600 text-white shadow-slate-700/15";
  }

  return "border-white/10 bg-slate-950/60 text-white shadow-slate-950/20";
}

export default function GameBoard({ guesses, currentGuess }: GameBoardProps) {
  const rows = Array.from({ length: WORD_GAME_MAX_ATTEMPTS });

  return (
    <motion.div
      variants={boardMotion}
      initial="hidden"
      animate="show"
      className="mx-auto grid w-full max-w-xs gap-2"
    >
      {rows.map((_, rowIndex) => {
        const savedGuess = guesses[rowIndex];
        const isCurrentRow = rowIndex === guesses.length;

        const letters = savedGuess
          ? savedGuess.letters
          : Array.from({ length: WORD_GAME_WORD_LENGTH }).map((__, index) => ({
              letter: isCurrentRow ? currentGuess[index] ?? "" : "",
              status: "empty" as const,
            }));

        return (
          <motion.div
            key={rowIndex}
            variants={rowMotion}
            className="grid grid-cols-5 gap-2"
            dir="rtl"
          >
            {letters.map((item, letterIndex) => {
              const hasLetter = Boolean(item.letter);
              const isSavedTile = Boolean(savedGuess);

              return (
                <motion.div
                  key={`${rowIndex}-${letterIndex}-${item.letter}-${item.status}`}
                  initial={
                    isSavedTile
                      ? {
                          rotateX: -72,
                          scale: 0.98,
                          opacity: 0.75,
                        }
                      : false
                  }
                  animate={
                    isSavedTile
                      ? {
                          rotateX: 0,
                          scale: 1,
                          opacity: 1,
                        }
                      : hasLetter
                        ? {
                            scale: [1, 1.06, 1],
                          }
                        : {
                            scale: 1,
                          }
                  }
                  transition={
                    isSavedTile
                      ? {
                          delay: letterIndex * 0.075,
                          duration: 0.28,
                          ease: "easeOut",
                        }
                      : {
                          duration: 0.14,
                          ease: "easeOut",
                        }
                  }
                  className={[
                    "relative flex aspect-square transform-gpu items-center justify-center overflow-hidden rounded-2xl border text-[24px] font-black shadow-md transition-colors duration-200 [transform-style:preserve-3d]",
                    getTileClass(item.status),
                    isCurrentRow && hasLetter
                      ? "border-amber-300/45 bg-slate-950/80 shadow-amber-400/10"
                      : "",
                  ].join(" ")}
                >
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-transparent" />

                  {item.status === "correct" && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-1 rounded-2xl border border-white/25"
                    />
                  )}

                  <span className="relative">{item.letter}</span>
                </motion.div>
              );
            })}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
