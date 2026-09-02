"use client";

import { useEffect, useState } from "react";
import { BarChart3, Target, Trophy, UsersRound } from "lucide-react";
import { getTournamentDisplayStatus, getTournamentStatusLabel, type Tournament } from "@/domain/tournaments";

type Stats = { matches: number; predictions: number; participants: number };

export default function TournamentStatsSummary({ tournament }: { tournament: Tournament }) {
  const [stats, setStats] = useState<Stats>({ matches: 0, predictions: 0, participants: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (tournament.engine === "legacy_wc2026") {
          const response = await fetch("/api/public/stats?scope=legacy", { cache: "no-store" });
          if (!response.ok) throw new Error(`TOURNAMENT_STATS_${response.status}`);
          const data = (await response.json()) as Stats;
          if (active) setStats(data);
        } else {
          const response = await fetch(`/api/public/stats?tournamentId=${encodeURIComponent(tournament.id)}`, { cache: "no-store" });
          if (!response.ok) throw new Error(`TOURNAMENT_STATS_${response.status}`);
          const data = (await response.json()) as Stats;
          if (active) setStats(data);
        }
      } catch (error) {
        console.error("Tournament stats error:", error);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [tournament.engine, tournament.id]);

  const displayStatus = getTournamentDisplayStatus(tournament);
  const cards = [
    { label: "المباريات", value: loading ? "—" : stats.matches.toLocaleString("en-US"), icon: BarChart3, ltr: true },
    { label: "التوقعات", value: loading ? "—" : stats.predictions.toLocaleString("en-US"), icon: Target, ltr: true },
    { label: "المشاركون", value: loading ? "—" : stats.participants.toLocaleString("en-US"), icon: UsersRound, ltr: true },
    { label: "حالة البطولة", value: getTournamentStatusLabel(displayStatus), icon: Trophy, ltr: false },
  ];

  return (
    <section className="my-3 grid grid-cols-4 gap-1.5 md:my-4 md:gap-2">
      {cards.map(({ label, value, icon: Icon, ltr }) => (
        <article key={label} className="min-w-0 rounded-[15px] border border-white/[0.08] bg-white/[0.04] p-2 md:flex md:min-h-[68px] md:items-center md:gap-2.5 md:p-2.5">
          <div className="mb-2 grid h-7 w-7 place-items-center rounded-lg bg-white/[0.06] md:mb-0 md:h-8 md:w-8 md:shrink-0"><Icon className="h-3.5 w-3.5 text-[var(--tournament-primary)]" /></div>
          <div className="min-w-0"><div dir={ltr ? "ltr" : undefined} className="truncate text-sm font-black md:text-base">{value}</div><div className="mt-0.5 truncate text-[8px] font-bold text-white/42 md:text-[9px]">{label}</div></div>
        </article>
      ))}
    </section>
  );
}
