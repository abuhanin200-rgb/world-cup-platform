"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  BadgeCheck,
  Clock3,
  Crown,
  Gauge,
  LockKeyhole,
  Medal,
  PauseCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Swords,
  Target,
  Trophy,
  X,
} from "lucide-react";
import {
  ExactHit,
  getHomeHighlights,
  HomeHighlightUser,
} from "@/lib/highlights";
import { getSiteSettings, TickerSpeed } from "@/lib/siteSettings";
import type { KnockoutRound, MatchStage } from "@/lib/matches";
import TeamFlag from "@/components/TeamFlag";

type ExactHitWithPredictionType = ExactHit & {
  predictionType?: "normal" | "golden";
  matchStage?: MatchStage;
  knockoutRound?: KnockoutRound;
  points?: number;
  createdAt?: string;
  calculatedAt?: string;
};

type HomeHighlightUserWithTeamCode = HomeHighlightUser & {
  favoriteTeamCode?: string;
  teamCode?: string;
};

type QualifiedTeamInfo = {
  code: string;
  emoji?: string;
  name: string;
};

const sectionMotion: Variants = {
  hidden: { opacity: 1, y: 0, scale: 1 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0, ease: "linear" },
  },
};

const cardMotion: Variants = {
  hidden: { opacity: 1, y: 0, scale: 1 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0, ease: "linear" },
  },
};

const modalBackdropMotion: Variants = {
  hidden: {
    opacity: 0,
  },
  show: {
    opacity: 1,
    transition: {
      duration: 0.18,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.16,
      ease: "easeIn",
    },
  },
};

const modalMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 22,
    scale: 0.99,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: 16,
    scale: 0.99,
    transition: {
      duration: 0.14,
      ease: "easeIn",
    },
  },
};

function EmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.08] p-2 text-center shadow-md shadow-slate-950/20 md:p-3">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-cyan-300/5" />

      <div className="relative text-[11px] font-black leading-5 text-slate-200 md:text-sm">
        {title}
      </div>

      <p className="relative mt-1 text-[9px] leading-4 text-slate-300 md:text-xs">
        {text}
      </p>
    </div>
  );
}

function HighlightCard({
  title,
  icon,
  user,
  valueText,
  accentClass,
  emptyText,
}: {
  title: string;
  icon: ReactNode;
  user: HomeHighlightUser | null;
  valueText: string;
  accentClass: string;
  emptyText: string;
}) {
  if (!user) {
    return <EmptyCard title={title} text={emptyText} />;
  }

  const userWithTeamCode = user as HomeHighlightUserWithTeamCode;
  const teamCode =
    userWithTeamCode.favoriteTeamCode || userWithTeamCode.teamCode;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.08] p-2 text-center shadow-md shadow-slate-950/20 transition duration-200 hover:bg-white/[0.11] md:p-3">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-cyan-300/5" />
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      <h2 className="relative flex items-center justify-center gap-1.5 text-[11px] font-black leading-5 text-white md:text-sm">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-fuchsia-100 transition group-hover:scale-105 md:h-7 md:w-7">
          {icon}
        </span>
        <span>{title}</span>
      </h2>

      <div className="relative mt-2 rounded-2xl border border-white/10 bg-slate-950/60 p-2 shadow-inner md:p-3">
        <div className="flex justify-center">
          <TeamFlag
            code={teamCode}
            emoji={user.teamEmoji}
            name={user.favoriteTeam}
            size="md"
          />
        </div>

        <div className="mt-1 min-h-[30px] break-words text-[11px] font-black leading-4 text-white md:text-sm">
          {user.fullName}
        </div>

        <div className="mt-1 truncate text-[9px] font-medium text-slate-300 md:text-xs">
          {user.favoriteTeam || "بدون منتخب"}
        </div>

        <div
          className={`mt-2 rounded-xl px-1.5 py-1.5 text-[9px] font-black leading-4 shadow-lg md:text-xs ${accentClass}`}
        >
          {valueText}
        </div>
      </div>
    </div>
  );
}

function getPixelsPerSecond(speed: TickerSpeed) {
  if (speed === "very_slow") return 16;
  if (speed === "slow") return 24;
  if (speed === "normal") return 34;
  if (speed === "fast") return 48;
  if (speed === "very_fast") return 64;

  return 34;
}

function getRepeatCount(count: number) {
  if (count <= 1) return 14;
  if (count <= 3) return 10;
  if (count <= 6) return 7;
  if (count <= 12) return 4;
  if (count <= 25) return 2;

  return 1;
}

function getSpeedLabel(speed: string) {
  if (speed === "very_slow") return "بطيء جدًا";
  if (speed === "slow") return "بطيء";
  if (speed === "normal") return "متوسط";
  if (speed === "fast") return "سريع";
  if (speed === "very_fast") return "سريع جدًا";

  return "متوسط";
}

function getTimeValue(value?: string) {
  if (!value) return 0;

  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}

function formatRelativeHitTime(hit: ExactHitWithPredictionType) {
  const value = hit.calculatedAt || hit.createdAt;

  if (!value) return "—";

  const time = new Date(value).getTime();

  if (!Number.isFinite(time)) return "—";

  const diffMinutes = Math.max(0, Math.floor((Date.now() - time) / 60000));

  if (diffMinutes < 1) return "الآن";
  if (diffMinutes < 60) return `قبل ${diffMinutes} دقيقة`;

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours === 1) return "قبل ساعة";
  if (diffHours === 2) return "قبل ساعتين";
  if (diffHours <= 10) return `قبل ${diffHours} ساعات`;
  if (diffHours < 24) return `قبل ${diffHours} ساعة`;

  return "قبل أكثر من يوم";
}

function isGoldenExactHit(hit: ExactHitWithPredictionType) {
  return hit.predictionType === "golden";
}

function getQualificationMethodLabel(value?: string | null) {
  if (value === "extraTime") return "أشواط إضافية";
  if (value === "penalties") return "ركلات ترجيح";
  return "";
}

