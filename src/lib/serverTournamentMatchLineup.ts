import "server-only";

import { adminDb } from "@/lib/firebaseAdmin";
import {
  getApiFootballFixtureLineups,
  getApiFootballFixturesByIds,
  getApiFootballLineupsByFixtureIds,
  getApiFootballRecentTeamFixtures,
  getApiFootballTeamSquad,
  type ApiFootballLineupPlayer,
  type ApiFootballSquadPlayer,
  type ApiFootballTeamLineup,
} from "@/lib/serverApiFootball";

const LINEUP_CACHE_COLLECTION = "tournamentMatchLineupCache";
const SQUAD_CACHE_COLLECTION = "apiFootballTeamSquadCache";
const LINEUP_SCHEMA_VERSION = 1;
const SQUAD_SCHEMA_VERSION = 1;
const SQUAD_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EXPECTED_LINEUP_TTL_MS = 6 * 60 * 60 * 1000;
const OFFICIAL_RECHECK_TTL_MS = 10 * 60 * 1000;
const OFFICIAL_LINEUP_TTL_MS = 24 * 60 * 60 * 1000;
const OFFICIAL_CHECK_WINDOW_MS = 2 * 60 * 60 * 1000;
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN", "AWD", "WO"]);

type LineupPlayer = {
  id: number;
  name: string;
  number: number | null;
  position: string;
  grid: string | null;
  photo: string | null;
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

function enrichPlayer(
  player: ApiFootballLineupPlayer,
  squadById: Map<number, ApiFootballSquadPlayer>,
): LineupPlayer {
  const squad = squadById.get(player.id);
  return {
    id: player.id,
    name: squad?.name || player.name,
    number: player.number ?? squad?.number ?? null,
    position: player.position || squad?.position || "",
    grid: player.grid,
    photo:
      squad?.photo ||
      player.photo ||
      `https://media.api-sports.io/football/players/${player.id}.png`,
  };
}

function enrichTeamLineup(
  lineup: ApiFootballTeamLineup,
  squad: ApiFootballSquadPlayer[],
) {
  const squadById = new Map(squad.map((player) => [player.id, player]));
  return {
    formation: lineup.formation,
    logo: lineup.teamLogo,
    coach: lineup.coach,
    startXI: lineup.startXI.map((player) => enrichPlayer(player, squadById)),
    substitutes: lineup.substitutes.map((player) => enrichPlayer(player, squadById)),
  };
}

function unavailableTeam(input: {
  side: "home" | "away";
  providerTeamId: number;
  localTeamId: string;
  name: string;
  logo?: string | null;
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
  };
}

function playerRole(player: ApiFootballLineupPlayer): "G" | "D" | "M" | "F" {
  const value = clean(player.position).toUpperCase();
  if (value === "G" || value.includes("GOAL")) return "G";
  if (value === "D" || value.includes("DEF")) return "D";
  if (value === "M" || value.includes("MID")) return "M";
  return "F";
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

function buildExpectedLineup(input: {
  providerTeamId: number;
  recentFixtureIds: number[];
  fixtureLineups: Array<{ fixtureId: number; lineups: ApiFootballTeamLineup[] }>;
}) {
  const samples = input.recentFixtureIds
    .map((fixtureId) => {
      const fixture = input.fixtureLineups.find((item) => item.fixtureId === fixtureId);
      const lineup = fixture?.lineups.find((item) => item.teamId === input.providerTeamId);
      return lineup && lineup.startXI.length >= 10 ? { fixtureId, lineup } : null;
    })
    .filter((item): item is { fixtureId: number; lineup: ApiFootballTeamLineup } => Boolean(item))
    .slice(0, 5);

  if (!samples.length) return null;

  const formationScores = new Map<string, number>();
  samples.forEach((sample, index) => {
    if (!sample.lineup.formation) return;
    const weight = Math.max(1, 6 - index);
    formationScores.set(
      sample.lineup.formation,
      (formationScores.get(sample.lineup.formation) || 0) + weight,
    );
  });

  const formation =
    [...formationScores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ||
    samples[0].lineup.formation ||
    null;
  const parts = formationParts(formation) || formationParts(samples[0].lineup.formation);

  type PlayerScore = {
    player: ApiFootballLineupPlayer;
    role: "G" | "D" | "M" | "F";
    score: number;
    starts: number;
    latestIndex: number;
  };

  const scores = new Map<number, PlayerScore>();
  samples.forEach((sample, index) => {
    const weight = Math.max(1, 6 - index);
    sample.lineup.startXI.forEach((player) => {
      const current = scores.get(player.id);
      const role = playerRole(player);
      if (!current) {
        scores.set(player.id, {
          player,
          role,
          score: weight,
          starts: 1,
          latestIndex: index,
        });
        return;
      }
      current.score += weight;
      current.starts += 1;
      if (index < current.latestIndex) {
        current.player = player;
        current.role = role;
        current.latestIndex = index;
      }
    });
  });

  const ranked = [...scores.values()].sort(
    (a, b) => b.score - a.score || b.starts - a.starts || a.latestIndex - b.latestIndex,
  );
  const used = new Set<number>();
  const pick = (role: PlayerScore["role"], count: number) => {
    const items = ranked.filter((item) => item.role === role && !used.has(item.player.id)).slice(0, count);
    items.forEach((item) => used.add(item.player.id));
    return items.map((item) => item.player);
  };

  const shape = parts || [4, 3, 3];
  const defendersCount = shape[0] || 4;
  const forwardsCount = shape[shape.length - 1] || 1;
  const midfieldLines = shape.slice(1, -1);
  const midfieldCount = midfieldLines.reduce((sum, value) => sum + value, 0);

  let goalkeeper = pick("G", 1);
  let defenders = pick("D", defendersCount);
  let midfielders = pick("M", midfieldCount);
  let forwards = pick("F", forwardsCount);

  let selectedCount = goalkeeper.length + defenders.length + midfielders.length + forwards.length;
  if (selectedCount < 11) {
    const fill = ranked
      .filter((item) => !used.has(item.player.id))
      .slice(0, 11 - selectedCount)
      .map((item) => item.player);
    fill.forEach((player) => used.add(player.id));
    midfielders = [...midfielders, ...fill];
    selectedCount += fill.length;
  }

  const withGrid = (players: ApiFootballLineupPlayer[], row: number) =>
    players.map((player, index) => ({
      ...player,
      grid: `${row}:${index + 1}`,
    }));

  const startXI: ApiFootballLineupPlayer[] = [];
  startXI.push(...withGrid(goalkeeper.slice(0, 1), 1));
  startXI.push(...withGrid(defenders.slice(0, defendersCount), 2));

  let midfieldOffset = 0;
  midfieldLines.forEach((lineCount, index) => {
    const linePlayers = midfielders.slice(midfieldOffset, midfieldOffset + lineCount);
    midfieldOffset += lineCount;
    startXI.push(...withGrid(linePlayers, 3 + index));
  });

  const forwardRow = 3 + midfieldLines.length;
  startXI.push(...withGrid(forwards.slice(0, forwardsCount), forwardRow));

  if (startXI.length < 11) {
    const selectedIds = new Set(startXI.map((player) => player.id));
    const extras = ranked
      .filter((item) => !selectedIds.has(item.player.id))
      .slice(0, 11 - startXI.length)
      .map((item) => item.player);
    startXI.push(...withGrid(extras, Math.max(forwardRow, 3)));
  }

  const latest = samples[0];
  const starterIds = new Set(startXI.map((player) => player.id));
  const bench: ApiFootballLineupPlayer[] = [];
  const addBench = (player: ApiFootballLineupPlayer) => {
    if (starterIds.has(player.id) || bench.some((item) => item.id === player.id)) return;
    bench.push({ ...player, grid: null });
  };
  latest.lineup.substitutes.forEach(addBench);
  ranked.forEach((item) => addBench(item.player));

  return {
    fixtureId: latest.fixtureId,
    lineup: {
      ...latest.lineup,
      formation,
      startXI: startXI.slice(0, 11),
      substitutes: bench.slice(0, 12),
    },
  };
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

  let expectedHome: { fixtureId: number; fixtureAt: number; lineup: ApiFootballTeamLineup } | null = null;
  let expectedAway: { fixtureId: number; fixtureAt: number; lineup: ApiFootballTeamLineup } | null = null;

  if (!bothOfficial) {
    const [recentHome, recentAway] = await Promise.all([
      getApiFootballRecentTeamFixtures({ teamId: providerHomeTeamId, last: 8 }),
      getApiFootballRecentTeamFixtures({ teamId: providerAwayTeamId, last: 8 }),
    ]);

    const homeRecentRows = recentHome.fixtures
      .filter((row) => row.fixtureId !== match.providerFixtureId)
      .filter((row) => FINISHED_STATUSES.has(row.statusShort))
      .slice(0, 5);
    const awayRecentRows = recentAway.fixtures
      .filter((row) => row.fixtureId !== match.providerFixtureId)
      .filter((row) => FINISHED_STATUSES.has(row.statusShort))
      .slice(0, 5);

    const ids = [...new Set([
      ...homeRecentRows.map((row) => row.fixtureId),
      ...awayRecentRows.map((row) => row.fixtureId),
    ])];

    const detailed = ids.length
      ? await getApiFootballLineupsByFixtureIds(ids)
      : { fixtures: [] as Array<{ fixtureId: number; lineups: ApiFootballTeamLineup[] }> };

    const selectedHome = buildExpectedLineup({
      providerTeamId: providerHomeTeamId,
      recentFixtureIds: homeRecentRows.map((row) => row.fixtureId),
      fixtureLineups: detailed.fixtures,
    });
    const selectedAway = buildExpectedLineup({
      providerTeamId: providerAwayTeamId,
      recentFixtureIds: awayRecentRows.map((row) => row.fixtureId),
      fixtureLineups: detailed.fixtures,
    });

    if (selectedHome) {
      const source = homeRecentRows.find((row) => row.fixtureId === selectedHome.fixtureId);
      expectedHome = {
        fixtureId: selectedHome.fixtureId,
        fixtureAt: source?.kickoffAt || 0,
        lineup: selectedHome.lineup,
      };
    }
    if (selectedAway) {
      const source = awayRecentRows.find((row) => row.fixtureId === selectedAway.fixtureId);
      expectedAway = {
        fixtureId: selectedAway.fixtureId,
        fixtureAt: source?.kickoffAt || 0,
        lineup: selectedAway.lineup,
      };
    }
  }

  const [homeSquad, awaySquad] = await Promise.all([
    getTeamSquad(providerHomeTeamId),
    getTeamSquad(providerAwayTeamId),
  ]);

  const homeSelected = officialHome || expectedHome?.lineup || null;
  const awaySelected = officialAway || expectedAway?.lineup || null;

  const homeEnriched = homeSelected ? enrichTeamLineup(homeSelected, homeSquad) : null;
  const awayEnriched = awaySelected ? enrichTeamLineup(awaySelected, awaySquad) : null;

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
      }
    : unavailableTeam({
        side: "home",
        providerTeamId: providerHomeTeamId,
        localTeamId: match.homeTeamId,
        name: localHome?.nameAr || providerHomeName,
        logo: officialHome?.teamLogo || expectedHome?.lineup.teamLogo || null,
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
      }
    : unavailableTeam({
        side: "away",
        providerTeamId: providerAwayTeamId,
        localTeamId: match.awayTeamId,
        name: localAway?.nameAr || providerAwayName,
        logo: officialAway?.teamLogo || expectedAway?.lineup.teamLogo || null,
      });

  const officialAvailable = home.source === "official" && away.source === "official";
  let expiresAt = now + EXPECTED_LINEUP_TTL_MS;

  if (officialAvailable) {
    expiresAt = now + OFFICIAL_LINEUP_TTL_MS;
  } else if (shouldCheckOfficial) {
    expiresAt = now + OFFICIAL_RECHECK_TTL_MS;
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
