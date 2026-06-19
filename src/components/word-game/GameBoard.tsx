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
    <div
      className="mx-auto w-full max-w-[310px] space-y-1.5 sm:max-w-sm sm:space-y-2"
      dir="rtl"
    >
      {rows.map((_, rowIndex) => {
        const row = guessesResults[rowIndex];

        return (
          <div key={rowIndex} className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {Array.from({ length: wordLength }).map((_, cellIndex) => {
              const cell = row?.[cellIndex];

              return (
                <div
                  key={cellIndex}
                  className={[
                    "flex aspect-square items-center justify-center rounded-xl border-2",
                    "text-xl font-black shadow-md transition-all duration-300",
                    "sm:text-2xl md:text-3xl",
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