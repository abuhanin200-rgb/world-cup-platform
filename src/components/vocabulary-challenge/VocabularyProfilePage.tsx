"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Crown,
  Flame,
  Gamepad2,
  Languages,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Trophy,
} from "lucide-react";
import AuthGateCard from "@/components/auth/AuthGateCard";
import { useAuth } from "@/context/AuthContext";
import { getVocabularyProfile } from "@/lib/vocabularyChallengeClient";
import type { VocabularyAchievement, VocabularyProfile } from "@/types/vocabularyChallenge";

function durationLabel(ms: number | null) {
  if (!ms || ms <= 0) return "—";
  const total = Math.max(1, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes ? `${minutes}:${String(seconds).padStart(2, "0")}` : `${seconds}ث`;
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string | number; label: string }) {
  return (
    <div className="rounded-[22px] border border-white/[0.09] bg-white/[0.035] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl border border-lime-200/15 bg-lime-300/[0.08] text-lime-200">{icon}</div>
        <div dir="ltr" className="text-xl font-black text-white">{value}</div>
      </div>
      <div className="mt-2 text-[10px] font-bold text-white/42">{label}</div>
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: VocabularyAchievement }) {
  const ratio = achievement.target > 0 ? Math.min(100, Math.max(0, Math.round((achievement.progress / achievement.target) * 100))) : 0;
  return (
    <div className={`rounded-[22px] border p-3.5 ${achievement.unlocked ? "border-lime-200/20 bg-lime-300/[0.07]" : "border-white/[0.08] bg-white/[0.025]"}`}>
      <div className="flex items-start gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${achievement.unlocked ? "border-lime-200/20 bg-lime-300/[0.12] text-lime-200" : "border-white/10 bg-black/15 text-white/32"}`}>
          {achievement.unlocked ? <BadgeCheck className="h-5 w-5" /> : <Target className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-black text-white">{achievement.title}</h3>
            {achievement.unlocked ? <span className="shrink-0 text-[9px] font-black text-lime-200">مكتمل ✓</span> : <span dir="ltr" className="shrink-0 text-[9px] font-black text-white/38">{Math.min(achievement.progress, achievement.target)}/{achievement.target}</span>}
          </div>
          <p className="mt-1 text-[10px] font-semibold leading-5 text-white/42">{achievement.description}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/25"><div className={`h-full rounded-full ${achievement.unlocked ? "bg-lime-300" : "bg-white/20"}`} style={{ width: `${ratio}%` }} /></div>
        </div>
      </div>
    </div>
  );
}

export default function VocabularyProfilePage() {
  const { user, loading, isLoggedIn } = useAuth();
  const [profile, setProfile] = useState<VocabularyProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadProfile() {
    if (!isLoggedIn || !user) return;
    try {
      setBusy(true);
      setError("");
      setProfile(await getVocabularyProfile());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل ملف تحدي المفردات.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user?.id]);

  if (loading) {
    return <main className="mx-auto grid min-h-[420px] max-w-5xl place-items-center px-3"><div className="flex items-center gap-2 text-sm font-black text-white/50"><LoaderCircle className="h-5 w-5 animate-spin" /> جاري تحميل ملف المفردات…</div></main>;
  }

  if (!isLoggedIn || !user) {
    return (
      <main className="mx-auto max-w-4xl px-3 py-6 sm:px-4">
        <Link href="/vocabulary-challenge" className="mb-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-white/60"><ArrowRight className="h-4 w-4" /> تحدي المفردات</Link>
        <AuthGateCard returnTo="/vocabulary-challenge/profile" title="سجّل الدخول لعرض ملف المفردات" description="تابع انتصاراتك وسلسلتك وإنجازاتك وإحصائياتك في تحدي المفردات." benefit="كل نتائجك وإنجازاتك مرتبطة بحسابك في منصة التحدي." />
      </main>
    );
  }

  return (
    <main dir="rtl" className="relative mx-auto max-w-5xl overflow-hidden px-3 pb-20 pt-4 sm:px-4 md:pt-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(circle_at_20%_10%,rgba(52,211,153,.12),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(250,204,21,.08),transparent_28%)]" />
      <div className="flex items-center justify-between gap-2">
        <Link href="/vocabulary-challenge" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-white/65"><ArrowRight className="h-4 w-4" /> اللعبة</Link>
        <button type="button" onClick={() => void loadProfile()} disabled={busy} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/60 disabled:opacity-45" aria-label="تحديث الملف"><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /></button>
      </div>

      <section className="mt-4 overflow-hidden rounded-[30px] border border-emerald-200/12 bg-[linear-gradient(145deg,rgba(5,72,60,.82),rgba(3,41,55,.82))] p-4 shadow-[0_24px_70px_rgba(0,0,0,.24)] sm:p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[19px] border border-lime-200/20 bg-lime-300/[0.10] text-lime-200"><Languages className="h-7 w-7" /></div>
          <div className="min-w-0"><div className="text-[10px] font-black text-lime-200">ملف اللاعب</div><h1 className="mt-0.5 truncate text-2xl font-black text-white">تحدي المفردات</h1><p className="mt-1 truncate text-[11px] font-semibold text-white/45">{user.fullName || "عضو التحدي"}</p></div>
        </div>

        {error ? <div className="mt-4 rounded-2xl border border-rose-200/15 bg-rose-400/[0.07] px-3 py-3 text-xs font-bold text-rose-100/75">{error}</div> : null}
        {!profile && busy ? <div className="mt-6 flex min-h-[160px] items-center justify-center gap-2 text-xs font-black text-white/45"><LoaderCircle className="h-4 w-4 animate-spin" /> جاري تجهيز الإحصائيات…</div> : null}

        {profile ? (
          <>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat icon={<Trophy className="h-4 w-4" />} value={profile.wins} label="إجمالي الانتصارات" />
              <Stat icon={<Swords className="h-4 w-4" />} value={profile.games} label="المباريات" />
              <Stat icon={<ShieldCheck className="h-4 w-4" />} value={`${profile.winRate}%`} label="نسبة الفوز" />
              <Stat icon={<Sparkles className="h-4 w-4" />} value={profile.words} label="الكلمات الصحيحة" />
              <Stat icon={<Flame className="h-4 w-4" />} value={profile.todayWinStreak} label="سلسلة اليوم" />
              <Stat icon={<Crown className="h-4 w-4" />} value={profile.bestWinStreak} label="أفضل سلسلة" />
              <Stat icon={<Clock3 className="h-4 w-4" />} value={durationLabel(profile.bestDurationMs)} label="أسرع فوز" />
              <Stat icon={<Gamepad2 className="h-4 w-4" />} value={profile.duelWins} label="فوز ضد لاعب" />
            </div>

            <div className="mt-5 flex items-center justify-between gap-3"><div><div className="text-[10px] font-black text-lime-200">الإنجازات</div><h2 className="mt-1 text-lg font-black text-white">تحدياتك الخاصة</h2></div><div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-[10px] font-black text-white/55">{profile.achievements.filter((item) => item.unlocked).length}/{profile.achievements.length}</div></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">{profile.achievements.map((achievement) => <AchievementCard key={achievement.id} achievement={achievement} />)}</div>
          </>
        ) : null}
      </section>
    </main>
  );
}
