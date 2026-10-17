import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import { GULF_CUP_27_MATCHES, GULF_CUP_27_TOURNAMENT_ID } from "@/domain/tournaments";
import { evaluateGulfCup27Finalization, type FinalizationMatch } from "@/lib/gulfCup27FinalizationPolicy";

const tournamentId = GULF_CUP_27_TOURNAMENT_ID;
const expectedMatchIds = GULF_CUP_27_MATCHES.map((match) => match.id);

/**
 * Atomic, idempotent transition. Re-reads all matches in a Firestore transaction
 * so a concurrent undo cannot leave a finished tournament with pending results.
 */
export async function finalizeGulfCup27IfReady() {
  const tournamentRef = adminDb.collection("tournaments").doc(tournamentId);
  const matchesQuery = adminDb.collection("tournamentMatches").where("tournamentId", "==", tournamentId);
  return adminDb.runTransaction(async (tx) => {
    const tournamentSnap = await tx.get(tournamentRef);
    if (!tournamentSnap.exists) return { changed: false, reason: "tournament_not_initialized" };
    if (tournamentSnap.data()?.status === "finished") return { changed: false, reason: "already_finished" };
    if (tournamentSnap.data()?.status !== "active") return { changed: false, reason: "not_active" };
    const matchesSnap = await tx.get(matchesQuery);
    const decision = evaluateGulfCup27Finalization(
      matchesSnap.docs.map((item) => ({ ...item.data(), id: String(item.data().id || item.id) } as FinalizationMatch)),
      expectedMatchIds,
    );
    if (!decision.ready) return { changed: false, reason: decision.reason };
    const now = Date.now();
    tx.set(tournamentRef, {
      status: "finished",
      displayStatusOverride: "finished",
      isCurrent: false,
      finalizedAt: now,
      finalizationSource: "automatic",
      finalMatchId: "g27-final",
      championTeamId: decision.championTeamId,
      finalizedMatchCount: decision.matchCount,
      updatedAt: now,
    }, { merge: true });
    return { changed: true, championTeamId: decision.championTeamId, matchCount: decision.matchCount };
  });
}

/** Undo is deliberately performed AFTER the match has been reset. */
export async function reopenGulfCup27AfterUndo(tournamentIdInput: string) {
  if (tournamentIdInput !== tournamentId) return false;
  const tournamentRef = adminDb.collection("tournaments").doc(tournamentId);
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(tournamentRef);
    if (!snap.exists || snap.data()?.status !== "finished" || snap.data()?.finalizationSource !== "automatic") return false;
    const now = Date.now();
    tx.set(tournamentRef, {
      status: "active",
      displayStatusOverride: "active",
      isCurrent: true,
      finalizedAt: null,
      finalizationSource: null,
      finalMatchId: null,
      championTeamId: null,
      finalizedMatchCount: null,
      reopenedAt: now,
      updatedAt: now,
    }, { merge: true });
    return true;
  });
}

/** At most one periodic reconciliation per 30 minutes; result calculations bypass this throttle. */
export async function reconcileGulfCup27Finalization() {
  const now = Date.now();
  // Avoid polling match documents after the tournament has already closed.
  const tournamentSnap = await adminDb.collection("tournaments").doc(tournamentId).get();
  if (!tournamentSnap.exists || tournamentSnap.data()?.status !== "active") return { changed: false, reason: "not_active" };
  const stateRef = adminDb.collection("systemAutomationState").doc("gulf27-finalization");
  const acquired = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(stateRef);
    const last = Number(snap.data()?.lastCheckAt || 0);
    if (last > 0 && now - last < 30 * 60 * 1000) return false;
    tx.set(stateRef, { lastCheckAt: now }, { merge: true });
    return true;
  });
  return acquired ? finalizeGulfCup27IfReady() : { changed: false, reason: "throttled" };
}
