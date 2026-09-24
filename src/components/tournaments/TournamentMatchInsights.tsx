"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  History,
  Info,
  Loader2,
  Sparkles,
  Swords,
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

const DATE_LOCALE = "ar-SA-u-ca-gregory-nu-latn";

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
  if (!values.length) return <span className="text-[11px] font-bold text-white/35">لا توجد بيانات</span>;
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

function getProbabilityLeader(
  data: MatchInsights["probabilities"],
  homeName: string,
  awayName: string,
) {
  if (!data) {
    return {
      label: "لا توجد أفضلية مؤكدة",
      tone: "neutral" as const,
      team: "",
      value: null as number | null,
      badge: "بيانات غير مكتملة",
    };
  }

  const highest = Math.max(data.home, data.draw, data.away);
  const values = [data.home, data.draw, data.away].sort((a, b) => b - a);
  const gap = values[0] - (values[1] ?? 0);

  if (highest === data.draw) {
    return {
      label: "المواجهة متقاربة",
      tone: "neutral" as const,
      team: "التعادل",
      value: data.draw,
      badge: gap <= 7 ? "متقاربان" : "تعادل مرجّح",
    };
  }

  const team = highest === data.home ? homeName : awayName;
  return {
    label: `أفضلية ${team}`,
    tone: highest === data.home ? ("home" as const) : ("away" as const),
    team,
    value: highest,
    badge: gap >= 15 ? "أفضلية واضحة" : gap >= 7 ? "أفضلية جيدة" : "أفضلية طفيفة",
  };
}

function ProbabilityBlock({
  data,
  homeName,
  awayName,
}: {
  data: MatchInsights["probabilities"];
  homeName: string;
  awayName: string;
}) {
  if (!data) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4 text-center text-xs font-bold text-white/45">
        لا توجد نسبة تقديرية متاحة لهذه المواجهة حاليًا.
      </div>
    );
  }

  const leader = getProbabilityLeader(data, homeName, awayName);
  const leaderTone =
    leader.tone === "home"
      ? "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-50"
      : leader.tone === "away"
        ? "border-sky-300/20 bg-sky-300/[0.08] text-sky-50"
        : "border-white/10 bg-white/[0.04] text-white";

  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--tournament-accent)]" aria-hidden="true" />
            <h3 className="text-sm font-black">احتمالات المباراة</h3>
          </div>
          <p className="mt-1 text-[10px] font-bold text-white/40">
            {data.source === "api_prediction"
              ? "نسب تقديرية من مزود البيانات مبنية على الأداء والمواجهات السابقة ومؤشرات أخرى"
              : "تقدير تاريخي مبني على نتائج المواجهات السابقة فقط"}
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black text-white/60">
          {leader.badge}
        </span>
      </div>

      <div className={`mt-4 rounded-[20px] border p-4 ${leaderTone}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold text-white/55">أوضح احتمال متاح</div>
            <div className="mt-1 text-lg font-black sm:text-xl">{leader.label}</div>
          </div>
          <div className="text-left">
            <div className="text-[10px] font-bold text-white/55">نسبة الترجيح</div>
            <div dir="ltr" className="mt-1 text-3xl font-black tabular-nums [unicode-bidi:isolate]">
              {leader.value ?? 0}%
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-[10px] font-black text-white/60" dir="ltr">
        <div className="flex items-center gap-2 text-emerald-100">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="max-w-[100px] truncate">{homeName}</span>
        </div>
        <div className="flex items-center gap-2 text-white/70">
          <span className="h-2.5 w-2.5 rounded-full bg-white/45" />
          <span>تعادل</span>
        </div>
        <div className="flex items-center gap-2 text-sky-100">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
          <span className="max-w-[100px] truncate">{awayName}</span>
        </div>
      </div>

      <div className="mt-2 overflow-hidden rounded-full bg-white/5" dir="ltr" aria-label="توزيع الاحتمالات">
        <div className="flex h-3 w-full overflow-hidden rounded-full">
          <div className="bg-emerald-400" style={{ width: `${data.home}%` }} />
          <div className="bg-white/35" style={{ width: `${data.draw}%` }} />
          <div className="bg-sky-400" style={{ width: `${data.away}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-3 text-center">
          <div className="truncate text-[10px] font-bold text-white/45">{homeName}</div>
          <div dir="ltr" className="mt-1 text-2xl font-black text-emerald-100 [unicode-bidi:isolate]">{data.home}%</div>
          <div className="mt-1 text-[10px] font-bold text-white/40">احتمال الفوز</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
          <div className="text-[10px] font-bold text-white/45">تعادل</div>
          <div dir="ltr" className="mt-1 text-2xl font-black text-white [unicode-bidi:isolate]">{data.draw}%</div>
          <div className="mt-1 text-[10px] font-bold text-white/40">احتمال المباراة</div>
        </div>
        <div className="rounded-2xl border border-sky-300/15 bg-sky-300/[0.06] px-3 py-3 text-center">
          <div className="truncate text-[10px] font-bold text-white/45">{awayName}</div>
          <div dir="ltr" className="mt-1 text-2xl font-black text-sky-100 [unicode-bidi:isolate]">{data.away}%</div>
          <div className="mt-1 text-[10px] font-bold text-white/40">احتمال الفوز</div>
        </div>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-[10px] font-bold leading-5 text-white/35">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        هذه نسب تقديرية للمساعدة على قراءة المواجهة وليست ضمانًا لنتيجة المباراة.
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
  const sum = home + away;
  if (sum <= 0) return null;
  const homeDisplay = Math.round(home);
  const awayDisplay = Math.round(away);
  const normalizedHome = Math.round((home / sum) * 100);
  const normalizedAway = Math.max(0, 100 - normalizedHome);

  return (
    <div className="rounded-2xl border border-white/8 bg-black/15 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-black text-white/55">
        <span className="truncate text-sky-100">{awayName}</span>
        <span className="text-white/45">{label}</span>
        <span className="truncate text-emerald-100">{homeName}</span>
      </div>

      <div className="grid grid-cols-[52px_1fr_52px] items-center gap-2" dir="ltr">
        <span className="text-left text-[11px] font-black text-emerald-100 [unicode-bidi:isolate]">{homeDisplay}%</span>
        <div className="overflow-hidden rounded-full bg-white/5">
          <div className="flex h-2.5 w-full">
            <span className="bg-emerald-400/90" style={{ width: `${normalizedHome}%` }} />
            <span className="bg-sky-400/90" style={{ width: `${normalizedAway}%` }} />
          </div>
        </div>
        <span className="text-right text-[11px] font-black text-sky-100 [unicode-bidi:isolate]">{awayDisplay}%</span>
      </div>
    </div>
  );
}

