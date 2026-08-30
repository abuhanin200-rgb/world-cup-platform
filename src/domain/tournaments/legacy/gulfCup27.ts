import type { Tournament } from "../types";

export const GULF_CUP_27_TOURNAMENT_ID = "gulf27" as const;
export const GULF_CUP_27_TOURNAMENT_SLUG = "gulf-cup-27" as const;

const DEFINITION_TIMESTAMP = Date.UTC(2026, 7, 29);

/**
 * خليجي 27 هي أول بطولة تُعرّف على Tournament Engine V2.
 *
 * لا توجد في هذا الملف أي قراءة أو كتابة إلى Firestore؛ هو تعريف Domain فقط.
 * المواعيد الدقيقة للمباريات ستأتي لاحقًا من إدارة البطولة / Sports API.
 */
export const GULF_CUP_27_TOURNAMENT = {
  id: GULF_CUP_27_TOURNAMENT_ID,
  name: "كأس الخليج 27",
  shortName: "خليجي 27",
  slug: GULF_CUP_27_TOURNAMENT_SLUG,
  description:
    "بطولة خليجي 27 في السعودية، وتجربة توقعات مستقلة بهوية البطولة ضمن منصة التحدي.",
  hostCountry: "السعودية",
  hostCities: [],
  startAt: null,
  endAt: null,
  status: "active",
  sortOrder: 10,
  isCurrent: true,
  format: "groups_knockout",
  engine: "v2",
  calculationMode: "automatic_guarded",
  scoringTemplateId: "gulf-cup-27",
  scoringVersion: "v1",
  branding: {
    logoUrl: "/tournaments/gulf-cup-27/logo.jpg",
    coverUrl: "/tournaments/gulf-cup-27/identity-cover.jpg",
    heroUrl: "/tournaments/gulf-cup-27/identity-cover.jpg",
    backgroundUrl: "/tournaments/gulf-cup-27/identity-cover.jpg",
    shareImageUrl: "/tournaments/gulf-cup-27/identity-cover.jpg",
    primaryColor: "#16B77D",
    secondaryColor: "#85C95B",
    accentColor: "#F2C647",
    backgroundColor: "#0A2B1A",
    cardColor: "#123B28",
    textColor: "#FFFFFF",
    headerVariant: "gulf_cup_27",
    matchCardVariant: "gulf_cup_27",
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

export function isGulfCup27Tournament(
  tournamentId: string | null | undefined,
): tournamentId is typeof GULF_CUP_27_TOURNAMENT_ID {
  return tournamentId === GULF_CUP_27_TOURNAMENT_ID;
}
