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
import { auth, db } from "./firebase";
import {
  GULF_CUP_27_GROUP_MATCHES,
  GULF_CUP_27_KNOCKOUT_MATCHES,
  GULF_CUP_27_MATCHES,
  GULF_CUP_27_TEAMS,
  GULF_CUP_27_TOURNAMENT,
  GULF_CUP_27_TOURNAMENT_ID,
  getTournamentPredictionWindowStateV2,
  calculateTournamentGroupStandingsV2,
  type TournamentMatchV2,
  type TournamentPredictionV2,
  type TournamentQualificationMethod,
  type TournamentTeamV2,
  type TournamentUserStatsV2,
} from "@/domain/tournaments";
import { requestAdminTournamentPredictionActionV2 } from "./adminTournamentPredictionsApiV2";

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
  const result = await requestAdminTournamentPredictionActionV2<{ deleted: number }>({
    action: "delete_match_predictions",
    tournamentId,
    matchId,
  });
  return result.deleted;
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
  return getTournamentPredictionWindowStateV2(match, now) === "open";
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
  const now = Date.now();

  if (current.status === "finished" || current.status === "cancelled") {
    throw new Error("لا يمكن فتح التوقعات لمباراة منتهية أو ملغاة");
  }

  if (predictionIsOpen && now >= current.kickoffAt) {
    throw new Error("لا يمكن إعادة فتح التوقع بعد بداية المباراة");
  }

  if (predictionIsOpen && (!current.homeTeamId || !current.awayTeamId)) {
    throw new Error("لا يمكن فتح التوقع قبل تحديد طرفي مباراة خروج المغلوب");
  }

  const nextClosesAt =
    predictionIsOpen &&
    (current.predictionClosesAt == null ||
      current.predictionClosesAt <= now ||
      current.predictionClosesAt > current.kickoffAt)
      ? current.kickoffAt
      : current.predictionClosesAt ?? current.kickoffAt;

  await setDoc(
    matchRef,
    {
      predictionIsOpen,
      status: predictionIsOpen ? "prediction_open" : "scheduled",
      predictionOpensAt:
        predictionIsOpen && current.predictionOpensAt == null
          ? now
          : current.predictionOpensAt,
      predictionClosesAt: nextClosesAt,
      updatedAt: now,
      updatedAtServer: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function setTournamentMatchPredictionEditingOpen(
  tournamentId: string,
  matchId: string,
  predictionEditingIsOpen: boolean,
) {
  const matchRef = doc(
    db,
    TOURNAMENT_V2_COLLECTIONS.matches,
    entityDocId(tournamentId, matchId),
  );
  const matchSnap = await getDoc(matchRef);

  if (!matchSnap.exists()) {
    throw new Error("المباراة غير موجودة");
  }

  const current = mapMatchDoc(matchSnap.id, matchSnap.data());
  const now = Date.now();
  if (current.calculationStatus === "calculated") {
    throw new Error("لا يمكن تغيير صلاحية التعديل بعد احتساب المباراة");
  }
  if (
    predictionEditingIsOpen &&
    (now >= current.kickoffAt ||
      !["scheduled", "prediction_open"].includes(current.status))
  ) {
    throw new Error("لا يمكن فتح تعديل التوقع بعد بداية المباراة أو في حالتها الحالية");
  }
  if (
    predictionEditingIsOpen &&
    (!current.homeTeamId || !current.awayTeamId)
  ) {
    throw new Error("لا يمكن فتح التعديل قبل تحديد طرفي المباراة");
  }

  await setDoc(
    matchRef,
    {
      predictionEditingIsOpen,
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
    if (predictionIsOpen && now >= match.kickoffAt) return;

    const nextClosesAt =
      predictionIsOpen &&
      (match.predictionClosesAt == null ||
        match.predictionClosesAt <= now ||
        match.predictionClosesAt > match.kickoffAt)
        ? match.kickoffAt
        : match.predictionClosesAt ?? match.kickoffAt;

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
        predictionClosesAt: nextClosesAt,
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

  const firebaseUser = auth.currentUser;
  if (!firebaseUser || firebaseUser.uid !== userId) {
    throw new Error("انتهت جلسة الدخول. سجّل الدخول مرة أخرى ثم أعد المحاولة.");
  }

  const token = await firebaseUser.getIdToken();
  const response = await fetch("/api/tournaments/predictions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      tournamentId,
      matchId,
      homeScore: input.homeScore,
      awayScore: input.awayScore,
      qualifiedTeamId: input.qualifiedTeamId ?? null,
      qualificationMethod: input.qualificationMethod ?? null,
    }),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as {
    prediction?: TournamentPredictionV2;
    error?: string;
  } | null;

  if (!response.ok || !data?.prediction) {
    throw new Error(data?.error || "تعذر حفظ التوقع الآن. بقيت بقية توقعاتك دون تغيير.");
  }

  return data.prediction;
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
