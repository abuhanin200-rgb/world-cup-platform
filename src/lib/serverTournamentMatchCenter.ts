import "server-only";

import { adminDb } from "@/lib/firebaseAdmin";
import {
  getApiFootballFixtureEvents,
  getApiFootballFixturePlayers,
  getApiFootballFixtureStatistics,
  getApiFootballFixturesByIds,
  type ApiFootballFixtureEvent,
  type ApiFootballFixturePlayerPerformance,
  type ApiFootballFixtureTeamStatistics,
} from "@/lib/serverApiFootball";
import { resolveVerifiedGulfCup27Player } from "@/domain/tournaments/gulfCup27VerifiedRosters";

const CACHE_COLLECTION = "tournamentMatchCenterCache";
const LINEUP_CACHE_COLLECTION = "tournamentMatchLineupCache";
const SCHEMA_VERSION = 1;
const LIVE_TTL_MS = 45 * 1000;
const FINISHED_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const OTHER_TTL_MS = 10 * 60 * 1000;
const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "INT"]);
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN", "AWD", "WO"]);

export type MatchCenterEvent = {
  minute: string;
  team: "home" | "away";
  type: string;
  detail: string;
  playerName: string;
  assistName: string | null;
};

export type MatchCenterStat = {
  key: string;
  label: string;
  home: string;
  away: string;
};

export type MatchCenterPlayer = {
  id: number;
  name: string;
  photo: string | null;
  position: string;
  number: number | null;
  rating: number | null;
  minutes: number | null;
  goals: number;
  assists: number;
  shots: number;
  passes: number;
  tackles: number;
  saves: number;
};

export type TournamentMatchCenter = {
  tournamentId: string;
  matchId: string;
  providerFixtureId: number;
  schemaVersion: number;
  fetchedAt: number;
  expiresAt: number;
  kickoffAt: number;
  statusShort: string;
  statusLong: string;
  elapsed: number | null;
  isLive: boolean;
  isFinished: boolean;
  score: {
    home: number | null;
    away: number | null;
  };
  home: {
    localTeamId: string;
    providerTeamId: number;
    name: string;
  };
  away: {
    localTeamId: string;
    providerTeamId: number;
    name: string;
  };
  events: MatchCenterEvent[];
  stats: MatchCenterStat[];
  players: {
    home: MatchCenterPlayer[];
    away: MatchCenterPlayer[];
  };
};

