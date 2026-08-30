import type { Tournament } from "./types";

export const TOURNAMENT_SECTIONS = [
  "matches",
  "predictions",
  "leaderboard",
  "studio",
  "rules",
] as const;

export type TournamentSection = (typeof TOURNAMENT_SECTIONS)[number];

type TournamentRouteSource = Pick<Tournament, "slug"> | string;

function resolveTournamentSlug(source: TournamentRouteSource): string {
  const slug = typeof source === "string" ? source : source.slug;
  return slug.trim().replace(/^\/+|\/+$/g, "");
}

export function getTournamentHref(source: TournamentRouteSource): string {
  return `/tournaments/${resolveTournamentSlug(source)}`;
}

export function getTournamentSectionHref(
  source: TournamentRouteSource,
  section: TournamentSection,
): string {
  return `${getTournamentHref(source)}/${section}`;
}

export function getTournamentsHref(): string {
  return "/tournaments";
}
