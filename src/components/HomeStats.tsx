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
      title: "إجمالي التوقعات",
      value: stats.totalPredictions,
      description: "جميع التوقعات المسجلة من الأعضاء",
      icon: "🎯",
      valueClass: "text-white",
    },
    {
      title: "توقع الفائز الصحيح",
      value: stats.winnerCorrect,
      description: "توقعات أصابت الفائز الصحيح",
      icon: "🏆",
      valueClass: "text-amber-300",
    },
    {
      title: "التوقع الصحيح بالملي",
      value: stats.exactCorrect,
      description: "أصابت النتيجة الصحيحة",
      icon: "🔥",
      valueClass: "text-emerald-300",
    },
    {
      title: "نسبة النجاح",
      value: `${stats.successRate.toFixed(1)}%`,
      description: "من التوقعات التي تم احتسابها",
      icon: "📊",
      valueClass: "text-sky-300",
    },
    {
      title: "المباريات المحتسبة",
      value: stats.calculatedMatches,
      description: "مباريات تم احتساب نتائجها وتوزيع نقاطها",
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
            key={card.title}
            className="rounded-2xl border border-white/10 bg-slate-950/50 p-2 text-center shadow-lg"
          >
            <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-base md:h-10 md:w-10 md:text-xl">
              {card.icon}
            </div>

            <div className="min-h-[30px] text-[9px] font-bold leading-4 text-slate-300 md:text-xs">
              {card.title}
            </div>

            <div className={`mt-1 text-lg font-black md:text-3xl ${card.valueClass}`}>
              {loading ? "..." : card.value}
            </div>

            <div className="mt-1 hidden text-[10px] leading-5 text-slate-400 md:block md:text-[11px]">
              {card.description}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}