type LineupCacheShape = {
  home?: { startXI?: Array<{ id?: number; name?: string }>; substitutes?: Array<{ id?: number; name?: string }> };
  away?: { startXI?: Array<{ id?: number; name?: string }>; substitutes?: Array<{ id?: number; name?: string }> };
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function docId(tournamentId: string, matchId: string) {
  return `${tournamentId}_${matchId}`;
}

function roleLabel(value: string) {
  const normalized = clean(value).toUpperCase();
  if (normalized === "G" || normalized.includes("GOAL")) return "حارس";
  if (normalized === "D" || normalized.includes("DEF")) return "دفاع";
  if (normalized === "M" || normalized.includes("MID")) return "وسط";
  if (normalized === "F" || normalized.includes("ATT") || normalized.includes("FOR")) return "هجوم";
  return "لاعب";
}

function eventMinute(event: ApiFootballFixtureEvent) {
  if (event.elapsed == null) return "—";
  return event.extra && event.extra > 0
    ? `${Math.trunc(event.elapsed)}+${Math.trunc(event.extra)}′`
    : `${Math.trunc(event.elapsed)}′`;
}

function eventTypeLabel(type: string, detail: string) {
  const combined = `${type} ${detail}`.toLowerCase();
  if (combined.includes("goal")) {
    if (combined.includes("penalty")) return "هدف من ركلة جزاء";
    if (combined.includes("own")) return "هدف عكسي";
    return "هدف";
  }
  if (combined.includes("yellow")) return "بطاقة صفراء";
  if (combined.includes("red")) return "بطاقة حمراء";
  if (combined.includes("subst")) return "تبديل";
  if (combined.includes("var")) return "تقنية الفيديو";
  return clean(detail) || clean(type) || "حدث";
}

const STAT_DEFINITIONS = [
  { key: "ball possession", label: "الاستحواذ" },
  { key: "total shots", label: "التسديدات" },
  { key: "shots on goal", label: "على المرمى" },
  { key: "corner kicks", label: "الركنيات" },
  { key: "fouls", label: "الأخطاء" },
  { key: "offsides", label: "التسلل" },
  { key: "yellow cards", label: "البطاقات الصفراء" },
  { key: "red cards", label: "البطاقات الحمراء" },
  { key: "goalkeeper saves", label: "تصديات الحارس" },
  { key: "total passes", label: "التمريرات" },
  { key: "passes accurate", label: "التمريرات الصحيحة" },
  { key: "passes %", label: "دقة التمرير" },
] as const;

function normalizedStatType(value: string) {
  return clean(value).toLowerCase().replace(/\s+/g, " ");
}

function displayStatValue(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  return String(value);
}

function findStat(team: ApiFootballFixtureTeamStatistics | undefined, key: string) {
  return team?.statistics.find((item) => normalizedStatType(item.type) === key)?.value ?? null;
}

function arabicPlayerName(input: {
  teamId: string;
  apiName: string;
  apiPosition?: string | null;
  playerId?: number | null;
  lineupNames: Map<number, string>;
}) {
  if (input.playerId && input.lineupNames.has(input.playerId)) {
    return input.lineupNames.get(input.playerId) || "لاعب";
  }

  const verified = resolveVerifiedGulfCup27Player({
    teamId: input.teamId,
    apiName: input.apiName,
    apiPosition: input.apiPosition,
  });
  if (verified?.nameAr) return verified.nameAr;
  if (/\p{Script=Arabic}/u.test(input.apiName)) return input.apiName;
  return "لاعب";
}

function mapPlayer(
  player: ApiFootballFixturePlayerPerformance,
  localTeamId: string,
  lineupNames: Map<number, string>,
): MatchCenterPlayer {
  return {
    id: player.id,
    name: arabicPlayerName({
      teamId: localTeamId,
      apiName: player.name,
      apiPosition: player.position,
      playerId: player.id,
      lineupNames,
    }),
    photo: player.photo,
    position: roleLabel(player.position),
    number: player.number,
    rating: player.rating == null ? null : Number(player.rating.toFixed(1)),
    minutes: player.minutes,
    goals: player.goals,
    assists: player.assists,
    shots: player.shots,
    passes: player.passes,
    tackles: player.tackles,
    saves: player.saves,
  };
}

function sortPlayers(players: MatchCenterPlayer[]) {
  return [...players].sort((a, b) => {
    const ratingDiff = (b.rating ?? -1) - (a.rating ?? -1);
    if (Math.abs(ratingDiff) > 0.001) return ratingDiff;
    if (b.goals !== a.goals) return b.goals - a.goals;
    if (b.assists !== a.assists) return b.assists - a.assists;
    return (b.minutes ?? 0) - (a.minutes ?? 0);
  });
}

async function loadLineupArabicNames(tournamentId: string, matchId: string) {
  const snapshot = await adminDb
    .collection(LINEUP_CACHE_COLLECTION)
    .doc(docId(tournamentId, matchId))
    .get();
  const data = (snapshot.data() || {}) as LineupCacheShape;

  const collect = (side: "home" | "away") => {
    const map = new Map<number, string>();
    const rows = [
      ...(data[side]?.startXI || []),
      ...(data[side]?.substitutes || []),
    ];
    rows.forEach((row) => {
      const id = Number(row.id);
      const name = clean(row.name);
      if (Number.isInteger(id) && id > 0 && name) map.set(id, name);
    });
    return map;
  };

  return { home: collect("home"), away: collect("away") };
}

async function getCached(tournamentId: string, matchId: string) {
  const snapshot = await adminDb.collection(CACHE_COLLECTION).doc(docId(tournamentId, matchId)).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() as TournamentMatchCenter | undefined;
  if (
    !data ||
    data.schemaVersion !== SCHEMA_VERSION ||
    !Number.isFinite(data.expiresAt) ||
    data.expiresAt <= Date.now()
  ) {
    return null;
  }
  return data;
}

export async function getTournamentMatchCenter(input: {
  tournamentId: string;
  matchId: string;
}) {
  const cached = await getCached(input.tournamentId, input.matchId);
  if (cached) return cached;

  const matchSnapshot = await adminDb
    .collection("tournamentMatches")
    .doc(docId(input.tournamentId, input.matchId))
    .get();
  if (!matchSnapshot.exists) throw new Error("MATCH_NOT_FOUND");
  const match = matchSnapshot.data() || {};
  if (clean(match.tournamentId) !== input.tournamentId || clean(match.id) !== input.matchId) {
    throw new Error("MATCH_NOT_FOUND");
  }

  const providerFixtureId = numberOrNull(match.providerFixtureId);
  const homeLocalTeamId = clean(match.homeTeamId);
  const awayLocalTeamId = clean(match.awayTeamId);
  if (!providerFixtureId) throw new Error("FIXTURE_NOT_LINKED");
  if (!homeLocalTeamId || !awayLocalTeamId) throw new Error("TEAMS_PENDING");

  const fixtureResult = await getApiFootballFixturesByIds([providerFixtureId]);
  const fixture = fixtureResult.fixtures.find((item) => item.fixtureId === providerFixtureId);
  if (!fixture) throw new Error("FIXTURE_NOT_FOUND_AT_PROVIDER");

  const [homeTeamSnapshot, awayTeamSnapshot, lineupNames] = await Promise.all([
    adminDb.collection("tournamentTeams").doc(docId(input.tournamentId, homeLocalTeamId)).get(),
    adminDb.collection("tournamentTeams").doc(docId(input.tournamentId, awayLocalTeamId)).get(),
    loadLineupArabicNames(input.tournamentId, input.matchId),
  ]);

  const homeName = clean(homeTeamSnapshot.data()?.nameAr) || clean(homeTeamSnapshot.data()?.nameEn) || fixture.homeName;
  const awayName = clean(awayTeamSnapshot.data()?.nameAr) || clean(awayTeamSnapshot.data()?.nameEn) || fixture.awayName;
  const isLive = LIVE_STATUSES.has(fixture.statusShort);
  const isFinished = FINISHED_STATUSES.has(fixture.statusShort);

  const [eventsResult, statisticsResult, playersResult] = await Promise.allSettled([
    getApiFootballFixtureEvents(providerFixtureId),
    getApiFootballFixtureStatistics(providerFixtureId),
    getApiFootballFixturePlayers(providerFixtureId),
  ]);

  const rawEvents = eventsResult.status === "fulfilled" ? eventsResult.value.events : [];
  const rawStats = statisticsResult.status === "fulfilled" ? statisticsResult.value.teams : [];
  const rawPlayers = playersResult.status === "fulfilled" ? playersResult.value.teams : [];

  const events = rawEvents
    .map((event) => {
      const side = event.teamId === fixture.homeProviderTeamId
        ? "home"
        : event.teamId === fixture.awayProviderTeamId
          ? "away"
          : null;
      if (!side) return null;
      const localTeamId = side === "home" ? homeLocalTeamId : awayLocalTeamId;
      const names = side === "home" ? lineupNames.home : lineupNames.away;
      const playerName = arabicPlayerName({
        teamId: localTeamId,
        apiName: event.playerName,
        playerId: event.playerId,
        lineupNames: names,
      });
      const assistName = event.assistName
        ? arabicPlayerName({
            teamId: localTeamId,
            apiName: event.assistName,
            playerId: event.assistId,
            lineupNames: names,
          })
        : null;
      return {
        minute: eventMinute(event),
        team: side,
        type: eventTypeLabel(event.type, event.detail),
        detail: clean(event.comments),
        playerName,
        assistName: assistName === "لاعب" ? null : assistName,
      } satisfies MatchCenterEvent;
    })
    .filter((event): event is MatchCenterEvent => Boolean(event))
    .reverse();

  const homeStats = rawStats.find((team) => team.teamId === fixture.homeProviderTeamId);
  const awayStats = rawStats.find((team) => team.teamId === fixture.awayProviderTeamId);
  const stats = STAT_DEFINITIONS
    .map((definition) => ({
      key: definition.key,
      label: definition.label,
      home: displayStatValue(findStat(homeStats, definition.key)),
      away: displayStatValue(findStat(awayStats, definition.key)),
    }))
    .filter((row) => row.home !== "—" || row.away !== "—");

  const homePlayers = rawPlayers.find((team) => team.teamId === fixture.homeProviderTeamId)?.players || [];
  const awayPlayers = rawPlayers.find((team) => team.teamId === fixture.awayProviderTeamId)?.players || [];

  const now = Date.now();
  const expiresAt = now + (isLive ? LIVE_TTL_MS : isFinished ? FINISHED_TTL_MS : OTHER_TTL_MS);
  const payload: TournamentMatchCenter = {
    tournamentId: input.tournamentId,
    matchId: input.matchId,
    providerFixtureId,
    schemaVersion: SCHEMA_VERSION,
    fetchedAt: now,
    expiresAt,
    kickoffAt: fixture.kickoffAt,
    statusShort: fixture.statusShort,
    statusLong: fixture.statusLong,
    elapsed: fixture.elapsed,
    isLive,
    isFinished,
    score: { home: fixture.goalsHome, away: fixture.goalsAway },
    home: {
      localTeamId: homeLocalTeamId,
      providerTeamId: fixture.homeProviderTeamId,
      name: homeName,
    },
    away: {
      localTeamId: awayLocalTeamId,
      providerTeamId: fixture.awayProviderTeamId,
      name: awayName,
    },
    events,
    stats,
    players: {
      home: sortPlayers(homePlayers.map((player) => mapPlayer(player, homeLocalTeamId, lineupNames.home))),
      away: sortPlayers(awayPlayers.map((player) => mapPlayer(player, awayLocalTeamId, lineupNames.away))),
    },
  };

  await adminDb.collection(CACHE_COLLECTION).doc(docId(input.tournamentId, input.matchId)).set(payload, { merge: false });
  return payload;
}
