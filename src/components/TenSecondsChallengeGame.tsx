"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Gauge,
  Loader2,
  Medal,
  MousePointer2,
  Play,
  ShieldCheck,
  Sparkles,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  DEFAULT_TEN_SECONDS_SETTINGS,
  formatTenSecondsTime,
  getMakkahDateKey,
  getTenSecondsSettings,
  getTodayTenSecondsResult,
  saveTenSecondsAttempt,
  sortTenSecondsResults,
  type TenSecondsAttempt,
  type TenSecondsDailyResult,
  type TenSecondsSettings,
} from "@/lib/tenSecondsChallenge";

const scrollOnceViewport = { once: true, amount: 0.18 } as const;

const sectionMotion: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.99 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.32, ease: "easeOut" },
  },
};

const itemMotion: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.99 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.22, ease: "easeOut" },
  },
};

const leaderboardRowMotion: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.99 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.24, ease: "easeOut" },
  },
};

type GameStatus = "ready" | "running" | "saving" | "finished";

type LastAttemptView = {
  elapsedMs: number;
  diffMs: number;
  displayTime: string;
  won: boolean;
  message: string;
};

function getUserId(user: unknown) {
  const data = user as Record<string, unknown> | null | undefined;
  return String(data?.id || data?.uid || "");
}

