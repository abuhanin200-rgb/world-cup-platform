"use client";

import { useEffect, useState } from "react";
import {
  getLeaderboardUsers,
  LeaderboardUser,
} from "@/lib/leaderboard";

function RankMovement({ user }: { user: LeaderboardUser }) {
  if (user.rankDirection === "up") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-300">
        ↑ {user.rankChange}
      </span>
    );
  }

  if (user.rankDirection === "down") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-1 text-xs font-bold text-red-300">
        ↓ {user.rankChange}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/15 px-2 py-1 text-xs font-bold text-slate-300">
      ـ
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
    <section className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl">
      <div className="mb-5 flex flex-col gap-2 text-center md:text-right">
        <h2 className="text-2xl font-black md:text-3xl">لوحة الصدارة</h2>
        <p className="text-sm text-slate-300">
          ترتيب الأعضاء حسب النقاط، ثم عدد التوقعات الصحيحة.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-slate-300">
          جاري تحميل لوحة الصدارة...
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center">
          <div className="mb-2 text-3xl">🏆</div>
          <h3 className="font-black">لم تبدأ المنافسة بعد</h3>
          <p className="mt-2 text-sm text-slate-300">
            ستظهر أسماء الأعضاء هنا بعد اعتماد التوقعات واحتساب النتائج.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-950/80 text-slate-200">
                  <th className="px-4 py-4 text-center">المركز</th>
                  <th className="px-4 py-4 text-right">الاسم</th>
                  <th className="px-4 py-4 text-center">التوقعات</th>
                  <th className="px-4 py-4 text-center">الصح</th>
                  <th className="px-4 py-4 text-center">الخطأ</th>
                  <th className="px-4 py-4 text-center">النقاط</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-t border-white/10 bg-slate-900/50 transition hover:bg-slate-800/70"
                  >
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-sm font-black text-slate-950">
                          {user.currentRank}
                        </span>
                        <RankMovement user={user} />
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right font-bold">
                      {user.fullName}
                    </td>

                    <td className="px-4 py-4 text-center font-bold">
                      {user.total}
                    </td>

                    <td className="px-4 py-4 text-center font-bold text-emerald-300">
                      {user.correct}
                    </td>

                    <td className="px-4 py-4 text-center font-bold text-red-300">
                      {user.wrong}
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className="rounded-full bg-amber-400/15 px-3 py-1 font-black text-amber-300">
                        {user.points}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}