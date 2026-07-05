"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  BadgeCheck,
  Clock3,
  Flame,
  Gauge,
  PauseCircle,
  Rocket,
  Sparkles,
  Star,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import {
  ExactHit,
  getHomeHighlights,
  HomeHighlightUser,
} from "@/lib/highlights";
import { getSiteSettings, TickerSpeed } from "@/lib/siteSettings";
import TeamFlag from "@/components/TeamFlag";

type ExactHitWithPredictionType = ExactHit & {
  predictionType?: "normal" | "golden";
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

const scrollOnceViewport = {
  once: true,
  amount: 0.16,
} as const;

const sectionMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 18,
    scale: 0.98,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.38,
      ease: "easeOut",
      staggerChildren: 0.06,
    },
  },
};

const cardMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
    scale: 0.96,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
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
    y: 42,
    scale: 0.98,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.28,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: 28,
    scale: 0.98,
    transition: {
      duration: 0.18,
      ease: "easeIn",
    },
  },
};

function EmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileTap={{ scale: 0.98 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.08] p-2 text-center shadow-md shadow-slate-950/20 backdrop-blur-sm md:p-3"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-cyan-300/5" />

      <div className="relative text-[11px] font-black leading-5 text-slate-200 md:text-sm">
        {title}
      </div>

      <p className="relative mt-1 text-[9px] leading-4 text-slate-300 md:text-xs">
        {text}
      </p>
    </motion.div>
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
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileTap={{ scale: 0.98 }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.08] p-2 text-center shadow-md shadow-slate-950/20 backdrop-blur-sm transition duration-200 hover:bg-white/[0.11] md:p-3"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-cyan-300/5" />
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      <h2 className="relative flex items-center justify-center gap-1.5 text-[11px] font-black leading-5 text-white md:text-sm">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-amber-200 transition group-hover:scale-105 md:h-7 md:w-7">
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
    </motion.div>
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
  hit: ExactHitWithPredictionType
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

export default function HomeHighlights() {
  const [predictionKing, setPredictionKing] =
    useState<HomeHighlightUser | null>(null);

  const [bestStreakUser, setBestStreakUser] =
    useState<HomeHighlightUser | null>(null);

  const [firstArriverUser, setFirstArriverUser] =
    useState<HomeHighlightUser | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHighlights() {
      try {
        const data = await getHomeHighlights();

        setPredictionKing(data.predictionKing);
        setBestStreakUser(data.bestStreakUser);
        setFirstArriverUser(data.firstArriverUser);
      } catch (error) {
        console.error("فشل تحميل مميزات الصفحة الرئيسية:", error);
      } finally {
        setLoading(false);
      }
    }

    loadHighlights();

    const interval = setInterval(loadHighlights, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <motion.section
        variants={sectionMotion}
        initial="hidden"
        whileInView="show"
        viewport={scrollOnceViewport}
        className="relative mt-4 overflow-hidden rounded-[1.65rem] border border-white/10 bg-white/[0.08] p-3 shadow-md shadow-slate-950/25 backdrop-blur-sm md:mt-5 md:rounded-[2rem] md:p-4"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-cyan-400/5" />

        <div className="relative mb-3 text-center">
          <h2 className="inline-flex items-center justify-center gap-2 text-base font-black md:text-xl">
            <Trophy className="h-5 w-5 text-amber-200" />
            <span>أبطال التحدي الآن</span>
          </h2>

          <p className="mt-1 text-[10px] font-medium text-slate-300 md:text-xs">
            أسماء تتغير تلقائيًا حسب التوقعات والنتائج
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-2 md:gap-4">
          <EmptyCard title="ملك التوقعات" text="جاري التحميل..." />
          <EmptyCard title="أفضل سلسلة" text="جاري التحميل..." />
          <EmptyCard title="أول الواصلين" text="جاري التحميل..." />
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      variants={sectionMotion}
      initial="hidden"
      whileInView="show"
      viewport={scrollOnceViewport}
      className="relative mt-4 overflow-hidden rounded-[1.65rem] border border-white/10 bg-white/[0.08] p-3 shadow-md shadow-slate-950/25 backdrop-blur-sm md:mt-5 md:rounded-[2rem] md:p-4"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-cyan-400/5" />
      <div className="pointer-events-none absolute -right-20 top-0 h-40 w-40 rounded-full bg-amber-300/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-cyan-300/10 blur-2xl" />

      <div className="relative mb-3 text-center">
        <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-100 shadow-md shadow-amber-950/20">
          <Trophy className="h-5 w-5" />
        </div>

        <h2 className="text-base font-black tracking-tight md:text-xl">
          أبطال التحدي الآن
        </h2>

        <p className="mt-1 text-[10px] font-medium text-slate-300 md:text-xs">
          أسماء تتغير تلقائيًا حسب التوقعات والنتائج
        </p>
      </div>

      <div className="relative grid grid-cols-3 gap-2 md:gap-4">
        <HighlightCard
          title="ملك التوقعات"
          icon={<Trophy className="h-3.5 w-3.5 md:h-4 md:w-4" />}
          user={predictionKing}
          valueText={`${predictionKing?.points || 0} نقاط`}
          accentClass="bg-amber-400 text-slate-950 shadow-amber-950/20"
          emptyText="يظهر بعد تسجيل أول نقاط"
        />

        <HighlightCard
          title="أفضل سلسلة"
          icon={<Flame className="h-3.5 w-3.5 md:h-4 md:w-4" />}
          user={bestStreakUser}
          valueText={`السلسلة: ${bestStreakUser?.bestStreak || 0}`}
          accentClass="bg-emerald-400 text-slate-950 shadow-emerald-950/20"
          emptyText="تظهر بعد وجود سلسلة صحيحة"
        />

        <HighlightCard
          title="أول الواصلين"
          icon={<Zap className="h-3.5 w-3.5 md:h-4 md:w-4" />}
          user={firstArriverUser}
          valueText="توقع قبل الجميع"
          accentClass="bg-violet-400 text-slate-950 shadow-violet-950/20"
          emptyText="تظهر بعد أول توقع"
        />
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

    const exactHitsInterval = setInterval(loadExactHits, 30000);
    const settingsInterval = setInterval(loadTickerSettings, 15000);

    return () => {
      clearInterval(exactHitsInterval);
      clearInterval(settingsInterval);
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
    Math.round((groupWidth || 1200) / pixelsPerSecond)
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

    return (
      <div
        key={`${hit.id}-${index}`}
        dir="rtl"
        className={`group relative inline-flex min-h-[46px] flex-none items-center gap-2 overflow-hidden whitespace-nowrap rounded-2xl border px-3 py-2 text-xs text-white shadow-md shadow-slate-950/25 backdrop-blur-xl md:px-4 md:text-sm ${
          golden
            ? "border-amber-300/40 bg-amber-400/15"
            : "border-emerald-300/20 bg-slate-950/70"
        }`}
      >
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-l ${
            golden
              ? "from-amber-300/15 via-transparent to-transparent"
              : "from-emerald-300/10 via-transparent to-transparent"
          }`}
        />

        {golden && (
          <span className="relative inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950 shadow-md shadow-amber-950/20 md:text-xs">
            <Star className="h-3 w-3 fill-slate-950" />
            <span>ذهبي بالملي +6</span>
          </span>
        )}

        <span
          className={
            golden
              ? "relative font-black text-amber-300"
              : "relative font-black text-emerald-300"
          }
        >
          {hit.userName}
        </span>

        <span className="relative text-slate-300">
          {golden ? "جاب التوقع الذهبي بالملي" : "جابها صح بالملي"}
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
              <span>• {getQualificationMethodLabel(exactHit.qualificationMethod)}</span>
            )}
          </span>
        )}
      </div>
    );
  }

  function renderExactHitListItem(hit: ExactHit) {
    const exactHit = hit as ExactHitWithPredictionType;
    const golden = isGoldenExactHit(exactHit);
    const qualifiedTeam = getQualifiedTeamInfo(exactHit);

    return (
      <motion.div
        key={hit.id}
        variants={cardMotion}
        className={`relative overflow-hidden rounded-3xl border p-3 shadow-xl shadow-slate-950/25 ${
          golden
            ? "border-amber-300/40 bg-amber-400/10"
            : "border-white/10 bg-slate-950/60"
        }`}
      >
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${
            golden
              ? "from-amber-300/10 via-transparent to-transparent"
              : "from-emerald-300/10 via-transparent to-transparent"
          }`}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div
              className={`text-sm font-black ${
                golden ? "text-amber-200" : "text-emerald-200"
              }`}
            >
              {hit.userName}
            </div>

            <div className="mt-1 text-[11px] font-medium leading-5 text-slate-300">
              {golden ? "جاب التوقع الذهبي بالملي" : "جابها صح بالملي"}
            </div>
          </div>

          <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-200">
            <Clock3 className="h-3 w-3" />
            <span>{formatRelativeHitTime(exactHit)}</span>
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
          <div className="relative mt-2 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-black text-slate-950">
            <Star className="h-3 w-3 fill-slate-950" />
            <span>ذهبي بالملي +6</span>
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
              className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/85 p-3 backdrop-blur-sm md:items-center md:p-4"
              onClick={() => setIsListOpen(false)}
            >
              <motion.div
                variants={modalMotion}
                dir="rtl"
                className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-t-[2rem] border border-emerald-400/30 bg-slate-950 shadow-xl shadow-slate-950/45 md:max-h-[84vh] md:rounded-[2rem]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="relative border-b border-white/10 bg-emerald-400/10 px-4 py-3">
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
                  className="max-h-[62vh] space-y-3 overflow-y-auto p-4 md:max-h-[58vh]"
                >
                  {sortedExactHits.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm font-bold text-slate-300">
                      لا توجد توقعات صحيحة خلال آخر 24 ساعة.
                    </div>
                  ) : (
                    sortedExactHits.map((hit) => renderExactHitListItem(hit))
                  )}
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
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

  if (exactHits.length === 0) {
    return (
      <>
        <section className="relative mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 shadow-xl shadow-slate-950/25 md:mt-6">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
            <Target className="h-4 w-4 text-emerald-300" />
            <span>لم يسجل أحد نتيجة بالملي خلال آخر 24 ساعة.</span>
          </div>
        </section>
        {exactHitsModal}
      </>
    );
  }

  return (
    <>
      <section className="relative mt-5 overflow-hidden rounded-[1.65rem] border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 shadow-md shadow-slate-950/25 backdrop-blur-sm md:mt-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-300/10 via-transparent to-cyan-300/5" />
        <div className="pointer-events-none absolute -right-20 top-0 h-40 w-40 rounded-full bg-emerald-300/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-cyan-300/10 blur-2xl" />

        <motion.div
          variants={sectionMotion}
          initial="hidden"
          animate="show"
          className="relative"
        >
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
            className="exact-hits-window relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/65 py-3 shadow-inner"
            onMouseEnter={pauseTicker}
            onMouseLeave={resumeTicker}
            onTouchStart={pauseTicker}
            onTouchEnd={resumeTicker}
            onTouchCancel={resumeTicker}
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
                {repeatedHits.map((hit, index) =>
                  renderExactHitCard(hit, index)
                )}
              </div>

              <div className="flex flex-none gap-3">
                {repeatedHits.map((hit, index) =>
                  renderExactHitCard(hit, index + repeatedHits.length)
                )}
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-bold text-emerald-100/70">
            <PauseCircle className="h-3.5 w-3.5" />
            <span>يتوقف الشريط عند اللمس</span>
          </div>
        </motion.div>

        <style jsx>{`
          .exact-hits-track {
            animation-name: exactHitsMove;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            will-change: transform;
          }

          .exact-hits-window:hover .exact-hits-track,
          .exact-hits-window:active .exact-hits-track,
          .exact-hits-window:focus-within .exact-hits-track {
            animation-play-state: paused;
          }

          @keyframes exactHitsMove {
            0% {
              transform: translateX(-50%);
            }

            100% {
              transform: translateX(0%);
            }
          }
        `}</style>
      </section>

      {exactHitsModal}
    </>
  );
}