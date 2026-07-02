import type { WordGameLeaderboardItem } from "@/types/wordGame";
import { formatDurationMs } from "@/lib/wordGameLogic";

type DailyLeaderboardProps = {
  items: WordGameLeaderboardItem[];
};

function getRankLabel(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
}

function getStatusLabel(won: boolean) {
  return won ? "فاز" : "خسر";
}

export default function DailyLeaderboard({ items }: DailyLeaderboardProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
      <div className="mb-5 text-center">
        <h2 className="text-[25px] font-black leading-tight text-white md:text-[30px]">
          🏆 ترتيب تحدي خمن كلمة اليوم
        </h2>

        <p className="mt-2 text-[13px] font-semibold leading-6 text-slate-300 md:text-[14px]">
          حسب الفوز ثم الأسرع وقتًا، ثم الأقل محاولات.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-sm font-bold text-slate-300">
          لا يوجد نتائج مكتملة حتى الآن.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.userId}
              className="rounded-[22px] border border-white/10 bg-slate-950/45 p-4 shadow-xl"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-lg font-black text-white">
                  {getRankLabel(item.rank)}
                </div>

                <div className="min-w-0 flex-1 text-right">
                  <div className="text-[12px] font-bold text-slate-400">
                    العضو
                  </div>
                  <div className="mt-1 whitespace-normal break-words text-[18px] font-black leading-6 text-white">
                    {item.userName}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-center">
                  <div className="text-[11px] font-bold text-amber-100">
                    النتيجة
                  </div>
                  <div className="mt-1 text-[18px] font-black text-amber-300">
                    {getStatusLabel(item.won)}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                  <div className="text-[11px] font-bold text-slate-400">
                    الوقت
                  </div>
                  <div
                    dir="ltr"
                    className="mt-1 text-[18px] font-black text-white tabular-nums"
                  >
                    {formatDurationMs(item.durationMs)}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                  <div className="text-[11px] font-bold text-slate-400">
                    المحاولات
                  </div>
                  <div className="mt-1 text-[18px] font-black text-white tabular-nums">
                    {item.attemptsUsed}/6
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                  <div className="text-[11px] font-bold text-slate-400">
                    التصنيف
                  </div>
                  <div className="mt-1 text-[13px] font-black leading-5 text-emerald-200">
                    {(item as any).categoryLabel ?? "عامّة"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}