function getQualifiedTeamInfo(
  hit: ExactHitWithPredictionType,
): QualifiedTeamInfo | null {
  if (!hit.qualifiedTeamCode) return null;

  if (hit.qualifiedTeamCode === hit.homeTeamCode) {
    return {
      code: hit.homeTeamCode,
      emoji: hit.homeTeamEmoji,
      name: hit.homeTeamName,
    };
  }

  if (hit.qualifiedTeamCode === hit.awayTeamCode) {
    return {
      code: hit.awayTeamCode,
      emoji: hit.awayTeamEmoji,
      name: hit.awayTeamName,
    };
  }

  return {
    code: hit.qualifiedTeamCode,
    emoji: undefined,
    name: hit.qualifiedTeamCode,
  };
}

type KnockoutRoundMeta = {
  label: string;
  className: string;
};

function getKnockoutRoundMeta(
  hit: ExactHitWithPredictionType,
): KnockoutRoundMeta | null {
  if (hit.matchStage !== "knockout" && !hit.knockoutRound) {
    return null;
  }

  if (hit.knockoutRound === "semiFinal") {
    return {
      label: "نصف النهائي",
      className: "border-violet-300/30 bg-violet-400/15 text-violet-100",
    };
  }

  if (hit.knockoutRound === "thirdPlace") {
    return {
      label: "المركز الثالث",
      className: "border-orange-300/30 bg-orange-400/15 text-orange-100",
    };
  }

  if (hit.knockoutRound === "final") {
    return {
      label: "النهائي",
      className: "border-amber-300/35 bg-amber-400/15 text-amber-100",
    };
  }

  return {
    label: "خروج مغلوب",
    className: "border-blue-300/30 bg-blue-400/15 text-blue-100",
  };
}

type PlatformChampion = HomeHighlightUserWithTeamCode & {
  exactHits?: number;
};

type PodiumPlace = 1 | 2 | 3;

const CONFETTI_PARTICLES = [
  { left: "4%", delay: "0s", duration: "4.4s", rotate: "18deg" },
  { left: "9%", delay: "0.35s", duration: "4.8s", rotate: "65deg" },
  { left: "15%", delay: "0.8s", duration: "4.2s", rotate: "115deg" },
  { left: "22%", delay: "0.15s", duration: "5s", rotate: "155deg" },
  { left: "29%", delay: "1.05s", duration: "4.5s", rotate: "210deg" },
  { left: "36%", delay: "0.55s", duration: "4.9s", rotate: "260deg" },
  { left: "44%", delay: "0.05s", duration: "4.3s", rotate: "305deg" },
  { left: "52%", delay: "0.95s", duration: "5.1s", rotate: "350deg" },
  { left: "60%", delay: "0.25s", duration: "4.6s", rotate: "35deg" },
  { left: "68%", delay: "0.7s", duration: "4.1s", rotate: "90deg" },
  { left: "76%", delay: "0.4s", duration: "4.7s", rotate: "145deg" },
  { left: "83%", delay: "1.15s", duration: "5s", rotate: "205deg" },
  { left: "90%", delay: "0.1s", duration: "4.4s", rotate: "275deg" },
  { left: "96%", delay: "0.65s", duration: "4.8s", rotate: "330deg" },
];

function getPodiumMeta(place: PodiumPlace) {
  if (place === 1) {
    return {
      label: "المركز الأول",
      medal: "🥇",
      cardClass:
        "border-amber-100/80 bg-gradient-to-b from-amber-300/32 via-amber-400/13 to-slate-950/92 shadow-[0_0_54px_rgba(251,191,36,0.38)]",
      glowClass: "bg-amber-300/30",
      iconClass: "border-amber-200/60 bg-amber-300/18 text-amber-100",
      pointsClass: "border-amber-300/35 bg-amber-300/13 text-amber-100",
    };
  }

  if (place === 2) {
    return {
      label: "المركز الثاني",
      medal: "🥈",
      cardClass:
        "border-slate-200/28 bg-gradient-to-b from-slate-100/13 via-slate-300/5 to-slate-950/94 shadow-[0_0_18px_rgba(226,232,240,0.07)]",
      glowClass: "bg-slate-200/12",
      iconClass: "border-slate-100/35 bg-slate-100/10 text-slate-100",
      pointsClass: "border-slate-200/25 bg-slate-200/9 text-slate-100",
    };
  }

  return {
    label: "المركز الثالث",
    medal: "🥉",
    cardClass:
      "border-orange-300/40 bg-gradient-to-b from-orange-300/18 via-orange-400/8 to-slate-950/92 shadow-[0_0_26px_rgba(251,146,60,0.10)]",
    glowClass: "bg-orange-300/18",
    iconClass: "border-orange-200/35 bg-orange-300/10 text-orange-100",
    pointsClass: "border-orange-300/25 bg-orange-300/9 text-orange-100",
  };
}

function getSuccessRate(champion: PlatformChampion) {
  if (!champion.total) return 0;
  return Math.round((champion.correct / champion.total) * 100);
}

function ChampionBadge() {
  return (
    <div className="relative flex justify-center">
      <div className="group/badge relative inline-flex max-w-full items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-amber-300/28 blur-md" />

        <div className="relative -mt-1 inline-flex max-w-[76%] items-center justify-center gap-1.5 overflow-hidden rounded-[999px] border border-amber-100/55 bg-gradient-to-l from-amber-400/90 via-amber-200/95 to-yellow-300/90 px-2 py-1 text-[8px] font-black text-slate-950 shadow-md shadow-amber-950/25 sm:max-w-[72%] sm:gap-2 sm:px-2.5 sm:text-[9px] md:max-w-none md:px-3.5 md:text-[11px]">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent" />

          <Crown className="relative h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />

          <span className="relative whitespace-nowrap">بطل نسخة 2026</span>

          <Sparkles className="relative hidden h-3.5 w-3.5 shrink-0 sm:block" />
        </div>
      </div>
    </div>
  );
}

function ChampionStat({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/45 px-1.5 py-2 text-center shadow-inner">
      <div className="flex items-center justify-center gap-1 text-sm font-black text-white md:text-base">
        {icon}
        <span>{value}</span>
      </div>
      <div className="mt-0.5 text-[8px] font-bold leading-3 text-slate-400 md:text-[10px]">
        {label}
      </div>
    </div>
  );
}

