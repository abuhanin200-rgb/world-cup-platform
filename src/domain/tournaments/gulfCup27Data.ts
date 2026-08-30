import { GULF_CUP_27_TOURNAMENT_ID } from "./gulfCup27";
import type { TournamentMatchV2, TournamentTeamV2 } from "./v2Types";

const T = GULF_CUP_27_TOURNAMENT_ID;

export const GULF_CUP_27_TEAMS: readonly TournamentTeamV2[] = [
  { id: "ksa", tournamentId: T, code: "KSA", flagCode: "sa", nameAr: "السعودية", nameEn: "Saudi Arabia", shortName: "السعودية", group: "A", sortOrder: 1, isActive: true },
  { id: "kuw", tournamentId: T, code: "KUW", flagCode: "kw", nameAr: "الكويت", nameEn: "Kuwait", shortName: "الكويت", group: "A", sortOrder: 2, isActive: true },
  { id: "irq", tournamentId: T, code: "IRQ", flagCode: "iq", nameAr: "العراق", nameEn: "Iraq", shortName: "العراق", group: "A", sortOrder: 3, isActive: true },
  { id: "oma", tournamentId: T, code: "OMA", flagCode: "om", nameAr: "عُمان", nameEn: "Oman", shortName: "عُمان", group: "A", sortOrder: 4, isActive: true },
  { id: "uae", tournamentId: T, code: "UAE", flagCode: "ae", nameAr: "الإمارات", nameEn: "United Arab Emirates", shortName: "الإمارات", group: "B", sortOrder: 5, isActive: true },
  { id: "qat", tournamentId: T, code: "QAT", flagCode: "qa", nameAr: "قطر", nameEn: "Qatar", shortName: "قطر", group: "B", sortOrder: 6, isActive: true },
  { id: "bhr", tournamentId: T, code: "BHR", flagCode: "bh", nameAr: "البحرين", nameEn: "Bahrain", shortName: "البحرين", group: "B", sortOrder: 7, isActive: true },
  { id: "yem", tournamentId: T, code: "YEM", flagCode: "ye", nameAr: "اليمن", nameEn: "Yemen", shortName: "اليمن", group: "B", sortOrder: 8, isActive: true },
] as const;

function groupMatch(
  id: string,
  round: string,
  group: "A" | "B",
  homeTeamId: string,
  awayTeamId: string,
  iso: string,
  stadium: string,
): TournamentMatchV2 {
  return {
    id,
    tournamentId: T,
    stage: "group",
    round,
    group,
    homeTeamId,
    awayTeamId,
    kickoffAt: new Date(iso).getTime(),
    stadium,
    city: "جدة",
    status: "scheduled",
    predictionOpensAt: null,
    predictionClosesAt: null,
    result: { homeScore: null, awayScore: null },
  };
}

function knockoutMatch({
  id,
  round,
  iso,
  homeSourceLabel,
  awaySourceLabel,
}: {
  id: string;
  round: "نصف النهائي" | "النهائي";
  iso: string;
  homeSourceLabel: string;
  awaySourceLabel: string;
}): TournamentMatchV2 {
  return {
    id,
    tournamentId: T,
    stage: "knockout",
    round,
    group: null,
    homeTeamId: "",
    awayTeamId: "",
    homeSourceLabel,
    awaySourceLabel,
    kickoffAt: new Date(iso).getTime(),
    stadium: "يحدد لاحقًا",
    city: "جدة",
    status: "scheduled",
    predictionOpensAt: null,
    predictionClosesAt: null,
    result: {
      homeScore: null,
      awayScore: null,
      extraTimeHomeScore: null,
      extraTimeAwayScore: null,
      penaltiesHomeScore: null,
      penaltiesAwayScore: null,
      qualifiedTeamId: null,
      qualificationMethod: null,
    },
  };
}

