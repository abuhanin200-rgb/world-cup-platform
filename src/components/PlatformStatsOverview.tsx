"use client";

import { useEffect, useState } from "react";
import { BarChart3, Gamepad2, Target, Trophy, UsersRound } from "lucide-react";
import { getRegisteredTournaments } from "@/domain/tournaments";

type Stats = { members: number; predictions: number; matches: number; gamePlayers: number };
const INITIAL: Stats = { members: 0, predictions: 0, matches: 0, gamePlayers: 0 };

export default function PlatformStatsOverview() {
  const [stats, setStats] = useState(INITIAL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/public/stats", { cache: "no-store" });
        if (!response.ok) throw new Error(`PLATFORM_STATS_${response.status}`);
        const data = (await response.json()) as Stats;
        if (!active) return;
        setStats(data);
      } catch (error) {
        console.error("Platform stats error:", error);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const cards = [
    { label: "الأعضاء", value: stats.members, icon: UsersRound },
    { label: "البطولات", value: getRegisteredTournaments().filter((item) => item.status !== "hidden").length, icon: Trophy },
    { label: "التوقعات", value: stats.predictions, icon: Target },
    { label: "المباريات", value: stats.matches, icon: BarChart3 },
    { label: "لاعبو الألعاب", value: stats.gamePlayers, icon: Gamepad2 },
  ];

  return (
    <section aria-labelledby="platform-stats-heading">
      <div className="mb-3">
        <p className="text-[10px] font-black text-[var(--brand-yellow)] md:text-xs">أرقام المنصة</p>
        <h2 id="platform-stats-heading" className="mt-0.5 text-lg font-black md:text-xl">التحدي بالأرقام</h2>
      </div>
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
        {cards.map(({ label, value, icon: Icon }) => (
          <article key={label} className="altahaddi-glass-soft group relative flex min-h-[76px] min-w-0 flex-col justify-between overflow-hidden rounded-[14px] p-2 sm:min-h-[86px] sm:rounded-[16px] sm:p-2.5 md:min-h-[92px]">
            <div className="pointer-events-none absolute -left-6 -top-7 h-16 w-16 rounded-full bg-[#ffc210]/[0.045] blur-xl" />
            <div className="relative flex h-6 w-6 items-center justify-center rounded-[8px] bg-[#ffc210]/10 text-[#ffc210] sm:h-7 sm:w-7">
              <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
            </div>
            <div className="relative mt-1.5 min-w-0">
              <div dir="ltr" className="truncate text-[15px] font-black tracking-tight text-white sm:text-lg md:text-xl">{loading ? "—" : value.toLocaleString("en-US")}</div>
              <div className="mt-0.5 truncate text-[7px] font-bold leading-none text-white/46 sm:text-[8px] md:text-[9px]">{label}</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
