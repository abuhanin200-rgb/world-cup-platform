"use client";

import { useEffect, useMemo, useState } from "react";
import { getLeaderboardUsers, LeaderboardUser } from "@/lib/leaderboard";
import { getPredictionsByUserId, Prediction } from "@/lib/predictions";

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

function getTopRankStyle(rank: number) {
  if (rank === 1) {
    return {
      rowClass:
        "bg-gradient-to-l from-amber-400/20 via-amber-300/10 to-transparent",
      badgeClass:
        "bg-gradient-to-br from-amber-300 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/30 ring-2 ring-amber-200/40",
      nameClass: "text-amber-100",
      icon: "👑",
      medal: "🥇",
    };
  }

  if (rank === 2) {
    return {
      rowClass:
        "bg-gradient-to-l from-slate-300/16 via-slate-200/8 to-transparent",
      badgeClass:
        "bg-gradient-to-br from-slate-100 to-slate-400 text-slate-950 shadow-lg shadow-slate-400/20 ring-2 ring-slate-100/30",
      nameClass: "text-slate-100",
      icon: "",
      medal: "🥈",
    };
  }

  if (rank === 3) {
    return {
      rowClass:
        "bg-gradient-to-l from-orange-500/16 via-orange-300/8 to-transparent",
      badgeClass:
        "bg-gradient-to-br from-orange-300 to-orange-600 text-slate-950 shadow-lg shadow-orange-500/20 ring-2 ring-orange-200/30",
      nameClass: "text-orange-100",
      icon: "",
      medal: "🥉",
    };
  }

  return {
    rowClass: "",
    badgeClass: "bg-amber-400 text-slate-950 shadow-lg",
    nameClass: "text-white",
    icon: "",
    medal: "",
  };
}