function PodiumChampionCard({
  champion,
  place,
  pointsGap,
}: {
  champion: PlatformChampion;
  place: PodiumPlace;
  pointsGap?: number;
}) {
  const meta = getPodiumMeta(place);
  const teamCode = champion.favoriteTeamCode || champion.teamCode;
  const successRate = getSuccessRate(champion);

  return (
    <motion.article
      initial={{ opacity: 0, y: 34, scale: place === 1 ? 0.92 : 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.65,
        delay: place === 1 ? 0.12 : place === 2 ? 0.26 : 0.36,
        ease: "easeOut",
      }}
      className={`group relative flex min-w-0 flex-col overflow-hidden rounded-[1.45rem] border px-2 text-center md:rounded-[1.8rem] md:px-4 ${
        place === 1 ? "py-[1.15rem] md:py-6" : "py-2.5 md:py-3"
      } ${meta.cardClass}`}
    >
      <div
        className={`pointer-events-none absolute -top-14 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full blur-3xl ${meta.glowClass}`}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/65 to-transparent" />

      <div className="relative flex items-center justify-between gap-1">
        <span className="rounded-full border border-white/10 bg-slate-950/55 px-2 py-1 text-[9px] font-black leading-4 text-white md:px-3 md:text-xs">
          {meta.label}
        </span>
        <span className="text-xl leading-none drop-shadow-lg md:text-3xl">
          {meta.medal}
        </span>
      </div>

      <div className={`relative mx-auto ${place === 1 ? "mt-4" : "mt-3"}`}>
        <div
          className={`absolute inset-0 scale-150 rounded-full blur-2xl ${meta.glowClass}`}
        />
        <div
          className={`relative flex items-center justify-center rounded-full border shadow-xl ${
            place === 1
              ? "h-[78px] w-[78px] md:h-[104px] md:w-[104px]"
              : "h-[66px] w-[66px] md:h-[86px] md:w-[86px]"
          } ${meta.iconClass}`}
        >
          {place === 1 && (
            <>
              <div className="champion-crown-halo pointer-events-none absolute -top-9 h-16 w-16 rounded-full bg-amber-300/20 blur-xl md:-top-12 md:h-20 md:w-20" />
              <Crown className="champion-crown-shine absolute -top-8 h-[3.25rem] w-[3.25rem] rotate-[-5deg] text-amber-200 drop-shadow-[0_0_16px_rgba(253,230,138,0.82)] md:-top-11 md:h-16 md:w-16" />
            </>
          )}
          <TeamFlag
            code={teamCode}
            emoji={champion.teamEmoji}
            name={champion.favoriteTeam}
            size="lg"
          />
        </div>
      </div>

      <div
        className={`relative mt-3 min-h-[40px] break-words font-black leading-5 text-white ${
          place === 1 ? "text-sm md:text-lg" : "text-xs md:text-base"
        }`}
      >
        {champion.fullName}
      </div>

      {place === 1 && (
        <div className="relative mt-2">
          <ChampionBadge />
          <p className="mx-auto mt-2 max-w-[12rem] text-[8px] font-bold leading-4 text-amber-100/75 md:text-[10px]">
            سيبقى اسمه محفورًا في سجل أبطال المنصة
          </p>
        </div>
      )}

      <div className="relative mt-2 truncate text-[9px] font-bold text-slate-400 md:text-xs">
        {champion.favoriteTeam || "بدون منتخب مفضل"}
      </div>

      <div
        className={`relative mt-2 rounded-xl border px-2 py-2 ${meta.pointsClass}`}
      >
        <div className="flex items-center justify-center gap-1 text-lg font-black md:text-2xl">
          <Star className="h-4 w-4 fill-current md:h-5 md:w-5" />
          <span>{champion.points}</span>
        </div>
        <div className="text-[8px] font-bold opacity-70 md:text-[10px]">
          إجمالي النقاط
        </div>
      </div>

      <div className="relative mt-2 grid grid-cols-2 gap-1.5">
        <ChampionStat
          icon={<Target className="h-3.5 w-3.5 text-cyan-200" />}
          value={champion.exactHits || 0}
          label="نتائج بالملي"
        />
        <ChampionStat
          icon={<Gauge className="h-3.5 w-3.5 text-emerald-200" />}
          value={`${successRate}%`}
          label="نسبة النجاح"
        />
      </div>

      {typeof pointsGap === "number" && (
        <div className="relative mt-2 rounded-lg border border-white/8 bg-white/[0.04] px-1.5 py-1.5 text-[8px] font-bold leading-4 text-slate-400 md:text-[10px]">
          {place === 1
            ? `يتقدم على الوصيف بفارق ${pointsGap} نقطة`
            : `فارق ${pointsGap} نقطة عن المركز السابق`}
        </div>
      )}
    </motion.article>
  );
}

function HiddenPodiumCard({ place }: { place: PodiumPlace }) {
  const meta = getPodiumMeta(place);

  return (
    <article
      className={`relative flex min-w-0 flex-col items-center overflow-hidden rounded-[1.4rem] border px-2 py-3 text-center md:rounded-[1.8rem] md:px-4 md:py-4 ${meta.cardClass}`}
    >
      <div
        className={`pointer-events-none absolute -top-12 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full blur-3xl ${meta.glowClass}`}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />

      <div className="relative flex w-full items-center justify-between gap-1">
        <span className="rounded-full border border-white/10 bg-slate-950/55 px-2 py-1 text-[9px] font-black leading-4 text-white md:px-3 md:text-xs">
          {meta.label}
        </span>
        <span className="text-xl leading-none opacity-85 md:text-3xl">
          {meta.medal}
        </span>
      </div>

      <div className="relative mx-auto mt-4">
        <div
          className={`absolute inset-0 scale-150 rounded-full blur-2xl ${meta.glowClass}`}
        />
        <div
          className={`relative flex items-center justify-center rounded-full border ${
            place === 1
              ? "h-[76px] w-[76px] md:h-[100px] md:w-[100px]"
              : "h-[64px] w-[64px] md:h-[82px] md:w-[82px]"
          } ${meta.iconClass}`}
        >
          {place === 1 ? (
            <Crown className="h-10 w-10 animate-pulse md:h-12 md:w-12" />
          ) : (
            <Medal className="h-8 w-8 animate-pulse md:h-10 md:w-10" />
          )}
        </div>
      </div>

      {place === 1 && (
        <div className="relative mt-3 opacity-70">
          <ChampionBadge />
        </div>
      )}

      <div className="relative mt-4 flex min-h-[58px] items-center justify-center rounded-xl border border-white/10 bg-slate-950/42 px-2 py-2 text-[9px] font-black leading-5 text-slate-200 md:text-xs">
        <LockKeyhole className="ml-1 h-4 w-4 shrink-0 text-amber-200" />
        <span>تُكشف هوية البطل بعد اعتماد النتائج النهائية</span>
      </div>
    </article>
  );
}

