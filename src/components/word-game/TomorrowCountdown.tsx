"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Clock3, Sparkles } from "lucide-react";

function getRemainingToMakkahMidnightMs() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Riyadh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value || 0);

  const secondsNow = get("hour") * 3600 + get("minute") * 60 + get("second");
  const secondsInDay = 24 * 3600;

  return Math.max(0, secondsInDay - secondsNow) * 1000;
}

function formatRemainingTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

const scrollOnceViewport = {
  once: true,
  amount: 0.18,
} as const;

const cardMotion: Variants = {
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

const itemMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.22,
      ease: "easeOut",
    },
  },
};

export default function TomorrowCountdown() {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    function updateCountdown() {
      setRemainingMs(getRemainingToMakkahMidnightMs());
    }

    updateCountdown();

    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const remainingTime = useMemo(() => {
    return formatRemainingTime(remainingMs);
  }, [remainingMs]);

  const progressPercent = useMemo(() => {
    const secondsInDay = 24 * 3600 * 1000;
    const elapsedPercent = ((secondsInDay - remainingMs) / secondsInDay) * 100;

    return Math.min(100, Math.max(0, elapsedPercent));
  }, [remainingMs]);

  return (
    <motion.div
      variants={cardMotion}
      initial="hidden"
      whileInView="show"
      viewport={scrollOnceViewport}
      whileTap={{ scale: 0.995 }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.09] px-4 py-4 text-center shadow-lg shadow-slate-950/25 backdrop-blur-sm"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-amber-300/10" />
      <div className="pointer-events-none absolute -right-20 top-0 h-36 w-36 rounded-full bg-amber-300/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-36 w-36 rounded-full bg-cyan-300/10 blur-2xl" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

      <div className="relative">
        <motion.div
          variants={itemMotion}
          className="mx-auto mb-2 inline-flex items-center justify-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-100 shadow-md shadow-amber-950/10"
        >
          <Clock3 className="h-4 w-4" />

          <span>كلمة جديدة بعد</span>

          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
        </motion.div>

        <motion.div
          variants={itemMotion}
          className="mt-2 flex items-center justify-center"
          dir="ltr"
        >
          <p className="text-[32px] font-black leading-none tracking-tight text-amber-300 tabular-nums drop-shadow md:text-[36px]">
            {remainingTime}
          </p>
        </motion.div>

        <motion.div
          variants={itemMotion}
          className="mx-auto mt-4 h-2 max-w-sm overflow-hidden rounded-full border border-white/10 bg-slate-950/50"
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-l from-amber-300 via-amber-400 to-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          />
        </motion.div>

        <motion.p
          variants={itemMotion}
          className="mt-2 text-[11px] font-bold text-slate-400"
        >
          التحديث يتم تلقائيًا بتوقيت مكة
        </motion.p>
      </div>
    </motion.div>
  );
}
