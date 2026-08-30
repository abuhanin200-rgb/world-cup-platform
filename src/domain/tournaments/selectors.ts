import type { Tournament, TournamentStatus } from "./types";

export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: "مسودة",
  coming_soon: "قريبًا",
  registration_open: "التسجيل مفتوح",
  active: "جارية",
  paused: "متوقفة مؤقتًا",
  finished: "منتهية",
  hidden: "مخفية",
};

const PUBLIC_TOURNAMENT_STATUSES = new Set<TournamentStatus>([
  "coming_soon",
  "registration_open",
  "active",
  "paused",
  "finished",
]);

export function getTournamentStatusLabel(status: TournamentStatus): string {
  return TOURNAMENT_STATUS_LABELS[status];
}

export function isTournamentPublic(tournament: Tournament): boolean {
  return PUBLIC_TOURNAMENT_STATUSES.has(tournament.status);
}

export function isTournamentLive(tournament: Tournament): boolean {
  return tournament.status === "active";
}

export function canTournamentAcceptPredictions(tournament: Tournament): boolean {
  if (!tournament.features.predictions) {
    return false;
  }

  return (
    tournament.status === "registration_open" || tournament.status === "active"
  );
}

export function sortTournamentsByDisplayOrder(
  tournaments: readonly Tournament[],
): Tournament[] {
  return [...tournaments].sort((first, second) => {
    if (first.isCurrent !== second.isCurrent) {
      return first.isCurrent ? -1 : 1;
    }

    if (first.sortOrder !== second.sortOrder) {
      return first.sortOrder - second.sortOrder;
    }

    return first.name.localeCompare(second.name, "ar");
  });
}

export function getPublicTournaments(
  tournaments: readonly Tournament[],
): Tournament[] {
  return sortTournamentsByDisplayOrder(
    tournaments.filter(isTournamentPublic),
  );
}

export function getPreferredTournament(
  tournaments: readonly Tournament[],
): Tournament | null {
  const sorted = sortTournamentsByDisplayOrder(tournaments);

  return (
    sorted.find(
      (tournament) => tournament.isCurrent && isTournamentPublic(tournament),
    ) ??
    sorted.find((tournament) => tournament.status === "active") ??
    sorted.find((tournament) => tournament.status === "registration_open") ??
    sorted.find((tournament) => tournament.status === "coming_soon") ??
    sorted.find((tournament) => tournament.status === "finished") ??
    null
  );
}
