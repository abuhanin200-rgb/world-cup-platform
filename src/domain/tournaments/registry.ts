import type { Tournament } from "./types";
import { WORLD_CUP_2026_TOURNAMENT } from "./legacy/worldCup2026";
import { GULF_CUP_27_TOURNAMENT } from "./gulfCup27";
import { ASIAN_CUP_2027_TOURNAMENT } from "./asianCup2027";

/**
 * السجل المركزي للبطولات المعرفة داخل الكود في المرحلة الانتقالية.
 *
 * كأس العالم 2026 يبقى Legacy كما هو، بينما البطولات الجديدة تستخدم V2.
 * لاحقًا سيجلب Firestore البطولات الديناميكية ويظل هذا السجل fallback آمنًا.
 */
export const TOURNAMENT_REGISTRY: readonly Tournament[] = Object.freeze([
  GULF_CUP_27_TOURNAMENT,
  ASIAN_CUP_2027_TOURNAMENT,
  WORLD_CUP_2026_TOURNAMENT,
]);

export function getRegisteredTournaments(): Tournament[] {
  return [...TOURNAMENT_REGISTRY].sort(
    (first, second) => first.sortOrder - second.sortOrder,
  );
}

export function getRegisteredTournamentById(
  tournamentId: string | null | undefined,
): Tournament | null {
  if (!tournamentId) {
    return null;
  }

  return (
    TOURNAMENT_REGISTRY.find((tournament) => tournament.id === tournamentId) ??
    null
  );
}

export function getRegisteredTournamentBySlug(
  slug: string | null | undefined,
): Tournament | null {
  if (!slug) {
    return null;
  }

  return (
    TOURNAMENT_REGISTRY.find((tournament) => tournament.slug === slug) ?? null
  );
}

export function getCurrentRegisteredTournament(): Tournament | null {
  return (
    TOURNAMENT_REGISTRY.find(
      (tournament) => tournament.isCurrent && tournament.status !== "hidden",
    ) ?? null
  );
}

export function isRegisteredTournament(
  tournamentId: string | null | undefined,
): boolean {
  return getRegisteredTournamentById(tournamentId) !== null;
}
