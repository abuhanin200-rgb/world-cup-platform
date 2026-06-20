"use client";

import { useEffect, useState } from "react";

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

export default function TomorrowCountdown() {
  const [remainingTime, setRemainingTime] = useState("00:00:00");

  useEffect(() => {
    function updateCountdown() {
      setRemainingTime(formatRemainingTime(getRemainingToMakkahMidnightMs()));
    }

    updateCountdown();

    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 px-4 py-4 text-center shadow-2xl">
      <p className="text-[13px] font-bold text-slate-300">
        كلمة جديدة بعد
      </p>

      <p
        className="mt-2 text-[32px] font-black leading-none tracking-tight text-amber-300 tabular-nums md:text-[36px]"
        dir="ltr"
      >
        {remainingTime}
      </p>
    </div>
  );
}