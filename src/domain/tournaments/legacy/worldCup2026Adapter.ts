import {
  WORLD_CUP_2026_TOURNAMENT,
  WORLD_CUP_2026_TOURNAMENT_ID,
} from "./worldCup2026";

/**
 * أسماء مصادر البيانات التاريخية كما يستخدمها مشروع كأس العالم الحالي.
 * هذا الملف لا يصل إلى Firebase بنفسه؛ هو عقد مركزي فقط لطبقة Legacy.
 */
export const WORLD_CUP_2026_LEGACY_COLLECTIONS = {
  matches: "matches",
  predictions: "predictions",
  users: "users",
  teams: "teams",
  studio: "challengeStudio",
} as const;

export type WorldCup2026LegacyCollection =
  (typeof WORLD_CUP_2026_LEGACY_COLLECTIONS)[keyof typeof WORLD_CUP_2026_LEGACY_COLLECTIONS];

export type WorldCup2026LegacyRecord<T> = {
  tournamentId: typeof WORLD_CUP_2026_TOURNAMENT_ID;
  tournamentEngine: typeof WORLD_CUP_2026_TOURNAMENT.engine;
  data: T;
};

/**
 * يضيف سياق البطولة في الذاكرة فقط عند قراءة سجل Legacy مستقبلًا.
 * لا يعدّل المستند الأصلي ولا يكتب tournamentId في Firestore.
 */
export function wrapWorldCup2026LegacyRecord<T>(
  data: T,
): WorldCup2026LegacyRecord<T> {
  return {
    tournamentId: WORLD_CUP_2026_TOURNAMENT_ID,
    tournamentEngine: WORLD_CUP_2026_TOURNAMENT.engine,
    data,
  };
}
