"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Loader2,
  MapPin,
  Target,
  Trophy,
  UsersRound,
} from "lucide-react";
import TeamFlag from "@/components/TeamFlag";
import { useAuth } from "@/context/AuthContext";
import {
  GULF_CUP_27_TEAMS,
  GULF_CUP_27_TOURNAMENT_ID,
  calculateTournamentGroupStandingsV2,
  getGulfCup27Team,
  type TournamentGroupStandingV2,
  type TournamentUserStatsV2,
} from "@/domain/tournaments";
import {
  getTournamentLeaderboardV2,
  getTournamentMatchesV2,
  isTournamentPredictionOpen,
  type TournamentMatchRuntimeV2,
} from "@/lib/tournamentV2Firestore";

const DATE_LOCALE = "ar-SA-u-ca-gregory-nu-latn";

function formatKickoff(timestamp: number) {
  const value = new Date(timestamp);
  return {
    date: new Intl.DateTimeFormat(DATE_LOCALE, {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "Asia/Riyadh",
    }).format(value),
    time: new Intl.DateTimeFormat(DATE_LOCALE, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Riyadh",
    }).format(value),
  };
}

function TeamSide({ teamId }: { teamId: string }) {
  const team = getGulfCup27Team(teamId);
  if (!team) return <span>—</span>;

  return (
    <div className="min-w-0 text-center">
      <TeamFlag code={team.flagCode} name={team.nameAr} size="lg" />
      <div className="mt-2 truncate text-sm font-black md:text-base">{team.nameAr}</div>
    </div>
  );
}

