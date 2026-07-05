"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  ChevronDown,
  Flame,
  Gauge,
  ListFilter,
  PauseCircle,
  Star,
  X,
} from "lucide-react";
import { getLatestPredictions, LatestPrediction } from "@/lib/predictions";
import {
  getSiteSettings,
  SiteSettings,
  TickerSpeed,
} from "@/lib/siteSettings";
import TeamFlag from "@/components/TeamFlag";

type QualifiedTeamInfo = {
  code: string;
  emoji?: string | null;
  name: string;
};

function getSpeedLabel(speed: string) {
  if (speed === "very_slow") return "بطيء جدًا";
  if (speed === "slow") return "بطيء";
  if (speed === "normal") return "متوسط";
  if (speed === "fast") return "سريع";
  if (speed === "very_fast") return "سريع جدًا";

  return "متوسط";
}

function getPixelsPerSecond(speed: TickerSpeed) {
  if (speed === "very_slow") return 16;
  if (speed === "slow") return 24;
  if (speed === "normal") return 34;
  if (speed === "fast") return 48;
  if (speed === "very_fast") return 64;

  return 34;
}

function isGoldenPrediction(prediction: LatestPrediction) {
  return prediction.predictionType === "golden";
}

function getPredictionTeamCode(
  prediction: LatestPrediction,
  side: "home" | "away"
) {
  return side === "home" ? prediction.homeTeamCode : prediction.awayTeamCode;
}

function getPredictionsSignature(predictions: LatestPrediction[]) {
  return predictions
    .map((prediction) => {
      return [
        prediction.id,
        prediction.userName,
        prediction.matchId,
        prediction.homeTeamName,
        prediction.awayTeamName,
        prediction.homeScore,
        prediction.awayScore,
        prediction.qualifiedTeamCode || "",
        prediction.qualificationMethod || "",
        prediction.predictionType,
      ].join("-");
    })
    .join("|");
}

function getRepeatCount(count: number) {
  if (count <= 1) return 14;
  if (count <= 3) return 10;
  if (count <= 6) return 7;
  if (count <= 12) return 4;
  if (count <= 25) return 2;

  return 1;
}

function getQualificationMethodLabel(value?: string | null) {
  if (value === "extraTime") return "أشواط إضافية";
  if (value === "penalties") return "ركلات ترجيح";
  return "";
}

function getMatchLabel(prediction: LatestPrediction) {
  return `${prediction.homeTeamName} × ${prediction.awayTeamName}`;
}

function getQualifiedTeamInfo(
  prediction: LatestPrediction
): QualifiedTeamInfo | null {
  if (!prediction.qualifiedTeamCode) return null;

  if (prediction.qualifiedTeamCode === prediction.homeTeamCode) {
    return {
      code: prediction.homeTeamCode || "",
      emoji: prediction.homeTeamEmoji,
      name: prediction.homeTeamName,
    };
  }

  if (prediction.qualifiedTeamCode === prediction.awayTeamCode) {
    return {
      code: prediction.awayTeamCode || "",
      emoji: prediction.awayTeamEmoji,
      name: prediction.awayTeamName,
    };
  }

  return {
    code: prediction.qualifiedTeamCode,
    emoji: undefined,
    name: prediction.qualifiedTeamCode,
  };
}

const sectionMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 18,
    scale: 0.98,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.38,
      ease: "easeOut",
    },
  },
};

const listItemMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
    scale: 0.97,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.25,
      ease: "easeOut",
    },
  },
};

const modalBackdropMotion: Variants = {
  hidden: {
    opacity: 0,
  },
  show: {
    opacity: 1,
    transition: {
      duration: 0.18,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.16,
      ease: "easeIn",
    },
  },
};

const modalMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 42,
    scale: 0.98,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.28,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: 28,
    scale: 0.98,
    transition: {
      duration: 0.18,
      ease: "easeIn",
    },
  },
};

