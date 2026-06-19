"use client";

import { useEffect, useState } from "react";
import { getTodayLeaderboard } from "@/lib/wordGameService";
import type { WordGameLeaderboardItem } from "@/types/wordGame";

type DailyLeaderboardProps = {
  refreshKey?: number;
};

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

function getMedal(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
}

export default function DailyLeaderboard({
  refreshKey = 0,
}: DailyLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<WordGameLeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadLeaderboard() {
      try {
        setLoading(true);
        const data = await getTodayLeaderboard(20);

        if (isMounted) {
          setLeaderboard(data);
        }
      } catch (error) {
        console.error("Error loading word game leaderboard:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadLeaderboard();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const topThree = leaderboard.filter((item) => item.won).slice(0, 3);
  const winners = leaderboard.filter((item) => item.won);
  const fastestWinner =
    winners.length > 0
      ? [...winners].sort((a, b) => a.durationSeconds - b.durationSeconds)[0]
      : null;

  return (
    <section
      className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5"
      dir="rtl"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">
            🏆 ترتيب اليوم
          </h2>
          <p className="text-sm font-semibold text-slate-300">
            حسب الفوز، ثم الأقل محاولات، ثم الأسرع
          </p>
        </div>

        {fastestWinner && (
          <div className="hidden rounded-2xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-center sm:block">
            <p className="text-xs font-bold text-amber-200">
              ⚡ أسرع حل
            </p>
            <p className="text-sm font-black text-white">
              {fastestWinner.fullName}
            </p>
          </div>
        )}
      </div>

      {topThree.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          {topThree.map((item) => (
            <div
              key={`${item.date}_${item.userId}`}
              className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-center"
            >
              <div className="mb-1 text-2xl">{getMedal(item.rank)}</div>
              <p className="truncate text-sm font-black text-white">
                {item.fullName}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-300">
                {item.attempts}/6 · {formatDuration(item.durationSeconds)}
              </p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center font-bold text-slate-300">
          جاري تحميل الترتيب...
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <p className="font-black text-white">
            لا يوجد نتائج اليوم حتى الآن
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-300">
            كن أول واحد يحل كلمة اليوم 🔥
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-[45px_1fr_65px_70px_65px] bg-white/10 text-[11px] font-black text-slate-300 md:grid-cols-[55px_1fr_75px_80px_75px] md:text-xs">
            <div className="p-2 text-center md:p-3">#</div>
            <div className="p-2 md:p-3">الاسم</div>
            <div className="p-2 text-center md:p-3">الحالة</div>
            <div className="p-2 text-center md:p-3">محاولات</div>
            <div className="p-2 text-center md:p-3">الوقت</div>
          </div>

          {leaderboard.map((item) => (
            <div
              key={`${item.date}_${item.userId}`}
              className="grid grid-cols-[45px_1fr_65px_70px_65px] items-center border-t border-white/10 text-xs md:grid-cols-[55px_1fr_75px_80px_75px] md:text-sm"
            >
              <div className="p-2 text-center font-black text-slate-200 md:p-3">
                {getMedal(item.rank)}
              </div>

              <div className="truncate p-2 font-black text-white md:p-3">
                {item.fullName}
              </div>

              <div className="p-2 text-center md:p-3">
                <span
                  className={[
                    "inline-flex items-center justify-center rounded-full px-2 py-1 text-[10px] font-black md:text-xs",
                    item.won
                      ? "bg-emerald-400/10 text-emerald-200 border border-emerald-300/20"
                      : "bg-red-400/10 text-red-200 border border-red-300/20",
                  ].join(" ")}
                >
                  {item.won ? "فاز" : "خسر"}
                </span>
              </div>

              <div className="p-2 text-center font-bold text-slate-200 md:p-3">
                {item.attempts}/6
              </div>

              <div className="p-2 text-center font-bold text-slate-200 md:p-3">
                {formatDuration(item.durationSeconds)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}