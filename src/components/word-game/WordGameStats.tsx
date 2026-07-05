"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import { BarChart3, Flame, Target, Trophy } from "lucide-react";
import type { WordGameUserStats } from "@/types/wordGame";

type WordGameStatsProps = {
  stats: WordGameUserStats | null;
};

type CountUpNumberProps = {
  value: number;
  suffix?: string;
};

type StatCardProps = {
  label: string;
  value: number;
  suffix?: string;
  icon: ReactNode;
  valueClassName: string;
};

const scrollOnceViewport = {
  once: true,
  amount: 0.18,
} as const;

const sectionMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
    scale: 0.99,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.32,
      ease: "easeOut",
    },
  },
};

const cardMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
    scale: 0.99,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: "easeOut",
    },
  },
};

function CountUpNumber({ value, suffix = "" }: CountUpNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const duration = 700;
    const startValue = displayValue;
    const difference = value - startValue;
    const startTime = performance.now();

    if (difference === 0) {
      setDisplayValue(value);
      return;
    }

    function animate(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(startValue + difference * easedProgress);

      setDisplayValue(nextValue);

      if (progress < 1) {
        window.requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    }

    const frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <>
      {displayValue}
      {suffix}
    </>
  );
}

function StatCard({
  label,
  value,
  suffix = "",
  icon,
  valueClassName,
}: StatCardProps) {
  return (
    <motion.div
      variants={cardMotion}
      whileTap={{ scale: 0.98 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-center shadow-md shadow-slate-950/20"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />

      <div className="relative">
        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200">
          {icon}
        </div>

        <p className={`text-[24px] font-black tabular-nums ${valueClassName}`}>
          <CountUpNumber value={value} suffix={suffix} />
        </p>

        <p className="mt-1 text-[11px] font-bold text-slate-400">{label}</p>
      </div>
    </motion.div>
  );
}

export default function WordGameStats({ stats }: WordGameStatsProps) {
  const gamesPlayed = stats?.gamesPlayed ?? 0;
  const gamesWon = stats?.gamesWon ?? 0;
  const winRate = stats?.winRate ?? 0;
  const bestWinStreak = stats?.bestWinStreak ?? 0;

  return (
    <motion.div
      variants={sectionMotion}
      initial="hidden"
      whileInView="show"
      viewport={scrollOnceViewport}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.09] p-4 shadow-lg shadow-slate-950/25 backdrop-blur-sm md:p-5"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-cyan-300/10" />
      <div className="pointer-events-none absolute -right-20 top-0 h-36 w-36 rounded-full bg-cyan-300/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-36 w-36 rounded-full bg-amber-300/10 blur-2xl" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

      <div className="relative mb-4 text-center">
        <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-100 shadow-md shadow-cyan-950/10">
          <BarChart3 className="h-5 w-5" />
        </div>

        <h2 className="text-xl font-black text-white md:text-2xl">
          إحصائياتك
        </h2>
      </div>

      <motion.div
        variants={sectionMotion}
        className="relative grid grid-cols-2 gap-2"
      >
        <StatCard
          label="مرات اللعب"
          value={gamesPlayed}
          icon={<Target className="h-4 w-4 text-amber-300" />}
          valueClassName="text-amber-300"
        />

        <StatCard
          label="مرات الفوز"
          value={gamesWon}
          icon={<Trophy className="h-4 w-4 text-emerald-300" />}
          valueClassName="text-emerald-300"
        />

        <StatCard
          label="نسبة الفوز"
          value={winRate}
          suffix="%"
          icon={<BarChart3 className="h-4 w-4 text-amber-300" />}
          valueClassName="text-amber-300"
        />

        <StatCard
          label="أفضل سلسلة فوز"
          value={bestWinStreak}
          icon={<Flame className="h-4 w-4 text-emerald-300" />}
          valueClassName="text-emerald-300"
        />
      </motion.div>
    </motion.div>
  );
}
