import type {
  TournamentMatchV2,
  TournamentPredictionPointsBreakdownV2,
  TournamentPredictionV2,
  TournamentQualificationMethod,
} from "./v2Types";

export const GULF_CUP_27_SCORING_VERSION = "gulf27-v1" as const;
export const GULF_CUP_27_KNOCKOUT_SCORING_VERSION = "gulf27-ko-v2" as const;

export const GULF_CUP_27_SCORING_V1 = {
  exact: 3,
  outcome: 1,
  wrong: 0,
} as const;

export const GULF_CUP_27_KNOCKOUT_SCORING_V1 = {
  exact: 3,
  outcome: 1,
  qualified: 2,
  method: 1,
  max: 6,
  wrong: 0,
} as const;

export type TournamentPredictionResultTypeV2 =
  | "exact"
  | "outcome"
  | "wrong";

export type TournamentPredictionScoreV2 = {
  points: number;
  resultType: TournamentPredictionResultTypeV2;
  scoringVersion: string;
  pointsBreakdown: TournamentPredictionPointsBreakdownV2;
};

function outcome(home: number, away: number) {
  if (home === away) return "draw";
  return home > away ? "home" : "away";
}

function baseResult({
  points,
  resultType,
  scoringVersion,
  score,
  qualified = 0,
  method = 0,
}: {
  points: number;
  resultType: TournamentPredictionResultTypeV2;
  scoringVersion: string;
  score: number;
  qualified?: number;
  method?: number;
}): TournamentPredictionScoreV2 {
  return {
    points,
    resultType,
    scoringVersion,
    pointsBreakdown: { score, qualified, method },
  };
}

export function scoreGulfCup27PredictionV1({
  prediction,
  match,
}: {
  prediction: Pick<TournamentPredictionV2, "homeScore" | "awayScore">;
  match: Pick<TournamentMatchV2, "stage" | "result">;
}): TournamentPredictionScoreV2 {
  const actualHome = match.result.homeScore;
  const actualAway = match.result.awayScore;

  if (actualHome == null || actualAway == null) {
    throw new Error("لا يمكن احتساب التوقع قبل إدخال نتيجة المباراة");
  }

  if (match.stage !== "group") {
    throw new Error("قالب دور المجموعات لا يستخدم للأدوار الإقصائية");
  }

  if (
    prediction.homeScore === actualHome &&
    prediction.awayScore === actualAway
  ) {
    return baseResult({
      points: GULF_CUP_27_SCORING_V1.exact,
      resultType: "exact",
      scoringVersion: GULF_CUP_27_SCORING_VERSION,
      score: GULF_CUP_27_SCORING_V1.exact,
    });
  }

  if (
    outcome(prediction.homeScore, prediction.awayScore) ===
    outcome(actualHome, actualAway)
  ) {
    return baseResult({
      points: GULF_CUP_27_SCORING_V1.outcome,
      resultType: "outcome",
      scoringVersion: GULF_CUP_27_SCORING_VERSION,
      score: GULF_CUP_27_SCORING_V1.outcome,
    });
  }

  return baseResult({
    points: 0,
    resultType: "wrong",
    scoringVersion: GULF_CUP_27_SCORING_VERSION,
    score: 0,
  });
}

function predictedQualifiedTeam({
  prediction,
  match,
}: {
  prediction: Pick<
    TournamentPredictionV2,
    "homeScore" | "awayScore" | "qualifiedTeamId"
  >;
  match: Pick<TournamentMatchV2, "homeTeamId" | "awayTeamId">;
}) {
  if (prediction.homeScore > prediction.awayScore) return match.homeTeamId;
  if (prediction.awayScore > prediction.homeScore) return match.awayTeamId;
  return prediction.qualifiedTeamId ?? null;
}

export function scoreGulfCup27KnockoutPredictionV1({
  prediction,
  match,
}: {
  prediction: Pick<
    TournamentPredictionV2,
    | "homeScore"
    | "awayScore"
    | "qualifiedTeamId"
    | "qualificationMethod"
  >;
  match: Pick<TournamentMatchV2, "stage" | "homeTeamId" | "awayTeamId" | "result">;
}): TournamentPredictionScoreV2 {
  if (match.stage !== "knockout") {
    throw new Error("قالب خروج المغلوب لا يستخدم لدور المجموعات");
  }

  const actualHome = match.result.homeScore;
  const actualAway = match.result.awayScore;
  const actualQualified = match.result.qualifiedTeamId ?? null;
  const actualMethod = match.result.qualificationMethod ?? null;

  if (actualHome == null || actualAway == null || !actualQualified || !actualMethod) {
    throw new Error("بيانات نتيجة خروج المغلوب غير مكتملة");
  }

  const predictedOutcome = outcome(prediction.homeScore, prediction.awayScore);
  const actualOutcome = outcome(actualHome, actualAway);
  const exact =
    prediction.homeScore === actualHome && prediction.awayScore === actualAway;
  const predictedQualified = predictedQualifiedTeam({ prediction, match });
  const predictedMethod =
    predictedOutcome === "draw"
      ? prediction.qualificationMethod ?? null
      : "regular";
  const scorePoints = exact
    ? GULF_CUP_27_KNOCKOUT_SCORING_V1.exact
    : predictedOutcome === actualOutcome
      ? GULF_CUP_27_KNOCKOUT_SCORING_V1.outcome
      : 0;
  const qualifiedPoints =
    predictedQualified === actualQualified
      ? GULF_CUP_27_KNOCKOUT_SCORING_V1.qualified
      : 0;
  const methodPoints =
    predictedMethod === actualMethod
      ? GULF_CUP_27_KNOCKOUT_SCORING_V1.method
      : 0;
  const points = Math.min(
    GULF_CUP_27_KNOCKOUT_SCORING_V1.max,
    scorePoints + qualifiedPoints + methodPoints,
  );

  return baseResult({
    points,
    resultType: exact ? "exact" : scorePoints > 0 ? "outcome" : "wrong",
    scoringVersion: GULF_CUP_27_KNOCKOUT_SCORING_VERSION,
    score: scorePoints,
    qualified: qualifiedPoints,
    method: methodPoints,
  });
}

