"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { GULF_CUP_27_TOURNAMENT_ID, type Tournament } from "@/domain/tournaments";
import { db } from "@/lib/firebase";
import TournamentTopThreePodium from "@/components/TournamentTopThreePodium";
import GulfCup27ChampionsPodium from "@/components/GulfCup27ChampionsPodium";

/**
 * The registry's tournament.status is static. Read the authoritative Firestore
 * lifecycle state instead of treating the tournament end date as final approval.
 * This component is mounted only on Gulf Cup 27's overview page.
 */
export default function GulfCup27PodiumSwitch({ tournament }: { tournament: Tournament }) {
  const [finished, setFinished] = useState<boolean | null>(
    tournament.status === "finished" ? true : null,
  );

  useEffect(() => {
    return onSnapshot(
      doc(db, "tournaments", GULF_CUP_27_TOURNAMENT_ID),
      (snapshot) => {
        // Do not award final positions based on dates or missing documents.
        setFinished(snapshot.exists() && snapshot.data().status === "finished");
      },
      (error) => {
        console.error("Gulf Cup 27 podium status error:", error);
        // When Firestore is unavailable, do not mistakenly present live
        // standings as confirmed champions.
        setFinished(tournament.status === "finished");
      },
    );
  }, [tournament.status]);

  if (finished === null) {
    return (
      <section aria-label="جاري التحقق من حالة خليجي 27" className="mt-3 animate-pulse rounded-[24px] border border-white/10 bg-white/[0.04] p-5 md:mt-4">
        <div className="h-5 w-44 rounded-lg bg-white/10" />
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="h-36 rounded-2xl bg-white/[0.06]" />
          <div className="h-36 rounded-2xl bg-white/[0.08]" />
          <div className="h-36 rounded-2xl bg-white/[0.06]" />
        </div>
      </section>
    );
  }

  return finished
    ? <GulfCup27ChampionsPodium tournament={tournament} />
    : <TournamentTopThreePodium tournament={tournament} />;
}
