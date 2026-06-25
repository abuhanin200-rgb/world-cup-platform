"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ExactHit,
  getHomeHighlights,
  HomeHighlightUser,
} from "@/lib/highlights";
import { getSiteSettings, TickerSpeed } from "@/lib/siteSettings";

type ExactHitWithPredictionType = ExactHit & {
  predictionType?: "normal" | "golden";
  points?: number;
  createdAt?: string;
  calculatedAt?: string;
};

function EmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-2 text-center shadow-xl md:p-3">
      <div className="text-[11px] font-black leading-5 text-slate-200 md:text-sm">
        {title}
      </div>

      <p className="mt-1 text-[9px] leading-4 text-slate-300 md:text-xs">
        {text}
      </p>
    </div>
  );
}

function HighlightCard({
  title,
  user,
  valueText,
  accentClass,
  emptyText,
}: {
  title: string;
  user: HomeHighlightUser | null;
  valueText: string;
  accentClass: string;
  emptyText: string;
}) {
  if (!user) {
    return <EmptyCard title={title} text={emptyText} />;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-2 text-center shadow-xl md:p-3">
      <h2 className="text-[11px] font-black leading-5 text-white md:text-sm">
        {title}
      </h2>

      <div className="mt-2 rounded-2xl border border-white/10 bg-slate-950/60 p-2 md:p-3">
        <div className="text-lg leading-none md:text-2xl">
          {user.teamEmoji || "🏳️"}
        </div>

        <div className="mt-1 min-h-[30px] break-words text-[11px] font-black leading-4 text-white md:text-sm">
          {user.fullName}
        </div>

        <div className="mt-1 truncate text-[9px] text-slate-300 md:text-xs">
          {user.favoriteTeam || "بدون منتخب"}
        </div>

        <div
          className={`mt-2 rounded-xl px-1.5 py-1.5 text-[9px] font-black leading-4 md:text-xs ${accentClass}`}
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
      <section className="mt-4 rounded-3xl border border-white/10 bg-white/10 p-3 shadow-2xl md:mt-5 md:p-4">
        <div className="mb-3 text-center">
          <h2 className="text-base font-black md:text-xl">
            أبطال التحدي الآن
          </h2>

          <p className="mt-1 text-[10px] text-slate-300 md:text-xs">
            أسماء تتغير تلقائيًا حسب التوقعات والنتائج
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <EmptyCard title="🏆 ملك التوقعات" text="جاري التحميل..." />
          <EmptyCard title="🔥 أفضل سلسلة" text="جاري التحميل..." />
          <EmptyCard title="⚡ أول الواصلين" text="جاري التحميل..." />
        </div>
      </section>
    );
  }

  return (
    <section className="mt-4 rounded-3xl border border-white/10 bg-white/10 p-3 shadow-2xl md:mt-5 md:p-4">
      <div className="mb-3 text-center">
        <h2 className="text-base font-black md:text-xl">
          🔥 أبطال التحدي الآن
        </h2>

        <p className="mt-1 text-[10px] text-slate-300 md:text-xs">
          أسماء تتغير تلقائيًا حسب التوقعات والنتائج
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <HighlightCard
          title="🏆 ملك التوقعات"
          user={predictionKing}
          valueText={`${predictionKing?.points || 0} نقاط`}
          accentClass="bg-amber-400 text-slate-950"
          emptyText="يظهر بعد تسجيل أول نقاط"
        />

        <HighlightCard
          title="🔥 أفضل سلسلة"
          user={bestStreakUser}
          valueText={`السلسلة: ${bestStreakUser?.bestStreak || 0}`}
          accentClass="bg-emerald-400 text-slate-950"
          emptyText="تظهر بعد وجود سلسلة صحيحة"
        />

        <HighlightCard
          title="⚡ أول الواصلين"
          user={firstArriverUser}
          valueText="توقع قبل الجميع"
          accentClass="bg-violet-400 text-slate-950"
          emptyText="تظهر بعد أول توقع"
        />
      </div>
    </section>
  );
}

