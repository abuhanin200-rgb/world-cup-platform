"use client";

import { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { BarChart3, Target, Trophy, UsersRound } from "lucide-react";
import { db } from "@/lib/firebase";
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
          const [matches, predictions, users] = await Promise.all([
            getCountFromServer(collection(db, "matches")),
            getCountFromServer(collection(db, "predictions")),
            getCountFromServer(collection(db, "users")),
          ]);
          if (active) setStats({ matches: matches.data().count, predictions: predictions.data().count, participants: users.data().count });
        } else {
          const [matches, predictions, participants] = await Promise.all([
            getCountFromServer(query(collection(db, "tournamentMatches"), where("tournamentId", "==", tournament.id))),
            getCountFromServer(query(collection(db, "tournamentPredictions"), where("tournamentId", "==", tournament.id))),
            getCountFromServer(query(collection(db, "tournamentUserStats"), where("tournamentId", "==", tournament.id))),
          ]);
          if (active) setStats({ matches: matches.data().count, predictions: predictions.data().count, participants: participants.data().count });
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
