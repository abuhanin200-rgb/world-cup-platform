"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  BadgeCheck,
  Clock3,
  Crown,
  Gauge,
  Medal,
  PauseCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
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

type PlatformChampion = HomeHighlightUserWithTeamCode;

type PodiumPlace = 1 | 2 | 3;

function getPodiumMeta(place: PodiumPlace) {
  if (place === 1) {
    return {
      label: "المركز الأول",
      badge: "بطل نسخة 2026",
      medal: "🥇",
      heightClass: "md:min-h-[330px]",
      cardClass:
        "border-amber-300/45 bg-gradient-to-b from-amber-300/22 via-amber-400/10 to-slate-950/80 shadow-amber-950/35",
      glowClass: "bg-amber-300/25",
      iconClass: "border-amber-200/40 bg-amber-300/20 text-amber-100",
      podiumClass:
        "border-amber-300/35 bg-gradient-to-b from-amber-300/25 to-amber-500/10 text-amber-100",
      pointsClass:
        "border-amber-300/35 bg-amber-300/15 text-amber-100",
    };
  }

  if (place === 2) {
    return {
      label: "المركز الثاني",
      badge: "وصيف المنصة",
      medal: "🥈",
      heightClass: "md:min-h-[290px]",
      cardClass:
        "border-slate-200/30 bg-gradient-to-b from-slate-200/16 via-slate-300/7 to-slate-950/80 shadow-slate-950/30",
      glowClass: "bg-slate-200/18",
      iconClass: "border-slate-200/30 bg-slate-200/12 text-slate-100",
      podiumClass:
        "border-slate-200/25 bg-gradient-to-b from-slate-200/18 to-slate-400/8 text-slate-100",
      pointsClass:
        "border-slate-200/25 bg-slate-200/10 text-slate-100",
    };
  }

  return {
    label: "المركز الثالث",
    badge: "ثالث الأبطال",
    medal: "🥉",
    heightClass: "md:min-h-[270px]",
    cardClass:
      "border-orange-300/35 bg-gradient-to-b from-orange-300/17 via-orange-400/8 to-slate-950/80 shadow-orange-950/25",
    glowClass: "bg-orange-300/18",
    iconClass: "border-orange-200/30 bg-orange-300/12 text-orange-100",
    podiumClass:
      "border-orange-300/25 bg-gradient-to-b from-orange-300/18 to-orange-500/8 text-orange-100",
    pointsClass:
      "border-orange-300/25 bg-orange-300/10 text-orange-100",
  };
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

  return (
    <motion.article
      variants={cardMotion}
      className={`group relative flex flex-col overflow-hidden rounded-[1.8rem] border p-3 text-center shadow-2xl transition duration-300 hover:-translate-y-1 md:p-4 ${meta.heightClass} ${meta.cardClass}`}
    >
      <div
        className={`pointer-events-none absolute -top-16 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full blur-3xl ${meta.glowClass}`}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

      <div className="relative flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/45 px-2.5 py-1 text-[10px] font-black text-white md:text-xs">
          <Medal className="h-3.5 w-3.5" />
          {meta.label}
        </span>

        <span className="text-2xl leading-none drop-shadow-lg md:text-3xl">
          {meta.medal}
        </span>
      </div>

      <div className="relative mx-auto mt-3">
        <div
          className={`absolute inset-0 scale-125 rounded-full blur-xl ${meta.glowClass}`}
        />
        <div
          className={`relative flex h-[74px] w-[74px] items-center justify-center rounded-full border shadow-xl md:h-[86px] md:w-[86px] ${meta.iconClass}`}
        >
          {place === 1 && (
            <Crown className="absolute -top-5 h-8 w-8 rotate-[-5deg] text-amber-200 drop-shadow-lg md:h-9 md:w-9" />
          )}

          <TeamFlag
            code={teamCode}
            emoji={champion.teamEmoji}
            name={champion.favoriteTeam}
            size="lg"
          />
        </div>
      </div>

      <div className="relative mt-3 min-h-[44px] break-words text-sm font-black leading-6 text-white md:text-base">
        {champion.fullName}
      </div>

      <div className="relative mt-1 truncate text-[10px] font-bold text-slate-300 md:text-xs">
        {champion.favoriteTeam || "بدون منتخب مفضل"}
      </div>

      <div
        className={`relative mt-3 rounded-2xl border px-3 py-2 ${meta.pointsClass}`}
      >
        <div className="text-[10px] font-bold opacity-75">المجموع النهائي</div>
        <div className="mt-0.5 text-xl font-black md:text-2xl">
          {champion.points}
          <span className="mr-1 text-xs md:text-sm">نقطة</span>
        </div>
      </div>

      <div className="relative mt-2 inline-flex items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] font-black text-slate-200 md:text-xs">
        {place === 1 ? (
          <>
            <Trophy className="h-3.5 w-3.5 text-amber-200" />
            <span>{meta.badge}</span>
          </>
        ) : (
          <>
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{meta.badge}</span>
          </>
        )}
      </div>

      {typeof pointsGap === "number" && pointsGap > 0 && (
        <div className="relative mt-2 text-[9px] font-bold text-slate-400 md:text-[10px]">
          فارق {pointsGap} نقطة عن المركز السابق
        </div>
      )}

      <div
        className={`relative mt-auto pt-4 ${place === 1 ? "md:pt-5" : "md:pt-4"}`}
      >
        <div
          className={`flex h-12 items-center justify-center rounded-t-2xl border border-b-0 text-2xl font-black shadow-inner md:h-16 md:text-3xl ${meta.podiumClass}`}
        >
          {place}
        </div>
      </div>
    </motion.article>
  );
}

