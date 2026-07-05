"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  AlertCircle,
  Clock3,
  Flag,
  Loader2,
  Medal,
  MousePointer2,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  calculateFlagMemoryScore,
  DEFAULT_FLAG_MEMORY_SETTINGS,
  getFlagMemoryDailyLeaderboard,
  getFlagMemorySettings,
  getTodayFlagMemoryResult,
  saveFlagMemoryResult,
  type FlagMemoryResult,
  type FlagMemorySettings,
} from "@/lib/flagMemory";
import { getFlagMemoryTeams, type FlagMemoryTeam } from "@/lib/flagMemoryTeams";

type MemoryCard = {
  cardId: string;
  pairId: string;
  team: FlagMemoryTeam;
  matched: boolean;
};

type GameStatus = "ready" | "playing" | "finished" | "saved";

const scrollOnceViewport = {
  once: true,
  amount: 0.18,
} as const;

const sectionMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
    scale: 0.99,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.32,
      ease: "easeOut",
    },
  },
};

const itemMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
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
};

const cardGridMotion: Variants = {
  hidden: {
    opacity: 0,
  },
  show: {
    opacity: 1,
    transition: {
      duration: 0.18,
      ease: "easeOut",
      staggerChildren: 0.012,
    },
  },
};

const memoryCardMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
    scale: 0.98,
    rotateY: -6,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateY: 0,
    transition: {
      duration: 0.22,
      ease: "easeOut",
    },
  },
};

const leaderboardRowMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
    scale: 0.99,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.24,
      ease: "easeOut",
    },
  },
};

function getRandomValue() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] / 4294967296;
  }

  return Math.random();
}

