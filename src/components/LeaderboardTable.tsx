"use client";

import { useEffect, useState } from "react";
import {
  getLeaderboardUsers,
  LeaderboardUser,
} from "@/lib/leaderboard";

function RankMovement({ user }: { user: LeaderboardUser }) {
  if (user.rankDirection === "up") {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/15 text-sm font-black text-emerald-300 md:h-8 md:w-8">
        ⬆️
      </span>
    );
  }

  if (user.rankDirection === "down") {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-400/15 text-sm font-black text-red-300 md:h-8 md:w-8">
        ⬇️
      </span>
    );
  }

  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-400/15 text-sm font-black text-slate-300 md:h-8 md:w-8">
      ➖
    </span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[11px] font-black text-slate-950 shadow-lg md:h-9 md:w-9 md:text-sm">
      {rank}
    </span>
  );
}

export default function LeaderboardTable() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const data = await getLeaderboardUsers();
        setUsers(data);
      } catch (error) {
        console.error("فشل تحميل لوحة الصدارة:", error);
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();

    const interval = setInterval(loadLeaderboard, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-3 shadow-2xl md:mt-8 md:p-6">
      <div className="mb-4 text-center md:mb-6">
        <h2 className="text-2xl font-black md:text-3xl">لوحة الصدارة</h2>
        <p className="mt-2 text-xs leading-6 text-slate-300 md:text-sm">
          ترتيب الأعضاء حسب النقاط ثم عدد التوقعات الصحيحة.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm text-slate-300">
          جاري تحميل لوحة الصدارة...
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm text-slate-300">
          <div className="mb-2 text-3xl">🏆</div>
          <div className="font-black">لم تبدأ المنافسة بعد</div>
          <p className="mt-2 text-xs leading-6 text-slate-300">
            ستظهر أسماء الأعضاء هنا بعد اعتماد التوقعات واحتساب النتائج.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
          <table className="w-full table-fixed text-center">
            <thead className="bg-slate-950">
              <tr className="text-[10px] md:text-sm">
                <th className="w-[20%] px-1 py-3 font-black md:px-4 md:py-4">
                  المركز
                </th>
                <th className="w-[28%] px-1 py-3 font-black md:px-4 md:py-4">
                  الاسم
                </th>
                <th className="w-[14%] px-1 py-3 font-black md:px-4 md:py-4">
                  التوقعات
                </th>
                <th className="w-[12%] px-1 py-3 font-black md:px-4 md:py-4">
                  الصح
                </th>
                <th className="w-[12%] px-1 py-3 font-black md:px-4 md:py-4">
                  الخطأ
                </th>
                <th className="w-[14%] px-1 py-3 font-black md:px-4 md:py-4">
                  النقاط
                </th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-t border-white/10 text-[11px] md:text-sm"
                >
                  <td className="px-1 py-3 md:px-4 md:py-4">
                    <div className="flex items-center justify-center gap-1 md:gap-2">
                      <RankBadge rank={user.currentRank} />
                      <RankMovement user={user} />
                    </div>
                  </td>

                  <td className="px-1 py-3 font-black md:px-4 md:py-4">
                    <div className="truncate">{user.fullName}</div>
                  </td>

                  <td className="px-1 py-3 font-black text-slate-200 md:px-4 md:py-4">
                    {user.total}
                  </td>

                  <td className="px-1 py-3 font-black text-emerald-300 md:px-4 md:py-4">
                    {user.correct}
                  </td>

                  <td className="px-1 py-3 font-black text-red-300 md:px-4 md:py-4">
                    {user.wrong}
                  </td>

                  <td className="px-1 py-3 md:px-4 md:py-4">
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-400 px-2 text-[11px] font-black text-slate-950 md:h-8 md:min-w-8 md:px-3 md:text-sm">
                      {user.points}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}