function ConnectedPodium({
  championsReady,
}: {
  championsReady: boolean;
}) {
  const labels = [
    { place: 3, label: "المركز الثالث", className: "from-orange-400/22" },
    { place: 1, label: "المركز الأول", className: "from-amber-300/30" },
    { place: 2, label: "المركز الثاني", className: "from-slate-200/20" },
  ];

  return (
    <div className="relative mt-[-1px] px-1 drop-shadow-[0_18px_24px_rgba(2,6,23,0.5)] md:px-3">
      <div className="pointer-events-none absolute inset-x-3 top-0 z-10 h-[2px] rounded-full bg-gradient-to-r from-transparent via-amber-200/90 to-transparent shadow-[0_0_10px_rgba(253,230,138,0.45)] md:inset-x-7" />

      <div className="grid grid-cols-3 items-end">
      {labels.map((item) => (
        <div
          key={item.place}
          className={`relative flex items-center justify-center border border-white/10 bg-gradient-to-b ${item.className} to-slate-950/85 ${
            item.place === 1
              ? "h-20 rounded-t-[1.4rem] border-amber-300/45 shadow-[0_18px_32px_rgba(2,6,23,0.45)] md:h-28"
              : item.place === 2
                ? "h-12 rounded-tr-[1.2rem] md:h-16"
                : "h-10 rounded-tl-[1.2rem] md:h-14"
          }`}
        >
          <span
            className={`font-black ${
              item.place === 1
                ? "text-3xl text-amber-100 md:text-5xl"
                : "text-2xl text-white md:text-4xl"
            }`}
          >
            {item.place}
          </span>
          {item.place === 1 && championsReady && (
            <div className="absolute -top-3 flex items-center gap-1 rounded-full border border-amber-300/35 bg-amber-300/15 px-2 py-0.5 text-[8px] font-black text-amber-100 md:text-[10px]">
              <Crown className="h-3 w-3" />
              البطل
            </div>
          )}
        </div>
      ))}
      </div>
    </div>
  );
}

function CelebrationEffects({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-[2rem]">
      {CONFETTI_PARTICLES.map((particle, index) => (
        <span
          key={`${particle.left}-${index}`}
          className={`champion-confetti champion-confetti-${index % 4}`}
          style={{
            left: particle.left,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
            transform: `rotate(${particle.rotate})`,
          }}
        />
      ))}
    </div>
  );
}

