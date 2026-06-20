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
  return (
    <div className="mx-auto flex w-full max-w-[360px] gap-2" dir="rtl">
      <input
        value={value}
        readOnly
        disabled={disabled}
        inputMode="none"
        maxLength={WORD_GAME_WORD_LENGTH}
        onFocus={(event) => event.currentTarget.blur()}
        onChange={(event) => onChange(event.target.value)}
        placeholder="اكتب كلمة"
        className="min-w-0 flex-1 select-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-center text-xl font-black text-white outline-none placeholder:text-slate-500 focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      />

      <button
        type="button"
        disabled={disabled}
        onClick={onSubmit}
        className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-lg transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        إدخال
      </button>
    </div>
  );
}