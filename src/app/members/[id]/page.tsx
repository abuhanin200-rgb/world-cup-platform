"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Award,
  Crown,
  Flag,
  Gamepad2,
  Medal,
  Sparkles,
  Target,
  Trophy,
  UserRound,
} from "lucide-react";
import { getLevelLabel } from "@/domain/games/platformGames";
import TeamFlag from "@/components/TeamFlag";

const GAME_LABELS: Record<string, string> = {
  "word-game": "خمن كلمة اليوم",
  "flag-memory": "تحدي الأعلام",
  "ten-seconds": "العشر ثواني",
};

type TournamentStat = {
  id: string;
  slug: string;
  name: string;
  status: string;
  legacy: boolean;
  points: number;
  rank: number | null;
  played: number;
  exact: number;
  correct: number;
  wrong: number;
  bestStreak: number;
};

type MemberProfile = {
  member: { id: string; fullName: string; favoriteTeam: string; teamEmoji: string; createdAt: string | null };
  summary: { tournamentPoints: number; tournamentPlayed: number; tournamentExact: number; gameXp: number; gameLevel: number; gamesPlayed: number; gamesWins: number };
  tournaments: TournamentStat[];
  games: { totalXp: number; level: number; gamesPlayed: number; wins: number; breakdown: Array<{ gameId: string; played: number; wins: number; xp: number }> };
};

function SmallStat({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="altahaddi-glass-soft rounded-2xl p-3 text-center">
      <div dir="ltr" className={`text-lg font-black md:text-xl ${accent ? "text-[var(--brand-yellow)]" : "text-white"}`}>{value}</div>
      <div className="mt-1 text-[9px] font-bold text-white/40">{label}</div>
    </div>
  );
}