export default function HomeHighlights() {
  const [platformChampions, setPlatformChampions] = useState<
    PlatformChampion[]
  >([]);
  const [isFinalCalculated, setIsFinalCalculated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    async function loadHighlights() {
      try {
        const data = await getHomeHighlights();
        const finalCalculated = Boolean(data.isFinalCalculated);

        setPlatformChampions(
          Array.isArray(data.platformChampions)
            ? (data.platformChampions as PlatformChampion[])
            : [],
        );
        setIsFinalCalculated(finalCalculated);

        if (finalCalculated) {
          const celebrationKey = "world-cup-2026-champions-celebration-seen";
          const hasSeenCelebration = window.localStorage.getItem(celebrationKey);

          if (!hasSeenCelebration) {
            setShowCelebration(true);
            window.localStorage.setItem(celebrationKey, "1");

            window.setTimeout(() => {
              setShowCelebration(false);
            }, 5200);
          }
        }
      } catch (error) {
        console.error("فشل تحميل أبطال المنصة:", error);
      } finally {
        setLoading(false);
      }
    }

    loadHighlights();

    function loadHighlightsWhenVisible() {
      if (document.visibilityState !== "visible") return;
      loadHighlights();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadHighlights();
      }
    }

    const interval = setInterval(loadHighlightsWhenVisible, 30000);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const firstPlace = platformChampions[0] || null;
  const secondPlace = platformChampions[1] || null;
  const thirdPlace = platformChampions[2] || null;

  const championsReady =
    isFinalCalculated && Boolean(firstPlace && secondPlace && thirdPlace);

  return (
    <motion.section
      variants={sectionMotion}
      initial="hidden"
      animate="show"
      className="relative mt-4 overflow-hidden rounded-[2rem] border border-amber-300/25 bg-slate-950/80 p-3 shadow-[0_22px_60px_rgba(2,6,23,0.5)] md:mt-5 md:rounded-[2.5rem] md:p-5"
    >
      <CelebrationEffects active={showCelebration} />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-300/9 via-violet-400/4 to-cyan-300/8" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-100/80 to-transparent" />

      <div className="champion-rays pointer-events-none absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full opacity-55 md:top-14 md:h-[28rem] md:w-[28rem]" />

      {[
        { left: "8%", top: "8%", delay: "0s" },
        { left: "78%", top: "10%", delay: "0.45s" },
        { left: "12%", top: "56%", delay: "0.9s" },
        { left: "84%", top: "58%", delay: "1.35s" },
        { left: "52%", top: "42%", delay: "1.8s" },
      ].map((sparkle, index) => (
        <Sparkles
          key={`champion-sparkle-${index}`}
          className="champion-sparkle pointer-events-none absolute h-2.5 w-2.5 text-amber-200/35"
          style={{
            left: sparkle.left,
            top: sparkle.top,
            animationDelay: sparkle.delay,
          }}
        />
      ))}

      <div className="relative text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-300/35 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black text-amber-100 shadow-lg shadow-amber-950/20 md:text-xs">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{championsReady ? "التتويج الرسمي" : "لحظة التتويج تقترب"}</span>
        </div>

        <div className="relative mx-auto mt-3 flex h-20 w-20 items-center justify-center rounded-[1.55rem] border border-amber-300/40 bg-gradient-to-br from-amber-300/28 to-amber-500/8 text-amber-100 shadow-[0_0_36px_rgba(251,191,36,0.22)] md:h-24 md:w-24">
          <div className="champion-trophy-glow absolute inset-0 rounded-[1.55rem] bg-amber-300/14 blur-xl" />
          <Trophy className="relative h-10 w-10 md:h-12 md:w-12" />
          <Crown className="absolute -top-5 h-10 w-10 rotate-[-8deg] text-amber-200 drop-shadow-[0_0_12px_rgba(253,230,138,0.75)] md:h-12 md:w-12" />
        </div>

        <h2 className="mt-4 bg-gradient-to-l from-amber-200 via-white to-cyan-100 bg-clip-text text-lg font-black tracking-tight text-transparent md:text-3xl">
          أبطال منصة توقعات كأس العالم 2026
        </h2>

        <p className="mx-auto mt-2 max-w-2xl text-[10px] font-medium leading-5 text-slate-300 md:text-sm md:leading-7">
          {championsReady
            ? "انتهت رحلة كأس العالم 2026… وهؤلاء هم أبطال المنصة."
            : "المنافسة في لحظاتها الأخيرة… تُكشف هوية الأبطال تلقائيًا بعد احتساب النهائي الكبير."}
        </p>
      </div>

      <div className="relative mt-5 rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-2 md:mt-7 md:p-4">
        <div className="pointer-events-none absolute inset-0 rounded-[1.7rem] bg-gradient-to-b from-white/5 to-transparent" />

        <div className="relative grid grid-cols-3 items-end gap-1.5 md:gap-4">
          {loading || !championsReady ? (
            <>
              <HiddenPodiumCard place={3} />
              <div className="md:-translate-y-5 md:scale-[1.08]">
                <HiddenPodiumCard place={1} />
              </div>
              <HiddenPodiumCard place={2} />
            </>
          ) : (
            <>
              <PodiumChampionCard
                champion={thirdPlace}
                place={3}
                pointsGap={Math.max(0, secondPlace.points - thirdPlace.points)}
              />
              <div className="relative z-10 md:-translate-y-10 md:scale-[1.18]">
                <PodiumChampionCard
                  champion={firstPlace}
                  place={1}
                  pointsGap={Math.max(0, firstPlace.points - secondPlace.points)}
                />
              </div>
              <PodiumChampionCard
                champion={secondPlace}
                place={2}
                pointsGap={Math.max(0, firstPlace.points - secondPlace.points)}
              />
            </>
          )}
        </div>

        <ConnectedPodium championsReady={championsReady} />
      </div>

      <div className="relative mt-4 flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-3 text-center md:flex-row md:gap-3">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-amber-100 md:text-xs">
          <ShieldCheck className="h-4 w-4" />
          <span>الترتيب النهائي يعتمد نظام لوحة الصدارة المعتمد</span>
        </div>

        <span className="hidden h-4 w-px bg-white/15 md:block" />

        <div className="text-[9px] font-bold text-slate-400 md:text-[11px]">
          {championsReady
            ? "سيتم تخليد أسماء الأبطال في سجل نسخة 2026"
            : "الأسماء محفوظة حتى لحظة الحسم"}
        </div>
      </div>

      <style jsx>{`
        .champion-rays {
          background:
            repeating-conic-gradient(
              from 0deg,
              rgba(251, 191, 36, 0.18) 0deg,
              rgba(251, 191, 36, 0.03) 8deg,
              transparent 16deg,
              transparent 28deg
            );
          mask-image: radial-gradient(circle, black 0%, transparent 70%);
          -webkit-mask-image: radial-gradient(circle, black 0%, transparent 70%);
          animation: championRaysSpin 24s linear infinite;
        }

        .champion-sparkle {
          animation: championSparkle 2.4s ease-in-out infinite;
        }

        .champion-trophy-glow {
          animation: championTrophyGlow 1.8s ease-in-out infinite;
        }

        .champion-crown-shine {
          animation: championCrownShine 5.6s ease-in-out infinite;
          transform-origin: center;
        }

        .champion-crown-halo {
          animation: championCrownHalo 5.6s ease-in-out infinite;
        }


        .champion-confetti {
          position: absolute;
          top: -24px;
          width: 7px;
          height: 14px;
          border-radius: 2px;
          animation-name: championConfettiFall;
          animation-timing-function: ease-in;
          animation-fill-mode: forwards;
        }

        .champion-confetti-0 {
          background: #fbbf24;
        }

        .champion-confetti-1 {
          background: #67e8f9;
        }

        .champion-confetti-2 {
          background: #f472b6;
        }

        .champion-confetti-3 {
          background: #a7f3d0;
        }

        @keyframes championRaysSpin {
          from {
            transform: translateX(-50%) rotate(0deg);
          }

          to {
            transform: translateX(-50%) rotate(360deg);
          }
        }

        @keyframes championSparkle {
          0%,
          100% {
            opacity: 0.12;
            transform: scale(0.68) rotate(0deg);
          }

          50% {
            opacity: 0.55;
            transform: scale(1.05) rotate(18deg);
          }
        }

        @keyframes championTrophyGlow {
          0%,
          100% {
            opacity: 0.45;
            transform: scale(0.94);
          }

          50% {
            opacity: 1;
            transform: scale(1.12);
          }
        }

        @keyframes championCrownShine {
          0%,
          74%,
          100% {
            filter: brightness(1) drop-shadow(0 0 10px rgba(253, 230, 138, 0.45));
            transform: rotate(-5deg) scale(1);
          }

          82% {
            filter: brightness(1.5) drop-shadow(0 0 20px rgba(253, 230, 138, 0.9));
            transform: rotate(-3deg) scale(1.09);
          }

          90% {
            filter: brightness(1.12) drop-shadow(0 0 14px rgba(253, 230, 138, 0.65));
            transform: rotate(-6deg) scale(1.03);
          }
        }

        @keyframes championCrownHalo {
          0%,
          74%,
          100% {
            opacity: 0.3;
            transform: scale(0.92);
          }

          82% {
            opacity: 0.75;
            transform: scale(1.12);
          }

          90% {
            opacity: 0.45;
            transform: scale(1.02);
          }
        }

        @keyframes championConfettiFall {
          0% {
            opacity: 0;
            transform: translate3d(0, -25px, 0) rotate(0deg);
          }

          8% {
            opacity: 1;
          }

          100% {
            opacity: 0;
            transform: translate3d(24px, 720px, 0) rotate(760deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .champion-rays,
          .champion-sparkle,
          .champion-trophy-glow,
          .champion-confetti,
          .champion-crown-shine,
          .champion-crown-halo {
            animation: none !important;
          }
        }
      `}</style>
    </motion.section>
  );
}

