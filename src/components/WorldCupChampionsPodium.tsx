"use client";

import { useEffect, useState } from "react";
import { Crown, Medal, Sparkles } from "lucide-react";
import { getLeaderboardUsers, type LeaderboardUser } from "@/lib/leaderboard";

const PODIUM_META = [
  { rank: 2, label: "الوصيف", height: "md:mt-10", tone: "from-slate-300/20 to-slate-500/5", medal: "text-slate-200" },
  { rank: 1, label: "البطل", height: "md:mt-0", tone: "from-amber-300/28 to-amber-500/7", medal: "text-amber-300" },
  { rank: 3, label: "المركز الثالث", height: "md:mt-16", tone: "from-orange-400/20 to-orange-700/5", medal: "text-orange-300" },
] as const;

export default function WorldCupChampionsPodium() {
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getLeaderboardUsers()
      .then((rows) => {
        if (active) setLeaders(rows.slice(0, 3));
      })
      .catch((error) => console.error("World Cup champions podium error:", error))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-3 pb-5 pt-5 sm:px-4 md:px-6 md:pb-8 md:pt-7" aria-labelledby="world-cup-champions-title">
      <div className="relative overflow-hidden rounded-[24px] border border-amber-300/20 bg-gradient-to-br from-[#111827] via-[#08142c] to-[#040914] p-4 shadow-2xl shadow-black/25 md:rounded-[32px] md:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-52 w-52 rounded-full border-[26px] border-amber-300/[0.07]" aria-hidden="true" />
        <div className="relative mb-4 flex items-start justify-between gap-4 md:mb-7">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-amber-300 md:text-xs">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> تكريم أبطال التحدي
            </div>
            <h2 id="world-cup-champions-title" className="mt-1 text-xl font-black text-white md:text-3xl">منصة تتويج كأس العالم 2026</h2>
            <p className="mt-1.5 max-w-2xl text-[11px] font-semibold leading-5 text-white/50 md:text-sm md:leading-7">أصحاب المراكز الثلاثة الأولى في الترتيب النهائي للبطولة.</p>
          </div>
          <Crown className="h-8 w-8 shrink-0 text-amber-300 md:h-10 md:w-10" aria-hidden="true" />
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            {[0, 1, 2].map((item) => <div key={item} className="h-32 animate-pulse rounded-[20px] bg-white/[0.05] md:h-44" />)}
          </div>
        ) : leaders.length < 3 ? (
          <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-5 text-center text-xs font-bold text-white/55">ستظهر منصة التتويج بعد اكتمال بيانات المراكز الثلاثة الأولى.</div>
        ) : (
          <div className="grid grid-cols-3 items-end gap-2 md:gap-4">
            {PODIUM_META.map((meta) => {
              const user = leaders[meta.rank - 1];
              const first = meta.rank === 1;
              return (
                <article key={meta.rank} className={`${meta.height} ${first ? "-translate-y-2 md:-translate-y-3" : ""} relative overflow-hidden rounded-[20px] border ${first ? "border-amber-300/35" : "border-white/10"} bg-gradient-to-b ${meta.tone} p-3 text-center shadow-xl shadow-black/20 md:rounded-[26px] md:p-5`}>
                  {first ? <div className="absolute inset-x-0 top-0 h-0.5 bg-amber-300" /> : null}
                  <div className={`mx-auto flex ${first ? "h-11 w-11 md:h-14 md:w-14" : "h-9 w-9 md:h-12 md:w-12"} items-center justify-center rounded-full border border-white/10 bg-black/25`}>
                    {first ? <Crown className={`h-5 w-5 md:h-7 md:w-7 ${meta.medal}`} aria-hidden="true" /> : <Medal className={`h-4.5 w-4.5 md:h-6 md:w-6 ${meta.medal}`} aria-hidden="true" />}
                  </div>
                  <div dir="ltr" className={`mt-2 font-black ${first ? "text-2xl text-amber-300 md:text-4xl" : "text-xl text-white md:text-3xl"}`}>{meta.rank}</div>
                  <div className="mt-1 text-[9px] font-black text-white/45 md:text-xs">{meta.label}</div>
                  <h3 className={`mt-2 line-clamp-2 font-black text-white ${first ? "text-sm md:text-xl" : "text-[11px] md:text-base"}`}>{user.fullName}</h3>
                  <div className="mt-2 inline-flex items-center rounded-full bg-black/25 px-2 py-1 text-[9px] font-black text-white/70 md:px-3 md:text-xs"><span dir="ltr">{user.points.toLocaleString("en-US")}</span>&nbsp;نقطة</div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
