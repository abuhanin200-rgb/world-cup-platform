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

function getStatusClass(won: boolean) {
  return won
    ? "border-amber-300/35 bg-gradient-to-br from-emerald-500/20 to-amber-400/15 text-amber-200"
    : "border-red-400/45 bg-red-500/20 text-red-200";
}

export default function DailyLeaderboard({ items }: DailyLeaderboardProps) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/10 p-3 shadow-2xl md:p-4">
      <div className="mb-4 text-center">
        <h2 className="text-[21px] font-black leading-tight text-white md:text-[25px]">
          🏆 ترتيب تحدي خمن كلمة اليوم
        </h2>

        <p className="mt-1.5 text-[12px] font-semibold leading-5 text-slate-300 md:text-[13px]">
          حسب الفوز ثم الأسرع وقتًا، ثم الأقل محاولات.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm font-bold text-slate-300">
          لا يوجد نتائج مكتملة حتى الآن.
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div
              key={item.userId}
              className="rounded-[18px] border border-white/10 bg-slate-950/45 p-3 shadow-lg"
            >
              <div className="mb-3 flex items-start justify-between gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-base font-black text-white">
                  {getRankLabel(item.rank)}
                </div>

                <div className="min-w-0 flex-1 text-right">
                  <div className="text-[10px] font-bold text-slate-400">
                    العضو
                  </div>
                  <div className="mt-0.5 whitespace-normal break-words text-[15px] font-black leading-5 text-white md:text-[16px]">
                    {item.userName}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                <div
                  className={`rounded-xl border p-2 text-center ${getStatusClass(
                    item.won
                  )}`}
                >
                  <div className="text-[9px] font-bold opacity-80">
                    النتيجة
                  </div>
                  <div className="mt-0.5 text-[14px] font-black">
                    {getStatusLabel(item.won)}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-center">
                  <div className="text-[9px] font-bold text-slate-400">
                    الوقت
                  </div>
                  <div
                    dir="ltr"
                    className="mt-0.5 text-[13px] font-black text-white tabular-nums"
                  >
                    {formatDurationMs(item.durationMs)}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-center">
                  <div className="text-[9px] font-bold text-slate-400">
                    المحاولات
                  </div>
                  <div className="mt-0.5 text-[13px] font-black text-white tabular-nums">
                    {item.attemptsUsed}/6
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-300/15 bg-emerald-400/10 p-2 text-center">
                  <div className="text-[9px] font-bold text-slate-400">
                    التصنيف
                  </div>
                  <div className="mt-0.5 text-[11px] font-black leading-4 text-emerald-200">
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