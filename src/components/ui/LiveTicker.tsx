"use client";
import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Prediction } from "@/types";

export default function LiveTicker() {
  const [tickerItems, setTickerItems] = useState<Prediction[]>([]);

  useEffect(() => {
    const q = query(collection(db, "Predictions"), orderBy("timestamp", "desc"), limit(5));
    return onSnapshot(q, (snapshot) => {
      const items: Prediction[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as Prediction));
      setTickerItems(items);
    });
  }, []);

  if (tickerItems.length === 0) return null;

  return (
    <div className="w-full bg-gradient-to-r from-brand-deep via-brand-purple to-brand-deep text-brand-gold py-2 overflow-hidden relative shadow-inner z-50">
      <div className="flex whitespace-nowrap gap-12 animate-marquee inline-block">
        {tickerItems.map((pred) => (
          <span key={pred.id} className="inline-flex items-center text-sm font-bold gap-1">
            🔥 {pred.userName} ({pred.favoriteTeam}) توقع نتيـجة المباراة برقم {pred.scoreA} - {pred.scoreB}
          </span>
        ))}
      </div>
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 25s linear infinite;
        }
      `}</style>
    </div>
  );
}