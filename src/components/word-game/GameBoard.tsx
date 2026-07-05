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
      staggerChildren: 0.045,
    },
  },
};

const rowMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
    scale: 0.98,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.28,
      ease: "easeOut",
      staggerChildren: 0.035,
    },
  },
};

function getTileClass(status: WordGameGuess["letters"][number]["status"]) {
  if (status === "correct") {
    return "border-emerald-400 bg-emerald-500 text-white shadow-emerald-500/20";
  }

  if (status === "present") {
    return "border-amber-300 bg-amber-400 text-slate-950 shadow-amber-400/20";
  }

  if (status === "absent") {
    return "border-slate-500 bg-slate-600 text-white shadow-slate-700/20";
  }

  return "border-white/10 bg-slate-950/60 text-white shadow-slate-950/25";
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
                          rotateX: -90,
                          scale: 0.94,
                          opacity: 0.6,
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
                            scale: [1, 1.13, 1],
                            y: [0, -2, 0],
                          }
                        : {
                            scale: 1,
                            y: 0,
                          }
                  }
                  transition={
                    isSavedTile
                      ? {
                          delay: letterIndex * 0.12,
                          duration: 0.42,
                          ease: [0.22, 1, 0.36, 1],
                        }
                      : {
                          duration: 0.18,
                          ease: "easeOut",
                        }
                  }
                  className={[
                    "relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border text-2xl font-black shadow-lg transition-colors duration-300 will-change-transform [transform-style:preserve-3d]",
                    getTileClass(item.status),
                    isCurrentRow && hasLetter
                      ? "border-amber-300/45 bg-slate-950/80 shadow-amber-400/10"
                      : "",
                  ].join(" ")}
                >
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-transparent" />

                  {item.status === "correct" && (
                    <motion.span
                      aria-hidden="true"
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: [0, 0.7, 0], scale: [0.7, 1.35, 1.8] }}
                      transition={{
                        delay: letterIndex * 0.12 + 0.15,
                        duration: 0.6,
                        ease: "easeOut",
                      }}
                      className="pointer-events-none absolute inset-1 rounded-2xl border border-white/40"
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