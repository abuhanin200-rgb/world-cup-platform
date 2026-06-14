"use client";

import { useEffect, useState } from "react";
import {
  getTopCandidateTeams,
  TopCandidateTeam,
} from "@/lib/topCandidates";

function getRankStyle(rank: number) {
  if (rank === 1) {
    return "bg-amber-400 text-slate-950";
  }

  if (rank === 2) {
    return "bg-slate-200 text-slate-950";
  }

  return "bg-orange-400 text-slate-950";
}

export default function TopCandidateTeams() {
  const [teams, setTeams] = useState<TopCandidateTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTopTeams() {
      try {
        const data = await getTopCandidateTeams();
        setTeams(data);
      } catch (error) {
        console.error("فشل تحميل أفضل المنتخبات المرشحة:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTopTeams();

    const interval = setInterval(loadTopTeams, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/10 p-3 shadow-xl">
        <div className="text-center text-xs text-slate-300">
          جاري تحميل أفضل المنتخبات المرشحة...
        </div>
      </section>
    );
  }

  if (teams.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/10 p-3 shadow-xl">
        <div className="flex items-center justify-center gap-2 text-xs text-slate-300">
          <span>⭐</span>
          <span>لم يتم اختيار منتخبات مرشحة حتى الآن.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/10 p-3 shadow-xl md:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black md:text-base">
          ⭐ أفضل 3 منتخبات مرشحة
        </h2>

        <span className="hidden text-[11px] text-slate-300 md:inline">
          حسب اختيارات الأعضاء
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {teams.map((team) => (
          <div
            key={team.teamName}
            className="relative rounded-2xl border border-white/10 bg-slate-950/60 p-2 text-center md:p-3"
          >
            <div
              className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-black ${getRankStyle(
                team.rank
              )}`}
            >
              #{team.rank}
            </div>

            <div className="mt-4 text-2xl md:mt-3 md:text-3xl">
              {team.teamEmoji || "🏳️"}
            </div>

            <div className="mt-1 truncate text-xs font-black md:text-sm">
              {team.teamName}
            </div>

            <div className="mt-1 rounded-xl bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-200 md:text-xs">
              {team.votes} ترشيح
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}