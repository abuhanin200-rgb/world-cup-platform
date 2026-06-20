import type { WordGameUserStats } from "@/types/wordGame";

type WordGameStatsProps = {
  stats: WordGameUserStats | null;
};

export default function WordGameStats({ stats }: WordGameStatsProps) {
  const gamesPlayed = stats?.gamesPlayed ?? 0;
  const gamesWon = stats?.gamesWon ?? 0;
  const winRate = stats?.winRate ?? 0;
  const bestWinStreak = stats?.bestWinStreak ?? 0;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
      <div className="mb-4 text-center">
        <h2 className="text-xl font-black text-white md:text-2xl">
          📊 إحصائياتك
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-center shadow-lg">
          <p className="text-2xl font-black text-amber-300">{gamesPlayed}</p>
          <p className="mt-1 text-[11px] font-bold text-slate-400">
            مرات اللعب
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-center shadow-lg">
          <p className="text-2xl font-black text-emerald-300">{gamesWon}</p>
          <p className="mt-1 text-[11px] font-bold text-slate-400">
            مرات الفوز
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-center shadow-lg">
          <p className="text-2xl font-black text-amber-300">{winRate}%</p>
          <p className="mt-1 text-[11px] font-bold text-slate-400">
            نسبة الفوز
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-center shadow-lg">
          <p className="text-2xl font-black text-emerald-300">
            {bestWinStreak}
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-400">
            أفضل سلسلة فوز
          </p>
        </div>
      </div>
    </div>
  );
}