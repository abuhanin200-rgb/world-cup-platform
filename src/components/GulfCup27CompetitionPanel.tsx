"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  LockKeyhole,
  MapPin,
  RefreshCw,
  Target,
  Trophy,
} from "lucide-react";
import TeamFlag from "@/components/TeamFlag";
import {
  GULF_CUP_27_TEAMS,
  GULF_CUP_27_TOURNAMENT_ID,
  calculateTournamentGroupStandingsV2,
  getGulfCup27Team,
  type TournamentGroupStandingV2,
} from "@/domain/tournaments";
import {
  getTournamentMatchesV2,
  isTournamentPredictionOpen,
  type TournamentMatchRuntimeV2,
} from "@/lib/tournamentV2Firestore";

const DATE_LOCALE = "ar-SA-u-ca-gregory-nu-latn";

type MatchFilter = "all" | "open" | "upcoming" | "finished";

function formatDateTime(timestamp: number) {
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

function statusLabel(match: TournamentMatchRuntimeV2) {
  if (match.status === "finished") return "انتهت";
  if (match.status === "live") return "مباشر";
  if (match.status === "postponed") return "مؤجلة";
  if (match.status === "cancelled") return "ملغاة";
  if (isTournamentPredictionOpen(match)) return "التوقع مفتوح";
  return "مجدولة";
}

function statusClass(match: TournamentMatchRuntimeV2) {
  if (match.status === "finished") {
    return "border-sky-300/20 bg-sky-300/10 text-sky-100";
  }
  if (match.status === "live") {
    return "border-red-300/20 bg-red-300/10 text-red-100";
  }
  if (isTournamentPredictionOpen(match)) {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }
  return "border-white/10 bg-white/5 text-white/50";
}

function StandingTable({
  group,
  rows,
}: {
  group: "A" | "B";
  rows: TournamentGroupStandingV2[];
}) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-white/10 bg-white/5 shadow-xl shadow-black/10">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <div>
          <p className="text-[11px] font-black text-[var(--tournament-primary)]">خليجي 27</p>
          <h3 className="mt-1 text-lg font-black">المجموعة {group}</h3>
        </div>
        <Trophy className="h-5 w-5 text-white/35" aria-hidden="true" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-right text-xs">
          <thead className="bg-black/20 text-white/45">
            <tr>
              <th className="px-3 py-3">#</th>
              <th className="px-3 py-3">المنتخب</th>
              <th className="px-2 py-3 text-center">ل</th>
              <th className="px-2 py-3 text-center">ف</th>
              <th className="px-2 py-3 text-center">ت</th>
              <th className="px-2 py-3 text-center">خ</th>
              <th className="px-2 py-3 text-center">له</th>
              <th className="px-2 py-3 text-center">عليه</th>
              <th className="px-2 py-3 text-center">+/-</th>
              <th className="px-3 py-3 text-center">ن</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const team = getGulfCup27Team(row.teamId);
              if (!team) return null;

              return (
                <tr key={row.teamId} className="border-t border-white/[0.06] bg-white/[0.02]">
                  <td className="px-3 py-3 font-black">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                        index < 2
                          ? "bg-[var(--tournament-primary)] text-white"
                          : "bg-white/5 text-white/45"
                      }`}
                      dir="ltr"
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <TeamFlag code={team.flagCode} name={team.nameAr} size="sm" />
                      <span className="font-black">{team.nameAr}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center">{row.played}</td>
                  <td className="px-2 py-3 text-center">{row.won}</td>
                  <td className="px-2 py-3 text-center">{row.drawn}</td>
                  <td className="px-2 py-3 text-center">{row.lost}</td>
                  <td className="px-2 py-3 text-center">{row.goalsFor}</td>
                  <td className="px-2 py-3 text-center">{row.goalsAgainst}</td>
                  <td className="px-2 py-3 text-center" dir="ltr">
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  </td>
                  <td className="px-3 py-3 text-center text-base font-black text-[var(--tournament-primary)]">
                    {row.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function RuntimeMatchCard({ match }: { match: TournamentMatchRuntimeV2 }) {
  const home = getGulfCup27Team(match.homeTeamId);
  const away = getGulfCup27Team(match.awayTeamId);
  const { date, time } = formatDateTime(match.kickoffAt);
  const finished =
    match.status === "finished" &&
    match.result.homeScore != null &&
    match.result.awayScore != null;
  const open = isTournamentPredictionOpen(match);

  return (
    <article className="rounded-[24px] border border-white/10 bg-black/20 p-4 shadow-lg shadow-black/10 backdrop-blur-sm md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 text-xs font-black text-white/60">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{match.round}</span>
          <span>{match.group ? `المجموعة ${match.group}` : "خروج المغلوب"}</span>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${statusClass(match)}`}>
          {statusLabel(match)}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="min-w-0 text-center">
          {home ? (
            <>
              <TeamFlag code={home.flagCode} name={home.nameAr} size="lg" />
              <div className="mt-2 truncate text-sm font-black md:text-base">{home.nameAr}</div>
            </>
          ) : (
            <div className="text-xs font-black leading-6 text-white/40">
              {match.homeSourceLabel || "لم يتحدد"}
            </div>
          )}
        </div>

        <div className="min-w-[72px] text-center">
          {finished ? (
            <div dir="ltr" className="text-2xl font-black text-white [unicode-bidi:isolate] md:text-3xl">
              {match.result.homeScore} - {match.result.awayScore}
            </div>
          ) : (
            <div dir="ltr" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/45">
              VS
            </div>
          )}
        </div>

        <div className="min-w-0 text-center">
          {away ? (
            <>
              <TeamFlag code={away.flagCode} name={away.nameAr} size="lg" />
              <div className="mt-2 truncate text-sm font-black md:text-base">{away.nameAr}</div>
            </>
          ) : (
            <div className="text-xs font-black leading-6 text-white/40">
              {match.awaySourceLabel || "لم يتحدد"}
            </div>
          )}
        </div>
      </div>

      {finished && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-black text-white/55">
          {match.calculationStatus === "calculated" ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-200" aria-hidden="true" />
              تم احتساب توقعات المباراة
            </>
          ) : (
            <>
              <Target className="h-4 w-4 text-amber-200" aria-hidden="true" />
              النتيجة مسجلة وتنتظر اكتمال الاحتساب
            </>
          )}
        </div>
      )}

      {finished && match.stage === "knockout" && match.result.qualifiedTeamId && (
        <div className="mt-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] px-3 py-2 text-center text-xs font-black text-amber-50">
          تأهل {getGulfCup27Team(match.result.qualifiedTeamId)?.nameAr || "المنتخب"}{" "}
          {match.result.qualificationMethod === "penalties"
            ? "بركلات الترجيح"
            : match.result.qualificationMethod === "extra_time"
              ? "بعد الوقت الإضافي"
              : "بفوز مباشر"}
          {match.result.qualificationMethod === "penalties" &&
            match.result.penaltiesHomeScore != null &&
            match.result.penaltiesAwayScore != null && (
              <span dir="ltr" className="mr-2 [unicode-bidi:isolate]">
                ({match.result.penaltiesHomeScore}-{match.result.penaltiesAwayScore})
              </span>
            )}
          {match.result.qualificationMethod === "extra_time" &&
            match.result.extraTimeHomeScore != null &&
            match.result.extraTimeAwayScore != null && (
              <span dir="ltr" className="mr-2 [unicode-bidi:isolate]">
                ({match.result.extraTimeHomeScore}-{match.result.extraTimeAwayScore})
              </span>
            )}
        </div>
      )}

      <div className="mt-4 grid gap-2 border-t border-white/10 pt-3 text-xs font-bold text-white/55 sm:grid-cols-3">
        <span className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[var(--tournament-primary)]" aria-hidden="true" />
          {date}
        </span>
        <span className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-[var(--tournament-primary)]" aria-hidden="true" />
          <span dir="ltr" className="[unicode-bidi:isolate]">{time}</span>
        </span>
        <span className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[var(--tournament-primary)]" aria-hidden="true" />
          {match.stadium}
        </span>
      </div>

      {open && (
        <Link
          href="/tournaments/gulf-cup-27/predictions"
          className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--tournament-primary)] px-4 text-sm font-black text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.99]"
        >
          توقع الآن
          <Target className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </article>
  );
}

