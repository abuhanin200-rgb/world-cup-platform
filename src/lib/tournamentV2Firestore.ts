import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  GULF_CUP_27_GROUP_MATCHES,
  GULF_CUP_27_KNOCKOUT_MATCHES,
  GULF_CUP_27_MATCHES,
  GULF_CUP_27_TEAMS,
  GULF_CUP_27_TOURNAMENT,
  GULF_CUP_27_TOURNAMENT_ID,
  GULF_CUP_27_KNOCKOUT_SCORING_VERSION,
  GULF_CUP_27_SCORING_VERSION,
  getGulfCup27Team,
  calculateTournamentGroupStandingsV2,
  createTournamentResultHash,
  scoreGulfCup27KnockoutPredictionV1,
  scoreGulfCup27PredictionV1,
  validateKnockoutResultV2,
  type TournamentMatchV2,
  type TournamentPredictionV2,
  type TournamentQualificationMethod,
  type TournamentTeamV2,
  type TournamentUserStatsV2,
} from "@/domain/tournaments";
import { sendTournamentCalculationNotificationsV2 } from "./tournamentNotificationsV2";
import { rebuildTournamentAchievementsV2 } from "./tournamentEngagementV2";

export const TOURNAMENT_V2_COLLECTIONS = {
  tournaments: "tournaments",
  teams: "tournamentTeams",
  matches: "tournamentMatches",
  predictions: "tournamentPredictions",
  userStats: "tournamentUserStats",
} as const;

export type TournamentMatchRuntimeV2 = TournamentMatchV2 & {
  predictionIsOpen: boolean;
  predictionEditingIsOpen: boolean;
  calculationStatus: "not_calculated" | "processing" | "calculated" | "error";
  calculationVersion: string | null;
  resultHash: string | null;
  calculatedAt: number | null;
  calculatedPredictions: number;
  createdAt?: number;
  updatedAt?: number;
};

export type SaveTournamentPredictionInput = {
  tournamentId: string;
  matchId: string;
  userId: string;
  userName: string;
  homeScore: number;
  awayScore: number;
  qualifiedTeamId?: string | null;
  qualificationMethod?: TournamentQualificationMethod | null;
};

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function isValidScore(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 30;
}

function entityDocId(tournamentId: string, entityId: string) {
  return `${tournamentId}_${entityId}`;
}

function predictionDocId(
  tournamentId: string,
  userId: string,
  matchId: string,
) {
  return `${tournamentId}_${userId}_${matchId}`;
}

function statsDocId(tournamentId: string, userId: string) {
  return `${tournamentId}_${userId}`;
}

function dropUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function mapMatchDoc(
  id: string,
  data: Record<string, unknown>,
): TournamentMatchRuntimeV2 {
  const resultData =
    data.result && typeof data.result === "object"
      ? (data.result as Record<string, unknown>)
      : {};

  return {
    id: cleanText(data.id) || id.replace(`${cleanText(data.tournamentId)}_`, ""),
    tournamentId: cleanText(data.tournamentId),
    stage: data.stage === "knockout" ? "knockout" : "group",
    round: cleanText(data.round),
    group: data.group ? cleanText(data.group) : null,
    homeTeamId: cleanText(data.homeTeamId),
    awayTeamId: cleanText(data.awayTeamId),
    homeSourceLabel: data.homeSourceLabel ? cleanText(data.homeSourceLabel) : null,
    awaySourceLabel: data.awaySourceLabel ? cleanText(data.awaySourceLabel) : null,
    kickoffAt: toNumber(data.kickoffAt),
    stadium: cleanText(data.stadium),
    city: cleanText(data.city),
    status:
      data.status === "prediction_open" ||
      data.status === "live" ||
      data.status === "finished" ||
      data.status === "postponed" ||
      data.status === "cancelled"
        ? data.status
        : "scheduled",
    predictionOpensAt:
      data.predictionOpensAt == null
        ? null
        : toNumber(data.predictionOpensAt),
    predictionClosesAt:
      data.predictionClosesAt == null
        ? null
        : toNumber(data.predictionClosesAt),
    predictionIsOpen: Boolean(data.predictionIsOpen),
    predictionEditingIsOpen: data.predictionEditingIsOpen !== false,
    calculationStatus:
      data.calculationStatus === "processing" ||
      data.calculationStatus === "calculated" ||
      data.calculationStatus === "error"
        ? data.calculationStatus
        : "not_calculated",
    calculationVersion: data.calculationVersion
      ? cleanText(data.calculationVersion)
      : null,
    resultHash: data.resultHash ? cleanText(data.resultHash) : null,
    calculatedAt:
      data.calculatedAt == null ? null : toNumber(data.calculatedAt),
    calculatedPredictions: toNumber(data.calculatedPredictions),
    result: {
      homeScore:
        resultData.homeScore == null ? null : toNumber(resultData.homeScore),
      awayScore:
        resultData.awayScore == null ? null : toNumber(resultData.awayScore),
      extraTimeHomeScore:
        resultData.extraTimeHomeScore == null
          ? null
          : toNumber(resultData.extraTimeHomeScore),
      extraTimeAwayScore:
        resultData.extraTimeAwayScore == null
          ? null
          : toNumber(resultData.extraTimeAwayScore),
      penaltiesHomeScore:
        resultData.penaltiesHomeScore == null
          ? null
          : toNumber(resultData.penaltiesHomeScore),
      penaltiesAwayScore:
        resultData.penaltiesAwayScore == null
          ? null
          : toNumber(resultData.penaltiesAwayScore),
      qualifiedTeamId: resultData.qualifiedTeamId
        ? cleanText(resultData.qualifiedTeamId)
        : null,
      qualificationMethod:
        resultData.qualificationMethod === "regular" ||
        resultData.qualificationMethod === "extra_time" ||
        resultData.qualificationMethod === "penalties"
          ? resultData.qualificationMethod
          : null,
    },
    createdAt: data.createdAt == null ? undefined : toNumber(data.createdAt),
    updatedAt: data.updatedAt == null ? undefined : toNumber(data.updatedAt),
  };
}

