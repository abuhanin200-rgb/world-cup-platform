import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Coffee, Crown, Gamepad2, Sparkles, UsersRound } from "lucide-react";
import MajlisGame from "@/components/majlis/MajlisGame";

export const metadata: Metadata = {
  title: "مجلس التحدي",
  description: "لعبة جماعية سعودية بفئات وأسئلة متنوعة، فرق ومساعدات وتحديات صوتية من القارئ.",
};

export default function MajlisPage() {
  return (
    <main dir="rtl" className="relative mx-auto w-full max-w-7xl overflow-x-hidden px-3 pb-[calc(9rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 md:px-6 md:pb-24 md:pt-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] overflow-hidden">
        <div className="absolute -right-24 top-4 h-72 w-72 rounded-full bg-[#8a4a35]/14 blur-3xl" />
        <div className="absolute -left-28 top-28 h-80 w-80 rounded-full bg-[#d6b16b]/10 blur-3xl" />
        <div className="absolute left-1/2 top-32 h-64 w-64 -translate-x-1/2 rounded-full bg-[#4f8072]/10 blur-3xl" />
      </div>

      <Link href="/games" className="mb-3 inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-[11px] font-black text-white/65 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b16b] md:mb-5">
        <ArrowRight className="h-4 w-4" /> الألعاب
      </Link>

      <section className="relative overflow-hidden rounded-[28px] border border-[#d6b16b]/18 bg-[#12332f]/95 p-4 shadow-[0_30px_90px_rgba(0,0,0,.3)] sm:p-5 md:rounded-[38px] md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_8%,rgba(214,177,107,.17),transparent_27%),radial-gradient(circle_at_10%_72%,rgba(123,63,46,.18),transparent_31%),linear-gradient(130deg,rgba(255,255,255,.04),transparent_35%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.10] [background-image:linear-gradient(30deg,transparent_46%,rgba(234,216,173,.35)_47%,rgba(234,216,173,.35)_49%,transparent_50%),linear-gradient(-30deg,transparent_46%,rgba(234,216,173,.24)_47%,rgba(234,216,173,.24)_49%,transparent_50%)] [background-size:44px_26px]" />

        <div className="relative grid min-w-0 gap-5 lg:grid-cols-[1fr_340px] lg:items-center">
          <div className="min-w-0">
            <div className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-[#d6b16b]/22 bg-[#d6b16b]/[0.08] px-2.5 text-[10px] font-black text-[#ead8ad] sm:text-[11px]">
              <Sparkles className="h-3.5 w-3.5" /> من روح المجلس السعودي
            </div>
            <div className="mt-3 flex min-w-0 items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#d6b16b]/20 bg-[#d6b16b]/10 text-[#ead8ad] md:h-14 md:w-14"><Coffee className="h-6 w-6" /></div>
              <div className="min-w-0">
                <h1 className="text-[clamp(1.7rem,7vw,3.1rem)] font-black leading-[1.1] tracking-[-0.035em] text-[#f7efdc]">مجلس التحدي</h1>
                <p className="mt-2 max-w-2xl text-[clamp(.78rem,3.25vw,1rem)] font-semibold leading-6 text-[#f7efdc]/54">اجمع الربع، قسّم الفرق، واختر الفئات. 36 سؤالًا متوسطًا وصعبًا في كل مجلس، مع مساعدات وتحديات صوتية ومجلس أونلاين بصوت خاص للفريق أو عام.</p>
              </div>
            </div>
            <div className="mt-4 grid max-w-2xl grid-cols-3 gap-1.5 sm:gap-2">
              <div className="rounded-2xl border border-[#ead8ad]/10 bg-black/15 p-2.5 text-center sm:p-3"><UsersRound className="mx-auto h-4 w-4 text-[#d6b16b]" /><div className="mt-1 text-sm font-black text-[#f7efdc]">2–4 فرق</div><div className="mt-0.5 text-[9px] font-bold text-[#f7efdc]/35">للجمعات</div></div>
              <div className="rounded-2xl border border-[#ead8ad]/10 bg-black/15 p-2.5 text-center sm:p-3"><Gamepad2 className="mx-auto h-4 w-4 text-[#7fb3a8]" /><div className="mt-1 text-sm font-black text-[#f7efdc]">6 فئات</div><div className="mt-0.5 text-[9px] font-bold text-[#f7efdc]/35">في كل جلسة</div></div>
              <div className="rounded-2xl border border-[#ead8ad]/10 bg-black/15 p-2.5 text-center sm:p-3"><Crown className="mx-auto h-4 w-4 text-[#c77a62]" /><div className="mt-1 text-sm font-black text-[#f7efdc]">3 مساعدات</div><div className="mt-0.5 text-[9px] font-bold text-[#f7efdc]/35">لكل فريق</div></div>
            </div>
          </div>

          <div className="relative hidden min-h-[230px] overflow-hidden rounded-[30px] border border-[#ead8ad]/12 bg-black/18 p-5 lg:grid lg:place-items-center">
            <div className="absolute inset-x-0 top-0 h-2 bg-[linear-gradient(90deg,#713829_0_12%,#d2aa61_12%_18%,#f0dfb6_18%_22%,#173b35_22%_34%,#713829_34%_46%,#d2aa61_46%_52%,#f0dfb6_52%_56%,#173b35_56%_68%,#713829_68%_80%,#d2aa61_80%_86%,#f0dfb6_86%_90%,#173b35_90%_100%)]" />
            <div className="relative text-center">
              <Coffee className="mx-auto h-12 w-12 text-[#d6b16b]" />
              <div className="mt-4 flex justify-center gap-2" aria-hidden="true">{[100,200,300].map((point) => <span key={point} className="grid h-14 w-16 place-items-center rounded-[18px] border border-[#ead8ad]/12 bg-white/[0.04] text-sm font-black text-[#ead8ad]" dir="ltr">{point}</span>)}</div>
              <p className="mt-3 text-[10px] font-black text-[#f7efdc]/38">سؤال · فزعة · صوت · منافسة</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4 md:mt-6"><MajlisGame /></div>
    </main>
  );
}
