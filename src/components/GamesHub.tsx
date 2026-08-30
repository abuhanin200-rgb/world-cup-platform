"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
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
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  getLevelLabel,
  getLevelProgress,
  type PlatformGameStats,
} from "@/domain/games/platformGames";

const GAMES = [
  {
    id: "word-game",
    title: "خمن كلمة اليوم",
    description: "اكتشف الكلمة الرياضية خلال 6 محاولات ونافس في الترتيب اليومي.",
    href: "/word-game",
    icon: Target,
    tag: "تحدي يومي",
    xp: "حتى 22 XP",
  },
  {
    id: "flag-memory",
    title: "تحدي الأعلام",
    description: "اختبر سرعة ذاكرتك واربط أعلام المنتخبات بأقل عدد من المحاولات.",
    href: "/flag-memory",
    icon: Flag,
    tag: "ذاكرة",
    xp: "حتى 20 XP",
  },
  {
    id: "ten-seconds",
    title: "تحدي العشر ثواني",
    description: "أوقف المؤقت عند 10.000 ثانية بالضبط. السرعة والدقة تصنعان الفارق.",
    href: "/ten-seconds-challenge",
    icon: TimerReset,
    tag: "سرعة",
    xp: "XP عند الفوز",
  },
] as const;

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
  return <span dir="ltr" className="min-w-5 text-center text-xs font-black text-slate-500">{rank}</span>;
}

