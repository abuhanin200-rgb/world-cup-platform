import "server-only";
import type { DocumentReference, WriteBatch } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  GULF_CUP_27_ACHIEVEMENTS,
  GULF_CUP_27_KNOCKOUT_SCORING_VERSION,
  GULF_CUP_27_SCORING_VERSION,
  GULF_CUP_27_TOURNAMENT_ID,
  calculateTournamentGroupStandingsV2,
  createTournamentResultHash,
  scoreGulfCup27KnockoutPredictionV1,
  scoreGulfCup27PredictionV1,
  validateKnockoutResultV2,
  type TournamentMatchV2,
  type TournamentPredictionV2,
  type TournamentQualificationMethod,
  type TournamentSportsIntegrationConfig,
  type TournamentSportsProviderFixture,
  type TournamentTeamV2,
} from "@/domain/tournaments";
import {
  getApiFootballFixturesByCompetition,
  getApiFootballFixturesByIds,
  getApiFootballLeagueById,
  hasApiFootballKey,
  searchApiFootballLeagues,
  testApiFootballConnection,
} from "@/lib/serverApiFootball";

const COLLECTIONS = {
  integrations: "tournamentIntegrations",
  syncRuns: "tournamentSyncRuns",
  matches: "tournamentMatches",
  teams: "tournamentTeams",
  predictions: "tournamentPredictions",
  stats: "tournamentUserStats",
  achievements: "tournamentAchievements",
  notifications: "notifications",
  automation: "systemAutomationState",
} as const;

const AUTO_STATE_ID = "tournament-sports-v2";
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);
const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "INT"]);
const CANCELLED_STATUSES = new Set(["CANC", "ABD", "AWD", "WO"]);
const POSTPONED_STATUSES = new Set(["PST", "SUSP"]);
const RESULT_VERIFY_GAP_MS = 60_000;
const MAX_BATCH_WRITES = 350;
const GULF_CUP_27_API_LEAGUE_ID = 25;
const GULF_CUP_27_TARGET_SEASON = 2026;
const SEASON_CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;
const DISCOVERY_RETRY_INTERVAL_MS = 12 * 60 * 60 * 1000;

type MatchRow = TournamentMatchV2 & {
  calculationStatus: "not_calculated" | "processing" | "calculated" | "error";
  calculationVersion: string | null;
  resultHash: string | null;
  predictionIsOpen: boolean;
  providerFixtureId: number | null;
  providerStatusShort: string | null;
  providerLastSyncedAt: number | null;
  providerSyncState: string;
  providerSyncMessage: string | null;
  providerCandidateHash: string | null;
  providerCandidateFirstSeenAt: number | null;
  providerCandidateSeenCount: number;
};

