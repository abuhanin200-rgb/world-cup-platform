"use client";

import { useEffect, useState } from "react";
import {
  ExactHit,
  getHomeHighlights,
  HighlightUser,
  HomeHighlights as HomeHighlightsType,
} from "@/lib/highlights";

function EmptyCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3 md:p-5">
      <div className="mb-2 text-xl md:text-2xl">{icon}</div>
      <h3 className="text-sm font-black md:text-base">{title}</h3>
      <p className="mt-2 text-xs leading-6 text-slate-300 md:text-sm">
        {description}
      </p>
    </div>
  );
}

function HighlightCard({
  icon,
  title,
  user,
  valueLabel,
  value,
}: {
  icon: string;
  title: string;
  user: HighlightUser | null;
  valueLabel: string;
  value: number;
}) {
  if (!user) {
    return (
      <EmptyCard
        icon={icon}
        title={title}
        description="سيظهر هنا بعد احتساب النتائج."
      />
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3 md:p-5">
      <div className="mb-2 text-xl md:text-2xl">{icon}</div>

      <h3 className="text-sm font-black md:text-base">{title}</h3>

      <div className="mt-3 truncate text-base font-black text-amber-300 md:text-xl">
        {user.fullName}
      </div>

      <div className="mt-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-center text-xs text-slate-200 md:text-sm">
        {valueLabel}:{" "}
        <span className="font-black text-white">{value}</span>
      </div>
    </div>
  );
}

function ExactHitPill({ hit }: { hit: ExactHit }) {
  return (
    <div className="exact-hit-pill inline-flex min-w-max items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-xs shadow-lg shadow-emerald-950/20">
      <span className="font-black text-emerald-200">{hit.userName}</span>

      <span className="text-slate-300">جابها صح</span>

      <span className="rounded-full bg-slate-950/80 px-2 py-1 font-black text-amber-300">
        {hit.actualHomeScore} - {hit.actualAwayScore}
      </span>

      <span className="text-slate-200">
        {hit.homeTeamEmoji || "🏳️"} {hit.homeTeamName}
      </span>

      <span className="text-slate-400">×</span>

      <span className="text-slate-200">
        {hit.awayTeamName} {hit.awayTeamEmoji || "🏳️"}
      </span>

      <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-black text-slate-950">
        +3
      </span>
    </div>
  );
}

export default function HomeHighlights() {
  const [data, setData] = useState<HomeHighlightsType>({
    predictionKing: null,
    bestStreakUser: null,
    exactHits: [],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHighlights() {
      try {
        const result = await getHomeHighlights();
        setData(result);
      } catch (error) {
        console.error("فشل تحميل مميزات الصفحة:", error);
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
      <section className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-3 shadow-2xl md:mt-6">
        <div className="text-center text-xs text-slate-300">
          جاري تحميل الإحصائيات...
        </div>
      </section>
    );
  }

  return (
    <section className="mt-5 md:mt-6">
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <HighlightCard
          icon="🏆"
          title="ملك التوقعات"
          user={data.predictionKing}
          valueLabel="النقاط"
          value={data.predictionKing?.points || 0}
        />

        <HighlightCard
          icon="🔥"
          title="أفضل سلسلة صحيحة"
          user={data.bestStreakUser}
          valueLabel="أفضل سلسلة"
          value={data.bestStreakUser?.bestStreak || 0}
        />
      </div>
    </section>
  );
}

export function ExactHitsTicker() {
  const [exactHits, setExactHits] = useState<ExactHit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExactHits() {
      try {
        const result = await getHomeHighlights();
        setExactHits(result.exactHits);
      } catch (error) {
        console.error("فشل تحميل جابها صح:", error);
      } finally {
        setLoading(false);
      }
    }

    loadExactHits();

    const interval = setInterval(loadExactHits, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <section className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 shadow-2xl md:mt-6">
        <div className="text-center text-xs text-emerald-100/80">
          جاري تحميل جابها صح...
        </div>
      </section>
    );
  }

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 shadow-2xl md:mt-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black text-emerald-100 md:text-base">
          🎯 جابها صح
        </h2>

        <span className="rounded-full bg-slate-950/50 px-2 py-1 text-[10px] text-emerald-100/80">
          آخر 24 ساعة
        </span>
      </div>

      {exactHits.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3 text-center text-xs text-slate-300">
          ما فيه أحد جاب نتيجة بالملي خلال آخر 24 ساعة.
        </div>
      ) : (
        <div className="exact-hits-window overflow-hidden">
          <div className="exact-hits-track flex w-max gap-2">
            {[...exactHits, ...exactHits].map((hit, index) => (
              <ExactHitPill key={`${hit.id}-${index}`} hit={hit} />
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .exact-hit-pill {
          animation: glowPulse 2.4s ease-in-out infinite;
        }

        .exact-hits-track {
          animation: exactHitsMove 22s linear infinite;
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

        @keyframes glowPulse {
          0%,
          100% {
            box-shadow: 0 0 0 rgba(52, 211, 153, 0);
          }
          50% {
            box-shadow: 0 0 14px rgba(52, 211, 153, 0.25);
          }
        }
      `}</style>
    </section>
  );
}