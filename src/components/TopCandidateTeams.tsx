"use client";

import { useEffect, useState } from "react";
import {
  getTopCandidateTeams,
  TopCandidateTeam,
} from "@/lib/topCandidates";

export default function TopCandidateTeams() {
  const [teams, setTeams] = useState<TopCandidateTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTopCandidates() {
      try {
        const data = await getTopCandidateTeams();
        setTeams(data);
      } catch (error) {
        console.error("فشل تحميل أفضل المنتخبات المرشحة:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTopCandidates();

    const interval = setInterval(loadTopCandidates, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/10 p-3 shadow-2xl md:p-5">
      <div className="mb-3 text-center">
        <h2 className="text-lg font-black md:text-2xl">
          أفضل 3 منتخبات مرشحة للقب
        </h2>
        <p className="mt-1 text-[11px] text-slate-300 md:text-sm">
          حسب اختيارات الأعضاء أثناء التسجيل.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-center text-sm text-slate-300">
          جاري تحميل المرشحين...
        </div>
      ) : teams.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-center text-sm text-slate-300">
          لم يتم اختيار أي منتخب حتى الآن.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          {teams.map((team) => (
            <div
              key={team.teamName}
              className="rounded-2xl border border-white/10 bg-slate-950/70 p-2 text-center md:p-4"
            >
              <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-slate-950 md:h-9 md:w-9 md:text-sm">
                {team.rank}
              </div>

              <div className="mb-1 text-2xl md:text-4xl">
                {team.teamEmoji || "🏳️"}
              </div>

              <h3 className="truncate text-xs font-black md:text-base">
                {team.teamName}
              </h3>

              <p className="mt-1 text-[10px] text-slate-300 md:text-xs">
                {team.votes} ترشيح
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}