export default function PublicMemberProfilePage() {
  const params = useParams<{ id: string }>();
  const reduceMotion = useReducedMotion();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = String(params?.id || "").trim();
    if (!id) return;
    let active = true;
    fetch(`/api/members/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 404 ? "العضو غير موجود" : "تعذر تحميل ملف العضو");
        return (await response.json()) as MemberProfile;
      })
      .then((data) => { if (active) setProfile(data); })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "تعذر تحميل ملف العضو"); });
    return () => { active = false; };
  }, [params?.id]);

  const bestRank = useMemo(() => {
    const ranks = profile?.tournaments.map((item) => item.rank).filter((rank): rank is number => Boolean(rank && rank > 0)) || [];
    return ranks.length ? Math.min(...ranks) : null;
  }, [profile]);

  if (error) return <main className="mx-auto max-w-5xl px-3 py-12 text-center"><div className="altahaddi-glass-strong rounded-[30px] p-8"><UserRound className="mx-auto h-9 w-9 text-white/25" /><h1 className="mt-3 text-xl font-black">{error}</h1><Link href="/" className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--brand-yellow)] px-4 text-xs font-black text-[#061a4d]">الرئيسية <ArrowLeft className="h-4 w-4" /></Link></div></main>;
  if (!profile) return <main className="mx-auto max-w-6xl px-3 py-8"><div className="h-44 animate-pulse rounded-[32px] bg-white/[0.05]" /><div className="mt-4 grid grid-cols-4 gap-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/[0.04]" />)}</div></main>;

  const { member, summary, tournaments, games } = profile;
  return (
    <main dir="rtl" className="relative mx-auto max-w-6xl overflow-hidden px-3 pb-20 pt-4 sm:px-4 md:px-6 md:pt-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] bg-[radial-gradient(circle_at_85%_5%,rgba(255,194,16,.11),transparent_24%),radial-gradient(circle_at_10%_25%,rgba(46,117,255,.15),transparent_30%)]" />

      <motion.section initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="altahaddi-glass-strong relative overflow-hidden rounded-[30px] p-5 md:rounded-[38px] md:p-8">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,.05),transparent_42%),radial-gradient(circle_at_88%_10%,rgba(255,194,16,.16),transparent_26%)]" />
        <div className="relative flex items-center gap-4 md:gap-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[22px] border border-white/14 bg-white/[0.07] text-2xl font-black text-[var(--brand-yellow)] md:h-20 md:w-20">{member.fullName.charAt(0)}</div>
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-yellow)]/20 bg-[var(--brand-yellow)]/[0.07] px-2.5 py-1.5 text-[9px] font-black text-[var(--brand-yellow)]"><Sparkles className="h-3 w-3" /> ملف عضو التحدي</div>
            <h1 className="mt-2 truncate text-2xl font-black md:text-4xl">{member.fullName}</h1>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-[11px] font-bold text-white/65">
              {member.favoriteTeam ? <TeamFlag name={member.favoriteTeam} size="sm" /> : <Flag className="h-3.5 w-3.5 text-white/35" />}
              <span>{member.favoriteTeam ? `يشجع ${member.favoriteTeam}` : "لم يحدد منتخبًا مفضلًا"}</span>
            </div>
          </div>
          {bestRank ? <div className="hidden rounded-[22px] border border-[var(--brand-yellow)]/18 bg-[var(--brand-yellow)]/[0.06] p-4 text-center sm:block"><Crown className="mx-auto h-5 w-5 text-[var(--brand-yellow)]" /><div className="mt-1 text-xl font-black">#{bestRank}</div><div className="text-[9px] font-bold text-white/35">أفضل مركز</div></div> : null}
        </div>
      </motion.section>

      <section className="mt-4 grid grid-cols-4 gap-1.5 md:gap-3">
        <SmallStat label="نقاط البطولات" value={summary.tournamentPoints} accent />
        <SmallStat label="المشاركات" value={summary.tournamentPlayed} />
        <SmallStat label="بالملي" value={summary.tournamentExact} />
        <SmallStat label="XP الألعاب" value={summary.gameXp} />
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-black text-[var(--brand-yellow)]">مسيرته في البطولات</p><h2 className="mt-1 text-2xl font-black">كل البطولات</h2></div><Trophy className="h-6 w-6 text-[var(--brand-yellow)]" /></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tournaments.map((item) => (
            <article key={item.id} className="altahaddi-glass relative overflow-hidden rounded-[26px] p-4 md:p-5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(255,194,16,.08),transparent_30%)]" />
              <div className="relative">
                <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black text-white/35">{item.legacy ? "سجل تاريخي" : item.status === "upcoming" ? "قريبًا" : "بطولة"}</p><h3 className="mt-1 text-lg font-black">{item.name}</h3></div><div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.05]"><Medal className="h-5 w-5 text-[var(--brand-yellow)]" /></div></div>
                <div className="mt-4 grid grid-cols-3 gap-1.5"><SmallStat label="المركز" value={item.rank || "—"} accent /><SmallStat label="النقاط" value={item.points} /><SmallStat label="لعب" value={item.played} /></div>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5"><SmallStat label="بالملي" value={item.exact} /><SmallStat label="صحيح" value={item.correct} /><SmallStat label="سلسلة" value={item.bestStreak} /></div>
                {item.slug ? <Link href={`/tournaments/${item.slug}/leaderboard`} className="mt-4 inline-flex min-h-[42px] items-center gap-2 text-[10px] font-black text-[var(--brand-yellow)]">فتح ترتيب البطولة <ArrowLeft className="h-3.5 w-3.5" /></Link> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-7 altahaddi-glass-strong rounded-[30px] p-4 md:p-6">
        <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black text-[var(--brand-yellow)]">الألعاب والتحديات</p><h2 className="mt-1 text-2xl font-black">تقدمه في الألعاب</h2></div><Gamepad2 className="h-6 w-6 text-[var(--brand-yellow)]" /></div>
        <div className="mt-4 grid grid-cols-4 gap-1.5 md:gap-3"><SmallStat label="XP" value={games.totalXp} accent /><SmallStat label="المستوى" value={games.level} /><SmallStat label="التحديات" value={games.gamesPlayed} /><SmallStat label="الفوز" value={games.wins} /></div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {games.breakdown.map((game) => (
            <div key={game.gameId} className="altahaddi-glass-soft rounded-[22px] p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-black">{GAME_LABELS[game.gameId] || "لعبة"}</h3><Award className="h-4 w-4 text-[var(--brand-yellow)]" /></div><div className="mt-3 grid grid-cols-3 gap-1.5"><SmallStat label="لعب" value={game.played} /><SmallStat label="فوز" value={game.wins} /><SmallStat label="XP" value={game.xp} accent /></div></div>
          ))}
        </div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-bold text-white/45"><Target className="h-3.5 w-3.5 text-[var(--brand-yellow)]" /> {getLevelLabel(games.level)}</div>
      </section>
    </main>
  );
}
