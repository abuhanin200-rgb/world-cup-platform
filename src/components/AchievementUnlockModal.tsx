"use client";

type AchievementUnlockModalProps = {
  icon: string;
  title: string;
  description: string;
  onClose: () => void;
};

export default function AchievementUnlockModal({
  icon,
  title,
  description,
  onClose,
}: AchievementUnlockModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-amber-400/30 bg-slate-950 p-5 text-center shadow-2xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 text-5xl">
          {icon}
        </div>

        <div className="mt-4 text-sm font-black text-amber-300">
          🏅 وسام جديد
        </div>

        <h2 className="mt-2 text-2xl font-black text-white">{title}</h2>

        <p className="mt-3 text-sm leading-7 text-slate-300">
          {description}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300"
        >
          تم، يا بطل 🔥
        </button>
      </div>
    </div>
  );
}