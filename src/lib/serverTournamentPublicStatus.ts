import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import { GULF_CUP_27_TOURNAMENT_ID, type Tournament } from "@/domain/tournaments";

/** Overlay only the public operational status; never replace registry metadata. */
export async function withLiveGulfCup27Status(tournament: Tournament): Promise<Tournament> {
  if (tournament.id !== GULF_CUP_27_TOURNAMENT_ID) return tournament;
  try {
    const snap = await adminDb.collection("tournaments").doc(tournament.id).get();
    const data = snap.data();
    if (data?.status === "finished" || data?.status === "active" || data?.status === "paused") {
      return { ...tournament, status: data.status, isCurrent: data.isCurrent === true };
    }
  } catch (error) {
    console.error("Unable to read public tournament status:", error);
  }
  return tournament;
}
