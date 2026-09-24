"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
  Sparkles,
  Swords,
  X,
} from "lucide-react";
import TeamFlag from "@/components/TeamFlag";

type Meeting = {
  fixtureId: number;
  kickoffAt: number;
  competition: string;
  country: string;
  homeTeamId: number;
  homeName: string;
  awayTeamId: number;
  awayName: string;
  homeGoals: number;
  awayGoals: number;
};

type Comparison = {
  formHome: number | null;
  formAway: number | null;
  attackHome: number | null;
  attackAway: number | null;
  defenceHome: number | null;
  defenceAway: number | null;
  poissonHome: number | null;
  poissonAway: number | null;
  h2hHome: number | null;
  h2hAway: number | null;
  goalsHome: number | null;
  goalsAway: number | null;
  totalHome: number | null;
  totalAway: number | null;
};

type RecentTeamMetrics = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  averageGoalsFor: number;
  averageGoalsAgainst: number;
  cleanSheets: number;
  cleanSheetRate: number;
  formScore: number;
};

type MatchInsights = {
  tournamentId: string;
  matchId: string;
  providerFixtureId: number;
  fetchedAt: number;
  schemaVersion?: number;
  providerHomeTeamId: number;
  providerAwayTeamId: number;
  providerHomeName: string;
  providerAwayName: string;
  summary: {
    total: number;
    homeWins: number;
    draws: number;
    awayWins: number;
    homeGoals: number;
    awayGoals: number;
    averageGoals: number;
  };
  historicalShares: { home: number; draw: number; away: number } | null;
  probabilities: {
    source: "api_prediction" | "head_to_head_history";
    home: number;
    draw: number;
    away: number;
  } | null;
  prediction: {
    available: boolean;
    predictedWinnerTeamId: number | null;
    predictedWinnerName: string | null;
    predictedGoalsHome: string | null;
    predictedGoalsAway: string | null;
    underOver: string | null;
    comparison: Comparison | null;
  };
  recent: {
    home: Array<"W" | "D" | "L">;
    away: Array<"W" | "D" | "L">;
  };
  recentTeams?: {
    home: RecentTeamMetrics | null;
    away: RecentTeamMetrics | null;
  };
  meetings: Meeting[];
  warnings: string[];
};

type Props = {
  tournamentId: string;
  matchId: string;
  homeName: string;
  awayName: string;
  homeFlagCode: string;
  awayFlagCode: string;
  compact?: boolean;
};

type PickKind = "home" | "draw" | "away";

const DATE_LOCALE = "ar-SA-u-ca-gregory-nu-latn";

const modalBackdropMotion: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.16, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.14, ease: "easeIn" } },
};

const modalMotion: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.995 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: 12,
    scale: 0.995,
    transition: { duration: 0.14, ease: "easeIn" },
  },
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(DATE_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Riyadh",
  }).format(new Date(timestamp));
}

function relativeUpdated(timestamp: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.floor(hours / 24)} يوم`;
}

function formTone(value: "W" | "D" | "L") {
  if (value === "W") return "border-emerald-300/25 bg-emerald-300/15 text-emerald-100";
  if (value === "D") return "border-white/15 bg-white/10 text-white/70";
  return "border-red-300/20 bg-red-300/10 text-red-100";
}

function FormDots({ values }: { values: Array<"W" | "D" | "L"> }) {
  if (!values.length) {
    return <span className="text-[11px] font-bold text-white/35">لا توجد بيانات</span>;
  }

  return (
    <div dir="ltr" className="flex flex-wrap items-center gap-1.5">
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-black ${formTone(value)}`}
          aria-label={value === "W" ? "فوز" : value === "D" ? "تعادل" : "خسارة"}
        >
          {value}
        </span>
      ))}
    </div>
  );
}

function arabicCompetitionName(value: string) {
  const normalized = value.trim().toLowerCase();
  const known: Array<[RegExp, string]> = [
    [/world cup.*qualification.*asia|qualification asia.*world cup/i, "تصفيات كأس العالم - آسيا"],
    [/gulf cup of nations|arabian gulf cup/i, "كأس الخليج العربي"],
    [/asian cup/i, "كأس آسيا"],
    [/arab cup/i, "كأس العرب"],
    [/friendlies|friendly/i, "مباراة ودية"],
    [/world cup/i, "كأس العالم"],
  ];

  const match = known.find(([pattern]) => pattern.test(normalized));
  return match?.[1] || value.trim();
}

