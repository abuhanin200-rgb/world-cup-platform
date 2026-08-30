import type { Tournament } from "../types";

/**
 * كأس العالم 2026 محفوظ كمسار Legacy مستقل.
 *
 * مهم:
 * - هذا التعريف لا يقرأ ولا يكتب في Firebase.
 * - لا يغيّر collections الحالية مثل matches أو predictions.
 * - لا يغيّر scoring.ts أو أي منطق احتساب تاريخي.
 * - engine=legacy_wc2026 يمنع خلط البطولة مع Tournament Engine V2 مستقبلًا.
 */
export const WORLD_CUP_2026_TOURNAMENT_ID = "wc2026" as const;
export const WORLD_CUP_2026_TOURNAMENT_SLUG = "world-cup-2026" as const;

const LEGACY_DEFINITION_TIMESTAMP = Date.UTC(2026, 7, 27);

export const WORLD_CUP_2026_TOURNAMENT = {
  id: WORLD_CUP_2026_TOURNAMENT_ID,
  name: "كأس العالم 2026",
  shortName: "كأس العالم 2026",
  slug: WORLD_CUP_2026_TOURNAMENT_SLUG,
  description: "استعرض مباريات كأس العالم 2026 ونتائج التوقعات والترتيب والإحصائيات النهائية للبطولة.",
  hostCountry: "الولايات المتحدة وكندا والمكسيك",
  hostCities: [],
  startAt: Date.UTC(2026, 5, 11),
  endAt: Date.UTC(2026, 6, 19, 23, 59, 59, 999),
  status: "finished",
  sortOrder: 100,
  isCurrent: false,
  format: "groups_knockout",
  engine: "legacy_wc2026",
  calculationMode: "manual",
  scoringTemplateId: "world-cup-2026-legacy",
  scoringVersion: "legacy-final",
  branding: {
    logoUrl: "/wc2026-logo-black.png",
    shareImageUrl: "/og-image.png",
    faviconUrl: "/favicon.png",
    primaryColor: "#22D3EE",
    secondaryColor: "#FBBF24",
    accentColor: "#3B82F6",
    backgroundColor: "#020617",
    cardColor: "#0F172A",
    textColor: "#F8FAFC",
    headerVariant: "legacy_wc2026",
    matchCardVariant: "legacy_wc2026",
  },
  features: {
    predictions: true,
    leaderboard: true,
    studio: true,
    achievements: true,
    rewards: false,
    statistics: true,
  },
  createdAt: LEGACY_DEFINITION_TIMESTAMP,
  updatedAt: LEGACY_DEFINITION_TIMESTAMP,
} satisfies Tournament;

/**
 * Type guard مركزي لاكتشاف كأس العالم 2026 بدون تكرار النصوص في بقية النظام.
 */
export function isWorldCup2026Tournament(
  tournamentId: string | null | undefined,
): tournamentId is typeof WORLD_CUP_2026_TOURNAMENT_ID {
  return tournamentId === WORLD_CUP_2026_TOURNAMENT_ID;
}