export function ExactHitsTicker() {
  const [exactHits, setExactHits] = useState<ExactHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [speed, setSpeed] = useState<TickerSpeed>("normal");
  const [isPaused, setIsPaused] = useState(false);
  const [groupWidth, setGroupWidth] = useState(0);
  const [isListOpen, setIsListOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const groupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    async function loadExactHits() {
      try {
        const data = await getHomeHighlights();
        setExactHits(data.exactHits);
      } catch (error) {
        console.error("فشل تحميل شريط جابها صح:", error);
      } finally {
        setLoading(false);
      }
    }

    async function loadTickerSettings() {
      try {
        const settings = await getSiteSettings();
        setSpeed(settings.exactHitsSpeed);
      } catch (error) {
        console.error("فشل تحميل إعدادات سرعة جابها صح:", error);
        setSpeed("normal");
      }
    }

    loadExactHits();
    loadTickerSettings();

    function loadExactHitsWhenVisible() {
      if (document.visibilityState !== "visible") return;
      loadExactHits();
    }

    function loadTickerSettingsWhenVisible() {
      if (document.visibilityState !== "visible") return;
      loadTickerSettings();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadExactHits();
        loadTickerSettings();
      }
    }

    const exactHitsInterval = setInterval(loadExactHitsWhenVisible, 30000);
    const settingsInterval = setInterval(loadTickerSettingsWhenVisible, 15000);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(exactHitsInterval);
      clearInterval(settingsInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const sortedExactHits = useMemo(() => {
    return [...exactHits].sort((a, b) => {
      const aHit = a as ExactHitWithPredictionType;
      const bHit = b as ExactHitWithPredictionType;

      const aTime = getTimeValue(aHit.calculatedAt || aHit.createdAt);
      const bTime = getTimeValue(bHit.calculatedAt || bHit.createdAt);

      return bTime - aTime;
    });
  }, [exactHits]);

  const repeatedHits = useMemo(() => {
    if (exactHits.length === 0) return [];

    const repeated: ExactHit[] = [];
    const repeatCount = getRepeatCount(exactHits.length);

    for (let i = 0; i < repeatCount; i += 1) {
      repeated.push(...exactHits);
    }

    return repeated;
  }, [exactHits]);

  useEffect(() => {
    function measureWidth() {
      if (!groupRef.current) return;
      setGroupWidth(groupRef.current.scrollWidth);
    }

    measureWidth();

    const resizeObserver = new ResizeObserver(measureWidth);

    if (groupRef.current) {
      resizeObserver.observe(groupRef.current);
    }

    window.addEventListener("resize", measureWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureWidth);
    };
  }, [repeatedHits]);

  const pixelsPerSecond = getPixelsPerSecond(speed);

  const duration = Math.max(
    25,
    Math.round((groupWidth || 1200) / pixelsPerSecond),
  );

  function pauseTicker() {
    setIsPaused(true);
  }

  function resumeTicker() {
    setIsPaused(false);
  }

  function renderExactHitCard(hit: ExactHit, index: number) {
    const exactHit = hit as ExactHitWithPredictionType;
    const golden = isGoldenExactHit(exactHit);
    const qualifiedTeam = getQualifiedTeamInfo(exactHit);
    const knockoutRound = getKnockoutRoundMeta(exactHit);

    return (
      <div
        key={`${hit.id}-${index}`}
        dir="rtl"
        className={`group relative inline-flex min-h-[46px] flex-none items-center gap-2 overflow-hidden whitespace-nowrap rounded-2xl border px-3 py-2 text-xs text-white shadow-md shadow-slate-950/25 md:px-4 md:text-sm ${
          golden
            ? "border-fuchsia-300/40 bg-gradient-to-l from-amber-400/20 via-fuchsia-400/15 to-amber-300/10"
            : "border-emerald-300/20 bg-slate-950/70"
        }`}
      >
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-l ${
            golden
              ? "from-fuchsia-300/20 via-amber-300/10 to-transparent"
              : "from-emerald-300/10 via-transparent to-transparent"
          }`}
        />

        {golden && (
          <span className="relative inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 via-fuchsia-300 to-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950 shadow-md shadow-fuchsia-950/20 md:text-xs">
            <Rocket className="h-3 w-3" />
            <span>سوبر ذهبي بالملي +10</span>
          </span>
        )}

        {knockoutRound && (
          <span
            className={`relative inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black shadow-md shadow-slate-950/15 md:text-xs ${knockoutRound.className}`}
          >
            <Swords className="h-3 w-3" />
            <span>{knockoutRound.label}</span>
          </span>
        )}

        <span
          className={
            golden
              ? "relative font-black text-fuchsia-200"
              : "relative font-black text-emerald-300"
          }
        >
          {hit.userName}
        </span>

        <span className="relative text-slate-300">
          {golden ? "جاب السوبر ذهبي بالملي" : "جابها صح بالملي"}
        </span>

        <span className="relative inline-flex items-center gap-1 align-middle font-bold">
          <TeamFlag
            code={hit.homeTeamCode}
            emoji={hit.homeTeamEmoji}
            name={hit.homeTeamName}
            size="xs"
          />
          {hit.homeTeamName}
        </span>

        <span className="relative rounded-xl bg-amber-400 px-2 py-1 font-black text-slate-950 shadow-inner">
          {hit.homeScore} - {hit.awayScore}
        </span>

        <span className="relative inline-flex items-center gap-1 align-middle font-bold">
          {hit.awayTeamName}
          <TeamFlag
            code={hit.awayTeamCode}
            emoji={hit.awayTeamEmoji}
            name={hit.awayTeamName}
            size="xs"
          />
        </span>

        {qualifiedTeam && (
          <span className="relative inline-flex items-center gap-1 align-middle font-black text-blue-200">
            <span>• المتأهل</span>
            <TeamFlag
              code={qualifiedTeam.code}
              emoji={qualifiedTeam.emoji}
              name={qualifiedTeam.name}
              size="xs"
            />
            <span>{qualifiedTeam.name}</span>

            {exactHit.qualificationMethod && (
              <span>
                • {getQualificationMethodLabel(exactHit.qualificationMethod)}
              </span>
            )}
          </span>
        )}
      </div>
    );
  }

  function renderEmptyTickerCard(index: number) {
    return (
      <div
        key={`empty-exact-hit-${index}`}
        dir="rtl"
        className="group relative inline-flex min-h-[46px] flex-none items-center gap-2 overflow-hidden whitespace-nowrap rounded-2xl border border-emerald-300/20 bg-slate-950/70 px-3 py-2 text-xs text-white shadow-md shadow-slate-950/25 md:px-4 md:text-sm"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-emerald-300/10 via-transparent to-cyan-300/5" />

        <span className="relative inline-flex items-center gap-1 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-black text-emerald-100 md:text-xs">
          <Target className="h-3 w-3" />
          <span>بانتظار أول إصابة</span>
        </span>

        <span className="relative font-black text-emerald-300">جابها صح</span>

        <span className="relative text-slate-300">
          لم يسجل أحد نتيجة بالملي خلال آخر 24 ساعة
        </span>

        <span className="relative rounded-xl bg-emerald-400 px-2 py-1 font-black text-slate-950 shadow-inner">
          قريبًا
        </span>
      </div>
    );
  }

  function renderExactHitListItem(hit: ExactHit) {
    const exactHit = hit as ExactHitWithPredictionType;
    const golden = isGoldenExactHit(exactHit);
    const qualifiedTeam = getQualifiedTeamInfo(exactHit);
    const knockoutRound = getKnockoutRoundMeta(exactHit);

    return (
      <motion.div
        key={hit.id}
        variants={cardMotion}
        className={`relative overflow-hidden rounded-3xl border p-3 shadow-xl shadow-slate-950/25 ${
          golden
            ? "border-fuchsia-300/40 bg-gradient-to-br from-amber-400/12 via-fuchsia-400/10 to-slate-950/60"
            : "border-white/10 bg-slate-950/60"
        }`}
      >
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${
            golden
              ? "from-fuchsia-300/15 via-amber-300/10 to-transparent"
              : "from-emerald-300/10 via-transparent to-transparent"
          }`}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div
              className={`text-sm font-black ${
                golden ? "text-fuchsia-100" : "text-emerald-200"
              }`}
            >
              {hit.userName}
            </div>

            <div className="mt-1 text-[11px] font-medium leading-5 text-slate-300">
              {golden ? "جاب السوبر ذهبي بالملي" : "جابها صح بالملي"}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {knockoutRound && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black shadow-md shadow-slate-950/15 ${knockoutRound.className}`}
              >
                <Swords className="h-3 w-3" />
                <span>{knockoutRound.label}</span>
              </span>
            )}

            <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-200">
              <Clock3 className="h-3 w-3" />
              <span>{formatRelativeHitTime(exactHit)}</span>
            </div>
          </div>
        </div>

        <div className="relative mt-3 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs font-black text-white shadow-inner">
          <span className="inline-flex items-center gap-1">
            <TeamFlag
              code={hit.homeTeamCode}
              emoji={hit.homeTeamEmoji}
              name={hit.homeTeamName}
              size="sm"
            />
            {hit.homeTeamName}
          </span>

          <span className="rounded-xl bg-amber-400 px-2.5 py-1 text-slate-950">
            {hit.homeScore} - {hit.awayScore}
          </span>

          <span className="inline-flex items-center gap-1">
            {hit.awayTeamName}
            <TeamFlag
              code={hit.awayTeamCode}
              emoji={hit.awayTeamEmoji}
              name={hit.awayTeamName}
              size="sm"
            />
          </span>
        </div>

        {qualifiedTeam && (
          <div className="relative mt-2 flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-blue-400/30 bg-blue-400/10 px-3 py-2 text-center text-xs font-black text-blue-100">
            <span>المتأهل</span>
            <TeamFlag
              code={qualifiedTeam.code}
              emoji={qualifiedTeam.emoji}
              name={qualifiedTeam.name}
              size="sm"
            />
            <span>{qualifiedTeam.name}</span>
            {exactHit.qualificationMethod && (
              <span>
                • {getQualificationMethodLabel(exactHit.qualificationMethod)}
              </span>
            )}
          </div>
        )}

        {golden && (
          <div className="relative mt-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 via-fuchsia-300 to-amber-400 px-2 py-1 text-[10px] font-black text-slate-950">
            <Rocket className="h-3 w-3" />
            <span>سوبر ذهبي بالملي +10</span>
          </div>
        )}
      </motion.div>
    );
  }

  const exactHitsModal = isMounted
    ? createPortal(
        <AnimatePresence>
          {isListOpen && (
            <motion.div
              variants={modalBackdropMotion}
              initial="hidden"
              animate="show"
              exit="exit"
              className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/88 p-0 backdrop-blur-sm md:items-center md:p-4"
              onClick={() => setIsListOpen(false)}
            >
              <motion.div
                variants={modalMotion}
                dir="rtl"
                className="flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] border border-emerald-400/30 bg-slate-950 shadow-xl shadow-slate-950/45 md:max-h-[84vh] md:rounded-[2rem]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="relative shrink-0 border-b border-white/10 bg-emerald-400/10 px-4 py-3">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-300/10 via-transparent to-cyan-400/5" />

                  <div className="relative mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/20 md:hidden" />

                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black text-emerald-100">
                        <Target className="h-3.5 w-3.5" />
                        <span>آخر 24 ساعة</span>
                      </div>

                      <h3 className="text-lg font-black text-emerald-100">
                        قائمة جابها صح
                      </h3>

                      <p className="mt-1 text-[11px] font-medium leading-5 text-emerald-100/70">
                        الأحدث أولاً — التوقعات الصحيحة بالملي خلال آخر 24 ساعة.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsListOpen(false)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white shadow-md shadow-slate-950/20 transition hover:bg-white/20 active:scale-95"
                      aria-label="إغلاق"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="relative mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2">
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-100">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      <span>المجموع</span>
                    </div>

                    <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black text-emerald-100">
                      {sortedExactHits.length} توقع
                    </span>
                  </div>
                </div>

                <motion.div
                  variants={sectionMotion}
                  initial="hidden"
                  animate="show"
                  className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 pb-3"
                >
                  {sortedExactHits.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm font-bold text-slate-300">
                      لا توجد توقعات صحيحة خلال آخر 24 ساعة.
                    </div>
                  ) : (
                    sortedExactHits.map((hit) => renderExactHitListItem(hit))
                  )}
                </motion.div>

                <div
                  className="shrink-0 border-t border-white/10 bg-slate-950/95 p-3"
                  style={{
                    paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setIsListOpen(false)}
                    className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-300 active:scale-95"
                  >
                    <X className="h-4 w-4" />
                    <span>إغلاق القائمة</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )
    : null;

  if (loading) {
    return (
      <>
        <section className="relative mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 shadow-xl shadow-slate-950/25 md:mt-6">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-300" />
            <span>جاري تحميل شريط جابها صح...</span>
          </div>
        </section>
        {exactHitsModal}
      </>
    );
  }

  return (
    <>
      <section className="relative mt-5 overflow-hidden rounded-[1.65rem] border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 shadow-md shadow-slate-950/25 md:mt-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-300/10 via-transparent to-cyan-300/5" />
        <div
          className="pointer-events-none absolute -right-20 top-0 h-40 w-40 rounded-full"
          style={{
            background:
              "radial-gradient(circle at center, rgba(110,231,183,0.17) 0%, rgba(110,231,183,0.08) 38%, rgba(110,231,183,0.022) 62%, transparent 82%)",
          }}
        />
        <div
          className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full"
          style={{
            background:
              "radial-gradient(circle at center, rgba(103,232,249,0.17) 0%, rgba(103,232,249,0.08) 38%, rgba(103,232,249,0.022) 62%, transparent 82%)",
          }}
        />

        <div className="relative">
          <div className="mb-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsListOpen(true)}
              className="group inline-flex min-h-[38px] items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-sm font-black text-emerald-200 shadow-md shadow-emerald-950/10 transition hover:bg-emerald-400/20 active:scale-95"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-300/15 text-emerald-200">
                <Target className="h-4 w-4 transition group-hover:scale-110 group-hover:rotate-[-6deg]" />
              </span>
              <span>جابها صح</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-emerald-100/80 md:inline-flex">
                <Gauge className="h-3.5 w-3.5" />
                <span>السرعة: {getSpeedLabel(speed)}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[11px] font-black text-emerald-100">
                <Clock3 className="h-3.5 w-3.5" />
                <span>آخر 24 ساعة</span>
              </span>
            </div>
          </div>

          <div
            dir="ltr"
            className="exact-hits-window relative isolate overflow-hidden rounded-2xl border border-white/10 bg-slate-950/65 py-3 shadow-inner"
            onMouseEnter={pauseTicker}
            onMouseLeave={resumeTicker}
            onPointerDown={pauseTicker}
            onPointerUp={resumeTicker}
            onPointerCancel={resumeTicker}
          >
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-slate-950/90 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-slate-950/90 to-transparent" />

            <div
              className="exact-hits-track flex w-max gap-3"
              style={{
                animationDuration: `${duration}s`,
                animationPlayState: isPaused ? "paused" : "running",
              }}
            >
              <div ref={groupRef} className="flex flex-none gap-3">
                {exactHits.length === 0
                  ? Array.from({ length: 8 }).map((_, index) =>
                      renderEmptyTickerCard(index),
                    )
                  : repeatedHits.map((hit, index) =>
                      renderExactHitCard(hit, index),
                    )}
              </div>

              <div className="flex flex-none gap-3">
                {exactHits.length === 0
                  ? Array.from({ length: 8 }).map((_, index) =>
                      renderEmptyTickerCard(index + 8),
                    )
                  : repeatedHits.map((hit, index) =>
                      renderExactHitCard(hit, index + repeatedHits.length),
                    )}
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-bold text-emerald-100/70">
            <PauseCircle className="h-3.5 w-3.5" />
            <span>يتوقف الشريط عند اللمس</span>
          </div>
        </div>

        <style jsx>{`
          .exact-hits-window {
            contain: layout paint;
          }

          .exact-hits-track {
            animation-name: exactHitsMove;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            will-change: transform;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            transform-style: preserve-3d;
          }

          .exact-hits-window:hover .exact-hits-track,
          .exact-hits-window:active .exact-hits-track,
          .exact-hits-window:focus-within .exact-hits-track {
            animation-play-state: paused;
          }

          @keyframes exactHitsMove {
            0% {
              transform: translate3d(-50%, 0, 0);
            }

            100% {
              transform: translate3d(0, 0, 0);
            }
          }
        `}</style>
      </section>

      {exactHitsModal}
    </>
  );
}