export default function GamesHub() {
  const { user, isLoggedIn } = useAuth();
  const [leaderboard, setLeaderboard] = useState<PlatformGameStats[]>([]);
  const [memberStats, setMemberStats] = useState<PlatformGameStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const leaderboardQuery = query(
      collection(db, "platformGameStats"),
      orderBy("totalXp", "desc"),
      limit(20),
    );

    return onSnapshot(
      leaderboardQuery,
      (snapshot) => {
        setLeaderboard(snapshot.docs.map((item) => mapStats(item.id, item.data())));
        setLoading(false);
      },
      (error) => {
        console.error("Platform games leaderboard error:", error);
        setLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setMemberStats(null);
      return;
    }

    return onSnapshot(doc(db, "platformGameStats", user.id), (snapshot) => {
      setMemberStats(snapshot.exists() ? mapStats(snapshot.id, snapshot.data()) : null);
    });
  }, [user?.id]);

  const memberRank = useMemo(() => {
    if (!user?.id) return null;
    const index = leaderboard.findIndex((item) => item.userId === user.id);
    return index >= 0 ? index + 1 : null;
  }, [leaderboard, user?.id]);

  const xp = memberStats?.totalXp ?? 0;
  const levelProgress = getLevelProgress(xp);

  return (
    <main dir="rtl" className="min-h-screen bg-[var(--brand-navy-950)] text-white antialiased [text-size-adjust:100%]">
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-[max(1.25rem,env(safe-area-inset-top))] md:px-6 md:pt-10">
        <Link
          href="/"
          className="mb-8 inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3.5 text-xs font-black text-slate-200 transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          العودة للرئيسية
        </Link>

        <div className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-white/[0.04] p-6 shadow-xl shadow-black/20 md:p-9">
          <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-amber-300/[0.08] blur-3xl" aria-hidden="true" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_360px] lg:items-center">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex min-h-[34px] items-center gap-2 rounded-full border border-amber-300/15 bg-amber-300/[0.06] px-3 text-xs font-black text-amber-300">
                <Gamepad2 className="h-4 w-4" aria-hidden="true" />
                الألعاب والتحديات
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">مستواك في الألعاب والتحديات</h1>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-400 md:text-base">
                اجمع نقاط الخبرة من الألعاب، ارفع مستواك وتنافس مع بقية اللاعبين في الترتيب العام للألعاب.
              </p>
            </div>

            <div className="rounded-[24px] border border-amber-300/15 bg-slate-950/55 p-5">
              {isLoggedIn ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black text-amber-300">مستواك في الألعاب</p>
                      <h2 className="mt-1 text-xl font-black">Level {levelProgress.level} · {getLevelLabel(levelProgress.level)}</h2>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300 text-xl font-black text-slate-950">
                      {levelProgress.level}
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-amber-300 transition-[width]" style={{ width: `${levelProgress.progress}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-white/[0.04] p-2.5">
                      <div className="text-lg font-black text-amber-300" dir="ltr">{xp} XP</div>
                      <div className="mt-1 text-[10px] font-bold text-slate-500">الإجمالي</div>
                    </div>
                    <div className="rounded-xl bg-white/[0.04] p-2.5">
                      <div className="text-lg font-black">{memberStats?.wins ?? 0}</div>
                      <div className="mt-1 text-[10px] font-bold text-slate-500">فوز</div>
                    </div>
                    <div className="rounded-xl bg-white/[0.04] p-2.5">
                      <div className="text-lg font-black">{memberRank ?? "—"}</div>
                      <div className="mt-1 text-[10px] font-bold text-slate-500">المركز</div>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] font-bold text-slate-500">
                    متبقي <span dir="ltr" className="text-slate-300">{levelProgress.xpToNextLevel} XP</span> للمستوى التالي.
                  </p>
                </>
              ) : (
                <div className="text-center">
                  <Sparkles className="mx-auto h-8 w-8 text-amber-300" aria-hidden="true" />
                  <h2 className="mt-3 text-lg font-black">سجّل دخولك وابدأ رحلتك</h2>
                  <p className="mt-2 text-xs font-semibold leading-6 text-slate-400">شارك في الألعاب واجمع نقاط الخبرة وارفع مستواك.</p>
                  <Link href="/login" className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-amber-300 px-4 text-xs font-black text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                    تسجيل الدخول
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {GAMES.map((game) => {
            const Icon = game.icon;
            return (
              <Link
                key={game.href}
                href={game.href}
                className="group flex min-h-[260px] flex-col justify-between rounded-[26px] border border-white/[0.08] bg-white/[0.04] p-5 shadow-lg shadow-black/15 outline-none transition hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-navy-950)] active:scale-[0.99]"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-300/[0.08] text-amber-300">
                      <Icon className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <div className="text-left">
                      <span className="block rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-black text-slate-400">{game.tag}</span>
                      <span dir="ltr" className="mt-1.5 block text-[10px] font-black text-amber-300/80">{game.xp}</span>
                    </div>
                  </div>
                  <h2 className="mt-5 text-xl font-black">{game.title}</h2>
                  <p className="mt-2 text-sm font-semibold leading-7 text-slate-400">{game.description}</p>
                </div>
                <div className="mt-5 flex min-h-[44px] items-center justify-between border-t border-white/[0.07] pt-3 text-sm font-black text-white">
                  <span>ابدأ اللعب</span>
                  <ArrowRight className="h-4 w-4 rotate-180 transition group-hover:-translate-x-1" aria-hidden="true" />
                </div>
              </Link>
            );
          })}
        </div>

        <section className="mt-10" aria-labelledby="games-leaderboard-heading">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-black text-amber-300">أبطال الألعاب</p>
              <h2 id="games-leaderboard-heading" className="mt-1 text-2xl font-black">ترتيب الألعاب العام</h2>
            </div>
            <div className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black text-slate-400">
              <Zap className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              XP الألعاب
            </div>
          </div>

          <div className="overflow-hidden rounded-[26px] border border-white/[0.08] bg-white/[0.035]">
            {loading ? (
              <div className="p-8 text-center text-sm font-bold text-slate-500">جاري تحميل ترتيب الألعاب…</div>
            ) : leaderboard.length === 0 ? (
              <div className="p-8 text-center">
                <Trophy className="mx-auto h-8 w-8 text-slate-600" aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-slate-400">سيظهر الترتيب مع أول مشاركة مسجلة في الألعاب.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {leaderboard.slice(0, 15).map((item, index) => {
                  const rank = index + 1;
                  const isCurrent = item.userId === user?.id;
                  return (
                    <div key={item.userId} className={`grid min-h-[62px] grid-cols-[42px_1fr_auto] items-center gap-3 px-4 py-3 ${isCurrent ? "bg-amber-300/[0.07]" : ""}`}>
                      <div className="flex items-center justify-center"><RankIcon rank={rank} /></div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-black">{item.userName}</span>
                          {isCurrent && <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[9px] font-black text-slate-950">أنت</span>}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] font-bold text-slate-500">
                          <span>Level {item.level}</span>
                          <span>{item.gamesPlayed} لعبة</span>
                          <span>{item.wins} فوز</span>
                        </div>
                      </div>
                      <div dir="ltr" className="text-sm font-black text-amber-300">{item.totalXp} XP</div>
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
