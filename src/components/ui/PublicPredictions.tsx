"use client";
import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Prediction } from "@/types";

export default function PublicPredictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  useEffect(() => {
    // جلب آخر 20 توقعاً تم تسجيلها في المنصة بشكل حي ومباشر
    const q = query(collection(db, "Predictions"), orderBy("timestamp", "desc"), limit(20));
    return onSnapshot(q, (snapshot) => {
      const data: Prediction[] = [];
      snapshot.forEach((doc) => data.push(doc.data() as Prediction));
      setPredictions(data);
    });
  }, []);

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800">
      <h2 className="text-xl font-black text-brand-deep dark:text-white mb-6">🔮 توقعات الجماهير المباشرة</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {predictions.map((pred) => (
          <div key={pred.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex flex-col gap-1 transition-all hover:border-brand-purple/30">
            <div className="flex justify-between items-center">
              <span className="font-black text-sm text-slate-700 dark:text-slate-200">{pred.userName}</span>
              <span className="text-xs text-slate-400 font-mono bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">{pred.favoriteTeam}</span>
            </div>
            <div className="text-center font-bold text-sm bg-brand-deep/5 dark:bg-white/5 py-2 rounded-xl mt-2 text-brand-purple dark:text-brand-gold">
               مباراة رقم {pred.matchId.substring(0, 6)} 👈 النتيجة المتوقعة: {pred.scoreA} - {pred.scoreB}
            </div>
          </div>
        ))}
        {predictions.length === 0 && (
          <p className="text-sm font-bold text-slate-400 text-center py-4 col-span-2">لا توجد توقعات مسجلة حالياً.</p>
        )}
      </div>
    </div>
  );
}