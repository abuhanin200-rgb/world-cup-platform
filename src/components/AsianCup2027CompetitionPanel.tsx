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
import TournamentMatchInsights from "@/components/tournaments/TournamentMatchInsights";
import TournamentMatchLineup from "@/components/tournaments/TournamentMatchLineup";
import TournamentMatchCenter from "@/components/tournaments/TournamentMatchCenter";
import {
  ASIAN_CUP_2027_MATCHES,
  ASIAN_CUP_2027_TEAMS,
  ASIAN_CUP_2027_TOURNAMENT_ID,
  calculateTournamentGroupStandingsV2,
  getAsianCup2027Team,
  type TournamentGroupStandingV2,
} from "@/domain/tournaments";
import {
  getTournamentMatchesV2,
  isTournamentPredictionOpen,
  type TournamentMatchRuntimeV2,
} from "@/lib/tournamentV2Firestore";

const DATE_LOCALE = "ar-SA-u-ca-gregory-nu-latn";

type MatchFilter = "all" | "live" | "open" | "upcoming" | "finished";

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

function statusLabel(match: TournamentMatchRuntimeV2, now: number) {
  if (match.status === "finished") return "انتهت";
  if (match.status === "live") return "مباشر";
  if (match.status === "postponed") return "مؤجلة";
  if (match.status === "cancelled") return "ملغاة";
  if (isTournamentPredictionOpen(match)) return "التوقع مفتوح";
  if (match.predictionOpensAt != null && now < match.predictionOpensAt) return "التوقع لم يفتح";
  if (match.kickoffTimeTbd) return "مجدولة";
  if (now >= (match.predictionClosesAt ?? match.kickoffAt)) return "التوقع مغلق";
  return "مجدولة";
}

