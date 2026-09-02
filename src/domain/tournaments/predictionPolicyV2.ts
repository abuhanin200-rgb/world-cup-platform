import type { TournamentMatchStatus } from "./v2Types";

export const TOURNAMENT_PREDICTION_MAX_SCORE = 30;

export type TournamentPredictionWindowMatchV2 = {
  homeTeamId: string;
  awayTeamId: string;
  kickoffAt: number;
  status: TournamentMatchStatus;
  predictionOpensAt: number | null;
  predictionClosesAt: number | null;
  predictionIsOpen?: boolean;
  predictionEditingIsOpen?: boolean;
};

export type TournamentPredictionWindowStateV2 =
  | "teams_pending"
  | "not_open"
  | "open"
  | "closed"
  | "live"
  | "finished"
  | "postponed"
  | "cancelled";

export type TournamentPredictionSubmissionCodeV2 =
  | "PREDICTION_ALLOWED"
  | "PREDICTION_TEAMS_PENDING"
  | "PREDICTION_NOT_OPEN"
  | "PREDICTION_CLOSED"
  | "PREDICTION_EDITING_CLOSED"
  | "PREDICTION_MATCH_LIVE"
  | "PREDICTION_MATCH_FINISHED"
  | "PREDICTION_MATCH_POSTPONED"
  | "PREDICTION_MATCH_CANCELLED";

export function isValidTournamentPredictionScoreV2(value: number) {
  return (
    Number.isInteger(value) &&
    value >= 0 &&
    value <= TOURNAMENT_PREDICTION_MAX_SCORE
  );
}

export function getTournamentPredictionDeadlineV2(
  match: TournamentPredictionWindowMatchV2,
) {
  const kickoffAt = Number(match.kickoffAt);
  const configuredClose = Number(match.predictionClosesAt ?? kickoffAt);

  if (!Number.isFinite(kickoffAt) || kickoffAt <= 0) return 0;
  if (!Number.isFinite(configuredClose) || configuredClose <= 0) {
    return kickoffAt;
  }

  return Math.min(kickoffAt, configuredClose);
}

export function getTournamentPredictionWindowStateV2(
  match: TournamentPredictionWindowMatchV2,
  now = Date.now(),
): TournamentPredictionWindowStateV2 {
  if (!match.homeTeamId || !match.awayTeamId) return "teams_pending";
  if (match.status === "cancelled") return "cancelled";
  if (match.status === "postponed") return "postponed";
  if (match.status === "finished") return "finished";
  if (match.status === "live") return "live";

  const deadline = getTournamentPredictionDeadlineV2(match);
  if (!deadline || now >= deadline || now >= match.kickoffAt) return "closed";

  const opensAt = match.predictionOpensAt;
  if (opensAt != null && now < opensAt) return "not_open";

  if (!match.predictionIsOpen) {
    return opensAt == null ? "not_open" : "closed";
  }

  return "open";
}

export function canEditTournamentPredictionV2(
  match: TournamentPredictionWindowMatchV2,
  now = Date.now(),
) {
  if (!match.homeTeamId || !match.awayTeamId) return false;
  if (!match.predictionEditingIsOpen) return false;
  if (match.status !== "scheduled" && match.status !== "prediction_open") {
    return false;
  }

  const deadline = getTournamentPredictionDeadlineV2(match);
  return Boolean(deadline && now < deadline && now < match.kickoffAt);
}

export function getTournamentPredictionSubmissionDecisionV2({
  match,
  now = Date.now(),
  hasPrediction,
}: {
  match: TournamentPredictionWindowMatchV2;
  now?: number;
  hasPrediction: boolean;
}): { allowed: boolean; code: TournamentPredictionSubmissionCodeV2 } {
  const state = getTournamentPredictionWindowStateV2(match, now);

  if (state === "teams_pending") {
    return { allowed: false, code: "PREDICTION_TEAMS_PENDING" };
  }
  if (state === "cancelled") {
    return { allowed: false, code: "PREDICTION_MATCH_CANCELLED" };
  }
  if (state === "postponed") {
    return { allowed: false, code: "PREDICTION_MATCH_POSTPONED" };
  }
  if (state === "finished") {
    return { allowed: false, code: "PREDICTION_MATCH_FINISHED" };
  }
  if (state === "live") {
    return { allowed: false, code: "PREDICTION_MATCH_LIVE" };
  }

  if (hasPrediction) {
    return canEditTournamentPredictionV2(match, now)
      ? { allowed: true, code: "PREDICTION_ALLOWED" }
      : { allowed: false, code: "PREDICTION_EDITING_CLOSED" };
  }

  if (state === "not_open") {
    return { allowed: false, code: "PREDICTION_NOT_OPEN" };
  }
  if (state !== "open") {
    return { allowed: false, code: "PREDICTION_CLOSED" };
  }

  return { allowed: true, code: "PREDICTION_ALLOWED" };
}

export function tournamentPredictionSubmissionMessageV2(
  code: TournamentPredictionSubmissionCodeV2,
) {
  switch (code) {
    case "PREDICTION_TEAMS_PENDING":
      return "لم يتم تحديد طرفي المباراة بعد.";
    case "PREDICTION_NOT_OPEN":
      return "لم يفتح التوقع لهذه المباراة بعد.";
    case "PREDICTION_EDITING_CLOSED":
      return "انتهت مهلة تعديل التوقع لهذه المباراة.";
    case "PREDICTION_MATCH_LIVE":
      return "بدأت المباراة وأُغلق التوقع تلقائيًا.";
    case "PREDICTION_MATCH_FINISHED":
      return "انتهت المباراة ولا يمكن حفظ توقع جديد.";
    case "PREDICTION_MATCH_POSTPONED":
      return "المباراة مؤجلة والتوقع متوقف حتى اعتماد موعد جديد.";
    case "PREDICTION_MATCH_CANCELLED":
      return "أُلغيت المباراة ولا يمكن حفظ توقع عليها.";
    case "PREDICTION_CLOSED":
      return "أُغلق التوقع لهذه المباراة. لم تُحفظ أي تغييرات.";
    default:
      return "التوقع متاح.";
  }
}
