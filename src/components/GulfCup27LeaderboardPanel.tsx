"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Loader2,
  Minus,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  GULF_CUP_27_TOURNAMENT_ID,
  type TournamentUserStatsV2,
} from "@/domain/tournaments";
import { getTournamentLeaderboardV2 } from "@/lib/tournamentV2Firestore";
import MemberProfileLink from "@/components/members/MemberProfileLink";

const ROWS_PER_PAGE = 20;

type LeaderboardProps = {
  tournamentId?: string;
  tournamentLabel?: string;
};

function getRankStyle(rank: number) {
  if (rank === 1) {
    return {
      rowClass: "bg-gradient-to-l from-amber-400/20 via-amber-300/10 to-transparent",
      badgeClass:
        "bg-gradient-to-br from-amber-300 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/25 ring-1 ring-amber-200/40",
      nameClass: "text-amber-100",
      medal: "🥇",
    };
  }
  if (rank === 2) {
    return {
      rowClass: "bg-gradient-to-l from-slate-300/16 via-slate-200/8 to-transparent",
      badgeClass:
        "bg-gradient-to-br from-slate-100 to-slate-400 text-slate-950 shadow-md shadow-slate-400/20 ring-1 ring-slate-100/30",
      nameClass: "text-slate-100",
      medal: "🥈",
    };
  }
  if (rank === 3) {
    return {
      rowClass: "bg-gradient-to-l from-orange-500/16 via-orange-300/8 to-transparent",
      badgeClass:
        "bg-gradient-to-br from-orange-300 to-orange-600 text-slate-950 shadow-md shadow-orange-500/20 ring-1 ring-orange-200/30",
      nameClass: "text-orange-100",
      medal: "🥉",
    };
  }
  return {
    rowClass: "",
    badgeClass: "bg-white/[0.08] text-white ring-1 ring-white/10",
    nameClass: "text-white",
    medal: "",
  };
}