function exactCountdown(timestamp: number, now: number) {
  const diff = Math.max(0, timestamp - now);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function MatchCountdown({ match, now }: { match: TournamentMatchRuntimeV2; now: number }) {
  if (match.status === "finished" || match.status === "live" || match.kickoffAt <= now) return null;

  if (match.kickoffTimeTbd) {
    const days = Math.max(0, Math.ceil((match.kickoffAt - now) / 86400000));
    return (
      <div className="mt-3 rounded-2xl border border-[var(--tournament-accent)]/20 bg-[var(--tournament-accent)]/[0.07] px-3 py-2 text-center text-[11px] font-black text-[var(--tournament-accent)]">
        {days > 1 ? `متبقي ${days} يومًا على يوم المباراة` : days === 1 ? "متبقي يوم واحد على يوم المباراة" : "المباراة اليوم · وقت البداية يحدد لاحقًا"}
      </div>
    );
  }

  const countdown = exactCountdown(match.kickoffAt, now);
  const cells = [
    [countdown.days, "يوم"],
    [countdown.hours, "ساعة"],
    [countdown.minutes, "دقيقة"],
    [countdown.seconds, "ثانية"],
  ] as const;

  return (
    <div className="mt-3 rounded-2xl border border-[var(--tournament-accent)]/20 bg-[var(--tournament-accent)]/[0.07] p-2.5">
      <p className="mb-2 text-center text-[10px] font-black text-white/45">متبقي على بداية المباراة</p>
      <div dir="ltr" className="grid grid-cols-4 gap-1.5 [unicode-bidi:isolate]">
        {cells.map(([value, label]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-black/15 px-1 py-1.5 text-center">
            <div className="text-sm font-black tabular-nums text-white">{String(value).padStart(2, "0")}</div>
            <div className="mt-0.5 text-[8px] font-bold text-white/40">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
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
  group: string;
  rows: TournamentGroupStandingV2[];
}) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-white/10 bg-white/5 shadow-xl shadow-black/10">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <div>
          <p className="text-[11px] font-black text-[var(--tournament-primary)]">كأس آسيا 2027</p>
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
              const team = getAsianCup2027Team(row.teamId);
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

function RuntimeMatchCard({ match, now }: { match: TournamentMatchRuntimeV2; now: number }) {
  const home = getAsianCup2027Team(match.homeTeamId);
  const away = getAsianCup2027Team(match.awayTeamId);
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
          {statusLabel(match, now)}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="min-w-0 text-center">
          {home ? (
            <>
              <TeamFlag code={home.flagCode} name={home.nameAr} size="lg" />
              <div className="mt-2 truncate text-sm font-black md:text-base">{home.nameAr}</div>
              {finished ? (
                <div dir="ltr" className="mx-auto mt-2 inline-flex min-w-12 items-center justify-center rounded-xl border border-white/10 bg-black/25 px-3 py-1.5 text-2xl font-black tabular-nums text-white [unicode-bidi:isolate]">
                  {match.result.homeScore}
                </div>
              ) : null}
            </>
          ) : (
            <div className="text-xs font-black leading-6 text-white/40">
              {match.homeSourceLabel || "لم يتحدد"}
            </div>
          )}
        </div>

        <div className="min-w-[72px] text-center">
          {finished ? (
            <div className="flex flex-col items-center gap-1 text-white/30">
              <span className="text-lg font-black" aria-hidden="true">—</span>
              <span className="text-[9px] font-black">النتيجة</span>
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
              {finished ? (
                <div dir="ltr" className="mx-auto mt-2 inline-flex min-w-12 items-center justify-center rounded-xl border border-white/10 bg-black/25 px-3 py-1.5 text-2xl font-black tabular-nums text-white [unicode-bidi:isolate]">
                  {match.result.awayScore}
                </div>
              ) : null}
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
          تأهل {getAsianCup2027Team(match.result.qualifiedTeamId)?.nameAr || "المنتخب"}{" "}
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
          {match.kickoffTimeTbd ? <span className="text-amber-200">يحدد لاحقًا</span> : <span dir="ltr" className="[unicode-bidi:isolate]">{time}</span>}
        </span>
        <span className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[var(--tournament-primary)]" aria-hidden="true" />
          {match.stadium}
        </span>
      </div>

      <MatchCountdown match={match} now={now} />

      {home && away ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <TournamentMatchInsights
            tournamentId={ASIAN_CUP_2027_TOURNAMENT_ID}
            matchId={match.id}
            homeName={home.nameAr}
            awayName={away.nameAr}
            homeFlagCode={home.flagCode}
            awayFlagCode={away.flagCode}
            compact
          />
          <TournamentMatchLineup
            tournamentId={ASIAN_CUP_2027_TOURNAMENT_ID}
            matchId={match.id}
            homeName={home.nameAr}
            awayName={away.nameAr}
            homeFlagCode={home.flagCode}
            awayFlagCode={away.flagCode}
            compact
          />
          {(match.status === "live" || match.status === "finished" || (!match.kickoffTimeTbd && now >= match.kickoffAt)) ? (
            <div className="col-span-2">
              <TournamentMatchCenter
                tournamentId={ASIAN_CUP_2027_TOURNAMENT_ID}
                matchId={match.id}
                homeName={home.nameAr}
                awayName={away.nameAr}
                homeFlagCode={home.flagCode}
                awayFlagCode={away.flagCode}
                compact
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {open && (
        <Link
          href="/tournaments/asian-cup-2027/predictions"
          className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--tournament-primary)] px-4 text-sm font-black text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.99]"
        >
          توقع الآن
          <Target className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </article>
  );
}

export default function AsianCup2027CompetitionPanel() {
  const [matches, setMatches] = useState<TournamentMatchRuntimeV2[]>([]);
  const [filter, setFilter] = useState<MatchFilter>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setMatches(await getTournamentMatchesV2(ASIAN_CUP_2027_TOURNAMENT_ID));
    } catch (loadError) {
      console.error("Asian Cup 2027 competition load error:", loadError);
      setError("تعذر تحميل مباريات وترتيب كأس آسيا 2027");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    const refresh = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void getTournamentMatchesV2(ASIAN_CUP_2027_TOURNAMENT_ID)
        .then(setMatches)
        .catch((refreshError) => {
          console.error("Asian Cup 2027 competition refresh error:", refreshError);
        });
    }, 30_000);
    return () => window.clearInterval(refresh);
  }, []);

  const displayMatches = useMemo(
    () => (matches.length ? matches : (ASIAN_CUP_2027_MATCHES as unknown as TournamentMatchRuntimeV2[])),
    [matches],
  );

  const standings = useMemo(
    () => ["A", "B", "C", "D", "E", "F"].map((group) => ({
      group,
      rows: calculateTournamentGroupStandingsV2({
        teams: ASIAN_CUP_2027_TEAMS,
        matches: displayMatches,
        group,
      }),
    })),
    [displayMatches],
  );

  const filteredMatches = useMemo(() => {
    return displayMatches
      .filter((match) => {
        if (filter === "live") return match.status === "live";
        if (filter === "open") return isTournamentPredictionOpen(match);
        if (filter === "finished") return match.status === "finished";
        if (filter === "upcoming") {
          return match.status !== "finished" && match.kickoffAt >= now;
        }
        return true;
      })
      .sort((a, b) => {
        if (filter === "all") {
          const liveDiff = Number(b.status === "live") - Number(a.status === "live");
          if (liveDiff !== 0) return liveDiff;
        }
        return a.kickoffAt - b.kickoffAt;
      });
  }, [displayMatches, filter, now]);

  const groupMatches = displayMatches.filter((match) => match.stage === "group");
  const finishedCount = groupMatches.filter((match) => match.status === "finished").length;
  const liveCount = displayMatches.filter((match) => match.status === "live").length;
  const openCount = displayMatches.filter((match) => isTournamentPredictionOpen(match)).length;
  const pageCount = Math.max(1, Math.ceil(filteredMatches.length / 20));
  const shownMatches = filteredMatches.slice((page - 1) * 20, page * 20);

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
    <div className="flex flex-col gap-8">
      <section aria-labelledby="group-standings-heading" className="order-2">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black text-[var(--tournament-primary)]">يتحدث مع النتائج المعتمدة</p>
            <h2 id="group-standings-heading" className="mt-1 text-xl font-black md:text-2xl">ترتيب المجموعات</h2>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/55">
            مباريات مجموعات منتهية: <span dir="ltr" className="text-white [unicode-bidi:isolate]">{finishedCount}</span> / {groupMatches.length || 36}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {standings.map((item) => (
            <StandingTable key={item.group} group={item.group} rows={item.rows} />
          ))}
        </div>
        <p className="mt-3 text-[11px] font-semibold leading-5 text-white/40">
          يُرتّب المنتخب حسب النقاط ثم فارق الأهداف ثم الأهداف المسجلة، وتُطبّق معايير البطولة عند تساوي المنتخبات.
        </p>
      </section>

      <section aria-labelledby="matches-heading" className="order-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-[var(--tournament-primary)]">الجدول والنتائج</p>
            <h2 id="matches-heading" className="mt-1 text-xl font-black md:text-2xl">مباريات كأس آسيا 2027</h2>
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

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="فلترة مباريات كأس آسيا 2027">
          {(
            [
              ["all", "الكل"],
              ["live", `مباشر (${liveCount})`],
              ["open", `التوقع مفتوح (${openCount})`],
              ["upcoming", "القادمة"],
              ["finished", "النتائج"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => { setFilter(value); setPage(1); }}
              aria-pressed={filter === value}
              className={`min-h-[44px] shrink-0 rounded-2xl border px-4 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                filter === value
                  ? value === "live"
                    ? "border-red-300/35 bg-red-400/15 text-red-50 shadow-[0_0_20px_rgba(248,113,113,.08)]"
                    : "border-[var(--tournament-primary)] bg-[var(--tournament-primary)] text-white"
                  : value === "live" && liveCount > 0
                    ? "border-red-300/20 bg-red-400/[0.07] text-red-100 hover:bg-red-400/10"
                    : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {value === "live" && liveCount > 0 ? (
                <span className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,.9)]" aria-hidden="true" />
              ) : null}
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
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              {shownMatches.map((match) => (
                <RuntimeMatchCard key={match.id} match={match} now={now} />
              ))}
            </div>
            {pageCount > 1 ? (
              <div className="mt-5 flex items-center justify-center gap-3">
                <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="min-h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black disabled:opacity-30">السابق</button>
                <span className="text-xs font-black text-white/55">{page} من {pageCount}</span>
                <button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="min-h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black disabled:opacity-30">التالي</button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