export default function LatestPredictionsTicker() {
  const [predictions, setPredictions] = useState<LatestPrediction[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [groupWidth, setGroupWidth] = useState(0);
  const [isListOpen, setIsListOpen] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState("all");
  const [isMounted, setIsMounted] = useState(false);

  const predictionsSignatureRef = useRef("");
  const groupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  async function loadPredictions() {
    try {
      const data = await getLatestPredictions(200);
      const signature = getPredictionsSignature(data);

      if (signature !== predictionsSignatureRef.current) {
        predictionsSignatureRef.current = signature;
        setPredictions(data);
      }
    } catch (error) {
      console.error("Latest predictions error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSettings() {
    try {
      const data = await getSiteSettings();

      setSettings((current) => {
        if (
          current &&
          current.latestPredictionsSpeed === data.latestPredictionsSpeed &&
          current.exactHitsSpeed === data.exactHitsSpeed &&
          current.maintenanceMode === data.maintenanceMode &&
          current.maintenanceMessage === data.maintenanceMessage
        ) {
          return current;
        }

        return data;
      });
    } catch (error) {
      console.error("Ticker settings error:", error);
    }
  }

  useEffect(() => {
    loadPredictions();
    loadSettings();

    const predictionsInterval = setInterval(loadPredictions, 15000);
    const settingsInterval = setInterval(loadSettings, 10000);

    return () => {
      clearInterval(predictionsInterval);
      clearInterval(settingsInterval);
    };
  }, []);

  const currentSpeed = settings?.latestPredictionsSpeed || "normal";
  const pixelsPerSecond = getPixelsPerSecond(currentSpeed);

  const tickerItems = useMemo(() => {
    if (predictions.length === 0) return [];

    const repeated: LatestPrediction[] = [];
    const repeatCount = getRepeatCount(predictions.length);

    for (let i = 0; i < repeatCount; i += 1) {
      repeated.push(...predictions);
    }

    return repeated;
  }, [predictions]);

  const matchFilters = useMemo(() => {
    const map = new Map<string, LatestPrediction>();

    predictions.forEach((prediction) => {
      if (!prediction.matchId) return;

      if (!map.has(prediction.matchId)) {
        map.set(prediction.matchId, prediction);
      }
    });

    return Array.from(map.values());
  }, [predictions]);

  const filteredPredictions = useMemo(() => {
    if (selectedMatchId === "all") return predictions;

    return predictions.filter((prediction) => {
      return prediction.matchId === selectedMatchId;
    });
  }, [predictions, selectedMatchId]);

  useEffect(() => {
    function measureWidth() {
      if (!groupRef.current) return;
      setGroupWidth(groupRef.current.scrollWidth);
    }

    measureWidth();

    const resizeObserver = new ResizeObserver(measureWidth);

    if (groupRef.current) {
      resizeObserver.observe(groupRef.current);
    }

    window.addEventListener("resize", measureWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureWidth);
    };
  }, [tickerItems]);

  const duration = Math.max(
    25,
    Math.round((groupWidth || 1200) / pixelsPerSecond)
  );

  function pauseTicker() {
    setIsPaused(true);
  }

  function resumeTicker() {
    setIsPaused(false);
  }

  function renderPredictionCard(prediction: LatestPrediction, index: number) {
    const golden = isGoldenPrediction(prediction);

    return (
      <div
        key={`${prediction.id}-${index}`}
        dir="rtl"
        className={`group relative inline-flex min-h-[46px] flex-none items-center gap-2 overflow-hidden rounded-2xl border px-3 py-2 text-xs shadow-lg shadow-slate-950/25 backdrop-blur-xl transition duration-200 md:px-4 md:text-sm ${
          golden
            ? "border-amber-300/40 bg-amber-400/15 text-white"
            : "border-white/10 bg-white/10 text-white"
        }`}
      >
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-l ${
            golden
              ? "from-amber-300/15 via-transparent to-transparent"
              : "from-cyan-300/10 via-transparent to-transparent"
          } opacity-80`}
        />

        {golden && (
          <span className="relative inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950 shadow-lg shadow-amber-950/20 md:text-xs">
            <Star className="h-3 w-3 fill-slate-950" />
            <span>ذهبي</span>
          </span>
        )}

        <span className="relative font-black text-amber-300">
          {prediction.userName}
        </span>

        <span
          className={
            golden ? "relative text-amber-100/80" : "relative text-slate-400"
          }
        >
          توقع
        </span>

        <span className="relative inline-flex items-center gap-1.5 font-bold">
          <TeamFlag
            code={getPredictionTeamCode(prediction, "home")}
            emoji={prediction.homeTeamEmoji}
            name={prediction.homeTeamName}
            size="xs"
          />
          <span>{prediction.homeTeamName}</span>
        </span>

        <span
          className={`relative rounded-xl px-2 py-1 font-black shadow-inner ${
            golden
              ? "bg-amber-400 text-slate-950"
              : "bg-slate-950/80 text-white"
          }`}
        >
          {prediction.homeScore} - {prediction.awayScore}
        </span>

        <span className="relative inline-flex items-center gap-1.5 font-bold">
          <span>{prediction.awayTeamName}</span>
          <TeamFlag
            code={getPredictionTeamCode(prediction, "away")}
            emoji={prediction.awayTeamEmoji}
            name={prediction.awayTeamName}
            size="xs"
          />
        </span>
      </div>
    );
  }

  function renderPredictionListItem(prediction: LatestPrediction) {
    const golden = isGoldenPrediction(prediction);
    const qualifiedTeam = getQualifiedTeamInfo(prediction);
    const qualificationMethodLabel = getQualificationMethodLabel(
      prediction.qualificationMethod
    );

    return (
      <motion.div
        key={prediction.id}
        variants={listItemMotion}
        className={`relative overflow-hidden rounded-3xl border p-3 shadow-xl shadow-slate-950/25 ${
          golden
            ? "border-amber-300/40 bg-amber-400/10"
            : "border-white/10 bg-slate-950/60"
        }`}
      >
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${
            golden
              ? "from-amber-300/10 via-transparent to-transparent"
              : "from-white/10 via-transparent to-cyan-300/5"
          }`}
        />

        <div className="relative mb-3 flex items-center justify-between gap-3">
          <div>
            <div
              className={`text-sm font-black ${
                golden ? "text-amber-200" : "text-white"
              }`}
            >
              {prediction.userName}
            </div>

            <div className="mt-1 text-[11px] font-medium text-slate-400">
              {getMatchLabel(prediction)}
            </div>
          </div>

          {golden && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-black text-slate-950 shadow-lg shadow-amber-950/20">
              <Star className="h-3 w-3 fill-slate-950" />
              <span>توقع ذهبي</span>
            </span>
          )}
        </div>

        <div className="relative flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs font-black text-white shadow-inner">
          <span className="inline-flex items-center gap-1">
            <TeamFlag
              code={prediction.homeTeamCode}
              emoji={prediction.homeTeamEmoji}
              name={prediction.homeTeamName}
              size="sm"
            />
            {prediction.homeTeamName}
          </span>

          <span
            className={`rounded-xl px-2.5 py-1 ${
              golden ? "bg-amber-400 text-slate-950" : "bg-white/10 text-white"
            }`}
          >
            {prediction.homeScore} - {prediction.awayScore}
          </span>

          <span className="inline-flex items-center gap-1">
            {prediction.awayTeamName}
            <TeamFlag
              code={prediction.awayTeamCode}
              emoji={prediction.awayTeamEmoji}
              name={prediction.awayTeamName}
              size="sm"
            />
          </span>
        </div>

        {qualifiedTeam && (
          <div className="relative mt-2 flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-blue-400/30 bg-blue-400/10 px-3 py-2 text-center text-xs font-black text-blue-100">
            <span>المتأهل:</span>
            <TeamFlag
              code={qualifiedTeam.code}
              emoji={qualifiedTeam.emoji}
              name={qualifiedTeam.name}
              size="sm"
            />
            <span>{qualifiedTeam.name}</span>

            {qualificationMethodLabel && (
              <span>• {qualificationMethodLabel}</span>
            )}
          </div>
        )}
      </motion.div>
    );
  }

  const predictionsModal =
    isMounted &&
    createPortal(
      <AnimatePresence>
        {isListOpen && (
          <motion.div
            variants={modalBackdropMotion}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/85 p-3 backdrop-blur-md md:items-center md:p-4"
            onClick={() => setIsListOpen(false)}
          >
            <motion.div
              variants={modalMotion}
              dir="rtl"
              className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-t-[2rem] border border-white/10 bg-slate-950 shadow-2xl shadow-slate-950/60 md:max-h-[84vh] md:rounded-[2rem]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative border-b border-white/10 bg-white/[0.06] px-4 py-3">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-cyan-400/5" />

                <div className="relative mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/20 md:hidden" />

                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-orange-300/20 bg-orange-300/10 px-2.5 py-1 text-[10px] font-black text-orange-100">
                      <Flame className="h-3.5 w-3.5" />
                      <span>آخر التوقعات</span>
                    </div>

                    <h3 className="text-lg font-black text-white">
                      قائمة آخر التوقعات
                    </h3>

                    <p className="mt-1 text-[11px] font-medium leading-5 text-slate-400">
                      تظهر التوقعات غير المحسوبة فقط، وتبقى ظاهرة حتى بعد بداية
                      المباراة إلى أن يتم الاحتساب.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsListOpen(false)}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white shadow-lg shadow-slate-950/20 transition hover:bg-white/20 active:scale-95"
                    aria-label="إغلاق"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="relative mt-3 rounded-2xl border border-white/10 bg-slate-950/55 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-[11px] font-black text-slate-300">
                      <ListFilter className="h-3.5 w-3.5" />
                      <span>فلترة حسب المباراة</span>
                    </label>

                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-400">
                      {filteredPredictions.length} توقع
                    </span>
                  </div>

                  <div className="relative">
                    <select
                      value={selectedMatchId}
                      onChange={(event) =>
                        setSelectedMatchId(event.target.value)
                      }
                      className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-slate-950 px-3 pl-10 text-sm font-bold text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15"
                    >
                      <option value="all">كل المباريات</option>

                      {matchFilters.map((prediction) => (
                        <option
                          key={prediction.matchId}
                          value={prediction.matchId}
                        >
                          {getMatchLabel(prediction)}
                        </option>
                      ))}
                    </select>

                    <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                  </div>
                </div>
              </div>

              <motion.div
                variants={sectionMotion}
                initial="hidden"
                animate="show"
                className="max-h-[58vh] space-y-3 overflow-y-auto p-4 md:max-h-[56vh]"
              >
                {filteredPredictions.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm font-bold text-slate-300">
                    لا توجد توقعات لهذه المباراة.
                  </div>
                ) : (
                  filteredPredictions.map((prediction) =>
                    renderPredictionListItem(prediction)
                  )
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );

  if (loading) {
    return (
      <>
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.08] p-4 shadow-2xl shadow-slate-950/35 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-cyan-400/5" />
          <div className="relative flex items-center justify-center gap-2 text-center text-sm font-bold text-slate-300">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-300" />
            <span>جاري تحميل آخر التوقعات...</span>
          </div>
        </section>
        {predictionsModal}
      </>
    );
  }

  if (predictions.length === 0) {
    return (
      <>
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.08] p-4 shadow-2xl shadow-slate-950/35 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-cyan-400/5" />

          <div className="relative mb-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsListOpen(true)}
              className="group inline-flex min-h-[38px] items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-base font-black text-white shadow-lg shadow-slate-950/20 transition hover:bg-white/20 active:scale-95 md:text-xl"
            >
              <Flame className="h-5 w-5 text-orange-300 transition group-hover:scale-110" />
              <span>آخر التوقعات</span>
            </button>

            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-bold text-slate-300">
              غير محسوبة فقط
            </span>
          </div>

          <div className="relative rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-4 text-center text-sm font-bold text-slate-300">
            لا توجد توقعات غير محسوبة حاليًا.
          </div>
        </section>
        {predictionsModal}
      </>
    );
  }

  return (
    <>
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.08] p-4 shadow-2xl shadow-slate-950/35 backdrop-blur-xl">
        <motion.div
          variants={sectionMotion}
          initial="hidden"
          animate="show"
          className="relative"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-cyan-400/5" />
          <div className="pointer-events-none absolute -right-20 top-0 h-44 w-44 rounded-full bg-orange-300/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-44 w-44 rounded-full bg-cyan-300/10 blur-3xl" />

          <div className="relative mb-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsListOpen(true)}
              className="group inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-base font-black text-white shadow-lg shadow-slate-950/20 transition hover:bg-white/20 active:scale-95 md:text-xl"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-400/15 text-orange-200">
                <Flame className="h-5 w-5 transition group-hover:scale-110 group-hover:rotate-[-6deg]" />
              </span>
              <span>آخر التوقعات</span>
              <ChevronDown className="h-4 w-4 text-slate-300 transition group-hover:translate-y-0.5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-bold text-slate-300 md:inline-flex">
                <Gauge className="h-3.5 w-3.5" />
                <span>السرعة: {getSpeedLabel(currentSpeed)}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-black text-emerald-100 shadow-lg shadow-emerald-950/10">
                <PauseCircle className="h-3.5 w-3.5" />
                <span>يتوقف عند اللمس</span>
              </span>
            </div>
          </div>

          <div
            dir="ltr"
            className="latest-predictions-wrapper relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/65 py-3 shadow-inner"
            onMouseEnter={pauseTicker}
            onMouseLeave={resumeTicker}
            onTouchStart={pauseTicker}
            onTouchEnd={resumeTicker}
            onTouchCancel={resumeTicker}
            onPointerDown={pauseTicker}
            onPointerUp={resumeTicker}
            onPointerCancel={resumeTicker}
          >
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-slate-950/90 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-slate-950/90 to-transparent" />

            <div
              className="latest-predictions-marquee flex w-max gap-3 whitespace-nowrap"
              style={{
                animationDuration: `${duration}s`,
                animationPlayState: isPaused ? "paused" : "running",
              }}
            >
              <div ref={groupRef} className="flex flex-none gap-3">
                {tickerItems.map((prediction, index) =>
                  renderPredictionCard(prediction, index)
                )}
              </div>

              <div className="flex flex-none gap-3">
                {tickerItems.map((prediction, index) =>
                  renderPredictionCard(prediction, index + tickerItems.length)
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <style jsx>{`
          .latest-predictions-marquee {
            animation-name: latestPredictionsTicker;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            will-change: transform;
          }

          .latest-predictions-wrapper:hover .latest-predictions-marquee,
          .latest-predictions-wrapper:active .latest-predictions-marquee,
          .latest-predictions-wrapper:focus-within .latest-predictions-marquee {
            animation-play-state: paused;
          }

          @keyframes latestPredictionsTicker {
            0% {
              transform: translateX(-50%);
            }

            100% {
              transform: translateX(0%);
            }
          }
        `}</style>
      </section>

      {predictionsModal}
    </>
  );
}