function meetingTournamentLabel(meeting: Meeting) {
  const competition = arabicCompetitionName(meeting.competition || "");
  const country = meeting.country?.trim();
  const showCountry = Boolean(country && country.toLowerCase() !== "world");

  if (competition && showCountry) return `${competition} • ${country}`;
  return competition || (showCountry ? country : "") || "مباراة دولية";
}

function recentStrength(metrics: RecentTeamMetrics | null | undefined) {
  if (!metrics || metrics.played <= 0) return null;
  const goalBalance = metrics.averageGoalsFor - metrics.averageGoalsAgainst;
  return metrics.formScore + goalBalance * 8 + metrics.cleanSheetRate * 0.08;
}

function choosePick(data: MatchInsights): PickKind | null {
  const probabilities = data.probabilities;
  if (!probabilities) return null;

  const max = Math.max(probabilities.home, probabilities.draw, probabilities.away);
  const tied: PickKind[] = [];
  if (probabilities.home === max) tied.push("home");
  if (probabilities.draw === max) tied.push("draw");
  if (probabilities.away === max) tied.push("away");

  if (tied.length === 1) return tied[0];

  if (
    tied.includes("home") &&
    data.prediction.predictedWinnerTeamId === data.providerHomeTeamId
  ) {
    return "home";
  }
  if (
    tied.includes("away") &&
    data.prediction.predictedWinnerTeamId === data.providerAwayTeamId
  ) {
    return "away";
  }

  const homeStrength = recentStrength(data.recentTeams?.home);
  const awayStrength = recentStrength(data.recentTeams?.away);

  if (tied.includes("home") && tied.includes("away") && homeStrength != null && awayStrength != null) {
    if (Math.abs(homeStrength - awayStrength) > 0.01) {
      return homeStrength > awayStrength ? "home" : "away";
    }
  }

  if (
    tied.includes("home") &&
    tied.includes("draw") &&
    homeStrength != null &&
    awayStrength != null
  ) {
    return homeStrength > awayStrength ? "home" : "draw";
  }
  if (
    tied.includes("away") &&
    tied.includes("draw") &&
    homeStrength != null &&
    awayStrength != null
  ) {
    return awayStrength > homeStrength ? "away" : "draw";
  }

  if (tied.includes("home") && data.summary.homeWins > data.summary.awayWins) return "home";
  if (tied.includes("away") && data.summary.awayWins > data.summary.homeWins) return "away";
  if (tied.includes("draw")) return "draw";
  return tied[0] ?? null;
}

function probabilityLabel(kind: PickKind, homeName: string, awayName: string) {
  if (kind === "home") return `فوز ${homeName}`;
  if (kind === "away") return `فوز ${awayName}`;
  return "التعادل";
}

function probabilityValue(kind: PickKind, probabilities: NonNullable<MatchInsights["probabilities"]>) {
  if (kind === "home") return probabilities.home;
  if (kind === "away") return probabilities.away;
  return probabilities.draw;
}

