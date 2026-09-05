"use client";

import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { WordGameGuess } from "@/types/wordGame";
import {
  WORD_GAME_MAX_ATTEMPTS,
  WORD_GAME_WORD_LENGTH,
} from "@/lib/wordGameLogic";

type GameBoardProps = {
  guesses: WordGameGuess[];
  currentGuess: string;
};

function getTileClass(status: WordGameGuess["letters"][number]["status"]) {
  if (status === "correct") {
    return "border-emerald-300/80 bg-emerald-500 text-white shadow-[0_10px_26px_rgba(16,185,129,.18)]";
  }
  if (status === "present") {
    return "border-amber-200/80 bg-amber-400 text-[#17142f] shadow-[0_10px_26px_rgba(251,191,36,.17)]";
  }
  if (status === "absent") {
    return "border-slate-500/70 bg-slate-600/95 text-white shadow-[0_8px_22px_rgba(15,23,42,.18)]";
  }
  return "border-violet-300/15 bg-[#171b43]/92 text-white shadow-[0_8px_24px_rgba(6,9,31,.28)]";
}

function GameBoard({ guesses, currentGuess }: GameBoardProps) {
  const reduceMotion = useReducedMotion();
  const rows = Array.from({ length: WORD_GAME_MAX_ATTEMPTS });

  return (
    <div className="mx-auto grid w-[min(100%,318px)] gap-1.5 sm:gap-2" aria-label="لوحة محاولات خمن كلمة اليوم">
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
          <div key={rowIndex} className="grid min-w-0 grid-cols-5 gap-1.5 sm:gap-2" dir="rtl">
            {letters.map((item, letterIndex) => {
              const hasLetter = Boolean(item.letter);
              const isSavedTile = Boolean(savedGuess);
              return (
                <motion.div
                  key={`${rowIndex}-${letterIndex}-${item.letter}-${item.status}`}
                  initial={reduceMotion || !isSavedTile ? false : { rotateX: -70, opacity: 0.78 }}
                  animate={
                    reduceMotion
                      ? undefined
                      : isSavedTile
                        ? { rotateX: 0, opacity: 1 }
                        : hasLetter
                          ? { scale: [1, 1.055, 1] }
                          : { scale: 1 }
                  }
                  transition={{
                    delay: isSavedTile ? letterIndex * 0.055 : 0,
                    duration: isSavedTile ? 0.24 : 0.13,
                    ease: "easeOut",
                  }}
                  className={[
                    "relative flex aspect-square min-w-0 transform-gpu items-center justify-center overflow-hidden rounded-[14px] border text-[clamp(1.1rem,6.2vw,1.48rem)] font-black shadow-md [transform-style:preserve-3d] sm:rounded-[18px]",
                    getTileClass(item.status),
                    isCurrentRow && hasLetter
                      ? "border-cyan-300/55 bg-[#171b43] shadow-[0_0_0_1px_rgba(34,211,238,.10),0_10px_24px_rgba(34,211,238,.08)]"
                      : "",
                  ].join(" ")}
                >
                  <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,.14),transparent_45%)]" />
                  {item.status === "correct" && (
                    <span aria-hidden="true" className="pointer-events-none absolute inset-1 rounded-[11px] border border-white/22 sm:rounded-[15px]" />
                  )}
                  {isCurrentRow && hasLetter && (
                    <span aria-hidden="true" className="pointer-events-none absolute inset-x-3 bottom-1.5 h-px bg-cyan-200/55" />
                  )}
                  <span className="relative leading-none">{item.letter}</span>
                </motion.div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default memo(GameBoard);
