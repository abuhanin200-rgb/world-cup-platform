import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  Flag,
  Globe2,
  Trophy,
  Zap,
} from "lucide-react";
import FlagMemoryGame from "@/components/flag-memory/FlagMemoryGame";
import InteractionSoundToggle from "@/components/interaction/InteractionSoundToggle";

export const metadata: Metadata = {
  title: "تحدي الأعلام",
  description: "طابق أعلام المنتخبات بأقل وقت وأقل عدد من الأخطاء.",
};

const heroFlags = ["sa", "jp", "ar", "ma"];

export default function FlagMemoryPage() {
  return (
    <main
      dir="rtl"
      className="flag-memory-page relative mx-auto w-full max-w-6xl overflow-x-hidden px-3 pb-[calc(8.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 md:px-6 md:pb-24 md:pt-8"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] overflow-hidden">
        <div className="absolute -right-24 top-0 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="absolute -left-24 top-36 h-72 w-72 rounded-full bg-rose-400/10 blur-3xl" />
        <div className="absolute left-1/2 top-24 h-52 w-52 -translate-x-1/2 rounded-full bg-amber-300/8 blur-3xl" />
      </div>

      <div className="mb-3 flex items-center justify-between gap-2 md:mb-5">
        <Link
          href="/games"
          className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-[11px] font-black text-white/65 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          <ArrowRight className="h-4 w-4" /> الألعاب
        </Link>
        <div className="shrink-0 rounded-xl border border-white/10 bg-white/[0.045] p-1">
          <InteractionSoundToggle />
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[28px] border border-sky-300/15 bg-[#071a33]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,.28)] sm:p-5 md:rounded-[36px] md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,.055),transparent_38%),radial-gradient(circle_at_82%_8%,rgba(56,189,248,.22),transparent_24%),radial-gradient(circle_at_15%_78%,rgba(251,113,133,.12),transparent_28%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:34px_34px]" />

        <div className="relative grid min-w-0 gap-5 lg:grid-cols-[1fr_330px] lg:items-center">
          <div className="min-w-0">
            <div className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-sky-300/20 bg-sky-300/[0.07] px-2.5 text-[10px] font-black text-sky-100 sm:text-[11px]">
              <Globe2 className="h-3.5 w-3.5" /> ذاكرة حول العالم
            </div>

            <div className="mt-3 flex min-w-0 items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-200 shadow-[0_12px_30px_rgba(14,165,233,.14)] md:h-14 md:w-14">
                <Flag className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[clamp(1.55rem,7vw,2.7rem)] font-black leading-[1.15] tracking-[-0.03em] text-white">
                  تحدي الأعلام
                </h1>
                <p className="mt-1.5 max-w-2xl text-[clamp(.78rem,3.3vw,.98rem)] font-semibold leading-6 text-white/52">
                  اكشف البطاقات، تذكّر أماكنها، وطابق أعلام المنتخبات بأقل وقت وأقل أخطاء.
                </p>
              </div>
            </div>

            <div className="mt-4 grid max-w-xl grid-cols-3 gap-1.5 sm:gap-2">
              <div className="rounded-2xl border border-white/10 bg-black/15 p-2.5 text-center sm:p-3">
                <Globe2 className="mx-auto h-4 w-4 text-sky-200" />
                <div className="mt-1 text-sm font-black text-white sm:text-base">أعلام حقيقية</div>
                <div className="mt-0.5 text-[9px] font-bold text-white/35">من منتخبات العالم</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-2.5 text-center sm:p-3">
                <Zap className="mx-auto h-4 w-4 text-rose-200" />
                <div className="mt-1 text-sm font-black text-white sm:text-base">ذاكرة + سرعة</div>
                <div className="mt-0.5 text-[9px] font-bold text-white/35">كل حركة محسوبة</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-2.5 text-center sm:p-3">
                <Trophy className="mx-auto h-4 w-4 text-amber-200" />
                <div className="mt-1 text-sm font-black text-white sm:text-base">XP يومي</div>
                <div className="mt-0.5 text-[9px] font-bold text-white/35">للإنجاز والسرعة</div>
              </div>
            </div>
          </div>

          <div className="relative hidden min-h-[230px] overflow-hidden rounded-[28px] border border-white/10 bg-black/20 p-5 lg:grid lg:place-items-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(56,189,248,.15),transparent_30%),radial-gradient(circle_at_50%_56%,rgba(251,113,133,.10),transparent_48%)]" />
            <div className="relative">
              <div className="mb-4 flex items-center justify-center gap-2 text-[10px] font-black text-white/40">
                <AudioLines className="h-4 w-4 text-sky-200" /> أصوات قلب البطاقة والتطابق
              </div>
              <div className="grid grid-cols-2 gap-2.5" aria-hidden="true">
                {heroFlags.map((code, index) => (
                  <span
                    key={code}
                    className={`grid h-16 w-20 place-items-center rounded-[18px] border p-2.5 shadow-lg ${
                      index % 2 === 0
                        ? "border-sky-300/25 bg-sky-400/10 shadow-sky-500/10"
                        : "border-rose-300/20 bg-rose-400/10 shadow-rose-500/10"
                    }`}
                  >
                    <img src={`/flags/${code}.svg`} alt="" className="h-full w-full rounded-lg object-cover" />
                  </span>
                ))}
              </div>
              <div className="mx-auto mt-5 h-px w-44 bg-gradient-to-r from-transparent via-sky-300/45 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4 md:mt-6">
        <FlagMemoryGame />
      </div>

      <style>{`
        .flag-memory-page,
        .flag-memory-page * { box-sizing: border-box; }
        .flag-memory-page { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
      `}</style>
    </main>
  );
}
