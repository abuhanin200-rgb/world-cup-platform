import {
  getTournamentPredictionSubmissionDecisionV2,
  isValidTournamentPredictionScoreV2,
  tournamentPredictionSubmissionMessageV2,
  type TournamentMatchStatus,
  type TournamentPredictionV2,
  type TournamentQualificationMethod,
} from "@/domain/tournaments";
import {
  commitWrites,
  createDocumentIfMissingWrite,
  createDocumentWrite,
  decodeFields,
  getDocument,
} from "@/lib/serverFirebaseRest";

const MATCHES_COLLECTION = "tournamentMatches";
const PREDICTIONS_COLLECTION = "tournamentPredictions";
const USER_STATS_COLLECTION = "tournamentUserStats";

type SaveTournamentPredictionServerInput = {
  tournamentId: string;
  matchId: string;
  userId: string;
  homeScore: number;
  awayScore: number;
  qualifiedTeamId?: string | null;
  qualificationMethod?: TournamentQualificationMethod | null;
};

export class TournamentPredictionSubmissionError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "TournamentPredictionSubmissionError";
  }
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function optionalNumber(value: unknown) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function matchDocumentId(tournamentId: string, matchId: string) {
  return `${tournamentId}_${matchId}`;
}

function predictionDocumentId(
  tournamentId: string,
  userId: string,
  matchId: string,
) {
  return `${tournamentId}_${userId}_${matchId}`;
}

function readMatchForSubmission(data: Record<string, unknown>) {
  const rawStatus = cleanText(data.status);
  const status: TournamentMatchStatus =
    rawStatus === "prediction_open" ||
    rawStatus === "live" ||
    rawStatus === "finished" ||
    rawStatus === "postponed" ||
    rawStatus === "cancelled"
      ? rawStatus
      : "scheduled";

  return {
    homeTeamId: cleanText(data.homeTeamId),
    awayTeamId: cleanText(data.awayTeamId),
    kickoffAt: Number(data.kickoffAt || 0),
    status,
    predictionOpensAt: optionalNumber(data.predictionOpensAt),
    predictionClosesAt: optionalNumber(data.predictionClosesAt),
    predictionIsOpen: data.predictionIsOpen === true,
    predictionEditingIsOpen: data.predictionEditingIsOpen !== false,
    stage: data.stage === "knockout" ? "knockout" : "group",
  } as const;
}

function rejectSubmission(code: Parameters<typeof tournamentPredictionSubmissionMessageV2>[0]) {
  throw new TournamentPredictionSubmissionError(
    tournamentPredictionSubmissionMessageV2(code),
    code,
    409,
  );
}

