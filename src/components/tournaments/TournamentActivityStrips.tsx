"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { BadgeCheck, Clock3, List, Sparkles, X } from "lucide-react";
import TeamFlag from "@/components/TeamFlag";

type ActivityEvent = {
  id: string;
  type: "prediction" | "exact";
  tournamentId: string;
  matchId: string;
  userName: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamFlagCode: string;
  awayTeamFlagCode: string;
  resultHomeScore: number | null;
  resultAwayScore: number | null;
  createdAt: number;
};

type ActivityKind = "predictions" | "exactHits";

const DATE_LOCALE = "ar-SA-u-ca-gregory-nu-latn";

function formatTime(timestamp: number) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat(DATE_LOCALE, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Riyadh",
  }).format(new Date(timestamp));
}


function ActivityInline({ item, kind }: { item: ActivityEvent; kind: ActivityKind }) {
  const exact = kind === "exactHits";
  return (
    <span dir="rtl" className="inline-flex shrink-0 items-center gap-1.5">
      <strong className={exact ? "text-amber-200" : "text-emerald-200"}>
        {item.userName}
      </strong>
      <span className="text-white/45">{exact ? "·" : "توقّع"}</span>
      {exact && item.resultHomeScore != null && item.resultAwayScore != null ? (
        <span
          dir="ltr"
          className="rounded-md border border-amber-300/15 bg-amber-300/10 px-1.5 py-0.5 font-black text-amber-100 [unicode-bidi:isolate]"
        >
          {item.resultHomeScore}-{item.resultAwayScore}
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1">
        <TeamFlag code={item.homeTeamFlagCode || undefined} name={item.homeTeamName} size="xs" />
        <span>{item.homeTeamName}</span>
        <span className="text-white/30">×</span>
        <TeamFlag code={item.awayTeamFlagCode || undefined} name={item.awayTeamName} size="xs" />
        <span>{item.awayTeamName}</span>
      </span>
    </span>
  );
}


function sameActivityList(a: ActivityEvent[], b: ActivityEvent[]) {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index];
    const right = b[index];
    if (
      left.id !== right.id ||
      left.createdAt !== right.createdAt ||
      left.userName !== right.userName ||
      left.homeTeamName !== right.homeTeamName ||
      left.awayTeamName !== right.awayTeamName ||
      left.homeTeamFlagCode !== right.homeTeamFlagCode ||
      left.awayTeamFlagCode !== right.awayTeamFlagCode ||
      left.resultHomeScore !== right.resultHomeScore ||
      left.resultAwayScore !== right.resultAwayScore
    ) {
      return false;
    }
  }
  return true;
}

function getTickerRepeatCount(count: number) {
  if (count <= 1) return 16;
  if (count <= 3) return 12;
  if (count <= 6) return 8;
  if (count <= 12) return 5;
  if (count <= 25) return 3;
  return 2;
}

function ActivityStrip({
  kind,
  items,
  onOpen,
}: {
  kind: ActivityKind;
  items: ActivityEvent[];
  onOpen: () => void;
}) {
  const exact = kind === "exactHits";
  const label = exact ? "جابها صح" : "آخر التوقعات";
  const emptyTickerText = exact ? "لا توجد نتائج حاليا" : "لا توجد توقعات حاليا";
  const groupRef = useRef<HTMLSpanElement | null>(null);
  const [groupWidth, setGroupWidth] = useState(0);

  // نفس أسلوب شريط «آخر التوقعات» القديم في منصة كأس العالم:
  // مجموعة طويلة + نسخة مطابقة منها، ثم تحريك نصف المسار فقط.
  // عند نهاية الدورة تكون النسخة التالية في نفس الموضع تمامًا، لذلك لا توجد
  // قفزة أو لحظة اختفاء بين دورة وأخرى.
  const tickerEntries = useMemo(
    () =>
      items.length
        ? items.map((item) => ({ id: item.id, item }))
        : [{ id: `${kind}-empty`, item: null as ActivityEvent | null }],
    [items, kind],
  );

  const repeatedEntries = useMemo(() => {
    const repeatCount = getTickerRepeatCount(tickerEntries.length);
    return Array.from({ length: repeatCount }, (_, repeatIndex) =>
      tickerEntries.map((entry, entryIndex) => ({
        ...entry,
        renderKey: `${repeatIndex}-${entryIndex}-${entry.id}`,
      })),
    ).flat();
  }, [tickerEntries]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const measure = () => {
      const nextWidth = group.scrollWidth;
      if (nextWidth > 0) setGroupWidth(nextWidth);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(group);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [repeatedEntries]);

  // سرعة بصرية ثابتة مهما زاد أو قل عدد العناصر.
  // المدة تتغير مع عرض المجموعة، أما السرعة نفسها فتبقى ثابتة.
  const pixelsPerSecond = 58;
  const duration = Math.max(8, (groupWidth || 1800) / pixelsPerSecond);
  const tickerStyle = {
    "--tournament-ticker-duration": `${duration}s`,
  } as CSSProperties;

  const renderEntries = (copy: "a" | "b") =>
    repeatedEntries.map((entry) => (
      <span
        key={`${copy}-${entry.renderKey}`}
        dir="rtl"
        className="inline-flex shrink-0 items-center gap-2"
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            exact ? "bg-amber-300" : "bg-emerald-300"
          }`}
        />
        {entry.item ? (
          <ActivityInline item={entry.item} kind={kind} />
        ) : (
          <span className={exact ? "text-amber-100/70" : "text-emerald-100/70"}>
            {emptyTickerText}
          </span>
        )}
      </span>
    ));

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex min-h-[44px] w-full items-stretch overflow-hidden border text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tournament-primary)] ${
        exact
          ? "border-amber-300/15 bg-amber-300/[0.065]"
          : "border-emerald-300/15 bg-emerald-300/[0.055]"
      }`}
      aria-label={`${label} — اضغط لعرض القائمة`}
    >
      <span
        className={`relative z-10 inline-flex shrink-0 items-center gap-1.5 border-l px-3 text-[11px] font-black sm:px-4 sm:text-xs ${
          exact
            ? "border-amber-300/20 bg-[#17223b] text-amber-200"
            : "border-emerald-300/20 bg-[#0b2630] text-emerald-100"
        }`}
      >
        {exact ? (
          <BadgeCheck className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        )}
        {label}
      </span>

      <span
        dir="ltr"
        className="tournament-activity-wrapper relative flex min-w-0 flex-1 items-center overflow-hidden"
      >
        <span
          className="tournament-activity-marquee flex w-max min-w-max items-center whitespace-nowrap text-[11px] font-bold text-white/78 sm:text-xs"
          style={tickerStyle}
          aria-hidden="true"
        >
          <span
            ref={groupRef}
            className="tournament-activity-group flex flex-none items-center gap-8 px-4"
          >
            {renderEntries("a")}
          </span>
          <span className="tournament-activity-group flex flex-none items-center gap-8 px-4">
            {renderEntries("b")}
          </span>
        </span>
      </span>

      <span className="inline-flex shrink-0 items-center border-r border-white/[0.06] px-2 text-white/35 transition group-hover:text-white/70">
        <List className="h-4 w-4" aria-hidden="true" />
      </span>
    </button>
  );
}

