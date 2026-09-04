"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Loader2, RefreshCw, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  GULF_CUP_27_TOURNAMENT_ID,
  type TournamentUserStatsV2,
} from "@/domain/tournaments";
import { getTournamentLeaderboardV2 } from "@/lib/tournamentV2Firestore";
import MemberProfileLink from "@/components/members/MemberProfileLink";

function getRankStyle(rank: number) {
  if (rank === 1) {
    return {
      rowClass: "bg-gradient-to-l from-amber-400/20 via-amber-300/10 to-transparent",
      badgeClass:
        "bg-gradient-to-br from-amber-300 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/30 ring-2 ring-amber-200/40",
      nameClass: "text-amber-100",
      medal: "🥇",
    };
  }

  if (rank === 2) {
    return {
      rowClass: "bg-gradient-to-l from-slate-300/16 via-slate-200/8 to-transparent",
      badgeClass:
        "bg-gradient-to-br from-slate-100 to-slate-400 text-slate-950 shadow-lg shadow-slate-400/20 ring-2 ring-slate-100/30",
      nameClass: "text-slate-100",
      medal: "🥈",
    };
  }

  if (rank === 3) {
    return {
      rowClass: "bg-gradient-to-l from-orange-500/16 via-orange-300/8 to-transparent",
      badgeClass:
        "bg-gradient-to-br from-orange-300 to-orange-600 text-slate-950 shadow-lg shadow-orange-500/20 ring-2 ring-orange-200/30",
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
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black tabular-nums [unicode-bidi:isolate] md:h-9 md:w-9 md:text-sm ${style.badgeClass}`}
    >
      {rank <= 3 ? style.medal : rank}
    </span>
  );
}

export default function GulfCup27LeaderboardPanel() {
  const { user } = useAuth();
  const [rows, setRows] = useState<TournamentUserStatsV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      setRows(await getTournamentLeaderboardV2(GULF_CUP_27_TOURNAMENT_ID));
    } catch (loadError) {
      console.error("Gulf 27 leaderboard error:", loadError);
      setError("تعذر تحميل ترتيب خليجي 27");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void load());
  }, []);

  const competitionStarted = useMemo(
    () => rows.some((row) => row.points > 0 || row.played > 0),
    [rows],
  );

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.08] p-3 text-white shadow-lg shadow-slate-950/25 backdrop-blur-sm md:p-6">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-emerald-400/5" />
      <div className="pointer-events-none absolute -right-24 top-14 h-56 w-56 rounded-full bg-amber-300/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-24 bottom-14 h-56 w-56 rounded-full bg-emerald-300/10 blur-2xl" />

      <div className="relative">
        <div className="mb-4 text-center md:mb-6">
          <div className="mx-auto mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-3 py-1.5 text-[10px] font-black text-amber-200 md:text-xs">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
            ترتيب خليجي 27
          </div>

          <h2 className="text-[22px] font-black md:text-3xl">لوحة الصدارة</h2>

          <p className="mx-auto mt-2 max-w-xl text-xs leading-6 text-slate-300 md:text-sm">
            ترتيب جميع الأعضاء حسب النقاط ثم عدد التوقعات الصحيحة.
          </p>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-4 text-xs font-black text-white/78 transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            تحديث الترتيب
          </button>

          {!loading && rows.length > 0 && !competitionStarted ? (
            <div className="mx-auto mt-3 max-w-md rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-[11px] leading-6 text-amber-50/70 md:text-xs">
              الترتيب مبدئي حتى تبدأ البطولة وتُحتسب أولى التوقعات.
            </div>
          ) : null}
        </div>

        {loading ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm text-slate-300"
          >
            <Loader2 className="mx-auto h-6 w-6 animate-spin" aria-hidden="true" />
            <p className="mt-3">جاري تحميل لوحة الصدارة...</p>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-center text-sm text-red-100"
          >
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-sm text-slate-300">
            <Trophy className="mx-auto h-8 w-8 text-amber-200/60" aria-hidden="true" />
            <h3 className="mt-3 text-base font-black text-white">لا يوجد أعضاء حتى الآن</h3>
            <p className="mt-2 text-xs leading-6 text-slate-300">
              ستظهر أسماء الأعضاء هنا بعد التسجيل في البطولة.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {rows.map((row, index) => {
                const rank = row.rank && row.rank > 0 ? row.rank : index + 1;
                const style = getRankStyle(rank);
                const isCurrent = user?.id === row.userId;

                return (
                  <article
                    key={row.id}
                    className={`relative overflow-hidden rounded-2xl border bg-slate-950/70 p-3 shadow-inner ${
                      isCurrent ? "border-emerald-300/30 ring-1 ring-emerald-300/10" : "border-white/10"
                    } ${style.rowClass}`}
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/40 to-transparent"
                    />

                    <div className="relative flex items-center gap-2.5">
                      <RankBadge rank={rank} />

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <h3 className={`min-w-0 flex-1 truncate text-sm font-black leading-6 ${style.nameClass}`}>
                            <MemberProfileLink userId={row.userId}>{row.fullName}</MemberProfileLink>
                          </h3>
                          {isCurrent ? (
                            <span className="shrink-0 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-black text-emerald-200">
                              أنت
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div
                        className={`flex min-w-[64px] shrink-0 flex-col items-center justify-center rounded-xl px-2 py-1.5 ${
                          rank <= 3 ? style.badgeClass : "bg-amber-400 text-slate-950"
                        }`}
                      >
                        <span className="text-[9px] font-black opacity-70">النقاط</span>
                        <span dir="ltr" className="text-sm font-black tabular-nums [unicode-bidi:isolate]">
                          {row.points}
                        </span>
                      </div>
                    </div>

                    <dl className="relative mt-2 grid grid-cols-4 gap-1.5 text-center">
                      <div className="rounded-xl border border-white/10 bg-white/5 px-1 py-2">
                        <dt className="text-[9px] font-bold text-slate-400">التوقعات</dt>
                        <dd dir="ltr" className="mt-1 text-sm font-black tabular-nums text-slate-100">
                          {row.played}
                        </dd>
                      </div>

                      <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-1 py-2">
                        <dt className="text-[9px] font-bold text-emerald-200">صحيحة</dt>
                        <dd dir="ltr" className="mt-1 text-sm font-black tabular-nums text-emerald-300">
                          {row.exact}
                        </dd>
                      </div>

                      <div className="rounded-xl border border-amber-300/15 bg-amber-300/10 px-1 py-2">
                        <dt className="text-[9px] font-bold text-amber-100">فائز</dt>
                        <dd dir="ltr" className="mt-1 text-sm font-black tabular-nums text-amber-200">
                          {row.correctOutcome}
                        </dd>
                      </div>

                      <div className="rounded-xl border border-red-400/15 bg-red-400/10 px-1 py-2">
                        <dt className="text-[9px] font-bold text-red-200">خطأ</dt>
                        <dd dir="ltr" className="mt-1 text-sm font-black tabular-nums text-red-300">
                          {row.wrong}
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>

            <div className="relative hidden overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-inner md:block">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-amber-200/45 to-transparent"
              />

              <table className="w-full table-fixed text-center">
                <caption className="sr-only">
                  ترتيب خليجي 27 حسب النقاط والتوقعات الصحيحة
                </caption>
                <thead className="bg-slate-950">
                  <tr className="text-xs md:text-sm">
                    <th scope="col" className="w-[15%] px-2 py-4 font-black">المركز</th>
                    <th scope="col" className="w-[29%] px-2 py-4 font-black">الاسم</th>
                    <th scope="col" className="w-[14%] px-2 py-4 font-black">التوقعات</th>
                    <th scope="col" className="w-[10%] px-2 py-4 font-black text-emerald-300">صحيحة</th>
                    <th scope="col" className="w-[10%] px-2 py-4 font-black text-amber-200">فائز</th>
                    <th scope="col" className="w-[10%] px-2 py-4 font-black text-red-300">خطأ</th>
                    <th scope="col" className="w-[12%] px-2 py-4 font-black">النقاط</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => {
                    const rank = row.rank && row.rank > 0 ? row.rank : index + 1;
                    const style = getRankStyle(rank);
                    const isCurrent = user?.id === row.userId;

                    return (
                      <tr
                        key={row.id}
                        className={`border-t border-white/10 text-sm transition ${
                          isCurrent ? "ring-1 ring-inset ring-emerald-300/20" : ""
                        } ${style.rowClass}`}
                      >
                        <td className="px-2 py-4">
                          <RankBadge rank={rank} />
                        </td>
                        <td className={`px-2 py-4 text-right font-black ${style.nameClass}`}>
                          <div className="flex items-center gap-2">
                            <MemberProfileLink userId={row.userId}>{row.fullName}</MemberProfileLink>
                            {isCurrent ? (
                              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-black text-emerald-200">
                                أنت
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td dir="ltr" className="px-2 py-4 tabular-nums">{row.played}</td>
                        <td dir="ltr" className="px-2 py-4 tabular-nums text-emerald-300">{row.exact}</td>
                        <td dir="ltr" className="px-2 py-4 tabular-nums text-amber-200">{row.correctOutcome}</td>
                        <td dir="ltr" className="px-2 py-4 tabular-nums text-red-300">{row.wrong}</td>
                        <td dir="ltr" className="px-2 py-4 text-base font-black tabular-nums text-amber-300">{row.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
