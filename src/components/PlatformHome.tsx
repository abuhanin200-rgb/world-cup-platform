"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Crown, Gamepad2, Medal, Sparkles, Trophy } from "lucide-react";
import PlatformStatsOverview from "@/components/PlatformStatsOverview";
import { useGulfCup27FinalCelebration } from "@/components/GulfCup27FinalCelebration";
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

const TOURNAMENTS = [
  GULF_CUP_27_TOURNAMENT,
  WORLD_CUP_2026_TOURNAMENT,
  ASIAN_CUP_2027_TOURNAMENT,
];

export default function PlatformHome() {
  const { user, isLoggedIn } = useAuth();
  const { isAvailable: isFinalCelebrationAvailable, champion, replay: replayFinalCelebration } = useGulfCup27FinalCelebration();
  const reduceMotion = useReducedMotion();
  const revealTransition = (delay = 0) => ({
    duration: reduceMotion ? 0 : 0.3,
    delay: reduceMotion ? 0 : delay,
    ease: "easeOut" as const,
  });

  return (
    <main
      dir="rtl"
      className="relative bg-[var(--brand-navy-950)] text-white"
    >
      {isLoggedIn && user ? <MemberNoticeRenderer userId={user.id} /> : null}
      <div
        className="pointer-events-none fixed inset-0 -z-0 bg-[radial-gradient(circle_at_10%_8%,rgba(255,194,16,.055),transparent_21%),radial-gradient(circle_at_92%_36%,rgba(57,104,255,.075),transparent_28%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-3 pb-12 pt-3 sm:px-4 md:px-6 md:pb-16 md:pt-7">
        <section
          aria-labelledby="home-hero-heading"
          className="altahaddi-hero-v3 altahaddi-home-hero relative isolate overflow-hidden rounded-[30px] px-4 py-8 md:rounded-[42px] md:px-9 md:py-10 lg:px-11"
        >
          <SportsVideoBackdrop
            className="altahaddi-home-hero-backdrop -z-10"
            opacity={0.72}
            poster="/tournaments/gulf-cup-27/identity-cover.jpg"
            overlayClassName="bg-[linear-gradient(270deg,rgba(4,19,58,.91)_0%,rgba(4,19,58,.68)_48%,rgba(4,19,58,.28)_100%),linear-gradient(180deg,rgba(4,19,58,.04),rgba(4,19,58,.20))]"
          />

          <div className="relative w-full max-w-[42rem]">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealTransition()}
              className="altahaddi-eyebrow inline-flex min-h-[32px] items-center gap-2 rounded-full border border-[#ffc210]/20 bg-[#ffc210]/[0.08] px-3 font-semibold text-[#ffc210]"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              منصة التحدي الرياضية
            </motion.div>

            <motion.h1
              id="home-hero-heading"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealTransition(0.05)}
              className="altahaddi-display-title mt-4 max-w-[42rem] text-balance font-extrabold"
            >
              <span className="block sm:inline">توقع. نافس</span>{" "}
              <span className="text-[#ffc210]">تصدر</span>
            </motion.h1>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealTransition(0.11)}
              className="mt-6 grid w-full grid-cols-1 gap-3 min-[410px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
            >
              <Link
                href="/tournaments"
                onClick={() => playInteractionFeedback("selection")}
                className="altahaddi-primary-button min-w-0 w-full justify-center whitespace-nowrap px-3.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffc210] focus-visible:ring-offset-2 focus-visible:ring-offset-[#04133a]"
              >
                <Trophy className="h-4 w-4" aria-hidden="true" />
                <span>استعرض البطولات</span>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/games"
                onClick={() => playInteractionFeedback("selection")}
                className="altahaddi-secondary-button min-w-0 w-full justify-center whitespace-nowrap border-white/22 bg-[#04133a]/46 px-3.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffc210] focus-visible:ring-offset-2 focus-visible:ring-offset-[#04133a]"
              >
                <Gamepad2 className="h-4 w-4" aria-hidden="true" />
                <span>الألعاب والتحديات</span>
              </Link>
            </motion.div>
          </div>
        </section>

        {isFinalCelebrationAvailable && champion ? (
          <section
            aria-label="حفل تتويج خليجي الديار العربية 27"
            className="relative mt-4 overflow-hidden rounded-[26px] border border-amber-300/25 bg-[linear-gradient(110deg,#0b2757_0%,#10234b_55%,#30271e_100%)] p-4 shadow-[0_14px_40px_rgba(0,0,0,.15)] sm:p-5"
          >
            <div className="pointer-events-none absolute -left-10 -top-20 h-48 w-48 rounded-full bg-amber-300/10 blur-3xl" aria-hidden="true" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-amber-200/25 bg-amber-300/15 text-amber-200">
                  <Crown className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-amber-200">الترتيب النهائي · خليجي 27</p>
                  <h2 className="mt-0.5 text-sm font-black text-white sm:text-base">
                    تُوّج {champion.fullName} بطلًا للتوقعات
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-white/60">{champion.points} نقطة · شاهد لحظة التتويج وشارك بطاقة البطل</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { playInteractionFeedback("selection"); replayFinalCelebration(); }}
                className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#ffc210] px-5 text-sm font-black text-[#04133a] shadow-[0_8px_25px_rgba(255,194,16,.16)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:w-auto"
              >
                <Trophy className="h-4 w-4" aria-hidden="true" />
                حفل تتويج خليجي 27
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </section>
        ) : null}

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: reduceMotion ? 0 : 0.35 }}
          className="mt-6 md:mt-8"
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
          <motion.div
            whileHover={reduceMotion ? undefined : { y: -3 }}
            className="mt-9 md:mt-12"
          >
            <Link
              href="/account"
              className="altahaddi-glass group flex items-center justify-between gap-4 overflow-hidden rounded-[24px] p-4 transition hover:border-[#ffc210]/24 md:p-5"
            >
              <div>
                <p className="text-[10px] font-black text-[#ffc210] md:text-xs">
                  ملفك الشخصي
                </p>
                <h2 className="mt-1 text-lg font-black md:text-xl">مسيرتي في التحدي</h2>
                <p className="mt-1 text-[11px] font-semibold text-white/46 md:text-xs">
                  بطولاتك، ألعابك وإنجازاتك من مكان واحد.
                </p>
              </div>
              <Medal className="h-9 w-9 shrink-0 text-[#ffc210] transition group-hover:rotate-6 md:h-10 md:w-10" />
            </Link>
          </motion.div>
        ) : null}
      </div>
    </main>
  );
}
