export const TOURNAMENT_MATCH_STATUSES = [
  "scheduled",
  "prediction_open",
  "live",
  "finished",
  "postponed",
  "cancelled",
] as const;

export type TournamentMatchStatus =
  (typeof TOURNAMENT_MATCH_STATUSES)[number];

export const TOURNAMENT_MATCH_STAGES = ["group", "knockout"] as const;
export type TournamentMatchStage = (typeof TOURNAMENT_MATCH_STAGES)[number];

export const TOURNAMENT_QUALIFICATION_METHODS = [
  "regular",
  "extra_time",
  "penalties",
] as const;
export type TournamentQualificationMethod =
  (typeof TOURNAMENT_QUALIFICATION_METHODS)[number];

export type TournamentTeamV2 = {
  id: string;
  tournamentId: string;
  code: string;
  flagCode: string;
  nameAr: string;
  nameEn: string;
  shortName: string;
  group: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type TournamentMatchV2 = {
  id: string;
  tournamentId: string;
  stage: TournamentMatchStage;
  round: string;
  group: string | null;
  homeTeamId: string;
  awayTeamId: string;
  homeSourceLabel?: string | null;
  awaySourceLabel?: string | null;
  kickoffAt: number;
  stadium: string;
  city: string;
  status: TournamentMatchStatus;
  predictionOpensAt: number | null;
  predictionClosesAt: number | null;
  predictionIsOpen?: boolean;
  predictionEditingIsOpen?: boolean;
  calculationStatus?: "not_calculated" | "processing" | "calculated" | "error";
  calculationVersion?: string | null;
  resultHash?: string | null;
  calculatedAt?: number | null;
  calculatedPredictions?: number;
  result: {
    homeScore: number | null;
    awayScore: number | null;
    extraTimeHomeScore?: number | null;
    extraTimeAwayScore?: number | null;
    penaltiesHomeScore?: number | null;
    penaltiesAwayScore?: number | null;
    qualifiedTeamId?: string | null;
    qualificationMethod?: TournamentQualificationMethod | null;
  };
};

export type TournamentPredictionPointsBreakdownV2 = {
  score: number;
  qualified: number;
  method: number;
};

export type TournamentPredictionV2 = {
  id: string;
  tournamentId: string;
  matchId: string;
  userId: string;
  userName?: string;
  homeScore: number;
  awayScore: number;
  qualifiedTeamId?: string | null;
  qualificationMethod?: TournamentQualificationMethod | null;
  points: number | null;
  pointsBreakdown?: TournamentPredictionPointsBreakdownV2 | null;
  isCalculated?: boolean;
  resultType?: "exact" | "outcome" | "wrong" | null;
  submittedAt: number;
  updatedAt: number;
  calculatedAt?: number | null;
  scoringVersion?: string | null;
  resultHash?: string | null;
  calculationRunId?: string | null;
};

export type TournamentUserStatsV2 = {
  id: string;
  tournamentId: string;
  userId: string;
  fullName: string;
  points: number;
  rank: number | null;
  played: number;
  exact: number;
  correctOutcome: number;
  wrong: number;
  currentStreak: number;
  bestStreak: number;
  updatedAt: number;
};