export default function TournamentActivityStrips({
  tournamentId,
  tournamentName = "البطولة",
}: {
  tournamentId: string;
  tournamentName?: string;
}) {
  const [predictions, setPredictions] = useState<ActivityEvent[]>([]);
  const [exactHits, setExactHits] = useState<ActivityEvent[]>([]);
  const [openKind, setOpenKind] = useState<ActivityKind | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/tournaments/activity?tournamentId=${encodeURIComponent(tournamentId)}`,
        { cache: "no-store" },
      );
      if (!response.ok) return;
      const data = (await response.json()) as {
        predictions?: ActivityEvent[];
        exactHits?: ActivityEvent[];
      };
      const nextPredictions = Array.isArray(data.predictions) ? data.predictions : [];
      const nextExactHits = Array.isArray(data.exactHits) ? data.exactHits : [];
      setPredictions((current) => (sameActivityList(current, nextPredictions) ? current : nextPredictions));
      setExactHits((current) => (sameActivityList(current, nextExactHits) ? current : nextExactHits));
    } catch {
      // النشاط إضافي للواجهة ولا يجب أن يعطل صفحة البطولة.
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 20_000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!openKind) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenKind(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openKind]);

  const activeItems = useMemo(
    () => (openKind === "exactHits" ? exactHits : predictions),
    [openKind, exactHits, predictions],
  );
  const activeTitle = openKind === "exactHits" ? "جابها صح" : "آخر التوقعات";

  return (
    <>
      <section
        aria-label={`نشاط ${tournamentName}`}
        className="border-b border-white/[0.08] bg-[var(--tournament-background)]/95"
      >
        <div className="mx-auto max-w-7xl overflow-hidden px-3 py-2 sm:px-4 md:px-6">
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/15 shadow-lg shadow-black/10">
            <ActivityStrip
              kind="predictions"
              items={loading ? [] : predictions}
              onOpen={() => setOpenKind("predictions")}
            />
            <ActivityStrip
              kind="exactHits"
              items={loading ? [] : exactHits}
              onOpen={() => setOpenKind("exactHits")}
            />
          </div>
        </div>
      </section>

      {openKind ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpenKind(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={activeTitle}
            className="max-h-[78dvh] w-full max-w-2xl overflow-hidden rounded-t-[28px] border border-white/12 bg-[#071a2b] shadow-2xl sm:rounded-[28px]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <h2 className="text-base font-black text-white">{activeTitle}</h2>
                <p className="mt-0.5 text-[11px] font-semibold text-white/45">
                  {openKind === "exactHits"
                    ? "التوقعات المطابقة بعد اعتماد النتيجة واحتساب المباراة."
                    : "نعرض اسم العضو والمباراة فقط، بدون كشف نتيجة توقعه."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenKind(null)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="max-h-[62dvh] overflow-y-auto p-3 sm:p-4">
              {activeItems.length ? (
                <div className="space-y-2">
                  {activeItems.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.045] p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong
                          className={`text-sm font-black ${
                            openKind === "exactHits" ? "text-amber-200" : "text-emerald-200"
                          }`}
                        >
                          {item.userName}
                        </strong>
                        {openKind === "exactHits" &&
                        item.resultHomeScore != null &&
                        item.resultAwayScore != null ? (
                          <span
                            dir="ltr"
                            className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-sm font-black text-amber-100 [unicode-bidi:isolate]"
                          >
                            {item.resultHomeScore} - {item.resultAwayScore}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 inline-flex flex-wrap items-center gap-1.5 text-xs font-bold text-white/70">
                        <TeamFlag code={item.homeTeamFlagCode || undefined} name={item.homeTeamName} size="sm" />
                        <span>{item.homeTeamName}</span>
                        <span className="text-white/30">×</span>
                        <TeamFlag code={item.awayTeamFlagCode || undefined} name={item.awayTeamName} size="sm" />
                        <span>{item.awayTeamName}</span>
                      </p>
                      <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/35">
                        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatTime(item.createdAt)}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center text-sm font-semibold text-white/45">
                  لا توجد عناصر لعرضها حتى الآن.
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
