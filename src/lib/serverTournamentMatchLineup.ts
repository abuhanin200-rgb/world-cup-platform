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
import { resolveVerifiedGulfCup27Player } from "@/domain/tournaments/gulfCup27VerifiedRosters";

const LINEUP_CACHE_COLLECTION = "tournamentMatchLineupCache";
const SQUAD_CACHE_COLLECTION = "apiFootballTeamSquadCache";
const LINEUP_SCHEMA_VERSION = 13;
const SQUAD_SCHEMA_VERSION = 3;
const SQUAD_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const EXPECTED_LINEUP_TTL_MS = 15 * 60 * 1000;
const NEAR_MATCH_TTL_MS = 10 * 60 * 1000;
const OFFICIAL_RECHECK_TTL_MS = 3 * 60 * 1000;
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

function verifiedPlayer(localTeamId: string, player: ApiFootballLineupPlayer | ApiFootballSquadPlayer) {
  return resolveVerifiedGulfCup27Player({
    teamId: localTeamId,
    apiName: player.name,
    apiPosition: player.position,
  });
}

function inferFormationFromGrid(players: ApiFootballLineupPlayer[]) {
  const rows = new Map<number, number>();
  for (const player of players) {
    const grid = clean(player.grid);
    if (!grid) continue;
    const [rowText] = grid.split(":");
    const row = Number(rowText);
    if (!Number.isInteger(row) || row <= 1) continue;
    rows.set(row, (rows.get(row) || 0) + 1);
  }
  const ordered = [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, count]) => count);
  return ordered.length >= 2 && ordered.reduce((sum, count) => sum + count, 0) === 10
    ? ordered.join("-")
    : null;
}

function enrichPlayer(
  localTeamId: string,
  player: ApiFootballLineupPlayer,
  squadById: Map<number, ApiFootballSquadPlayer>,
  formation: string | null,
  starter: boolean,
): LineupPlayer {
  const squad = squadById.get(player.id);
  const verified =
    verifiedPlayer(localTeamId, player) ||
    (squad ? verifiedPlayer(localTeamId, squad) : null);

  const explicitArabicName = /[\u0600-\u06FF]/.test(player.name) ? player.name : "";
  const slotRole = starter && player.grid ? roleForFormationSlot(player.grid, formation) : null;
  const photo = squad?.photo || player.photo || (player.id > 0
    ? `https://media.api-sports.io/football/players/${player.id}.png`
    : null);

  return {
    id: player.id,
    name: verified?.nameAr || explicitArabicName || player.name || squad?.name || "—",
    number: player.number ?? squad?.number ?? null,
    // لاعب التشكيل الأساسي يُصنّف بحسب خانته الفعلية في الخطة، لا بحسب
    // المركز العام المخزن في Squad. هذا يمنع ظهور مهاجم باسم «مدافع» والعكس.
    position: slotRole || squad?.position || player.position || verified?.role || "",
    grid: player.grid,
    photo,
  };
}

