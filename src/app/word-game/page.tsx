import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  BrainCircuit,
  ScanSearch,
  Sparkles,
  Zap,
} from "lucide-react";
import WordGame from "@/components/word-game/WordGame";

export const metadata: Metadata = {
  title: "خمن كلمة اليوم",
  description: "اكتشف كلمة عربية جديدة كل يوم خلال ست محاولات واجمع XP في منصة التحدي.",
};

const heroLetters = ["ت", "خ", "م", "ي", "ن"];

export default function WordGamePage() {
  return (
    <main
      dir="rtl"
      className="word-game-page relative mx-auto w-full max-w-6xl overflow-x-hidden px-3 pb-[calc(8.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 md:px-6 md:pb-24 md:pt-8"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] overflow-hidden">
        <div className="absolute -right-28 top-2 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute -left-28 top-36 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute left-1/2 top-24 h-52 w-52 -translate-x-1/2 rounded-full bg-fuchsia-500/8 blur-3xl" />
      </div>

      <Link
        href="/games"
        className="mb-3 inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-[11px] font-black text-white/65 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 md:mb-5"
      >
        <ArrowRight className="h-4 w-4" /> الألعاب
      </Link>

      <section className="relative overflow-hidden rounded-[28px] border border-violet-300/15 bg-[#111537]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,.28)] sm:p-5 md:rounded-[36px] md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,.055),transparent_38%),radial-gradient(circle_at_82%_8%,rgba(139,92,246,.24),transparent_25%),radial-gradient(circle_at_15%_78%,rgba(34,211,238,.13),transparent_28%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:34px_34px]" />

        <div className="relative grid min-w-0 gap-5 lg:grid-cols-[1fr_330px] lg:items-center">
          <div className="min-w-0">
            <div className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-2.5 text-[10px] font-black text-cyan-100 sm:text-[11px]">
              <Sparkles className="h-3.5 w-3.5" /> شفرة جديدة كل يوم
            </div>

            <div className="mt-3 flex min-w-0 items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-violet-300/20 bg-violet-400/10 text-violet-200 shadow-[0_12px_30px_rgba(124,58,237,.14)] md:h-14 md:w-14">
                <ScanSearch className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[clamp(1.55rem,7vw,2.7rem)] font-black leading-[1.15] tracking-[-0.03em] text-white">
                  خمن كلمة اليوم
                </h1>
                <p className="mt-1.5 max-w-2xl text-[clamp(.78rem,3.3vw,.98rem)] font-semibold leading-6 text-white/52">
                  اقرأ إشارات الحروف، ضيّق الاحتمالات، واكشف كلمة اليوم قبل نفاد محاولاتك.
                </p>
              </div>
            </div>

            <div className="mt-4 grid max-w-xl grid-cols-3 gap-1.5 sm:gap-2">
              <div className="rounded-2xl border border-white/10 bg-black/15 p-2.5 text-center sm:p-3">
                <BrainCircuit className="mx-auto h-4 w-4 text-violet-200" />
                <div className="mt-1 text-sm font-black text-white sm:text-base">5 حروف</div>
                <div className="mt-0.5 text-[9px] font-bold text-white/35">لكلمة اليوم</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-2.5 text-center sm:p-3">
                <ScanSearch className="mx-auto h-4 w-4 text-cyan-200" />
                <div className="mt-1 text-sm font-black text-white sm:text-base">6 محاولات</div>
                <div className="mt-0.5 text-[9px] font-bold text-white/35">للوصول للحل</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-2.5 text-center sm:p-3">
                <Zap className="mx-auto h-4 w-4 text-fuchsia-200" />
                <div className="mt-1 text-sm font-black text-white sm:text-base">XP يومي</div>
                <div className="mt-0.5 text-[9px] font-bold text-white/35">للفوز والسرعة</div>
              </div>
            </div>
          </div>

          <div className="relative hidden min-h-[220px] overflow-hidden rounded-[28px] border border-white/10 bg-black/20 p-5 lg:grid lg:place-items-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(34,211,238,.12),transparent_28%),radial-gradient(circle_at_50%_55%,rgba(139,92,246,.18),transparent_44%)]" />
            <div className="relative">
              <div className="mb-4 flex items-center justify-center gap-2 text-[10px] font-black text-white/40">
                <AudioLines className="h-4 w-4 text-cyan-200" /> صوت وتفاعل حي
              </div>
              <div className="flex gap-2" dir="ltr" aria-hidden="true">
                {heroLetters.map((letter, index) => (
                  <span
                    key={`${letter}-${index}`}
                    className={`grid h-14 w-12 place-items-center rounded-[16px] border text-xl font-black shadow-lg ${
                      index === 1
                        ? "border-cyan-300/45 bg-cyan-300/15 text-cyan-100 shadow-cyan-500/10"
                        : index === 3
                          ? "border-fuchsia-300/35 bg-fuchsia-400/12 text-fuchsia-100 shadow-fuchsia-500/10"
                          : "border-violet-300/25 bg-violet-400/12 text-violet-100 shadow-violet-500/10"
                    }`}
                  >
                    {letter}
                  </span>
                ))}
              </div>
              <div className="mx-auto mt-5 h-px w-44 bg-gradient-to-r from-transparent via-cyan-300/45 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4 md:mt-6">
        <WordGame />
      </div>

      <style>{`
        .word-game-page,
        .word-game-page * {
          box-sizing: border-box;
        }
        .word-game-page {
          -webkit-text-size-adjust: 100%;
          text-size-adjust: 100%;
        }
      `}</style>
    </main>
  );
}
