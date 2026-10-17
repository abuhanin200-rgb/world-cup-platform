"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Crown, Medal, Sparkles, Trophy } from "lucide-react";
import MemberProfileLink from "@/components/members/MemberProfileLink";
import { getTournamentSectionHref, type Tournament, type TournamentUserStatsV2 } from "@/domain/tournaments";
import { getTournamentLeaderboardV2 } from "@/lib/tournamentV2Firestore";

const PODIUM_META = [
  { rank: 2, label: "الوصيف", height: "md:mt-10", tone: "from-slate-300/20 to-slate-500/5", medal: "text-slate-200" },
  { rank: 1, label: "البطل", height: "md:mt-0", tone: "from-amber-300/28 to-amber-500/7", medal: "text-amber-300" },
  { rank: 3, label: "المركز الثالث", height: "md:mt-16", tone: "from-orange-400/20 to-orange-700/5", medal: "text-orange-300" },
] as const;

/** Final podium: only mounted after Firestore status === 'finished'. */
export default function GulfCup27ChampionsPodium({ tournament }: { tournament: Tournament }) {
  const [leaders, setLeaders] = useState<TournamentUserStatsV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    getTournamentLeaderboardV2(tournament.id)
      .then((rows) => {
        if (active) setLeaders(rows.slice(0, 3));
      })
      .catch((loadError) => {
        console.error("Gulf Cup 27 final podium error:", loadError);
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [tournament.id]);

  return (
    <section className="pb-3 pt-3 md:pb-5 md:pt-4" aria-labelledby="gulf27-champions-title">
      <div className="relative overflow-hidden rounded-[24px] border border-amber-300/20 bg-gradient-to-br from-[#111827] via-[#08142c] to-[#040914] p-4 shadow-2xl shadow-black/25 md:rounded-[32px] md:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-52 w-52 rounded-full border-[26px] border-amber-300/[0.07]" aria-hidden="true" />
        <div className="relative mb-4 flex items-start justify-between gap-3 md:mb-7">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-amber-300 md:text-xs">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> تكريم أبطال التحدي
            </div>
            <h2 id="gulf27-champions-title" className="mt-1 text-xl font-black text-white md:text-3xl">منصة تتويج خليجي 27</h2>
            <p className="mt-1.5 max-w-2xl text-[11px] font-semibold leading-5 text-white/50 md:text-sm md:leading-7">
              أصحاب المراكز الثلاثة الأولى في الترتيب النهائي للبطولة، بعد اعتماد جميع النتائج.
            </p>
          </div>
          <Trophy className="h-8 w-8 shrink-0 text-amber-300 md:h-10 md:w-10" aria-hidden="true" />
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-2 md:gap-4" aria-label="جاري تحميل منصة التتويج">
            {[0, 1, 2].map((item) => <div key={item} className="h-32 animate-pulse rounded-[20px] bg-white/[0.05] md:h-44" />)}
          </div>
        ) : error ? (
          <div role="status" className="rounded-[20px] border border-white/10 bg-white/[0.04] p-5 text-center text-xs font-bold text-white/55">تعذر تحميل الترتيب النهائي حاليًا. حدّث الصفحة للمحاولة مرة أخرى.</div>
        ) : leaders.length < 3 ? (
          <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-5 text-center text-xs font-bold text-white/55">بانتظار اكتمال بيانات المراكز الثلاثة الأولى المعتمدة.</div>
        ) : (
          <div className="grid grid-cols-3 items-end gap-2 md:gap-4">
            {PODIUM_META.map((meta) => {
              const member = leaders[meta.rank - 1];
              const first = meta.rank === 1;
              return (
                <article key={meta.rank} className={`${meta.height} ${first ? "-translate-y-2 md:-translate-y-3" : ""} relative min-w-0 overflow-hidden rounded-[20px] border ${first ? "border-amber-300/35" : "border-white/10"} bg-gradient-to-b ${meta.tone} p-2.5 text-center shadow-xl shadow-black/20 md:rounded-[26px] md:p-5`}>
                  {first ? <div className="absolute inset-x-0 top-0 h-0.5 bg-amber-300" /> : null}
                  <div className={`mx-auto flex ${first ? "h-11 w-11 md:h-14 md:w-14" : "h-9 w-9 md:h-12 md:w-12"} items-center justify-center rounded-full border border-white/10 bg-black/25`}>
                    {first ? <Crown className={`h-5 w-5 md:h-7 md:w-7 ${meta.medal}`} aria-hidden="true" /> : <Medal className={`h-5 w-5 md:h-6 md:w-6 ${meta.medal}`} aria-hidden="true" />}
                  </div>
                  <div dir="ltr" className={`mt-2 font-black ${first ? "text-2xl text-amber-300 md:text-4xl" : "text-xl text-white md:text-3xl"}`}>{meta.rank}</div>
                  <div className="mt-1 text-[9px] font-black text-white/45 md:text-xs">{meta.label}</div>
                  <h3 className={`mt-2 line-clamp-2 break-words font-black text-white ${first ? "text-[11px] md:text-xl" : "text-[10px] md:text-base"}`}>
                    <MemberProfileLink userId={member.userId}>{member.fullName}</MemberProfileLink>
                  </h3>
                  <div className="mt-2 inline-flex max-w-full items-center rounded-full bg-black/25 px-2 py-1 text-[9px] font-black text-white/70 md:px-3 md:text-xs">
                    <span dir="ltr" className="tabular-nums">{member.points.toLocaleString("en-US")}</span>&nbsp;نقطة
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="relative mt-5 flex justify-center md:mt-7">
          <Link href={getTournamentSectionHref(tournament, "leaderboard")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 text-xs font-black text-amber-100 transition hover:bg-amber-300/15">
            الترتيب النهائي كاملًا <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
