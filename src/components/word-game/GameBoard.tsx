import type { LetterResult } from "@/lib/wordGameLogic";

type GameBoardProps = {
  guessesResults: LetterResult[][];
  maxAttempts?: number;
  wordLength?: number;
};

function getCellClass(status?: LetterResult["status"]) {
  if (status === "correct") {
    return "border-emerald-400 bg-emerald-500 text-white shadow-emerald-950/30";
  }

  if (status === "present") {
    return "border-amber-300 bg-amber-400 text-slate-950 shadow-amber-950/30";
  }

  if (status === "absent") {
    return "border-slate-500 bg-slate-600 text-white shadow-slate-950/30";
  }

  return "border-white/15 bg-white/10 text-white";
}

export default function GameBoard({
  guessesResults,
  maxAttempts = 6,
  wordLength = 5,
}: GameBoardProps) {
  const rows = Array.from({ length: maxAttempts });

  return (
    <div className="mx-auto w-full max-w-sm space-y-2" dir="rtl">
      {rows.map((_, rowIndex) => {
        const row = guessesResults[rowIndex];

        return (
          <div key={rowIndex} className="grid grid-cols-5 gap-2">
            {Array.from({ length: wordLength }).map((_, cellIndex) => {
              const cell = row?.[cellIndex];

              return (
                <div
                  key={cellIndex}
                  className={[
                    "flex aspect-square items-center justify-center rounded-xl border-2",
                    "text-2xl font-black shadow-lg transition-all duration-300",
                    "md:text-3xl",
                    getCellClass(cell?.status),
                  ].join(" ")}
                >
                  {cell?.letter ?? ""}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}