function HiddenPodiumCard({ place }: { place: PodiumPlace }) {
  const meta = getPodiumMeta(place);

  return (
    <motion.article
      variants={cardMotion}
      className={`relative flex flex-col overflow-hidden rounded-[1.8rem] border p-3 text-center shadow-xl md:p-4 ${meta.heightClass} ${meta.cardClass}`}
    >
      <div
        className={`pointer-events-none absolute -top-14 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full blur-3xl ${meta.glowClass}`}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />

      <div className="relative flex items-start justify-between gap-2">
        <span className="rounded-full border border-white/10 bg-slate-950/45 px-2.5 py-1 text-[10px] font-black text-white md:text-xs">
          {meta.label}
        </span>
        <span className="text-2xl leading-none opacity-80 md:text-3xl">
          {meta.medal}
        </span>
      </div>

      <div className="relative mx-auto mt-5">
        <div
          className={`absolute inset-0 scale-150 rounded-full blur-2xl ${meta.glowClass}`}
        />
        <div
          className={`relative flex h-[74px] w-[74px] items-center justify-center rounded-full border backdrop-blur-md md:h-[86px] md:w-[86px] ${meta.iconClass}`}
        >
          {place === 1 ? (
            <Crown className="h-8 w-8 animate-pulse" />
          ) : (
            <Medal className="h-8 w-8 animate-pulse" />
          )}
        </div>
      </div>

      <div className="relative mt-4 text-base font-black text-white md:text-lg">
        قريبًا
      </div>

      <div className="relative mx-auto mt-2 h-2 w-24 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-white/35" />
      </div>

      <p className="relative mt-3 text-[10px] font-medium leading-5 text-slate-300 md:text-xs">
        تُكشف هوية صاحب المركز بعد احتساب النهائي
      </p>

      <div className="relative mt-auto pt-4">
        <div
          className={`flex h-12 items-center justify-center rounded-t-2xl border border-b-0 text-2xl font-black shadow-inner md:h-16 md:text-3xl ${meta.podiumClass}`}
        >
          {place}
        </div>
      </div>
    </motion.article>
  );
}

