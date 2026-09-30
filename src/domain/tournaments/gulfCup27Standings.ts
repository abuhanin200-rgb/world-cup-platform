import { GULF_CUP_27_TEAMS } from "./gulfCup27Data";
import {
  calculateTournamentGroupStandingsV2,
  type TournamentGroupStandingV2,
} from "./standingsV2";
import type { TournamentMatchV2 } from "./v2Types";

export const GULF_CUP_27_OFFICIAL_TIEBREAK_DECISIONS = [
  {
    group: "A",
    higherTeamId: "oma",
    lowerTeamId: "irq",
    label: "حُسم المركز الثاني بالقرعة الرسمية لصالح عُمان",
  },
] as const;

function isFinalPrimaryTie(
  higher: TournamentGroupStandingV2,
  lower: TournamentGroupStandingV2,
  groupSize: number,
) {
  const expectedPlayed = Math.max(0, groupSize - 1);
  return (
    higher.played === expectedPlayed &&
    lower.played === expectedPlayed &&
    higher.points === lower.points &&
    higher.goalDifference === lower.goalDifference &&
    higher.goalsFor === lower.goalsFor &&
    higher.won === lower.won
  );
}

/**
 * ترتيب خليجي 27 مع تطبيق القرارات الرسمية التي لا يمكن استنتاجها من
 * أرقام المباريات وحدها، مثل حسم التساوي بالقرعة.
 */
export function calculateGulfCup27GroupStandingsV2({
  matches,
  group,
}: {
  matches: readonly TournamentMatchV2[];
  group: "A" | "B";
}) {
  const rows = calculateTournamentGroupStandingsV2({
    teams: GULF_CUP_27_TEAMS,
    matches,
    group,
  });

  const decision = GULF_CUP_27_OFFICIAL_TIEBREAK_DECISIONS.find(
    (item) => item.group === group,
  );
  if (!decision) return rows;

  const higherIndex = rows.findIndex((row) => row.teamId === decision.higherTeamId);
  const lowerIndex = rows.findIndex((row) => row.teamId === decision.lowerTeamId);
  if (higherIndex < 0 || lowerIndex < 0) return rows;

  const higher = rows[higherIndex];
  const lower = rows[lowerIndex];
  const groupSize = GULF_CUP_27_TEAMS.filter(
    (team) => team.group === group && team.isActive,
  ).length;

  if (!isFinalPrimaryTie(higher, lower, groupSize)) return rows;
  if (higherIndex < lowerIndex) return rows;

  const corrected = [...rows];
  corrected.splice(higherIndex, 1);
  const nextLowerIndex = corrected.findIndex((row) => row.teamId === decision.lowerTeamId);
  corrected.splice(nextLowerIndex, 0, higher);
  return corrected;
}

export function getGulfCup27OfficialTiebreakLabel({
  group,
  teamId,
  rows,
}: {
  group: "A" | "B";
  teamId: string;
  rows: readonly TournamentGroupStandingV2[];
}) {
  const decision = GULF_CUP_27_OFFICIAL_TIEBREAK_DECISIONS.find(
    (item) => item.group === group && item.higherTeamId === teamId,
  );
  if (!decision) return null;

  const higher = rows.find((row) => row.teamId === decision.higherTeamId);
  const lower = rows.find((row) => row.teamId === decision.lowerTeamId);
  if (!higher || !lower) return null;

  const groupSize = GULF_CUP_27_TEAMS.filter(
    (team) => team.group === group && team.isActive,
  ).length;
  return isFinalPrimaryTie(higher, lower, groupSize) ? decision.label : null;
}
