"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Gamepad2, Medal, Sparkles, Target, Trophy } from "lucide-react";
import PlatformStatsOverview from "@/components/PlatformStatsOverview";
import MemberNoticeRenderer from "@/components/MemberNoticeRenderer";
import TournamentShowcase from "@/components/home/TournamentShowcase";
import GameShowcase from "@/components/home/GameShowcase";
import SportsVideoBackdrop from "@/components/media/SportsVideoBackdrop";
import { useAuth } from "@/context/AuthContext";
import {
  ASIAN_CUP_2027_TOURNAMENT,
  GULF_CUP_27_TOURNAMENT,
  WORLD_CUP_2026_TOURNAMENT,
} from "@/domain/tournaments";
import { playInteractionFeedback } from "@/lib/interactionFeedback";

const TOURNAMENTS = [GULF_CUP_27_TOURNAMENT, WORLD_CUP_2026_TOURNAMENT, ASIAN_CUP_2027_TOURNAMENT];

const reveal = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function PlatformHome() {
  const { user, isLoggedIn } = useAuth();
  const reduceMotion = useReducedMotion();

  return (
    <main dir="rtl" className="relative overflow-hidden bg-[var(--brand-navy-950)] text-white">
      {isLoggedIn && user ? <MemberNoticeRenderer userId={user.id} /> : null}
      <div className="pointer-events-none fixed inset-0 -z-0 bg-[radial-gradient(circle_at_10%_8%,rgba(255,194,16,.055),transparent_21%),radial-gradient(circle_at_92%_36%,rgba(57,104,255,.075),transparent_28%)]" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-7xl px-3 pb-12 pt-4 sm:px-4 md:px-6 md:pb-16 md:pt-7">
        <motion.section
          initial={reduceMotion ? false : "hidden"}
          animate="show"
          variants={reveal}
          transition={{ duration: 0.42, ease: "easeOut" }}
          className="altahaddi-hero-v3 altahaddi-glass-strong relative isolate overflow-hidden rounded-[30px] px-4 py-7 md:rounded-[42px] md:px-9 md:py-10 lg:px-11"
        >
          <SportsVideoBackdrop
            className="-z-10"
            opacity={0.52}
            poster="/tournaments/gulf-cup-27/identity-cover.jpg"
            overlayClassName="bg-[linear-gradient(90deg,rgba(4,19,58,.94)_0%,rgba(4,19,58,.72)_47%,rgba(4,19,58,.48)_100%),linear-gradient(180deg,rgba(4,19,58,.06),rgba(4,19,58,.52))]"
          />
          <div className="altahaddi-grid absolute inset-0 opacity-20" aria-hidden="true" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_22%,rgba(255,194,16,.16),transparent_22%),radial-gradient(circle_at_22%_100%,rgba(44,95,255,.14),transparent_28%)]" aria-hidden="true" />
          <div className="absolute -left-14 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full border border-white/[0.055] md:h-80 md:w-80" aria-hidden="true" />
          <div className="absolute -left-3 top-1/2 h-44 w-44 -translate-y-1/2 rounded-full border border-dashed border-[#ffc210]/14 md:h-56 md:w-56" aria-hidden="true" />

          <div className="relative grid items-center gap-7 md:grid-cols-[1.08fr_.92fr] md:gap-8 lg:gap-12">
            <div className="max-w-3xl">
              <div className="inline-flex min-h-[32px] items-center gap-2 rounded-full border border-[#ffc210]/20 bg-[#ffc210]/[0.08] px-3 text-[10px] font-black text-[#ffc210] md:text-xs">
                <Sparkles className="h-3.5 w-3.5" /> منصة التحدي الرياضية
              </div>

              <h1 className="mt-4 max-w-3xl text-[2.35rem] font-black leading-[1.03] tracking-[-0.045em] sm:text-5xl md:text-6xl lg:text-[4.3rem]">
                توقّعها. عِشها
                <span className="mt-1 block text-[#ffc210]">وتحدّاها</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-white/60 md:text-base md:leading-8">
                بطولات، توقعات وألعاب في تجربة واحدة سريعة وممتعة
              </p>

              <div className="mt-6 flex flex-wrap gap-2.5">
                <Link href="/tournaments" onClick={() => playInteractionFeedback("selection")} className="altahaddi-primary-button">
                  <Trophy className="h-4 w-4" /> استعرض البطولات <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link href="/games" onClick={() => playInteractionFeedback("selection")} className="altahaddi-secondary-button">
                  <Gamepad2 className="h-4 w-4" /> الألعاب والتحديات
                </Link>
              </div>
            </div>

            <div className="relative mx-auto h-[315px] w-full max-w-[390px] sm:h-[335px] md:h-[350px]" aria-hidden="true">
              <motion.div
                animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
                transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
                className="altahaddi-glass absolute inset-x-3 top-2 rounded-[30px] p-4 sm:inset-x-5 sm:p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,.65)]" />
                    <span className="text-[9px] font-black text-white/48 sm:text-[10px]">المنافسة تبدأ هنا</span>
                  </div>
                  <Trophy className="h-4 w-4 text-[#ffc210]" />
                </div>

                <div className="mt-6 flex items-center justify-center">
                  <div className="relative flex h-[120px] w-[120px] items-center justify-center rounded-[28px] border border-[#ffc210]/16 bg-[#04133a]/75 p-4 shadow-[0_24px_60px_rgba(0,0,0,.32)] sm:h-40 sm:w-40">
                    <img src="/brand/altahaddi-logo-white.png" alt="" className="h-full w-full object-contain" />
                    <div className="absolute -bottom-5 h-8 w-24 rounded-full bg-[#ffc210]/12 blur-xl" />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2">
                  {[
                    ["بطولات", Trophy],
                    ["توقعات", Target],
                    ["ألعاب", Gamepad2],
                  ].map(([label, Icon]) => {
                    const IconComponent = Icon as typeof Trophy;
                    return (
                      <div key={label as string} className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-[14px] border border-white/[0.07] bg-black/10 text-white/56">
                        <IconComponent className="h-4 w-4 text-[#ffc210]" />
                        <span className="text-[8.5px] font-black sm:text-[9px]">{label as string}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div
                animate={reduceMotion ? undefined : { x: [0, 4, 0], y: [0, -3, 0] }}
                transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
                className="altahaddi-glass-soft absolute -left-1 top-16 flex min-h-[48px] items-center gap-2 rounded-[16px] px-3 sm:left-0"
              >
                <Medal className="h-4 w-4 text-[#ffc210]" />
                <span className="text-[9px] font-black">كل نقطة تصنع فرقًا</span>
              </motion.div>
            </div>
          </div>
        </motion.section>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.35 }}
          className="mt-7 md:mt-9"
        >
          <PlatformStatsOverview />
        </motion.div>

        <div className="mt-8 md:mt-11">
          <TournamentShowcase tournaments={TOURNAMENTS} />
        </div>

        <div className="mt-9 md:mt-12">
          <GameShowcase />
        </div>

        {isLoggedIn ? (
          <motion.div whileHover={reduceMotion ? undefined : { y: -3 }} className="mt-9 md:mt-12">
            <Link href="/account" className="altahaddi-glass group flex items-center justify-between gap-4 overflow-hidden rounded-[24px] p-4 transition hover:border-[#ffc210]/24 md:p-5">
              <div><p className="text-[10px] font-black text-[#ffc210] md:text-xs">ملفك الشخصي</p><h2 className="mt-1 text-lg font-black md:text-xl">مسيرتي في التحدي</h2><p className="mt-1 text-[11px] font-semibold text-white/46 md:text-xs">بطولاتك، ألعابك وإنجازاتك من مكان واحد.</p></div>
              <Medal className="h-9 w-9 shrink-0 text-[#ffc210] transition group-hover:rotate-6 md:h-10 md:w-10" />
            </Link>
          </motion.div>
        ) : null}
      </div>
    </main>
  );
}
