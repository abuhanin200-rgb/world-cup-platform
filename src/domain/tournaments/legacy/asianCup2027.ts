import type { Tournament } from "../types";

export const ASIAN_CUP_2027_TOURNAMENT_ID = "asian2027" as const;
export const ASIAN_CUP_2027_TOURNAMENT_SLUG = "asian-cup-2027" as const;

const DEFINITION_TIMESTAMP = Date.UTC(2026, 7, 29);

/**
 * كأس آسيا 2027 - السعودية.
 * تاريخ البداية والنهاية مأخوذ من مادة الهوية التي تم تزويد المشروع بها:
 * 7 January - 5 February 2027.
 */
export const ASIAN_CUP_2027_TOURNAMENT = {
  id: ASIAN_CUP_2027_TOURNAMENT_ID,
  name: "كأس آسيا 2027",
  shortName: "آسيا 2027",
  slug: ASIAN_CUP_2027_TOURNAMENT_SLUG,
  description:
    "كأس آسيا 2027 في السعودية، بواجهة مستقلة مستوحاة من الهوية البصرية الخاصة بالبطولة.",
  hostCountry: "السعودية",
  hostCities: [],
  startAt: Date.UTC(2027, 0, 7),
  endAt: Date.UTC(2027, 1, 5, 23, 59, 59, 999),
  status: "coming_soon",
  sortOrder: 20,
  isCurrent: false,
  format: "groups_knockout",
  engine: "v2",
  calculationMode: "automatic_guarded",
  scoringTemplateId: "asian-cup-2027",
  scoringVersion: "v1",
  branding: {
    logoUrl: "/tournaments/asian-cup-2027/logo.png",
    coverUrl: "/tournaments/asian-cup-2027/identity-poster.jpg",
    heroUrl: "/tournaments/asian-cup-2027/identity-cover.jpg",
    backgroundUrl: "/tournaments/asian-cup-2027/identity-cover.jpg",
    trophyUrl: "/tournaments/asian-cup-2027/logo.png",
    shareImageUrl: "/tournaments/asian-cup-2027/identity-cover.jpg",
    primaryColor: "#63E77D",
    secondaryColor: "#CDBE9E",
    accentColor: "#7466E8",
    backgroundColor: "#082F34",
    cardColor: "#103E42",
    textColor: "#FFFFFF",
    headerVariant: "asian_cup_2027",
    matchCardVariant: "asian_cup_2027",
  },
  features: {
    predictions: true,
    leaderboard: true,
    studio: true,
    achievements: true,
    rewards: true,
    statistics: true,
  },
  createdAt: DEFINITION_TIMESTAMP,
  updatedAt: DEFINITION_TIMESTAMP,
} satisfies Tournament;

export function isAsianCup2027Tournament(
  tournamentId: string | null | undefined,
): tournamentId is typeof ASIAN_CUP_2027_TOURNAMENT_ID {
  return tournamentId === ASIAN_CUP_2027_TOURNAMENT_ID;
}
