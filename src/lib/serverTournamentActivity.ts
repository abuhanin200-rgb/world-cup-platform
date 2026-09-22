import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  GULF_CUP_27_TOURNAMENT_ID,
  getGulfCup27Team,
} from "@/domain/tournaments";

const ROOT_COLLECTION = "tournamentActivity";
const EVENTS_COLLECTION = "events";

export type TournamentActivityEventType = "prediction" | "exact";

export type TournamentActivityEvent = {
  id: string;
  type: TournamentActivityEventType;
  tournamentId: string;
  matchId: string;
  userId: string;
  userName: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  resultHomeScore: number | null;
  resultAwayScore: number | null;
  createdAt: number;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function numberOrNull(value: unknown) {
  if (value == null || value === "") return null;
  const valueAsNumber = Number(value);
  return Number.isFinite(valueAsNumber) ? valueAsNumber : null;
}

function activityCollection(tournamentId: string) {
  return adminDb
    .collection(ROOT_COLLECTION)
    .doc(tournamentId)
    .collection(EVENTS_COLLECTION);
}

export async function writePredictionActivityServer(input: {
  tournamentId: string;
  matchId: string;
  userId: string;
  userName: string;
  homeTeamId: string;
  awayTeamId: string;
  createdAt: number;
}) {
  if (input.tournamentId !== GULF_CUP_27_TOURNAMENT_ID) return;
  const id = `prediction_${input.matchId}_${input.userId}`;
  await activityCollection(input.tournamentId).doc(id).set(
    {
      id,
      type: "prediction",
      tournamentId: input.tournamentId,
      matchId: input.matchId,
      userId: input.userId,
      userName: input.userName || "عضو",
      homeTeamId: input.homeTeamId,
      awayTeamId: input.awayTeamId,
      resultHomeScore: null,
      resultAwayScore: null,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    },
    { merge: true },
  );
}

export async function deletePredictionActivityServer(input: {
  tournamentId: string;
  matchId: string;
  userId: string;
}) {
  if (input.tournamentId !== GULF_CUP_27_TOURNAMENT_ID) return;
  await activityCollection(input.tournamentId)
    .doc(`prediction_${input.matchId}_${input.userId}`)
    .delete()
    .catch(() => undefined);
}

export async function writeExactHitActivitiesServer(input: {
  tournamentId: string;
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  resultHash: string;
  resultHomeScore: number;
  resultAwayScore: number;
  rows: Array<{ userId: string; userName: string; resultType: string }>;
  createdAt: number;
}) {
  if (input.tournamentId !== GULF_CUP_27_TOURNAMENT_ID) return;
  const exactRows = input.rows.filter((row) => row.resultType === "exact");
  if (!exactRows.length) return;

  for (let index = 0; index < exactRows.length; index += 350) {
    const batch = adminDb.batch();
    exactRows.slice(index, index + 350).forEach((row) => {
      const id = `exact_${input.matchId}_${row.userId}_${input.resultHash}`;
      batch.set(
        activityCollection(input.tournamentId).doc(id),
        {
          id,
          type: "exact",
          tournamentId: input.tournamentId,
          matchId: input.matchId,
          userId: row.userId,
          userName: row.userName || "عضو",
          homeTeamId: input.homeTeamId,
          awayTeamId: input.awayTeamId,
          resultHomeScore: input.resultHomeScore,
          resultAwayScore: input.resultAwayScore,
          createdAt: input.createdAt,
          updatedAt: input.createdAt,
        },
        { merge: true },
      );
    });
    await batch.commit();
  }
}

export async function deleteExactHitActivitiesServer(input: {
  tournamentId: string;
  matchId: string;
  resultHash: string | null;
  rows: Array<{ userId: string; resultType: string }>;
}) {
  if (
    input.tournamentId !== GULF_CUP_27_TOURNAMENT_ID ||
    !input.resultHash
  ) {
    return;
  }

  const exactRows = input.rows.filter((row) => row.resultType === "exact");
  if (!exactRows.length) return;

  for (let index = 0; index < exactRows.length; index += 350) {
    const batch = adminDb.batch();
    exactRows.slice(index, index + 350).forEach((row) => {
      batch.delete(
        activityCollection(input.tournamentId).doc(
          `exact_${input.matchId}_${row.userId}_${input.resultHash}`,
        ),
      );
    });
    await batch.commit();
  }
}


async function backfillTournamentActivityIfEmpty(tournamentId: string) {
  const target = activityCollection(tournamentId);
  const existing = await target.limit(1).get();
  if (!existing.empty) return;

  const [predictions, matches] = await Promise.all([
    adminDb.collection("tournamentPredictions").orderBy("updatedAt", "desc").limit(120).get(),
    adminDb.collection("tournamentMatches").where("tournamentId", "==", tournamentId).get(),
  ]);
  const matchMap = new Map(
    matches.docs.map((item) => {
      const data = item.data();
      return [clean(data.id) || item.id.replace(`${tournamentId}_`, ""), data] as const;
    }),
  );
  const relevant = predictions.docs.filter(
    (item) => clean(item.data().tournamentId) === tournamentId,
  );
  if (!relevant.length) return;

  for (let index = 0; index < relevant.length; index += 250) {
    const batch = adminDb.batch();
    relevant.slice(index, index + 250).forEach((item) => {
      const data = item.data();
      const matchId = clean(data.matchId);
      const userId = clean(data.userId);
      const match = (matchMap.get(matchId) || {}) as Record<string, unknown>;
      const homeTeamId = clean(match.homeTeamId);
      const awayTeamId = clean(match.awayTeamId);
      const createdAt = Number(data.updatedAt || data.submittedAt || Date.now());
      if (!matchId || !userId) return;

      const predictionId = `prediction_${matchId}_${userId}`;
      batch.set(
        target.doc(predictionId),
        {
          id: predictionId,
          type: "prediction",
          tournamentId,
          matchId,
          userId,
          userName: clean(data.userName) || "عضو",
          homeTeamId,
          awayTeamId,
          resultHomeScore: null,
          resultAwayScore: null,
          createdAt,
          updatedAt: createdAt,
          backfilled: true,
        },
        { merge: true },
      );

      const result = (match.result || {}) as Record<string, unknown>;
      const resultHash = clean(data.resultHash);
      if (
        data.isCalculated === true &&
        data.resultType === "exact" &&
        resultHash &&
        result.homeScore != null &&
        result.awayScore != null
      ) {
        const exactId = `exact_${matchId}_${userId}_${resultHash}`;
        const calculatedAt = Number(data.calculatedAt || createdAt);
        batch.set(
          target.doc(exactId),
          {
            id: exactId,
            type: "exact",
            tournamentId,
            matchId,
            userId,
            userName: clean(data.userName) || "عضو",
            homeTeamId,
            awayTeamId,
            resultHomeScore: Number(result.homeScore),
            resultAwayScore: Number(result.awayScore),
            createdAt: calculatedAt,
            updatedAt: calculatedAt,
            backfilled: true,
          },
          { merge: true },
        );
      }
    });
    await batch.commit();
  }
}

export async function getTournamentActivityServer(
  tournamentId: string,
  limit = 80,
): Promise<{
  predictions: TournamentActivityEvent[];
  exactHits: TournamentActivityEvent[];
}> {
  if (tournamentId !== GULF_CUP_27_TOURNAMENT_ID) {
    return { predictions: [], exactHits: [] };
  }

  await backfillTournamentActivityIfEmpty(tournamentId);

  const snapshot = await activityCollection(tournamentId)
    .orderBy("createdAt", "desc")
    .limit(Math.max(20, Math.min(160, limit)))
    .get();

  const events = snapshot.docs
    .map((doc) => {
      const data = doc.data();
      const type = data.type === "exact" ? "exact" : data.type === "prediction" ? "prediction" : null;
      if (!type) return null;
      const homeTeamId = clean(data.homeTeamId);
      const awayTeamId = clean(data.awayTeamId);
      return {
        id: clean(data.id) || doc.id,
        type,
        tournamentId: clean(data.tournamentId),
        matchId: clean(data.matchId),
        userId: clean(data.userId),
        userName: clean(data.userName) || "عضو",
        homeTeamId,
        awayTeamId,
        homeTeamName: getGulfCup27Team(homeTeamId)?.nameAr || "الفريق الأول",
        awayTeamName: getGulfCup27Team(awayTeamId)?.nameAr || "الفريق الثاني",
        resultHomeScore: numberOrNull(data.resultHomeScore),
        resultAwayScore: numberOrNull(data.resultAwayScore),
        createdAt: Number(data.createdAt || 0),
      } satisfies TournamentActivityEvent;
    })
    .filter((item): item is TournamentActivityEvent => Boolean(item));

  return {
    predictions: events.filter((item) => item.type === "prediction").slice(0, 40),
    exactHits: events.filter((item) => item.type === "exact").slice(0, 40),
  };
}
