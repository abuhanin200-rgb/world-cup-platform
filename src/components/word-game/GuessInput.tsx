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
    <div className="mx-auto w-full max-w-xs" dir="rtl">
      <input
        value={value}
        disabled={disabled}
        maxLength={WORD_GAME_WORD_LENGTH}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onSubmit();
          }
        }}
        placeholder="اكتب كلمة"
        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-center text-xl font-black text-white outline-none placeholder:text-slate-500 focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}