"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getLatestPredictions, LatestPrediction } from "@/lib/predictions";
import {
  getSiteSettings,
  SiteSettings,
  TickerSpeed,
} from "@/lib/siteSettings";
import TeamFlag from "@/components/TeamFlag";

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
  const predictionWithCodes = prediction as LatestPrediction & {
    homeTeamCode?: string;
    awayTeamCode?: string;
  };

  return side === "home"
    ? predictionWithCodes.homeTeamCode
    : predictionWithCodes.awayTeamCode;
}

function getPredictionsSignature(predictions: LatestPrediction[]) {
  return predictions
    .map((prediction) => {
      return [
        prediction.id,
        prediction.userName,
        prediction.homeTeamName,
        prediction.awayTeamName,
        prediction.homeScore,
        prediction.awayScore,
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

export default function LatestPredictionsTicker() {
  const [predictions, setPredictions] = useState<LatestPrediction[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [groupWidth, setGroupWidth] = useState(0);

  const predictionsSignatureRef = useRef("");
  const groupRef = useRef<HTMLDivElement | null>(null);

  async function loadPredictions() {
    try {
      const data = await getLatestPredictions(100);
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
        className={`inline-flex flex-none items-center gap-2 rounded-2xl border px-4 py-2 text-sm ${
          golden
            ? "border-amber-300/40 bg-amber-400/15 text-white"
            : "border-white/10 bg-white/10 text-white"
        }`}
      >
        {golden && (
          <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950 md:text-xs">
            ⭐ ذهبي
          </span>
        )}

        <span
          className={
            golden ? "font-black text-amber-300" : "font-black text-amber-300"
          }
        >
          {prediction.userName}
        </span>

        <span className={golden ? "text-amber-100/80" : "text-slate-400"}>
          توقع
        </span>

        <span className="inline-flex items-center gap-1.5 font-bold">
          <TeamFlag
            code={getPredictionTeamCode(prediction, "home")}
            emoji={prediction.homeTeamEmoji}
            name={prediction.homeTeamName}
            size="xs"
          />
          <span>{prediction.homeTeamName}</span>
        </span>

        <span
          className={`rounded-lg px-2 py-1 font-black ${
            golden
              ? "bg-amber-400 text-slate-950"
              : "bg-slate-950 text-white"
          }`}
        >
          {prediction.homeScore} - {prediction.awayScore}
        </span>

        <span className="inline-flex items-center gap-1.5 font-bold">
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

  if (loading) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl">
        <div className="text-center text-sm text-slate-300">
          جاري تحميل آخر التوقعات...
        </div>
      </section>
    );
  }

  if (predictions.length === 0) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-black md:text-xl">🔥 آخر التوقعات</h2>

          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] text-slate-300">
            قبل بداية المباريات فقط
          </span>
        </div>

        <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-4 text-center text-sm text-slate-300">
          لا توجد توقعات جديدة لمباريات لم تبدأ بعد.
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-black md:text-xl">🔥 آخر التوقعات</h2>

        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] text-slate-300 md:inline">
            السرعة: {getSpeedLabel(currentSpeed)}
          </span>

          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-100">
            يتوقف عند اللمس
          </span>
        </div>
      </div>

      <div
        dir="ltr"
        className="latest-predictions-wrapper relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 py-3"
        onMouseEnter={pauseTicker}
        onMouseLeave={resumeTicker}
        onTouchStart={pauseTicker}
        onTouchEnd={resumeTicker}
        onTouchCancel={resumeTicker}
        onPointerDown={pauseTicker}
        onPointerUp={resumeTicker}
        onPointerCancel={resumeTicker}
      >
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
  );
}