export function ExactHitsTicker() {
  const [exactHits, setExactHits] = useState<ExactHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [speed, setSpeed] = useState<TickerSpeed>("normal");
  const [isPaused, setIsPaused] = useState(false);
  const [groupWidth, setGroupWidth] = useState(0);
  const [isListOpen, setIsListOpen] = useState(false);

  const groupRef = useRef<HTMLDivElement | null>(null);

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

    return (
      <div
        key={`${hit.id}-${index}`}
        dir="rtl"
        className={`whitespace-nowrap rounded-xl border px-4 py-2 text-xs text-white md:text-sm ${
          golden
            ? "border-amber-300/40 bg-amber-400/15"
            : "border-white/10 bg-slate-950/70"
        }`}
      >
        {golden && (
          <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950 md:text-xs">
            ⭐ ذهبي بالملي +6
          </span>
        )}

        <span
          className={
            golden ? "font-black text-amber-300" : "font-black text-emerald-300"
          }
        >
          {hit.userName}
        </span>{" "}
        {golden
          ? "جاب التوقع الذهبي بالملي في مباراة"
          : "جابها صح بالملي في مباراة"}{" "}
        <span className="font-bold">
          {hit.homeTeamEmoji} {hit.homeTeamName}
        </span>{" "}
        <span className="font-black text-amber-300">
          {hit.homeScore} - {hit.awayScore}
        </span>{" "}
        <span className="font-bold">
          {hit.awayTeamName} {hit.awayTeamEmoji}
        </span>
      </div>
    );
  }

  function renderExactHitListItem(hit: ExactHit) {
    const exactHit = hit as ExactHitWithPredictionType;
    const golden = isGoldenExactHit(exactHit);

    return (
      <div
        key={hit.id}
        className={`rounded-2xl border p-3 ${
          golden
            ? "border-amber-300/40 bg-amber-400/10"
            : "border-white/10 bg-slate-950/60"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div
              className={`text-sm font-black ${
                golden ? "text-amber-200" : "text-emerald-200"
              }`}
            >
              {hit.userName}
            </div>

            <div className="mt-1 text-[11px] leading-5 text-slate-300">
              {golden ? "جاب التوقع الذهبي بالملي" : "جابها صح بالملي"}
            </div>
          </div>

          <div className="shrink-0 rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-200">
            {formatRelativeHitTime(exactHit)}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 rounded-xl bg-slate-950/70 px-3 py-2 text-xs font-black text-white">
          <span>
            {hit.homeTeamEmoji} {hit.homeTeamName}
          </span>

          <span className="rounded-lg bg-amber-400 px-2 py-1 text-slate-950">
            {hit.homeScore} - {hit.awayScore}
          </span>

          <span>
            {hit.awayTeamName} {hit.awayTeamEmoji}
          </span>
        </div>

        {golden && (
          <div className="mt-2 inline-flex rounded-full bg-amber-400 px-2 py-1 text-[10px] font-black text-slate-950">
            ⭐ ذهبي بالملي +6
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <section className="mt-5 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 md:mt-6">
        <div className="text-sm text-slate-300">
          جاري تحميل شريط جابها صح...
        </div>
      </section>
    );
  }

  if (exactHits.length === 0) {
    return (
      <section className="mt-5 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 md:mt-6">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span>🎯</span>
          <span>لم يسجل أحد نتيجة بالملي خلال آخر 24 ساعة.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 md:mt-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsListOpen(true)}
          className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-sm font-black text-emerald-200 transition hover:bg-emerald-400/20"
        >
          🎯 جابها صح
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-emerald-100/80 md:inline">
            السرعة: {getSpeedLabel(speed)}
          </span>

          <span className="text-[11px] text-emerald-100/80">آخر 24 ساعة</span>
        </div>
      </div>

      <div
        dir="ltr"
        className="exact-hits-window relative overflow-hidden"
        onMouseEnter={pauseTicker}
        onMouseLeave={resumeTicker}
        onTouchStart={pauseTicker}
        onTouchEnd={resumeTicker}
        onTouchCancel={resumeTicker}
        onPointerDown={pauseTicker}
        onPointerUp={resumeTicker}
        onPointerCancel={resumeTicker}
      >
        <div
          className="exact-hits-track flex w-max gap-3"
          style={{
            animationDuration: `${duration}s`,
            animationPlayState: isPaused ? "paused" : "running",
          }}
        >
          <div ref={groupRef} className="flex flex-none gap-3">
            {repeatedHits.map((hit, index) => renderExactHitCard(hit, index))}
          </div>

          <div className="flex flex-none gap-3">
            {repeatedHits.map((hit, index) =>
              renderExactHitCard(hit, index + repeatedHits.length)
            )}
          </div>
        </div>
      </div>

      {isListOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setIsListOpen(false)}
        >
          <div
            dir="rtl"
            className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-3xl border border-emerald-400/30 bg-slate-950 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-emerald-400/10 px-4 py-3">
              <div>
                <h3 className="text-lg font-black text-emerald-100">
                  🎯 قائمة جابها صح
                </h3>

                <p className="mt-1 text-[11px] text-emerald-100/70">
                  الأحدث أولاً — آخر 24 ساعة
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsListOpen(false)}
                className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/20"
              >
                إغلاق
              </button>
            </div>

            <div className="max-h-[65vh] space-y-3 overflow-y-auto p-4">
              {sortedExactHits.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm text-slate-300">
                  لا توجد توقعات صحيحة خلال آخر 24 ساعة.
                </div>
              ) : (
                sortedExactHits.map((hit) => renderExactHitListItem(hit))
              )}
            </div>
          </div>
        </div>
      )}

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
  );
}