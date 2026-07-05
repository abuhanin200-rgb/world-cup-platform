import { motion } from "framer-motion";
import { Keyboard, Send } from "lucide-react";
import { WORD_GAME_WORD_LENGTH } from "@/lib/wordGameLogic";

type GuessInputProps = {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export default function GuessInput({
  value,
  disabled,
  onChange,
  onSubmit,
}: GuessInputProps) {
  const lettersCount = value.length;
  const progressPercent = Math.min(
    100,
    Math.round((lettersCount / WORD_GAME_WORD_LENGTH) * 100)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className="mx-auto w-full max-w-[360px]"
      dir="rtl"
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-lg shadow-slate-950/25">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-emerald-300/10" />

        <div className="relative flex items-center gap-2 px-3 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300">
            <Keyboard className="h-4 w-4" />
          </div>

          <motion.input
            value={value}
            readOnly
            disabled={disabled}
            inputMode="none"
            maxLength={WORD_GAME_WORD_LENGTH}
            onFocus={(event) => event.currentTarget.blur()}
            onChange={(event) => onChange(event.target.value)}
            placeholder="اكتب كلمة"
            animate={
              value
                ? {
                    scale: [1, 1.015, 1],
                  }
                : {
                    scale: 1,
                  }
            }
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="min-w-0 flex-1 select-none bg-transparent px-1 py-2 text-center text-xl font-black tracking-[0.28em] text-white outline-none placeholder:tracking-normal placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <motion.button
            type="button"
            disabled={disabled}
            onClick={onSubmit}
            whileTap={{ scale: 0.92 }}
            className="group relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/15 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="إرسال الكلمة"
          >
            <span className="pointer-events-none absolute inset-0 translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent transition duration-700 group-hover:translate-x-[-120%]" />
            <Send className="relative h-4 w-4" />
          </motion.button>
        </div>

        <div className="relative h-1 overflow-hidden bg-white/5">
          <motion.div
            className="h-full rounded-full bg-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400">
        <span>{lettersCount}</span>
        <span>/</span>
        <span>{WORD_GAME_WORD_LENGTH}</span>
        <span>حروف</span>

        {!disabled && lettersCount > 0 && lettersCount < WORD_GAME_WORD_LENGTH && (
          <motion.span
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            className="mr-1 text-emerald-300"
          >
            أكمل الكلمة
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}