function enrichTeamLineup(
  localTeamId: string,
  lineup: ApiFootballTeamLineup,
  squad: ApiFootballSquadPlayer[],
) {
  const squadById = new Map(squad.map((player) => [player.id, player]));
  const formation = lineup.formation || inferFormationFromGrid(lineup.startXI);
  return {
    formation,
    logo: lineup.teamLogo,
    // اسم المدرب وصورته من مزود المباراة نفسه. لا نستخدم أسماء ثابتة قديمة.
    coach: lineup.coach,
    startXI: lineup.startXI.map((player) =>
      enrichPlayer(localTeamId, player, squadById, formation, true),
    ),
    substitutes: lineup.substitutes.map((player) =>
      enrichPlayer(localTeamId, player, squadById, formation, false),
    ),
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

function roleForFormationSlot(slot: string, formation: string | null) {
  const row = Number(slot.split(":")[0]);
  const parts = formationParts(formation);
  if (row === 1) return "G" as const;
  if (!parts) return null;
  if (row === 2) return "D" as const;
  if (row === parts.length + 1) return "F" as const;
  return "M" as const;
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
  squad: ApiFootballSquadPlayer[];
  recentFixtures: RecentFixture[];
  fixtureLineups: Array<{ fixtureId: number; lineups: ApiFootballTeamLineup[] }>;
  excludedPlayerIds?: Set<number>;
}) {
  const samples = lineupsForTeam(input);
  const excluded = input.excludedPlayerIds || new Set<number>();
  const squadById = new Map(input.squad.map((player) => [player.id, player]));

  const isCurrentProviderPlayer = (player: ApiFootballLineupPlayer) =>
    Number.isInteger(player.id) && player.id > 0;

  const playerRole = (player: ApiFootballLineupPlayer | ApiFootballSquadPlayer) => {
    const verified = verifiedPlayer(input.localTeamId, player);
    return clean(player.position || verified?.role).toUpperCase().slice(0, 1);
  };

  // نبني التشكيل المتوقع من آخر التشكيلات الرسمية الفعلية، مع ترجيح
  // المباراة الأحدث. إذا غاب لاعب من آخر XI نستبدله بأكثر لاعب حديث
  // ومتاح في نفس الخط بدل إسقاط التشكيل كاملًا.
  const scoreByPlayer = new Map<number, number>();
  const latestPlayerById = new Map<number, ApiFootballLineupPlayer>();

  samples.forEach((sample, sampleIndex) => {
    const recencyWeight = Math.max(1, 6 - sampleIndex);
    sample.lineup.startXI.forEach((player) => {
      if (!excluded.has(player.id) && isCurrentProviderPlayer(player)) {
        scoreByPlayer.set(player.id, (scoreByPlayer.get(player.id) || 0) + recencyWeight * 10);
        if (!latestPlayerById.has(player.id)) latestPlayerById.set(player.id, player);
      }
    });
    sample.lineup.substitutes.forEach((player) => {
      if (!excluded.has(player.id) && isCurrentProviderPlayer(player)) {
        scoreByPlayer.set(player.id, (scoreByPlayer.get(player.id) || 0) + recencyWeight * 2);
        if (!latestPlayerById.has(player.id)) latestPlayerById.set(player.id, player);
      }
    });
  });

  const latest = samples[0] || null;
  if (!latest) return null;

  const formation = latest.lineup.formation || inferFormationFromGrid(latest.lineup.startXI);
  const used = new Set<number>();
  const starters: ApiFootballLineupPlayer[] = [];

  const rankedCandidates = [...scoreByPlayer.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => latestPlayerById.get(id))
    .filter((player): player is ApiFootballLineupPlayer => Boolean(player));

  const squadCandidates: ApiFootballLineupPlayer[] = input.squad
    .filter((player) => !excluded.has(player.id))
    .map((player) => ({
      id: player.id,
      name: player.name,
      number: player.number,
      position: player.position,
      grid: null,
      photo: player.photo,
    }));

  const chooseReplacement = (slotPlayer: ApiFootballLineupPlayer) => {
    const wantedRole = playerRole(slotPlayer);
    const pools = [rankedCandidates, squadCandidates];
    for (const pool of pools) {
      const sameRole = pool.find(
        (candidate) =>
          !used.has(candidate.id) &&
          !excluded.has(candidate.id) &&
          playerRole(candidate) === wantedRole,
      );
      if (sameRole) return sameRole;
    }
    for (const pool of pools) {
      const any = pool.find(
        (candidate) => !used.has(candidate.id) && !excluded.has(candidate.id),
      );
      if (any) return any;
    }
    return null;
  };

  for (const slotPlayer of latest.lineup.startXI) {
    let selected: ApiFootballLineupPlayer | null = null;
    if (
      !excluded.has(slotPlayer.id) &&
      !used.has(slotPlayer.id) &&
      isCurrentProviderPlayer(slotPlayer)
    ) {
      selected = slotPlayer;
    } else {
      selected = chooseReplacement(slotPlayer);
    }

    if (!selected) continue;
    used.add(selected.id);
    starters.push({
      ...selected,
      // نحافظ على خانة اللاعب المستبدَل حتى يبقى الرسم التكتيكي صحيحًا.
      grid: slotPlayer.grid,
      position: slotPlayer.position || selected.position,
    });
  }

  // حماية إضافية إذا كان التشكيل السابق ناقصًا لدى المزود.
  const slots = expectedGridSlots(formation);
  while (starters.length < 11) {
    const placeholder: ApiFootballLineupPlayer = {
      id: 0,
      name: "",
      number: null,
      position: starters.length === 0 ? "G" : starters.length <= 4 ? "D" : starters.length <= 8 ? "M" : "F",
      grid: slots[starters.length] || null,
      photo: null,
    };
    const replacement = chooseReplacement(placeholder);
    if (!replacement) break;
    used.add(replacement.id);
    starters.push({
      ...replacement,
      grid: slots[starters.length] || replacement.grid,
    });
  }

  if (starters.length !== 11 || new Set(starters.map((player) => player.id)).size !== 11) {
    return null;
  }

  const substitutes = [...rankedCandidates, ...squadCandidates]
    .filter((player, index, array) => array.findIndex((other) => other.id === player.id) === index)
    .filter((player) => !used.has(player.id) && !excluded.has(player.id))
    .slice(0, 15)
    .map((player) => ({ ...player, grid: null }));

  return {
    fixtureId: latest.fixture.fixtureId,
    fixtureAt: latest.fixture.kickoffAt,
    lineup: {
      ...latest.lineup,
      formation,
      startXI: starters,
      substitutes,
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
    .map((injury): LineupAbsence | null => {
      const squad = squadById.get(injury.playerId);
      const verified = resolveVerifiedGulfCup27Player({
        teamId: input.localTeamId,
        apiName: squad?.name || injury.playerName,
        apiPosition: squad?.position,
      });
      return {
        id: injury.playerId,
        name: verified?.nameAr || injury.playerName || squad?.name || "—",
        position: squad?.position || verified?.role || "",
        photo:
          injury.photo ||
          squad?.photo ||
          `https://media.api-sports.io/football/players/${injury.playerId}.png`,
        reason: reasonArabic(injury.type, injury.reason),
      };
    })
    .filter((item): item is LineupAbsence => Boolean(item))
    .filter((item, index, array) => array.findIndex((other) => other.id === item.id) === index);
}

function mergeAbsences(...groups: LineupAbsence[][]) {
  const result: LineupAbsence[] = [];
  for (const item of groups.flat()) {
    if (result.some((existing) => existing.id === item.id || existing.name === item.name)) continue;
    result.push(item);
  }
  return result;
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
  const injuries = injuriesResult.injuries || [];
  const homeExcludedIds = new Set(
    injuries
      .filter((injury) => injury.teamId === providerHomeTeamId)
      .map((injury) => injury.playerId),
  );
  const awayExcludedIds = new Set(
    injuries
      .filter((injury) => injury.teamId === providerAwayTeamId)
      .map((injury) => injury.playerId),
  );

  let expectedHome: ReturnType<typeof buildExpectedLineup> = null;
  let expectedAway: ReturnType<typeof buildExpectedLineup> = null;

  if (!bothOfficial) {
    const [recentHome, recentAway] = await Promise.all([
      getApiFootballRecentTeamFixtures({ teamId: providerHomeTeamId, last: 12 }),
      getApiFootballRecentTeamFixtures({ teamId: providerAwayTeamId, last: 12 }),
    ]);

    // آخر 6 مباريات مكتملة فقط. كل عينة تشكيل هنا هي Lineup رسمية سابقة من المزود.
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
      squad: homeSquad,
      recentFixtures: homeRecentRows,
      fixtureLineups: detailed.fixtures,
      excludedPlayerIds: homeExcludedIds,
    });
    expectedAway = buildExpectedLineup({
      localTeamId: match.awayTeamId,
      providerTeamId: providerAwayTeamId,
      squad: awaySquad,
      recentFixtures: awayRecentRows,
      fixtureLineups: detailed.fixtures,
      excludedPlayerIds: awayExcludedIds,
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

  const homeAbsences = mergeAbsences(
    buildAbsences({
      localTeamId: match.homeTeamId,
      providerTeamId: providerHomeTeamId,
      injuries,
      squad: homeSquad,
    }),
  );
  const awayAbsences = mergeAbsences(
    buildAbsences({
      localTeamId: match.awayTeamId,
      providerTeamId: providerAwayTeamId,
      injuries,
      squad: awaySquad,
    }),
  );

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
