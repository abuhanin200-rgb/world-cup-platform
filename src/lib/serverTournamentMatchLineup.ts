import "server-only";

import { adminDb } from "@/lib/firebaseAdmin";
import {
  getApiFootballFixtureInjuries,
  getApiFootballFixtureLineups,
  getApiFootballFixturesByIds,
  getApiFootballLineupsByFixtureIds,
  getApiFootballRecentTeamFixtures,
  getApiFootballTeamSquad,
  type ApiFootballFixtureInjury,
  type ApiFootballLineupPlayer,
  type ApiFootballSquadPlayer,
  type ApiFootballTeamLineup,
} from "@/lib/serverApiFootball";
import {
  getVerifiedGulfCup27Coach,
  resolveVerifiedGulfCup27Player,
  type GulfCup27VerifiedRole,
} from "@/domain/tournaments/gulfCup27VerifiedRosters";

const LINEUP_CACHE_COLLECTION = "tournamentMatchLineupCache";
const SQUAD_CACHE_COLLECTION = "apiFootballTeamSquadCache";
const LINEUP_SCHEMA_VERSION = 4;
const SQUAD_SCHEMA_VERSION = 1;
const SQUAD_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EXPECTED_LINEUP_TTL_MS = 90 * 60 * 1000;
const NEAR_MATCH_TTL_MS = 30 * 60 * 1000;
const OFFICIAL_RECHECK_TTL_MS = 10 * 60 * 1000;
const OFFICIAL_LINEUP_TTL_MS = 24 * 60 * 60 * 1000;
const OFFICIAL_CHECK_WINDOW_MS = 2 * 60 * 60 * 1000;
const NEAR_MATCH_WINDOW_MS = 24 * 60 * 60 * 1000;
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN", "AWD", "WO"]);

type LineupPlayer = {
  id: number;
  name: string;
  number: number | null;
  position: string;
  grid: string | null;
  photo: string | null;
};

type LineupAbsence = {
  id: number;
  name: string;
  position: string;
  photo: string | null;
  reason: string;
};

type LineupCoach = {
  id: number | null;
  name: string;
  photo: string | null;
} | null;

export type TournamentMatchTeamLineup = {
  side: "home" | "away";
  providerTeamId: number;
  localTeamId: string;
  name: string;
  logo: string | null;
  formation: string | null;
  source: "official" | "expected" | "unavailable";
  sourceFixtureId: number | null;
  sourceFixtureAt: number | null;
  coach: LineupCoach;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
  absences: LineupAbsence[];
};

export type TournamentMatchLineup = {
  tournamentId: string;
  matchId: string;
  providerFixtureId: number;
  kickoffAt: number;
  fetchedAt: number;
  expiresAt: number;
  schemaVersion: number;
  officialAvailable: boolean;
  home: TournamentMatchTeamLineup;
  away: TournamentMatchTeamLineup;
};

type LocalTeam = {
  id: string;
  nameAr: string;
  nameEn: string;
  code: string;
};

type SquadCache = {
  schemaVersion: number;
  providerTeamId: number;
  fetchedAt: number;
  expiresAt: number;
  players: ApiFootballSquadPlayer[];
};