export function validateKnockoutResultV2({
  homeTeamId,
  awayTeamId,
  homeScore,
  awayScore,
  qualifiedTeamId,
  qualificationMethod,
  extraTimeHomeScore,
  extraTimeAwayScore,
  penaltiesHomeScore,
  penaltiesAwayScore,
}: {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  qualifiedTeamId: string;
  qualificationMethod: TournamentQualificationMethod;
  extraTimeHomeScore?: number | null;
  extraTimeAwayScore?: number | null;
  penaltiesHomeScore?: number | null;
  penaltiesAwayScore?: number | null;
}) {
  if (!homeTeamId || !awayTeamId) throw new Error("حدد طرفي المباراة أولًا");
  if (![homeTeamId, awayTeamId].includes(qualifiedTeamId)) {
    throw new Error("المتأهل يجب أن يكون أحد طرفي المباراة");
  }

  if (homeScore !== awayScore) {
    const winner = homeScore > awayScore ? homeTeamId : awayTeamId;
    if (qualificationMethod !== "regular" || qualifiedTeamId !== winner) {
      throw new Error("عند الحسم في الوقت الأصلي يجب أن يكون المتأهل هو الفائز وطريقة التأهل فوز مباشر");
    }
    return;
  }

  if (qualificationMethod === "regular") {
    throw new Error("النتيجة المتعادلة تحتاج وقتًا إضافيًا أو ركلات ترجيح");
  }

  if (qualificationMethod === "extra_time") {
    if (extraTimeHomeScore == null || extraTimeAwayScore == null) {
      throw new Error("أدخل النتيجة بعد الوقت الإضافي");
    }
    if (extraTimeHomeScore === extraTimeAwayScore) {
      throw new Error("الوقت الإضافي المحدد كطريقة تأهل يجب أن يحسم المباراة");
    }
    const winner =
      extraTimeHomeScore > extraTimeAwayScore ? homeTeamId : awayTeamId;
    if (winner !== qualifiedTeamId) {
      throw new Error("المتأهل لا يطابق نتيجة الوقت الإضافي");
    }
    return;
  }

  if (penaltiesHomeScore == null || penaltiesAwayScore == null) {
    throw new Error("أدخل نتيجة ركلات الترجيح");
  }
  if (penaltiesHomeScore === penaltiesAwayScore) {
    throw new Error("ركلات الترجيح لا يمكن أن تنتهي بالتعادل");
  }
  const winner =
    penaltiesHomeScore > penaltiesAwayScore ? homeTeamId : awayTeamId;
  if (winner !== qualifiedTeamId) {
    throw new Error("المتأهل لا يطابق نتيجة ركلات الترجيح");
  }
}

export function createTournamentResultHash({
  tournamentId,
  matchId,
  homeScore,
  awayScore,
  scoringVersion,
  qualifiedTeamId,
  qualificationMethod,
  extraTimeHomeScore,
  extraTimeAwayScore,
  penaltiesHomeScore,
  penaltiesAwayScore,
}: {
  tournamentId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  scoringVersion: string;
  qualifiedTeamId?: string | null;
  qualificationMethod?: TournamentQualificationMethod | null;
  extraTimeHomeScore?: number | null;
  extraTimeAwayScore?: number | null;
  penaltiesHomeScore?: number | null;
  penaltiesAwayScore?: number | null;
}) {
  const parts: Array<string | number> = [
    tournamentId,
    matchId,
    homeScore,
    awayScore,
    scoringVersion,
  ];

  const hasKnockoutData =
    qualifiedTeamId != null ||
    qualificationMethod != null ||
    extraTimeHomeScore != null ||
    extraTimeAwayScore != null ||
    penaltiesHomeScore != null ||
    penaltiesAwayScore != null;

  if (hasKnockoutData) {
    parts.push(
      qualifiedTeamId ?? "",
      qualificationMethod ?? "",
      extraTimeHomeScore ?? "",
      extraTimeAwayScore ?? "",
      penaltiesHomeScore ?? "",
      penaltiesAwayScore ?? "",
    );
  }

  const source = parts.join("|");
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `v2-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
