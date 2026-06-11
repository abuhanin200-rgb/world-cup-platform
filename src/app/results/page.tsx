"use client";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Match } from "@/types";

export default function ResultsPage() {
  const [results, setResults] = useState<Match[]>([]);

  useEffect(() => {
    // جلب المباريات المنتهية فقط لعرض نتائجها النهائية للجمهور
    const q = query(collection(db, "Matches"), where("status", "==", "finished"));
    return onSnapshot(q, (snapshot) => {
      const data: Match[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Match));
      setResults(data);
    });
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-black text-slate-900 dark:text-white mb-2">🏆 نتائج المباريات النهائية</h1>
      <div className="flex flex-col gap-4">
        {results.map((m) => (
          <div key={m.id} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex justify-between items-center shadow-lg transition-all hover:shadow-xl">
            <div className="flex items-center gap-3 font-black text-sm flex-1 justify-end text-slate-900 dark:text-white">
              <span>{m.teamA}</span>
              <span className="text-3xl">{m.flagA}</span>
            </div>
            <div className="mx-6 px-5 py-2 bg-slate-100 dark:bg-slate-950 rounded-2xl font-mono text-xl font-black flex items-center gap-3 text-brand-purple dark:text-brand-gold border border-slate-200 dark:border-slate-800">
              <span>{m.scoreA}</span>
              <span className="text-brand-pink animate-pulse">:</span>
              <span>{m.scoreB}</span>
            </div>
            <div className="flex items-center gap-3 font-black text-sm flex-1 justify-start text-slate-900 dark:text-white">
              <span className="text-3xl">{m.flagB}</span>
              <span>{m.teamB}</span>
            </div>
          </div>
        ))}
        {results.length === 0 && (
          <p className="text-sm font-bold text-slate-400 text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            لم تنتهِ أي مباراة في التحدي حتى الآن ليتم إدراج نتائجها الرسمية.
          </p>
        )}
      </div>
    </div>
  );
}