type ProviderCandidateResult = {
  homeScore: number;
  awayScore: number;
  qualifiedTeamId: string | null;
  qualificationMethod: TournamentQualificationMethod | null;
  extraTimeHomeScore: number | null;
  extraTimeAwayScore: number | null;
  penaltiesHomeScore: number | null;
  penaltiesAwayScore: number | null;
  scoringVersion: string;
  hash: string;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function num(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nullableNumber(value: unknown) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function entityId(tournamentId: string, id: string) {
  return `${tournamentId}_${id}`;
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(fc|sc|national|team|club)\b/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "")
    .trim();
}

function formatDateOnly(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function defaultConfig(tournamentId: string): TournamentSportsIntegrationConfig {
  const isGulfCup27 = tournamentId === GULF_CUP_27_TOURNAMENT_ID;
  return {
    tournamentId,
    provider: "api-football",
    enabled: false,
    leagueId: isGulfCup27 ? GULF_CUP_27_API_LEAGUE_ID : null,
    season: isGulfCup27 ? GULF_CUP_27_TARGET_SEASON : 2026,
    providerLeagueName: isGulfCup27 ? "Gulf Cup of Nations" : null,
    providerAvailableSeasons: [],
    seasonAvailability: "unknown",
    lastSeasonCheckAt: null,
    seasonAvailableAt: null,
    lastDiscoveryAt: null,
    syncSchedule: true,
    syncStatus: true,
    syncResults: true,
    syncMode: "protected_auto",
    autoDiscover: true,
    updatedAt: Date.now(),
    lastSyncAt: null,
    lastSuccessAt: null,
    lastError: null,
  };
}

function mapConfig(tournamentId: string, data?: Record<string, unknown>): TournamentSportsIntegrationConfig {
  const base = defaultConfig(tournamentId);
  if (!data) return base;
  return {
    ...base,
    enabled: data.enabled === true,
    leagueId: nullableNumber(data.leagueId) ?? base.leagueId,
    season: Math.floor(num(data.season, base.season)),
    providerLeagueName: clean(data.providerLeagueName) || base.providerLeagueName,
    providerAvailableSeasons: Array.isArray(data.providerAvailableSeasons)
      ? data.providerAvailableSeasons.map((item) => Math.floor(num(item))).filter((item) => item > 0)
      : base.providerAvailableSeasons,
    seasonAvailability:
      data.seasonAvailability === "available" || data.seasonAvailability === "pending"
        ? data.seasonAvailability
        : "unknown",
    lastSeasonCheckAt: nullableNumber(data.lastSeasonCheckAt),
    seasonAvailableAt: nullableNumber(data.seasonAvailableAt),
    lastDiscoveryAt: nullableNumber(data.lastDiscoveryAt),
    syncSchedule: data.syncSchedule !== false,
    syncStatus: data.syncStatus !== false,
    syncResults: data.syncResults !== false,
    syncMode: data.syncMode === "review_only" ? "review_only" : "protected_auto",
    autoDiscover: data.autoDiscover !== false,
    updatedAt: num(data.updatedAt, base.updatedAt),
    lastSyncAt: nullableNumber(data.lastSyncAt),
    lastSuccessAt: nullableNumber(data.lastSuccessAt),
    lastError: clean(data.lastError) || null,
  };
}

function mapMatchDoc(id: string, data: Record<string, unknown>): MatchRow {
  const result = (data.result || {}) as Record<string, unknown>;
  return {
    id: clean(data.id) || id.replace(/^.*?_/, ""),
    tournamentId: clean(data.tournamentId),
    stage: data.stage === "knockout" ? "knockout" : "group",
    round: clean(data.round),
    group: data.group == null ? null : clean(data.group),
    homeTeamId: clean(data.homeTeamId),
    awayTeamId: clean(data.awayTeamId),
    homeSourceLabel: clean(data.homeSourceLabel) || null,
    awaySourceLabel: clean(data.awaySourceLabel) || null,
    kickoffAt: num(data.kickoffAt),
    stadium: clean(data.stadium),
    city: clean(data.city),
    status:
      data.status === "prediction_open" ||
      data.status === "live" ||
      data.status === "finished" ||
      data.status === "postponed" ||
      data.status === "cancelled"
        ? data.status
        : "scheduled",
    predictionOpensAt: nullableNumber(data.predictionOpensAt),
    predictionClosesAt: nullableNumber(data.predictionClosesAt),
    predictionIsOpen: data.predictionIsOpen === true,
    calculationStatus:
      data.calculationStatus === "processing" ||
      data.calculationStatus === "calculated" ||
      data.calculationStatus === "error"
        ? data.calculationStatus
        : "not_calculated",
    calculationVersion: clean(data.calculationVersion) || null,
    resultHash: clean(data.resultHash) || null,
    result: {
      homeScore: nullableNumber(result.homeScore),
      awayScore: nullableNumber(result.awayScore),
      extraTimeHomeScore: nullableNumber(result.extraTimeHomeScore),
      extraTimeAwayScore: nullableNumber(result.extraTimeAwayScore),
      penaltiesHomeScore: nullableNumber(result.penaltiesHomeScore),
      penaltiesAwayScore: nullableNumber(result.penaltiesAwayScore),
      qualifiedTeamId: clean(result.qualifiedTeamId) || null,
      qualificationMethod:
        result.qualificationMethod === "regular" ||
        result.qualificationMethod === "extra_time" ||
        result.qualificationMethod === "penalties"
          ? result.qualificationMethod
          : null,
    },
    providerFixtureId: nullableNumber(data.providerFixtureId),
    providerStatusShort: clean(data.providerStatusShort) || null,
    providerLastSyncedAt: nullableNumber(data.providerLastSyncedAt),
    providerSyncState: clean(data.providerSyncState) || (data.providerFixtureId ? "linked" : "unlinked"),
    providerSyncMessage: clean(data.providerSyncMessage) || null,
    providerCandidateHash: clean(data.providerCandidateHash) || null,
    providerCandidateFirstSeenAt: nullableNumber(data.providerCandidateFirstSeenAt),
    providerCandidateSeenCount: Math.max(0, Math.floor(num(data.providerCandidateSeenCount))),
  };
}

async function loadMatches(tournamentId: string) {
  const snapshot = await adminDb.collection(COLLECTIONS.matches).where("tournamentId", "==", tournamentId).get();
  return snapshot.docs.map((item) => ({
    ref: item.ref,
    match: mapMatchDoc(item.id, item.data()),
  }));
}

async function loadTeams(tournamentId: string) {
  const snapshot = await adminDb.collection(COLLECTIONS.teams).where("tournamentId", "==", tournamentId).get();
  return snapshot.docs.map((item) => item.data() as TournamentTeamV2);
}

function teamAliases(team: TournamentTeamV2 | undefined) {
  if (!team) return [];
  return [team.nameEn, team.nameAr, team.shortName, team.code]
    .map((item) => normalizeName(clean(item)))
    .filter(Boolean);
}

function providerMatchesTeam(providerName: string, aliases: string[]) {
  const normalized = normalizeName(providerName);
  return aliases.some((alias) => normalized === alias || normalized.includes(alias) || alias.includes(normalized));
}

function localMatchLabel(match: MatchRow, teams: Map<string, TournamentTeamV2>) {
  const home = teams.get(match.homeTeamId)?.nameAr || match.homeSourceLabel || "لم يتحدد";
  const away = teams.get(match.awayTeamId)?.nameAr || match.awaySourceLabel || "لم يتحدد";
  return `${home} × ${away}`;
}

export async function getTournamentSportsIntegration(tournamentId: string) {
  const ref = adminDb.collection(COLLECTIONS.integrations).doc(tournamentId);
  const [snapshot, matches, teams] = await Promise.all([
    ref.get(),
    loadMatches(tournamentId),
    loadTeams(tournamentId),
  ]);
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const config = mapConfig(tournamentId, snapshot.exists ? snapshot.data() : undefined);

  return {
    hasApiKey: hasApiFootballKey(),
    config,
    mappings: matches
      .map(({ match }) => ({
        matchId: match.id,
        label: localMatchLabel(match, teamMap),
        kickoffAt: match.kickoffAt,
        providerFixtureId: match.providerFixtureId,
        providerStatusShort: match.providerStatusShort,
        providerLastSyncedAt: match.providerLastSyncedAt,
        providerSyncState: match.providerSyncState,
        providerSyncMessage: match.providerSyncMessage,
        calculationStatus: match.calculationStatus,
      }))
      .sort((a, b) => a.kickoffAt - b.kickoffAt),
  };
}

export async function saveTournamentSportsIntegration(
  tournamentId: string,
  input: Partial<TournamentSportsIntegrationConfig>,
) {
  const current = await getTournamentSportsIntegration(tournamentId);
  const leagueId = input.leagueId == null ? current.config.leagueId : Number(input.leagueId);
  const season = Math.floor(Number(input.season ?? current.config.season));
  if (leagueId != null && (!Number.isInteger(leagueId) || leagueId <= 0)) {
    throw new Error("رقم البطولة في مزود البيانات غير صحيح");
  }
  if (!Number.isInteger(season) || season < 2020 || season > 2100) {
    throw new Error("الموسم غير صحيح");
  }

  const competitionChanged =
    leagueId !== current.config.leagueId || season !== current.config.season;

  const next: TournamentSportsIntegrationConfig = {
    ...current.config,
    enabled: input.enabled === true,
    leagueId,
    season,
    providerLeagueName: competitionChanged ? null : current.config.providerLeagueName,
    providerAvailableSeasons: competitionChanged ? [] : current.config.providerAvailableSeasons,
    seasonAvailability: competitionChanged ? "unknown" : current.config.seasonAvailability,
    lastSeasonCheckAt: competitionChanged ? null : current.config.lastSeasonCheckAt,
    seasonAvailableAt: competitionChanged ? null : current.config.seasonAvailableAt,
    lastDiscoveryAt: competitionChanged ? null : current.config.lastDiscoveryAt,
    syncSchedule: input.syncSchedule !== false,
    syncStatus: input.syncStatus !== false,
    syncResults: input.syncResults !== false,
    syncMode: input.syncMode === "review_only" ? "review_only" : "protected_auto",
    autoDiscover: input.autoDiscover !== false,
    updatedAt: Date.now(),
  };

  await adminDb.collection(COLLECTIONS.integrations).doc(tournamentId).set(next, { merge: true });
  return next;
}

export async function checkTournamentSportsSeasonAvailability(
  tournamentId: string,
  options?: { force?: boolean },
) {
  const integration = await getTournamentSportsIntegration(tournamentId);
  const { config } = integration;
  if (!config.leagueId) throw new Error("اختر League ID أولًا");
  if (!hasApiFootballKey()) throw new Error("API_FOOTBALL_KEY_MISSING");

  const now = Date.now();
  if (
    !options?.force &&
    config.lastSeasonCheckAt &&
    now - config.lastSeasonCheckAt < SEASON_CHECK_INTERVAL_MS
  ) {
    return {
      checked: false,
      available: config.seasonAvailability === "available",
      seasonAvailability: config.seasonAvailability,
      leagueId: config.leagueId,
      leagueName: config.providerLeagueName,
      season: config.season,
      seasons: config.providerAvailableSeasons,
      lastSeasonCheckAt: config.lastSeasonCheckAt,
      nextCheckAt: config.lastSeasonCheckAt + SEASON_CHECK_INTERVAL_MS,
      quotaRemaining: null,
    };
  }

  const provider = await getApiFootballLeagueById(config.leagueId);
  const seasons = provider.league?.seasons || [];
  const available = seasons.includes(config.season);
  const previousAvailability = config.seasonAvailability;
  const patch = {
    providerLeagueName: provider.league?.name || config.providerLeagueName,
    providerAvailableSeasons: seasons,
    seasonAvailability: available ? "available" : "pending",
    lastSeasonCheckAt: now,
    seasonAvailableAt: available ? config.seasonAvailableAt || now : null,
    quotaRemaining: provider.quotaRemaining,
    lastError: null,
    updatedAt: now,
  };

  await adminDb.collection(COLLECTIONS.integrations).doc(tournamentId).set(patch, { merge: true });

  if (available && previousAvailability !== "available") {
    await adminDb.collection("admin_logs").add({
      action: "other",
      title: "توفر موسم Sports API",
      description: `أصبح موسم ${config.season} متاحًا لبطولة ${provider.league?.name || config.leagueId}.`,
      metadata: { tournamentId, leagueId: config.leagueId, season: config.season, seasons },
      createdAt: new Date(now).toISOString(),
      source: "sports-api-v2",
    });
  }

  return {
    checked: true,
    available,
    seasonAvailability: available ? "available" as const : "pending" as const,
    leagueId: config.leagueId,
    leagueName: provider.league?.name || null,
    season: config.season,
    seasons,
    lastSeasonCheckAt: now,
    nextCheckAt: now + SEASON_CHECK_INTERVAL_MS,
    quotaRemaining: provider.quotaRemaining,
  };
}

export async function testTournamentSportsProvider() {
  return testApiFootballConnection();
}

export async function searchTournamentSportsLeagues(search: string) {
  return searchApiFootballLeagues(search);
}

function findBestProviderFixture(input: {
  match: MatchRow;
  fixtures: TournamentSportsProviderFixture[];
  teams: Map<string, TournamentTeamV2>;
}) {
  const { match, fixtures, teams } = input;
  if (!match.homeTeamId || !match.awayTeamId) return null;
  const homeAliases = teamAliases(teams.get(match.homeTeamId));
  const awayAliases = teamAliases(teams.get(match.awayTeamId));
  const candidates = fixtures
    .map((fixture) => {
      const homeOk = providerMatchesTeam(fixture.homeName, homeAliases);
      const awayOk = providerMatchesTeam(fixture.awayName, awayAliases);
      if (!homeOk || !awayOk) return null;
      const diff = Math.abs(fixture.kickoffAt - match.kickoffAt);
      if (diff > 36 * 60 * 60 * 1000) return null;
      return { fixture, diff };
    })
    .filter((item): item is { fixture: TournamentSportsProviderFixture; diff: number } => Boolean(item))
    .sort((a, b) => a.diff - b.diff);
  return candidates[0]?.fixture ?? null;
}

export async function discoverTournamentSportsFixtures(tournamentId: string) {
  const integration = await getTournamentSportsIntegration(tournamentId);
  const { config } = integration;
  if (!config.leagueId) throw new Error("اختر البطولة من مزود البيانات أولًا");

  const seasonState = await checkTournamentSportsSeasonAvailability(tournamentId, { force: true });
  if (!seasonState.available) {
    return {
      linked: 0,
      alreadyLinked: integration.mappings.filter((item) => Boolean(item.providerFixtureId)).length,
      unmatched: integration.mappings.filter((item) => !item.providerFixtureId).map((item) => item.matchId),
      providerFixtures: 0,
      quotaRemaining: seasonState.quotaRemaining,
      seasonPending: true,
      season: config.season,
      availableSeasons: seasonState.seasons,
      message: `موسم ${config.season} غير متاح بعد لدى ${seasonState.leagueName || "API-FOOTBALL"}. سيستمر النظام في مراقبته تلقائيًا.`,
    };
  }

  const [matches, teams] = await Promise.all([loadMatches(tournamentId), loadTeams(tournamentId)]);
  if (!matches.length) throw new Error("لا توجد مباريات مهيأة لهذه البطولة");
  const kickoffValues = matches.map(({ match }) => match.kickoffAt).filter((value) => value > 0);
  const min = Math.min(...kickoffValues) - 24 * 60 * 60 * 1000;
  const max = Math.max(...kickoffValues) + 24 * 60 * 60 * 1000;
  const provider = await getApiFootballFixturesByCompetition({
    leagueId: config.leagueId,
    season: config.season,
    from: formatDateOnly(min),
    to: formatDateOnly(max),
  });
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  let linked = 0;
  const unmatched: string[] = [];

  for (const item of matches) {
    const { match } = item;
    if (match.providerFixtureId) continue;
    const fixture = findBestProviderFixture({ match, fixtures: provider.fixtures, teams: teamMap });
    if (!fixture) {
      if (match.homeTeamId && match.awayTeamId) unmatched.push(match.id);
      continue;
    }
    await item.ref.set({
      sportsProvider: "api-football",
      providerFixtureId: fixture.fixtureId,
      providerLeagueId: fixture.leagueId,
      providerHomeTeamId: fixture.homeProviderTeamId,
      providerAwayTeamId: fixture.awayProviderTeamId,
      providerSyncState: "linked",
      providerSyncMessage: "تم الربط تلقائيًا حسب المنتخبين والموعد",
      providerMappedAt: Date.now(),
      updatedAt: Date.now(),
    }, { merge: true });
    linked += 1;
  }

  await adminDb.collection(COLLECTIONS.integrations).doc(tournamentId).set({
    lastDiscoveryAt: Date.now(),
    updatedAt: Date.now(),
  }, { merge: true });

  return {
    linked,
    alreadyLinked: matches.filter(({ match }) => Boolean(match.providerFixtureId)).length,
    unmatched,
    providerFixtures: provider.fixtures.length,
    quotaRemaining: provider.quotaRemaining,
  };
}

export async function setTournamentSportsFixtureLink(input: {
  tournamentId: string;
  matchId: string;
  providerFixtureId: number | null;
}) {
  const ref = adminDb.collection(COLLECTIONS.matches).doc(entityId(input.tournamentId, input.matchId));
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error("المباراة غير موجودة");
  const providerFixtureId = input.providerFixtureId == null ? null : Number(input.providerFixtureId);
  if (providerFixtureId != null && (!Number.isInteger(providerFixtureId) || providerFixtureId <= 0)) {
    throw new Error("Fixture ID غير صحيح");
  }
  await ref.set({
    providerFixtureId,
    sportsProvider: providerFixtureId ? "api-football" : null,
    providerSyncState: providerFixtureId ? "linked" : "unlinked",
    providerSyncMessage: providerFixtureId ? "ربط يدوي من الأدمن" : "تم إلغاء الربط",
    providerMappedAt: providerFixtureId ? Date.now() : null,
    updatedAt: Date.now(),
  }, { merge: true });
}

function mapProviderStatus(statusShort: string, predictionIsOpen: boolean): TournamentMatchV2["status"] | null {
  if (LIVE_STATUSES.has(statusShort)) return "live";
  if (FINISHED_STATUSES.has(statusShort)) return "finished";
  if (POSTPONED_STATUSES.has(statusShort)) return "postponed";
  if (CANCELLED_STATUSES.has(statusShort)) return "cancelled";
  if (statusShort === "NS" || statusShort === "TBD") return predictionIsOpen ? "prediction_open" : "scheduled";
  return null;
}

function teamMatchesProvider(match: MatchRow, fixture: TournamentSportsProviderFixture, teams: Map<string, TournamentTeamV2>) {
  if (!match.homeTeamId || !match.awayTeamId) return false;
  return (
    providerMatchesTeam(fixture.homeName, teamAliases(teams.get(match.homeTeamId))) &&
    providerMatchesTeam(fixture.awayName, teamAliases(teams.get(match.awayTeamId)))
  );
}

function makeProviderCandidate(match: MatchRow, fixture: TournamentSportsProviderFixture): ProviderCandidateResult {
  const scoringVersion = match.stage === "knockout" ? GULF_CUP_27_KNOCKOUT_SCORING_VERSION : GULF_CUP_27_SCORING_VERSION;
  const fulltimeHome = fixture.fulltimeHome ?? fixture.goalsHome;
  const fulltimeAway = fixture.fulltimeAway ?? fixture.goalsAway;
  if (fulltimeHome == null || fulltimeAway == null) {
    throw new Error("النتيجة النهائية ناقصة في مزود البيانات");
  }

  let qualifiedTeamId: string | null = null;
  let qualificationMethod: TournamentQualificationMethod | null = null;
  let extraTimeHomeScore: number | null = null;
  let extraTimeAwayScore: number | null = null;
  let penaltiesHomeScore: number | null = null;
  let penaltiesAwayScore: number | null = null;

  if (match.stage === "knockout") {
    if (fixture.statusShort === "FT") {
      if (fulltimeHome === fulltimeAway) throw new Error("مباراة خروج المغلوب انتهت FT بالتعادل؛ تحتاج مراجعة");
      qualifiedTeamId = fulltimeHome > fulltimeAway ? match.homeTeamId : match.awayTeamId;
      qualificationMethod = "regular";
    } else if (fixture.statusShort === "AET") {
      extraTimeHomeScore = fixture.extraTimeHome ?? fixture.goalsHome;
      extraTimeAwayScore = fixture.extraTimeAway ?? fixture.goalsAway;
      if (fulltimeHome !== fulltimeAway || extraTimeHomeScore == null || extraTimeAwayScore == null || extraTimeHomeScore === extraTimeAwayScore) {
        throw new Error("بيانات الوقت الإضافي غير متناسقة وتحتاج مراجعة");
      }
      qualifiedTeamId = extraTimeHomeScore > extraTimeAwayScore ? match.homeTeamId : match.awayTeamId;
      qualificationMethod = "extra_time";
    } else if (fixture.statusShort === "PEN") {
      penaltiesHomeScore = fixture.penaltiesHome;
      penaltiesAwayScore = fixture.penaltiesAway;
      if (fulltimeHome !== fulltimeAway || penaltiesHomeScore == null || penaltiesAwayScore == null || penaltiesHomeScore === penaltiesAwayScore) {
        throw new Error("بيانات ركلات الترجيح غير متناسقة وتحتاج مراجعة");
      }
      extraTimeHomeScore = fixture.extraTimeHome;
      extraTimeAwayScore = fixture.extraTimeAway;
      qualifiedTeamId = penaltiesHomeScore > penaltiesAwayScore ? match.homeTeamId : match.awayTeamId;
      qualificationMethod = "penalties";
    } else {
      throw new Error("حالة خروج المغلوب النهائية غير مدعومة تلقائيًا");
    }

    validateKnockoutResultV2({
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeScore: fulltimeHome,
      awayScore: fulltimeAway,
      qualifiedTeamId,
      qualificationMethod,
      extraTimeHomeScore,
      extraTimeAwayScore,
      penaltiesHomeScore,
      penaltiesAwayScore,
    });
  }

  const hash = createTournamentResultHash({
    tournamentId: match.tournamentId,
    matchId: match.id,
    homeScore: fulltimeHome,
    awayScore: fulltimeAway,
    scoringVersion,
    qualifiedTeamId,
    qualificationMethod,
    extraTimeHomeScore,
    extraTimeAwayScore,
    penaltiesHomeScore,
    penaltiesAwayScore,
  });

  return {
    homeScore: fulltimeHome,
    awayScore: fulltimeAway,
    qualifiedTeamId,
    qualificationMethod,
    extraTimeHomeScore,
    extraTimeAwayScore,
    penaltiesHomeScore,
    penaltiesAwayScore,
    scoringVersion,
    hash,
  };
}

async function commitOperations(operations: Array<(batch: WriteBatch) => void>) {
  for (let index = 0; index < operations.length; index += MAX_BATCH_WRITES) {
    const batch = adminDb.batch();
    operations.slice(index, index + MAX_BATCH_WRITES).forEach((operation) => operation(batch));
    await batch.commit();
  }
}

function predictionFromData(id: string, data: Record<string, unknown>): TournamentPredictionV2 {
  const breakdown = (data.pointsBreakdown || {}) as Record<string, unknown>;
  return {
    id,
    tournamentId: clean(data.tournamentId),
    matchId: clean(data.matchId),
    userId: clean(data.userId),
    userName: clean(data.userName),
    homeScore: num(data.homeScore),
    awayScore: num(data.awayScore),
    qualifiedTeamId: clean(data.qualifiedTeamId) || null,
    qualificationMethod:
      data.qualificationMethod === "regular" || data.qualificationMethod === "extra_time" || data.qualificationMethod === "penalties"
        ? data.qualificationMethod
        : null,
    points: data.points == null ? null : num(data.points),
    pointsBreakdown: data.pointsBreakdown ? { score: num(breakdown.score), qualified: num(breakdown.qualified), method: num(breakdown.method) } : null,
    isCalculated: data.isCalculated === true,
    resultType: data.resultType === "exact" || data.resultType === "outcome" || data.resultType === "wrong" ? data.resultType : null,
    submittedAt: num(data.submittedAt),
    updatedAt: num(data.updatedAt),
    calculatedAt: nullableNumber(data.calculatedAt),
    scoringVersion: clean(data.scoringVersion) || null,
    resultHash: clean(data.resultHash) || null,
    calculationRunId: clean(data.calculationRunId) || null,
  };
}

export async function rebuildLeaderboardServer(tournamentId: string) {
  const [matchesSnapshot, predictionsSnapshot, existingStats] = await Promise.all([
    adminDb.collection(COLLECTIONS.matches).where("tournamentId", "==", tournamentId).get(),
    adminDb.collection(COLLECTIONS.predictions).where("tournamentId", "==", tournamentId).get(),
    adminDb.collection(COLLECTIONS.stats).where("tournamentId", "==", tournamentId).get(),
  ]);
  const matchById = new Map(matchesSnapshot.docs.map((item) => {
    const match = mapMatchDoc(item.id, item.data());
    return [match.id, match] as const;
  }));
  const predictions = predictionsSnapshot.docs
    .map((item) => predictionFromData(item.id, item.data()))
    .filter((prediction) => prediction.isCalculated && prediction.points != null && prediction.resultType && matchById.has(prediction.matchId))
    .sort((a, b) => (matchById.get(a.matchId)?.kickoffAt || 0) - (matchById.get(b.matchId)?.kickoffAt || 0));

  const rows = new Map<string, { userId: string; fullName: string; points: number; played: number; exact: number; correctOutcome: number; wrong: number; currentStreak: number; bestStreak: number }>();
  predictions.forEach((prediction) => {
    const row = rows.get(prediction.userId) || { userId: prediction.userId, fullName: clean(prediction.userName) || "عضو", points: 0, played: 0, exact: 0, correctOutcome: 0, wrong: 0, currentStreak: 0, bestStreak: 0 };
    row.fullName = clean(prediction.userName) || row.fullName;
    row.points += prediction.points || 0;
    row.played += 1;
    if (prediction.resultType === "exact") { row.exact += 1; row.currentStreak += 1; }
    else if (prediction.resultType === "outcome") { row.correctOutcome += 1; row.currentStreak += 1; }
    else { row.wrong += 1; row.currentStreak = 0; }
    row.bestStreak = Math.max(row.bestStreak, row.currentStreak);
    rows.set(prediction.userId, row);
  });
  const sorted = [...rows.values()].sort((a, b) => b.points - a.points || b.exact - a.exact || b.correctOutcome - a.correctOutcome || a.wrong - b.wrong || a.fullName.localeCompare(b.fullName, "ar"));
  const now = Date.now();
  const operations: Array<(batch: WriteBatch) => void> = [];
  existingStats.docs.forEach((item) => operations.push((batch) => batch.delete(item.ref)));
  sorted.forEach((row, index) => operations.push((batch) => batch.set(adminDb.collection(COLLECTIONS.stats).doc(entityId(tournamentId, row.userId)), {
    id: entityId(tournamentId, row.userId), tournamentId, ...row, rank: index + 1, updatedAt: now, schemaVersion: 2,
  })));
  await commitOperations(operations);
  return sorted.map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function syncKnockoutBracketServer(tournamentId: string) {
  if (tournamentId !== GULF_CUP_27_TOURNAMENT_ID) return;
  const [matchRows, teams] = await Promise.all([loadMatches(tournamentId), loadTeams(tournamentId)]);
  const matches = matchRows.map((item) => item.match);
  const groupMatches = matches.filter((match) => match.stage === "group");
  const allGroupsFinished = groupMatches.length >= 12 && groupMatches.every((match) => match.status === "finished" && match.result.homeScore != null && match.result.awayScore != null);

  async function assign(matchId: string, homeTeamId: string, awayTeamId: string) {
    if (!homeTeamId || !awayTeamId) return;
    const row = matchRows.find((item) => item.match.id === matchId);
    if (!row || row.match.calculationStatus === "calculated") return;
    if (row.match.homeTeamId === homeTeamId && row.match.awayTeamId === awayTeamId) return;
    const predictions = await adminDb.collection(COLLECTIONS.predictions).where("tournamentId", "==", tournamentId).where("matchId", "==", matchId).get();
    if (!predictions.empty) {
      await commitOperations(predictions.docs.map((item) => (batch) => batch.delete(item.ref)));
    }
    await row.ref.set({ homeTeamId, awayTeamId, predictionIsOpen: false, status: "scheduled", providerFixtureId: null, providerSyncState: "unlinked", updatedAt: Date.now() }, { merge: true });
  }

  if (allGroupsFinished) {
    const groupA = calculateTournamentGroupStandingsV2({ teams, matches: groupMatches, group: "A" });
    const groupB = calculateTournamentGroupStandingsV2({ teams, matches: groupMatches, group: "B" });
    if (groupA.length >= 2 && groupB.length >= 2) {
      await assign("g27-sf-1", groupA[0].teamId, groupB[1].teamId);
      await assign("g27-sf-2", groupB[0].teamId, groupA[1].teamId);
    }
  }

  const refreshed = (await loadMatches(tournamentId)).map((item) => item.match);
  const sf1 = refreshed.find((match) => match.id === "g27-sf-1");
  const sf2 = refreshed.find((match) => match.id === "g27-sf-2");
  if (sf1?.calculationStatus === "calculated" && sf2?.calculationStatus === "calculated" && sf1.result.qualifiedTeamId && sf2.result.qualifiedTeamId) {
    await assign("g27-final", sf1.result.qualifiedTeamId, sf2.result.qualifiedTeamId);
  }
}

export async function rebuildAchievementsServer(tournamentId: string) {
  if (tournamentId !== GULF_CUP_27_TOURNAMENT_ID) return;
  const [stats, predictions, matches, existing] = await Promise.all([
    adminDb.collection(COLLECTIONS.stats).where("tournamentId", "==", tournamentId).get(),
    adminDb.collection(COLLECTIONS.predictions).where("tournamentId", "==", tournamentId).get(),
    adminDb.collection(COLLECTIONS.matches).where("tournamentId", "==", tournamentId).get(),
    adminDb.collection(COLLECTIONS.achievements).where("tournamentId", "==", tournamentId).get(),
  ]);
  const exactByUser = new Map<string, number>();
  predictions.docs.forEach((item) => { const d = item.data(); if (d.isCalculated === true && d.resultType === "exact") exactByUser.set(clean(d.userId), (exactByUser.get(clean(d.userId)) || 0) + 1); });
  const finalDone = matches.docs.some((item) => clean(item.data().id) === "g27-final" && item.data().calculationStatus === "calculated");
  const desired = new Map<string, Record<string, unknown>>();
  const now = Date.now();
  stats.docs.forEach((item) => {
    const d = item.data(); const userId = clean(d.userId); const fullName = clean(d.fullName) || "عضو"; const exact = num(d.exact); const bestStreak = num(d.bestStreak); const rank = num(d.rank, 9999);
    const keys: string[] = [];
    if ((exactByUser.get(userId) || 0) >= 1) keys.push("first_exact");
    if (exact >= 3) keys.push("three_exact");
    if (bestStreak >= 5) keys.push("five_streak");
    if (rank <= 3) keys.push("top_three");
    if (exact >= 5) keys.push("prediction_king");
    if (finalDone && rank === 1) keys.push("champion");
    keys.forEach((key) => {
      const def = GULF_CUP_27_ACHIEVEMENTS.find((achievement) => achievement.key === key);
      if (!def) return;
      const id = `${tournamentId}_${userId}_${key}`;
      desired.set(id, { id, tournamentId, userId, fullName, ...def, unlockedAt: now, updatedAt: now, schemaVersion: 2 });
    });
  });
  const existingAt = new Map(existing.docs.map((item) => [item.id, num(item.data().unlockedAt, now)]));
  const operations: Array<(batch: WriteBatch) => void> = [];
  desired.forEach((data, id) => operations.push((batch) => batch.set(adminDb.collection(COLLECTIONS.achievements).doc(id), { ...data, unlockedAt: existingAt.get(id) || now }, { merge: true })));
  existing.docs.forEach((item) => { if (!desired.has(item.id)) operations.push((batch) => batch.delete(item.ref)); });
  await commitOperations(operations);
}

async function sendResultNotificationsServer(input: {
  tournamentId: string;
  match: MatchRow;
  candidate: ProviderCandidateResult;
  resultHash: string;
  scored: Array<{ userId: string; points: number; resultType: "exact" | "outcome" | "wrong" }>;
}) {
  const nowIso = new Date().toISOString();
  const operations: Array<(batch: WriteBatch) => void> = [];
  input.scored.forEach((row) => {
    const id = `auto_result_${input.tournamentId}_${input.match.id}_${input.resultHash}_${row.userId}`.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 450);
    const title = row.resultType === "exact" ? "جبتها بالملي 🎯" : row.resultType === "outcome" ? "توقع صحيح ✅" : "انتهت المباراة";
    const message = `انتهت المباراة ${input.candidate.homeScore}-${input.candidate.awayScore}.${row.points > 0 ? ` +${row.points} نقطة` : ""}`;
    operations.push((batch) => batch.set(adminDb.collection(COLLECTIONS.notifications).doc(id), {
      userId: row.userId, type: row.resultType === "exact" ? "exact_hit" : row.resultType === "outcome" ? "winner_hit" : "match_result", title, message,
      isRead: false, createdAt: nowIso, readAt: null, tournamentId: input.tournamentId, matchId: input.match.id, route: "/tournaments/gulf-cup-27/predictions", automated: true, dedupeKey: `provider-result:${input.resultHash}:${row.userId}`,
    }, { merge: true }));
  });
  await commitOperations(operations);
}

async function calculateMatchServer(matchRow: { ref: DocumentReference; match: MatchRow }, candidate: ProviderCandidateResult) {
  const { ref, match } = matchRow;
  const now = Date.now();
  if (match.calculationStatus === "calculated") {
    if (match.resultHash === candidate.hash) return { predictionsCalculated: 0, alreadyCalculated: true };
    throw new Error("المباراة محتسبة بنتيجة مختلفة؛ يلزم تدخل الأدمن");
  }

  const claimed = await adminDb.runTransaction(async (transaction) => {
    const latestSnapshot = await transaction.get(ref);
    if (!latestSnapshot.exists) throw new Error("المباراة لم تعد موجودة");
    const latest = mapMatchDoc(latestSnapshot.id, latestSnapshot.data() || {});
    if (latest.calculationStatus === "processing") {
      throw new Error("احتساب هذه المباراة قيد التنفيذ بالفعل");
    }
    if (latest.calculationStatus === "calculated") {
      if (latest.resultHash === candidate.hash) return false;
      throw new Error("المباراة محتسبة بنتيجة مختلفة؛ يلزم تراجع الأدمن أولًا");
    }
    transaction.set(ref, {
      calculationStatus: "processing",
      predictionIsOpen: false,
      calculationVersion: candidate.scoringVersion,
      resultHash: candidate.hash,
      updatedAt: now,
    }, { merge: true });
    return true;
  });
  if (!claimed) return { predictionsCalculated: 0, alreadyCalculated: true };

  const predictionsSnapshot = await adminDb.collection(COLLECTIONS.predictions).where("tournamentId", "==", match.tournamentId).where("matchId", "==", match.id).get();
  const scored: Array<{ userId: string; points: number; resultType: "exact" | "outcome" | "wrong" }> = [];
  const resultMatch: TournamentMatchV2 = { ...match, status: "finished", result: { homeScore: candidate.homeScore, awayScore: candidate.awayScore, extraTimeHomeScore: candidate.extraTimeHomeScore, extraTimeAwayScore: candidate.extraTimeAwayScore, penaltiesHomeScore: candidate.penaltiesHomeScore, penaltiesAwayScore: candidate.penaltiesAwayScore, qualifiedTeamId: candidate.qualifiedTeamId, qualificationMethod: candidate.qualificationMethod } };
  const runId = `${match.tournamentId}_${match.id}_provider_${now}`;
  const operations = predictionsSnapshot.docs.map((item) => (batch: WriteBatch) => {
    const prediction = predictionFromData(item.id, item.data());
    const score = match.stage === "knockout" ? scoreGulfCup27KnockoutPredictionV1({ prediction, match: resultMatch }) : scoreGulfCup27PredictionV1({ prediction, match: resultMatch });
    scored.push({ userId: prediction.userId, points: score.points, resultType: score.resultType });
    batch.set(item.ref, { points: score.points, pointsBreakdown: score.pointsBreakdown, isCalculated: true, resultType: score.resultType, calculatedAt: now, scoringVersion: score.scoringVersion, resultHash: candidate.hash, calculationRunId: runId, updatedAt: now }, { merge: true });
  });

  await commitOperations(operations);
  const leaderboard = await rebuildLeaderboardServer(match.tournamentId);
  await ref.set({
    result: resultMatch.result, status: "finished", predictionIsOpen: false, calculationStatus: "calculated", calculationVersion: candidate.scoringVersion, resultHash: candidate.hash, calculationRunId: runId,
    calculatedAt: now, calculatedPredictions: predictionsSnapshot.size, providerSyncState: "calculated", providerSyncMessage: "تم التحقق من نتيجة المزود واحتسابها تلقائيًا", providerCalculatedAt: now, updatedAt: now,
  }, { merge: true });
  await syncKnockoutBracketServer(match.tournamentId);
  await rebuildAchievementsServer(match.tournamentId);
  await sendResultNotificationsServer({ tournamentId: match.tournamentId, match, candidate, resultHash: candidate.hash, scored });
  return { predictionsCalculated: predictionsSnapshot.size, leaderboardRows: leaderboard.length, alreadyCalculated: false };
}

function validTournamentScore(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 30;
}

export type ManualTournamentCalculationInputV2 = {
  tournamentId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  qualifiedTeamId?: string | null;
  qualificationMethod?: TournamentQualificationMethod | null;
  extraTimeHomeScore?: number | null;
  extraTimeAwayScore?: number | null;
  penaltiesHomeScore?: number | null;
  penaltiesAwayScore?: number | null;
};

export async function calculateTournamentMatchManuallyServerV2(
  input: ManualTournamentCalculationInputV2,
) {
  const tournamentId = clean(input.tournamentId);
  const matchId = clean(input.matchId);
  if (!tournamentId || !matchId) throw new Error("بيانات المباراة غير مكتملة");
  if (!validTournamentScore(input.homeScore) || !validTournamentScore(input.awayScore)) {
    throw new Error("النتيجة يجب أن تكون أرقامًا صحيحة من 0 إلى 30");
  }
  if (tournamentId !== GULF_CUP_27_TOURNAMENT_ID) {
    throw new Error("محرك الاحتساب الحالي مخصص لخليجي 27 فقط");
  }

  const ref = adminDb.collection(COLLECTIONS.matches).doc(entityId(tournamentId, matchId));
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error("المباراة غير موجودة");
  const match = mapMatchDoc(snapshot.id, snapshot.data() || {});
  if (!match.homeTeamId || !match.awayTeamId) throw new Error("حدد طرفي المباراة أولًا");
  if (match.status === "postponed") throw new Error("لا يمكن احتساب مباراة مؤجلة");
  if (match.status === "cancelled") throw new Error("لا يمكن احتساب مباراة ملغاة");

  const scoringVersion =
    match.stage === "knockout"
      ? GULF_CUP_27_KNOCKOUT_SCORING_VERSION
      : GULF_CUP_27_SCORING_VERSION;
  const candidate: ProviderCandidateResult = {
    homeScore: input.homeScore,
    awayScore: input.awayScore,
    qualifiedTeamId: null,
    qualificationMethod: null,
    extraTimeHomeScore: nullableNumber(input.extraTimeHomeScore),
    extraTimeAwayScore: nullableNumber(input.extraTimeAwayScore),
    penaltiesHomeScore: nullableNumber(input.penaltiesHomeScore),
    penaltiesAwayScore: nullableNumber(input.penaltiesAwayScore),
    scoringVersion,
    hash: "",
  };

  for (const value of [
    candidate.extraTimeHomeScore,
    candidate.extraTimeAwayScore,
    candidate.penaltiesHomeScore,
    candidate.penaltiesAwayScore,
  ]) {
    if (value != null && !validTournamentScore(value)) {
      throw new Error("نتائج الإضافي والترجيح يجب أن تكون من 0 إلى 30");
    }
  }

  if (match.stage === "knockout") {
    candidate.qualifiedTeamId = clean(input.qualifiedTeamId) || null;
    candidate.qualificationMethod =
      input.qualificationMethod === "regular" ||
      input.qualificationMethod === "extra_time" ||
      input.qualificationMethod === "penalties"
        ? input.qualificationMethod
        : null;
    if (!candidate.qualifiedTeamId || !candidate.qualificationMethod) {
      throw new Error("حدد المتأهل وطريقة التأهل");
    }
    validateKnockoutResultV2({
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeScore: candidate.homeScore,
      awayScore: candidate.awayScore,
      qualifiedTeamId: candidate.qualifiedTeamId,
      qualificationMethod: candidate.qualificationMethod,
      extraTimeHomeScore: candidate.extraTimeHomeScore,
      extraTimeAwayScore: candidate.extraTimeAwayScore,
      penaltiesHomeScore: candidate.penaltiesHomeScore,
      penaltiesAwayScore: candidate.penaltiesAwayScore,
    });
  }

  candidate.hash = createTournamentResultHash({
    tournamentId,
    matchId,
    homeScore: candidate.homeScore,
    awayScore: candidate.awayScore,
    scoringVersion,
    qualifiedTeamId: candidate.qualifiedTeamId,
    qualificationMethod: candidate.qualificationMethod,
    extraTimeHomeScore: candidate.extraTimeHomeScore,
    extraTimeAwayScore: candidate.extraTimeAwayScore,
    penaltiesHomeScore: candidate.penaltiesHomeScore,
    penaltiesAwayScore: candidate.penaltiesAwayScore,
  });

  try {
    const result = await calculateMatchServer({ ref, match }, candidate);
    const latest = await ref.get();
    return {
      tournamentId,
      matchId,
      predictionsCalculated:
        result.alreadyCalculated
          ? num(latest.data()?.calculatedPredictions)
          : result.predictionsCalculated,
      leaderboardRows: "leaderboardRows" in result ? result.leaderboardRows : 0,
      resultHash: candidate.hash,
      calculationRunId: clean(latest.data()?.calculationRunId) || candidate.hash,
      scoringVersion,
      alreadyCalculated: result.alreadyCalculated,
    };
  } catch (error) {
    const latest = await ref.get();
    if (latest.data()?.calculationStatus === "processing") {
      await ref.set({
        calculationStatus: "error",
        calculationError: (error instanceof Error ? error.message : "خطأ غير معروف").slice(0, 300),
        updatedAt: Date.now(),
      }, { merge: true });
    }
    throw error;
  }
}

export async function undoTournamentMatchCalculationServerV2(input: {
  tournamentId: string;
  matchId: string;
}) {
  const tournamentId = clean(input.tournamentId);
  const matchId = clean(input.matchId);
  const ref = adminDb.collection(COLLECTIONS.matches).doc(entityId(tournamentId, matchId));
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error("المباراة غير موجودة");
  const match = mapMatchDoc(snapshot.id, snapshot.data() || {});
  if (match.calculationStatus !== "calculated" && match.status !== "finished") {
    throw new Error("هذه المباراة غير محتسبة حاليًا");
  }

  const predictions = await adminDb.collection(COLLECTIONS.predictions)
    .where("tournamentId", "==", tournamentId)
    .where("matchId", "==", matchId)
    .get();
  await commitOperations(predictions.docs.map((item) => (batch) => batch.set(item.ref, {
    points: null,
    pointsBreakdown: null,
    isCalculated: false,
    resultType: null,
    calculatedAt: null,
    scoringVersion: null,
    resultHash: null,
    calculationRunId: null,
    updatedAt: Date.now(),
  }, { merge: true })));

  const now = Date.now();
  await ref.set({
    result: {
      ...match.result,
      homeScore: null,
      awayScore: null,
      extraTimeHomeScore: null,
      extraTimeAwayScore: null,
      penaltiesHomeScore: null,
      penaltiesAwayScore: null,
      qualifiedTeamId: null,
      qualificationMethod: null,
    },
    status: "scheduled",
    predictionIsOpen: false,
    predictionClosesAt: match.kickoffAt,
    calculationStatus: "not_calculated",
    calculationVersion: null,
    resultHash: null,
    calculationRunId: null,
    calculationError: null,
    calculatedAt: null,
    calculatedPredictions: 0,
    lastUndoAt: now,
    updatedAt: now,
  }, { merge: true });

  const leaderboard = await rebuildLeaderboardServer(tournamentId);
  await syncKnockoutBracketServer(tournamentId);
  await rebuildAchievementsServer(tournamentId);
  return {
    tournamentId,
    matchId,
    predictionsReset: predictions.size,
    leaderboardRows: leaderboard.length,
  };
}

export async function updateTournamentPredictionByAdminServerV2(input: {
  predictionId: string;
  homeScore: number;
  awayScore: number;
  qualifiedTeamId?: string | null;
  qualificationMethod?: TournamentQualificationMethod | null;
}) {
  if (!validTournamentScore(input.homeScore) || !validTournamentScore(input.awayScore)) {
    throw new Error("النتيجة يجب أن تكون بين 0 و30");
  }
  const ref = adminDb.collection(COLLECTIONS.predictions).doc(clean(input.predictionId));
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error("التوقع غير موجود");
  const prediction = snapshot.data() || {};
  if (prediction.isCalculated === true) {
    throw new Error("تراجع عن احتساب المباراة أولًا قبل تعديل توقع محتسب");
  }
  const tournamentId = clean(prediction.tournamentId);
  const matchId = clean(prediction.matchId);
  const matchSnapshot = await adminDb.collection(COLLECTIONS.matches)
    .doc(entityId(tournamentId, matchId)).get();
  if (!matchSnapshot.exists) throw new Error("المباراة المرتبطة بالتوقع غير موجودة");
  const match = mapMatchDoc(matchSnapshot.id, matchSnapshot.data() || {});
  let qualifiedTeamId: string | null = null;
  let qualificationMethod: TournamentQualificationMethod | null = null;
  if (match.stage === "knockout") {
    if (input.homeScore > input.awayScore) {
      qualifiedTeamId = match.homeTeamId;
      qualificationMethod = "regular";
    } else if (input.awayScore > input.homeScore) {
      qualifiedTeamId = match.awayTeamId;
      qualificationMethod = "regular";
    } else {
      qualifiedTeamId = clean(input.qualifiedTeamId) || null;
      qualificationMethod =
        input.qualificationMethod === "extra_time" || input.qualificationMethod === "penalties"
          ? input.qualificationMethod
          : null;
      if (!qualifiedTeamId || ![match.homeTeamId, match.awayTeamId].includes(qualifiedTeamId)) {
        throw new Error("اختر المتأهل عند توقع التعادل");
      }
      if (!qualificationMethod) throw new Error("اختر طريقة التأهل عند توقع التعادل");
    }
  }
  await ref.set({
    homeScore: input.homeScore,
    awayScore: input.awayScore,
    qualifiedTeamId,
    qualificationMethod,
    updatedAt: Date.now(),
  }, { merge: true });
  return { updated: true };
}

export async function deleteTournamentPredictionByAdminServerV2(predictionId: string) {
  const ref = adminDb.collection(COLLECTIONS.predictions).doc(clean(predictionId));
  const snapshot = await ref.get();
  if (!snapshot.exists) return { deleted: false };
  if (snapshot.data()?.isCalculated === true) {
    throw new Error("تراجع عن احتساب المباراة أولًا قبل حذف توقع محتسب");
  }
  await ref.delete();
  return { deleted: true };
}

export async function deleteTournamentMatchPredictionsByAdminServerV2(input: {
  tournamentId: string;
  matchId: string;
}) {
  const snapshot = await adminDb.collection(COLLECTIONS.predictions)
    .where("tournamentId", "==", clean(input.tournamentId))
    .where("matchId", "==", clean(input.matchId))
    .get();
  if (snapshot.docs.some((item) => item.data().isCalculated === true)) {
    throw new Error("يوجد توقعات محتسبة. تراجع عن احتساب المباراة أولًا");
  }
  await commitOperations(snapshot.docs.map((item) => (batch) => batch.delete(item.ref)));
  return { deleted: snapshot.size };
}

async function updateProviderCandidate(row: { ref: DocumentReference; match: MatchRow }, candidate: ProviderCandidateResult, allowAutoCalculate: boolean) {
  const now = Date.now();
  const sameCandidate = row.match.providerCandidateHash === candidate.hash;
  const firstSeenAt = sameCandidate ? row.match.providerCandidateFirstSeenAt || now : now;
  const seenCount = sameCandidate ? row.match.providerCandidateSeenCount + 1 : 1;
  const verified = sameCandidate && seenCount >= 2 && now - firstSeenAt >= RESULT_VERIFY_GAP_MS;

  await row.ref.set({
    providerCandidateResult: candidate,
    providerCandidateHash: candidate.hash,
    providerCandidateFirstSeenAt: firstSeenAt,
    providerCandidateSeenCount: seenCount,
    providerSyncState: verified ? "verified" : "awaiting_review",
    providerSyncMessage: verified ? "تمت مطابقة النتيجة في قراءتين منفصلتين" : "تم رصد نتيجة نهائية؛ بانتظار قراءة تحقق ثانية أو اعتماد الأدمن",
    providerLastSyncedAt: now,
    updatedAt: now,
  }, { merge: true });

  if (verified && allowAutoCalculate) {
    const refreshed = await row.ref.get();
    const refreshedRow = { ref: row.ref, match: mapMatchDoc(refreshed.id, refreshed.data() || {}) };
    return calculateMatchServer(refreshedRow, candidate);
  }
  return null;
}

export async function approveTournamentProviderResult(input: { tournamentId: string; matchId: string }) {
  const ref = adminDb.collection(COLLECTIONS.matches).doc(entityId(input.tournamentId, input.matchId));
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error("المباراة غير موجودة");
  const match = mapMatchDoc(snapshot.id, snapshot.data() || {});
  const candidateRaw = snapshot.data()?.providerCandidateResult as Record<string, unknown> | undefined;
  if (!candidateRaw) throw new Error("لا توجد نتيجة مرصودة من المزود لاعتمادها");
  const candidate: ProviderCandidateResult = {
    homeScore: num(candidateRaw.homeScore), awayScore: num(candidateRaw.awayScore), qualifiedTeamId: clean(candidateRaw.qualifiedTeamId) || null,
    qualificationMethod: candidateRaw.qualificationMethod === "regular" || candidateRaw.qualificationMethod === "extra_time" || candidateRaw.qualificationMethod === "penalties" ? candidateRaw.qualificationMethod : null,
    extraTimeHomeScore: nullableNumber(candidateRaw.extraTimeHomeScore), extraTimeAwayScore: nullableNumber(candidateRaw.extraTimeAwayScore), penaltiesHomeScore: nullableNumber(candidateRaw.penaltiesHomeScore), penaltiesAwayScore: nullableNumber(candidateRaw.penaltiesAwayScore),
    scoringVersion: clean(candidateRaw.scoringVersion), hash: clean(candidateRaw.hash),
  };
  return calculateMatchServer({ ref, match }, candidate);
}

async function markConflict(ref: DocumentReference, message: string, fixture?: TournamentSportsProviderFixture) {
  await ref.set({ providerSyncState: "conflict", providerSyncMessage: message.slice(0, 300), providerStatusShort: fixture?.statusShort || null, providerLastSyncedAt: Date.now(), updatedAt: Date.now() }, { merge: true });
}

export async function syncTournamentSportsProvider(tournamentId: string, source: "admin" | "automation" = "admin") {
  const integration = await getTournamentSportsIntegration(tournamentId);
  const { config } = integration;
  if (!config.enabled) return { skipped: true, reason: "disabled", checked: 0, updated: 0, calculated: 0, conflicts: 0 };
  if (!config.leagueId) throw new Error("لم يتم اختيار League ID للبطولة");
  if (!hasApiFootballKey()) throw new Error("API_FOOTBALL_KEY_MISSING");

  const seasonState = await checkTournamentSportsSeasonAvailability(tournamentId);
  if (!seasonState.available) {
    return {
      skipped: true,
      reason: "season_not_available",
      checked: 0,
      updated: 0,
      calculated: 0,
      conflicts: 0,
      awaitingReview: 0,
      season: config.season,
      availableSeasons: seasonState.seasons,
      nextSeasonCheckAt: seasonState.nextCheckAt,
    };
  }

  const [rows, teams] = await Promise.all([loadMatches(tournamentId), loadTeams(tournamentId)]);
  const mappedRows = rows.filter(({ match }) => Boolean(match.providerFixtureId));
  if (!mappedRows.length) return { skipped: true, reason: "no_mapped_matches", checked: 0, updated: 0, calculated: 0, conflicts: 0 };
  const provider = await getApiFootballFixturesByIds(mappedRows.map(({ match }) => match.providerFixtureId || 0));
  const fixtureById = new Map(provider.fixtures.map((fixture) => [fixture.fixtureId, fixture]));
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  let updated = 0; let calculated = 0; let conflicts = 0; let awaitingReview = 0;

  for (const row of mappedRows) {
    const fixture = fixtureById.get(row.match.providerFixtureId || 0);
    if (!fixture) { await markConflict(row.ref, "المباراة المرتبطة لم ترجع من مزود البيانات"); conflicts += 1; continue; }
    if (!teamMatchesProvider(row.match, fixture, teamMap)) { await markConflict(row.ref, `فرق المزود لا تطابق المباراة المحلية: ${fixture.homeName} × ${fixture.awayName}`, fixture); conflicts += 1; continue; }

    const patch: Record<string, unknown> = {
      providerStatusShort: fixture.statusShort, providerStatusLong: fixture.statusLong, providerElapsed: fixture.elapsed, providerLastSyncedAt: Date.now(), providerFixtureSnapshot: { fixtureId: fixture.fixtureId, kickoffAt: fixture.kickoffAt, homeName: fixture.homeName, awayName: fixture.awayName, goalsHome: fixture.goalsHome, goalsAway: fixture.goalsAway, statusShort: fixture.statusShort },
      providerSyncState: row.match.calculationStatus === "calculated" ? "calculated" : "synced", providerSyncMessage: "تمت مزامنة بيانات المباراة", updatedAt: Date.now(),
    };
    if (config.syncSchedule && row.match.calculationStatus !== "calculated") {
      patch.kickoffAt = fixture.kickoffAt;
      patch.predictionClosesAt = row.match.predictionClosesAt == null || row.match.predictionClosesAt === row.match.kickoffAt ? fixture.kickoffAt : row.match.predictionClosesAt;
      if (fixture.venue) patch.stadium = fixture.venue;
      if (fixture.city) patch.city = fixture.city;
    }
    const localStatus = config.syncStatus ? mapProviderStatus(fixture.statusShort, row.match.predictionIsOpen) : null;
    if (localStatus) patch.status = localStatus;
    if (LIVE_STATUSES.has(fixture.statusShort) || FINISHED_STATUSES.has(fixture.statusShort)) patch.predictionIsOpen = false;
    await row.ref.set(patch, { merge: true }); updated += 1;

    if (FINISHED_STATUSES.has(fixture.statusShort) && config.syncResults) {
      try {
        const candidate = makeProviderCandidate(row.match, fixture);
        if (row.match.calculationStatus === "calculated") {
          if (row.match.resultHash && row.match.resultHash !== candidate.hash) { await markConflict(row.ref, "النتيجة النهائية من المزود تختلف عن النتيجة المحتسبة محليًا", fixture); conflicts += 1; }
          continue;
        }
        const result = await updateProviderCandidate(row, candidate, config.syncMode === "protected_auto");
        if (result) calculated += 1; else awaitingReview += 1;
      } catch (error) {
        await markConflict(row.ref, error instanceof Error ? error.message : "بيانات النتيجة تحتاج مراجعة", fixture); conflicts += 1;
      }
    }
  }

  const now = Date.now();
  const runRef = adminDb.collection(COLLECTIONS.syncRuns).doc(`${tournamentId}_${now}_${Math.random().toString(36).slice(2, 7)}`);
  await Promise.all([
    runRef.set({ tournamentId, provider: "api-football", source, checked: mappedRows.length, updated, calculated, conflicts, awaitingReview, quotaRemaining: provider.quotaRemaining, createdAt: now }),
    adminDb.collection(COLLECTIONS.integrations).doc(tournamentId).set({ lastSyncAt: now, lastSuccessAt: now, lastError: null, quotaRemaining: provider.quotaRemaining, updatedAt: now }, { merge: true }),
  ]);
  return { skipped: false, checked: mappedRows.length, updated, calculated, conflicts, awaitingReview, quotaRemaining: provider.quotaRemaining };
}

function desiredAutomationGap(matches: MatchRow[], now: number) {
  if (matches.some((match) => match.status === "live")) return 5 * 60 * 1000;
  const diffs = matches.map((match) => match.kickoffAt - now);
  if (diffs.some((diff) => diff >= -5 * 60 * 60 * 1000 && diff <= 3 * 60 * 60 * 1000)) return 5 * 60 * 1000;
  if (diffs.some((diff) => diff > 0 && diff <= 24 * 60 * 60 * 1000)) return 30 * 60 * 1000;
  return 6 * 60 * 60 * 1000;
}

export async function runTournamentSportsAutomation(options?: { force?: boolean }) {
  const tournamentId = GULF_CUP_27_TOURNAMENT_ID;
  const integration = await getTournamentSportsIntegration(tournamentId);
  if (!integration.config.enabled || !hasApiFootballKey()) return { skipped: true, reason: "not_configured" };

  let rows = await loadMatches(tournamentId);
  const now = Date.now();
  const gap = desiredAutomationGap(rows.map((item) => item.match), now);
  const stateRef = adminDb.collection(COLLECTIONS.automation).doc(AUTO_STATE_ID);
  const acquired = await adminDb.runTransaction(async (transaction) => {
    const state = await transaction.get(stateRef); const lastRunAt = num(state.data()?.lastRunAt);
    if (!options?.force && lastRunAt && now - lastRunAt < gap) return false;
    transaction.set(stateRef, { lastRunAt: now, gapMs: gap, updatedAt: now, source: options?.force ? "admin" : "heartbeat" }, { merge: true }); return true;
  });
  if (!acquired) return { skipped: true, reason: "throttled", nextGapMs: gap };

  const seasonState = await checkTournamentSportsSeasonAvailability(tournamentId);
  if (!seasonState.available) {
    return {
      skipped: true,
      reason: "season_not_available",
      season: integration.config.season,
      availableSeasons: seasonState.seasons,
      nextSeasonCheckAt: seasonState.nextCheckAt,
    };
  }

  const hasUnlinked = rows.some(({ match }) =>
    !match.providerFixtureId && Boolean(match.homeTeamId && match.awayTeamId),
  );
  const discoveryDue =
    !integration.config.lastDiscoveryAt ||
    now - integration.config.lastDiscoveryAt >= DISCOVERY_RETRY_INTERVAL_MS;
  if (integration.config.autoDiscover && hasUnlinked && integration.config.leagueId && discoveryDue) {
    try {
      await discoverTournamentSportsFixtures(tournamentId);
      rows = await loadMatches(tournamentId);
    } catch {
      // الربط الآلي مساعد ولا يوقف المزامنة الحالية.
    }
  }

  const mapped = rows.map((item) => item.match).filter((match) => Boolean(match.providerFixtureId));
  if (!mapped.length) return { skipped: true, reason: "no_mapped_matches" };
  try { return await syncTournamentSportsProvider(tournamentId, options?.force ? "admin" : "automation"); }
  catch (error) {
    const message = error instanceof Error ? error.message : "تعذر مزامنة Sports API";
    await adminDb.collection(COLLECTIONS.integrations).doc(tournamentId).set({ lastSyncAt: now, lastError: message.slice(0, 300), updatedAt: now }, { merge: true });
    throw error;
  }
}
