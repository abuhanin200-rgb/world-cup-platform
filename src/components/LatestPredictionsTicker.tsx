"use client";

import { useEffect, useState } from "react";
import { getLatestPredictions, LatestPrediction } from "@/lib/predictions";
import { getSiteSettings, getTickerDuration } from "@/lib/siteSettings";

export default function LatestPredictionsTicker() {
  const [predictions, setPredictions] = useState<LatestPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(28);

  useEffect(() => {
    async function loadLatestPredictions() {
      try {
        const data = await getLatestPredictions(12);
        setPredictions(data);
      } catch (error) {
        console.error("فشل تحميل آخر التوقعات:", error);
      } finally {
        setLoading(false);
      }
    }

    async function loadTickerSettings() {
      try {
        const settings = await getSiteSettings();
        setDuration(getTickerDuration(settings.latestPredictionsSpeed));
      } catch (error) {
        console.error("فشل تحميل إعدادات سرعة آخر التوقعات:", error);
        setDuration(28);
      }
    }

    loadLatestPredictions();
    loadTickerSettings();

    const predictionsInterval = setInterval(loadLatestPredictions, 30000);
    const settingsInterval = setInterval(loadTickerSettings, 15000);

    return () => {
      clearInterval(predictionsInterval);
      clearInterval(settingsInterval);
    };
  }, []);

  if (loading) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
        <div className="text-sm text-slate-300">جاري تحميل آخر التوقعات...</div>
      </section>
    );
  }

  if (predictions.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span>📢</span>
          <span>لم يتم تسجيل أي توقع حتى الآن. كن أول من يبدأ التحدي.</span>
        </div>
      </section>
    );
  }

  const repeatedPredictions =
    predictions.length === 1
      ? Array(8).fill(predictions[0])
      : [...predictions, ...predictions, ...predictions];

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black text-amber-200">
          📢 آخر التوقعات
        </h2>

        <span className="text-[11px] text-amber-100/80">
          يتم التحديث تلقائيًا
        </span>
      </div>

      <div className="ticker-window relative overflow-hidden">
        <div
          className="ticker-track flex w-max gap-3"
          style={{
            animationDuration: `${duration}s`,
          }}
        >
          {repeatedPredictions.map((prediction, index) => (
            <div
              key={`${prediction.id}-${index}`}
              className="whitespace-nowrap rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-xs text-white md:text-sm"
            >
              <span className="font-black text-amber-300">
                {prediction.userName}
              </span>{" "}
              توقع{" "}
              <span className="font-bold">
                {prediction.homeTeamEmoji} {prediction.homeTeamName}
              </span>{" "}
              <span className="font-black text-emerald-300">
                {prediction.homeScore} - {prediction.awayScore}
              </span>{" "}
              <span className="font-bold">
                {prediction.awayTeamName} {prediction.awayTeamEmoji}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .ticker-window {
          direction: rtl;
        }

        .ticker-track {
          animation-name: tickerMove;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .ticker-track:hover {
          animation-play-state: paused;
        }

        @keyframes tickerMove {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(50%);
          }
        }
      `}</style>
    </section>
  );
}