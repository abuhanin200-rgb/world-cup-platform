"use client";

import { useEffect, useState } from "react";
import {
  formatCountdown,
  getSecondsUntilMakkahTomorrow,
} from "@/lib/makkahDate";

export default function TomorrowCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(
    getSecondsUntilMakkahTomorrow()
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft(getSecondsUntilMakkahTomorrow());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className="mx-auto w-full max-w-sm rounded-2xl border border-white/10 bg-white/10 p-4 text-center shadow-2xl"
      dir="rtl"
    >
      <p className="mb-1 text-sm font-bold text-slate-300">
        كلمة جديدة بعد
      </p>

      <p className="text-2xl font-black tracking-wider text-amber-300">
        {formatCountdown(secondsLeft)}
      </p>
    </div>
  );
}