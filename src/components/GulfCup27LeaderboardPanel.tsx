"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Crown,
  Flame,
  Loader2,
  Medal,
  RefreshCw,
  Target,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  GULF_CUP_27_TOURNAMENT_ID,
  type TournamentUserStatsV2,
} from "@/domain/tournaments";
import { getTournamentLeaderboardV2 } from "@/lib/tournamentV2Firestore";
import MemberProfileLink from "@/components/members/MemberProfileLink";

function PodiumCard({
  row,
  place,
}: {
  row: TournamentUserStatsV2;
  place: 1 | 2 | 3;
}) {
  return (
    <article
      className={`rounded-[24px] border p-4 text-center shadow-xl shadow-black/10 ${
        place === 1
          ? "border-amber-300/25 bg-amber-300/[0.09]"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
        {place === 1 ? (
          <Crown className="h-6 w-6 text-amber-200" aria-hidden="true" />
        ) : (
          <Medal className="h-6 w-6 text-white/60" aria-hidden="true" />
        )}
      </div>
      <div className="mt-3 text-xs font-black text-white/45">المركز {place}</div>
      <h3 className="mt-1 truncate text-base font-black"><MemberProfileLink userId={row.userId}>{row.fullName}</MemberProfileLink></h3>
      <div dir="ltr" className="mt-3 text-2xl font-black text-[var(--tournament-primary)] [unicode-bidi:isolate]">
        {row.points}
      </div>
      <div className="text-[11px] font-bold text-white/45">نقطة</div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-white/50">
        <span className="rounded-xl bg-white/[0.04] px-2 py-2">بالملي: {row.exact}</span>
        <span className="rounded-xl bg-white/[0.04] px-2 py-2">السلسلة: {row.bestStreak}</span>
      </div>
    </article>
  );
}

function MemberSummary({ row }: { row: TournamentUserStatsV2 }) {
  return (
    <section className="rounded-[26px] border border-emerald-300/20 bg-emerald-300/[0.07] p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-emerald-200/80">أداؤك في خليجي 27</p>
          <h3 className="mt-1 text-lg font-black"><MemberProfileLink userId={row.userId}>{row.fullName}</MemberProfileLink></h3>
        </div>
        <div className="rounded-2xl border border-emerald-200/20 bg-black/15 px-4 py-2 text-center">
          <div className="text-[11px] font-bold text-white/45">مركزك</div>
          <div dir="ltr" className="text-xl font-black text-emerald-100 [unicode-bidi:isolate]">#{row.rank ?? "—"}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["النقاط", row.points, Trophy],
          ["لعب", row.played, BarChart3],
          ["بالملي", row.exact, Target],
          ["فائز صحيح", row.correctOutcome, Medal],
          ["خطأ", row.wrong, RefreshCw],
          ["أفضل سلسلة", row.bestStreak, Flame],
        ].map(([label, value, Icon]) => {
          const StatIcon = Icon as typeof Trophy;
          return (
            <div key={String(label)} className="rounded-2xl border border-white/[0.07] bg-black/15 p-3">
              <StatIcon className="h-4 w-4 text-emerald-200" aria-hidden="true" />
              <div className="mt-2 text-[11px] font-bold text-white/45">{String(label)}</div>
              <div dir="ltr" className="mt-0.5 text-lg font-black [unicode-bidi:isolate]">{Number(value)}</div>
            </div>
          );
        })}
      </div>
    </section>
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

  const currentUserRow = useMemo(
    () => (user ? rows.find((row) => row.userId === user.id) ?? null : null),
    [rows, user],
  );
  const topThree = rows.slice(0, 3);
  const competitionStarted = rows.some((row) => row.points > 0);

  return (
    <div className="space-y-5">
      {currentUserRow && <MemberSummary row={currentUserRow} />}

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/15 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
              <BarChart3 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-black text-amber-200/80">ترتيب البطولة</p>
              <h2 className="text-xl font-black md:text-2xl">{competitionStarted ? "لوحة صدارة خليجي 27" : "المشاركون حتى الآن"}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 text-xs font-black transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            تحديث الترتيب
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-white/55">
            <Loader2 className="mx-auto h-7 w-7 animate-spin" aria-hidden="true" />
            <p className="mt-3 text-sm font-bold">جاري تحميل الترتيب...</p>
          </div>
        ) : error ? (
          <div role="alert" className="mt-5 rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm font-black text-red-100">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-6 rounded-[22px] border border-dashed border-white/15 bg-black/15 p-8 text-center">
            <Trophy className="mx-auto h-9 w-9 text-white/25" aria-hidden="true" />
            <h3 className="mt-3 font-black">الترتيب جاهز ومستقل</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/50">
              سيظهر ترتيب خليجي 27 هنا فور احتساب أول مباراة. نقاط كأس العالم والألعاب لا تدخل في هذا الجدول.
            </p>
          </div>
        ) : (
          <>
            {!competitionStarted ? (
              <div className="mt-5 rounded-[22px] border border-dashed border-amber-300/20 bg-amber-300/[0.06] p-6 text-center">
                <Trophy className="mx-auto h-9 w-9 text-amber-200/70" aria-hidden="true" />
                <h3 className="mt-3 text-lg font-black">لم تبدأ المنافسة بعد</h3>
                <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-7 text-white/58">لن تظهر منصة التتويج أو علامة التاج قبل تسجيل نقاط فعلية. يمكنك مشاهدة قائمة المشاركين المسجلين أدناه.</p>
              </div>
            ) : null}
            {competitionStarted && topThree.length > 0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {topThree.map((row, index) => (
                  <PodiumCard key={row.id} row={row} place={(index + 1) as 1 | 2 | 3} />
                ))}
              </div>
            )}

            <div className="mt-5 grid gap-2 md:hidden">
              {rows.map((row, index) => {
                const isCurrent = user?.id === row.userId;
                return (
                  <article
                    key={row.id}
                    className={`rounded-[22px] border p-4 ${
                      isCurrent
                        ? "border-emerald-300/25 bg-emerald-300/[0.08]"
                        : "border-white/10 bg-black/15"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span dir="ltr" className="text-xs font-black text-white/40 [unicode-bidi:isolate]">#{index + 1}</span>
                          <h3 className="truncate font-black"><MemberProfileLink userId={row.userId}>{row.fullName}</MemberProfileLink></h3>
                        </div>
                        {isCurrent && <div className="mt-1 text-[11px] font-black text-emerald-200">أنت</div>}
                      </div>
                      <div className="text-left">
                        <div dir="ltr" className="text-xl font-black text-[var(--tournament-primary)] [unicode-bidi:isolate]">{row.points}</div>
                        <div className="text-[10px] font-bold text-white/40">نقطة</div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px] font-bold">
                      <div className="rounded-xl bg-white/[0.04] p-2"><span className="block text-white/35">لعب</span><b>{row.played}</b></div>
                      <div className="rounded-xl bg-white/[0.04] p-2"><span className="block text-white/35">بالملي</span><b>{row.exact}</b></div>
                      <div className="rounded-xl bg-white/[0.04] p-2"><span className="block text-white/35">صحيح</span><b>{row.correctOutcome}</b></div>
                      <div className="rounded-xl bg-white/[0.04] p-2"><span className="block text-white/35">سلسلة</span><b>{row.bestStreak}</b></div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-5 hidden overflow-x-auto rounded-[22px] border border-white/10 md:block">
              <table className="w-full min-w-[720px] text-right text-sm">
                <thead className="bg-black/25 text-xs text-white/55">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">العضو</th>
                    <th className="px-4 py-3 text-center">النقاط</th>
                    <th className="px-4 py-3 text-center">لعب</th>
                    <th className="px-4 py-3 text-center">بالملي</th>
                    <th className="px-4 py-3 text-center">فائز صحيح</th>
                    <th className="px-4 py-3 text-center">خطأ</th>
                    <th className="px-4 py-3 text-center">أفضل سلسلة</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const isCurrent = user?.id === row.userId;
                    return (
                      <tr
                        key={row.id}
                        className={`border-t border-white/[0.07] ${
                          isCurrent ? "bg-emerald-300/[0.08]" : "bg-white/[0.025]"
                        }`}
                      >
                        <td className="px-4 py-3 font-black">
                          <span className="inline-flex items-center gap-1.5">
                            {index < 3 && <Medal className="h-4 w-4 text-amber-200" aria-hidden="true" />}
                            <span dir="ltr" className="[unicode-bidi:isolate]">{index + 1}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 font-black">
                          <MemberProfileLink userId={row.userId}>{row.fullName}</MemberProfileLink>
                          {isCurrent && <span className="mr-2 rounded-full bg-emerald-300/15 px-2 py-0.5 text-[10px] text-emerald-200">أنت</span>}
                        </td>
                        <td className="px-4 py-3 text-center text-base font-black text-[var(--tournament-primary)]">{row.points}</td>
                        <td className="px-4 py-3 text-center">{row.played}</td>
                        <td className="px-4 py-3 text-center">{row.exact}</td>
                        <td className="px-4 py-3 text-center">{row.correctOutcome}</td>
                        <td className="px-4 py-3 text-center">{row.wrong}</td>
                        <td className="px-4 py-3 text-center">{row.bestStreak}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
