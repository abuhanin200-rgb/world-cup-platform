"use client";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Match, Prediction } from "@/types";
import MatchCard from "@/components/ui/MatchCard";
import { useAuth } from "@/context/AuthContext";

export default function MatchesPage() {
  const { profile } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [userPredictions, setUserPredictions] = useState<Record<string, Prediction>>({});

  useEffect(() => {
    const qMatches = query(collection(db, "Matches"), orderBy("timestamp", "asc"));
    return onSnapshot(qMatches, (snapshot) => {
      const data: Match[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Match));
      setMatches(data);
    });
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    const qPreds = query(collection(db, "Predictions"));
    return onSnapshot(qPreds, (snapshot) => {
      const preds: Record<string, Prediction> = {};
      snapshot.forEach((doc) => {
        const p = doc.data() as Prediction;
        if (p.userId === profile.id) preds[p.matchId] = p;
      });
      setUserPredictions(preds);
    });
  }, [profile?.id]);

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-black text-slate-900 dark:text-white mb-2">📅 جدول مباريات البطولة بالكامل</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {matches.map((match) => (
          <MatchCard 
            key={match.id} 
            match={match} 
            currentUserId={profile?.id || ""} 
            userName={profile?.name || ""} 
            userFavoriteTeam={profile?.favoriteTeam || ""} 
            existingPrediction={userPredictions[match.id]}
          />
        ))}
      </div>
    </div>
  );
}