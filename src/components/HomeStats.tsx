"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

type HomeStatsData = {
  totalPredictions: number;
  winnerCorrect: number;
  exactCorrect: number;
  calculatedMatches: number;
  successRate: number;
};

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toText(value: unknown) {
  return String(value || "").trim();
}

function isExactPrediction(data: Record<string, unknown>) {
  const points = toNumber(data.points);
  const resultType = toText(data.resultType);

  return (
    Boolean(data.isCalculated) &&
    (resultType === "exact" || points === 3 || points === 6)
  );
}

function isWinnerPrediction(data: Record<string, unknown>) {
  const points = toNumber(data.points);
  const resultType = toText(data.resultType);

  return (
    Boolean(data.isCalculated) &&
    (resultType === "winner" || points === 1 || points === 2)
  );
}

export default function HomeStats() {
  const [stats, setStats] = useState<HomeStatsData>({
    totalPredictions: 0,
    winnerCorrect: 0,
    exactCorrect: 0,
    calculatedMatches: 0,
    successRate: 0,
  });

  const [loading, setLoading] = useState(true);

  async function loadStats() {
    try {
      setLoading(true);

      const [predictionsSnapshot, matchesSnapshot] = await Promise.all([
        getDocs(collection(db, "predictions")),
        getDocs(collection(db, "matches")),
      ]);

      const predictions = predictionsSnapshot.docs
        .filter((docSnap) => docSnap.id !== "_init")
        .map((docSnap) => docSnap.data());

      const matches = matchesSnapshot.docs
        .filter((docSnap) => docSnap.id !== "_init")
        .map((docSnap) => docSnap.data());

      const totalPredictions = predictions.length;

      const calculatedPredictions = predictions.filter((prediction) =>
        Boolean(prediction.isCalculated)
      ).length;

      const winnerCorrect = predictions.filter((prediction) =>
        isWinnerPrediction(prediction)
      ).length;

      const exactCorrect = predictions.filter((prediction) =>
        isExactPrediction(prediction)
      ).length;

      const calculatedMatches = matches.filter((match) =>
        Boolean(match.resultCalculated)
      ).length;

      const successRate =
        calculatedPredictions > 0
          ? ((winnerCorrect + exactCorrect) / calculatedPredictions) * 100
          : 0;

      setStats({
        totalPredictions,
        winnerCorrect,
        exactCorrect,
        calculatedMatches,
        successRate,
      });
    } catch (error) {
      console.error("Home stats error:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  const cards = [
    {
      titleLines: ["إجمالي", "التوقعات"],
      value: stats.totalPredictions,
      icon: "🎯",
      valueClass: "text-white",
    },
    {
      titleLines: ["الفائز", "الصحيح"],
      value: stats.winnerCorrect,
      icon: "🏆",
      valueClass: "text-amber-300",
    },
    {
      titleLines: ["التوقع", "بالملي"],
      value: stats.exactCorrect,
      icon: "🔥",
      valueClass: "text-emerald-300",
    },
    {
      titleLines: ["نسبة", "النجاح"],
      value: `${stats.successRate.toFixed(1)}%`,
      icon: "📊",
      valueClass: "text-sky-300",
    },
    {
      titleLines: ["المباريات", "المحتسبة"],
      value: stats.calculatedMatches,
      icon: "🏟️",
      valueClass: "text-white",
    },
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/10 p-3 shadow-2xl md:p-5">
      <div className="mb-3 text-center md:mb-4">
        <h2 className="text-lg font-black md:text-2xl">📊 إحصائيات المنصة</h2>
        <p className="mt-1 text-[11px] text-slate-300 md:text-sm">
          أرقام مباشرة تتحدث تلقائيًا مع توقعات الأعضاء واحتساب النتائج.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {cards.map((card) => (
          <div
            key={card.titleLines.join("-")}
            className="flex min-h-[118px] flex-col items-center rounded-2xl border border-white/10 bg-slate-950/50 px-1.5 py-2 text-center shadow-lg md:min-h-[145px] md:px-3 md:py-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg md:h-10 md:w-10 md:text-xl">
              {card.icon}
            </div>

            <div className="mt-2 flex h-[30px] w-full flex-col items-center justify-center gap-0.5 text-center text-[9px] font-bold leading-none text-slate-300 md:h-[36px] md:text-xs">
              <span className="block w-full text-center whitespace-nowrap">
                {card.titleLines[0]}
              </span>
              <span className="block w-full text-center whitespace-nowrap">
                {card.titleLines[1]}
              </span>
            </div>

            <div
              className={`mt-auto w-full text-center text-[16px] font-black leading-none md:text-3xl ${card.valueClass}`}
            >
              {loading ? "..." : card.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}