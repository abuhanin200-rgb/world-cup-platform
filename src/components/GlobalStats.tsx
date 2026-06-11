"use client";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GlobalStats as IGlobalStats } from "@/types";

export default function GlobalStats() {
  const [stats, setStats] = useState<IGlobalStats | null>(null);

  useEffect(() => {
    // الاستماع الفوري للتحديثات في مستند الإحصائيات العام
    return onSnapshot(doc(db, "Stats", "global"), (docSnap) => {
      if (docSnap.exists()) setStats(docSnap.data() as IGlobalStats);
    });
  }, []);

  if (!stats) {
    return (
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 opacity-55 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-5 h-24 border border-slate-100 dark:border-slate-800" />
        ))}
      </div>
    );
  }

  const statCards = [
    { title: "🏆 بطل اليوم", value: stats.todayHero || "في انتظار البطل", color: "from-amber-500 to-yellow-500" },
    { title: "🔥 الأكثر نشاطاً", value: stats.mostActiveUser || "جاري التحديد", color: "from-orange-500 to-red-500" },
    { title: "⭐ أعلى نسبة نجاح", value: stats.highestSuccessRate || "0%", color: "from-emerald-500 to-teal-500" },
    { title: "🎯 أصعب مباراة", value: stats.hardestMatch || "جاري الحساب", color: "from-blue-500 to-indigo-500" },
    { title: "❤️ أكثر المنتخبات تشجيعاً", value: stats.mostSupportedTeam || "🏳️", color: "from-purple-500 to-brand-pink" },
  ];

  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {statCards.map((card, idx) => (
        <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg border border-slate-100 dark:border-slate-800 flex flex-col justify-between transition-all hover:shadow-xl">
          <span className="text-xs text-slate-400 font-black mb-2 block">{card.title}</span>
          <span className={`text-base font-black bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}>
            {card.value}
          </span>
        </div>
      ))}
    </div>
  );
}