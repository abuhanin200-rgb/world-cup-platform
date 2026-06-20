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
  if (status === "correct") {
    return "border-emerald-400 bg-emerald-500 text-white";
  }

  if (status === "present") {
    return "border-amber-300 bg-amber-400 text-slate-950";
  }

  if (status === "absent") {
    return "border-slate-700 bg-slate-800/60 text-slate-500 opacity-45";
  }

  return "border-white/10 bg-slate-950/70 text-white hover:border-emerald-400/40 hover:bg-white/10";
}

export default function WordKeyboard({
  disabled,
  letterStatuses,
  onLetterClick,
  onBackspace,
  onEnter,
}: WordKeyboardProps) {
  return (
    <div className="mx-auto w-full max-w-[360px] space-y-2" dir="rtl">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-11 gap-1">
          {row.map((letter) => {
            const status = letterStatuses[letter];
            const isAbsent = status === "absent";

            return (
              <button
                key={letter}
                type="button"
                disabled={disabled || isAbsent}
                onClick={() => {
                  if (!isAbsent) onLetterClick(letter);
                }}
                className={[
                  "flex h-8 items-center justify-center rounded-lg border text-sm font-black shadow-sm transition disabled:cursor-not-allowed md:h-9 md:text-base",
                  getKeyClass(status),
                ].join(" ")}
              >
                {letter}
              </button>
            );
          })}
        </div>
      ))}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          disabled={disabled}
          onClick={onEnter}
          className="h-11 rounded-2xl bg-emerald-500 px-4 text-sm font-black text-white shadow-lg transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          إدخال
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={onBackspace}
          className="h-11 rounded-2xl border border-red-300/20 bg-white/10 px-4 text-sm font-black text-white shadow-lg transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          حذف
        </button>
      </div>
    </div>
  );
}