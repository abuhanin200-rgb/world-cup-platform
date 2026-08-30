"use client";

import Link from "next/link";
import { ArrowLeft, Flag, Gamepad2, Medal, Sparkles, Target, TimerReset, Trophy } from "lucide-react";
import PlatformStatsOverview from "@/components/PlatformStatsOverview";
import MemberNoticeRenderer from "@/components/MemberNoticeRenderer";
import { useAuth } from "@/context/AuthContext";
import {
  ASIAN_CUP_2027_TOURNAMENT,
  GULF_CUP_27_TOURNAMENT,
  WORLD_CUP_2026_TOURNAMENT,
  formatTournamentDateRange,
  getTournamentHref,
  getTournamentStatusLabel,
  type Tournament,
} from "@/domain/tournaments";

const TOURNAMENTS = [GULF_CUP_27_TOURNAMENT, WORLD_CUP_2026_TOURNAMENT, ASIAN_CUP_2027_TOURNAMENT];
const GAMES = [
  { title: "خمن كلمة اليوم", text: "اختبر حصيلتك الرياضية في ست محاولات.", href: "/word-game", icon: Target },
  { title: "تحدي الأعلام", text: "اختبر ذاكرتك وسرعتك في مطابقة أعلام المنتخبات.", href: "/flag-memory", icon: Flag },
  { title: "العشر ثواني", text: "تحدّ دقتك في إيقاف المؤقت عند عشر ثوانٍ.", href: "/ten-seconds-challenge", icon: TimerReset },
];

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const artwork = tournament.branding.coverUrl || tournament.branding.heroUrl;
  const date = formatTournamentDateRange(tournament);
  return (
    <Link href={getTournamentHref(tournament)} className="group relative min-h-[220px] overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.05] p-4 shadow-xl shadow-black/15 transition hover:-translate-y-0.5 hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-yellow)] md:min-h-[270px] md:rounded-[28px] md:p-5">
      {artwork ? <img src={artwork} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45 transition duration-500 group-hover:scale-[1.03]" /> : null}
      <div className="absolute inset-0 bg-gradient-to-t from-[#031039] via-[#04184a]/75 to-[#071d54]/35" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[10px] font-black text-white/85 backdrop-blur-md md:text-xs">{getTournamentStatusLabel(tournament.status)}</span>
          {tournament.branding.logoUrl ? (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/90 p-1.5 shadow-lg md:h-16 md:w-16">
              <img src={tournament.branding.logoUrl} alt={`شعار ${tournament.name}`} className="h-full w-full object-contain" />
            </div>
          ) : null}
        </div>
        <div>
          <h3 className="text-xl font-black text-white md:text-2xl">{tournament.shortName}</h3>
          <p className="mt-1 text-[11px] font-bold text-white/65 md:text-xs">{tournament.hostCountry || ""}{date ? ` · ${date}` : ""}</p>
          <div className="mt-4 flex min-h-[42px] items-center justify-between rounded-xl border border-white/12 bg-black/20 px-3 text-xs font-black text-white backdrop-blur-md">
            <span>دخول البطولة</span><ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" aria-hidden="true" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function PlatformHome() {
  const { user, isLoggedIn } = useAuth();
  return (
    <main dir="rtl" className="bg-[var(--brand-navy-950)] text-white">
      {isLoggedIn && user ? <MemberNoticeRenderer userId={user.id} /> : null}
      <div className="mx-auto max-w-7xl px-3 pb-12 pt-4 sm:px-4 md:px-6 md:pb-16 md:pt-7">
        <section className="relative isolate overflow-hidden rounded-[28px] border border-white/10 bg-[#071d54] px-4 py-7 shadow-2xl shadow-black/25 md:rounded-[38px] md:px-8 md:py-10 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_18%,rgba(255,194,16,.18),transparent_28%),radial-gradient(circle_at_8%_90%,rgba(255,255,255,.07),transparent_28%)]" />
          <div className="absolute -right-24 top-20 h-72 w-72 rounded-full border-[34px] border-[#ffc210]/16 md:-right-20 md:top-16 md:h-80 md:w-80 md:border-[42px]" aria-hidden="true" />
          <div className="relative grid items-center gap-6 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_360px]">
            <div className="max-w-2xl">
              <div className="inline-flex min-h-[34px] items-center gap-2 rounded-full border border-[var(--brand-yellow)]/25 bg-[var(--brand-yellow)]/10 px-3 text-[10px] font-black text-[var(--brand-yellow)] md:text-xs">
                <Sparkles className="h-4 w-4" aria-hidden="true" /> منصة رياضية تفاعلية
              </div>
              <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl md:text-6xl">التحدي</h1>
              <p className="mt-3 max-w-xl text-sm font-semibold leading-7 text-white/70 md:text-base md:leading-8">
                توقع نتائج البطولات، نافس أصدقاءك في لوحات الصدارة، واستمتع بألعاب وتحديات رياضية تتجدد باستمرار.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Link href="/tournaments" className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-[#ffc210]/40 bg-[#ffc210]/10 px-4 text-sm font-black text-[#ffc210] transition hover:bg-[#ffc210]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffc210]">
                  <Trophy className="h-4 w-4 text-[#ffc210]" aria-hidden="true" /> استعرض البطولات
                </Link>
                <Link href="/games" className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 text-sm font-black text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-yellow)]">
                  <Gamepad2 className="h-4 w-4" aria-hidden="true" /> الألعاب والتحديات
                </Link>
              </div>
            </div>
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-[28px] border border-[#ffc210]/18 bg-white/[0.045] p-4 shadow-2xl md:h-60 md:w-60 md:rounded-[38px] md:p-6">
              <img src="/brand/altahaddi-logo-white.png" alt="شعار منصة التحدي" className="h-full w-full object-contain" />
            </div>
          </div>
        </section>

        <div className="mt-8 md:mt-10"><PlatformStatsOverview /></div>

        <section className="mt-9 md:mt-12" aria-labelledby="home-tournaments-title">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><p className="text-[10px] font-black text-[var(--brand-yellow)] md:text-xs">مواسم المنافسة</p><h2 id="home-tournaments-title" className="mt-1 text-xl font-black md:text-2xl">البطولات</h2></div>
            <Link href="/tournaments" className="inline-flex min-h-[40px] items-center gap-1 rounded-xl px-2 text-xs font-black text-white/60 hover:text-white">عرض الكل <ArrowLeft className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{TOURNAMENTS.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} />)}</div>
        </section>

        <section className="mt-9 md:mt-12" aria-labelledby="home-games-title">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><p className="text-[10px] font-black text-[var(--brand-yellow)] md:text-xs">وقت التحدي</p><h2 id="home-games-title" className="mt-1 text-xl font-black md:text-2xl">الألعاب</h2></div>
            <Link href="/games" className="inline-flex min-h-[40px] items-center gap-1 rounded-xl px-2 text-xs font-black text-white/60 hover:text-white">كل الألعاب <ArrowLeft className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          <div className="grid gap-2.5 md:grid-cols-3">
            {GAMES.map(({ title, text, href, icon: Icon }) => (
              <Link key={href} href={href} className="group flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.05] p-3.5 transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-yellow)] md:rounded-[24px] md:p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-yellow)]/10 text-[var(--brand-yellow)]"><Icon className="h-5 w-5" aria-hidden="true" /></div>
                <div className="min-w-0 flex-1"><h3 className="text-sm font-black md:text-base">{title}</h3><p className="mt-1 text-[10px] font-semibold leading-5 text-white/50 md:text-xs">{text}</p></div>
                <ArrowLeft className="h-4 w-4 shrink-0 text-white/45 transition group-hover:-translate-x-1" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        {isLoggedIn ? (
          <Link href="/account" className="mt-9 flex items-center justify-between gap-4 rounded-[22px] border border-[var(--brand-yellow)]/15 bg-[var(--brand-yellow)]/[0.06] p-4 transition hover:bg-[var(--brand-yellow)]/[0.09] md:mt-12 md:p-5">
            <div><p className="text-[10px] font-black text-[var(--brand-yellow)] md:text-xs">ملفك الشخصي</p><h2 className="mt-1 text-lg font-black md:text-xl">مسيرتي في التحدي</h2><p className="mt-1 text-[11px] font-semibold text-white/50 md:text-xs">تابع إحصائيات بطولاتك وألعابك وإنجازاتك من مكان واحد.</p></div>
            <Medal className="h-9 w-9 shrink-0 text-[var(--brand-yellow)] md:h-10 md:w-10" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </main>
  );
}
