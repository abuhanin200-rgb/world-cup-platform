"use client";

type GuessInputProps = {
  value: string;
};

export default function GuessInput({ value }: GuessInputProps) {
  return (
    <div className="mx-auto mt-3 w-full max-w-[310px] sm:max-w-sm" dir="rtl">
      <div className="rounded-2xl border border-white/10 bg-white/10 p-2.5 shadow-lg sm:p-3">
        <label className="mb-1.5 block text-sm font-bold text-slate-200">
          التخمين الحالي
        </label>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 sm:py-3">
          <span className="text-lg font-black text-white sm:text-xl">
            {value || "—"}
          </span>

          <span className="text-xs font-bold text-slate-400 sm:text-sm">
            {[...value].length}/5
          </span>
        </div>

        <p className="mt-1.5 text-[11px] font-semibold text-slate-400 sm:text-xs">
          استخدم الكيبورد بالأسفل لاختيار الحروف
        </p>
      </div>
    </div>
  );
}