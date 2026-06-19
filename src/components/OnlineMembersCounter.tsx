"use client";

import { useEffect, useState } from "react";
import { subscribeOnlineMembersCount } from "@/lib/presence";

export default function OnlineMembersCounter() {
  const [count, setCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeOnlineMembersCount(setCount);

    return () => {
      unsubscribe();
    };
  }, [refreshKey]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRefreshKey((current) => current + 1);
    }, 30 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto my-4 flex w-fit items-center justify-center rounded-full border border-emerald-400/20 bg-slate-950/50 px-4 py-2 text-center text-sm font-black text-emerald-100 shadow-lg md:text-base">
      🟢 {count} عضو متواجد الآن
    </div>
  );
}