function mapPredictionDoc(
  id: string,
  data: Record<string, unknown>,
): TournamentPredictionV2 {
  return {
    id,
    tournamentId: cleanText(data.tournamentId),
    matchId: cleanText(data.matchId),
    userId: cleanText(data.userId),
    userName: cleanText(data.userName),
    homeScore: toNumber(data.homeScore),
    awayScore: toNumber(data.awayScore),
    qualifiedTeamId: data.qualifiedTeamId
      ? cleanText(data.qualifiedTeamId)
      : null,
    qualificationMethod:
      data.qualificationMethod === "regular" ||
      data.qualificationMethod === "extra_time" ||
      data.qualificationMethod === "penalties"
        ? data.qualificationMethod
        : null,
    points: data.points == null ? null : toNumber(data.points),
    pointsBreakdown:
      data.pointsBreakdown && typeof data.pointsBreakdown === "object"
        ? {
            score: toNumber((data.pointsBreakdown as Record<string, unknown>).score),
            qualified: toNumber((data.pointsBreakdown as Record<string, unknown>).qualified),
            method: toNumber((data.pointsBreakdown as Record<string, unknown>).method),
          }
        : null,
    isCalculated: Boolean(data.isCalculated),
    resultType:
      data.resultType === "exact" ||
      data.resultType === "outcome" ||
      data.resultType === "wrong"
        ? data.resultType
        : null,
    submittedAt: toNumber(data.submittedAt),
    updatedAt: toNumber(data.updatedAt),
    calculatedAt:
      data.calculatedAt == null ? null : toNumber(data.calculatedAt),
    scoringVersion: data.scoringVersion ? cleanText(data.scoringVersion) : null,
    resultHash: data.resultHash ? cleanText(data.resultHash) : null,
    calculationRunId: data.calculationRunId
      ? cleanText(data.calculationRunId)
      : null,
  };
}

function mapUserStatsDoc(
  id: string,
  data: Record<string, unknown>,
): TournamentUserStatsV2 {
  return {
    id,
    tournamentId: cleanText(data.tournamentId),
    userId: cleanText(data.userId),
    fullName: cleanText(data.fullName) || "عضو",
    points: toNumber(data.points),
    rank: data.rank == null ? null : toNumber(data.rank),
    played: toNumber(data.played),
    exact: toNumber(data.exact),
    correctOutcome: toNumber(data.correctOutcome),
    wrong: toNumber(data.wrong),
    currentStreak: toNumber(data.currentStreak),
    bestStreak: toNumber(data.bestStreak),
    updatedAt: toNumber(data.updatedAt),
  };
}

function getGulfStaticFallback(): TournamentMatchRuntimeV2[] {
  return GULF_CUP_27_MATCHES.map((match) => ({
    ...match,
    predictionIsOpen: false,
    predictionEditingIsOpen: true,
    calculationStatus: "not_calculated",
    calculationVersion: null,
    resultHash: null,
    calculatedAt: null,
    calculatedPredictions: 0,
  }));
}

