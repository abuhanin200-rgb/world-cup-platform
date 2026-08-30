import {
  collection,
  deleteDoc,
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
  const ref = doc(db, TOURNAMENT_V2_COLLECTIONS.predictions, predictionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("التوقع غير موجود");
  if (snap.data().isCalculated) throw new Error("تراجع عن احتساب المباراة أولًا قبل تعديل توقع محتسب");

  const prediction = snap.data();
  const matchRef = doc(db, TOURNAMENT_V2_COLLECTIONS.matches, `${clean(prediction.tournamentId)}_${clean(prediction.matchId)}`);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) throw new Error("المباراة المرتبطة بالتوقع غير موجودة");
  const match = matchSnap.data();
  let nextQualifiedTeamId = qualifiedTeamId || null;
  let nextQualificationMethod = qualificationMethod || null;
  if (match.stage === "group") {
    nextQualifiedTeamId = null;
    nextQualificationMethod = null;
  } else if (homeScore > awayScore) {
    nextQualifiedTeamId = clean(match.homeTeamId);
    nextQualificationMethod = "regular";
  } else if (awayScore > homeScore) {
    nextQualifiedTeamId = clean(match.awayTeamId);
    nextQualificationMethod = "regular";
  } else {
    if (![clean(match.homeTeamId), clean(match.awayTeamId)].includes(clean(nextQualifiedTeamId))) throw new Error("اختر المتأهل عند توقع التعادل");
    if (nextQualificationMethod !== "extra_time" && nextQualificationMethod !== "penalties") throw new Error("اختر طريقة التأهل عند توقع التعادل");
  }

  await updateDoc(ref, {
    homeScore,
    awayScore,
    qualifiedTeamId: nextQualifiedTeamId,
    qualificationMethod: nextQualificationMethod,
    updatedAt: Date.now(),
    updatedAtServer: serverTimestamp(),
  });
}

export async function deleteAdminTournamentPredictionV2(predictionId: string) {
  const ref = doc(db, TOURNAMENT_V2_COLLECTIONS.predictions, predictionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  if (snap.data().isCalculated) throw new Error("تراجع عن احتساب المباراة أولًا قبل حذف توقع محتسب");
  await deleteDoc(ref);
}

export async function deleteAdminTournamentMatchPredictionsV2(tournamentId: string, matchId: string) {
  const snapshot = await getDocs(query(
    collection(db, TOURNAMENT_V2_COLLECTIONS.predictions),
    where("tournamentId", "==", tournamentId),
    where("matchId", "==", matchId),
  ));
  if (snapshot.docs.some((item) => Boolean(item.data().isCalculated))) {
    throw new Error("يوجد توقعات محتسبة. تراجع عن احتساب المباراة أولًا");
  }
  const batch = writeBatch(db);
  snapshot.docs.forEach((item) => batch.delete(item.ref));
  await batch.commit();
  return snapshot.size;
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
