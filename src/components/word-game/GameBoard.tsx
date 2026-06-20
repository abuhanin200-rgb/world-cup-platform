import type { WordGameGuess } from "@/types/wordGame";
import {
  WORD_GAME_MAX_ATTEMPTS,
  WORD_GAME_WORD_LENGTH,
} from "@/lib/wordGameLogic";

type GameBoardProps = {
  guesses: WordGameGuess[];
  currentGuess: string;
};

export default function GameBoard({ guesses, currentGuess }: GameBoardProps) {
  const rows = Array.from({ length: WORD_GAME_MAX_ATTEMPTS });

  return (
    <div className="mx-auto grid w-full max-w-xs gap-2">
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
          <div key={rowIndex} className="grid grid-cols-5 gap-2" dir="rtl">
            {letters.map((item, letterIndex) => (
              <div
                key={`${rowIndex}-${letterIndex}`}
                className={[
                  "flex aspect-square items-center justify-center rounded-2xl border text-2xl font-black shadow-lg",
                  item.status === "correct"
                    ? "border-emerald-400 bg-emerald-500 text-white"
                    : "",
                  item.status === "present"
                    ? "border-amber-300 bg-amber-400 text-slate-950"
                    : "",
                  item.status === "absent"
                    ? "border-slate-500 bg-slate-600 text-white"
                    : "",
                  item.status === "empty"
                    ? "border-white/10 bg-slate-950/60 text-white"
                    : "",
                ].join(" ")}
              >
                {item.letter}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}