export async function initializeGulfCup27V2Data() {
  const now = Date.now();
  const existingMatches = await getTournamentMatchesV2(
    GULF_CUP_27_TOURNAMENT_ID,
    { fallback: false },
  );
  const existingMatchIds = new Set(existingMatches.map((match) => match.id));
  const batch = writeBatch(db);

  batch.set(
    doc(db, TOURNAMENT_V2_COLLECTIONS.tournaments, GULF_CUP_27_TOURNAMENT_ID),
    {
      ...dropUndefined(GULF_CUP_27_TOURNAMENT),
      schemaVersion: 2,
      initializedAt: now,
      updatedAt: now,
      updatedAtServer: serverTimestamp(),
    },
    { merge: true },
  );

  GULF_CUP_27_TEAMS.forEach((team) => {
    batch.set(
      doc(
        db,
        TOURNAMENT_V2_COLLECTIONS.teams,
        entityDocId(GULF_CUP_27_TOURNAMENT_ID, team.id),
      ),
      {
        ...dropUndefined(team),
        schemaVersion: 2,
        updatedAt: now,
      },
      { merge: true },
    );
  });

  GULF_CUP_27_MATCHES.forEach((match) => {
    if (existingMatchIds.has(match.id)) return;

    batch.set(
      doc(
        db,
        TOURNAMENT_V2_COLLECTIONS.matches,
        entityDocId(GULF_CUP_27_TOURNAMENT_ID, match.id),
      ),
      {
        ...dropUndefined(match),
        predictionIsOpen: false,
        predictionEditingIsOpen: true,
        schemaVersion: 2,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
  });

  await batch.commit();

  return {
    tournamentId: GULF_CUP_27_TOURNAMENT_ID,
    teams: GULF_CUP_27_TEAMS.length,
    matches: GULF_CUP_27_MATCHES.length,
    existingMatches: existingMatchIds.size,
  };
}

export async function getTournamentTeamsV2(
  tournamentId: string,
): Promise<TournamentTeamV2[]> {
  const q = query(
    collection(db, TOURNAMENT_V2_COLLECTIONS.teams),
    where("tournamentId", "==", tournamentId),
  );
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((item) => item.data() as TournamentTeamV2)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getTournamentMatchesV2(
  tournamentId: string,
  options?: { fallback?: boolean },
): Promise<TournamentMatchRuntimeV2[]> {
  const q = query(
    collection(db, TOURNAMENT_V2_COLLECTIONS.matches),
    where("tournamentId", "==", tournamentId),
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    if (
      options?.fallback !== false &&
      tournamentId === GULF_CUP_27_TOURNAMENT_ID
    ) {
      return getGulfStaticFallback();
    }

    return [];
  }

  return snapshot.docs
    .map((item) => mapMatchDoc(item.id, item.data()))
    .sort((a, b) => a.kickoffAt - b.kickoffAt);
}


async function deleteTournamentPredictionsForMatchV2(
  tournamentId: string,
  matchId: string,
) {
  const q = query(
    collection(db, TOURNAMENT_V2_COLLECTIONS.predictions),
    where("tournamentId", "==", tournamentId),
    where("matchId", "==", matchId),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return 0;

  const operations = snapshot.docs.map(
    (item) => (batch: ReturnType<typeof writeBatch>) => batch.delete(item.ref),
  );
  await commitChunked(operations);
  return snapshot.size;
}

export async function syncGulfCup27KnockoutBracketV2() {
  const now = Date.now();

  // تأكد أن مباريات الإقصائيات الثلاث موجودة حتى لو كانت البطولة قد هُيئت قبل هذه الدفعة.
  const existingBefore = await getTournamentMatchesV2(
    GULF_CUP_27_TOURNAMENT_ID,
    { fallback: false },
  );
  const existingIds = new Set(existingBefore.map((match) => match.id));
  const createBatch = writeBatch(db);
  let created = 0;

  GULF_CUP_27_KNOCKOUT_MATCHES.forEach((match) => {
    if (existingIds.has(match.id)) return;
    created += 1;
    createBatch.set(
      doc(
        db,
        TOURNAMENT_V2_COLLECTIONS.matches,
        entityDocId(GULF_CUP_27_TOURNAMENT_ID, match.id),
      ),
      {
        ...dropUndefined(match),
        predictionIsOpen: false,
        predictionEditingIsOpen: true,
        schemaVersion: 2,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
  });

  if (created > 0) {
    await createBatch.commit();
  }

  const matches = await getTournamentMatchesV2(
    GULF_CUP_27_TOURNAMENT_ID,
    { fallback: false },
  );
  const groupMatches = matches.filter((match) => match.stage === "group");
  const allGroupsFinished =
    groupMatches.length >= GULF_CUP_27_GROUP_MATCHES.length &&
    groupMatches.every(
      (match) =>
        match.status === "finished" &&
        match.result.homeScore != null &&
        match.result.awayScore != null,
    );

  const changes: Array<{
    matchId: string;
    homeTeamId: string;
    awayTeamId: string;
    predictionsCleared: number;
  }> = [];

  async function assignMatch(
    matchId: string,
    homeTeamId: string,
    awayTeamId: string,
  ) {
    if (!homeTeamId || !awayTeamId) return;

    const current = matches.find((match) => match.id === matchId);
    if (!current) return;

    if (
      current.homeTeamId === homeTeamId &&
      current.awayTeamId === awayTeamId
    ) {
      return;
    }

    if (current.calculationStatus === "calculated") {
      return;
    }

    const predictionsCleared = await deleteTournamentPredictionsForMatchV2(
      GULF_CUP_27_TOURNAMENT_ID,
      matchId,
    );

    await setDoc(
      doc(
        db,
        TOURNAMENT_V2_COLLECTIONS.matches,
        entityDocId(GULF_CUP_27_TOURNAMENT_ID, matchId),
      ),
      {
        homeTeamId,
        awayTeamId,
        predictionIsOpen: false,
        status: "scheduled",
        predictionOpensAt: null,
        predictionClosesAt: current.kickoffAt,
        updatedAt: Date.now(),
        updatedAtServer: serverTimestamp(),
      },
      { merge: true },
    );

    changes.push({
      matchId,
      homeTeamId,
      awayTeamId,
      predictionsCleared,
    });
  }

  async function clearMatchAssignment(matchId: string) {
    const current = matches.find((match) => match.id === matchId);
    if (!current || current.calculationStatus === "calculated") return;
    if (!current.homeTeamId && !current.awayTeamId) return;

    const predictionsCleared = await deleteTournamentPredictionsForMatchV2(
      GULF_CUP_27_TOURNAMENT_ID,
      matchId,
    );

    await setDoc(
      doc(
        db,
        TOURNAMENT_V2_COLLECTIONS.matches,
        entityDocId(GULF_CUP_27_TOURNAMENT_ID, matchId),
      ),
      {
        homeTeamId: "",
        awayTeamId: "",
        predictionIsOpen: false,
        status: "scheduled",
        predictionOpensAt: null,
        predictionClosesAt: current.kickoffAt,
        updatedAt: Date.now(),
        updatedAtServer: serverTimestamp(),
      },
      { merge: true },
    );

    changes.push({
      matchId,
      homeTeamId: "",
      awayTeamId: "",
      predictionsCleared,
    });
  }


  if (allGroupsFinished) {
    const groupA = calculateTournamentGroupStandingsV2({
      teams: GULF_CUP_27_TEAMS,
      matches: groupMatches,
      group: "A",
    });
    const groupB = calculateTournamentGroupStandingsV2({
      teams: GULF_CUP_27_TEAMS,
      matches: groupMatches,
      group: "B",
    });

    if (groupA.length >= 2 && groupB.length >= 2) {
      await assignMatch("g27-sf-1", groupA[0].teamId, groupB[1].teamId);
      await assignMatch("g27-sf-2", groupB[0].teamId, groupA[1].teamId);
    }
  } else {
    await clearMatchAssignment("g27-sf-1");
    await clearMatchAssignment("g27-sf-2");
    await clearMatchAssignment("g27-final");
  }

  const refreshed = await getTournamentMatchesV2(
    GULF_CUP_27_TOURNAMENT_ID,
    { fallback: false },
  );
  const semi1 = refreshed.find((match) => match.id === "g27-sf-1");
  const semi2 = refreshed.find((match) => match.id === "g27-sf-2");

  if (
    semi1?.status === "finished" &&
    semi2?.status === "finished" &&
    semi1.result.qualifiedTeamId &&
    semi2.result.qualifiedTeamId
  ) {
    await assignMatch(
      "g27-final",
      semi1.result.qualifiedTeamId,
      semi2.result.qualifiedTeamId,
    );
  } else if (allGroupsFinished) {
    const finalMatch = refreshed.find((match) => match.id === "g27-final");
    if (
      finalMatch &&
      finalMatch.calculationStatus !== "calculated" &&
      (finalMatch.homeTeamId || finalMatch.awayTeamId)
    ) {
      const predictionsCleared = await deleteTournamentPredictionsForMatchV2(
        GULF_CUP_27_TOURNAMENT_ID,
        "g27-final",
      );
      await setDoc(
        doc(
          db,
          TOURNAMENT_V2_COLLECTIONS.matches,
          entityDocId(GULF_CUP_27_TOURNAMENT_ID, "g27-final"),
        ),
        {
          homeTeamId: "",
          awayTeamId: "",
          predictionIsOpen: false,
          status: "scheduled",
          predictionOpensAt: null,
          predictionClosesAt: finalMatch.kickoffAt,
          updatedAt: Date.now(),
          updatedAtServer: serverTimestamp(),
        },
        { merge: true },
      );
      changes.push({
        matchId: "g27-final",
        homeTeamId: "",
        awayTeamId: "",
        predictionsCleared,
      });
    }
  }

  return {
    created,
    allGroupsFinished,
    changes,
  };
}

export function isTournamentPredictionOpen(
  match: TournamentMatchRuntimeV2,
  now = Date.now(),
) {
  if (!match.predictionIsOpen) return false;
  if (match.status === "finished" || match.status === "cancelled") return false;
  if (match.status === "live") return false;

  const opensAt = match.predictionOpensAt ?? 0;
  const closesAt = match.predictionClosesAt ?? match.kickoffAt;

  return now >= opensAt && now < closesAt && now < match.kickoffAt;
}

export async function setTournamentMatchPredictionOpen(
  tournamentId: string,
  matchId: string,
  predictionIsOpen: boolean,
) {
  const matchRef = doc(
    db,
    TOURNAMENT_V2_COLLECTIONS.matches,
    entityDocId(tournamentId, matchId),
  );
  const matchSnap = await getDoc(matchRef);

  if (!matchSnap.exists()) {
    throw new Error("المباراة غير مهيأة في محرك البطولات الجديد");
  }

  const current = mapMatchDoc(matchSnap.id, matchSnap.data());

  if (current.status === "finished" || current.status === "cancelled") {
    throw new Error("لا يمكن فتح التوقعات لمباراة منتهية أو ملغاة");
  }

  if (predictionIsOpen && (!current.homeTeamId || !current.awayTeamId)) {
    throw new Error("لا يمكن فتح التوقع قبل تحديد طرفي مباراة خروج المغلوب");
  }

  const now = Date.now();

  await setDoc(
    matchRef,
    {
      predictionIsOpen,
      status: predictionIsOpen ? "prediction_open" : "scheduled",
      predictionOpensAt:
        predictionIsOpen && current.predictionOpensAt == null
          ? now
          : current.predictionOpensAt,
      predictionClosesAt: current.predictionClosesAt ?? current.kickoffAt,
      updatedAt: now,
      updatedAtServer: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function setAllTournamentPredictionsOpen(
  tournamentId: string,
  predictionIsOpen: boolean,
) {
  const matches = await getTournamentMatchesV2(tournamentId, {
    fallback: false,
  });

  if (matches.length === 0) {
    throw new Error("هيّئ بيانات البطولة أولًا");
  }

  const now = Date.now();
  const batch = writeBatch(db);

  matches.forEach((match) => {
    if (match.status === "finished" || match.status === "cancelled") return;
    if (predictionIsOpen && (!match.homeTeamId || !match.awayTeamId)) return;

    batch.set(
      doc(
        db,
        TOURNAMENT_V2_COLLECTIONS.matches,
        entityDocId(tournamentId, match.id),
      ),
      {
        predictionIsOpen,
        status: predictionIsOpen ? "prediction_open" : "scheduled",
        predictionOpensAt:
          predictionIsOpen && match.predictionOpensAt == null
            ? now
            : match.predictionOpensAt,
        predictionClosesAt: match.predictionClosesAt ?? match.kickoffAt,
        updatedAt: now,
      },
      { merge: true },
    );
  });

  await batch.commit();
}

export async function saveTournamentPredictionV2(
  input: SaveTournamentPredictionInput,
): Promise<TournamentPredictionV2> {
  const tournamentId = cleanText(input.tournamentId);
  const matchId = cleanText(input.matchId);
  const userId = cleanText(input.userId);
  const userName = cleanText(input.userName);

  if (!tournamentId || !matchId || !userId || !userName) {
    throw new Error("بيانات التوقع غير مكتملة");
  }

  if (!isValidScore(input.homeScore) || !isValidScore(input.awayScore)) {
    throw new Error("النتيجة يجب أن تكون أرقامًا صحيحة من 0 إلى 30");
  }

  const matchRef = doc(
    db,
    TOURNAMENT_V2_COLLECTIONS.matches,
    entityDocId(tournamentId, matchId),
  );
  const matchSnap = await getDoc(matchRef);

  if (!matchSnap.exists()) {
    throw new Error("المباراة لم تتم تهيئتها بعد");
  }

  const match = mapMatchDoc(matchSnap.id, matchSnap.data());

  if (!match.homeTeamId || !match.awayTeamId) {
    throw new Error("لم يتم تحديد طرفي المباراة بعد");
  }

  const predictionRef = doc(
    db,
    TOURNAMENT_V2_COLLECTIONS.predictions,
    predictionDocId(tournamentId, userId, matchId),
  );
  const existing = await getDoc(predictionRef);

  if (existing.exists()) {
    if (!match.predictionEditingIsOpen) {
      throw new Error("تعديل التوقعات مغلق لهذه المباراة");
    }
    if (!["scheduled", "prediction_open"].includes(match.status)) {
      throw new Error("لا يمكن تعديل التوقع في الحالة الحالية للمباراة");
    }
  } else if (!isTournamentPredictionOpen(match)) {
    throw new Error("التوقعات مغلقة لهذه المباراة");
  }

  let qualifiedTeamId: string | null = null;
  let qualificationMethod: TournamentQualificationMethod | null = null;

  if (match.stage === "knockout") {
    if (input.homeScore > input.awayScore) {
      qualifiedTeamId = match.homeTeamId;
      qualificationMethod = "regular";
    } else if (input.awayScore > input.homeScore) {
      qualifiedTeamId = match.awayTeamId;
      qualificationMethod = "regular";
    } else {
      qualifiedTeamId = cleanText(input.qualifiedTeamId) || null;
      qualificationMethod =
        input.qualificationMethod === "extra_time" ||
        input.qualificationMethod === "penalties"
          ? input.qualificationMethod
          : null;

      if (
        !qualifiedTeamId ||
        ![match.homeTeamId, match.awayTeamId].includes(qualifiedTeamId)
      ) {
        throw new Error("اختر المنتخب المتوقع تأهله");
      }

      if (!qualificationMethod) {
        throw new Error("اختر طريقة التأهل المتوقعة");
      }
    }
  }

  const now = Date.now();

  const payload = {
    tournamentId,
    matchId,
    userId,
    userName,
    homeScore: input.homeScore,
    awayScore: input.awayScore,
    qualifiedTeamId,
    qualificationMethod,
    points: null,
    isCalculated: false,
    resultType: null,
    submittedAt: existing.exists()
      ? toNumber(existing.data().submittedAt, now)
      : now,
    updatedAt: now,
    updatedAtServer: serverTimestamp(),
    schemaVersion: 2,
  };

  await setDoc(predictionRef, payload, { merge: true });

  return {
    id: predictionRef.id,
    tournamentId,
    matchId,
    userId,
    userName,
    homeScore: input.homeScore,
    awayScore: input.awayScore,
    qualifiedTeamId,
    qualificationMethod,
    points: null,
    pointsBreakdown: null,
    isCalculated: false,
    resultType: null,
    submittedAt: payload.submittedAt,
    updatedAt: now,
    calculatedAt: null,
  };
}

export async function getUserTournamentPredictionsV2(
  tournamentId: string,
  userId: string,
): Promise<TournamentPredictionV2[]> {
  if (!tournamentId || !userId) return [];

  const q = query(
    collection(db, TOURNAMENT_V2_COLLECTIONS.predictions),
    where("tournamentId", "==", tournamentId),
    where("userId", "==", userId),
  );
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((item) => mapPredictionDoc(item.id, item.data()))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getTournamentLeaderboardV2(
  tournamentId: string,
): Promise<TournamentUserStatsV2[]> {
  const q = query(
    collection(db, TOURNAMENT_V2_COLLECTIONS.userStats),
    where("tournamentId", "==", tournamentId),
  );
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((item) => mapUserStatsDoc(item.id, item.data()))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.exact !== a.exact) return b.exact - a.exact;
      if (b.correctOutcome !== a.correctOutcome) {
        return b.correctOutcome - a.correctOutcome;
      }
      if (a.wrong !== b.wrong) return a.wrong - b.wrong;
      return a.fullName.localeCompare(b.fullName, "ar");
    })
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export async function ensureTournamentUserStatsV2({
  tournamentId,
  userId,
  fullName,
}: {
  tournamentId: string;
  userId: string;
  fullName: string;
}) {
  const ref = doc(
    db,
    TOURNAMENT_V2_COLLECTIONS.userStats,
    statsDocId(tournamentId, userId),
  );
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) return;

  const now = Date.now();

  await setDoc(ref, {
    tournamentId,
    userId,
    fullName,
    points: 0,
    rank: null,
    played: 0,
    exact: 0,
    correctOutcome: 0,
    wrong: 0,
    currentStreak: 0,
    bestStreak: 0,
    updatedAt: now,
    schemaVersion: 2,
  });
}
export type CalculateTournamentMatchV2Input = {
  tournamentId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  qualifiedTeamId?: string | null;
  qualificationMethod?: TournamentQualificationMethod | null;
  extraTimeHomeScore?: number | null;
  extraTimeAwayScore?: number | null;
  penaltiesHomeScore?: number | null;
  penaltiesAwayScore?: number | null;
};

export type CalculateTournamentMatchV2Result = {
  tournamentId: string;
  matchId: string;
  predictionsCalculated: number;
  leaderboardRows: number;
  resultHash: string;
  calculationRunId: string;
  scoringVersion: string;
};

async function commitChunked(
  operations: Array<(batch: ReturnType<typeof writeBatch>) => void>,
  chunkSize = 400,
) {
  for (let index = 0; index < operations.length; index += chunkSize) {
    const batch = writeBatch(db);
    operations.slice(index, index + chunkSize).forEach((operation) => {
      operation(batch);
    });
    await batch.commit();
  }
}

async function getTournamentPredictionsForCalculationV2(
  tournamentId: string,
): Promise<TournamentPredictionV2[]> {
  const q = query(
    collection(db, TOURNAMENT_V2_COLLECTIONS.predictions),
    where("tournamentId", "==", tournamentId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => mapPredictionDoc(item.id, item.data()));
}

export async function rebuildTournamentLeaderboardV2(tournamentId: string) {
  const [matches, predictions, existingStatsSnapshot] = await Promise.all([
    getTournamentMatchesV2(tournamentId, { fallback: false }),
    getTournamentPredictionsForCalculationV2(tournamentId),
    getDocs(
      query(
        collection(db, TOURNAMENT_V2_COLLECTIONS.userStats),
        where("tournamentId", "==", tournamentId),
      ),
    ),
  ]);

  const matchById = new Map(matches.map((match) => [match.id, match]));
  const calculatedPredictions = predictions
    .filter(
      (prediction) =>
        prediction.isCalculated === true &&
        prediction.points != null &&
        prediction.resultType != null &&
        matchById.has(prediction.matchId),
    )
    .sort((a, b) => {
      const aKickoff = matchById.get(a.matchId)?.kickoffAt ?? 0;
      const bKickoff = matchById.get(b.matchId)?.kickoffAt ?? 0;
      if (aKickoff !== bKickoff) return aKickoff - bKickoff;
      return a.matchId.localeCompare(b.matchId);
    });

  const aggregate = new Map<string, TournamentUserStatsV2>();
  const now = Date.now();

  calculatedPredictions.forEach((prediction) => {
    const current = aggregate.get(prediction.userId) ?? {
      id: statsDocId(tournamentId, prediction.userId),
      tournamentId,
      userId: prediction.userId,
      fullName: cleanText(prediction.userName) || "عضو",
      points: 0,
      rank: null,
      played: 0,
      exact: 0,
      correctOutcome: 0,
      wrong: 0,
      currentStreak: 0,
      bestStreak: 0,
      updatedAt: now,
    };

    current.fullName = cleanText(prediction.userName) || current.fullName;
    current.points += prediction.points ?? 0;
    current.played += 1;

    if (prediction.resultType === "exact") {
      current.exact += 1;
      current.currentStreak += 1;
    } else if (prediction.resultType === "outcome") {
      current.correctOutcome += 1;
      current.currentStreak += 1;
    } else {
      current.wrong += 1;
      current.currentStreak = 0;
    }

    current.bestStreak = Math.max(
      current.bestStreak,
      current.currentStreak,
    );
    current.updatedAt = now;
    aggregate.set(prediction.userId, current);
  });

  const rows = [...aggregate.values()]
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.exact !== a.exact) return b.exact - a.exact;
      if (b.correctOutcome !== a.correctOutcome) {
        return b.correctOutcome - a.correctOutcome;
      }
      if (a.wrong !== b.wrong) return a.wrong - b.wrong;
      return a.fullName.localeCompare(b.fullName, "ar");
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const operations: Array<
    (batch: ReturnType<typeof writeBatch>) => void
  > = [];

  existingStatsSnapshot.docs.forEach((item) => {
    operations.push((batch) => batch.delete(item.ref));
  });

  rows.forEach((row) => {
    const ref = doc(
      db,
      TOURNAMENT_V2_COLLECTIONS.userStats,
      statsDocId(tournamentId, row.userId),
    );
    operations.push((batch) =>
      batch.set(ref, {
        ...row,
        schemaVersion: 2,
      }),
    );
  });

  if (operations.length > 0) {
    await commitChunked(operations);
  }

  return rows;
}

export async function calculateTournamentMatchV2(
  input: CalculateTournamentMatchV2Input,
): Promise<CalculateTournamentMatchV2Result> {
  const tournamentId = cleanText(input.tournamentId);
  const matchId = cleanText(input.matchId);

  if (!tournamentId || !matchId) {
    throw new Error("بيانات المباراة غير مكتملة");
  }

  if (!isValidScore(input.homeScore) || !isValidScore(input.awayScore)) {
    throw new Error("النتيجة يجب أن تكون أرقامًا صحيحة من 0 إلى 30");
  }

  if (tournamentId !== GULF_CUP_27_TOURNAMENT_ID) {
    throw new Error("محرك الاحتساب الحالي مخصص لخليجي 27 فقط");
  }

  const matchRef = doc(
    db,
    TOURNAMENT_V2_COLLECTIONS.matches,
    entityDocId(tournamentId, matchId),
  );
  const matchSnap = await getDoc(matchRef);

  if (!matchSnap.exists()) {
    throw new Error("المباراة غير موجودة في Firestore V2");
  }

  const match = mapMatchDoc(matchSnap.id, matchSnap.data());
  if (!match.homeTeamId || !match.awayTeamId) {
    throw new Error("حدد طرفي المباراة قبل إدخال النتيجة");
  }

  const scoringVersion =
    match.stage === "knockout"
      ? GULF_CUP_27_KNOCKOUT_SCORING_VERSION
      : GULF_CUP_27_SCORING_VERSION;

  let qualifiedTeamId: string | null = null;
  let qualificationMethod: TournamentQualificationMethod | null = null;
  let extraTimeHomeScore: number | null = null;
  let extraTimeAwayScore: number | null = null;
  let penaltiesHomeScore: number | null = null;
  let penaltiesAwayScore: number | null = null;

  if (match.stage === "knockout") {
    qualifiedTeamId = cleanText(input.qualifiedTeamId) || null;
    qualificationMethod =
      input.qualificationMethod === "regular" ||
      input.qualificationMethod === "extra_time" ||
      input.qualificationMethod === "penalties"
        ? input.qualificationMethod
        : null;

    if (!qualifiedTeamId || !qualificationMethod) {
      throw new Error("حدد المتأهل وطريقة التأهل");
    }

    extraTimeHomeScore =
      input.extraTimeHomeScore == null ? null : Number(input.extraTimeHomeScore);
    extraTimeAwayScore =
      input.extraTimeAwayScore == null ? null : Number(input.extraTimeAwayScore);
    penaltiesHomeScore =
      input.penaltiesHomeScore == null ? null : Number(input.penaltiesHomeScore);
    penaltiesAwayScore =
      input.penaltiesAwayScore == null ? null : Number(input.penaltiesAwayScore);

    [extraTimeHomeScore, extraTimeAwayScore, penaltiesHomeScore, penaltiesAwayScore]
      .filter((value): value is number => value != null)
      .forEach((value) => {
        if (!isValidScore(value)) {
          throw new Error("نتائج الإضافي والترجيح يجب أن تكون من 0 إلى 30");
        }
      });

    validateKnockoutResultV2({
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeScore: input.homeScore,
      awayScore: input.awayScore,
      qualifiedTeamId,
      qualificationMethod,
      extraTimeHomeScore,
      extraTimeAwayScore,
      penaltiesHomeScore,
      penaltiesAwayScore,
    });
  }

  const now = Date.now();
  const resultHash = createTournamentResultHash({
    tournamentId,
    matchId,
    homeScore: input.homeScore,
    awayScore: input.awayScore,
    scoringVersion,
    qualifiedTeamId,
    qualificationMethod,
    extraTimeHomeScore,
    extraTimeAwayScore,
    penaltiesHomeScore,
    penaltiesAwayScore,
  });
  const calculationRunId = `${tournamentId}_${matchId}_${now}`;
  const resultMatch: TournamentMatchRuntimeV2 = {
    ...match,
    status: "finished",
    predictionIsOpen: false,
    calculationStatus: "processing",
    calculationVersion: scoringVersion,
    resultHash,
    calculatedAt: null,
    result: {
      ...match.result,
      homeScore: input.homeScore,
      awayScore: input.awayScore,
      extraTimeHomeScore,
      extraTimeAwayScore,
      penaltiesHomeScore,
      penaltiesAwayScore,
      qualifiedTeamId,
      qualificationMethod,
    },
  };

  await setDoc(
    matchRef,
    {
      result: resultMatch.result,
      status: "finished",
      predictionIsOpen: false,
      predictionClosesAt: Math.min(match.predictionClosesAt ?? now, now),
      calculationStatus: "processing",
      calculationVersion: scoringVersion,
      resultHash,
      calculationRunId,
      calculationError: null,
      calculatedAt: null,
      calculatedPredictions: 0,
      updatedAt: now,
      updatedAtServer: serverTimestamp(),
    },
    { merge: true },
  );

  try {
    const previousLeaderboard = await getTournamentLeaderboardV2(tournamentId);
    const q = query(
      collection(db, TOURNAMENT_V2_COLLECTIONS.predictions),
      where("tournamentId", "==", tournamentId),
      where("matchId", "==", matchId),
    );
    const snapshot = await getDocs(q);
    const operations: Array<
      (batch: ReturnType<typeof writeBatch>) => void
    > = [];
    const scoredNotifications: Array<{
      userId: string;
      points: number;
      resultType: "exact" | "outcome" | "wrong";
    }> = [];

    snapshot.docs.forEach((item) => {
      const prediction = mapPredictionDoc(item.id, item.data());
      const scored =
        match.stage === "knockout"
          ? scoreGulfCup27KnockoutPredictionV1({
              prediction,
              match: resultMatch,
            })
          : scoreGulfCup27PredictionV1({
              prediction,
              match: resultMatch,
            });

      scoredNotifications.push({
        userId: prediction.userId,
        points: scored.points,
        resultType: scored.resultType,
      });

      operations.push((batch) =>
        batch.set(
          item.ref,
          {
            points: scored.points,
            pointsBreakdown: scored.pointsBreakdown,
            isCalculated: true,
            resultType: scored.resultType,
            calculatedAt: now,
            scoringVersion: scored.scoringVersion,
            resultHash,
            calculationRunId,
            updatedAtServer: serverTimestamp(),
          },
          { merge: true },
        ),
      );
    });

    if (operations.length > 0) {
      await commitChunked(operations);
    }

    const leaderboard = await rebuildTournamentLeaderboardV2(tournamentId);

    await setDoc(
      matchRef,
      {
        calculationStatus: "calculated",
        calculationVersion: scoringVersion,
        resultHash,
        calculationRunId,
        calculatedAt: now,
        calculatedPredictions: snapshot.size,
        calculationError: null,
        updatedAt: Date.now(),
        updatedAtServer: serverTimestamp(),
      },
      { merge: true },
    );

    // يحدّث نصف النهائي بعد اكتمال المجموعات، والنهائي بعد اكتمال نصف النهائي.
    await syncGulfCup27KnockoutBracketV2();
    await rebuildTournamentAchievementsV2(tournamentId);

    try {
      const homeName = getGulfCup27Team(match.homeTeamId)?.nameAr || match.homeTeamId;
      const awayName = getGulfCup27Team(match.awayTeamId)?.nameAr || match.awayTeamId;
      await sendTournamentCalculationNotificationsV2({
        tournamentId,
        matchId,
        matchLabel: `${homeName} × ${awayName}`,
        resultLabel: `${input.homeScore}-${input.awayScore}`,
        resultHash,
        route: "/tournaments/gulf-cup-27/predictions",
        predictions: scoredNotifications,
        leaderboard: leaderboard.map((row) => ({
          userId: row.userId,
          rank: row.rank,
          points: row.points,
        })),
        previousLeaderboard: previousLeaderboard.map((row) => ({
          userId: row.userId,
          rank: row.rank,
          points: row.points,
        })),
      });
    } catch (notificationError) {
      console.error("Tournament V2 result notifications failed:", notificationError);
    }

    return {
      tournamentId,
      matchId,
      predictionsCalculated: snapshot.size,
      leaderboardRows: leaderboard.length,
      resultHash,
      calculationRunId,
      scoringVersion,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";
    await setDoc(
      matchRef,
      {
        calculationStatus: "error",
        calculationError: message.slice(0, 300),
        updatedAt: Date.now(),
        updatedAtServer: serverTimestamp(),
      },
      { merge: true },
    );
    throw error;
  }
}

export async function undoTournamentMatchCalculationV2({
  tournamentId,
  matchId,
}: {
  tournamentId: string;
  matchId: string;
}) {
  const matchRef = doc(
    db,
    TOURNAMENT_V2_COLLECTIONS.matches,
    entityDocId(tournamentId, matchId),
  );
  const matchSnap = await getDoc(matchRef);

  if (!matchSnap.exists()) {
    throw new Error("المباراة غير موجودة في Firestore V2");
  }

  const match = mapMatchDoc(matchSnap.id, matchSnap.data());
  if (match.calculationStatus !== "calculated" && match.status !== "finished") {
    throw new Error("هذه المباراة غير محتسبة حاليًا");
  }

  const q = query(
    collection(db, TOURNAMENT_V2_COLLECTIONS.predictions),
    where("tournamentId", "==", tournamentId),
    where("matchId", "==", matchId),
  );
  const snapshot = await getDocs(q);
  const now = Date.now();
  const operations: Array<
    (batch: ReturnType<typeof writeBatch>) => void
  > = [];

  snapshot.docs.forEach((item) => {
    operations.push((batch) =>
      batch.set(
        item.ref,
        {
          points: null,
          pointsBreakdown: null,
          isCalculated: false,
          resultType: null,
          calculatedAt: null,
          scoringVersion: null,
          resultHash: null,
          calculationRunId: null,
          updatedAtServer: serverTimestamp(),
        },
        { merge: true },
      ),
    );
  });

  if (operations.length > 0) {
    await commitChunked(operations);
  }

  await setDoc(
    matchRef,
    {
      result: {
        ...match.result,
        homeScore: null,
        awayScore: null,
        extraTimeHomeScore: null,
        extraTimeAwayScore: null,
        penaltiesHomeScore: null,
        penaltiesAwayScore: null,
        qualifiedTeamId: null,
        qualificationMethod: null,
      },
      status: "scheduled",
      predictionIsOpen: false,
      predictionClosesAt: match.kickoffAt,
      calculationStatus: "not_calculated",
      calculationVersion: null,
      resultHash: null,
      calculationRunId: null,
      calculationError: null,
      calculatedAt: null,
      calculatedPredictions: 0,
      lastUndoAt: now,
      updatedAt: now,
      updatedAtServer: serverTimestamp(),
    },
    { merge: true },
  );

  const leaderboard = await rebuildTournamentLeaderboardV2(tournamentId);
  await syncGulfCup27KnockoutBracketV2();
  await rebuildTournamentAchievementsV2(tournamentId);

  return {
    tournamentId,
    matchId,
    predictionsReset: snapshot.size,
    leaderboardRows: leaderboard.length,
  };
}