function shuffleRandom<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(getRandomValue() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function createCardId(teamId: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${teamId}-${crypto.randomUUID()}`;
  }

  return `${teamId}-${Date.now()}-${Math.random()}`;
}

function buildCards(pairsCount: number) {
  const safePairsCount = Math.max(4, Math.min(18, Math.floor(pairsCount)));
  const teams = shuffleRandom(getFlagMemoryTeams()).slice(0, safePairsCount);

  const cards = teams.flatMap((team) => [
    {
      cardId: createCardId(team.id),
      pairId: team.id,
      team,
      matched: false,
    },
    {
      cardId: createCardId(team.id),
      pairId: team.id,
      team,
      matched: false,
    },
  ]);

  return shuffleRandom(cards);
}

function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;
}

function getSecondsUntilNextMakkahMidnight() {
  const now = new Date();

  const makkahParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = Number(makkahParts.find((part) => part.type === "year")?.value);
  const month = Number(makkahParts.find((part) => part.type === "month")?.value);
  const day = Number(makkahParts.find((part) => part.type === "day")?.value);

  const nextMakkahMidnightUtcMs = Date.UTC(year, month - 1, day, 21, 0, 0);

  const diffMs = nextMakkahMidnightUtcMs - now.getTime();

  if (diffMs > 0) {
    return Math.floor(diffMs / 1000);
  }

  const fallbackNextMidnightUtcMs = Date.UTC(year, month - 1, day + 1, 21, 0, 0);
  return Math.max(
    0,
    Math.floor((fallbackNextMidnightUtcMs - now.getTime()) / 1000)
  );
}

function getRankLabel(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
}

function getRankClass(rank: number) {
  if (rank === 1) {
    return "border-amber-300/45 bg-gradient-to-br from-amber-300 to-yellow-500 text-slate-950 shadow-amber-400/25";
  }

  if (rank === 2) {
    return "border-slate-100/40 bg-gradient-to-br from-slate-100 to-slate-400 text-slate-950 shadow-slate-300/20";
  }

  if (rank === 3) {
    return "border-orange-300/40 bg-gradient-to-br from-orange-300 to-orange-600 text-slate-950 shadow-orange-400/20";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-200 shadow-slate-950/20";
}

function getUserId(user: unknown) {
  const data = user as Record<string, unknown> | null | undefined;
  return String(data?.id || data?.uid || "");
}

function getUserName(user: unknown) {
  const data = user as Record<string, unknown> | null | undefined;
  return String(data?.fullName || data?.name || data?.displayName || "عضو");
}

function StatusBox({
  enabled,
  todayResult,
  oneAttemptPerDay,
  saving,
  status,
}: {
  enabled: boolean;
  todayResult: FlagMemoryResult | null;
  oneAttemptPerDay: boolean;
  saving: boolean;
  status: GameStatus;
}) {
  const text = !enabled
    ? "تحدي الأعلام متوقف مؤقتًا"
    : todayResult && oneAttemptPerDay
      ? "نتيجتك اليومية محفوظة"
      : saving
        ? "جاري اعتماد النتيجة..."
        : status === "playing"
          ? "التحدي بدأ"
          : "ابدأ التحدي";

  const icon = !enabled ? (
    <XCircle className="h-4 w-4" />
  ) : todayResult && oneAttemptPerDay ? (
    <ShieldCheck className="h-4 w-4" />
  ) : saving ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : status === "playing" ? (
    <MousePointer2 className="h-4 w-4" />
  ) : (
    <Play className="h-4 w-4" />
  );

  return (
    <motion.div
      variants={itemMotion}
      className={`mb-4 rounded-2xl border px-4 py-3 text-center text-[14px] font-black shadow-lg md:text-base ${
        enabled
          ? "border-amber-400/30 bg-amber-400/10 text-amber-100 shadow-amber-950/10"
          : "border-red-400/30 bg-red-500/10 text-red-100 shadow-red-950/10"
      }`}
    >
      <span className="inline-flex items-center justify-center gap-2">
        {icon}
        <span>{text}</span>
      </span>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  icon,
  valueClassName = "text-white",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <motion.div
      variants={itemMotion}
      whileTap={{ scale: 0.98 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 p-2 text-center shadow-md shadow-slate-950/20 md:p-3"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />

      <div className="relative">
        <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 md:h-8 md:w-8">
          {icon}
        </div>

        <div className="text-[10px] font-bold text-slate-400 md:text-xs">
          {label}
        </div>

        <motion.div
          key={String(value)}
          initial={{ opacity: 0, y: 6, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className={`mt-1 text-[16px] font-black tabular-nums md:text-xl ${valueClassName}`}
        >
          {value}
        </motion.div>
      </div>
    </motion.div>
  );
}

function LeaderboardStat({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className: string;
}) {
  return (
    <div className={`rounded-xl border p-1.5 text-center ${className}`}>
      <div className="text-[9px] font-bold opacity-80">{label}</div>
      <div className="mt-0.5 text-[12px] font-black tabular-nums">{value}</div>
    </div>
  );
}

export default function FlagMemoryGame() {
  const { user, loading, isLoggedIn } = useAuth();

  const userId = getUserId(user);
  const userName = getUserName(user);

  const initialCards = useMemo(
    () => buildCards(DEFAULT_FLAG_MEMORY_SETTINGS.pairsCount),
    []
  );

  const [settings, setSettings] = useState<FlagMemorySettings>(
    DEFAULT_FLAG_MEMORY_SETTINGS
  );
  const [cards, setCards] = useState<MemoryCard[]>(initialCards);
  const [selectedCards, setSelectedCards] = useState<MemoryCard[]>([]);
  const [status, setStatus] = useState<GameStatus>("ready");
  const [moves, setMoves] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [nextChallengeSeconds, setNextChallengeSeconds] = useState(
    getSecondsUntilNextMakkahMidnight()
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [todayResult, setTodayResult] = useState<FlagMemoryResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<FlagMemoryResult[]>([]);
  const [checkingResult, setCheckingResult] = useState(true);
  const [hasStartedInThisSession, setHasStartedInThisSession] = useState(false);

  const lockRef = useRef(false);
  const autoSaveRef = useRef(false);

  const pairsCount = settings.pairsCount;
  const totalCards = pairsCount * 2;
  const matchedCount = cards.filter((card) => card.matched).length / 2;

  const currentScore = calculateFlagMemoryScore({
    timeSeconds: Math.max(1, seconds),
    moves,
    mistakes,
    matchesCount: pairsCount,
  });

  async function loadGameData() {
    try {
      setCheckingResult(true);

      const [settingsData, result, leaders] = await Promise.all([
        getFlagMemorySettings(),
        userId ? getTodayFlagMemoryResult(userId) : Promise.resolve(null),
        getFlagMemoryDailyLeaderboard(20),
      ]);

      setSettings(settingsData);
      setTodayResult(result);
      setLeaderboard(leaders);

      if (status === "ready") {
        setCards(buildCards(settingsData.pairsCount));
      }
    } catch (error) {
      console.error("Load flag memory data error:", error);
      setMessage("تعذر تحميل بيانات تحدي الأعلام.");
    } finally {
      setCheckingResult(false);
    }
  }

  useEffect(() => {
    if (loading) return;
    loadGameData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const remainingSeconds = getSecondsUntilNextMakkahMidnight();
      setNextChallengeSeconds(remainingSeconds);

      if (remainingSeconds <= 1) {
        setStatus("ready");
        setMoves(0);
        setMistakes(0);
        setSeconds(0);
        setSelectedCards([]);
        setHasStartedInThisSession(false);
        loadGameData();
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userId]);

  useEffect(() => {
    if (status !== "playing") return;

    const intervalId = window.setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [status]);

  useEffect(() => {
    const completed =
      cards.length > 0 && cards.every((card) => card.matched === true);

    if (!completed || status !== "playing") return;
    if (autoSaveRef.current) return;

    autoSaveRef.current = true;
    setStatus("finished");
    setMessage(
      "أحسنت! أنهيت تحدي الأعلام بنجاح. جاري اعتماد نتيجتك تلقائيًا..."
    );

    async function autoSaveResult() {
      if (!userId) {
        setMessage("تعذر اعتماد النتيجة لأن بيانات العضو غير مكتملة.");
        return;
      }

      try {
        setSaving(true);

        await saveFlagMemoryResult({
          userId,
          userName,
          timeSeconds: seconds,
          moves,
          mistakes,
          matchesCount: pairsCount,
        });

        setStatus("saved");
        setMessage("تم اعتماد نتيجتك الرسمية تلقائيًا في تحدي الأعلام.");
        await loadGameData();
      } catch (error) {
        console.error("Auto save flag memory result error:", error);
        setMessage(
          error instanceof Error
            ? error.message
            : "تعذر اعتماد نتيجة تحدي الأعلام تلقائيًا."
        );
      } finally {
        setSaving(false);
      }
    }

    autoSaveResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, status, userId, userName, seconds, moves, mistakes, pairsCount]);

  function startGame() {
    if (!settings.enabled) {
      setMessage("تحدي الأعلام متوقف مؤقتًا من إدارة المنصة.");
      return;
    }

    if (!isLoggedIn || !userId) {
      setMessage("سجّل دخولك أولًا عشان تدخل التحدي وتحفظ نتيجتك.");
      return;
    }

    if (settings.oneAttemptPerDay && todayResult) {
      setMessage(
        "عندك نتيجة مسجلة اليوم. تبدأ محاولة جديدة بعد الساعة 12:00 منتصف الليل بتوقيت مكة."
      );
      return;
    }

    if (settings.oneAttemptPerDay && hasStartedInThisSession) {
      setMessage(
        "بدأت التحدي في هذه الجلسة. أكمل المحاولة الحالية لتجنب إعادة الترتيب."
      );
      return;
    }

    setCards(buildCards(settings.pairsCount));
    setSelectedCards([]);
    setStatus("playing");
    setMoves(0);
    setMistakes(0);
    setSeconds(0);
    setMessage("");
    setHasStartedInThisSession(true);
    lockRef.current = false;
    autoSaveRef.current = false;
  }

  function handleCardClick(card: MemoryCard) {
    if (status !== "playing") return;
    if (lockRef.current) return;
    if (card.matched) return;
    if (selectedCards.some((selected) => selected.cardId === card.cardId)) {
      return;
    }
    if (selectedCards.length >= 2) return;

    const nextSelected = [...selectedCards, card];
    setSelectedCards(nextSelected);

    if (nextSelected.length !== 2) return;

    setMoves((value) => value + 1);

    const [firstCard, secondCard] = nextSelected;
    const isMatch = firstCard.pairId === secondCard.pairId;

    if (isMatch) {
      setCards((items) =>
        items.map((item) =>
          item.pairId === firstCard.pairId ? { ...item, matched: true } : item
        )
      );
      setSelectedCards([]);
      return;
    }

    setMistakes((value) => value + 1);
    lockRef.current = true;

    window.setTimeout(() => {
      setSelectedCards([]);
      lockRef.current = false;
    }, 900);
  }

  async function handleSaveResult() {
    if (!userId) {
      setMessage("سجّل دخولك أولًا عشان نحفظ نتيجتك.");
      return;
    }

    if (status !== "finished") return;

    try {
      setSaving(true);
      setMessage("");

      await saveFlagMemoryResult({
        userId,
        userName,
        timeSeconds: seconds,
        moves,
        mistakes,
        matchesCount: pairsCount,
      });

      setStatus("saved");
      setMessage("تم حفظ نتيجتك الرسمية في تحدي الأعلام.");
      await loadGameData();
    } catch (error) {
      console.error("Save flag memory result error:", error);
      setMessage(
        error instanceof Error ? error.message : "تعذر حفظ نتيجة تحدي الأعلام."
      );
    } finally {
      setSaving(false);
    }
  }

  function isCardVisible(card: MemoryCard) {
    return (
      card.matched ||
      selectedCards.some((selected) => selected.cardId === card.cardId)
    );
  }

  const startButtonDisabled =
    saving ||
    status === "playing" ||
    !settings.enabled ||
    (settings.oneAttemptPerDay && Boolean(todayResult)) ||
    (settings.oneAttemptPerDay && hasStartedInThisSession);

  if (loading || checkingResult) {
    return (
      <motion.section
        dir="rtl"
        variants={sectionMotion}
        initial="hidden"
        animate="show"
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.09] p-6 text-center text-[14px] text-slate-200 shadow-md shadow-slate-950/20 backdrop-blur-sm"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-amber-300/10" />

        <div className="relative inline-flex items-center justify-center gap-2 font-black">
          <Loader2 className="h-5 w-5 animate-spin text-amber-300" />
          <span>جاري تحميل تحدي الأعلام...</span>
        </div>
      </motion.section>
    );
  }

  return (
    <section dir="rtl" className="space-y-5">
      <motion.div
        variants={sectionMotion}
        initial="hidden"
        whileInView="show"
        viewport={scrollOnceViewport}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.09] p-4 shadow-md shadow-slate-950/20 backdrop-blur-sm md:p-5"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-amber-300/10" />
        <div className="pointer-events-none absolute -right-24 top-20 h-40 w-40 rounded-full bg-amber-300/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-24 bottom-20 h-40 w-40 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

        <div className="relative">
          <StatusBox
            enabled={settings.enabled}
            todayResult={todayResult}
            oneAttemptPerDay={settings.oneAttemptPerDay}
            saving={saving}
            status={status}
          />

          <motion.div
            variants={itemMotion}
            className="mb-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-center shadow-md shadow-cyan-950/10"
          >
            <div className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-cyan-100/80">
              <Clock3 className="h-4 w-4" />
              <span>تحدي جديد بعد</span>
            </div>

            <div
              className="mt-1 text-[24px] font-black text-cyan-100 tabular-nums"
              dir="ltr"
            >
              {formatCountdown(nextChallengeSeconds)}
            </div>
          </motion.div>

          <motion.div
            variants={itemMotion}
            className="mb-5 rounded-2xl border border-white/10 bg-slate-950/55 p-3 text-center shadow-md shadow-slate-950/15"
          >
            <div className="mb-2 inline-flex items-center justify-center gap-2 text-[14px] font-black text-white">
              <Target className="h-4 w-4 text-amber-300" />
              <span>شرح النقاط</span>
            </div>

            <div className="space-y-1 text-[11px] font-bold leading-5 text-slate-300 md:text-xs">
              <p>
                كل زوج أعلام ={" "}
                <span className="text-amber-300">20 نقطة</span>، ومكافأة
                السرعة تصل إلى <span className="text-emerald-300">+50</span>.
              </p>

              <p>
                الخصم: الخطأ <span className="text-red-300">-3</span>، كل 30
                ثانية <span className="text-red-300">-1</span>، والمحاولة
                الزائدة <span className="text-red-300">-2</span>.
              </p>
            </div>
          </motion.div>

          <motion.div
            variants={itemMotion}
            className="mb-5 grid grid-cols-4 gap-2 md:gap-3"
          >
            <StatCard
              label="الوقت"
              value={formatTime(seconds)}
              icon={<Clock3 className="h-4 w-4 text-cyan-300" />}
              valueClassName="text-cyan-100"
            />

            <StatCard
              label="المحاولات"
              value={moves}
              icon={<MousePointer2 className="h-4 w-4 text-amber-300" />}
              valueClassName="text-amber-200"
            />

            <StatCard
              label="الأخطاء"
              value={mistakes}
              icon={<AlertCircle className="h-4 w-4 text-red-300" />}
              valueClassName="text-red-200"
            />

            <StatCard
              label="النقاط"
              value={currentScore}
              icon={<Trophy className="h-4 w-4 text-emerald-300" />}
              valueClassName="text-emerald-200"
            />
          </motion.div>

          <AnimatePresence mode="popLayout">
            {todayResult && (
              <motion.div
                variants={itemMotion}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, y: -10, scale: 0.97 }}
                className="mb-5 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-[14px] font-bold leading-7 text-emerald-100 shadow-md shadow-emerald-950/10"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    نتيجتك اليوم: {todayResult.score} نقطة — الوقت{" "}
                    {formatTime(todayResult.timeSeconds)} — المحاولات{" "}
                    {todayResult.moves} — الأخطاء {todayResult.mistakes}.
                  </span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="popLayout">
            {message && (
              <motion.div
                key={message}
                variants={itemMotion}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, y: -10, scale: 0.97 }}
                className="mb-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-[14px] font-bold leading-6 text-cyan-100 shadow-md shadow-cyan-950/10"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-200" />
                  <span>{message}</span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            variants={itemMotion}
            className="mb-5 flex flex-col gap-2 md:flex-row"
          >
            <motion.button
              type="button"
              onClick={startGame}
              disabled={startButtonDisabled}
              whileTap={startButtonDisabled ? undefined : { scale: 0.96, y: 2 }}
              className="group relative inline-flex min-h-[48px] items-center justify-center gap-2 overflow-hidden rounded-2xl bg-amber-400 px-5 py-3 text-[14px] font-black text-slate-950 shadow-md shadow-amber-500/15 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="pointer-events-none absolute inset-0 translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition duration-700 group-hover:translate-x-[-120%]" />

              {!settings.enabled ? (
                <XCircle className="relative h-4 w-4" />
              ) : status === "playing" ? (
                <MousePointer2 className="relative h-4 w-4" />
              ) : (
                <Play className="relative h-4 w-4" />
              )}

              <span className="relative">
                {!settings.enabled
                  ? "التحدي متوقف"
                  : status === "playing"
                    ? "التحدي بدأ"
                    : "ابدأ التحدي"}
              </span>
            </motion.button>
          </motion.div>

          <motion.div
            variants={itemMotion}
            className="mb-4 rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-center text-[14px] font-black text-slate-200 shadow-md shadow-slate-950/15"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Flag className="h-4 w-4 text-amber-300" />
              <span>
                المتطابق: {matchedCount} / {pairsCount} — عدد البطاقات:{" "}
                {totalCards}
              </span>
            </span>
          </motion.div>

          <motion.div
            variants={cardGridMotion}
            initial="hidden"
            animate="show"
            key={`${status}-${cards.length}`}
            className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:gap-2"
          >
            {cards.map((card, index) => {
              const visible = isCardVisible(card);

              return (
                <motion.button
                  key={card.cardId}
                  variants={memoryCardMotion}
                  type="button"
                  onClick={() => handleCardClick(card)}
                  disabled={status !== "playing" || visible}
                  whileTap={
                    status === "playing" && !visible
                      ? { scale: 0.96 }
                      : undefined
                  }
                  animate={{
                    rotateY: visible ? 180 : 0,
                    scale: 1,
                  }}
                  transition={{
                    rotateY: {
                      duration: 0.26,
                      ease: "easeOut",
                    },
                    scale: {
                      duration: 0.18,
                      ease: "easeOut",
                    },
                  }}
                  className={`relative aspect-[5/4] overflow-hidden rounded-xl border p-1 shadow-lg transition [transform-style:preserve-3d] md:rounded-2xl ${
                    visible
                      ? "border-emerald-400/40 bg-white text-slate-950 shadow-emerald-500/15"
                      : "border-white/10 bg-slate-950/70 text-white shadow-slate-950/25 hover:bg-slate-900"
                  } disabled:cursor-default`}
                  aria-label={
                    visible ? card.team.nameAr : `بطاقة رقم ${index + 1}`
                  }
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-transparent" />

                  {card.matched && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-1 rounded-xl border border-emerald-300/45 md:rounded-2xl"
                    />
                  )}

                  <div
                    className="relative h-full w-full"
                    style={{ transform: visible ? "rotateY(180deg)" : "none" }}
                  >
                    {visible ? (
                      <div className="flex h-full flex-col items-center justify-center gap-0.5">
                        <img
                          src={card.team.flag}
                          alt={card.team.nameAr}
                          className="h-8 w-12 rounded object-cover shadow md:h-9 md:w-14"
                        />

                        <span className="max-w-full truncate text-[8px] font-black leading-none md:text-[10px]">
                          {card.team.nameAr}
                        </span>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-0.5">
                        <span className="text-lg leading-none md:text-2xl">
                          ?
                        </span>

                        <span className="text-[9px] font-black leading-none text-slate-300 md:text-[10px]">
                          {index + 1}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        variants={sectionMotion}
        initial="hidden"
        whileInView="show"
        viewport={scrollOnceViewport}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.09] p-4 shadow-md shadow-slate-950/20 backdrop-blur-sm md:p-5"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-amber-300/10" />
        <div className="pointer-events-none absolute -right-20 top-8 h-40 w-40 rounded-full bg-amber-300/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-20 bottom-8 h-40 w-40 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

        <div className="relative mb-4 text-center">
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-100 shadow-md shadow-amber-950/10">
            <Trophy className="h-5 w-5" />
          </div>

          <h2 className="text-[20px] font-black md:text-2xl">
            ترتيب تحدي الأعلام اليومي
          </h2>

          <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
            الأعلى نقاطًا، ثم الأسرع وقتًا، ثم الأقل محاولات.
          </p>
        </div>

        {leaderboard.length === 0 ? (
          <motion.div
            variants={itemMotion}
            className="relative rounded-2xl border border-dashed border-white/10 bg-slate-950/50 p-5 text-center text-[14px] font-bold text-slate-300 shadow-inner"
          >
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <Medal className="h-5 w-5 text-slate-300" />
            </div>
            لا توجد نتائج اليوم حتى الآن.
          </motion.div>
        ) : (
          <motion.div variants={sectionMotion} className="relative space-y-2">
            {leaderboard.map((result, index) => {
              const rank = index + 1;

              return (
                <motion.article
                  key={result.id}
                  variants={leaderboardRowMotion}
                  whileTap={{ scale: 0.985 }}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55 p-2.5 shadow-md shadow-slate-950/20"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent" />

                  <div className="relative mb-2 flex items-center gap-2">
                    <div
                      className={`flex h-8 min-w-8 items-center justify-center rounded-xl border text-[14px] font-black shadow-md ${getRankClass(
                        rank
                      )}`}
                    >
                      {getRankLabel(rank)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold text-slate-400">
                        العضو
                      </div>

                      <div className="mt-0.5 whitespace-normal break-words text-right text-[14px] font-black leading-5 text-white">
                        {result.userName}
                      </div>
                    </div>
                  </div>

                  <div className="relative grid grid-cols-4 gap-1.5">
                    <LeaderboardStat
                      label="النقاط"
                      value={result.score}
                      className="border-amber-400/15 bg-amber-400/10 text-amber-300"
                    />

                    <LeaderboardStat
                      label="الوقت"
                      value={formatTime(result.timeSeconds)}
                      className="border-white/10 bg-white/5 text-white"
                    />

                    <LeaderboardStat
                      label="المحاولات"
                      value={result.moves}
                      className="border-white/10 bg-white/5 text-white"
                    />

                    <LeaderboardStat
                      label="الأخطاء"
                      value={result.mistakes}
                      className="border-white/10 bg-white/5 text-white"
                    />
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}