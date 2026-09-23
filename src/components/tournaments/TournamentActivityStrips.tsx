"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, Clock3, List, Sparkles, X } from "lucide-react";
import { GULF_CUP_27_TOURNAMENT_ID } from "@/domain/tournaments";

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

function matchLabel(item: ActivityEvent) {
  return `${item.homeTeamName} × ${item.awayTeamName}`;
}

function activityText(item: ActivityEvent, kind: ActivityKind) {
  if (kind === "exactHits") {
    const score =
      item.resultHomeScore != null && item.resultAwayScore != null
        ? `${item.resultHomeScore}-${item.resultAwayScore}`
        : "بالملي";
    return `${item.userName} · ${score} · ${matchLabel(item)}`;
  }
  return `${item.userName} توقّع مباراة ${matchLabel(item)}`;
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
      left.resultHomeScore !== right.resultHomeScore ||
      left.resultAwayScore !== right.resultAwayScore
    ) {
      return false;
    }
  }
  return true;
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
  const empty = exact
    ? "يظهر هنا أصحاب التوقعات المطابقة بعد احتساب النتائج"
    : "سيظهر هنا آخر الأعضاء الذين سجّلوا توقعاتهم";
  const viewportRef = useRef<HTMLSpanElement | null>(null);
  const trackRef = useRef<HTMLSpanElement | null>(null);
  const laneRef = useRef<HTMLSpanElement | null>(null);
  const laneWidthRef = useRef(0);
  const animationStartedAtRef = useRef<number | null>(null);
  const [repeatCopies, setRepeatCopies] = useState(1);

  // Keep one lane wider than the viewport, then render an identical second lane.
  // The actual motion is driven by requestAnimationFrame at a constant px/s speed,
  // so polling/re-rendering cannot restart the ticker and there is never a blank
  // interval between the end of one cycle and the beginning of the next.
  const laneItems = useMemo(() => {
    if (!items.length) return [];
    return Array.from({ length: repeatCopies }, () => items).flat();
  }, [items, repeatCopies]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const lane = laneRef.current;
    if (!viewport || !lane || !items.length) {
      laneWidthRef.current = 0;
      return;
    }

    const updateMetrics = () => {
      const currentLaneWidth = Math.max(1, lane.scrollWidth);
      const unitWidth = Math.max(1, currentLaneWidth / Math.max(1, repeatCopies));
      const targetLaneWidth = Math.max(viewport.clientWidth + 320, viewport.clientWidth * 1.7);
      const nextCopies = Math.max(1, Math.ceil(targetLaneWidth / unitWidth));

      if (nextCopies !== repeatCopies) {
        setRepeatCopies(nextCopies);
        return;
      }

      laneWidthRef.current = currentLaneWidth;
    };

    updateMetrics();
    const observer = new ResizeObserver(updateMetrics);
    observer.observe(viewport);
    observer.observe(lane);
    return () => observer.disconnect();
  }, [items.length, repeatCopies]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      track.style.transform = "none";
      return;
    }

    const pixelsPerSecond = 96;
    let frame = 0;

    const animate = (now: number) => {
      const laneWidth = laneWidthRef.current;
      if (laneWidth > 0) {
        if (animationStartedAtRef.current == null) animationStartedAtRef.current = now;
        const elapsedSeconds = (now - animationStartedAtRef.current) / 1000;
        const travelled = (elapsedSeconds * pixelsPerSecond) % laneWidth;
        // Left -> right. At the wrap point, lane 1 and lane 2 are visually identical,
        // so the reset is mathematically seamless instead of visibly jumping.
        track.style.transform = `translate3d(${-laneWidth + travelled}px, 0, 0)`;
      }
      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, []);

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

      <span ref={viewportRef} className="relative flex min-w-0 flex-1 items-center overflow-hidden">
        {items.length ? (
          <span
            ref={trackRef}
            className="tournament-activity-track flex w-max min-w-max items-center whitespace-nowrap text-[11px] font-bold text-white/78 sm:text-xs"
          >
            {[0, 1].map((laneIndex) => (
              <span
                key={laneIndex}
                ref={laneIndex === 0 ? laneRef : undefined}
                className="tournament-activity-lane flex shrink-0 items-center gap-8 px-4"
                aria-hidden={laneIndex === 1 ? "true" : undefined}
              >
                {laneItems.map((item, index) => (
                  <span
                    key={`${laneIndex}-${item.id}-${index}`}
                    dir="rtl"
                    className="inline-flex shrink-0 items-center gap-2"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${exact ? "bg-amber-300" : "bg-emerald-300"}`} />
                    <span>{activityText(item, kind)}</span>
                  </span>
                ))}
              </span>
            ))}
          </span>
        ) : (
          <span className="truncate px-4 text-[11px] font-semibold text-white/45 sm:text-xs">
            {empty}
          </span>
        )}
      </span>

      <span className="inline-flex shrink-0 items-center border-r border-white/[0.06] px-2 text-white/35 transition group-hover:text-white/70">
        <List className="h-4 w-4" aria-hidden="true" />
      </span>
    </button>
  );
}

export default function TournamentActivityStrips() {
  const [predictions, setPredictions] = useState<ActivityEvent[]>([]);
  const [exactHits, setExactHits] = useState<ActivityEvent[]>([]);
  const [openKind, setOpenKind] = useState<ActivityKind | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/tournaments/activity?tournamentId=${encodeURIComponent(GULF_CUP_27_TOURNAMENT_ID)}`,
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
  }, []);

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
        aria-label="نشاط خليجي الديار العربية 27"
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
                        <strong className="text-sm font-black text-white">
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
                      <p className="mt-1 text-xs font-bold text-white/65">
                        {matchLabel(item)}
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
