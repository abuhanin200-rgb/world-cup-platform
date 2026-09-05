import { memo, type ReactNode } from "react";
import { BarChart3, Flame, Target, Trophy } from "lucide-react";
import type { WordGameUserStats } from "@/types/wordGame";

type WordGameStatsProps = { stats: WordGameUserStats | null };

function StatCard({ label, value, suffix = "", icon, accent }: { label: string; value: number; suffix?: string; icon: ReactNode; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-[18px] border border-white/[0.08] bg-black/15 p-3 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,.055),transparent_50%)]" />
      <div className="relative">
        <div className={`mx-auto mb-2 grid h-9 w-9 place-items-center rounded-[12px] border border-white/[0.08] bg-white/[0.035] ${accent}`}>{icon}</div>
        <p className={`text-[clamp(1.25rem,6vw,1.65rem)] font-black tabular-nums ${accent}`}>{value}{suffix}</p>
        <p className="mt-1 text-[10px] font-bold text-white/38">{label}</p>
      </div>
    </div>
  );
}

function WordGameStats({ stats }: WordGameStatsProps) {
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-violet-300/12 bg-[#111537]/90 p-4 shadow-[0_16px_44px_rgba(4,6,27,.22)] md:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_12%,rgba(139,92,246,.13),transparent_28%),radial-gradient(circle_at_12%_88%,rgba(34,211,238,.09),transparent_28%)]" />
      <div className="relative mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black text-violet-200">بصمتك في اللعبة</p>
          <h2 className="mt-1 text-xl font-black text-white">إحصائياتك</h2>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-[14px] border border-violet-300/15 bg-violet-400/10 text-violet-100">
          <BarChart3 className="h-5 w-5" />
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-2">
        <StatCard label="مرات اللعب" value={stats?.gamesPlayed ?? 0} icon={<Target className="h-4 w-4" />} accent="text-violet-200" />
        <StatCard label="مرات الفوز" value={stats?.gamesWon ?? 0} icon={<Trophy className="h-4 w-4" />} accent="text-cyan-200" />
        <StatCard label="نسبة الفوز" value={stats?.winRate ?? 0} suffix="%" icon={<BarChart3 className="h-4 w-4" />} accent="text-fuchsia-200" />
        <StatCard label="أفضل سلسلة فوز" value={stats?.bestWinStreak ?? 0} icon={<Flame className="h-4 w-4" />} accent="text-amber-200" />
      </div>
    </section>
  );
}

export default memo(WordGameStats);