function meetingTournamentLabel(meeting: Meeting) {
  const parts = [meeting.competition, meeting.country].filter(Boolean);
  return parts.length ? parts.join(" • ") : "مباراة دولية";
}

function resultTone(meeting: Meeting, teamId: number) {
  const isHomeTeam = teamId === meeting.homeTeamId;
  const teamGoals = isHomeTeam ? meeting.homeGoals : meeting.awayGoals;
  const rivalGoals = isHomeTeam ? meeting.awayGoals : meeting.homeGoals;
  if (teamGoals > rivalGoals) return "win";
  if (teamGoals < rivalGoals) return "loss";
  return "draw";
}

function toneLabel(tone: "win" | "draw" | "loss") {
  if (tone === "win") return { text: "فوز", className: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" };
  if (tone === "loss") return { text: "خسارة", className: "border-red-300/20 bg-red-300/10 text-red-100" };
  return { text: "تعادل", className: "border-white/10 bg-white/10 text-white/75" };
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
  const lastMeetingLabel = lastMeeting ? meetingTournamentLabel(lastMeeting) : null;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-[var(--tournament-accent)]/35 bg-gradient-to-r from-[var(--tournament-primary)]/18 via-[var(--tournament-accent)]/14 to-cyan-400/15 font-black text-white transition hover:border-[var(--tournament-accent)]/60 hover:from-[var(--tournament-primary)]/25 hover:to-cyan-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tournament-accent)]/70 shadow-[0_12px_28px_rgba(15,23,42,0.28)] ${
          compact ? "w-full px-3 text-[11px]" : "w-full px-4 text-xs"
        }`}
      >
        <BarChart3 className="h-4 w-4 text-[var(--tournament-accent)]" aria-hidden="true" />
        <span>المواجهات والإحصائيات</span>
        <Sparkles className="h-3.5 w-3.5 text-yellow-200/90" aria-hidden="true" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[260] flex items-end justify-center bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`إحصائيات ${homeName} و${awayName}`}
            className="flex h-[100dvh] w-full flex-col overflow-hidden border border-white/10 bg-[#07131a] shadow-2xl shadow-black/60 sm:h-auto sm:max-h-[92dvh] sm:max-w-3xl sm:rounded-[30px] rounded-none"
          >
            <header className="sticky top-0 z-10 border-b border-white/10 bg-[#07131a]/95 px-4 py-3.5 backdrop-blur sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-black text-[var(--tournament-primary)]">
                    <History className="h-4 w-4" aria-hidden="true" />
                    H2H • Match Insights
                  </div>
                  <h2 className="mt-1 truncate text-base font-black sm:text-lg">المواجهات والإحصائيات</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="إغلاق"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(104px,calc(env(safe-area-inset-bottom)+28px))] pt-4 sm:px-5 sm:pb-6">
              <div className="rounded-[24px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.03] p-4 shadow-lg shadow-black/10">
                <div className="flex items-center justify-between gap-3" dir="ltr">
                  <div className="min-w-0 flex-1 text-center">
                    <TeamFlag code={homeFlagCode} name={homeName} size="lg" />
                    <div className="mt-2 truncate text-sm font-black">{homeName}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black text-white/45">
                    <Swords className="mx-auto h-4 w-4 text-[var(--tournament-accent)]" aria-hidden="true" />
                    <div className="mt-1">VS</div>
                  </div>
                  <div className="min-w-0 flex-1 text-center">
                    <TeamFlag code={awayFlagCode} name={awayName} size="lg" />
                    <div className="mt-2 truncate text-sm font-black">{awayName}</div>
                  </div>
                </div>

                {lastMeeting ? (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3">
                      <div className="text-[10px] font-bold text-white/45">آخر مواجهة بين المنتخبين</div>
                      <div className="mt-1 text-sm font-black">{lastMeetingLabel}</div>
                      <div className="mt-1 text-[10px] font-bold text-white/40">{formatDate(lastMeeting.kickoffAt)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3" dir="ltr">
                      <div className="text-[10px] font-bold text-white/45">نتيجتها</div>
                      <div className="mt-1 text-xl font-black [unicode-bidi:isolate]">
                        {lastMeeting.homeGoals} - {lastMeeting.awayGoals}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {loading ? (
                <div className="py-12 text-center text-white/55">
                  <Loader2 className="mx-auto h-7 w-7 animate-spin text-[var(--tournament-primary)]" aria-hidden="true" />
                  <p className="mt-3 text-xs font-black">جاري تحليل المواجهة...</p>
                </div>
              ) : error ? (
                <div role="alert" className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] p-4 text-center text-xs font-black leading-6 text-amber-50">
                  {error}
                  <button
                    type="button"
                    onClick={() => {
                      setData(null);
                      setError("");
                      void load();
                    }}
                    className="mx-auto mt-3 flex min-h-[40px] items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-[11px] text-white"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              ) : data ? (
                <div className="mt-4 space-y-4">
                  <ProbabilityBlock data={data.probabilities} homeName={homeName} awayName={awayName} />

                  <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-center">
                      <div className="text-[10px] font-bold text-white/40">إجمالي المواجهات</div>
                      <div dir="ltr" className="mt-1 text-xl font-black [unicode-bidi:isolate]">{data.summary.total}</div>
                    </div>
                    <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.05] p-3 text-center">
                      <div className="truncate text-[10px] font-bold text-white/40">فوز {homeName}</div>
                      <div dir="ltr" className="mt-1 text-xl font-black text-emerald-100 [unicode-bidi:isolate]">{data.summary.homeWins}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-center">
                      <div className="text-[10px] font-bold text-white/40">تعادل</div>
                      <div dir="ltr" className="mt-1 text-xl font-black [unicode-bidi:isolate]">{data.summary.draws}</div>
                    </div>
                    <div className="rounded-2xl border border-sky-300/15 bg-sky-300/[0.05] p-3 text-center">
                      <div className="truncate text-[10px] font-bold text-white/40">فوز {awayName}</div>
                      <div dir="ltr" className="mt-1 text-xl font-black text-sky-100 [unicode-bidi:isolate]">{data.summary.awayWins}</div>
                    </div>
                  </section>

                  <section className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black">آخر 5 مواجهات بينهما</h3>
                      <span dir="ltr" className="text-[10px] font-black text-white/35 [unicode-bidi:isolate]">AVG {data.summary.averageGoals}</span>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/[0.07] bg-black/15 p-3">
                        <div className="mb-2 truncate text-xs font-black">{homeName}</div>
                        <FormDots values={data.recent.home} />
                      </div>
                      <div className="rounded-xl border border-white/[0.07] bg-black/15 p-3">
                        <div className="mb-2 truncate text-xs font-black">{awayName}</div>
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
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-black">مقارنة المؤشرات</h3>
                        <div className="flex items-center gap-2 text-[10px] font-black">
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-emerald-100">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            {homeName}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-sky-300/20 bg-sky-300/10 px-2 py-1 text-sky-100">
                            <span className="h-2 w-2 rounded-full bg-sky-400" />
                            {awayName}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <ComparisonRow label="الفورمة" home={data.prediction.comparison.formHome} away={data.prediction.comparison.formAway} homeName={homeName} awayName={awayName} />
                        <ComparisonRow label="الهجوم" home={data.prediction.comparison.attackHome} away={data.prediction.comparison.attackAway} homeName={homeName} awayName={awayName} />
                        <ComparisonRow label="الدفاع" home={data.prediction.comparison.defenceHome} away={data.prediction.comparison.defenceAway} homeName={homeName} awayName={awayName} />
                        <ComparisonRow label="المواجهات" home={data.prediction.comparison.h2hHome} away={data.prediction.comparison.h2hAway} homeName={homeName} awayName={awayName} />
                      </div>
                    </section>
                  ) : null}

                  <section className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black">سجل المواجهات</h3>
                        <p className="mt-1 text-[10px] font-bold text-white/35">
                          نعرض هنا المواجهات التاريخية مع ذكر البطولة أو المناسبة لكل مباراة.
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black text-white/55">
                        {data.meetings.length}
                      </span>
                    </div>

                    {visibleMeetings.length ? (
                      <div className="mt-3 space-y-2">
                        {visibleMeetings.map((meeting) => {
                          const homeTone = toneLabel(resultTone(meeting, data.providerHomeTeamId));
                          const awayTone = toneLabel(resultTone(meeting, data.providerAwayTeamId));
                          return (
                            <article
                              key={meeting.fixtureId}
                              className="overflow-hidden rounded-2xl border border-white/[0.07] bg-black/15 px-3 py-3 sm:px-4"
                            >
                              <div className="flex items-center justify-between gap-3" dir="ltr">
                                <div className="min-w-0 flex-1 text-center sm:text-right" dir="rtl">
                                  <div className="truncate text-sm font-black">{teamDisplayName(meeting.homeTeamId, meeting.homeName)}</div>
                                  <div className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black ${homeTone.className}`}>{homeTone.text}</div>
                                </div>
                                <div className="shrink-0 text-center">
                                  <div dir="ltr" className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-base font-black [unicode-bidi:isolate]">
                                    {meeting.homeGoals} - {meeting.awayGoals}
                                  </div>
                                  <div className="mt-1 text-[9px] font-bold text-white/35">{formatDate(meeting.kickoffAt)}</div>
                                </div>
                                <div className="min-w-0 flex-1 text-center sm:text-left" dir="rtl">
                                  <div className="truncate text-sm font-black">{teamDisplayName(meeting.awayTeamId, meeting.awayName)}</div>
                                  <div className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black ${awayTone.className}`}>{awayTone.text}</div>
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-white/45">
                                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/70">
                                  {meetingTournamentLabel(meeting)}
                                </span>
                                <span className="text-white/35">Fixture #{meeting.fixtureId}</span>
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
                        className="mt-3 inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-[11px] font-black text-white/65 transition hover:bg-white/10"
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
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
