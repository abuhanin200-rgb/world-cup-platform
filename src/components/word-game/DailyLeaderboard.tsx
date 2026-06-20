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

export default function DailyLeaderboard({ items }: DailyLeaderboardProps) {
  const topThree = items.slice(0, 3);

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
      <div className="mb-5 text-right">
        <h2 className="text-[26px] font-black leading-tight text-white md:text-[30px]">
          🏆 ترتيب اليوم
        </h2>

        <p className="mt-1 text-[14px] font-semibold leading-6 text-slate-300">
          حسب الفوز ثم الأقل محاولات، ثم الأسرع
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-sm font-bold text-slate-300">
          لا يوجد نتائج مكتملة حتى الآن.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {topThree.map((item) => (
              <div
                key={item.userId}
                className="rounded-[18px] border border-amber-400/25 bg-slate-950/25 px-2 py-3 text-center"
              >
                <div className="text-[22px] leading-none">
                  {getRankLabel(item.rank)}
                </div>

                <div className="mt-2 truncate text-[15px] font-bold text-white">
                  {item.userName}
                </div>

                <div
                  dir="ltr"
                  className="mt-1 text-[13px] font-medium tracking-tight text-slate-300 tabular-nums"
                >
                  {formatDurationMs(item.durationMs)} • {item.attemptsUsed}/6
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-[20px] border border-white/10">
            <div className="grid grid-cols-[42px_1fr_68px_68px_68px] bg-white/10">
              <div className="py-3 text-center text-[13px] font-black text-white">
                #
              </div>

              <div className="py-3 text-right text-[13px] font-black text-white">
                الاسم
              </div>

              <div className="py-3 text-center text-[13px] font-black text-white">
                الحالة
              </div>

              <div className="py-3 text-center text-[13px] font-black text-white">
                محاولات
              </div>

              <div className="py-3 text-center text-[13px] font-black text-white">
                الوقت
              </div>
            </div>

            {items.map((item) => (
              <div
                key={item.userId}
                className="grid grid-cols-[42px_1fr_68px_68px_68px] items-center border-t border-white/10"
              >
                <div className="py-3 text-center text-[13px] font-bold text-white md:text-[14px]">
                  {getRankLabel(item.rank)}
                </div>

                <div className="truncate px-2 py-3 text-right text-[13px] font-semibold text-white md:text-[14px]">
                  {item.userName}
                </div>

                <div className="flex justify-center py-3">
                  <span
                    className={
                      item.won
                        ? "rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-200"
                        : "rounded-full border border-red-400/20 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-200"
                    }
                  >
                    {item.won ? "فاز" : "خسر"}
                  </span>
                </div>

                <div className="py-3 text-center text-[12px] font-medium tracking-tight text-slate-200 tabular-nums md:text-[13px]">
                  {item.attemptsUsed}/6
                </div>

                <div
                  dir="ltr"
                  className="py-3 text-center text-[12px] font-medium tracking-tight text-slate-200 tabular-nums md:text-[13px]"
                >
                  {formatDurationMs(item.durationMs)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}