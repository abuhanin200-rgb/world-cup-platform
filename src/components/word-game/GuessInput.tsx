import { memo } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import { WORD_GAME_WORD_LENGTH } from "@/lib/wordGameLogic";

type GuessInputProps = {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

function GuessInput({ value, disabled, onChange, onSubmit }: GuessInputProps) {
  const lettersCount = value.length;
  const progressPercent = Math.min(100, Math.round((lettersCount / WORD_GAME_WORD_LENGTH) * 100));

  return (
    <div className="mx-auto w-full max-w-[360px]" dir="rtl">
      <div className="relative overflow-hidden rounded-[18px] border border-violet-300/15 bg-[#0d1030]/90 shadow-[0_12px_28px_rgba(5,7,28,.28)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(139,92,246,.12),transparent_42%,rgba(34,211,238,.08))]" />
        <div className="relative flex min-w-0 items-center gap-2 px-2.5 py-2 sm:px-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] border border-violet-300/15 bg-violet-400/10 text-violet-100">
            <Sparkles className="h-4 w-4" />
          </div>

          <input
            value={value}
            readOnly
            disabled={disabled}
            inputMode="none"
            maxLength={WORD_GAME_WORD_LENGTH}
            onFocus={(event) => event.currentTarget.blur()}
            onChange={(event) => onChange(event.target.value)}
            placeholder="كوّن تخمينك"
            className="min-w-0 flex-1 select-none bg-transparent px-1 py-1.5 text-center text-[clamp(1rem,4.8vw,1.2rem)] font-black tracking-[0.20em] text-white outline-none placeholder:tracking-normal placeholder:text-white/24 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <motion.button
            type="button"
            disabled={disabled}
            onClick={onSubmit}
            whileTap={disabled ? undefined : { scale: 0.93 }}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-[0_10px_24px_rgba(99,102,241,.22)] transition disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="إرسال الكلمة"
          >
            <Send className="h-4 w-4" />
          </motion.button>
        </div>

        <div className="relative h-1 bg-white/[0.045]">
          <motion.div
            className="h-full bg-gradient-to-l from-cyan-300 via-violet-400 to-fuchsia-400"
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="mt-2 flex min-h-[18px] items-center justify-center gap-1.5 text-[10px] font-bold text-white/34">
        <span dir="ltr">{lettersCount}/{WORD_GAME_WORD_LENGTH}</span>
        <span>حروف</span>
        {!disabled && lettersCount > 0 && lettersCount < WORD_GAME_WORD_LENGTH && (
          <span className="mr-1 text-cyan-200/85">أكمل الكلمة</span>
        )}
      </div>
    </div>
  );
}

export default memo(GuessInput);