function RankBadge({ rank }: { rank: number }) {
  const style = getTopRankStyle(rank);

  return (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black md:h-9 md:w-9 md:text-sm ${style.badgeClass}`}
    >
      {rank <= 3 ? style.medal : rank}
    </span>
  );
}

function getPredictionStatus(prediction: Prediction) {
  if (!prediction.isCalculated) {
    return {
      text: "لم تُحتسب",
      className: "border-slate-400/20 bg-slate-400/10 text-slate-200",
    };
  }

  if (prediction.points === 3 || prediction.resultType === "exact") {
    return {
      text: "صح بالملي +3",
      className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    };
  }

  if (prediction.points === 1 || prediction.resultType === "winner") {
    return {
      text: "الفائز صحيح +1",
      className: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    };
  }

  return {
    text: "خطأ +0",
    className: "border-red-400/30 bg-red-400/10 text-red-100",
  };
}

function PredictionDetailsModal({
  user,
  predictions,
  loading,
  onClose,
}: {
  user: LeaderboardUser;
  predictions: Prediction[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/10 p-4">
          <div>
            <h3 className="text-lg font-black md:text-xl">
              توقعات {user.fullName}
            </h3>
            <p className="mt-1 text-xs text-slate-300">
              مجموع التوقعات: {user.total} — النقاط: {user.points}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-red-500 px-3 py-2 text-xs font-black text-white hover:bg-red-400"
          >
            إغلاق
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm text-slate-300">
              جاري تحميل التوقعات...
            </div>
          ) : predictions.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm text-slate-300">
              لا توجد توقعات لهذا العضو حتى الآن.
            </div>
          ) : (
            <div className="space-y-3">
              {predictions.map((prediction) => {
                const status = getPredictionStatus(prediction);

                return (
                  <div
                    key={prediction.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-black ${status.className}`}
                      >
                        {status.text}
                      </span>

                      <span className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black text-slate-950">
                        {prediction.points} نقطة
                      </span>
                    </div>

                    <div className="grid grid-cols-[1fr_52px_1fr] items-center gap-2 text-center">
                      <div className="min-w-0">
                        <div className="text-2xl">
                          {prediction.homeTeamEmoji}
                        </div>
                        <div className="mt-1 truncate text-xs font-bold text-slate-200">
                          {prediction.homeTeamName}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-slate-950/70 px-2 py-2 text-sm font-black text-white">
                        {prediction.homeScore} - {prediction.awayScore}
                      </div>

                      <div className="min-w-0">
                        <div className="text-2xl">
                          {prediction.awayTeamEmoji}
                        </div>
                        <div className="mt-1 truncate text-xs font-bold text-slate-200">
                          {prediction.awayTeamName}
                        </div>
                      </div>
                    </div>

                    {prediction.isCalculated && (
                      <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/50 p-2 text-center text-xs font-bold text-slate-300">
                        النتيجة الفعلية:{" "}
                        <span className="text-white">
                          {prediction.actualHomeScore} -{" "}
                          {prediction.actualAwayScore}
                        </span>
                      </div>
                    )}

                    {!prediction.isCalculated && (
                      <div className="mt-3 rounded-xl border border-slate-400/20 bg-slate-400/10 p-2 text-center text-xs font-bold text-slate-300">
                        هذا التوقع بانتظار احتساب نتيجة المباراة.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardTable() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedUser, setSelectedUser] = useState<LeaderboardUser | null>(
    null
  );
  const [selectedPredictions, setSelectedPredictions] = useState<Prediction[]>(
    []
  );
  const [loadingPredictions, setLoadingPredictions] = useState(false);

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

  async function openUserPredictions(user: LeaderboardUser) {
    try {
      setSelectedUser(user);
      setSelectedPredictions([]);
      setLoadingPredictions(true);

      const predictions = await getPredictionsByUserId(user.id);

      setSelectedPredictions(predictions);
    } catch (error) {
      console.error("فشل تحميل توقعات العضو:", error);
      alert("تعذر تحميل توقعات العضو");
    } finally {
      setLoadingPredictions(false);
    }
  }

  function closeUserPredictions() {
    setSelectedUser(null);
    setSelectedPredictions([]);
    setLoadingPredictions(false);
  }

  function goToPreviousPage() {
    setCurrentPage((page) => Math.max(1, page - 1));
  }

  function goToNextPage() {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  }

  return (
    <>
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
                  {visibleUsers.map((user) => {
                    const style = getTopRankStyle(user.currentRank);

                    return (
                      <tr
                        key={user.id}
                        className={`border-t border-white/10 text-[11px] transition md:text-sm ${style.rowClass}`}
                      >
                        <td className="px-1 py-3 md:px-4 md:py-4">
                          <div className="flex items-center justify-center gap-1 md:gap-2">
                            <RankBadge rank={user.currentRank} />
                            <RankMovement user={user} />
                          </div>
                        </td>

                        <td className="px-1 py-3 font-black md:px-4 md:py-4">
                          <button
                            type="button"
                            onClick={() => openUserPredictions(user)}
                            className={`mx-auto flex min-w-0 max-w-full items-center justify-center gap-1 rounded-lg px-1 py-1 underline-offset-4 hover:underline ${style.nameClass}`}
                            title="اضغط لعرض توقعات العضو"
                          >
                            {style.icon && (
                              <span className="shrink-0 text-sm md:text-base">
                                {style.icon}
                              </span>
                            )}

                            <span className="truncate">{user.fullName}</span>
                          </button>
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
                          <span
                            className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[11px] font-black md:h-8 md:min-w-8 md:px-3 md:text-sm ${
                              user.currentRank <= 3
                                ? style.badgeClass
                                : "bg-amber-400 text-slate-950"
                            }`}
                          >
                            {user.points}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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

      {selectedUser && (
        <PredictionDetailsModal
          user={selectedUser}
          predictions={selectedPredictions}
          loading={loadingPredictions}
          onClose={closeUserPredictions}
        />
      )}
    </>
  );
}