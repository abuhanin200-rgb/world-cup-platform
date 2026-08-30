export const TOURNAMENT_SPORTS_PROVIDERS = ["api-football"] as const;
export type TournamentSportsProvider = (typeof TOURNAMENT_SPORTS_PROVIDERS)[number];

export type TournamentSportsSyncMode = "protected_auto" | "review_only";
export type TournamentSportsSeasonAvailability = "unknown" | "pending" | "available";

export type TournamentSportsIntegrationConfig = {
  tournamentId: string;
  provider: TournamentSportsProvider;
  enabled: boolean;
  leagueId: number | null;
  season: number;
  providerLeagueName: string | null;
  providerAvailableSeasons: number[];
  seasonAvailability: TournamentSportsSeasonAvailability;
  lastSeasonCheckAt: number | null;
  seasonAvailableAt: number | null;
  lastDiscoveryAt: number | null;
  syncSchedule: boolean;
  syncStatus: boolean;
  syncResults: boolean;
  syncMode: TournamentSportsSyncMode;
  autoDiscover: boolean;
  updatedAt: number;
  lastSyncAt: number | null;
  lastSuccessAt: number | null;
  lastError: string | null;
};

export type TournamentSportsProviderFixture = {
  fixtureId: number;
  leagueId: number;
  season: number;
  round: string;
  kickoffAt: number;
  venue: string;
  city: string;
  statusShort: string;
  statusLong: string;
  elapsed: number | null;
  homeProviderTeamId: number;
  homeName: string;
  awayProviderTeamId: number;
  awayName: string;
  goalsHome: number | null;
  goalsAway: number | null;
  fulltimeHome: number | null;
  fulltimeAway: number | null;
  extraTimeHome: number | null;
  extraTimeAway: number | null;
  penaltiesHome: number | null;
  penaltiesAway: number | null;
};

export type TournamentSportsMatchLink = {
  matchId: string;
  providerFixtureId: number | null;
  providerStatusShort: string | null;
  providerLastSyncedAt: number | null;
  providerSyncState:
    | "unlinked"
    | "linked"
    | "synced"
    | "awaiting_review"
    | "calculated"
    | "conflict";
  providerSyncMessage: string | null;
};

export type TournamentSportsLeagueSearchResult = {
  id: number;
  name: string;
  country: string;
  type: string;
  logo: string | null;
  seasons: number[];
};
