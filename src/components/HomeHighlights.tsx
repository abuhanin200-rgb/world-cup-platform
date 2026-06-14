"use client";

import { useEffect, useState } from "react";
import {
  ExactHit,
  getHomeHighlights,
  HomeHighlightUser,
} from "@/lib/highlights";
import { getSiteSettings, getTickerDuration } from "@/lib/siteSettings";

function EmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-4 text-center shadow-2xl md:p-5">
      <div className="text-lg font-black text-slate-200">{title}</div>
      <p className="mt-2 text-xs leading-6 text-slate-300 md:text-sm">{text}</p>
    </div>
  );
}

function HighlightCard({
  title,
  user,
  valueLabel,
  value,
  accentClass,
}: {
  title: string;
  user: HomeHighlightUser | null;
  valueLabel: string;
  value: number;
  accentClass: string;
}) {
  if (!user) {
    return (
      <EmptyCard
        title={title}
        text="لم تظهر الإحصائية بعد. تبدأ بعد احتساب أول النتائج."
      />
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-4 text-center shadow-2xl md:p-5">
      <h2 className="text-lg font-black md:text-xl">{title}</h2>

      <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
        <div className="text-3xl">{user.teamEmoji || "🏳️"}</div>

        <div className="mt-2 text-xl font-black text-white">
          {user.fullName}
        </div>

        <div className="mt-1 text-xs text-slate-300">
          {user.favoriteTeam || "بدون منتخب"}
        </div>

        <div
          className={`mt-4 rounded-2xl px-4 py-3 text-sm font-black ${accentClass}`}
        >
          {valueLabel}: {value}
        </div>
      </div>
    </div>
  );
}

export default function HomeHighlights() {
  const [predictionKing, setPredictionKing] =
    useState<HomeHighlightUser | null>(null);
  const [bestStreakUser, setBestStreakUser] =
    useState<HomeHighlightUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHighlights() {
      try {
        const data = await getHomeHighlights();

        setPredictionKing(data.predictionKing);
        setBestStreakUser(data.bestStreakUser);
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
      <section className="mt-5 grid grid-cols-1 gap-4 md:mt-6 md:grid-cols-2">
        <EmptyCard title="🏆 ملك التوقعات" text="جاري تحميل الإحصائيات..." />
        <EmptyCard
          title="🔥 أفضل سلسلة صحيحة"
          text="جاري تحميل الإحصائيات..."
        />
      </section>
    );
  }

  return (
    <section className="mt-5 grid grid-cols-1 gap-4 md:mt-6 md:grid-cols-2">
      <HighlightCard
        title="🏆 ملك التوقعات"
        user={predictionKing}
        valueLabel="النقاط"
        value={predictionKing?.points || 0}
        accentClass="bg-amber-400 text-slate-950"
      />

      <HighlightCard
        title="🔥 أفضل سلسلة صحيحة"
        user={bestStreakUser}
        valueLabel="أفضل سلسلة"
        value={bestStreakUser?.bestStreak || 0}
        accentClass="bg-emerald-400 text-slate-950"
      />
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
        <h2 className="text-sm font-black text-emerald-200">
          🎯 جابها صح
        </h2>

        <span className="text-[11px] text-emerald-100/80">
          آخر 24 ساعة
        </span>
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