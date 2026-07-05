"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, type Variants, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  Flame,
  MapPin,
  Medal,
  Target,
  TrendingUp,
} from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

type HomeStatsData = {
  totalPredictions: number;
  winnerCorrect: number;
  exactCorrect: number;
  calculatedMatches: number;
  successRate: number;
};

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

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toText(value: unknown) {
  return String(value || "").trim();
}

function isExactPrediction(data: Record<string, unknown>) {
  const points = toNumber(data.points);
  const resultType = toText(data.resultType);

  return (
    Boolean(data.isCalculated) &&
    (resultType === "exact" || points === 3 || points === 6)
  );
}

function isWinnerPrediction(data: Record<string, unknown>) {
  const points = toNumber(data.points);
  const resultType = toText(data.resultType);

  return (
    Boolean(data.isCalculated) &&
    (resultType === "winner" || points === 1 || points === 2)
  );
}

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
      setDisplayValue(0);
      return;
    }

    if (shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }

    const startValue = displayValue;
    const difference = value - startValue;

    if (Math.abs(difference) < 0.01) {
      setDisplayValue(value);
      return;
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

const sectionMotion: Variants = {
  hidden: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.18,
      ease: "easeOut",
    },
  },
};

const cardMotion: Variants = {
  hidden: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.16,
      ease: "easeOut",
    },
  },
};

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

      const [predictionsSnapshot, matchesSnapshot] = await Promise.all([
        getDocs(collection(db, "predictions")),
        getDocs(collection(db, "matches")),
      ]);

      const predictions = predictionsSnapshot.docs
        .filter((docSnap) => docSnap.id !== "_init")
        .map((docSnap) => docSnap.data());

      const matches = matchesSnapshot.docs
        .filter((docSnap) => docSnap.id !== "_init")
        .map((docSnap) => docSnap.data());

      const totalPredictions = predictions.length;

      const calculatedPredictions = predictions.filter((prediction) =>
        Boolean(prediction.isCalculated)
      ).length;

      const winnerCorrect = predictions.filter((prediction) =>
        isWinnerPrediction(prediction)
      ).length;

      const exactCorrect = predictions.filter((prediction) =>
        isExactPrediction(prediction)
      ).length;

      const calculatedMatches = matches.filter((match) =>
        Boolean(match.resultCalculated)
      ).length;

      const successRate =
        calculatedPredictions > 0
          ? ((winnerCorrect + exactCorrect) / calculatedPredictions) * 100
          : 0;

      setStats({
        totalPredictions,
        winnerCorrect,
        exactCorrect,
        calculatedMatches,
        successRate,
      });
    } catch (error) {
      console.error("Home stats error:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
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
    <motion.section
      variants={sectionMotion}
      initial={false}
      animate="show"
      className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-white/[0.08] p-3 text-white shadow-lg shadow-slate-950/25 backdrop-blur-sm md:rounded-[2rem] md:p-5"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-cyan-400/5" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-300/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-amber-300/10 blur-2xl" />

      <div className="relative mb-3 text-center md:mb-4">
        <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-300/25 bg-sky-300/10 text-sky-100 shadow-md shadow-sky-950/15">
          <BarChart3 className="h-5 w-5" />
        </div>

        <h2 className="text-[18px] font-black tracking-tight md:text-2xl">
          إحصائيات المنصة
        </h2>

        <p className="mx-auto mt-1 max-w-xl text-[11px] font-medium leading-5 text-slate-300 md:text-sm md:leading-6">
          أرقام مباشرة تتحدث تلقائيًا مع توقعات الأعضاء واحتساب النتائج.
        </p>
      </div>

      <div className="relative grid grid-cols-5 gap-1.5 md:gap-3">
        {cards.map((card) => (
          <motion.div
            key={card.titleLines.join("-")}
            variants={cardMotion}
            whileTap={{ scale: 0.98 }}
            className={`group relative flex min-h-[104px] transform-gpu flex-col items-center overflow-hidden rounded-2xl border ${card.borderClass} bg-slate-950/45 px-1 py-2 text-center shadow-md shadow-slate-950/20 backdrop-blur-sm transition duration-200 hover:bg-slate-950/55 md:min-h-[152px] md:rounded-[1.4rem] md:px-3 md:py-4`}
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
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}