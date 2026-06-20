"use client";

import { useEffect, useMemo, useState } from "react";
import { getTodayWordGameLeaderboard } from "@/lib/wordGameService";
import type { WordGameLeaderboardItem } from "@/types/wordGame";
import { formatDurationMs } from "@/lib/wordGameLogic";

export default function AdminWordGamePanel() {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<WordGameLeaderboardItem[]>([]);

  async function loadData() {
    try {
      setLoading(true);
      const data = await getTodayWordGameLeaderboard();
      setLeaderboard(data);
    } catch (error) {
      console.error("Word game admin load error:", error);
      alert("تعذر تحميل بيانات لعبة خمن كلمة اليوم");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const winnersCount = useMemo(
    () => leaderboard.filter((item) => item.won).length,
    [leaderboard]
  );

  const fastestPlayer = useMemo(() => {
    return leaderboard.find((item) => item.won) ?? null;
  }, [leaderboard]);

  return (
    <section className="space-y-5" dir="rtl">
      <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black md:text-2xl">
              🎮 إدارة خمن كلمة اليوم
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              عرض إحصائيات وترتيب لعبة اليوم بدون إظهار الكلمات السرية.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            تحديث البيانات
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
            جاري تحميل بيانات اللعبة...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="text-sm text-slate-300">عدد المشاركين اليوم</div>
              <div className="mt-1 text-3xl font-black">
                {leaderboard.length}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="text-sm text-slate-300">عدد الفائزين اليوم</div>
              <div className="mt-1 text-3xl font-black">{winnersCount}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="text-sm text-slate-300">أسرع عضو اليوم</div>
              <div className="mt-1 truncate text-xl font-black">
                {fastestPlayer ? fastestPlayer.userName : "لا يوجد"}
              </div>
              <div className="mt-1 text-sm text-slate-300" dir="ltr">
                {fastestPlayer ? formatDurationMs(fastestPlayer.durationMs) : "-"}
              </div>
            </div>
          </div>
        )}
      </div>

      <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
        <h3 className="mb-4 text-lg font-black">🏆 ترتيب اليوم</h3>

        {leaderboard.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
            لا توجد نتائج مكتملة اليوم.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-[50px_1fr_80px_90px] bg-white/10 text-xs font-black text-slate-300">
              <div className="p-3 text-center">#</div>
              <div className="p-3">الاسم</div>
              <div className="p-3 text-center">الحالة</div>
              <div className="p-3 text-center">الوقت</div>
            </div>

            {leaderboard.map((item) => (
              <div
                key={item.userId}
                className="grid grid-cols-[50px_1fr_80px_90px] items-center border-t border-white/10 text-sm"
              >
                <div className="p-3 text-center font-black">{item.rank}</div>

                <div className="truncate p-3 font-black">{item.userName}</div>

                <div className="p-3 text-center">
                  {item.won ? `${item.attemptsUsed}/6` : "خسر"}
                </div>

                <div className="p-3 text-center font-bold" dir="ltr">
                  {formatDurationMs(item.durationMs)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}