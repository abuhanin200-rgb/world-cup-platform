"use client";

import { useEffect, useState } from "react";
import {
  ExactHit,
  getHomeHighlights,
  HomeHighlightUser,
} from "@/lib/highlights";
import { getSiteSettings, getTickerDuration } from "@/lib/siteSettings";

type HighlightUser = HomeHighlightUser & {
  rankChange?: number;
};

type ExtendedHighlightsResponse = {
  predictionKing: HighlightUser | null;
  bestStreakUser: HighlightUser | null;
  firstArrivalUser?: HighlightUser | null;
  fastestClimberUser?: HighlightUser | null;
  exactHits: ExactHit[];
};

function EmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-2 text-center shadow-xl">
      <div className="text-sm font-black text-slate-100 md:text-base">
        {title}
      </div>

      <div className="mt-2 rounded-2xl border border-white/10 bg-slate-950/60 px-2 py-3">
        <p className="text-[10px] leading-5 text-slate-300 md:text-xs">
          {text}
        </p>
      </div>
    </div>
  );
}

function HighlightCard({
  title,
  user,
  badgeText,
  accentClass,
}: {
  title: string;
  user: HighlightUser | null;
  badgeText: string;
  accentClass: string;
}) {
  if (!user) {
    return (
      <EmptyCard
        title={title}
        text="تظهر بعد احتساب أول النتائج."
      />
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-2 text-center shadow-xl">
      <h2 className="text-sm font-black text-white md:text-base">{title}</h2>

      <div className="mt-2 rounded-2xl border border-white/10 bg-slate-950/60 px-2 py-3">
        <div className="text-lg md:text-xl">{user.teamEmoji || "🏳️"}</div>

        <div className="mt-1 text-sm font-black leading-5 text-white md:text-base">
          {user.fullName}
        </div>

        <div className="mt-1 text-[10px] text-slate-300 md:text-xs">
          {user.favoriteTeam || "بدون منتخب"}
        </div>

        <div
          className={`mt-2 rounded-xl px-2 py-2 text-xs font-black md:text-sm ${accentClass}`}
        >
          {badgeText}
        </div>
      </div>
    </div>
  );
}

export default function HomeHighlights() {
  const [predictionKing, setPredictionKing] = useState<HighlightUser | null>(
    null
  );
  const [bestStreakUser, setBestStreakUser] = useState<HighlightUser | null>(
    null
  );
  const [firstArrivalUser, setFirstArrivalUser] =
    useState<HighlightUser | null>(null);
  const [fastestClimberUser, setFastestClimberUser] =
    useState<HighlightUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHighlights() {
      try {
        const data = (await getHomeHighlights()) as ExtendedHighlightsResponse;

        setPredictionKing(data.predictionKing ?? null);
        setBestStreakUser(data.bestStreakUser ?? null);
        setFirstArrivalUser(data.firstArrivalUser ?? null);
        setFastestClimberUser(data.fastestClimberUser ?? null);
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
      <section className="mt-4 md:mt-5">
        <div className="mb-3 text-center">
          <h2 className="text-xl font-black md:text-2xl">🔥 أبطال التحدي الآن</h2>
          <p className="mt-1 text-[11px] text-slate-300 md:text-xs">
            أسماء تتغير تلقائيًا حسب التوقعات والنتائج.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <EmptyCard title="🏆 ملك التوقعات" text="جاري التحميل..." />
          <EmptyCard title="🔥 أفضل سلسلة" text="جاري التحميل..." />
          <EmptyCard title="⚡ أول الواصلين" text="جاري التحميل..." />
          <EmptyCard title="🚀 أسرع صاعد" text="جاري التحميل..." />
        </div>
      </section>
    );
  }

  const fastestRiseText =
    fastestClimberUser && (fastestClimberUser.rankChange ?? 0) > 0
      ? `صعد ${fastestClimberUser.rankChange} مركز`
      : "صعد بسرعة";

  return (
    <section className="mt-4 md:mt-5">
      <div className="mb-3 text-center">
        <h2 className="text-xl font-black md:text-2xl">🔥 أبطال التحدي الآن</h2>
        <p className="mt-1 text-[11px] text-slate-300 md:text-xs">
          أسماء تتغير تلقائيًا حسب التوقعات والنتائج.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <HighlightCard
          title="🏆 ملك التوقعات"
          user={predictionKing}
          badgeText={`النقاط: ${predictionKing?.points || 0}`}
          accentClass="bg-amber-400 text-slate-950"
        />

        <HighlightCard
          title="🔥 أفضل سلسلة"
          user={bestStreakUser}
          badgeText={`السلسلة: ${bestStreakUser?.bestStreak || 0}`}
          accentClass="bg-emerald-400 text-slate-950"
        />

        <HighlightCard
          title="⚡ أول الواصلين"
          user={firstArrivalUser}
          badgeText="توقع قبل الجميع"
          accentClass="bg-violet-400 text-slate-950"
        />

        <HighlightCard
          title="🚀 أسرع صاعد"
          user={fastestClimberUser}
          badgeText={fastestRiseText}
          accentClass="bg-sky-400 text-slate-950"
        />
      </div>
    </section>
  );
}

export function ExactHitsTicker() {
  const [exactHits, setExactHits] = useState<ExactHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(22);

  useEffect(() => {
    async function loadExactHits() {
      try {
        const data = (await getHomeHighlights()) as ExtendedHighlightsResponse;
        setExactHits(data.exactHits || []);
      } catch (error) {
        console.error("فشل تحميل شريط جابها صح:", error);
      } finally {
        setLoading(false);
      }
    }

    async function loadTickerSettings() {
      try {
        const settings = await getSiteSettings();
        setDuration(getTickerDuration(settings.exactHitsSpeed));
      } catch (error) {
        console.error("فشل تحميل إعدادات سرعة جابها صح:", error);
        setDuration(22);
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

  const repeatedHits =
    exactHits.length === 1
      ? Array(8).fill(exactHits[0])
      : [...exactHits, ...exactHits, ...exactHits];

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 md:mt-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black text-emerald-200">🎯 جابها صح</h2>
        <span className="text-[11px] text-emerald-100/80">آخر 24 ساعة</span>
      </div>

      <div className="exact-hits-window relative overflow-hidden">
        <div
          className="exact-hits-track flex w-max gap-3"
          style={{
            animationDuration: `${duration}s`,
          }}
        >
          {repeatedHits.map((hit, index) => (
            <div
              key={`${hit.id}-${index}`}
              className="whitespace-nowrap rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-xs text-white md:text-sm"
            >
              <span className="font-black text-emerald-300">
                {hit.userName}
              </span>{" "}
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
          ))}
        </div>
      </div>

      <style jsx>{`
        .exact-hits-window {
          direction: rtl;
        }

        .exact-hits-track {
          animation-name: exactHitsMove;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .exact-hits-track:hover {
          animation-play-state: paused;
        }

        @keyframes exactHitsMove {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(50%);
          }
        }
      `}</style>
    </section>
  );
}