"use client";

import { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { BarChart3, Target, Trophy, UsersRound } from "lucide-react";
import { db } from "@/lib/firebase";
import type { Tournament } from "@/domain/tournaments";

type Stats = { matches: number; predictions: number; participants: number; label: string };

export default function TournamentStatsSummary({ tournament }: { tournament: Tournament }) {
  const [stats, setStats] = useState<Stats>({ matches: 0, predictions: 0, participants: 0, label: tournament.status === "finished" ? "منتهية" : tournament.status === "coming_soon" ? "قريبًا" : "جارية" });
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
          if (active) setStats((current) => ({ ...current, matches: matches.data().count, predictions: predictions.data().count, participants: users.data().count }));
        } else {
          const [matches, predictions, participants] = await Promise.all([
            getCountFromServer(query(collection(db, "tournamentMatches"), where("tournamentId", "==", tournament.id))),
            getCountFromServer(query(collection(db, "tournamentPredictions"), where("tournamentId", "==", tournament.id))),
            getCountFromServer(query(collection(db, "tournamentUserStats"), where("tournamentId", "==", tournament.id))),
          ]);
          if (active) setStats((current) => ({ ...current, matches: matches.data().count, predictions: predictions.data().count, participants: participants.data().count }));
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

  const cards = [
    { label: "المباريات", value: stats.matches, icon: BarChart3 },
    { label: "التوقعات", value: stats.predictions, icon: Target },
    { label: "المشاركون", value: stats.participants, icon: UsersRound },
  ];

  return (
    <section className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <article key={label} className="flex min-h-[68px] items-center gap-2.5 rounded-[16px] border border-white/10 bg-white/[0.045] p-2.5 md:min-h-[74px] md:p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]"><Icon className="h-3.5 w-3.5 text-[var(--tournament-primary)]" aria-hidden="true" /></div>
          <div><div dir="ltr" className="text-lg font-black md:text-xl">{loading ? "—" : value.toLocaleString("en-US")}</div><div className="mt-0.5 text-[9px] font-bold text-white/50 md:text-[10px]">{label}</div></div>
        </article>
      ))}
      <article className="flex min-h-[68px] items-center gap-2.5 rounded-[16px] border border-white/10 bg-white/[0.045] p-2.5 md:min-h-[74px] md:p-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]"><Trophy className="h-3.5 w-3.5 text-[var(--tournament-accent)]" aria-hidden="true" /></div>
        <div><div className="text-base font-black md:text-lg">{stats.label}</div><div className="mt-0.5 text-[9px] font-bold text-white/50 md:text-[10px]">حالة البطولة</div></div>
      </article>
    </section>
  );
}