function MiniStanding({ title, rows }: { title: string; rows: TournamentGroupStandingV2[] }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-black/15 p-3">
      <div className="mb-2 text-xs font-black text-white/50">{title}</div>
      <div className="space-y-1.5">
        {rows.slice(0, 4).map((row, index) => {
          const team = getGulfCup27Team(row.teamId);
          if (!team) return null;
          return (
            <div key={row.teamId} className="grid min-h-[38px] grid-cols-[24px_1fr_auto] items-center gap-2 rounded-xl bg-white/[0.04] px-2.5 py-1.5">
              <span dir="ltr" className="text-center text-[11px] font-black text-white/35 [unicode-bidi:isolate]">{index + 1}</span>
              <div className="flex min-w-0 items-center gap-2">
                <TeamFlag code={team.flagCode} name={team.nameAr} size="sm" />
                <span className="truncate text-xs font-black">{team.nameAr}</span>
              </div>
              <span dir="ltr" className="text-sm font-black text-[var(--tournament-primary)] [unicode-bidi:isolate]">{row.points}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GulfCup27OverviewLive() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<TournamentMatchRuntimeV2[]>([]);
  const [leaderboard, setLeaderboard] = useState<TournamentUserStatsV2[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextMatches, nextLeaderboard] = await Promise.all([
        getTournamentMatchesV2(GULF_CUP_27_TOURNAMENT_ID),
        getTournamentLeaderboardV2(GULF_CUP_27_TOURNAMENT_ID),
      ]);
      setMatches(nextMatches);
      setLeaderboard(nextLeaderboard);
    } catch (error) {
      console.error("Gulf 27 overview load error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const focusMatch = useMemo(() => {
    const now = Date.now();
    const open = matches.find((match) => isTournamentPredictionOpen(match));
    if (open) return open;
    const upcoming = [...matches]
      .filter((match) => match.status !== "finished" && match.kickoffAt >= now)
      .sort((a, b) => a.kickoffAt - b.kickoffAt)[0];
    if (upcoming) return upcoming;
    return [...matches]
      .filter((match) => match.status === "finished")
      .sort((a, b) => b.kickoffAt - a.kickoffAt)[0] ?? null;
  }, [matches]);

  const groupA = useMemo(
    () => calculateTournamentGroupStandingsV2({ teams: GULF_CUP_27_TEAMS, matches, group: "A" }),
    [matches],
  );
  const groupB = useMemo(
    () => calculateTournamentGroupStandingsV2({ teams: GULF_CUP_27_TEAMS, matches, group: "B" }),
    [matches],
  );
  const memberRow = useMemo(
    () => (user ? leaderboard.find((row) => row.userId === user.id) ?? null : null),
    [leaderboard, user],
  );

  if (loading) {
    return (
      <div className="mb-7 rounded-[28px] border border-white/10 bg-white/5 p-8 text-center text-white/55">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-[var(--tournament-primary)]" aria-hidden="true" />
        <p className="mt-3 text-sm font-black">جاري تحميل حالة خليجي 27...</p>
      </div>
    );
  }

  const kickoff = focusMatch ? formatKickoff(focusMatch.kickoffAt) : null;
  const focusFinished =
    focusMatch?.status === "finished" &&
    focusMatch.result.homeScore != null &&
    focusMatch.result.awayScore != null;
  const focusOpen = focusMatch ? isTournamentPredictionOpen(focusMatch) : false;

  return (
    <div className="mb-7 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/15 md:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black text-[var(--tournament-primary)]">
              {focusOpen ? "التوقع مفتوح الآن" : focusFinished ? "آخر نتيجة" : "المباراة القادمة"}
            </p>
            <h2 className="mt-1 text-xl font-black md:text-2xl">واجهة البطولة الحية</h2>
          </div>
          {focusOpen ? (
            <Target className="h-6 w-6 text-[var(--tournament-primary)]" aria-hidden="true" />
          ) : (
            <CalendarDays className="h-6 w-6 text-white/35" aria-hidden="true" />
          )}
        </div>

        {focusMatch && kickoff ? (
          <>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[22px] border border-white/10 bg-black/20 p-4">
              <TeamSide teamId={focusMatch.homeTeamId} />
              {focusFinished ? (
                <span dir="ltr" className="text-2xl font-black [unicode-bidi:isolate] md:text-3xl">
                  {focusMatch.result.homeScore} - {focusMatch.result.awayScore}
                </span>
              ) : (
                <span dir="ltr" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/50 [unicode-bidi:isolate]">VS</span>
              )}
              <TeamSide teamId={focusMatch.awayTeamId} />
            </div>

            <div className="mt-4 grid gap-2 text-xs font-bold text-white/60 sm:grid-cols-3">
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[var(--tournament-primary)]" aria-hidden="true" />
                {kickoff.date}
              </span>
              <span dir="ltr" className="[unicode-bidi:isolate]">{kickoff.time}</span>
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[var(--tournament-primary)]" aria-hidden="true" />
                {focusMatch.stadium}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={focusOpen ? "/tournaments/gulf-cup-27/predictions" : "/tournaments/gulf-cup-27/matches"}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-[var(--tournament-primary)] px-4 text-sm font-black text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98]"
              >
                {focusOpen ? "توقع الآن" : "المباريات والنتائج"}
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/tournaments/gulf-cup-27/leaderboard"
                className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-black text-white/75 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                الترتيب
                <BarChart3 className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </>
        ) : (
          <p className="text-sm font-semibold text-white/55">لا توجد مباراة متاحة حاليًا.</p>
        )}

        {memberRow && (
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
            <div className="rounded-2xl bg-white/[0.04] p-3">
              <div className="text-[10px] font-bold text-white/40">مركزك</div>
              <div dir="ltr" className="mt-1 text-lg font-black [unicode-bidi:isolate]">#{memberRow.rank ?? "—"}</div>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-3">
              <div className="text-[10px] font-bold text-white/40">نقاطك</div>
              <div dir="ltr" className="mt-1 text-lg font-black text-[var(--tournament-primary)] [unicode-bidi:isolate]">{memberRow.points}</div>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-3">
              <div className="text-[10px] font-bold text-white/40">بالملي</div>
              <div dir="ltr" className="mt-1 text-lg font-black [unicode-bidi:isolate]">{memberRow.exact}</div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/15 md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <UsersRound className="h-5 w-5 text-[var(--tournament-primary)]" aria-hidden="true" />
          <h2 className="text-xl font-black">ترتيب المجموعات</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <MiniStanding title="المجموعة A" rows={groupA} />
          <MiniStanding title="المجموعة B" rows={groupB} />
        </div>
        <Link
          href="/tournaments/gulf-cup-27/matches"
          className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-black text-white/70 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          التفاصيل الكاملة
          <Trophy className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
