"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Crown,
  Flag,
  Gamepad2,
  Medal,
  Sparkles,
  Target,
  TimerReset,
  Trophy,
  Zap,
} from "lucide-react";
import { collection, doc, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { getLevelLabel, getLevelProgress, type PlatformGameStats } from "@/domain/games/platformGames";
import { playInteractionFeedback } from "@/lib/interactionFeedback";
import MemberProfileLink from "@/components/members/MemberProfileLink";

const GAMES = [
  {
    id: "word-game",
    title: "خمن كلمة اليوم",
    shortTitle: "الكلمة",
    description: "ست محاولات لاكتشاف كلمة رياضية واحدة. التحدي يتجدد كل يوم.",
    href: "/word-game",
    icon: Target,
    tag: "يومي",
    xp: "حتى 22 XP",
    visual: "letters",
    glow: "rgba(45,212,191,.18)",
  },
  {
    id: "flag-memory",
    title: "تحدي الأعلام",
    shortTitle: "الأعلام",
    description: "اختبر ذاكرتك وطابق أعلام المنتخبات بأقل وقت وأقل أخطاء.",
    href: "/flag-memory",
    icon: Flag,
    tag: "ذاكرة",
    xp: "حتى 20 XP",
    visual: "flags",
    glow: "rgba(56,189,248,.18)",
  },
  {
    id: "ten-seconds",
    title: "العشر ثواني",
    shortTitle: "10 ثوانٍ",
    description: "أوقف المؤقت عند 10.000 بالضبط. الدقة هنا أهم من السرعة.",
    href: "/ten-seconds-challenge",
    icon: TimerReset,
    tag: "دقة",
    xp: "XP عند الفوز",
    visual: "timer",
    glow: "rgba(255,194,16,.18)",
  },
] as const;

type GameId = (typeof GAMES)[number]["id"];

function mapStats(id: string, data: Record<string, unknown>): PlatformGameStats {
  const rawGameStats = data.gameStats && typeof data.gameStats === "object"
    ? (data.gameStats as PlatformGameStats["gameStats"])
    : {
        "word-game": { played: 0, wins: 0, xp: 0 },
        "flag-memory": { played: 0, wins: 0, xp: 0 },
        "ten-seconds": { played: 0, wins: 0, xp: 0 },
      };

  return {
    userId: String(data.userId || id),
    userName: String(data.userName || "عضو"),
    totalXp: Number(data.totalXp || 0),
    level: Math.max(1, Number(data.level || 1)),
    gamesPlayed: Number(data.gamesPlayed || 0),
    wins: Number(data.wins || 0),
    gameStats: rawGameStats,
    updatedAt: data.updatedAt,
  };
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-4 w-4 text-amber-300" aria-hidden="true" />;
  if (rank <= 3) return <Medal className="h-4 w-4 text-slate-200" aria-hidden="true" />;
  return <span dir="ltr" className="min-w-5 text-center text-xs font-black text-white/35">{rank}</span>;
}

function GameVisual({ kind }: { kind: (typeof GAMES)[number]["visual"] }) {
  if (kind === "letters") {
    return (
      <div className="grid grid-cols-4 gap-2" dir="ltr" aria-hidden="true">
        {["ت", "ح", "د", "ي"].map((letter, index) => (
          <motion.span
            key={`${letter}-${index}`}
            animate={{ y: [0, index % 2 === 0 ? -5 : 5, 0] }}
            transition={{ duration: 2.4 + index * 0.15, repeat: Infinity, ease: "easeInOut" }}
            className="grid h-12 w-12 place-items-center rounded-2xl border border-white/12 bg-white/[0.07] text-xl font-black text-white shadow-lg"
          >
            {letter}
          </motion.span>
        ))}
      </div>
    );
  }

  if (kind === "flags") {
    return (
      <div className="grid grid-cols-2 gap-2.5" aria-hidden="true">
        {["sa", "jp", "ar", "ma"].map((flag, index) => (
          <motion.span
            key={flag}
            animate={{ rotate: [0, index % 2 === 0 ? 2 : -2, 0], y: [0, -3, 0] }}
            transition={{ duration: 2.7 + index * 0.12, repeat: Infinity, ease: "easeInOut" }}
            className="grid h-14 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.06]"
          >
            <img src={`/flags/${flag}.svg`} alt="" className="h-8 w-12 rounded object-cover" />
          </motion.span>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      animate={{ scale: [1, 1.025, 1] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      dir="ltr"
      className="rounded-[24px] border border-[var(--brand-yellow)]/25 bg-black/25 px-6 py-4 text-4xl font-black tabular-nums text-[var(--brand-yellow)] shadow-[0_0_40px_rgba(255,194,16,.12)]"
    >
      10.000
    </motion.div>
  );
}

export default function GamesHub() {
  const { user, isLoggedIn } = useAuth();
  const reduceMotion = useReducedMotion();
  const [leaderboard, setLeaderboard] = useState<PlatformGameStats[]>([]);
  const [memberStats, setMemberStats] = useState<PlatformGameStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeGame, setActiveGame] = useState<GameId>("word-game");

  useEffect(() => {
    const leaderboardQuery = query(collection(db, "platformGameStats"), orderBy("totalXp", "desc"), limit(20));

    return onSnapshot(
      leaderboardQuery,
      (snapshot) => {
        setLeaderboard(snapshot.docs.map((item) => mapStats(item.id, item.data())));
        setLoadError("");
        setLoading(false);
      },
      (error) => {
        console.error("Platform games leaderboard error:", error);
        setLoadError("تعذر تحميل ترتيب الألعاب الآن.");
        setLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    return onSnapshot(doc(db, "platformGameStats", user.id), (snapshot) => {
      setMemberStats(snapshot.exists() ? mapStats(snapshot.id, snapshot.data()) : null);
    });
  }, [user?.id]);

  const memberIndex = user?.id ? leaderboard.findIndex((item) => item.userId === user.id) : -1;
  const memberRank = memberIndex >= 0 ? memberIndex + 1 : null;

  const selectedGame = GAMES.find((game) => game.id === activeGame) ?? GAMES[0];
  const SelectedGameIcon = selectedGame.icon;
  const xp = user?.id && memberStats?.userId === user.id ? memberStats.totalXp : 0;
  const levelProgress = getLevelProgress(xp);
  const topThree = leaderboard.slice(0, 3);
  const nextRankGap = memberRank && memberRank > 1 ? Math.max(0, leaderboard[memberRank - 2].totalXp - xp) : null;

  return (
    <main dir="rtl" className="relative min-h-screen overflow-hidden bg-[var(--brand-navy-950)] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[680px] bg-[radial-gradient(circle_at_10%_12%,rgba(255,194,16,.06),transparent_24%),radial-gradient(circle_at_88%_16%,rgba(51,112,255,.12),transparent_30%)]" />

      <section className="relative mx-auto max-w-6xl px-3 pb-20 pt-4 sm:px-4 md:px-6 md:pt-8">
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: "easeOut" }}
          className="altahaddi-glass-strong relative overflow-hidden rounded-[30px] p-4 md:rounded-[38px] md:p-7"
        >
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,.045),transparent_42%),radial-gradient(circle_at_8%_20%,rgba(255,194,16,.12),transparent_24%)]" />
          <div className="relative grid gap-5 lg:grid-cols-[1fr_330px] lg:items-center">
            <div>
              <div className="altahaddi-eyebrow inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-[var(--brand-yellow)]/20 bg-[var(--brand-yellow)]/[0.07] px-2.5 font-black text-[var(--brand-yellow)]">
                <Gamepad2 className="h-3.5 w-3.5" /> وقت التحدي
              </div>
              <h1 className="altahaddi-display-title mt-3 font-black">العب. اجمع XP. ارفع مستواك</h1>
              <p className="altahaddi-body-copy mt-2 max-w-xl font-semibold text-white/48">ثلاث ألعاب سريعة، ترتيب واحد، ومستوى يتطور مع كل مشاركة.</p>

              <div className="mt-5 grid grid-cols-3 gap-2 max-w-xl">
                <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3"><div dir="ltr" className="text-lg font-black text-[var(--brand-yellow)] md:text-xl">{xp} XP</div><div className="mt-1 text-[9px] font-bold text-white/38">نقاط الخبرة</div></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3"><div dir="ltr" className="text-lg font-black md:text-xl">{isLoggedIn ? levelProgress.level : "—"}</div><div className="mt-1 text-[9px] font-bold text-white/38">المستوى</div></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3"><div dir="ltr" className="text-lg font-black md:text-xl">{memberRank ?? "—"}</div><div className="mt-1 text-[9px] font-bold text-white/38">ترتيبك</div></div>
              </div>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-black/15 p-4 md:p-5">
              {isLoggedIn ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black text-[var(--brand-yellow)]">رحلة المستوى</p>
                      <h2 className="mt-1 text-lg font-black">{getLevelLabel(levelProgress.level)}</h2>
                    </div>
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--brand-yellow)] text-xl font-black text-[#04133a]">{levelProgress.level}</div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[var(--brand-yellow)] transition-[width]" style={{ width: `${levelProgress.progress}%` }} /></div>
                  <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-white/38"><span>المستوى {levelProgress.level}</span><span dir="ltr">{levelProgress.xpToNextLevel} XP متبقي</span></div>
                  {nextRankGap != null ? <div className="mt-2 rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-center text-[10px] font-bold text-white/55">يفصلك عن المركز التالي <span dir="ltr" className="font-black text-[var(--brand-yellow)] [unicode-bidi:isolate]">{nextRankGap} XP</span></div> : null}
                </>
              ) : (
                <div className="text-center">
                  <Sparkles className="mx-auto h-7 w-7 text-[var(--brand-yellow)]" />
                  <h2 className="mt-2 text-lg font-black">ابدأ من المستوى الأول</h2>
                  <p className="mt-1 text-[11px] font-semibold leading-5 text-white/42">سجّل دخولك حتى تحفظ XP وترتيبك.</p>
                  <Link href="/login" className="mt-3 inline-flex min-h-[42px] items-center justify-center rounded-xl bg-[var(--brand-yellow)] px-4 text-xs font-black text-[#04133a]">تسجيل الدخول</Link>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <section className="mt-5 md:mt-7" aria-labelledby="games-showcase-heading">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div><p className="altahaddi-eyebrow font-black text-[var(--brand-yellow)]">اختر لعبتك</p><h2 id="games-showcase-heading" className="altahaddi-section-title mt-1 font-black">تحدي مختلف كل مرة</h2></div>
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-white/55 sm:text-[10px]"><Zap className="h-3.5 w-3.5 text-[var(--brand-yellow)]" /> XP الألعاب مستقل عن نقاط البطولات</div>
          </div>

          <div className="altahaddi-glass relative overflow-hidden rounded-[30px] md:rounded-[36px]">
            <motion.div key={selectedGame.id} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0" style={{ background: `radial-gradient(circle at 16% 18%, ${selectedGame.glow}, transparent 32%), linear-gradient(135deg, rgba(255,255,255,.035), transparent 48%)` }} />
            <div className="relative grid min-h-[350px] gap-5 p-4 md:grid-cols-[1fr_310px] md:items-center md:p-7">
              <div className="order-2 md:order-1">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-[10px] font-black text-white/58"><SelectedGameIcon className="h-3.5 w-3.5 text-[var(--brand-yellow)]" />{selectedGame.tag}</div>
                <h3 className="altahaddi-feature-title mt-3 font-black">{selectedGame.title}</h3>
                <p className="altahaddi-body-copy mt-2 max-w-lg font-semibold text-white/46">{selectedGame.description}</p>
                <div className="mt-4 inline-flex rounded-xl border border-[var(--brand-yellow)]/18 bg-[var(--brand-yellow)]/[0.06] px-3 py-2 text-[10px] font-black text-[var(--brand-yellow)]" dir="ltr">{selectedGame.xp}</div>
                <div className="mt-5"><Link href={selectedGame.href} onClick={() => playInteractionFeedback("selection")} className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-[var(--brand-yellow)] px-5 text-sm font-black text-[#04133a] shadow-[0_14px_34px_rgba(255,194,16,.18)] transition active:scale-[0.98]">ابدأ اللعب <ArrowLeft className="h-4 w-4" /></Link></div>
              </div>
              <div className="order-1 grid min-h-[160px] place-items-center overflow-hidden rounded-[26px] border border-white/10 bg-black/15 md:order-2 md:min-h-[245px]"><GameVisual kind={selectedGame.visual} /></div>
            </div>

            <div className="relative grid grid-cols-3 gap-1.5 border-t border-white/[0.07] bg-black/10 p-2 md:gap-2 md:p-3">
              {GAMES.map((game) => {
                const Icon = game.icon;
                const active = game.id === activeGame;
                return (
                  <button key={game.id} type="button" onClick={() => { setActiveGame(game.id); playInteractionFeedback("selection"); }} aria-pressed={active} className={`flex min-h-[58px] items-center justify-center gap-2 rounded-2xl border px-2 text-[10px] font-black transition md:text-xs ${active ? "border-[var(--brand-yellow)]/45 bg-[var(--brand-yellow)]/[0.10] text-white" : "border-white/[0.07] bg-white/[0.03] text-white/45 hover:bg-white/[0.06] hover:text-white/70"}`}>
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${active ? "bg-[var(--brand-yellow)] text-[#04133a]" : "bg-white/[0.05] text-white/50"}`}><Icon className="h-4 w-4" /></span>
                    <span className="truncate text-[9px] font-black leading-tight sm:text-[11px]">{game.shortTitle}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-8 md:mt-10" aria-labelledby="games-leaderboard-heading">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><p className="altahaddi-eyebrow font-black text-[var(--brand-yellow)]">أبطال الألعاب</p><h2 id="games-leaderboard-heading" className="altahaddi-section-title mt-1 font-black">ترتيب XP العام</h2></div>
            <div className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[10px] font-black text-white/42"><Trophy className="h-3.5 w-3.5 text-[var(--brand-yellow)]" /> أعلى 20 لاعب</div>
          </div>

          {!loading && topThree.length > 0 ? (
            <div className="mb-3 grid grid-cols-3 gap-2">
              {topThree.map((item, index) => (
                <div key={`podium-${item.userId}`} className={`relative overflow-hidden rounded-[22px] border p-3 text-center ${index === 0 ? "border-[var(--brand-yellow)]/30 bg-[var(--brand-yellow)]/[0.08]" : "border-white/10 bg-white/[0.04]"}`}>
                  <div className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-white/[0.06]"><RankIcon rank={index + 1} /></div>
                  <div className="mt-2 truncate text-xs font-black"><MemberProfileLink userId={item.userId}>{item.userName}</MemberProfileLink></div>
                  <div dir="ltr" className="mt-1 text-sm font-black text-[var(--brand-yellow)]">{item.totalXp} XP</div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="altahaddi-glass overflow-hidden rounded-[26px]">
            {loading ? (
              <div className="grid gap-2 p-4">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />)}</div>
            ) : loadError ? (
              <div role="alert" className="p-8 text-center text-sm font-bold text-red-100/80">{loadError}</div>
            ) : leaderboard.length === 0 ? (
              <div className="p-8 text-center"><Trophy className="mx-auto h-8 w-8 text-white/20" /><p className="mt-3 text-sm font-bold text-white/42">سيظهر الترتيب مع أول مشاركة مسجلة في الألعاب.</p></div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {leaderboard.slice(0, 15).map((item, index) => {
                  const rank = index + 1;
                  const isCurrent = item.userId === user?.id;
                  return (
                    <div key={item.userId} className={`grid min-h-[60px] grid-cols-[38px_1fr_auto] items-center gap-3 px-3 py-3 md:px-4 ${isCurrent ? "bg-[var(--brand-yellow)]/[0.07]" : ""}`}>
                      <div className="flex items-center justify-center"><RankIcon rank={rank} /></div>
                      <div className="min-w-0"><div className="flex items-center gap-2"><span className="truncate text-xs font-black md:text-sm"><MemberProfileLink userId={item.userId}>{item.userName}</MemberProfileLink></span>{isCurrent ? <span className="rounded-full bg-[var(--brand-yellow)] px-2 py-0.5 text-[8px] font-black text-[#04133a]">أنت</span> : null}</div><div className="mt-1 flex gap-2 text-[9px] font-bold text-white/45"><span>المستوى {item.level}</span><span>{item.gamesPlayed} لعبة</span><span>{item.wins} فوز</span></div></div>
                      <div dir="ltr" className="text-xs font-black text-[var(--brand-yellow)] md:text-sm">{item.totalXp} XP</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
