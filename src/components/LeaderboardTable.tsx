"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getLeaderboardUsers,
  LeaderboardUser,
} from "@/lib/leaderboard";

const USERS_PER_PAGE = 20;

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
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));

  const visibleUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * USERS_PER_PAGE;
    const endIndex = startIndex + USERS_PER_PAGE;

    return users.slice(startIndex, endIndex);
  }, [users, currentPage]);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const data = await getLeaderboardUsers();

        setUsers(data);

        const newTotalPages = Math.max(
          1,
          Math.ceil(data.length / USERS_PER_PAGE)
        );

        setCurrentPage((page) => Math.min(page, newTotalPages));
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

  function goToPreviousPage() {
    setCurrentPage((page) => Math.max(1, page - 1));
  }

  function goToNextPage() {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  }

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-3 shadow-2xl md:mt-8 md:p-6">
      <div className="mb-4 text-center md:mb-6">
        <h2 className="text-2xl font-black md:text-3xl">لوحة الصدارة</h2>
        <p className="mt-2 text-xs leading-6 text-slate-300 md:text-sm">
          ترتيب جميع الأعضاء حسب النقاط ثم عدد التوقعات الصحيحة.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm text-slate-300">
          جاري تحميل لوحة الصدارة...
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm text-slate-300">
          <div className="mb-2 text-3xl">🏆</div>
          <div className="font-black">لا يوجد أعضاء حتى الآن</div>
          <p className="mt-2 text-xs leading-6 text-slate-300">
            ستظهر أسماء الأعضاء هنا بعد التسجيل.
          </p>
        </div>
      ) : (
        <>
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
                {visibleUsers.map((user) => (
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

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40 md:text-sm"
            >
              السابق
            </button>

            <div className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-xs font-bold text-slate-200 md:text-sm">
              صفحة {currentPage} من {totalPages}
            </div>

            <button
              type="button"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40 md:text-sm"
            >
              التالي
            </button>
          </div>
        </>
      )}
    </section>
  );
}