function getUserName(user: unknown) {
  const data = user as Record<string, unknown> | null | undefined;
  return String(data?.fullName || data?.name || data?.displayName || "عضو");
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

  if (diffMs > 0) return Math.floor(diffMs / 1000);

  const fallbackNextMidnightUtcMs = Date.UTC(
    year,
    month - 1,
    day + 1,
    21,
    0,
    0
  );

  return Math.max(
    0,
    Math.floor((fallbackNextMidnightUtcMs - now.getTime()) / 1000)
  );
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

function getAttemptMessage(diffMs: number, won: boolean) {
  if (won) return "جابها بالملي";
  if (diffMs <= 50) return "قريب جدًا";
  if (diffMs <= 150) return "قريب.. ركّز أكثر";
  if (diffMs <= 500) return "حاول مرة ثانية";
  return "بعيد شوي.. اضبط الإحساس";
}

function getFriendlyErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (
    message.includes("permission") ||
    message.includes("Missing or insufficient")
  ) {
    return "تعذر حفظ المحاولة الآن. حاول مرة أخرى بعد قليل.";
  }

  if (message.includes("index")) {
    return "تعذر تحميل الترتيب اليومي بسبب فهرس قاعدة البيانات.";
  }

  if (message.trim()) return message;

  return "حدث خطأ غير متوقع. حاول مرة أخرى.";
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

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toNullableNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function mapAttempt(value: unknown): TenSecondsAttempt | null {
  if (!value || typeof value !== "object") return null;

  const data = value as Record<string, unknown>;

  return {
    attemptNumber: toNumber(data.attemptNumber),
    elapsedMs: toNumber(data.elapsedMs),
    diffMs: toNumber(data.diffMs),
    displayTime: String(data.displayTime || ""),
    won: Boolean(data.won),
    createdAt: String(data.createdAt || ""),
  };
}

function mapRealtimeResult(
  id: string,
  data: Record<string, unknown>
): TenSecondsDailyResult {
  const attempts = Array.isArray(data.attempts)
    ? data.attempts
        .map((attempt) => mapAttempt(attempt))
        .filter((attempt): attempt is TenSecondsAttempt => Boolean(attempt))
    : [];

  return {
    id,
    userId: String(data.userId || ""),
    userName: String(data.userName || ""),
    dateKey: String(data.dateKey || ""),
    attemptsCount: toNumber(data.attemptsCount),
    attempts,
    bestElapsedMs: toNullableNumber(data.bestElapsedMs),
    bestDiffMs: toNullableNumber(data.bestDiffMs),
    bestDisplayTime: String(data.bestDisplayTime || ""),
    won: Boolean(data.won),
    pointsAwarded: Boolean(data.pointsAwarded),
    awardedPoints: toNumber(data.awardedPoints),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export default function TenSecondsChallengeGame() {
  const { user, loading, isLoggedIn, refreshUser } = useAuth();

  const userId = getUserId(user);
  const userName = getUserName(user);

  const [settings, setSettings] = useState<TenSecondsSettings>(
    DEFAULT_TEN_SECONDS_SETTINGS
  );
  const [status, setStatus] = useState<GameStatus>("ready");
  const [displayMs, setDisplayMs] = useState(0);
  const [lastAttempt, setLastAttempt] = useState<LastAttemptView | null>(null);
  const [todayResult, setTodayResult] = useState<TenSecondsDailyResult | null>(
    null
  );
  const [leaderboard, setLeaderboard] = useState<TenSecondsDailyResult[]>([]);
  const [message, setMessage] = useState("");
  const [checkingResult, setCheckingResult] = useState(true);
  const [nextChallengeSeconds, setNextChallengeSeconds] = useState(
    getSecondsUntilNextMakkahMidnight()
  );

  const startTimeRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const stopLockedRef = useRef(false);

  const sortedLeaderboard = useMemo(
    () => sortTenSecondsResults(leaderboard),
    [leaderboard]
  );

  const attemptsUsed = todayResult?.attemptsCount || 0;
  const attemptsLeft = todayResult?.won
    ? 0
    : Math.max(0, settings.dailyAttempts - attemptsUsed);

  const hasWonToday = Boolean(todayResult?.won);

  const canStart =
    settings.enabled &&
    isLoggedIn &&
    Boolean(userId) &&
    !hasWonToday &&
    attemptsLeft > 0 &&
    status !== "running" &&
    status !== "saving";

  async function loadGameData() {
    try {
      setCheckingResult(true);
      setMessage("");

      const settingsData = await getTenSecondsSettings();
      setSettings(settingsData);

      if (userId) {
        const result = await getTodayTenSecondsResult(userId);
        setTodayResult(result);
      } else {
        setTodayResult(null);
      }

    } catch (error) {
      console.error("Load ten seconds challenge data error:", error);
      setMessage(getFriendlyErrorMessage(error));
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
    if (loading) return;

    const dateKey = getMakkahDateKey();
    const resultsQuery = query(
      collection(db, "tenSecondsChallengeDaily"),
      where("dateKey", "==", dateKey)
    );

    const unsubscribe = onSnapshot(
      resultsQuery,
      (snapshot) => {
        const results = snapshot.docs.map((docSnap) =>
          mapRealtimeResult(docSnap.id, docSnap.data())
        );

        const sortedResults = sortTenSecondsResults(results).slice(0, 30);

        setLeaderboard((current) => {
          const currentSignature = current
            .map((item) => `${item.id}-${item.bestDiffMs}-${item.attemptsCount}-${item.won}`)
            .join("|");
          const nextSignature = sortedResults
            .map((item) => `${item.id}-${item.bestDiffMs}-${item.attemptsCount}-${item.won}`)
            .join("|");

          return currentSignature === nextSignature ? current : sortedResults;
        });
      },
      (error) => {
        console.error("Ten seconds realtime leaderboard error:", error);
      }
    );

    return () => unsubscribe();
  }, [loading]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const remainingSeconds = getSecondsUntilNextMakkahMidnight();
      setNextChallengeSeconds(remainingSeconds);

      if (remainingSeconds <= 1) {
        setStatus("ready");
        setDisplayMs(0);
        setLastAttempt(null);
        setMessage("");
        loadGameData();
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userId]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  function startTimer() {
    if (!isLoggedIn || !userId) {
      setMessage("سجّل دخولك أولًا عشان تدخل التحدي وتحفظ نتيجتك.");
      return;
    }

    if (!settings.enabled) {
      setMessage("تحدي العشر ثواني متوقف مؤقتًا من إدارة المنصة.");
      return;
    }

    if (hasWonToday) {
      setMessage("فزت اليوم بالفعل. محاولاتك توقفت إلى تحدي بكرة.");
      return;
    }

    if (attemptsLeft <= 0) {
      setMessage("استهلكت محاولاتك اليومية. ننتظرك بكرة.");
      return;
    }

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }

    stopLockedRef.current = false;
    startTimeRef.current = performance.now();
    setDisplayMs(0);
    setLastAttempt(null);
    setMessage("");
    setStatus("running");

    function tick() {
      const elapsedMs = performance.now() - startTimeRef.current;
      setDisplayMs(elapsedMs);
      animationFrameRef.current = window.requestAnimationFrame(tick);
    }

    animationFrameRef.current = window.requestAnimationFrame(tick);
  }

  async function stopTimer() {
    if (status !== "running") return;
    if (stopLockedRef.current) return;

    stopLockedRef.current = true;

    const elapsedMs = performance.now() - startTimeRef.current;

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setDisplayMs(elapsedMs);
    setStatus("saving");

    try {
      const result = await saveTenSecondsAttempt({
        userId,
        userName,
        elapsedMs,
      });

      const latestAttempt = result.attempts[result.attempts.length - 1];

      if (latestAttempt) {
        setLastAttempt({
          elapsedMs: latestAttempt.elapsedMs,
          diffMs: latestAttempt.diffMs,
          displayTime: latestAttempt.displayTime,
          won: latestAttempt.won,
          message: getAttemptMessage(latestAttempt.diffMs, latestAttempt.won),
        });

        if (latestAttempt.won) {
          setMessage(
            `00:10.000 ✅ جابها بالملي — XP تم احتسابه في ترتيب الألعاب`
          );
          await refreshUser();
        } else {
          setMessage("");
        }
      }

      setTodayResult(result);

      setLeaderboard((current) => {
        const filtered = current.filter((item) => item.userId !== result.userId);

        return sortTenSecondsResults([...filtered, result]).slice(0, 30);
      });

      setStatus("finished");
    } catch (error) {
      console.error("Save ten seconds attempt error:", error);
      setMessage(getFriendlyErrorMessage(error));
      setStatus("ready");
    }
  }

  const mainDisplayTime =
    status === "running"
      ? formatTenSecondsTime(displayMs)
      : lastAttempt?.displayTime || formatTenSecondsTime(displayMs);

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
          <span>جاري تحميل تحدي العشر ثواني...</span>
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
          <motion.div
            variants={itemMotion}
            className={`mb-4 rounded-2xl border px-4 py-3 text-center text-[14px] font-black shadow-lg md:text-base ${
              hasWonToday
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100 shadow-emerald-950/10"
                : !settings.enabled
                  ? "border-red-400/30 bg-red-500/10 text-red-100 shadow-red-950/10"
                  : attemptsLeft > 0
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-100 shadow-amber-950/10"
                    : "border-red-400/30 bg-red-500/10 text-red-100 shadow-red-950/10"
            }`}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {hasWonToday ? (
                <ShieldCheck className="h-4 w-4" />
              ) : !settings.enabled ? (
                <XCircle className="h-4 w-4" />
              ) : attemptsLeft > 0 ? (
                <Zap className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}

              <span>
                {hasWonToday
                  ? `فزت اليوم وتم اعتماد نقاط خبرتك في ترتيب الألعاب`
                  : !settings.enabled
                    ? "تحدي العشر ثواني متوقف مؤقتًا"
                    : attemptsLeft > 0
                      ? `باقي لك ${attemptsLeft} من ${settings.dailyAttempts} محاولات`
                      : "انتهت محاولاتك اليوم"}
              </span>
            </span>
          </motion.div>

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

          {settings.memberNotice && (
            <motion.div
              variants={itemMotion}
              className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-center text-[12px] font-bold leading-6 text-amber-100 shadow-md shadow-amber-950/10 md:text-sm"
            >
              {settings.memberNotice}
            </motion.div>
          )}

          <motion.div
            variants={itemMotion}
            className="mb-5 grid grid-cols-3 gap-2 md:gap-3"
          >
            <StatCard
              label="محاولاتك"
              value={`${attemptsUsed}/${settings.dailyAttempts}`}
              icon={<MousePointer2 className="h-4 w-4 text-amber-300" />}
              valueClassName="text-amber-200"
            />

            <StatCard
              label="أفضل فرق"
              value={
                todayResult?.bestDiffMs === null ||
                todayResult?.bestDiffMs === undefined
                  ? "-"
                  : `${todayResult.bestDiffMs}ms`
              }
              icon={<Gauge className="h-4 w-4 text-cyan-300" />}
              valueClassName="text-cyan-100"
            />

            <StatCard
              label="الجائزة"
              value={`+${settings.awardedPoints} XP`}
              icon={<Trophy className="h-4 w-4 text-emerald-300" />}
              valueClassName="text-emerald-200"
            />
          </motion.div>

          <motion.div
            variants={itemMotion}
            className="mb-5 rounded-[2rem] border border-white/10 bg-slate-950/60 p-5 text-center shadow-xl shadow-slate-950/25 md:p-7"
          >
            <div
              className={`mx-auto mb-4 inline-flex items-center justify-center rounded-full border px-4 py-1.5 text-[11px] font-black md:text-xs ${
                status === "running"
                  ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                  : lastAttempt?.won
                    ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                    : "border-white/10 bg-white/5 text-slate-300"
              }`}
            >
              {status === "running"
                ? "المؤقت يعمل الآن"
                : lastAttempt?.won
                  ? "محاولة فائزة"
                  : "جاهز للتحدي"}
            </div>

            <div
              className={`text-[48px] font-black leading-none tracking-tight tabular-nums md:text-[76px] ${
                status === "running"
                  ? "text-white"
                  : lastAttempt?.won
                    ? "text-emerald-200"
                    : lastAttempt
                      ? "text-amber-100"
                      : "text-white"
              }`}
              dir="ltr"
            >
              {mainDisplayTime}
            </div>

            <AnimatePresence mode="popLayout">
              {lastAttempt && (
                <motion.div
                  key={`${lastAttempt.displayTime}-${lastAttempt.won}`}
                  variants={itemMotion}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  className={`mx-auto mt-4 max-w-sm rounded-2xl border p-3 text-[14px] font-black leading-6 shadow-md ${
                    lastAttempt.won
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100 shadow-emerald-950/10"
                      : "border-red-400/25 bg-red-400/10 text-red-100 shadow-red-950/10"
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {lastAttempt.won ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}

                    <span>
                      {lastAttempt.won
                        ? `00:10.000 ✅ ${lastAttempt.message} — XP تم احتسابه`
                        : `${lastAttempt.displayTime} ❌ ${lastAttempt.message}`}
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
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  className="mx-auto mt-4 max-w-lg rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-[14px] font-bold leading-6 text-cyan-100 shadow-md shadow-cyan-950/10"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-200" />
                    <span>{message}</span>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-5 grid grid-cols-1 gap-2 md:grid-cols-2">
              <motion.button
                type="button"
                onClick={startTimer}
                disabled={!canStart}
                whileTap={!canStart ? undefined : { scale: 0.96, y: 2 }}
                className="group relative inline-flex min-h-[54px] items-center justify-center gap-2 overflow-hidden rounded-2xl bg-amber-400 px-5 py-3 text-[15px] font-black text-slate-950 shadow-md shadow-amber-500/15 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="pointer-events-none absolute inset-0 translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition duration-700 group-hover:translate-x-[-120%]" />
                <Play className="relative h-5 w-5" />
                <span className="relative">ابدأ</span>
              </motion.button>

              <motion.button
                type="button"
                onPointerDown={(event) => {
                  event.preventDefault();
                  stopTimer();
                }}
                disabled={status !== "running"}
                whileTap={
                  status === "running" ? { scale: 0.94, y: 2 } : undefined
                }
                style={{ touchAction: "manipulation" }}
                className="group relative inline-flex min-h-[54px] items-center justify-center gap-2 overflow-hidden rounded-2xl bg-red-500 px-5 py-3 text-[15px] font-black text-white shadow-md shadow-red-950/20 transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className="pointer-events-none absolute inset-0 translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition duration-700 group-hover:translate-x-[-120%]" />
                <Zap className="relative h-5 w-5" />
                <span className="relative">إيقاف</span>
              </motion.button>
            </div>
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
            ترتيب تحدي العشر ثواني اليومي
          </h2>

          <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
            الفائزون أولًا، ثم الأقرب إلى 00:10.000 حسب الفرق بالمللي ثانية.
          </p>
        </div>

        {sortedLeaderboard.length === 0 ? (
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
            {sortedLeaderboard.map((result, index) => {
              const rank = index + 1;
              const bestTime = result.won
                ? "00:10.000"
                : result.bestDisplayTime || "-";
              const bestDiff =
                result.bestDiffMs === null || result.bestDiffMs === undefined
                  ? "-"
                  : `${result.bestDiffMs}ms`;

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
                      label="الحالة"
                      value={result.won ? "فاز" : "لم يفز"}
                      className={
                        result.won
                          ? "border-emerald-400/15 bg-emerald-400/10 text-emerald-300"
                          : "border-red-400/15 bg-red-400/10 text-red-200"
                      }
                    />

                    <LeaderboardStat
                      label="أفضل وقت"
                      value={bestTime}
                      className="border-white/10 bg-white/5 text-white"
                    />

                    <LeaderboardStat
                      label="الفرق"
                      value={bestDiff}
                      className="border-cyan-400/15 bg-cyan-400/10 text-cyan-100"
                    />

                    <LeaderboardStat
                      label="المحاولات"
                      value={result.attemptsCount}
                      className="border-amber-400/15 bg-amber-400/10 text-amber-300"
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
