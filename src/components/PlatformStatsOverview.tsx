"use client";

import { useEffect, useState } from "react";
import { collection, getCountFromServer } from "firebase/firestore";
import { BarChart3, Gamepad2, Target, Trophy, UsersRound } from "lucide-react";
import { db } from "@/lib/firebase";
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
        const [users, legacyPredictions, tournamentPredictions, legacyMatches, tournamentMatches, gamePlayers] = await Promise.all([
          getCountFromServer(collection(db, "users")),
          getCountFromServer(collection(db, "predictions")),
          getCountFromServer(collection(db, "tournamentPredictions")),
          getCountFromServer(collection(db, "matches")),
          getCountFromServer(collection(db, "tournamentMatches")),
          getCountFromServer(collection(db, "platformGameStats")),
        ]);
        if (!active) return;
        setStats({
          members: users.data().count,
          predictions: legacyPredictions.data().count + tournamentPredictions.data().count,
          matches: legacyMatches.data().count + tournamentMatches.data().count,
          gamePlayers: gamePlayers.data().count,
        });
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
      <div className="mb-2.5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black text-[var(--brand-yellow)] md:text-xs">أرقام المنصة</p>
          <h2 id="platform-stats-heading" className="mt-0.5 text-lg font-black md:text-xl">التحدي بالأرقام</h2>
        </div>
        <span className="text-[10px] font-bold text-white/45 md:text-xs">تتحدث مع نشاط المنصة</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(({ label, value, icon: Icon }) => (
          <article key={label} className="flex min-h-[70px] items-center gap-2.5 rounded-[16px] border border-white/10 bg-white/[0.045] p-2.5 md:min-h-[76px] md:rounded-[18px] md:p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ffc210]/10 text-[#ffc210]">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div dir="ltr" className="text-lg font-black tracking-tight text-white md:text-xl">{loading ? "—" : value.toLocaleString("en-US")}</div>
              <div className="mt-0.5 text-[9px] font-bold text-white/48 md:text-[10px]">{label}</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
