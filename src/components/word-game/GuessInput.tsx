"use client";

type GuessInputProps = {
  value: string;
};

export default function GuessInput({ value }: GuessInputProps) {
  return (
    <div className="mx-auto mt-5 w-full max-w-sm" dir="rtl">
      <div className="rounded-2xl border border-white/10 bg-white/10 p-3 shadow-2xl">
        <label className="mb-2 block text-sm font-bold text-slate-200">
          التخمين الحالي
        </label>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-3">
          <span className="text-xl font-black text-white">
            {value || "—"}
          </span>

          <span className="text-sm font-bold text-slate-400">
            {[...value].length}/5
          </span>
        </div>

        <p className="mt-2 text-xs font-semibold text-slate-400">
          استخدم الكيبورد بالأسفل لاختيار الحروف
        </p>
      </div>
    </div>
  );
}