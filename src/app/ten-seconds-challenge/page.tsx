import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  Crosshair,
  Gauge,
  TimerReset,
  Trophy,
  Zap,
} from "lucide-react";
import TenSecondsChallengeGame from "@/components/TenSecondsChallengeGame";
import InteractionSoundToggle from "@/components/interaction/InteractionSoundToggle";

export const metadata: Metadata = {
  title: "تحدي العشر ثواني",
  description: "أوقف المؤقت عند 10.000 بالضبط وسجّل محاولاتك اليومية وXP.",
};

export default function TenSecondsChallengePage() {
  return (
    <main
      dir="rtl"
      className="ten-seconds-page relative mx-auto w-full max-w-6xl overflow-x-hidden px-3 pb-[calc(8.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 md:px-6 md:pb-24 md:pt-8"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] overflow-hidden">
        <div className="absolute -right-28 top-0 h-72 w-72 rounded-full bg-lime-400/12 blur-3xl" />
        <div className="absolute -left-24 top-36 h-72 w-72 rounded-full bg-orange-400/10 blur-3xl" />
      </div>

      <div className="mb-3 flex items-center justify-between gap-2 md:mb-5">
        <Link
          href="/games"
          className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-[11px] font-black text-white/65 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300"
        >
          <ArrowRight className="h-4 w-4" /> الألعاب
        </Link>
        <div className="shrink-0 rounded-xl border border-white/10 bg-white/[0.045] p-1">
          <InteractionSoundToggle />
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[28px] border border-lime-300/15 bg-[#0a1112]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,.32)] sm:p-5 md:rounded-[36px] md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,.045),transparent_36%),radial-gradient(circle_at_82%_8%,rgba(163,230,53,.16),transparent_25%),radial-gradient(circle_at_15%_78%,rgba(251,146,60,.11),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative grid min-w-0 gap-5 lg:grid-cols-[1fr_340px] lg:items-center">
          <div className="min-w-0">
            <div className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-lime-300/20 bg-lime-300/[0.07] px-2.5 text-[10px] font-black text-lime-100 sm:text-[11px]">
              <Crosshair className="h-3.5 w-3.5" /> مختبر الدقة
            </div>

            <div className="mt-3 flex min-w-0 items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-lime-300/20 bg-lime-400/10 text-lime-200 shadow-[0_12px_30px_rgba(163,230,53,.10)] md:h-14 md:w-14">
                <TimerReset className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[clamp(1.55rem,7vw,2.7rem)] font-black leading-[1.15] tracking-[-0.03em] text-white">
                  تحدي العشر ثواني
                </h1>
                <p className="mt-1.5 max-w-2xl text-[clamp(.78rem,3.3vw,.98rem)] font-semibold leading-6 text-white/52">
                  اضبط إحساسك بالوقت وأوقف المؤقت عند 10.000 بالضبط. جزء من الثانية يصنع الفارق.
                </p>
              </div>
            </div>

            <div className="mt-4 grid max-w-xl grid-cols-3 gap-1.5 sm:gap-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-2.5 text-center sm:p-3">
                <Gauge className="mx-auto h-4 w-4 text-lime-200" />
                <div className="mt-1 text-sm font-black text-white sm:text-base">1ms دقة</div>
                <div className="mt-0.5 text-[9px] font-bold text-white/35">كل ملي ثانية مهمة</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-2.5 text-center sm:p-3">
                <Zap className="mx-auto h-4 w-4 text-orange-200" />
                <div className="mt-1 text-sm font-black text-white sm:text-base">رد فعل</div>
                <div className="mt-0.5 text-[9px] font-bold text-white/35">اضغط في اللحظة الصح</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-2.5 text-center sm:p-3">
                <Trophy className="mx-auto h-4 w-4 text-lime-200" />
                <div className="mt-1 text-sm font-black text-white sm:text-base">XP يومي</div>
                <div className="mt-0.5 text-[9px] font-bold text-white/35">للدقة والفوز</div>
              </div>
            </div>
          </div>

          <div className="relative hidden min-h-[230px] overflow-hidden rounded-[28px] border border-white/10 bg-black/35 p-5 lg:grid lg:place-items-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(163,230,53,.13),transparent_30%),radial-gradient(circle_at_50%_50%,rgba(251,146,60,.07),transparent_52%)]" />
            <div className="relative text-center">
              <div className="mb-4 flex items-center justify-center gap-2 text-[10px] font-black text-white/40">
                <AudioLines className="h-4 w-4 text-lime-200" /> نبضات توقيت ومؤثرات دقة
              </div>
              <div className="relative mx-auto grid h-36 w-36 place-items-center rounded-full border border-lime-300/25 bg-lime-300/[0.035] shadow-[inset_0_0_35px_rgba(163,230,53,.06)]">
                <div className="absolute inset-2 rounded-full border border-dashed border-white/10" />
                <div className="absolute inset-5 rounded-full border border-orange-300/15" />
                <div dir="ltr" className="relative text-[30px] font-black tabular-nums tracking-[-0.04em] text-lime-100">
                  10.000
                </div>
              </div>
              <div className="mx-auto mt-5 h-px w-44 bg-gradient-to-r from-transparent via-lime-300/45 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4 md:mt-6">
        <TenSecondsChallengeGame />
      </div>

      <style>{`
        .ten-seconds-page,
        .ten-seconds-page * { box-sizing: border-box; }
        .ten-seconds-page { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
      `}</style>
    </main>
  );
}
