import { memo } from "react";
import { Clock3, ListChecks, Medal, Trophy } from "lucide-react";
import type { WordGameLeaderboardItem } from "@/types/wordGame";
import { formatDurationMs } from "@/lib/wordGameLogic";

type DailyLeaderboardProps = { items: WordGameLeaderboardItem[] };

function getRankLabel(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
}

function getRankClass(rank: number) {
  if (rank === 1) return "border-amber-200/35 bg-amber-300/12 text-amber-100";
  if (rank === 2) return "border-slate-200/20 bg-white/[0.07] text-slate-100";
  if (rank === 3) return "border-orange-200/25 bg-orange-300/[0.08] text-orange-100";
  return "border-violet-300/15 bg-violet-400/[0.07] text-violet-100";
}

function DailyLeaderboard({ items }: DailyLeaderboardProps) {
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-violet-300/12 bg-[#111537]/90 p-3.5 shadow-[0_16px_44px_rgba(4,6,27,.22)] md:p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(34,211,238,.10),transparent_28%),radial-gradient(circle_at_10%_88%,rgba(236,72,153,.07),transparent_26%)]" />
      <div className="relative mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black text-cyan-200">سباق اليوم</p>
          <h2 className="mt-1 text-[clamp(1.1rem,5vw,1.45rem)] font-black text-white">ترتيب خمن كلمة اليوم</h2>
          <p className="mt-1 text-[10px] font-semibold leading-5 text-white/35">الفوز أولًا، ثم الأسرع، ثم الأقل محاولات.</p>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-cyan-300/15 bg-cyan-300/[0.07] text-cyan-100">
          <Trophy className="h-5 w-5" />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="relative rounded-[18px] border border-white/[0.07] bg-black/15 p-5 text-center text-[13px] font-bold text-white/45">
          <Medal className="mx-auto mb-2 h-6 w-6 text-violet-200/55" />
          لا توجد نتائج مكتملة حتى الآن.
        </div>
      ) : (
        <div className="relative space-y-2">
          {items.map((item) => (
            <div key={item.userId} className="grid min-w-0 grid-cols-[42px_1fr_auto] items-center gap-2 rounded-[17px] border border-white/[0.07] bg-black/15 p-2.5 sm:gap-3 sm:p-3">
              <div className={`grid h-9 w-9 place-items-center rounded-[12px] border text-xs font-black ${getRankClass(item.rank)}`}>{getRankLabel(item.rank)}</div>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-black text-white sm:text-sm">{item.userName}</div>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[9px] font-bold text-white/38">
                  <span className={item.won ? "text-emerald-200" : "text-rose-200"}>{item.won ? "فاز" : "خسر"}</span>
                  <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{formatDurationMs(item.durationMs)}</span>
                  <span className="inline-flex items-center gap-1"><ListChecks className="h-3 w-3" />{item.attemptsUsed}/6</span>
                </div>
              </div>
              <div className="max-w-[76px] truncate rounded-full border border-violet-300/12 bg-violet-400/[0.06] px-2 py-1 text-[9px] font-black text-violet-100/80">{item.categoryLabel ?? "عامّة"}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default memo(DailyLeaderboard);
