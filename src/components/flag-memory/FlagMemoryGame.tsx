"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

  // منتصف الليل القادم بتوقيت مكة = الساعة 21:00 UTC من تاريخ اليوم الحالي في مكة
  const nextMakkahMidnightUtcMs = Date.UTC(year, month - 1, day, 21, 0, 0);

  const diffMs = nextMakkahMidnightUtcMs - now.getTime();

  if (diffMs > 0) {
    return Math.floor(diffMs / 1000);
  }

  // احتياط لو دخلنا بعد منتصف الليل مباشرة
  const fallbackNextMidnightUtcMs = Date.UTC(year, month - 1, day + 1, 21, 0, 0);
  return Math.max(0, Math.floor((fallbackNextMidnightUtcMs - now.getTime()) / 1000));
}

function getRankLabel(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
}

function getUserId(user: unknown) {
  const data = user as Record<string, unknown> | null | undefined;
  return String(data?.id || data?.uid || "");
}

function getUserName(user: unknown) {
  const data = user as Record<string, unknown> | null | undefined;
  return String(data?.fullName || data?.name || data?.displayName || "عضو");
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

    if (completed && status === "playing") {
      setStatus("finished");
      setMessage("أحسنت! أنهيت تحدي الأعلام بنجاح. احفظ نتيجتك الآن.");
    }
  }, [cards, status]);

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
  }

  function handleCardClick(card: MemoryCard) {
    if (status !== "playing") return;
    if (lockRef.current) return;
    if (card.matched) return;
    if (selectedCards.some((selected) => selected.cardId === card.cardId)) return;
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
    status === "playing" ||
    !settings.enabled ||
    (settings.oneAttemptPerDay && Boolean(todayResult)) ||
    (settings.oneAttemptPerDay && hasStartedInThisSession);

  if (loading || checkingResult) {
    return (
      <section
        dir="rtl"
        className="rounded-3xl border border-white/10 bg-white/10 p-6 text-center text-slate-200 shadow-2xl"
      >
        جاري تحميل تحدي الأعلام...
      </section>
    );
  }

  return (
    <section dir="rtl" className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
        <div
          className={`mb-4 rounded-2xl border px-4 py-3 text-center text-sm font-black md:text-base ${
            settings.enabled
              ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
              : "border-red-400/30 bg-red-500/10 text-red-100"
          }`}
        >
          {!settings.enabled
            ? "⛔ تحدي الأعلام متوقف مؤقتًا"
            : todayResult && settings.oneAttemptPerDay
            ? "✅ نتيجتك اليومية محفوظة"
            : status === "playing"
            ? "التحدي جارٍ الآن"
            : "جاهز للتحدي؟"}
        </div>

        <div className="mb-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-center">
          <div className="text-xs font-bold text-cyan-100/80">
            تحدي جديد بعد
          </div>
          <div className="mt-1 text-2xl font-black text-cyan-100 tabular-nums" dir="ltr">
            {formatCountdown(nextChallengeSeconds)}
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-center text-xs font-bold leading-6 text-slate-300 md:text-sm">
          {settings.memberNotice}
        </div>

        <div className="mb-5 grid grid-cols-4 gap-2 md:gap-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-2 text-center md:p-3">
            <div className="text-[10px] font-bold text-slate-400 md:text-xs">
              الوقت
            </div>
            <div className="mt-1 text-base font-black md:text-xl">
              {formatTime(seconds)}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-2 text-center md:p-3">
            <div className="text-[10px] font-bold text-slate-400 md:text-xs">
              المحاولات
            </div>
            <div className="mt-1 text-base font-black md:text-xl">{moves}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-2 text-center md:p-3">
            <div className="text-[10px] font-bold text-slate-400 md:text-xs">
              الأخطاء
            </div>
            <div className="mt-1 text-base font-black md:text-xl">
              {mistakes}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-2 text-center md:p-3">
            <div className="text-[10px] font-bold text-slate-400 md:text-xs">
              النقاط
            </div>
            <div className="mt-1 text-base font-black md:text-xl">
              {currentScore}
            </div>
          </div>
        </div>

        {todayResult && (
          <div className="mb-5 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm font-bold leading-7 text-emerald-100">
            نتيجتك اليوم: {todayResult.score} نقطة — الوقت{" "}
            {formatTime(todayResult.timeSeconds)} — المحاولات{" "}
            {todayResult.moves} — الأخطاء {todayResult.mistakes}.
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm font-bold leading-6 text-cyan-100">
            {message}
          </div>
        )}

        <div className="mb-5 flex flex-col gap-2 md:flex-row">
          <button
            type="button"
            onClick={startGame}
            disabled={startButtonDisabled}
            className="rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {!settings.enabled
              ? "التحدي متوقف"
              : status === "playing"
              ? "التحدي بدأ"
              : "ابدأ التحدي"}
          </button>

          {status === "finished" && (
            <button
              type="button"
              onClick={handleSaveResult}
              disabled={saving}
              className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "جاري حفظ النتيجة..." : "حفظ النتيجة الرسمية"}
            </button>
          )}
        </div>

        <div className="mb-4 rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-center text-sm font-black text-slate-200">
          المتطابق: {matchedCount} / {pairsCount} — عدد البطاقات: {totalCards}
        </div>

        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:gap-2">
          {cards.map((card, index) => {
            const visible = isCardVisible(card);

            return (
              <button
                key={card.cardId}
                type="button"
                onClick={() => handleCardClick(card)}
                disabled={status !== "playing" || visible}
                className={`aspect-[5/4] rounded-xl border p-1 transition md:rounded-2xl ${
                  visible
                    ? "border-emerald-400/40 bg-white text-slate-950"
                    : "border-white/10 bg-slate-950/70 text-white hover:bg-slate-900"
                } disabled:cursor-default`}
                aria-label={
                  visible ? card.team.nameAr : `بطاقة رقم ${index + 1}`
                }
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
                    <span className="text-lg leading-none md:text-2xl">❓</span>
                    <span className="text-[9px] font-black leading-none text-slate-300 md:text-[10px]">
                      {index + 1}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
        <div className="mb-4 text-center">
          <h2 className="text-xl font-black md:text-2xl">
            🏆 ترتيب تحدي الأعلام اليومي
          </h2>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
            الأعلى نقاطًا، ثم الأسرع وقتًا، ثم الأقل محاولات.
          </p>
        </div>

        {leaderboard.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 p-5 text-center text-sm font-bold text-slate-300">
            لا توجد نتائج اليوم حتى الآن.
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((result, index) => {
              const rank = index + 1;

              return (
                <article
                  key={result.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/55 p-2.5 shadow-md shadow-slate-950/20"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-8 min-w-8 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-sm font-black text-amber-200">
                      {getRankLabel(rank)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold text-slate-400">
                        العضو
                      </div>

                      <div className="mt-0.5 whitespace-normal break-words text-right text-sm font-black leading-5 text-white">
                        {result.userName}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    <div className="rounded-xl border border-amber-400/15 bg-amber-400/10 p-1.5 text-center">
                      <div className="text-[9px] font-bold text-amber-100/80">
                        النقاط
                      </div>
                      <div className="mt-0.5 text-sm font-black text-amber-300">
                        {result.score}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-center">
                      <div className="text-[9px] font-bold text-slate-400">
                        الوقت
                      </div>
                      <div className="mt-0.5 text-xs font-black text-white" dir="ltr">
                        {formatTime(result.timeSeconds)}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-center">
                      <div className="text-[9px] font-bold text-slate-400">
                        المحاولات
                      </div>
                      <div className="mt-0.5 text-xs font-black text-white">
                        {result.moves}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-center">
                      <div className="text-[9px] font-bold text-slate-400">
                        الأخطاء
                      </div>
                      <div className="mt-0.5 text-xs font-black text-white">
                        {result.mistakes}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}