export const GULF_CUP_27_GROUP_MATCHES: readonly TournamentMatchV2[] = [
  groupMatch("g27-a-r1-irq-oma", "الجولة 1", "A", "irq", "oma", "2026-09-23T17:30:00+03:00", "استاد الأمير عبدالله الفيصل"),
  groupMatch("g27-a-r1-ksa-kuw", "الجولة 1", "A", "ksa", "kuw", "2026-09-23T21:00:00+03:00", "استاد مدينة الملك عبدالله الرياضية"),
  groupMatch("g27-b-r1-uae-yem", "الجولة 1", "B", "uae", "yem", "2026-09-24T18:00:00+03:00", "استاد مدينة الملك عبدالله الرياضية"),
  groupMatch("g27-b-r1-qat-bhr", "الجولة 1", "B", "qat", "bhr", "2026-09-24T21:00:00+03:00", "استاد الأمير عبدالله الفيصل"),
  groupMatch("g27-a-r2-kuw-irq", "الجولة 2", "A", "kuw", "irq", "2026-09-26T18:00:00+03:00", "استاد الأمير عبدالله الفيصل"),
  groupMatch("g27-a-r2-ksa-oma", "الجولة 2", "A", "ksa", "oma", "2026-09-26T21:00:00+03:00", "استاد مدينة الملك عبدالله الرياضية"),
  groupMatch("g27-b-r2-yem-qat", "الجولة 2", "B", "yem", "qat", "2026-09-27T18:00:00+03:00", "استاد مدينة الملك عبدالله الرياضية"),
  groupMatch("g27-b-r2-uae-bhr", "الجولة 2", "B", "uae", "bhr", "2026-09-27T21:00:00+03:00", "استاد الأمير عبدالله الفيصل"),
  groupMatch("g27-a-r3-ksa-irq", "الجولة 3", "A", "ksa", "irq", "2026-09-29T20:30:00+03:00", "استاد مدينة الملك عبدالله الرياضية"),
  groupMatch("g27-a-r3-oma-kuw", "الجولة 3", "A", "oma", "kuw", "2026-09-29T20:30:00+03:00", "استاد الأمير عبدالله الفيصل"),
  groupMatch("g27-b-r3-uae-qat", "الجولة 3", "B", "uae", "qat", "2026-09-30T20:30:00+03:00", "استاد مدينة الملك عبدالله الرياضية"),
  groupMatch("g27-b-r3-bhr-yem", "الجولة 3", "B", "bhr", "yem", "2026-09-30T20:30:00+03:00", "استاد الأمير عبدالله الفيصل"),
] as const;

export const GULF_CUP_27_KNOCKOUT_MATCHES: readonly TournamentMatchV2[] = [
  knockoutMatch({
    id: "g27-sf-1",
    round: "نصف النهائي",
    iso: "2026-10-03T20:00:00+03:00",
    homeSourceLabel: "متصدر المجموعة A",
    awaySourceLabel: "وصيف المجموعة B",
  }),
  knockoutMatch({
    id: "g27-sf-2",
    round: "نصف النهائي",
    iso: "2026-10-03T20:00:00+03:00",
    homeSourceLabel: "متصدر المجموعة B",
    awaySourceLabel: "وصيف المجموعة A",
  }),
  knockoutMatch({
    id: "g27-final",
    round: "النهائي",
    iso: "2026-10-06T20:00:00+03:00",
    homeSourceLabel: "الفائز من نصف النهائي 1",
    awaySourceLabel: "الفائز من نصف النهائي 2",
  }),
] as const;

export const GULF_CUP_27_MATCHES: readonly TournamentMatchV2[] = [
  ...GULF_CUP_27_GROUP_MATCHES,
  ...GULF_CUP_27_KNOCKOUT_MATCHES,
] as const;

export const GULF_CUP_27_KNOCKOUT_DATES = {
  semiFinalsAt: new Date("2026-10-03T20:00:00+03:00").getTime(),
  finalAt: new Date("2026-10-06T20:00:00+03:00").getTime(),
} as const;

export function getGulfCup27Team(teamId: string) {
  return GULF_CUP_27_TEAMS.find((team) => team.id === teamId) ?? null;
}

export function getGulfCup27Group(group: "A" | "B") {
  return GULF_CUP_27_TEAMS.filter((team) => team.group === group);
}

export function getNextGulfCup27Match(now = Date.now()) {
  return (
    [...GULF_CUP_27_MATCHES]
      .filter((item) => item.homeTeamId && item.awayTeamId)
      .sort((a, b) => a.kickoffAt - b.kickoffAt)
      .find((item) => item.kickoffAt >= now) ?? null
  );
}