type RecentFixture = {
  fixtureId: number;
  kickoffAt: number;
  statusShort: string;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function cacheDocId(tournamentId: string, id: string) {
  return `${tournamentId}_${id}`;
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sameTeamName(a: string, b: string) {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

async function loadMatch(tournamentId: string, matchId: string) {
  const snapshot = await adminDb
    .collection("tournamentMatches")
    .doc(cacheDocId(tournamentId, matchId))
    .get();

  if (!snapshot.exists) throw new Error("MATCH_NOT_FOUND");
  const data = snapshot.data() || {};
  if (clean(data.tournamentId) !== tournamentId || clean(data.id) !== matchId) {
    throw new Error("MATCH_NOT_FOUND");
  }

  return {
    providerFixtureId: numberOrNull(data.providerFixtureId),
    kickoffAt: Number(data.kickoffAt || 0),
    homeTeamId: clean(data.homeTeamId),
    awayTeamId: clean(data.awayTeamId),
  };
}

async function loadLocalTeam(tournamentId: string, teamId: string): Promise<LocalTeam | null> {
  const snapshot = await adminDb
    .collection("tournamentTeams")
    .doc(cacheDocId(tournamentId, teamId))
    .get();

  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  return {
    id: teamId,
    nameAr: clean(data.nameAr),
    nameEn: clean(data.nameEn),
    code: clean(data.code),
  };
}

async function getCachedLineup(tournamentId: string, matchId: string) {
  const snapshot = await adminDb
    .collection(LINEUP_CACHE_COLLECTION)
    .doc(cacheDocId(tournamentId, matchId))
    .get();
  if (!snapshot.exists) return null;

  const data = snapshot.data() as TournamentMatchLineup | undefined;
  if (
    !data ||
    data.schemaVersion !== LINEUP_SCHEMA_VERSION ||
    !Number.isFinite(data.expiresAt) ||
    data.expiresAt <= Date.now()
  ) {
    return null;
  }
  return data;
}

async function getCachedSquad(providerTeamId: number) {
  const snapshot = await adminDb
    .collection(SQUAD_CACHE_COLLECTION)
    .doc(String(providerTeamId))
    .get();
  if (!snapshot.exists) return null;

  const data = snapshot.data() as SquadCache | undefined;
  if (
    !data ||
    data.schemaVersion !== SQUAD_SCHEMA_VERSION ||
    data.providerTeamId !== providerTeamId ||
    !Number.isFinite(data.expiresAt) ||
    data.expiresAt <= Date.now() ||
    !Array.isArray(data.players)
  ) {
    return null;
  }
  return data.players;
}

async function getTeamSquad(providerTeamId: number) {
  const cached = await getCachedSquad(providerTeamId);
  if (cached) return cached;

  try {
    const result = await getApiFootballTeamSquad(providerTeamId);
    const now = Date.now();
    const cache: SquadCache = {
      schemaVersion: SQUAD_SCHEMA_VERSION,
      providerTeamId,
      fetchedAt: now,
      expiresAt: now + SQUAD_CACHE_TTL_MS,
      players: result.players,
    };
    await adminDb
      .collection(SQUAD_CACHE_COLLECTION)
      .doc(String(providerTeamId))
      .set(cache, { merge: false });
    return result.players;
  } catch {
    return [];
  }
}

function normalizeRole(position: string): GulfCup27VerifiedRole {
  const value = clean(position).toUpperCase();
  if (value === "G" || value.includes("GOAL")) return "G";
  if (value === "D" || value.includes("DEF")) return "D";
  if (value === "M" || value.includes("MID")) return "M";
  return "F";
}

function verifiedPlayer(localTeamId: string, player: ApiFootballLineupPlayer | ApiFootballSquadPlayer) {
  return resolveVerifiedGulfCup27Player({
    teamId: localTeamId,
    apiName: player.name,
    apiPosition: player.position,
  });
}

function enrichPlayer(
  localTeamId: string,
  player: ApiFootballLineupPlayer,
  squadById: Map<number, ApiFootballSquadPlayer>,
): LineupPlayer {
  const squad = squadById.get(player.id);
  const verified =
    verifiedPlayer(localTeamId, player) ||
    (squad ? verifiedPlayer(localTeamId, squad) : null);

  return {
    id: player.id,
    name: verified?.nameAr || squad?.name || player.name,
    number: player.number ?? squad?.number ?? null,
    position: verified?.role || player.position || squad?.position || "",
    grid: player.grid,
    photo:
      squad?.photo ||
      player.photo ||
      `https://media.api-sports.io/football/players/${player.id}.png`,
  };
}

function enrichTeamLineup(
  localTeamId: string,
  lineup: ApiFootballTeamLineup,
  squad: ApiFootballSquadPlayer[],
) {
  const squadById = new Map(squad.map((player) => [player.id, player]));
  const verifiedCoach = getVerifiedGulfCup27Coach(localTeamId);
  return {
    formation: lineup.formation,
    logo: lineup.teamLogo,
    coach: lineup.coach
      ? {
          ...lineup.coach,
          name: verifiedCoach || lineup.coach.name,
        }
      : verifiedCoach
        ? { id: null, name: verifiedCoach, photo: null }
        : null,
    startXI: lineup.startXI.map((player) => enrichPlayer(localTeamId, player, squadById)),
    substitutes: lineup.substitutes.map((player) => enrichPlayer(localTeamId, player, squadById)),
  };
}

function unavailableTeam(input: {
  side: "home" | "away";
  providerTeamId: number;
  localTeamId: string;
  name: string;
  logo?: string | null;
  absences?: LineupAbsence[];
}): TournamentMatchTeamLineup {
  return {
    side: input.side,
    providerTeamId: input.providerTeamId,
    localTeamId: input.localTeamId,
    name: input.name,
    logo: input.logo || null,
    formation: null,
    source: "unavailable",
    sourceFixtureId: null,
    sourceFixtureAt: null,
    coach: null,
    startXI: [],
    substitutes: [],
    absences: input.absences || [],
  };
}

function formationParts(value: string | null) {
  const parts = clean(value)
    .split("-")
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
  return parts.length >= 2 && parts.reduce((sum, item) => sum + item, 0) === 10
    ? parts
    : null;
}

function expectedGridSlots(formation: string | null) {
  const parts = formationParts(formation);
  if (!parts) return [] as string[];
  const slots = ["1:1"];
  parts.forEach((count, index) => {
    for (let column = 1; column <= count; column += 1) {
      slots.push(`${index + 2}:${column}`);
    }
  });
  return slots;
}

function lineupsForTeam(input: {
  providerTeamId: number;
  recentFixtures: RecentFixture[];
  fixtureLineups: Array<{ fixtureId: number; lineups: ApiFootballTeamLineup[] }>;
}) {
  return input.recentFixtures
    .map((fixture, index) => {
      const detailed = input.fixtureLineups.find((item) => item.fixtureId === fixture.fixtureId);
      const lineup = detailed?.lineups.find((item) => item.teamId === input.providerTeamId);
      return lineup && lineup.startXI.length >= 10
        ? { fixture, lineup, recencyIndex: index }
        : null;
    })
    .filter(
      (item): item is {
        fixture: RecentFixture;
        lineup: ApiFootballTeamLineup;
        recencyIndex: number;
      } => Boolean(item),
    )
    .slice(0, 6);
}

function buildExpectedLineup(input: {
  localTeamId: string;
  providerTeamId: number;
  recentFixtures: RecentFixture[];
  fixtureLineups: Array<{ fixtureId: number; lineups: ApiFootballTeamLineup[] }>;
}) {
  const samples = lineupsForTeam(input);
  if (!samples.length) return null;

  const formationScores = new Map<string, number>();
  samples.forEach((sample, index) => {
    const formation = clean(sample.lineup.formation);
    if (!formation || !formationParts(formation)) return;
    const weight = Math.max(1, 8 - index * 2);
    formationScores.set(formation, (formationScores.get(formation) || 0) + weight);
  });

  const preferredFormation =
    [...formationScores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ||
    samples[0].lineup.formation ||
    null;

  const matchingFormation = samples.filter(
    (sample) => clean(sample.lineup.formation) === clean(preferredFormation),
  );
  const base = matchingFormation[0] || samples[0];
  const formation = preferredFormation || base.lineup.formation;
  const slots = expectedGridSlots(formation);

  const verifiedStart = base.lineup.startXI.filter((player) =>
    Boolean(verifiedPlayer(input.localTeamId, player)),
  );

  const baseByGrid = new Map(
    verifiedStart
      .filter((player) => clean(player.grid))
      .map((player) => [clean(player.grid), player] as const),
  );
  const used = new Set<number>();
  const startXI: ApiFootballLineupPlayer[] = [];

  const chooseForSlot = (slot: string) => {
    const exactBase = baseByGrid.get(slot);
    if (exactBase && !used.has(exactBase.id)) return exactBase;

    const candidates: Array<{ player: ApiFootballLineupPlayer; score: number }> = [];
    samples.forEach((sample, index) => {
      sample.lineup.startXI.forEach((player) => {
        if (used.has(player.id)) return;
        const verified = verifiedPlayer(input.localTeamId, player);
        if (!verified) return;
        const exactGrid = clean(player.grid) === slot;
        const sameRow = clean(player.grid).split(":")[0] === slot.split(":")[0];
        const recency = Math.max(1, 8 - index);
        const score = exactGrid ? 100 + recency : sameRow ? 40 + recency : recency;
        candidates.push({ player, score });
      });
    });
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.player || null;
  };

  if (slots.length === 11) {
    for (const slot of slots) {
      const selected = chooseForSlot(slot);
      if (!selected) continue;
      used.add(selected.id);
      startXI.push({ ...selected, grid: slot });
    }
  } else {
    verifiedStart.slice(0, 11).forEach((player) => {
      if (used.has(player.id)) return;
      used.add(player.id);
      startXI.push(player);
    });
  }

  if (startXI.length < 10) {
    return null;
  }

  if (startXI.length < 11) {
    const candidates = samples
      .flatMap((sample, index) =>
        sample.lineup.startXI.map((player) => ({ player, score: Math.max(1, 8 - index) })),
      )
      .filter(({ player }) => !used.has(player.id) && Boolean(verifiedPlayer(input.localTeamId, player)))
      .sort((a, b) => b.score - a.score);
    const extra = candidates[0]?.player;
    if (extra) {
      used.add(extra.id);
      startXI.push({ ...extra, grid: null });
    }
  }

  const substitutes: ApiFootballLineupPlayer[] = [];
  const addSubstitute = (player: ApiFootballLineupPlayer) => {
    if (used.has(player.id)) return;
    if (!verifiedPlayer(input.localTeamId, player)) return;
    if (substitutes.some((item) => item.id === player.id)) return;
    substitutes.push({ ...player, grid: null });
  };

  base.lineup.substitutes.forEach(addSubstitute);
  samples.forEach((sample) => {
    sample.lineup.substitutes.forEach(addSubstitute);
    sample.lineup.startXI.forEach(addSubstitute);
  });

  return {
    fixtureId: base.fixture.fixtureId,
    fixtureAt: base.fixture.kickoffAt,
    lineup: {
      ...base.lineup,
      formation,
      startXI: startXI.slice(0, 11),
      substitutes: substitutes.slice(0, 15),
    },
  };
}

function reasonArabic(type: string, reason: string) {
  const joined = `${type} ${reason}`.trim();
  if (!joined) return "غير متاح";
  if (/[\u0600-\u06FF]/.test(joined)) return joined;
  const value = joined.toLowerCase();
  if (value.includes("suspend")) return "إيقاف";
  if (value.includes("hamstring")) return "إصابة عضلية";
  if (value.includes("muscle")) return "إصابة عضلية";
  if (value.includes("knee")) return "إصابة في الركبة";
  if (value.includes("ankle")) return "إصابة في الكاحل";
  if (value.includes("foot")) return "إصابة في القدم";
  if (value.includes("back")) return "إصابة في الظهر";
  if (value.includes("shoulder")) return "إصابة في الكتف";
  if (value.includes("illness") || value.includes("sick")) return "وعكة صحية";
  if (value.includes("injur")) return "إصابة";
  return "غياب";
}

function buildAbsences(input: {
  localTeamId: string;
  providerTeamId: number;
  injuries: ApiFootballFixtureInjury[];
  squad: ApiFootballSquadPlayer[];
}) {
  const squadById = new Map(input.squad.map((player) => [player.id, player]));
  return input.injuries
    .filter((injury) => injury.teamId === input.providerTeamId)
    .map((injury): LineupAbsence => {
      const squad = squadById.get(injury.playerId);
      const verified = resolveVerifiedGulfCup27Player({
        teamId: input.localTeamId,
        apiName: squad?.name || injury.playerName,
        apiPosition: squad?.position,
      });
      return {
        id: injury.playerId,
        name: verified?.nameAr || squad?.name || injury.playerName,
        position: verified?.role || squad?.position || "",
        photo:
          injury.playerPhoto ||
          squad?.photo ||
          `https://media.api-sports.io/football/players/${injury.playerId}.png`,
        reason: reasonArabic(injury.type, injury.reason),
      };
    })
    .filter((item, index, array) => array.findIndex((other) => other.id === item.id) === index);
}

export async function getTournamentMatchLineup(input: {
  tournamentId: string;
  matchId: string;
  force?: boolean;
}): Promise<TournamentMatchLineup> {
  const match = await loadMatch(input.tournamentId, input.matchId);
  if (!match.providerFixtureId) throw new Error("FIXTURE_NOT_LINKED");
  if (!match.homeTeamId || !match.awayTeamId) throw new Error("TEAMS_PENDING");

  if (!input.force) {
    const cached = await getCachedLineup(input.tournamentId, input.matchId);
    if (cached && cached.providerFixtureId === match.providerFixtureId) return cached;
  }

  const [localHome, localAway, fixtureResult] = await Promise.all([
    loadLocalTeam(input.tournamentId, match.homeTeamId),
    loadLocalTeam(input.tournamentId, match.awayTeamId),
    getApiFootballFixturesByIds([match.providerFixtureId]),
  ]);

  const fixture = fixtureResult.fixtures.find(
    (item) => item.fixtureId === match.providerFixtureId,
  );
  if (!fixture) throw new Error("FIXTURE_NOT_FOUND_AT_PROVIDER");

  let providerHomeTeamId = fixture.homeProviderTeamId;
  let providerAwayTeamId = fixture.awayProviderTeamId;
  let providerHomeName = fixture.homeName;
  let providerAwayName = fixture.awayName;

  const localHomeLookup = localHome?.nameEn || localHome?.nameAr || "";
  const localAwayLookup = localAway?.nameEn || localAway?.nameAr || "";
  const reversed =
    Boolean(localHomeLookup && localAwayLookup) &&
    sameTeamName(providerAwayName, localHomeLookup) &&
    sameTeamName(providerHomeName, localAwayLookup);

  if (reversed) {
    [providerHomeTeamId, providerAwayTeamId] = [providerAwayTeamId, providerHomeTeamId];
    [providerHomeName, providerAwayName] = [providerAwayName, providerHomeName];
  }

  const now = Date.now();
  const shouldCheckOfficial =
    match.kickoffAt <= 0 || now >= match.kickoffAt - OFFICIAL_CHECK_WINDOW_MS;

  const [homeSquad, awaySquad, injuriesResult] = await Promise.all([
    getTeamSquad(providerHomeTeamId),
    getTeamSquad(providerAwayTeamId),
    getApiFootballFixtureInjuries(match.providerFixtureId).catch(() => ({ injuries: [] })),
  ]);

  let officialLineups: ApiFootballTeamLineup[] = [];
  if (shouldCheckOfficial) {
    try {
      const official = await getApiFootballFixtureLineups(match.providerFixtureId);
      officialLineups = official.lineups;
    } catch {
      officialLineups = [];
    }
  }

  const officialHomeRaw = officialLineups.find((item) => item.teamId === providerHomeTeamId) || null;
  const officialAwayRaw = officialLineups.find((item) => item.teamId === providerAwayTeamId) || null;
  const officialHome = officialHomeRaw && officialHomeRaw.startXI.length >= 10 ? officialHomeRaw : null;
  const officialAway = officialAwayRaw && officialAwayRaw.startXI.length >= 10 ? officialAwayRaw : null;
  const bothOfficial = Boolean(officialHome && officialAway);

  let expectedHome: ReturnType<typeof buildExpectedLineup> = null;
  let expectedAway: ReturnType<typeof buildExpectedLineup> = null;

  if (!bothOfficial) {
    const [recentHome, recentAway] = await Promise.all([
      getApiFootballRecentTeamFixtures({ teamId: providerHomeTeamId, last: 10 }),
      getApiFootballRecentTeamFixtures({ teamId: providerAwayTeamId, last: 10 }),
    ]);

    const homeRecentRows = recentHome.fixtures
      .filter((row) => row.fixtureId !== match.providerFixtureId)
      .filter((row) => FINISHED_STATUSES.has(row.statusShort))
      .slice(0, 6);
    const awayRecentRows = recentAway.fixtures
      .filter((row) => row.fixtureId !== match.providerFixtureId)
      .filter((row) => FINISHED_STATUSES.has(row.statusShort))
      .slice(0, 6);

    const ids = [...new Set([
      ...homeRecentRows.map((row) => row.fixtureId),
      ...awayRecentRows.map((row) => row.fixtureId),
    ])];

    const detailed = ids.length
      ? await getApiFootballLineupsByFixtureIds(ids)
      : { fixtures: [] as Array<{ fixtureId: number; lineups: ApiFootballTeamLineup[] }> };

    expectedHome = buildExpectedLineup({
      localTeamId: match.homeTeamId,
      providerTeamId: providerHomeTeamId,
      recentFixtures: homeRecentRows,
      fixtureLineups: detailed.fixtures,
    });
    expectedAway = buildExpectedLineup({
      localTeamId: match.awayTeamId,
      providerTeamId: providerAwayTeamId,
      recentFixtures: awayRecentRows,
      fixtureLineups: detailed.fixtures,
    });
  }

  const homeSelected = officialHome || expectedHome?.lineup || null;
  const awaySelected = officialAway || expectedAway?.lineup || null;
  const homeEnriched = homeSelected
    ? enrichTeamLineup(match.homeTeamId, homeSelected, homeSquad)
    : null;
  const awayEnriched = awaySelected
    ? enrichTeamLineup(match.awayTeamId, awaySelected, awaySquad)
    : null;

  const injuries = injuriesResult.injuries || [];
  const homeAbsences = buildAbsences({
    localTeamId: match.homeTeamId,
    providerTeamId: providerHomeTeamId,
    injuries,
    squad: homeSquad,
  });
  const awayAbsences = buildAbsences({
    localTeamId: match.awayTeamId,
    providerTeamId: providerAwayTeamId,
    injuries,
    squad: awaySquad,
  });

  const home: TournamentMatchTeamLineup = homeEnriched
    ? {
        side: "home",
        providerTeamId: providerHomeTeamId,
        localTeamId: match.homeTeamId,
        name: localHome?.nameAr || providerHomeName,
        logo: homeEnriched.logo,
        formation: homeEnriched.formation,
        source: officialHome ? "official" : "expected",
        sourceFixtureId: officialHome ? match.providerFixtureId : expectedHome?.fixtureId || null,
        sourceFixtureAt: officialHome ? match.kickoffAt : expectedHome?.fixtureAt || null,
        coach: homeEnriched.coach,
        startXI: homeEnriched.startXI,
        substitutes: homeEnriched.substitutes,
        absences: homeAbsences,
      }
    : unavailableTeam({
        side: "home",
        providerTeamId: providerHomeTeamId,
        localTeamId: match.homeTeamId,
        name: localHome?.nameAr || providerHomeName,
        logo: officialHome?.teamLogo || expectedHome?.lineup.teamLogo || null,
        absences: homeAbsences,
      });

  const away: TournamentMatchTeamLineup = awayEnriched
    ? {
        side: "away",
        providerTeamId: providerAwayTeamId,
        localTeamId: match.awayTeamId,
        name: localAway?.nameAr || providerAwayName,
        logo: awayEnriched.logo,
        formation: awayEnriched.formation,
        source: officialAway ? "official" : "expected",
        sourceFixtureId: officialAway ? match.providerFixtureId : expectedAway?.fixtureId || null,
        sourceFixtureAt: officialAway ? match.kickoffAt : expectedAway?.fixtureAt || null,
        coach: awayEnriched.coach,
        startXI: awayEnriched.startXI,
        substitutes: awayEnriched.substitutes,
        absences: awayAbsences,
      }
    : unavailableTeam({
        side: "away",
        providerTeamId: providerAwayTeamId,
        localTeamId: match.awayTeamId,
        name: localAway?.nameAr || providerAwayName,
        logo: officialAway?.teamLogo || expectedAway?.lineup.teamLogo || null,
        absences: awayAbsences,
      });

  const officialAvailable = home.source === "official" && away.source === "official";
  let expiresAt = now + EXPECTED_LINEUP_TTL_MS;

  if (officialAvailable) {
    expiresAt = now + OFFICIAL_LINEUP_TTL_MS;
  } else if (shouldCheckOfficial) {
    expiresAt = now + OFFICIAL_RECHECK_TTL_MS;
  } else if (match.kickoffAt > 0 && match.kickoffAt - now <= NEAR_MATCH_WINDOW_MS) {
    expiresAt = now + NEAR_MATCH_TTL_MS;
  } else if (match.kickoffAt > 0) {
    expiresAt = Math.min(
      expiresAt,
      Math.max(now + 5 * 60 * 1000, match.kickoffAt - OFFICIAL_CHECK_WINDOW_MS),
    );
  }

  const result: TournamentMatchLineup = {
    tournamentId: input.tournamentId,
    matchId: input.matchId,
    providerFixtureId: match.providerFixtureId,
    kickoffAt: match.kickoffAt,
    fetchedAt: now,
    expiresAt,
    schemaVersion: LINEUP_SCHEMA_VERSION,
    officialAvailable,
    home,
    away,
  };

  await adminDb
    .collection(LINEUP_CACHE_COLLECTION)
    .doc(cacheDocId(input.tournamentId, input.matchId))
    .set(result, { merge: false });

  return result;
}
