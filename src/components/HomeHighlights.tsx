"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ExactHit,
  getHomeHighlights,
  HomeHighlightUser,
} from "@/lib/highlights";
import { getSiteSettings, TickerSpeed } from "@/lib/siteSettings";

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
            🔥 أبطال التحدي الآن
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
    return (
      <div
        key={`${hit.id}-${index}`}
        dir="rtl"
        className="whitespace-nowrap rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-xs text-white md:text-sm"
      >
        <span className="font-black text-emerald-300">{hit.userName}</span>{" "}
        جابها صح بالملي في مباراة{" "}
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
        <h2 className="text-sm font-black text-emerald-200">🎯 جابها صح</h2>

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