export default function GulfCup27CompetitionPanel() {
  const [matches, setMatches] = useState<TournamentMatchRuntimeV2[]>([]);
  const [filter, setFilter] = useState<MatchFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setMatches(await getTournamentMatchesV2(GULF_CUP_27_TOURNAMENT_ID));
    } catch (loadError) {
      console.error("Gulf 27 competition load error:", loadError);
      setError("تعذر تحميل مباريات وترتيب خليجي 27");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groupA = useMemo(
    () =>
      calculateTournamentGroupStandingsV2({
        teams: GULF_CUP_27_TEAMS,
        matches,
        group: "A",
      }),
    [matches],
  );
  const groupB = useMemo(
    () =>
      calculateTournamentGroupStandingsV2({
        teams: GULF_CUP_27_TEAMS,
        matches,
        group: "B",
      }),
    [matches],
  );

  const filteredMatches = useMemo(() => {
    const now = Date.now();
    return matches.filter((match) => {
      if (filter === "open") return isTournamentPredictionOpen(match);
      if (filter === "finished") return match.status === "finished";
      if (filter === "upcoming") {
        return match.status !== "finished" && match.kickoffAt >= now;
      }
      return true;
    });
  }, [filter, matches]);

  const groupMatches = matches.filter((match) => match.stage === "group");
  const finishedCount = groupMatches.filter((match) => match.status === "finished").length;
  const openCount = matches.filter((match) => isTournamentPredictionOpen(match)).length;

  if (loading) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/5 p-10 text-center text-white/60">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-[var(--tournament-primary)]" aria-hidden="true" />
        <p className="mt-3 text-sm font-black">جاري تحميل البطولة...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-[24px] border border-red-300/20 bg-red-300/10 p-5 text-sm font-black text-red-100">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="group-standings-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black text-[var(--tournament-primary)]">يتحدث مع النتائج المعتمدة</p>
            <h2 id="group-standings-heading" className="mt-1 text-xl font-black md:text-2xl">ترتيب المجموعات</h2>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/55">
            مباريات مجموعات منتهية: <span dir="ltr" className="text-white [unicode-bidi:isolate]">{finishedCount}</span> / {groupMatches.length || 12}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <StandingTable group="A" rows={groupA} />
          <StandingTable group="B" rows={groupB} />
        </div>
        <p className="mt-3 text-[11px] font-semibold leading-5 text-white/40">
          يُرتّب المنتخب حسب النقاط ثم فارق الأهداف ثم الأهداف المسجلة، وتُطبّق معايير البطولة عند تساوي المنتخبات.
        </p>
      </section>

      <section aria-labelledby="matches-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-[var(--tournament-primary)]">الجدول والنتائج</p>
            <h2 id="matches-heading" className="mt-1 text-xl font-black md:text-2xl">مباريات خليجي 27</h2>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 text-xs font-black transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            تحديث
          </button>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="فلترة مباريات خليجي 27">
          {(
            [
              ["all", "الكل"],
              ["open", `التوقع مفتوح (${openCount})`],
              ["upcoming", "القادمة"],
              ["finished", "النتائج"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`min-h-[44px] shrink-0 rounded-2xl border px-4 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                filter === value
                  ? "border-[var(--tournament-primary)] bg-[var(--tournament-primary)] text-white"
                  : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {filteredMatches.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/15 bg-black/15 p-8 text-center">
            <LockKeyhole className="mx-auto h-8 w-8 text-white/25" aria-hidden="true" />
            <p className="mt-3 text-sm font-black text-white/55">لا توجد مباريات ضمن هذا التصنيف حاليًا.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredMatches.map((match) => (
              <RuntimeMatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