function RankBadge({ rank }: { rank: number }) {
  const style = getRankStyle(rank);
  return (
    <span
      dir="ltr"
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black tabular-nums [unicode-bidi:isolate] md:h-8 md:w-8 md:text-xs ${style.badgeClass}`}
    >
      {rank <= 3 ? style.medal : rank}
    </span>
  );
}

function getRankMovement(row: TournamentUserStatsV2) {
  const currentRank = row.rank && row.rank > 0 ? row.rank : null;
  const previousRank =
    row.previousRank && row.previousRank > 0 ? row.previousRank : null;
  const inferredDirection =
    currentRank == null || previousRank == null || currentRank === previousRank
      ? "-"
      : previousRank > currentRank
        ? "up"
        : "down";
  const direction = row.rankDirection === "-" ? inferredDirection : row.rankDirection;
  const change =
    row.rankChange > 0
      ? row.rankChange
      : currentRank != null && previousRank != null
        ? Math.abs(previousRank - currentRank)
        : 0;

  return { direction, change } as const;
}

function RankMovement({ row }: { row: TournamentUserStatsV2 }) {
  const movement = getRankMovement(row);

  if (movement.direction === "up") {
    return (
      <span
        title={movement.change > 0 ? `صعد ${movement.change} مركز` : "صعود"}
        aria-label={movement.change > 0 ? `صعد ${movement.change} مركز` : "صعود"}
        dir="ltr"
        className="inline-flex min-w-[30px] shrink-0 items-center justify-center gap-0.5 rounded-full border border-emerald-300/25 bg-emerald-500/15 px-1.5 py-1 text-emerald-300 shadow-sm shadow-emerald-500/10"
      >
        <ArrowUp className="h-3.5 w-3.5" strokeWidth={3.2} aria-hidden="true" />
        {movement.change > 0 ? (
          <span className="text-[9px] font-black tabular-nums">{movement.change}</span>
        ) : null}
      </span>
    );
  }

  if (movement.direction === "down") {
    return (
      <span
        title={movement.change > 0 ? `نزل ${movement.change} مركز` : "نزول"}
        aria-label={movement.change > 0 ? `نزل ${movement.change} مركز` : "نزول"}
        dir="ltr"
        className="inline-flex min-w-[30px] shrink-0 items-center justify-center gap-0.5 rounded-full border border-red-300/25 bg-red-500/15 px-1.5 py-1 text-red-300 shadow-sm shadow-red-500/10"
      >
        <ArrowDown className="h-3.5 w-3.5" strokeWidth={3.2} aria-hidden="true" />
        {movement.change > 0 ? (
          <span className="text-[9px] font-black tabular-nums">{movement.change}</span>
        ) : null}
      </span>
    );
  }

  return (
    <span
      title="ثابت"
      aria-label="المركز ثابت"
      className="inline-flex min-w-[30px] shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] px-1.5 py-1 text-slate-400"
    >
      <Minus className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
    </span>
  );
}

export default function GulfCup27LeaderboardPanel({
  tournamentId = GULF_CUP_27_TOURNAMENT_ID,
  tournamentLabel = "خليجي الديار العربية 27",
}: LeaderboardProps) {
  const { user } = useAuth();
  const [rows, setRows] = useState<TournamentUserStatsV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const nextRows = await getTournamentLeaderboardV2(tournamentId);
      setRows(nextRows);
      const nextTotalPages = Math.max(1, Math.ceil(nextRows.length / ROWS_PER_PAGE));
      setCurrentPage((page) => Math.min(page, nextTotalPages));
    } catch (loadError) {
      console.error("Tournament leaderboard error:", loadError);
      setError(`تعذر تحميل ترتيب ${tournamentLabel}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const competitionStarted = useMemo(
    () => rows.some((row) => row.points > 0 || row.played > 0),
    [rows],
  );
  const totalPages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  const visibleRows = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return rows.slice(start, start + ROWS_PER_PAGE);
  }, [rows, currentPage]);

  return (
    <section className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.075] p-2.5 text-white shadow-lg shadow-slate-950/20 backdrop-blur-sm md:p-5">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-emerald-400/5" />
      <div className="relative">
        <div className="mb-3 text-center md:mb-4">
          <div className="mx-auto mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-2.5 py-1 text-[9px] font-black text-amber-200 md:text-[11px]">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
            ترتيب {tournamentLabel}
          </div>
          <h2 className="text-xl font-black md:text-2xl">لوحة الصدارة</h2>
          <p className="mx-auto mt-1 max-w-xl text-[11px] leading-5 text-slate-300 md:text-xs">
            حسب النقاط، ثم النتائج بالملي، ثم الفائز الصحيح والأقل أخطاء.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="mt-2 inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3.5 text-[11px] font-black text-white/78 transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            تحديث الترتيب
          </button>
          {!loading && rows.length > 0 && !competitionStarted ? (
            <div className="mx-auto mt-2 max-w-md rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-3 py-1.5 text-[10px] leading-5 text-amber-50/70">
              الترتيب مبدئي حتى تبدأ البطولة وتُحتسب أولى التوقعات.
            </div>
          ) : null}
        </div>

        {loading ? (
          <div role="status" aria-live="polite" className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-center text-xs text-slate-300">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" aria-hidden="true" />
            <p className="mt-2">جاري تحميل لوحة الصدارة...</p>
          </div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-red-300/20 bg-red-400/10 p-3 text-center text-xs text-red-100">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-xs text-slate-300">
            <Trophy className="mx-auto h-7 w-7 text-amber-200/60" aria-hidden="true" />
            <h3 className="mt-2 text-sm font-black text-white">لا يوجد أعضاء حتى الآن</h3>
            <p className="mt-1 text-[11px] leading-5 text-slate-300">ستظهر أسماء الأعضاء هنا بعد بدء التوقعات.</p>
          </div>
        ) : (
          <>
            <div className="space-y-1.5 md:hidden">
              {visibleRows.map((row, index) => {
                const absoluteIndex = (currentPage - 1) * ROWS_PER_PAGE + index;
                const rank = row.rank && row.rank > 0 ? row.rank : absoluteIndex + 1;
                const style = getRankStyle(rank);
                const isCurrent = user?.id === row.userId;
                return (
                  <article
                    key={row.id}
                    className={`relative overflow-hidden rounded-[18px] border bg-slate-950/70 p-2.5 shadow-inner ${
                      isCurrent ? "border-emerald-300/30 ring-1 ring-emerald-300/10" : "border-white/10"
                    } ${style.rowClass}`}
                  >
                    <div className="relative flex items-center gap-2">
                      <div className="flex shrink-0 items-center gap-1">
                        <RankBadge rank={rank} />
                        <RankMovement row={row} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <h3 className={`min-w-0 flex-1 truncate text-[13px] font-black leading-5 ${style.nameClass}`}>
                            <MemberProfileLink userId={row.userId}>{row.fullName}</MemberProfileLink>
                          </h3>
                          {isCurrent ? (
                            <span className="shrink-0 rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[8px] font-black text-emerald-200">أنت</span>
                          ) : null}
                        </div>
                      </div>
                      <div className={`flex min-w-[56px] shrink-0 flex-col items-center justify-center rounded-xl px-2 py-1 ${rank <= 3 ? style.badgeClass : "bg-amber-400 text-slate-950"}`}>
                        <span className="text-[8px] font-black opacity-70">النقاط</span>
                        <span dir="ltr" className="text-[13px] font-black tabular-nums [unicode-bidi:isolate]">{row.points}</span>
                      </div>
                    </div>

                    <dl className="relative mt-1.5 grid grid-cols-4 gap-1 text-center">
                      <div className="rounded-lg border border-white/10 bg-white/5 px-1 py-1.5"><dt className="text-[8px] font-bold text-slate-400">التوقعات</dt><dd dir="ltr" className="mt-0.5 text-xs font-black tabular-nums text-slate-100">{row.played}</dd></div>
                      <div className="rounded-lg border border-emerald-400/15 bg-emerald-400/10 px-1 py-1.5"><dt className="text-[8px] font-bold text-emerald-200">صحيحة</dt><dd dir="ltr" className="mt-0.5 text-xs font-black tabular-nums text-emerald-300">{row.exact}</dd></div>
                      <div className="rounded-lg border border-amber-300/15 bg-amber-300/10 px-1 py-1.5"><dt className="text-[8px] font-bold text-amber-100">فائز</dt><dd dir="ltr" className="mt-0.5 text-xs font-black tabular-nums text-amber-200">{row.correctOutcome}</dd></div>
                      <div className="rounded-lg border border-red-400/15 bg-red-400/10 px-1 py-1.5"><dt className="text-[8px] font-bold text-red-200">خطأ</dt><dd dir="ltr" className="mt-0.5 text-xs font-black tabular-nums text-red-300">{row.wrong}</dd></div>
                    </dl>
                  </article>
                );
              })}
            </div>

            <div className="relative hidden overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-inner md:block">
              <table className="w-full table-fixed text-center">
                <caption className="sr-only">ترتيب {tournamentLabel}</caption>
                <thead className="bg-slate-950">
                  <tr className="text-[11px]">
                    <th scope="col" className="w-[16%] px-2 py-3 font-black">المركز</th>
                    <th scope="col" className="w-[28%] px-2 py-3 font-black">الاسم</th>
                    <th scope="col" className="w-[14%] px-2 py-3 font-black">التوقعات</th>
                    <th scope="col" className="w-[10%] px-2 py-3 font-black text-emerald-300">صحيحة</th>
                    <th scope="col" className="w-[10%] px-2 py-3 font-black text-amber-200">فائز</th>
                    <th scope="col" className="w-[10%] px-2 py-3 font-black text-red-300">خطأ</th>
                    <th scope="col" className="w-[12%] px-2 py-3 font-black">النقاط</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, index) => {
                    const absoluteIndex = (currentPage - 1) * ROWS_PER_PAGE + index;
                    const rank = row.rank && row.rank > 0 ? row.rank : absoluteIndex + 1;
                    const style = getRankStyle(rank);
                    const isCurrent = user?.id === row.userId;
                    return (
                      <tr key={row.id} className={`border-t border-white/10 text-xs transition ${isCurrent ? "ring-1 ring-inset ring-emerald-300/20" : ""} ${style.rowClass}`}>
                        <td className="px-2 py-2.5"><div className="flex items-center justify-center gap-1.5"><RankBadge rank={rank} /><RankMovement row={row} /></div></td>
                        <td className={`px-2 py-2.5 text-right font-black ${style.nameClass}`}><div className="flex items-center gap-2"><MemberProfileLink userId={row.userId}>{row.fullName}</MemberProfileLink>{isCurrent ? <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[8px] font-black text-emerald-200">أنت</span> : null}</div></td>
                        <td dir="ltr" className="px-2 py-2.5 tabular-nums">{row.played}</td>
                        <td dir="ltr" className="px-2 py-2.5 tabular-nums text-emerald-300">{row.exact}</td>
                        <td dir="ltr" className="px-2 py-2.5 tabular-nums text-amber-200">{row.correctOutcome}</td>
                        <td dir="ltr" className="px-2 py-2.5 tabular-nums text-red-300">{row.wrong}</td>
                        <td dir="ltr" className="px-2 py-2.5 text-sm font-black tabular-nums text-amber-300">{row.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="mt-3 flex items-center justify-between gap-2">
                <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="min-h-[40px] rounded-xl border border-white/10 bg-white/[0.07] px-3 text-[11px] font-black transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35">السابق</button>
                <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-[10px] font-bold text-slate-200">صفحة <bdi dir="ltr">{currentPage}</bdi> من <bdi dir="ltr">{totalPages}</bdi></div>
                <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="min-h-[40px] rounded-xl border border-white/10 bg-white/[0.07] px-3 text-[11px] font-black transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35">التالي</button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
