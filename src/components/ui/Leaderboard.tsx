"use client";
import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/types";

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<UserProfile[]>([]);

  useEffect(() => {
    // جلب أعلى 10 مشاركين نقاطاً بتحديث حي ومباشر
    const q = query(collection(db, "Users"), orderBy("points", "desc"), limit(10));
    return onSnapshot(q, (snapshot) => {
      const data: UserProfile[] = [];
      snapshot.forEach((doc) => data.push(doc.data() as UserProfile));
      setLeaders(data);
    });
  }, []);

  const getRankBadge = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return index + 1;
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800">
      <h2 className="text-xl font-black text-brand-deep dark:text-white mb-6 flex items-center gap-2">
        <span>🏆 لوحة الصدارة لعام 2026</span>
      </h2>
      <div className="flex flex-col gap-3">
        {leaders.map((leader, idx) => (
          <div key={leader.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 transition-transform hover:scale-[1.01]">
            <div className="flex items-center gap-4">
              <span className="font-black text-lg w-8 text-center text-slate-900 dark:text-white">{getRankBadge(idx)}</span>
              <div className="flex flex-col">
                <span className="font-black text-sm flex items-center gap-1.5 text-slate-900 dark:text-white">
                  {leader.name}
                  <span className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full font-mono text-slate-700 dark:text-slate-300">{leader.favoriteTeam}</span>
                </span>
                <span className="text-xs text-slate-400">التوقعات الصحيحة: {leader.correctPredictionsCount}</span>
              </div>
            </div>
            <div className="text-left">
              <span className="text-xl font-black text-brand-purple dark:text-brand-gold">{leader.points}</span>
              <span className="text-xs text-slate-400 block font-bold">نقطة</span>
            </div>
          </div>
        ))}
        {leaders.length === 0 && (
          <p className="text-sm font-bold text-slate-400 text-center py-4">جاري تحميل قائمة المتصدرين...</p>
        )}
      </div>
    </div>
  );
}