export default function HomeHighlights() {
  const [platformChampions, setPlatformChampions] = useState<
    PlatformChampion[]
  >([]);
  const [isFinalCalculated, setIsFinalCalculated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHighlights() {
      try {
        const data = await getHomeHighlights();

        setPlatformChampions(
          Array.isArray(data.platformChampions)
            ? (data.platformChampions as PlatformChampion[])
            : [],
        );
        setIsFinalCalculated(Boolean(data.isFinalCalculated));
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

  const championsAreReady =
    isFinalCalculated && Boolean(firstPlace && secondPlace && thirdPlace);

  return (
    <motion.section
      variants={sectionMotion}
      initial="hidden"
      animate="show"
      className="relative mt-4 overflow-hidden rounded-[2rem] border border-amber-300/20 bg-slate-950/75 p-3 shadow-2xl shadow-slate-950/40 md:mt-5 md:rounded-[2.4rem] md:p-5"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-300/10 via-violet-400/5 to-cyan-300/8" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />

      <div
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(251,191,36,0.20) 0%, rgba(251,191,36,0.07) 45%, transparent 72%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(34,211,238,0.16) 0%, rgba(34,211,238,0.05) 45%, transparent 72%)",
        }}
      />

      <div className="relative text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black text-amber-100 shadow-lg shadow-amber-950/20 md:text-xs">
          <Sparkles className="h-3.5 w-3.5" />
          <span>
            {championsAreReady ? "التتويج الرسمي" : "لحظة التتويج تقترب"}
          </span>
        </div>

        <div className="relative mx-auto mt-3 flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-amber-300/35 bg-gradient-to-br from-amber-300/25 to-amber-500/8 text-amber-100 shadow-xl shadow-amber-950/30 md:h-20 md:w-20">
          <div className="absolute inset-0 animate-pulse rounded-[1.4rem] bg-amber-300/10 blur-xl" />
          <Trophy className="relative h-8 w-8 md:h-10 md:w-10" />
          <Crown className="absolute -top-3 h-7 w-7 rotate-[-8deg] text-amber-200 md:h-8 md:w-8" />
        </div>

        <h2 className="mt-3 bg-gradient-to-l from-amber-200 via-white to-cyan-100 bg-clip-text text-lg font-black tracking-tight text-transparent md:text-3xl">
          أبطال منصة توقعات كأس العالم 2026
        </h2>

        <p className="mx-auto mt-2 max-w-2xl text-[10px] font-medium leading-5 text-slate-300 md:text-sm md:leading-7">
          {championsAreReady
            ? "مبروك لأصحاب المراكز الثلاثة الأولى بعد رحلة مليئة بالحماس والتحدي ودقة التوقعات."
            : "المنافسة في لحظاتها الأخيرة… تُكشف هوية الأبطال تلقائيًا بعد احتساب النهائي الكبير."}
        </p>
      </div>

      <div className="relative mt-5 rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-2.5 md:mt-7 md:p-4">
        <div className="pointer-events-none absolute inset-0 rounded-[1.7rem] bg-gradient-to-b from-white/5 to-transparent" />

        {loading ? (
          <div className="relative grid grid-cols-3 gap-2 md:items-end md:gap-4">
            <HiddenPodiumCard place={2} />
            <HiddenPodiumCard place={1} />
            <HiddenPodiumCard place={3} />
          </div>
        ) : championsAreReady ? (
          <div className="relative grid grid-cols-3 gap-2 md:items-end md:gap-4">
            <PodiumChampionCard
              champion={secondPlace}
              place={2}
              pointsGap={Math.max(0, firstPlace.points - secondPlace.points)}
            />

            <div className="md:-translate-y-5">
              <PodiumChampionCard champion={firstPlace} place={1} />
            </div>

            <PodiumChampionCard
              champion={thirdPlace}
              place={3}
              pointsGap={Math.max(0, secondPlace.points - thirdPlace.points)}
            />
          </div>
        ) : (
          <div className="relative grid grid-cols-3 gap-2 md:items-end md:gap-4">
            <HiddenPodiumCard place={2} />

            <div className="md:-translate-y-5">
              <HiddenPodiumCard place={1} />
            </div>

            <HiddenPodiumCard place={3} />
          </div>
        )}
      </div>

      <div className="relative mt-4 flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-3 text-center md:flex-row md:gap-3">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-amber-100 md:text-xs">
          <ShieldCheck className="h-4 w-4" />
          <span>الترتيب النهائي يعتمد نظام لوحة الصدارة المعتمد</span>
        </div>

        <span className="hidden h-4 w-px bg-white/15 md:block" />

        <div className="text-[9px] font-bold text-slate-400 md:text-[11px]">
          {championsAreReady
            ? "تم اعتماد المراكز بعد احتساب النهائي"
            : "الأسماء مخفية حتى لحظة الحسم"}
        </div>
      </div>
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
