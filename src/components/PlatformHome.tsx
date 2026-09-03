"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Gamepad2, Medal, Sparkles, Trophy } from "lucide-react";
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

const TOURNAMENTS = [
  GULF_CUP_27_TOURNAMENT,
  WORLD_CUP_2026_TOURNAMENT,
  ASIAN_CUP_2027_TOURNAMENT,
];

export default function PlatformHome() {
  const { user, isLoggedIn } = useAuth();
  const reduceMotion = useReducedMotion();
  const revealTransition = (delay = 0) => ({
    duration: reduceMotion ? 0 : 0.3,
    delay: reduceMotion ? 0 : delay,
    ease: "easeOut" as const,
  });

  return (
    <main
      dir="rtl"
      className="relative overflow-x-clip bg-[var(--brand-navy-950)] text-white"
    >
      {isLoggedIn && user ? <MemberNoticeRenderer userId={user.id} /> : null}
      <div
        className="pointer-events-none fixed inset-0 -z-0 bg-[radial-gradient(circle_at_10%_8%,rgba(255,194,16,.055),transparent_21%),radial-gradient(circle_at_92%_36%,rgba(57,104,255,.075),transparent_28%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-3 pb-12 pt-3 sm:px-4 md:px-6 md:pb-16 md:pt-7">
        <section
          aria-labelledby="home-hero-heading"
          className="altahaddi-hero-v3 altahaddi-glass-strong relative isolate flex min-h-[min(25rem,calc(100dvh-5.5rem))] overflow-hidden rounded-[30px] px-4 py-7 pb-[calc(6.25rem+env(safe-area-inset-bottom))] md:min-h-[min(28rem,calc(100dvh-7rem))] md:rounded-[42px] md:px-9 md:py-10 lg:px-11"
        >
          <SportsVideoBackdrop
            className="-z-10"
            opacity={0.58}
            poster="/tournaments/gulf-cup-27/identity-cover.jpg"
            overlayClassName="bg-[linear-gradient(270deg,rgba(4,19,58,.96)_0%,rgba(4,19,58,.86)_54%,rgba(4,19,58,.48)_100%),linear-gradient(180deg,rgba(4,19,58,.08),rgba(4,19,58,.46))]"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,194,16,.09),transparent_24%),radial-gradient(circle_at_82%_88%,rgba(44,95,255,.09),transparent_30%)]"
            aria-hidden="true"
          />

          <div className="relative w-full max-w-3xl">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealTransition()}
              className="inline-flex min-h-[32px] items-center gap-2 rounded-full border border-[#ffc210]/20 bg-[#ffc210]/[0.08] px-3 text-[10px] font-black text-[#ffc210] md:text-xs"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              منصة التحدي الرياضية
            </motion.div>

            <motion.h1
              id="home-hero-heading"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealTransition(0.05)}
              className="mt-4 max-w-3xl text-balance text-[clamp(2.15rem,9.5vw,4.3rem)] font-black leading-[1.1] tracking-[-0.045em]"
            >
              توقّع .. نافس <span className="text-[#ffc210]">تصدّر</span>
            </motion.h1>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealTransition(0.11)}
              className="mt-7 flex w-full flex-col gap-2.5 min-[420px]:flex-row sm:w-auto"
            >
              <Link
                href="/tournaments"
                onClick={() => playInteractionFeedback("selection")}
                className="altahaddi-primary-button w-full justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffc210] focus-visible:ring-offset-2 focus-visible:ring-offset-[#04133a] min-[420px]:flex-1 md:flex-none"
              >
                <Trophy className="h-4 w-4" aria-hidden="true" />
                <span>استعرض البطولات</span>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/games"
                onClick={() => playInteractionFeedback("selection")}
                className="altahaddi-secondary-button w-full justify-center border-white/22 bg-[#04133a]/46 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffc210] focus-visible:ring-offset-2 focus-visible:ring-offset-[#04133a] min-[420px]:flex-1 md:flex-none"
              >
                <Gamepad2 className="h-4 w-4" aria-hidden="true" />
                <span>الألعاب والتحديات</span>
              </Link>
            </motion.div>
          </div>
        </section>

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
