"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import {
  BarChart3,
  Flame,
  MapPin,
  Medal,
  Target,
  TrendingUp,
} from "lucide-react";

type HomeStatsData = {
  totalPredictions: number;
  winnerCorrect: number;
  exactCorrect: number;
  calculatedMatches: number;
  successRate: number;
};

function isHomeStatsData(value: unknown): value is HomeStatsData {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return ["totalPredictions", "winnerCorrect", "exactCorrect", "calculatedMatches", "successRate"]
    .every((key) => typeof data[key] === "number");
}

type StatsCard = {
  titleLines: string[];
  value: number;
  suffix?: string;
  decimals?: number;
  icon: ReactNode;
  valueClass: string;
  glowClass: string;
  borderClass: string;
};

function CountUpNumber({
  value,
  suffix = "",
  decimals = 0,
  loading,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
  loading: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (loading) {
      const timeoutId = window.setTimeout(() => setDisplayValue(0), 0);
      return () => window.clearTimeout(timeoutId);
    }

    if (shouldReduceMotion) {
      const timeoutId = window.setTimeout(() => setDisplayValue(value), 0);
      return () => window.clearTimeout(timeoutId);
    }

    const startValue = displayValue;
    const difference = value - startValue;

    if (Math.abs(difference) < 0.01) {
      const timeoutId = window.setTimeout(() => setDisplayValue(value), 0);
      return () => window.clearTimeout(timeoutId);
    }

    const duration = 1800;
    const startTime = window.performance.now();
    let animationFrameId = 0;

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 2);
      const nextValue = startValue + difference * easedProgress;

      setDisplayValue(nextValue);

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    }

    animationFrameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, loading, shouldReduceMotion]);

  if (loading) {
    return (
      <span className="mx-auto block h-5 w-10 rounded-full bg-white/15 md:h-8 md:w-16" />
    );
  }

  return (
    <>
      {displayValue.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </>
  );
}

export default function HomeStats() {
  const [stats, setStats] = useState<HomeStatsData>({
    totalPredictions: 0,
    winnerCorrect: 0,
    exactCorrect: 0,
    calculatedMatches: 0,
    successRate: 0,
  });

  const [loading, setLoading] = useState(true);

  async function loadStats() {
    try {
      setLoading(true);

      const response = await fetch("/api/public/legacy-community?view=home-stats", {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as HomeStatsData | { error?: string } | null;
      if (!response.ok || !isHomeStatsData(data)) {
        throw new Error(data && "error" in data ? data.error : "تعذر تحميل إحصاءات المنصة الآن.");
      }
      setStats(data);
    } catch (error) {
      console.error("Home stats error:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void loadStats());
  }, []);

  const cards: StatsCard[] = useMemo(
    () => [
      {
        titleLines: ["إجمالي", "التوقعات"],
        value: stats.totalPredictions,
        icon: <Target className="h-4 w-4 md:h-6 md:w-6" />,
        valueClass: "text-white",
        glowClass: "from-white/14 to-slate-300/5 text-white",
        borderClass: "border-white/15",
      },
      {
        titleLines: ["الفائز", "الصحيح"],
        value: stats.winnerCorrect,
        icon: <Medal className="h-4 w-4 md:h-6 md:w-6" />,
        valueClass: "text-amber-300",
        glowClass: "from-amber-300/18 to-amber-500/5 text-amber-200",
        borderClass: "border-amber-300/25",
      },
      {
        titleLines: ["التوقع", "بالملي"],
        value: stats.exactCorrect,
        icon: <Flame className="h-4 w-4 md:h-6 md:w-6" />,
        valueClass: "text-emerald-300",
        glowClass: "from-emerald-300/18 to-emerald-500/5 text-emerald-200",
        borderClass: "border-emerald-300/25",
      },
      {
        titleLines: ["نسبة", "النجاح"],
        value: stats.successRate,
        suffix: "%",
        decimals: 1,
        icon: <TrendingUp className="h-4 w-4 md:h-6 md:w-6" />,
        valueClass: "text-sky-300",
        glowClass: "from-sky-300/18 to-sky-500/5 text-sky-200",
        borderClass: "border-sky-300/25",
      },
      {
        titleLines: ["المباريات", "المحتسبة"],
        value: stats.calculatedMatches,
        icon: <MapPin className="h-4 w-4 md:h-6 md:w-6" />,
        valueClass: "text-white",
        glowClass: "from-cyan-300/14 to-cyan-500/5 text-cyan-100",
        borderClass: "border-cyan-300/20",
      },
    ],
    [stats]
  );

  return (
    <section
      className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-slate-900/85 p-3 text-white shadow-lg shadow-slate-950/25 md:rounded-[2rem] md:p-5 [contain:layout_paint] [isolation:isolate]"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-cyan-400/5" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full" style={{ background: "radial-gradient(circle at center, rgba(103,232,249,0.16) 0%, rgba(103,232,249,0.075) 38%, rgba(103,232,249,0.02) 62%, transparent 82%)" }} />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full" style={{ background: "radial-gradient(circle at center, rgba(252,211,77,0.16) 0%, rgba(252,211,77,0.075) 38%, rgba(252,211,77,0.02) 62%, transparent 82%)" }} />

      <div className="relative mb-3 text-center md:mb-4">
        <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-300/25 bg-sky-300/10 text-sky-100 shadow-md shadow-sky-950/15">
          <BarChart3 className="h-5 w-5" />
        </div>

        <h2 className="text-[18px] font-black tracking-tight md:text-2xl">
          إحصائيات المنصة
        </h2>

        <p className="mx-auto mt-1 max-w-xl text-[11px] font-medium leading-5 text-slate-300 md:text-sm md:leading-6">
          أرقام مباشرة تتحدث تلقائيًا مع توقعات الأعضاء واحتساب النتائج
        </p>
      </div>

      <div className="relative grid grid-cols-5 gap-1.5 md:gap-3">
        {cards.map((card) => (
          <div
            key={card.titleLines.join("-")}
            className={`group relative flex min-h-[104px] flex-col items-center overflow-hidden rounded-2xl border ${card.borderClass} bg-slate-950/70 px-1 py-2 text-center shadow-md shadow-slate-950/20 [backface-visibility:hidden] md:min-h-[152px] md:rounded-[1.4rem] md:px-3 md:py-4`}
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.glowClass} opacity-80`}
            />

            <div className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent md:inset-x-5" />

            <div
              className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 shadow-sm shadow-slate-950/15 transition duration-200 md:h-12 md:w-12 md:rounded-2xl ${card.valueClass}`}
            >
              {card.icon}
            </div>

            <div className="relative mt-1.5 flex h-[30px] w-full flex-col items-center justify-center gap-0.5 text-center text-[9px] font-black leading-none text-slate-300 md:mt-2 md:h-[40px] md:text-xs">
              <span className="block w-full whitespace-nowrap text-center">
                {card.titleLines[0]}
              </span>
              <span className="block w-full whitespace-nowrap text-center">
                {card.titleLines[1]}
              </span>
            </div>

            <div
              className={`relative mt-auto w-full text-center text-[15px] font-black leading-none tracking-tight tabular-nums md:text-3xl ${card.valueClass}`}
            >
              <CountUpNumber
                value={card.value}
                suffix={card.suffix}
                decimals={card.decimals}
                loading={loading}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
