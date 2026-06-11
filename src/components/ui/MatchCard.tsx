"use client";
import { useState, useEffect } from "react";
import { Match, Prediction } from "@/types";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { motion } from "framer-motion";

interface MatchCardProps {
  match: Match;
  currentUserId?: string;
  userName?: string;
  userFavoriteTeam?: string;
  existingPrediction?: Prediction;
}

export default function MatchCard({ match, currentUserId, userName, userFavoriteTeam, existingPrediction }: MatchCardProps) {
  const [scoreA, setScoreA] = useState<number | string>(existingPrediction?.scoreA ?? "");
  const [scoreB, setScoreB] = useState<number | string>(existingPrediction?.scoreB ?? "");
  const [countdown, setCountdown] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = match.timestamp - now;
      if (diff <= 0) {
        setCountdown("بدأت المباراة");
        clearInterval(timer);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${hours}س : ${minutes}د : ${seconds}ث`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [match.timestamp]);

  const handleSavePrediction = async () => {
    if (!currentUserId || match.status === "closed" || match.status === "finished" || match.status === "live") return;
    if (scoreA === "" || scoreB === "" || Number(scoreA) < 0 || Number(scoreB) < 0) return;

    setSaving(true);
    const predId = `${currentUserId}_${match.id}`;
    const predictionData: Prediction = {
      id: predId,
      userId: currentUserId,
      userName: userName || "مشارك",
      favoriteTeam: userFavoriteTeam || "🏳️",
      matchId: match.id,
      scoreA: Number(scoreA),
      scoreB: Number(scoreB),
      timestamp: existingPrediction?.timestamp || Date.now(),
      lastUpdated: Date.now()
    };

    await setDoc(doc(db, "Predictions", predId), predictionData);
    setSaving(false);
  };

  const getStatusBadge = (status: Match["status"]) => {
    const classes: Record<string, string> = {
      open: "bg-green-500 text-white",
      closing_soon: "bg-yellow-500 text-slate-900 animate-pulse",
      closed: "bg-red-500 text-white",
      live: "bg-brand-pink text-white animate-bounce",
      finished: "bg-slate-500 text-white"
    };
    const labels: Record<string, string> = {
      open: "🟢 مفتوح",
      closing_soon: "🟡 سيغلق قريباً",
      closed: "🔴 مغلق",
      live: "⚽ مباشر",
      finished: "✅ انتهت"
    };
    return <span className={`px-3 py-1 rounded-full text-xs font-black ${classes[status]}`}>{labels[status]}</span>;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-3xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
        <span className="text-xs text-slate-400 font-bold">{match.group} • {match.round}</span>
        {getStatusBadge(match.status)}
      </div>

      <div className="text-center text-xs text-brand-purple dark:text-brand-gold font-bold">{match.stadium} | {match.date} {match.time}</div>

      <div className="flex items-center justify-between my-4 gap-2">
        <div className="flex flex-col items-center flex-1">
          <span className="text-4xl mb-1">{match.flagA}</span>
          <span className="font-black text-sm text-center">{match.teamA}</span>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-4 py-2 rounded-2xl">
          <input 
            type="number" 
            min="0" 
            value={scoreA} 
            onChange={(e) => setScoreA(e.target.value)}
            disabled={match.status !== "open" && match.status !== "closing_soon"}
            className="w-12 text-center font-black bg-transparent border-b-2 border-slate-300 dark:border-slate-700 focus:border-brand-purple outline-none text-xl text-slate-900 dark:text-white" 
          />
          <span className="font-bold text-slate-400">:</span>
          <input 
            type="number" 
            min="0" 
            value={scoreB} 
            onChange={(e) => setScoreB(e.target.value)}
            disabled={match.status !== "open" && match.status !== "closing_soon"}
            className="w-12 text-center font-black bg-transparent border-b-2 border-slate-300 dark:border-slate-700 focus:border-brand-purple outline-none text-xl text-slate-900 dark:text-white" 
          />
        </div>

        <div className="flex flex-col items-center flex-1">
          <span className="text-4xl mb-1">{match.flagB}</span>
          <span className="font-black text-sm text-center">{match.teamB}</span>
        </div>
      </div>

      {match.status === "live" && match.liveData && (
        <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-2xl text-xs flex flex-col gap-2 border border-red-100 dark:border-red-900/30">
          <div className="flex justify-between items-center text-brand-pink font-black">
            <span>⏱ الدقيقة {match.liveMinute}</span>
            <span>الأهداف المباشرة</span>
          </div>
          <div className="text-slate-500 dark:text-slate-3xl text-right">
            {match.liveData.goals.map((g, idx) => <div key={idx}>⚽ {g}</div>)}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-3 mt-2">
        <span className="text-xs font-mono tracking-widest text-brand-pink bg-brand-pink/10 px-4 py-1 rounded-full">{countdown}</span>
        {(match.status === "open" || match.status === "closing_soon") && currentUserId && (
          <button 
            onClick={handleSavePrediction}
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-brand-purple text-white font-bold text-sm shadow-md shadow-brand-purple/20 hover:bg-brand-deep transition-all"
          >
            {saving ? "جاري الحفظ..." : "حفظ التوقع"}
          </button>
        )}
      </div>
    </motion.div>
  );
}