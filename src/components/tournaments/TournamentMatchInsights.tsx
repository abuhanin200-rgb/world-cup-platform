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
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-center text-xs font-bold text-white/45">
        لا توجد نسبة تقديرية متاحة لهذه المواجهة حاليًا.
      </div>
    );
  }

  const highest = Math.max(data.home, data.draw, data.away);
  const leader = highest === data.home ? homeName : highest === data.away ? awayName : "التعادل";

  return (
    <section className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--tournament-accent)]" aria-hidden="true" />
            <h3 className="text-sm font-black">احتمالات المباراة</h3>
          </div>
          <p className="mt-1 text-[10px] font-bold text-white/40">
            {data.source === "api_prediction"
              ? "نموذج مزود البيانات يجمع الأداء والمواجهات السابقة ومؤشرات أخرى"
              : "تقدير تاريخي مبني على نتائج المواجهات السابقة فقط"}
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black text-white/55">
          الأفضلية: {leader}
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-full bg-white/5" dir="ltr" aria-label="توزيع الاحتمالات">
        <div className="flex h-2.5 w-full">
          <div className="bg-emerald-400" style={{ width: `${data.home}%` }} />
          <div className="bg-white/35" style={{ width: `${data.draw}%` }} />
          <div className="bg-sky-400" style={{ width: `${data.away}%` }} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] px-2 py-2.5">
          <div className="truncate text-[10px] font-bold text-white/45">{homeName}</div>
          <div dir="ltr" className="mt-1 text-lg font-black text-emerald-100 [unicode-bidi:isolate]">{data.home}%</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2.5">
          <div className="text-[10px] font-bold text-white/45">تعادل</div>
          <div dir="ltr" className="mt-1 text-lg font-black text-white [unicode-bidi:isolate]">{data.draw}%</div>
        </div>
        <div className="rounded-xl border border-sky-300/15 bg-sky-300/[0.06] px-2 py-2.5">
          <div className="truncate text-[10px] font-bold text-white/45">{awayName}</div>
          <div dir="ltr" className="mt-1 text-lg font-black text-sky-100 [unicode-bidi:isolate]">{data.away}%</div>
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
}: {
  label: string;
  home: number | null;
  away: number | null;
}) {
  if (home == null || away == null) return null;
  const sum = home + away;
  if (sum <= 0) return null;
  const normalizedHome = Math.round((home / sum) * 100);
  const normalizedAway = Math.max(0, 100 - normalizedHome);

  return (
    <div className="grid grid-cols-[42px_1fr_42px] items-center gap-2">
      <span dir="ltr" className="text-left text-[11px] font-black text-emerald-100 [unicode-bidi:isolate]">{Math.round(home)}%</span>
      <div>
        <div className="mb-1 text-center text-[10px] font-bold text-white/45">{label}</div>
        <div dir="ltr" className="flex h-1.5 overflow-hidden rounded-full bg-white/5">
          <span className="bg-emerald-400/80" style={{ width: `${normalizedHome}%` }} />
          <span className="bg-sky-400/80" style={{ width: `${normalizedAway}%` }} />
        </div>
      </div>
      <span dir="ltr" className="text-right text-[11px] font-black text-sky-100 [unicode-bidi:isolate]">{Math.round(away)}%</span>
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

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] font-black text-white/70 transition hover:border-[var(--tournament-primary)]/30 hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tournament-primary)] ${
          compact ? "w-full px-3 text-[11px]" : "w-full px-4 text-xs"
        }`}
      >
        <BarChart3 className="h-4 w-4 text-[var(--tournament-accent)]" aria-hidden="true" />
        المواجهات والإحصائيات
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`إحصائيات ${homeName} و${awayName}`}
            className="max-h-[92dvh] w-full max-w-2xl overflow-hidden rounded-t-[30px] border border-white/10 bg-[#07131a] shadow-2xl shadow-black/60 sm:rounded-[30px]"
          >
            <header className="flex items-center justify-between border-b border-white/10 px-4 py-3.5 sm:px-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-black text-[var(--tournament-primary)]">
                  <History className="h-4 w-4" aria-hidden="true" />
                  HEAD TO HEAD
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
            </header>

            <div className="max-h-[calc(92dvh-72px)] overflow-y-auto overscroll-contain px-3 pb-[max(18px,env(safe-area-inset-bottom))] pt-4 sm:px-5">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                <div className="min-w-0 text-center">
                  <TeamFlag code={homeFlagCode} name={homeName} size="lg" />
                  <div className="mt-2 truncate text-sm font-black">{homeName}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black text-white/35">VS</div>
                <div className="min-w-0 text-center">
                  <TeamFlag code={awayFlagCode} name={awayName} size="lg" />
                  <div className="mt-2 truncate text-sm font-black">{awayName}</div>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-white/55">
                  <Loader2 className="mx-auto h-7 w-7 animate-spin text-[var(--tournament-primary)]" aria-hidden="true" />
                  <p className="mt-3 text-xs font-black">جاري تحليل المواجهة...</p>
                </div>
              ) : error ? (
                <div role="alert" className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] p-4 text-center text-xs font-black leading-6 text-amber-50">
                  {error}
                  <button type="button" onClick={() => { setData(null); setError(""); void load(); }} className="mx-auto mt-3 flex min-h-[40px] items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-[11px] text-white">إعادة المحاولة</button>
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

                  <section className="rounded-[22px] border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black">آخر 5 مواجهات بينهما</h3>
                      <span dir="ltr" className="text-[10px] font-black text-white/35 [unicode-bidi:isolate]">AVG {data.summary.averageGoals}</span>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/15 p-3">
                        <span className="truncate text-xs font-black">{homeName}</span>
                        <FormDots values={data.recent.home} />
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/15 p-3">
                        <span className="truncate text-xs font-black">{awayName}</span>
                        <FormDots values={data.recent.away} />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-bold text-white/35">
                      <span>W فوز</span><span>D تعادل</span><span>L خسارة</span>
                    </div>
                  </section>

                  {data.prediction.comparison ? (
                    <section className="rounded-[22px] border border-white/10 bg-white/[0.035] p-4">
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-black">مقارنة المؤشرات</h3>
                        <div className="flex min-w-0 items-center gap-3 text-[10px] font-black">
                          <span className="truncate text-emerald-100">{homeName}</span>
                          <span className="truncate text-sky-100">{awayName}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <ComparisonRow label="الفورمة" home={data.prediction.comparison.formHome} away={data.prediction.comparison.formAway} />
                        <ComparisonRow label="الهجوم" home={data.prediction.comparison.attackHome} away={data.prediction.comparison.attackAway} />
                        <ComparisonRow label="الدفاع" home={data.prediction.comparison.defenceHome} away={data.prediction.comparison.defenceAway} />
                        <ComparisonRow label="المواجهات" home={data.prediction.comparison.h2hHome} away={data.prediction.comparison.h2hAway} />
                      </div>
                    </section>
                  ) : null}

                  <section className="rounded-[22px] border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black">سجل المواجهات</h3>
                        <p className="mt-1 text-[10px] font-bold text-white/35">كل المواجهات التاريخية المتاحة لدى مزود البيانات</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black text-white/55">{data.meetings.length}</span>
                    </div>

                    {visibleMeetings.length ? (
                      <div className="mt-3 divide-y divide-white/[0.07] overflow-hidden rounded-2xl border border-white/[0.07] bg-black/15">
                        {visibleMeetings.map((meeting) => (
                          <div key={meeting.fixtureId} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-3 text-xs">
                            <div className="min-w-0 text-right">
                              <div className="truncate font-black">{teamDisplayName(meeting.homeTeamId, meeting.homeName)}</div>
                              <div className="mt-1 truncate text-[9px] font-bold text-white/30">{meeting.competition || "مباراة دولية"}</div>
                            </div>
                            <div className="text-center">
                              <div dir="ltr" className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-sm font-black [unicode-bidi:isolate]">{meeting.homeGoals} - {meeting.awayGoals}</div>
                              <div className="mt-1 text-[9px] font-bold text-white/30">{formatDate(meeting.kickoffAt)}</div>
                            </div>
                            <div className="min-w-0 text-left">
                              <div className="truncate font-black">{teamDisplayName(meeting.awayTeamId, meeting.awayName)}</div>
                              <div className="mt-1 truncate text-[9px] font-bold text-white/30">{meeting.country || ""}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl border border-white/[0.07] bg-black/15 px-3 py-6 text-center text-xs font-bold text-white/40">لا توجد مواجهات سابقة متاحة.</div>
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
                      {data.warnings.map((warning) => <p key={warning}>• {warning}</p>)}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-3 px-1 text-[9px] font-bold text-white/25">
                    <span>المصدر: API-FOOTBALL</span>
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
