import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { requestAdminTournamentPredictionActionV2 } from "./adminTournamentPredictionsApiV2";
import type { TournamentPredictionV2, TournamentQualificationMethod } from "@/domain/tournaments";
import { TOURNAMENT_V2_COLLECTIONS, getTournamentMatchesV2, type TournamentMatchRuntimeV2 } from "@/lib/tournamentV2Firestore";

export type AdminTournamentPredictionV2 = TournamentPredictionV2 & {
  match: TournamentMatchRuntimeV2 | null;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function mapPrediction(id: string, data: Record<string, unknown>): TournamentPredictionV2 {
  const breakdown = data.pointsBreakdown && typeof data.pointsBreakdown === "object"
    ? data.pointsBreakdown as Record<string, unknown>
    : null;
  return {
    id,
    tournamentId: clean(data.tournamentId),
    matchId: clean(data.matchId),
    userId: clean(data.userId),
    userName: clean(data.userName),
    homeScore: toNumber(data.homeScore),
    awayScore: toNumber(data.awayScore),
    qualifiedTeamId: data.qualifiedTeamId ? clean(data.qualifiedTeamId) : null,
    qualificationMethod: (data.qualificationMethod || null) as TournamentQualificationMethod | null,
    points: data.points == null ? null : toNumber(data.points),
    pointsBreakdown: breakdown ? {
      score: toNumber(breakdown.score),
      qualified: toNumber(breakdown.qualified),
      method: toNumber(breakdown.method),
    } : null,
    isCalculated: Boolean(data.isCalculated),
    resultType: (data.resultType || null) as TournamentPredictionV2["resultType"],
    submittedAt: toNumber(data.submittedAt),
    updatedAt: toNumber(data.updatedAt),
    calculatedAt: data.calculatedAt == null ? null : toNumber(data.calculatedAt),
    scoringVersion: data.scoringVersion ? clean(data.scoringVersion) : null,
    resultHash: data.resultHash ? clean(data.resultHash) : null,
    calculationRunId: data.calculationRunId ? clean(data.calculationRunId) : null,
  };
}

export async function getAdminTournamentPredictionsV2(tournamentId: string): Promise<AdminTournamentPredictionV2[]> {
  const [snapshot, matches] = await Promise.all([
    getDocs(query(collection(db, TOURNAMENT_V2_COLLECTIONS.predictions), where("tournamentId", "==", tournamentId))),
    getTournamentMatchesV2(tournamentId, { fallback: false }),
  ]);
  const matchMap = new Map(matches.map((match) => [match.id, match]));
  return snapshot.docs
    .map((item) => {
      const prediction = mapPrediction(item.id, item.data() as Record<string, unknown>);
      return { ...prediction, match: matchMap.get(prediction.matchId) ?? null };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function updateAdminTournamentPredictionV2({
  predictionId,
  homeScore,
  awayScore,
  qualifiedTeamId,
  qualificationMethod,
}: {
  predictionId: string;
  homeScore: number;
  awayScore: number;
  qualifiedTeamId?: string | null;
  qualificationMethod?: TournamentQualificationMethod | null;
}) {
  if (!Number.isInteger(homeScore) || homeScore < 0 || homeScore > 30 || !Number.isInteger(awayScore) || awayScore < 0 || awayScore > 30) {
    throw new Error("النتيجة يجب أن تكون بين 0 و30");
  }
  await requestAdminTournamentPredictionActionV2({
    action: "update_prediction",
    predictionId,
    homeScore,
    awayScore,
    qualifiedTeamId: qualifiedTeamId || null,
    qualificationMethod: qualificationMethod || null,
  });
}

export async function deleteAdminTournamentPredictionV2(predictionId: string) {
  await requestAdminTournamentPredictionActionV2({
    action: "delete_prediction",
    predictionId,
  });
}

export async function deleteAdminTournamentMatchPredictionsV2(tournamentId: string, matchId: string) {
  const result = await requestAdminTournamentPredictionActionV2<{ deleted: number }>({
    action: "delete_match_predictions",
    tournamentId,
    matchId,
  });
  return result.deleted;
}

export async function setTournamentPredictionEditingV2(tournamentId: string, matchId: string, open: boolean) {
  const ref = doc(db, TOURNAMENT_V2_COLLECTIONS.matches, `${tournamentId}_${matchId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("المباراة غير موجودة");
  await updateDoc(ref, {
    predictionEditingIsOpen: open,
    updatedAt: Date.now(),
    updatedAtServer: serverTimestamp(),
  });
}

export async function setAllTournamentPredictionEditingV2(tournamentId: string, open: boolean) {
  const matches = await getTournamentMatchesV2(tournamentId, { fallback: false });
  const batch = writeBatch(db);
  matches.forEach((match) => {
    batch.update(doc(db, TOURNAMENT_V2_COLLECTIONS.matches, `${tournamentId}_${match.id}`), {
      predictionEditingIsOpen: open,
      updatedAt: Date.now(),
    });
  });
  await batch.commit();
  return matches.length;
}