export async function saveTournamentPredictionOnServerV2(
  input: SaveTournamentPredictionServerInput,
): Promise<{ prediction: TournamentPredictionV2; serverNow: number }> {
  const tournamentId = cleanText(input.tournamentId);
  const matchId = cleanText(input.matchId);
  const userId = cleanText(input.userId);

  if (!tournamentId || !matchId || !userId) {
    throw new TournamentPredictionSubmissionError(
      "بيانات التوقع غير مكتملة.",
      "PREDICTION_INVALID_INPUT",
      400,
    );
  }

  if (
    !isValidTournamentPredictionScoreV2(input.homeScore) ||
    !isValidTournamentPredictionScoreV2(input.awayScore)
  ) {
    throw new TournamentPredictionSubmissionError(
      "النتيجة يجب أن تكون رقمًا صحيحًا من 0 إلى 30 لكل فريق.",
      "PREDICTION_INVALID_SCORE",
      400,
    );
  }

  const matchIdInStore = matchDocumentId(tournamentId, matchId);
  const predictionId = predictionDocumentId(tournamentId, userId, matchId);
  const statsId = `${tournamentId}_${userId}`;
  const [firstMatchDocument, firstPredictionDocument, userDocument, statsDocument] =
    await Promise.all([
      getDocument(MATCHES_COLLECTION, matchIdInStore),
      getDocument(PREDICTIONS_COLLECTION, predictionId),
      getDocument("users", userId),
      getDocument(USER_STATS_COLLECTION, statsId),
    ]);

  if (!firstMatchDocument) {
    throw new TournamentPredictionSubmissionError(
      "المباراة غير موجودة أو لم تتم تهيئتها بعد.",
      "PREDICTION_MATCH_NOT_FOUND",
      404,
    );
  }
  if (!userDocument) {
    throw new TournamentPredictionSubmissionError(
      "تعذر التحقق من حساب العضو.",
      "PREDICTION_USER_NOT_FOUND",
      401,
    );
  }

  const firstMatch = readMatchForSubmission(
    decodeFields(firstMatchDocument.fields || {}),
  );
  const firstDecision = getTournamentPredictionSubmissionDecisionV2({
    match: firstMatch,
    now: Date.now(),
    hasPrediction: Boolean(firstPredictionDocument),
  });
  if (!firstDecision.allowed) rejectSubmission(firstDecision.code);

  let qualifiedTeamId: string | null = null;
  let qualificationMethod: TournamentQualificationMethod | null = null;

  if (firstMatch.stage === "knockout") {
    if (input.homeScore > input.awayScore) {
      qualifiedTeamId = firstMatch.homeTeamId;
      qualificationMethod = "regular";
    } else if (input.awayScore > input.homeScore) {
      qualifiedTeamId = firstMatch.awayTeamId;
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
        ![firstMatch.homeTeamId, firstMatch.awayTeamId].includes(qualifiedTeamId)
      ) {
        throw new TournamentPredictionSubmissionError(
          "اختر المنتخب المتوقع تأهله.",
          "PREDICTION_QUALIFIED_TEAM_REQUIRED",
          400,
        );
      }
      if (!qualificationMethod) {
        throw new TournamentPredictionSubmissionError(
          "اختر طريقة التأهل المتوقعة.",
          "PREDICTION_QUALIFICATION_METHOD_REQUIRED",
          400,
        );
      }
    }
  }

  // Re-read immediately before the write so a schedule/status/admin change that
  // happened while the request was being validated always wins.
  const [latestMatchDocument, latestPredictionDocument] = await Promise.all([
    getDocument(MATCHES_COLLECTION, matchIdInStore),
    getDocument(PREDICTIONS_COLLECTION, predictionId),
  ]);
  if (!latestMatchDocument) {
    throw new TournamentPredictionSubmissionError(
      "المباراة لم تعد متاحة.",
      "PREDICTION_MATCH_NOT_FOUND",
      404,
    );
  }

  const latestMatch = readMatchForSubmission(
    decodeFields(latestMatchDocument.fields || {}),
  );
  const acceptedAt = Date.now();
  const latestDecision = getTournamentPredictionSubmissionDecisionV2({
    match: latestMatch,
    now: acceptedAt,
    hasPrediction: Boolean(latestPredictionDocument),
  });
  if (!latestDecision.allowed) rejectSubmission(latestDecision.code);

  if (
    latestMatch.homeTeamId !== firstMatch.homeTeamId ||
    latestMatch.awayTeamId !== firstMatch.awayTeamId
  ) {
    throw new TournamentPredictionSubmissionError(
      "تغير طرفا المباراة أثناء الحفظ. راجع توقعك ثم أعد المحاولة.",
      "PREDICTION_MATCH_TEAMS_CHANGED",
      409,
    );
  }

  const userData = decodeFields(userDocument.fields || {});
  const userName = cleanText(userData.fullName) || "عضو";
  const existingData = latestPredictionDocument
    ? decodeFields(latestPredictionDocument.fields || {})
    : {};
  const submittedAt = latestPredictionDocument
    ? Number(existingData.submittedAt || acceptedAt)
    : acceptedAt;
  const prediction: TournamentPredictionV2 = {
    id: predictionId,
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
    submittedAt,
    updatedAt: acceptedAt,
    calculatedAt: null,
    scoringVersion: null,
    resultHash: null,
    calculationRunId: null,
  };

  const persistedFields = {
    tournamentId,
    matchId,
    userId,
    userName,
    homeScore: prediction.homeScore,
    awayScore: prediction.awayScore,
    qualifiedTeamId,
    qualificationMethod,
    points: null,
    pointsBreakdown: null,
    isCalculated: false,
    resultType: null,
    submittedAt,
    updatedAt: acceptedAt,
    calculatedAt: null,
    scoringVersion: null,
    resultHash: null,
    calculationRunId: null,
    schemaVersion: 2,
  };

  await commitWrites([
    createDocumentWrite(
      PREDICTIONS_COLLECTION,
      predictionId,
      persistedFields,
      Object.keys(persistedFields),
    ),
  ]);

  if (!statsDocument) {
    try {
      await commitWrites([
        createDocumentIfMissingWrite(USER_STATS_COLLECTION, statsId, {
          id: statsId,
          tournamentId,
          userId,
          fullName: userName,
          points: 0,
          rank: null,
          played: 0,
          exact: 0,
          correctOutcome: 0,
          wrong: 0,
          currentStreak: 0,
          bestStreak: 0,
          updatedAt: acceptedAt,
          schemaVersion: 2,
        }),
      ]);
    } catch (statsError) {
      const message =
        statsError instanceof Error ? statsError.message : String(statsError || "");
      if (!message.includes("FIRESTORE_REQUEST_FAILED_409")) {
        console.error("Tournament stats initialization failed:", statsError);
      }
    }
  }

  return { prediction, serverNow: acceptedAt };
}
