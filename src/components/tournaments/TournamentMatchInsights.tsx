"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  History,
  Info,
  Loader2,
  Sparkles,
  Swords,
  TrendingUp,
  Trophy,
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

type MatchInsights = {
  tournamentId: string;
  matchId: string;
  providerFixtureId: number;
  fetchedAt: number;
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

type PickKind = "home" | "away" | "draw";

type TechnicalPick = {
  kind: PickKind;
  label: string;
  probability: number;
  reasons: string[];
};

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
    <div dir="ltr" className="flex items-center gap-1.5">
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

function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function buildTechnicalPick(
  data: MatchInsights,
  homeName: string,
  awayName: string,
): TechnicalPick | null {
  const probabilities = data.probabilities;
  if (!probabilities) return null;

  const comparison = data.prediction.comparison;
  const homeStrength = comparison
    ? average([
        comparison.formHome,
        comparison.attackHome,
        comparison.defenceHome,
        comparison.poissonHome,
        comparison.h2hHome,
        comparison.goalsHome,
        comparison.totalHome,
      ])
    : null;
  const awayStrength = comparison
    ? average([
        comparison.formAway,
        comparison.attackAway,
        comparison.defenceAway,
        comparison.poissonAway,
        comparison.h2hAway,
        comparison.goalsAway,
        comparison.totalAway,
      ])
    : null;

  const maxProbability = Math.max(probabilities.home, probabilities.draw, probabilities.away);
  const tied: PickKind[] = [];
  if (probabilities.home === maxProbability) tied.push("home");
  if (probabilities.draw === maxProbability) tied.push("draw");
  if (probabilities.away === maxProbability) tied.push("away");

  let kind: PickKind = tied[0] ?? "draw";

  if (tied.length > 1) {
    if (
      tied.includes("home") &&
      data.prediction.predictedWinnerTeamId === data.providerHomeTeamId
    ) {
      kind = "home";
    } else if (
      tied.includes("away") &&
      data.prediction.predictedWinnerTeamId === data.providerAwayTeamId
    ) {
      kind = "away";
    } else if (
      tied.includes("home") &&
      tied.includes("away") &&
      homeStrength != null &&
      awayStrength != null &&
      homeStrength !== awayStrength
    ) {
      kind = homeStrength > awayStrength ? "home" : "away";
    } else if (tied.includes("draw")) {
      kind = "draw";
    }
  }

  const reasons: string[] = [];
  const addReason = (label: string, home: number | null, away: number | null) => {
    if (home == null || away == null || kind === "draw") return;
    if (kind === "home" && home >= away + 5) reasons.push(label);
    if (kind === "away" && away >= home + 5) reasons.push(label);
  };

  if (comparison) {
    addReason("الفورمة الحالية", comparison.formHome, comparison.formAway);
    addReason("القوة الهجومية", comparison.attackHome, comparison.attackAway);
    addReason("الصلابة الدفاعية", comparison.defenceHome, comparison.defenceAway);
    addReason("المواجهات المباشرة", comparison.h2hHome, comparison.h2hAway);
    addReason("مؤشر التسجيل", comparison.goalsHome, comparison.goalsAway);
    addReason("التقييم العام", comparison.totalHome, comparison.totalAway);
  }

  if (kind === "home" && data.summary.homeWins > data.summary.awayWins) {
    reasons.push("أفضلية تاريخية في المواجهات");
  }
  if (kind === "away" && data.summary.awayWins > data.summary.homeWins) {
    reasons.push("أفضلية تاريخية في المواجهات");
  }
  if (!reasons.length && kind !== "draw") {
    reasons.push("محصلة مؤشرات مزود البيانات");
  }
  if (kind === "draw") {
    reasons.push("التعادل هو الاحتمال الأعلى ضمن البيانات المتاحة");
  }

  return {
    kind,
    label:
      kind === "home"
        ? `فوز ${homeName}`
        : kind === "away"
          ? `فوز ${awayName}`
          : "التعادل",
    probability:
      kind === "home"
        ? probabilities.home
        : kind === "away"
          ? probabilities.away
          : probabilities.draw,
    reasons: [...new Set(reasons)].slice(0, 3),
  };
}

function ProbabilityRow({
  label,
  value,
  tone,
  isPreferred,
}: {
  label: string;
  value: number;
  tone: "home" | "away" | "draw";
  isPreferred: boolean;
}) {
  const fillClass =
    tone === "home" ? "bg-sky-400" : tone === "away" ? "bg-emerald-400" : "bg-white/45";
  const valueClass =
    tone === "home" ? "text-sky-100" : tone === "away" ? "text-emerald-100" : "text-white";

  return (
    <div className={`rounded-2xl border p-3 ${isPreferred ? "border-amber-300/30 bg-amber-300/[0.07] shadow-[0_8px_22px_rgba(251,191,36,0.06)]" : "border-white/[0.08] bg-black/15"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${fillClass}`} />
          <span className="truncate text-xs font-black text-white/85">{label}</span>
          {isPreferred ? (
            <span className="shrink-0 rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[9px] font-black text-amber-100">
              المرجّح
            </span>
          ) : null}
        </div>
        <span dir="ltr" className={`text-xl font-black tabular-nums [unicode-bidi:isolate] ${valueClass}`}>
          {value}%
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]" dir="rtl">
        <div className={`h-full rounded-full ${fillClass}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
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
  if (!data.probabilities) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4 text-center text-xs font-bold text-white/45">
        لا توجد نسبة تقديرية متاحة لهذه المواجهة حاليًا.
      </div>
    );
  }

  const pick = buildTechnicalPick(data, homeName, awayName);
  const probabilities = data.probabilities;

  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-200" aria-hidden="true" />
            <h3 className="text-base font-black">احتمالات المباراة</h3>
          </div>
          <p className="mt-1 text-[10px] font-bold leading-5 text-white/40">
            {probabilities.source === "api_prediction"
              ? "قراءة تقديرية من مزود البيانات تجمع الفورمة والهجوم والدفاع والمواجهات ومؤشرات أخرى."
              : "قراءة تقديرية مبنية على المواجهات التاريخية المتاحة فقط."}
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black text-white/55">
          ليست ضمانًا للنتيجة
        </span>
      </div>

      {pick ? (
        <div className="mt-4 overflow-hidden rounded-[22px] border border-amber-300/25 bg-gradient-to-br from-amber-300/[0.11] via-white/[0.045] to-cyan-300/[0.06] p-4 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-black text-amber-100/80">
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
                الترجيح الأعلى حسب البيانات
              </div>
              <div className="mt-1 truncate text-xl font-black text-white">{pick.label}</div>
            </div>
            <div className="shrink-0 text-left">
              <div className="text-[10px] font-bold text-white/45">الاحتمال</div>
              <div dir="ltr" className="mt-0.5 text-4xl font-black tabular-nums text-amber-100 [unicode-bidi:isolate]">
                {pick.probability}%
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {pick.reasons.map((reason) => (
              <span
                key={reason}
                className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[9px] font-black text-white/65"
              >
                {reason}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <ProbabilityRow
          label={`فوز ${homeName}`}
          value={probabilities.home}
          tone="home"
          isPreferred={pick?.kind === "home"}
        />
        <ProbabilityRow
          label="التعادل"
          value={probabilities.draw}
          tone="draw"
          isPreferred={pick?.kind === "draw"}
        />
        <ProbabilityRow
          label={`فوز ${awayName}`}
          value={probabilities.away}
          tone="away"
          isPreferred={pick?.kind === "away"}
        />
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-[10px] font-bold leading-5 text-white/35">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        عند تساوي نسب الفوز، يحسم العرض بين المنتخبين باستخدام مؤشرات الفورمة والهجوم والدفاع والمواجهات والتقييم العام المتاحة من المزود. الغيابات والتشكيلة لا تُفترض إذا لم تتوفر بياناتها.
      </p>
    </section>
  );
}

function ComparisonRow({
  label,
  home,
  away,
  homeName,
  awayName,
}: {
  label: string;
  home: number | null;
  away: number | null;
  homeName: string;
  awayName: string;
}) {
  if (home == null || away == null) return null;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-3">
      <div className="mb-3 text-center text-[11px] font-black text-white/55">{label}</div>
      <div className="grid grid-cols-2 gap-3" dir="rtl">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="truncate text-[10px] font-black text-sky-100">{homeName}</span>
            <span dir="ltr" className="text-xs font-black text-sky-100 [unicode-bidi:isolate]">
              {Math.round(home)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]" dir="rtl">
            <div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.max(0, Math.min(100, home))}%` }} />
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="truncate text-[10px] font-black text-emerald-100">{awayName}</span>
            <span dir="ltr" className="text-xs font-black text-emerald-100 [unicode-bidi:isolate]">
              {Math.round(away)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]" dir="ltr">
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(0, Math.min(100, away))}%` }} />
          </div>
        </div>
      </div>
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

function getMeetingWinner(
  meeting: Meeting,
  teamDisplayName: (teamId: number, fallback: string) => string,
) {
  if (meeting.homeGoals === meeting.awayGoals) {
    return { label: "تعادل", className: "border-white/10 bg-white/10 text-white/75" };
  }

  const winnerId = meeting.homeGoals > meeting.awayGoals ? meeting.homeTeamId : meeting.awayTeamId;
  const winnerFallback = meeting.homeGoals > meeting.awayGoals ? meeting.homeName : meeting.awayName;
  return {
    label: `فوز ${teamDisplayName(winnerId, winnerFallback)}`,
    className: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
  };
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

  const teamDisplayName = useCallback(
    (teamId: number, fallback: string) => {
      if (!data) return fallback;
      if (teamId === data.providerHomeTeamId) return homeName;
      if (teamId === data.providerAwayTeamId) return awayName;
      return fallback;
    },
    [awayName, data, homeName],
  );

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
                <div className="relative shrink-0 border-b border-white/10 bg-white/[0.055] px-4 py-3">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-300/[0.08] via-transparent to-amber-300/[0.05]" />
                  <div className="relative mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/20 md:hidden" />

                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black text-cyan-100">
                        <History className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>H2H • Match Insights</span>
                      </div>
                      <h2 className="text-lg font-black text-white">المواجهات والإحصائيات</h2>
                      <p className="mt-1 text-[11px] font-medium leading-5 text-slate-400">
                        قراءة مختصرة تساعدك على فهم المواجهة قبل اعتماد توقعك.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white shadow-md shadow-slate-950/15 transition hover:bg-white/20 active:scale-95"
                      aria-label="إغلاق"
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
                  <section className="rounded-[24px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.025] p-4">
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
                      <p className="mt-3 text-xs font-black">جاري تحليل المواجهة...</p>
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
                        <section className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="text-[10px] font-bold text-white/40">آخر مواجهة بين المنتخبين</div>
                              <div className="mt-1 break-words text-sm font-black leading-6 text-white">
                                {meetingTournamentLabel(lastMeeting)}
                              </div>
                            </div>
                            <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black text-white/55">
                              {formatDate(lastMeeting.kickoffAt)}
                            </span>
                          </div>

                          <div className="mt-4 rounded-2xl border border-white/[0.08] bg-black/20 p-3">
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2" dir="rtl">
                              <div className="min-w-0 text-center text-sm font-black text-white">
                                {teamDisplayName(lastMeeting.homeTeamId, lastMeeting.homeName)}
                              </div>
                              <div dir="ltr" className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xl font-black text-white [unicode-bidi:isolate]">
                                {lastMeeting.homeGoals} - {lastMeeting.awayGoals}
                              </div>
                              <div className="min-w-0 text-center text-sm font-black text-white">
                                {teamDisplayName(lastMeeting.awayTeamId, lastMeeting.awayName)}
                              </div>
                            </div>

                            <div className="mt-3 text-center">
                              {(() => {
                                const winner = getMeetingWinner(lastMeeting, teamDisplayName);
                                return (
                                  <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black ${winner.className}`}>
                                    {winner.label}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </section>
                      ) : null}

                      <ProbabilityBlock data={data} homeName={homeName} awayName={awayName} />

                      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-center">
                          <div className="text-[10px] font-bold text-white/40">إجمالي المواجهات</div>
                          <div dir="ltr" className="mt-1 text-xl font-black text-white [unicode-bidi:isolate]">{data.summary.total}</div>
                        </div>
                        <div className="rounded-2xl border border-sky-300/15 bg-sky-300/[0.05] p-3 text-center">
                          <div className="truncate text-[10px] font-bold text-white/40">فوز {homeName}</div>
                          <div dir="ltr" className="mt-1 text-xl font-black text-sky-100 [unicode-bidi:isolate]">{data.summary.homeWins}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-center">
                          <div className="text-[10px] font-bold text-white/40">تعادل</div>
                          <div dir="ltr" className="mt-1 text-xl font-black text-white [unicode-bidi:isolate]">{data.summary.draws}</div>
                        </div>
                        <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.05] p-3 text-center">
                          <div className="truncate text-[10px] font-bold text-white/40">فوز {awayName}</div>
                          <div dir="ltr" className="mt-1 text-xl font-black text-emerald-100 [unicode-bidi:isolate]">{data.summary.awayWins}</div>
                        </div>
                      </section>

                      <section className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-black text-white">آخر 5 مواجهات بينهما</h3>
                          <span dir="ltr" className="text-[10px] font-black text-white/35 [unicode-bidi:isolate]">AVG {data.summary.averageGoals}</span>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-sky-300/10 bg-sky-300/[0.035] p-3">
                            <div className="mb-2 truncate text-xs font-black text-sky-100">{homeName}</div>
                            <FormDots values={data.recent.home} />
                          </div>
                          <div className="rounded-xl border border-emerald-300/10 bg-emerald-300/[0.035] p-3">
                            <div className="mb-2 truncate text-xs font-black text-emerald-100">{awayName}</div>
                            <FormDots values={data.recent.away} />
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-bold text-white/35">
                          <span>W فوز</span>
                          <span>D تعادل</span>
                          <span>L خسارة</span>
                        </div>
                      </section>

                      {data.prediction.comparison ? (
                        <section className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h3 className="text-sm font-black text-white">مقارنة المؤشرات</h3>
                              <p className="mt-1 text-[10px] font-bold text-white/35">
                                الأزرق = {homeName} • الأخضر = {awayName}
                              </p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[9px] font-black text-white/45">
                              كل منتخب له شريط مستقل
                            </span>
                          </div>
                          <div className="space-y-3">
                            <ComparisonRow label="الفورمة" home={data.prediction.comparison.formHome} away={data.prediction.comparison.formAway} homeName={homeName} awayName={awayName} />
                            <ComparisonRow label="الهجوم" home={data.prediction.comparison.attackHome} away={data.prediction.comparison.attackAway} homeName={homeName} awayName={awayName} />
                            <ComparisonRow label="الدفاع" home={data.prediction.comparison.defenceHome} away={data.prediction.comparison.defenceAway} homeName={homeName} awayName={awayName} />
                            <ComparisonRow label="المواجهات" home={data.prediction.comparison.h2hHome} away={data.prediction.comparison.h2hAway} homeName={homeName} awayName={awayName} />
                            <ComparisonRow label="الأهداف" home={data.prediction.comparison.goalsHome} away={data.prediction.comparison.goalsAway} homeName={homeName} awayName={awayName} />
                            <ComparisonRow label="التقييم العام" home={data.prediction.comparison.totalHome} away={data.prediction.comparison.totalAway} homeName={homeName} awayName={awayName} />
                          </div>
                        </section>
                      ) : null}

                      <section className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-black text-white">سجل المواجهات</h3>
                            <p className="mt-1 text-[10px] font-bold leading-5 text-white/35">
                              البطولة والنتيجة والفائز موضحة لكل مواجهة بدون قص النص.
                            </p>
                          </div>
                          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black text-white/55">
                            {data.meetings.length}
                          </span>
                        </div>

                        {visibleMeetings.length ? (
                          <div className="mt-3 space-y-2.5">
                            {visibleMeetings.map((meeting) => {
                              const winner = getMeetingWinner(meeting, teamDisplayName);
                              return (
                                <article key={meeting.fixtureId} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/15 p-3">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="break-words text-[11px] font-black leading-5 text-white/75">
                                        {meetingTournamentLabel(meeting)}
                                      </div>
                                      <div className="mt-0.5 text-[9px] font-bold text-white/35">{formatDate(meeting.kickoffAt)}</div>
                                    </div>
                                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black ${winner.className}`}>
                                      {winner.label}
                                    </span>
                                  </div>

                                  <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2" dir="rtl">
                                    <div className="min-w-0 text-center">
                                      <div className="break-words text-xs font-black leading-5 text-white">
                                        {teamDisplayName(meeting.homeTeamId, meeting.homeName)}
                                      </div>
                                    </div>
                                    <div dir="ltr" className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-base font-black text-white [unicode-bidi:isolate]">
                                      {meeting.homeGoals} - {meeting.awayGoals}
                                    </div>
                                    <div className="min-w-0 text-center">
                                      <div className="break-words text-xs font-black leading-5 text-white">
                                        {teamDisplayName(meeting.awayTeamId, meeting.awayName)}
                                      </div>
                                    </div>
                                  </div>
                                </article>
                              );
                            })}
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
                            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-[11px] font-black text-white/65 transition hover:bg-white/10"
                          >
                            {showAll ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                            {showAll ? "عرض أقل" : `عرض جميع المواجهات (${data.meetings.length})`}
                          </button>
                        ) : null}
                      </section>

                      {data.warnings.length ? (
                        <div className="space-y-1 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-3 text-[10px] font-bold leading-5 text-amber-50/75">
                          {data.warnings.map((warning) => (
                            <p key={warning}>• {warning}</p>
                          ))}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-[9px] font-bold text-white/25">
                        <span className="inline-flex items-center gap-1.5">
                          <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                          المصدر: API-FOOTBALL
                        </span>
                        <span>{relativeUpdated(data.fetchedAt)}</span>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="shrink-0 border-t border-white/10 bg-slate-950/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-amber-300 via-yellow-200 to-cyan-300 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-slate-950/25 transition hover:brightness-105 active:scale-[0.99]"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    <span>إغلاق القائمة</span>
                  </button>
                </div>
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
        className={`group inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-amber-300/30 bg-gradient-to-l from-amber-300/[0.16] via-cyan-300/[0.11] to-emerald-300/[0.09] font-black text-white shadow-md shadow-slate-950/20 transition hover:border-amber-200/50 hover:brightness-110 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 ${
          compact ? "w-full px-3 text-[11px]" : "w-full px-4 text-xs"
        }`}
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-amber-100 transition group-hover:scale-105">
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
        </span>
        <span>المواجهات والإحصائيات</span>
        <Sparkles className="h-3.5 w-3.5 text-amber-200" aria-hidden="true" />
      </button>
      {modal}
    </>
  );
}
