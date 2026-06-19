"use client";

import { useEffect, useState } from "react";
import {
  getTodayFastestWinner,
  getUserWinStreak,
} from "@/lib/wordGameService";
import type { WordGameLeaderboardItem } from "@/types/wordGame";

type WordGameStatsProps = {
  userId?: string | null;
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

export default function WordGameStats({
  userId,
  refreshKey = 0,
}: WordGameStatsProps) {
  const [streak, setStreak] = useState(0);
  const [fastestWinner, setFastestWinner] =
    useState<WordGameLeaderboardItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      try {
        setLoading(true);

        const [fastest, userStreak] = await Promise.all([
          getTodayFastestWinner(),
          userId ? getUserWinStreak(userId) : Promise.resolve(0),
        ]);

        if (!isMounted) return;

        setFastestWinner(fastest);
        setStreak(userStreak);
      } catch (error) {
        console.error("Error loading word game stats:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadStats();

    return () => {
      isMounted = false;
    };
  }, [userId, refreshKey]);

  return (
    <section
      className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3"
      dir="rtl"
    >
      <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center shadow-2xl">
        <p className="mb-1 text-2xl">🔥</p>
        <p className="text-sm font-bold text-slate-300">سلسلة الفوز</p>
        <p className="mt-1 text-2xl font-black text-white">
          {loading ? "..." : streak}
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-400">
          {streak === 1 ? "يوم واحد" : "أيام متتالية"}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center shadow-2xl">
        <p className="mb-1 text-2xl">⚡</p>
        <p className="text-sm font-bold text-slate-300">أسرع حل اليوم</p>
        <p className="mt-1 truncate text-lg font-black text-white">
          {loading
            ? "..."
            : fastestWinner
              ? fastestWinner.fullName
              : "لا يوجد"}
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-400">
          {fastestWinner
            ? formatDuration(fastestWinner.durationSeconds)
            : "بانتظار أول فائز"}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center shadow-2xl">
        <p className="mb-1 text-2xl">🏆</p>
        <p className="text-sm font-bold text-slate-300">تحدي يومي</p>
        <p className="mt-1 text-lg font-black text-white">
          كلمة من 5 حروف
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-400">
          6 محاولات فقط
        </p>
      </div>
    </section>
  );
}