function ProbabilityBlock({
  data,
  homeName,
  awayName,
}: {
  data: MatchInsights;
  homeName: string;
  awayName: string;
}) {
  const probabilities = data.probabilities;
  if (!probabilities) return null;

  const pick = choosePick(data);
  const pickValue = pick ? probabilityValue(pick, probabilities) : null;

  return (
    <section className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-200" aria-hidden="true" />
          <h3 className="text-sm font-black text-white">احتمالات المباراة</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[9px] font-black text-white/45">
          تقديرية
        </span>
      </div>

      {pick && pickValue != null ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/[0.07] px-4 py-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-white/45">الترجيح</div>
            <div className="mt-1 truncate text-xl font-black text-white">
              {probabilityLabel(pick, homeName, awayName)}
            </div>
          </div>
          <div dir="ltr" className="shrink-0 text-3xl font-black tabular-nums text-amber-100 [unicode-bidi:isolate]">
            {pickValue}%
          </div>
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <ProbabilityCard
          label={`فوز ${homeName}`}
          value={probabilities.home}
          tone="home"
          selected={pick === "home"}
        />
        <ProbabilityCard
          label="تعادل"
          value={probabilities.draw}
          tone="draw"
          selected={pick === "draw"}
        />
        <ProbabilityCard
          label={`فوز ${awayName}`}
          value={probabilities.away}
          tone="away"
          selected={pick === "away"}
        />
      </div>
    </section>
  );
}

function ProbabilityCard({
  label,
  value,
  tone,
  selected,
}: {
  label: string;
  value: number;
  tone: PickKind;
  selected: boolean;
}) {
  const toneClass =
    tone === "home"
      ? "text-sky-100"
      : tone === "away"
        ? "text-emerald-100"
        : "text-white";

  return (
    <div className={`rounded-xl border px-2 py-3 text-center ${selected ? "border-amber-300/30 bg-amber-300/[0.06]" : "border-white/[0.08] bg-black/15"}`}>
      <div className="truncate text-[9px] font-bold text-white/45">{label}</div>
      <div dir="ltr" className={`mt-1 text-xl font-black tabular-nums [unicode-bidi:isolate] ${toneClass}`}>
        {value}%
      </div>
    </div>
  );
}

function MetricCompareRow({
  label,
  homeName,
  awayName,
  homeText,
  awayText,
  homeBar,
  awayBar,
}: {
  label: string;
  homeName: string;
  awayName: string;
  homeText: string;
  awayText: string;
  homeBar: number;
  awayBar: number;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-black/15 p-3">
      <div className="mb-2 text-center text-[11px] font-black text-white/45">{label}</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2 text-[10px] font-black">
            <span className="truncate text-sky-100">{homeName}</span>
            <span dir="ltr" className="shrink-0 text-white [unicode-bidi:isolate]">{homeText}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]" dir="ltr">
            <div className="h-full rounded-full bg-sky-400" style={{ width: `${clampPercent(homeBar)}%` }} />
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2 text-[10px] font-black">
            <span className="truncate text-emerald-100">{awayName}</span>
            <span dir="ltr" className="shrink-0 text-white [unicode-bidi:isolate]">{awayText}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]" dir="ltr">
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${clampPercent(awayBar)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentComparison({
  data,
  homeName,
  awayName,
}: {
  data: MatchInsights;
  homeName: string;
  awayName: string;
}) {
  const home = data.recentTeams?.home;
  const away = data.recentTeams?.away;

  if (!home || !away) return null;

  const maxScoring = Math.max(home.averageGoalsFor, away.averageGoalsFor, 0.01);
  const homeScoringBar = (home.averageGoalsFor / maxScoring) * 100;
  const awayScoringBar = (away.averageGoalsFor / maxScoring) * 100;

  const h2hHome = data.historicalShares?.home ?? 0;
  const h2hAway = data.historicalShares?.away ?? 0;

  return (
    <section className="rounded-[22px] border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-white">مقارنة المؤشرات</h3>
        <span className="text-[9px] font-black text-white/35">آخر 5 مباريات</span>
      </div>

      <div className="mt-3 space-y-2.5">
        <MetricCompareRow
          label="الفورمة"
          homeName={homeName}
          awayName={awayName}
          homeText={`${home.formScore}%`}
          awayText={`${away.formScore}%`}
          homeBar={home.formScore}
          awayBar={away.formScore}
        />
        <MetricCompareRow
          label="التسجيل / مباراة"
          homeName={homeName}
          awayName={awayName}
          homeText={home.averageGoalsFor.toFixed(2)}
          awayText={away.averageGoalsFor.toFixed(2)}
          homeBar={homeScoringBar}
          awayBar={awayScoringBar}
        />
        <MetricCompareRow
          label="شباك نظيفة"
          homeName={homeName}
          awayName={awayName}
          homeText={`${home.cleanSheetRate}%`}
          awayText={`${away.cleanSheetRate}%`}
          homeBar={home.cleanSheetRate}
          awayBar={away.cleanSheetRate}
        />
        <MetricCompareRow
          label="المواجهات المباشرة"
          homeName={homeName}
          awayName={awayName}
          homeText={`${h2hHome}%`}
          awayText={`${h2hAway}%`}
          homeBar={h2hHome}
          awayBar={h2hAway}
        />
      </div>
    </section>
  );
}

function orientMeeting(
  meeting: Meeting,
  data: MatchInsights,
  homeName: string,
  awayName: string,
) {
  if (meeting.homeTeamId === data.providerHomeTeamId) {
    return {
      homeName,
      awayName,
      homeGoals: meeting.homeGoals,
      awayGoals: meeting.awayGoals,
    };
  }

  if (meeting.awayTeamId === data.providerHomeTeamId) {
    return {
      homeName,
      awayName,
      homeGoals: meeting.awayGoals,
      awayGoals: meeting.homeGoals,
    };
  }

  return {
    homeName: meeting.homeName,
    awayName: meeting.awayName,
    homeGoals: meeting.homeGoals,
    awayGoals: meeting.awayGoals,
  };
}

function winnerLabel(homeName: string, awayName: string, homeGoals: number, awayGoals: number) {
  if (homeGoals === awayGoals) return "تعادل";
  return homeGoals > awayGoals ? `فوز ${homeName}` : `فوز ${awayName}`;
}

function MeetingScore({
  meeting,
  data,
  homeName,
  awayName,
  compact = false,
}: {
  meeting: Meeting;
  data: MatchInsights;
  homeName: string;
  awayName: string;
  compact?: boolean;
}) {
  const oriented = orientMeeting(meeting, data, homeName, awayName);
  const winner = winnerLabel(
    oriented.homeName,
    oriented.awayName,
    oriented.homeGoals,
    oriented.awayGoals,
  );

  return (
    <div className={`rounded-2xl border border-white/[0.07] bg-black/15 ${compact ? "p-3" : "p-4"}`}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3" dir="rtl">
        <div className="min-w-0 text-center">
          <div className="truncate text-xs font-black text-white">{oriented.homeName}</div>
          <div dir="ltr" className="mt-1 text-2xl font-black text-sky-100 [unicode-bidi:isolate]">
            {oriented.homeGoals}
          </div>
        </div>
        <div className="text-sm font-black text-white/30">—</div>
        <div className="min-w-0 text-center">
          <div className="truncate text-xs font-black text-white">{oriented.awayName}</div>
          <div dir="ltr" className="mt-1 text-2xl font-black text-emerald-100 [unicode-bidi:isolate]">
            {oriented.awayGoals}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black text-emerald-100">
          {winner}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-black text-white/55">
          {meetingTournamentLabel(meeting)}
        </span>
        <span className="text-[9px] font-bold text-white/35">{formatDate(meeting.kickoffAt)}</span>
      </div>
    </div>
  );
}

export default function TournamentMatchInsights({
  tournamentId,
  matchId,
  homeName,
  awayName,
  homeFlagCode,
  awayFlagCode,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<MatchInsights | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const load = useCallback(async () => {
    if (data || loading) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ tournamentId, matchId });
      const response = await fetch(`/api/tournaments/match-insights?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        data?: MatchInsights;
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error || "تعذر تحميل الإحصائيات");
      }

      setData(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل الإحصائيات");
    } finally {
      setLoading(false);
    }
  }, [data, loading, matchId, tournamentId]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setShowAll(false);
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const visibleMeetings = useMemo(() => {
    if (!data) return [];
    return showAll ? data.meetings : data.meetings.slice(0, 5);
  }, [data, showAll]);

  const lastMeeting = data?.meetings[0] ?? null;

  const modal = isMounted
    ? createPortal(
        <AnimatePresence>
          {open ? (
            <motion.div
              variants={modalBackdropMotion}
              initial="hidden"
              animate="show"
              exit="exit"
              className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/88 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm md:items-center md:p-4"
              onClick={() => setOpen(false)}
            >
              <motion.section
                variants={modalMotion}
                dir="rtl"
                role="dialog"
                aria-modal="true"
                aria-label={`إحصائيات ${homeName} و${awayName}`}
                className="flex max-h-[calc(100svh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] border border-cyan-300/15 bg-slate-950 shadow-xl shadow-slate-950/45 md:max-h-[88vh] md:rounded-[2rem]"
                onClick={(event) => event.stopPropagation()}
              >
                <header className="relative shrink-0 border-b border-white/10 bg-white/[0.055] px-4 py-3">
                  <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/20 md:hidden" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black text-cyan-100">
                        <History className="h-3.5 w-3.5" aria-hidden="true" />
                        H2H
                      </div>
                      <h2 className="text-lg font-black text-white">المواجهات والإحصائيات</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
                      aria-label="إغلاق"
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </header>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
                  <section className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3" dir="rtl">
                      <div className="min-w-0 text-center">
                        <TeamFlag code={homeFlagCode} name={homeName} size="lg" />
                        <div className="mt-2 truncate text-sm font-black text-white">{homeName}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-center text-xs font-black text-white/45">
                        <Swords className="mx-auto h-4 w-4 text-amber-200" aria-hidden="true" />
                        <div className="mt-1">VS</div>
                      </div>
                      <div className="min-w-0 text-center">
                        <TeamFlag code={awayFlagCode} name={awayName} size="lg" />
                        <div className="mt-2 truncate text-sm font-black text-white">{awayName}</div>
                      </div>
                    </div>
                  </section>

                  {loading ? (
                    <div className="py-12 text-center text-white/55">
                      <Loader2 className="mx-auto h-7 w-7 animate-spin text-cyan-200" aria-hidden="true" />
                      <p className="mt-3 text-xs font-black">جاري التحميل...</p>
                    </div>
                  ) : error ? (
                    <div role="alert" className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] p-4 text-center text-xs font-black leading-6 text-amber-50">
                      {error}
                      <button
                        type="button"
                        onClick={() => {
                          setData(null);
                          setError("");
                          void load();
                        }}
                        className="mx-auto mt-3 flex min-h-[42px] items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-[11px] text-white"
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  ) : data ? (
                    <>
                      {lastMeeting ? (
                        <section className="rounded-[22px] border border-white/10 bg-white/[0.035] p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <h3 className="text-sm font-black text-white">آخر مواجهة</h3>
                            <span className="text-[9px] font-bold text-white/35">{formatDate(lastMeeting.kickoffAt)}</span>
                          </div>
                          <MeetingScore
                            meeting={lastMeeting}
                            data={data}
                            homeName={homeName}
                            awayName={awayName}
                          />
                        </section>
                      ) : null}

                      <ProbabilityBlock data={data} homeName={homeName} awayName={awayName} />

                      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <StatCard label="إجمالي المواجهات" value={data.summary.total} />
                        <StatCard label={`فوز ${homeName}`} value={data.summary.homeWins} tone="home" />
                        <StatCard label="تعادل" value={data.summary.draws} />
                        <StatCard label={`فوز ${awayName}`} value={data.summary.awayWins} tone="away" />
                      </section>

                      <section className="rounded-[22px] border border-white/10 bg-white/[0.035] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-black text-white">آخر 5 مواجهات بينهما</h3>
                          <span dir="ltr" className="text-[9px] font-black text-white/35 [unicode-bidi:isolate]">
                            AVG {data.summary.averageGoals}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-white/[0.07] bg-black/15 p-3">
                            <div className="mb-2 truncate text-xs font-black text-sky-100">{homeName}</div>
                            <FormDots values={data.recent.home} />
                          </div>
                          <div className="rounded-xl border border-white/[0.07] bg-black/15 p-3">
                            <div className="mb-2 truncate text-xs font-black text-emerald-100">{awayName}</div>
                            <FormDots values={data.recent.away} />
                          </div>
                        </div>
                      </section>

                      <RecentComparison data={data} homeName={homeName} awayName={awayName} />

                      <section className="rounded-[22px] border border-white/10 bg-white/[0.035] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-black text-white">سجل المواجهات</h3>
                          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[9px] font-black text-white/45">
                            {data.meetings.length}
                          </span>
                        </div>

                        {visibleMeetings.length ? (
                          <div className="mt-3 space-y-2.5">
                            {visibleMeetings.map((meeting) => (
                              <MeetingScore
                                key={meeting.fixtureId}
                                meeting={meeting}
                                data={data}
                                homeName={homeName}
                                awayName={awayName}
                                compact
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="mt-3 rounded-2xl border border-white/[0.07] bg-black/15 px-3 py-6 text-center text-xs font-bold text-white/40">
                            لا توجد مواجهات سابقة متاحة.
                          </div>
                        )}

                        {data.meetings.length > 5 ? (
                          <button
                            type="button"
                            onClick={() => setShowAll((value) => !value)}
                            className="mt-3 inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-[11px] font-black text-white/65 transition hover:bg-white/10"
                          >
                            {showAll ? (
                              <ChevronUp className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="h-4 w-4" aria-hidden="true" />
                            )}
                            {showAll ? "عرض أقل" : `عرض جميع المواجهات (${data.meetings.length})`}
                          </button>
                        ) : null}
                      </section>

                      <div className="flex items-center justify-between gap-3 px-1 text-[9px] font-bold text-white/25">
                        <span>API-FOOTBALL</span>
                        <span>{relativeUpdated(data.fetchedAt)}</span>
                      </div>
                    </>
                  ) : null}
                </div>

                <footer
                  className="shrink-0 border-t border-white/10 bg-slate-950/95 p-3"
                  style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 via-lime-200 to-amber-300 px-4 py-3 text-sm font-black text-slate-950 shadow-lg transition active:scale-[0.99]"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    إغلاق القائمة
                  </button>
                </footer>
              </motion.section>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-gradient-to-r from-cyan-300/12 via-white/[0.055] to-amber-300/10 font-black text-white shadow-lg shadow-black/10 transition hover:border-cyan-300/45 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 ${
          compact ? "w-full px-3 text-[11px]" : "w-full px-4 text-xs"
        }`}
      >
        <BarChart3 className="h-4 w-4 text-cyan-200" aria-hidden="true" />
        المواجهات والإحصائيات
      </button>
      {modal}
    </>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "home" | "away";
}) {
  const valueClass = tone === "home" ? "text-sky-100" : tone === "away" ? "text-emerald-100" : "text-white";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-center">
      <div className="truncate text-[10px] font-bold text-white/40">{label}</div>
      <div dir="ltr" className={`mt-1 text-xl font-black [unicode-bidi:isolate] ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}
