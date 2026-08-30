export const TOURNAMENT_STATUSES = [
  "draft",
  "coming_soon",
  "registration_open",
  "active",
  "paused",
  "finished",
  "hidden",
] as const;

export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];

export const TOURNAMENT_FORMATS = [
  "groups",
  "league",
  "knockout",
  "groups_knockout",
  "custom",
] as const;

export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];

export const TOURNAMENT_CALCULATION_MODES = [
  "automatic",
  "automatic_guarded",
  "manual",
] as const;

export type TournamentCalculationMode =
  (typeof TOURNAMENT_CALCULATION_MODES)[number];

export const TOURNAMENT_ENGINES = ["legacy_wc2026", "v2"] as const;

export type TournamentEngine = (typeof TOURNAMENT_ENGINES)[number];

export type TournamentBranding = {
  logoUrl?: string;
  coverUrl?: string;
  heroUrl?: string;
  backgroundUrl?: string;
  trophyUrl?: string;
  shareImageUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  cardColor?: string;
  textColor?: string;
  headerVariant?: string;
  matchCardVariant?: string;
};

export type TournamentFeatures = {
  predictions: boolean;
  leaderboard: boolean;
  studio: boolean;
  achievements: boolean;
  rewards: boolean;
  statistics: boolean;
};

export type Tournament = {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  description?: string;
  hostCountry?: string;
  hostCities: string[];
  startAt: number | null;
  endAt: number | null;
  status: TournamentStatus;
  sortOrder: number;
  isCurrent: boolean;
  format: TournamentFormat;
  engine: TournamentEngine;
  calculationMode: TournamentCalculationMode;
  scoringTemplateId?: string;
  scoringVersion?: string;
  branding: TournamentBranding;
  features: TournamentFeatures;
  createdAt: number;
  updatedAt: number;
};

export type CreateTournamentInput = Omit<
  Tournament,
  "id" | "createdAt" | "updatedAt"
>;

export type UpdateTournamentInput = Partial<
  Omit<Tournament, "id" | "createdAt" | "updatedAt">
>;
