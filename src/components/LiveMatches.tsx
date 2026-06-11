"use client";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Match } from "@/types";
import { motion } from "framer-motion";

export default function LiveMatches() {
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);

  useEffect(() => {
    // جلب المباريات المباشرة فقط في الوقت الفعلي
    const q = query(collection(db, "Matches"), where("status", "==", "live"));
    return onSnapshot(q, (snapshot) => {
      const data: Match[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Match));
      setLiveMatches(data);
    });
  }, []);

  // إذا لم تكن هناك مباراة مباشرة حالياً، يختفي المكون تماماً من الصفحة
  if (liveMatches.length === 0) return null;

  return (
    <div className="w-full bg-gradient-to-br from-red-500/10 to-brand-pink/10 rounded-3xl p-6 border border-red-200 dark:border-red-900/30 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black text-red-600 dark:text-brand-pink flex items-center gap-2 animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
          <span>المباريات المباشرة الآن ⚽</span>
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {liveMatches.map((match) => (
          <motion.div
            key={match.id}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg border border-red-100 dark:border-red-950 flex flex-col gap-3 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-red-500 to-brand-pink" />
            
            <div className="flex justify-between items-center text-xs font-bold text-slate-400">
              <span>{match.group} • {match.round}</span>
              <span className="text-red-500 font-black bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded-full">الدقيقة: {match.liveMinute}'</span>
            </div>

            <div className="flex items-center justify-between my-2">
              <div className="flex flex-col items-center flex-1">
                <span className="text-4xl">{match.flagA}</span>
                <span className="font-black text-sm mt-1">{match.teamA}</span>
              </div>

              <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 dark:bg-slate-950 rounded-xl font-mono text-2xl font-black text-slate-900 dark:text-white">
                <span>{match.scoreA ?? 0}</span>
                <span className="text-red-500 animate-pulse">:</span>
                <span>{match.scoreB ?? 0}</span>
              </div>

              <div className="flex flex-col items-center flex-1">
                <span className="text-4xl">{match.flagB}</span>
                <span className="font-black text-sm mt-1">{match.teamB}</span>
              </div>
            </div>

            {match.liveData && match.liveData.goals.length > 0 && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="font-bold mb-1 text-slate-700 dark:text-slate-300">أحداث المباراة اللحظية:</div>
                <div className="flex flex-col gap-1">
                  {match.liveData.goals.map((g, i) => (
                    <div key={i} className="flex items-center gap-1">⚽ {g}</div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}