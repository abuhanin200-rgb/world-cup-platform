"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { Clock3, RefreshCw } from "lucide-react";

const RIYADH_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Riyadh",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function getRemainingToRiyadhMidnightMs() {
  const parts = RIYADH_TIME_FORMATTER.formatToParts(new Date());
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  const secondsNow = get("hour") * 3600 + get("minute") * 60 + get("second");
  return Math.max(0, 24 * 3600 - secondsNow) * 1000;
}

function formatRemainingTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function TomorrowCountdown() {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    const update = () => setRemainingMs(getRemainingToRiyadhMidnightMs());
    update();
    const intervalId = window.setInterval(update, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const remainingTime = useMemo(() => formatRemainingTime(remainingMs), [remainingMs]);
  const progressPercent = useMemo(() => {
    const dayMs = 24 * 3600 * 1000;
    return Math.min(100, Math.max(0, ((dayMs - remainingMs) / dayMs) * 100));
  }, [remainingMs]);

  return (
    <section className="relative overflow-hidden rounded-[24px] border border-violet-300/12 bg-[#111537]/90 p-4 shadow-[0_16px_44px_rgba(4,6,27,.22)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(34,211,238,.11),transparent_32%),radial-gradient(circle_at_88%_80%,rgba(139,92,246,.13),transparent_34%)]" />
      <div className="relative grid items-center gap-3 sm:grid-cols-[1fr_auto]">
        <div className="text-center sm:text-right">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-2.5 py-1 text-[10px] font-black text-cyan-100">
            <RefreshCw className="h-3.5 w-3.5" /> التحدي يتجدد يوميًا
          </div>
          <h2 className="mt-2 text-lg font-black text-white">كلمة جديدة بعد</h2>
          <p className="mt-1 text-[10px] font-bold text-white/35">بتوقيت السعودية</p>
        </div>

        <div className="text-center sm:min-w-[190px]">
          <div className="inline-flex items-center gap-2" dir="ltr">
            <Clock3 className="h-4 w-4 text-violet-200" />
            <span className="text-[clamp(1.8rem,8vw,2.35rem)] font-black leading-none tabular-nums tracking-tight text-cyan-100">{remainingTime}</span>
          </div>
          <div className="mx-auto mt-3 h-1.5 max-w-[220px] overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-gradient-to-l from-cyan-300 via-violet-400 to-fuchsia-400 transition-[width] duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(TomorrowCountdown);
