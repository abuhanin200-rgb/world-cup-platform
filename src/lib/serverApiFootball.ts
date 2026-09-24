import "server-only";
import type {
  TournamentSportsLeagueSearchResult,
  TournamentSportsProviderFixture,
} from "@/domain/tournaments";

const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";

type ApiFootballEnvelope = {
  get?: unknown;
  parameters?: unknown;
  errors?: unknown;
  results?: unknown;
  paging?: unknown;
  response?: unknown;
};

type ApiFootballRequestResult<T> = {
  data: T;
  quotaRemaining: number | null;
  quotaLimit: number | null;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function requireApiKey() {
  const key = clean(process.env.API_FOOTBALL_KEY || process.env.API_SPORTS_KEY);
  if (!key) {
    throw new Error("API_FOOTBALL_KEY_MISSING");
  }
  return key;
}

function formatApiErrors(errors: unknown) {
  if (Array.isArray(errors) && errors.length === 0) return "";
  if (errors && typeof errors === "object") {
    const values = Object.values(errors as Record<string, unknown>)
      .map((item) => clean(item))
      .filter(Boolean);
    if (values.length) return values.join(" · ");
  }
  if (Array.isArray(errors)) {
    return errors.map((item) => clean(item)).filter(Boolean).join(" · ");
  }
  return clean(errors);
}

async function apiFootballGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<ApiFootballRequestResult<T>> {
  const apiKey = requireApiKey();
  const url = new URL(path, API_FOOTBALL_BASE_URL);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value == null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-apisports-key": apiKey,
    },
    cache: "no-store",
  });

  let payload: ApiFootballEnvelope = {};
  try {
    payload = (await response.json()) as ApiFootballEnvelope;
  } catch {
    // handled below
  }

  if (!response.ok) {
    throw new Error(`API_FOOTBALL_HTTP_${response.status}`);
  }

  const apiError = formatApiErrors(payload.errors);
  if (apiError) {
    throw new Error(`API_FOOTBALL_ERROR:${apiError}`);
  }

  return {
    data: (payload.response ?? []) as T,
    quotaRemaining: numberOrNull(
      response.headers.get("x-ratelimit-requests-remaining"),
    ),
    quotaLimit: numberOrNull(response.headers.get("x-ratelimit-requests-limit")),
  };
}

export async function testApiFootballConnection() {
  const result = await apiFootballGet<unknown[]>("/countries");
  return {
    ok: true,
    provider: "api-football" as const,
    quotaRemaining: result.quotaRemaining,
    quotaLimit: result.quotaLimit,
  };
}

function mapLeagueRow(row: Record<string, unknown>): TournamentSportsLeagueSearchResult | null {
  const league = (row.league || {}) as Record<string, unknown>;
  const country = (row.country || {}) as Record<string, unknown>;
  const seasons = Array.isArray(row.seasons) ? row.seasons : [];
  const id = Number(league.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  return {
    id,
    name: clean(league.name),
    country: clean(country.name),
    type: clean(league.type),
    logo: clean(league.logo) || null,
    seasons: seasons
      .map((item) => Number((item as Record<string, unknown>)?.year))
      .filter((year) => Number.isInteger(year))
      .sort((a, b) => b - a),
  };
}

export async function getApiFootballLeagueById(leagueId: number): Promise<{
  league: TournamentSportsLeagueSearchResult | null;
  quotaRemaining: number | null;
}> {
  if (!Number.isInteger(leagueId) || leagueId <= 0) {
    throw new Error("League ID غير صحيح");
  }

  const result = await apiFootballGet<Array<Record<string, unknown>>>(
    "/leagues",
    { id: leagueId },
  );

  const league = result.data
    .map(mapLeagueRow)
    .find((item): item is TournamentSportsLeagueSearchResult => Boolean(item)) ?? null;

  return { league, quotaRemaining: result.quotaRemaining };
}

export async function searchApiFootballLeagues(
  search: string,
): Promise<{
  leagues: TournamentSportsLeagueSearchResult[];
  quotaRemaining: number | null;
}> {
  const query = clean(search);
  if (query.length < 3) {
    throw new Error("اكتب 3 أحرف على الأقل للبحث عن البطولة");
  }

  const result = await apiFootballGet<Array<Record<string, unknown>>>(
    "/leagues",
    { search: query },
  );

  const leagues = result.data
    .map(mapLeagueRow)
    .filter((item): item is TournamentSportsLeagueSearchResult => Boolean(item));

  return { leagues, quotaRemaining: result.quotaRemaining };
}

function mapFixture(row: Record<string, unknown>): TournamentSportsProviderFixture | null {
  const fixture = (row.fixture || {}) as Record<string, unknown>;
  const league = (row.league || {}) as Record<string, unknown>;
  const teams = (row.teams || {}) as Record<string, unknown>;
  const home = (teams.home || {}) as Record<string, unknown>;
  const away = (teams.away || {}) as Record<string, unknown>;
  const goals = (row.goals || {}) as Record<string, unknown>;
  const score = (row.score || {}) as Record<string, unknown>;
  const fulltime = (score.fulltime || {}) as Record<string, unknown>;
  const extratime = (score.extratime || {}) as Record<string, unknown>;
  const penalty = (score.penalty || {}) as Record<string, unknown>;
  const venue = (fixture.venue || {}) as Record<string, unknown>;
  const status = (fixture.status || {}) as Record<string, unknown>;

  const fixtureId = Number(fixture.id);
  const leagueId = Number(league.id);
  const season = Number(league.season);
  const timestampSeconds = Number(fixture.timestamp);
  if (!Number.isInteger(fixtureId) || fixtureId <= 0 || !Number.isFinite(timestampSeconds)) {
    return null;
  }

  return {
    fixtureId,
    leagueId: Number.isInteger(leagueId) ? leagueId : 0,
    season: Number.isInteger(season) ? season : 0,
    round: clean(league.round),
    kickoffAt: timestampSeconds * 1000,
    venue: clean(venue.name),
    city: clean(venue.city),
    statusShort: clean(status.short),
    statusLong: clean(status.long),
    elapsed: numberOrNull(status.elapsed),
    homeProviderTeamId: Number(home.id) || 0,
    homeName: clean(home.name),
    awayProviderTeamId: Number(away.id) || 0,
    awayName: clean(away.name),
    goalsHome: numberOrNull(goals.home),
    goalsAway: numberOrNull(goals.away),
    fulltimeHome: numberOrNull(fulltime.home),
    fulltimeAway: numberOrNull(fulltime.away),
    extraTimeHome: numberOrNull(extratime.home),
    extraTimeAway: numberOrNull(extratime.away),
    penaltiesHome: numberOrNull(penalty.home),
    penaltiesAway: numberOrNull(penalty.away),
  };
}

export async function getApiFootballFixturesByCompetition(input: {
  leagueId: number;
  season: number;
  from: string;
  to: string;
}) {
  const result = await apiFootballGet<Array<Record<string, unknown>>>(
    "/fixtures",
    {
      league: input.leagueId,
      season: input.season,
      from: input.from,
      to: input.to,
    },
  );

  return {
    fixtures: result.data
      .map(mapFixture)
      .filter((item): item is TournamentSportsProviderFixture => Boolean(item)),
    quotaRemaining: result.quotaRemaining,
  };
}

export async function getApiFootballFixturesByIds(ids: number[]) {
  const uniqueIds = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
  const fixtures: TournamentSportsProviderFixture[] = [];
  let quotaRemaining: number | null = null;

  for (let index = 0; index < uniqueIds.length; index += 20) {
    const chunk = uniqueIds.slice(index, index + 20);
    if (!chunk.length) continue;
    const result = await apiFootballGet<Array<Record<string, unknown>>>(
      "/fixtures",
      { ids: chunk.join("-") },
    );
    fixtures.push(
      ...result.data
        .map(mapFixture)
        .filter((item): item is TournamentSportsProviderFixture => Boolean(item)),
    );
    quotaRemaining = result.quotaRemaining;
  }

  return { fixtures, quotaRemaining };
}

export function hasApiFootballKey() {
  return Boolean(clean(process.env.API_FOOTBALL_KEY || process.env.API_SPORTS_KEY));
}

export type ApiFootballHeadToHeadFixture = {
  fixtureId: number;
  kickoffAt: number;
  leagueName: string;
  leagueCountry: string;
  statusShort: string;
  homeTeamId: number;
  homeName: string;
  homeLogo: string | null;
  awayTeamId: number;
  awayName: string;
  awayLogo: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
};

export type ApiFootballFixturePrediction = {
  fixtureId: number;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  winnerTeamId: number | null;
  winnerName: string | null;
  winnerComment: string | null;
  advice: string | null;
  underOver: string | null;
  predictedGoalsHome: string | null;
  predictedGoalsAway: string | null;
  percentages: {
    home: number | null;
    draw: number | null;
    away: number | null;
  };
  comparison: {
    formHome: number | null;
    formAway: number | null;
    attackHome: number | null;
    attackAway: number | null;
    defenceHome: number | null;
    defenceAway: number | null;
    poissonHome: number | null;
    poissonAway: number | null;
    h2hHome: number | null;
    h2hAway: number | null;
    goalsHome: number | null;
    goalsAway: number | null;
    totalHome: number | null;
    totalAway: number | null;
  };
};

function percentNumber(value: unknown): number | null {
  const text = clean(value).replace("%", "");
  if (!text) return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, parsed));
}

function mapHeadToHeadFixture(row: Record<string, unknown>): ApiFootballHeadToHeadFixture | null {
  const fixture = (row.fixture || {}) as Record<string, unknown>;
  const league = (row.league || {}) as Record<string, unknown>;
  const teams = (row.teams || {}) as Record<string, unknown>;
  const home = (teams.home || {}) as Record<string, unknown>;
  const away = (teams.away || {}) as Record<string, unknown>;
  const goals = (row.goals || {}) as Record<string, unknown>;
  const status = (fixture.status || {}) as Record<string, unknown>;

  const fixtureId = Number(fixture.id);
  const timestampSeconds = Number(fixture.timestamp);
  const homeTeamId = Number(home.id);
  const awayTeamId = Number(away.id);
  if (
    !Number.isInteger(fixtureId) ||
    fixtureId <= 0 ||
    !Number.isFinite(timestampSeconds) ||
    !Number.isInteger(homeTeamId) ||
    !Number.isInteger(awayTeamId)
  ) {
    return null;
  }

  return {
    fixtureId,
    kickoffAt: timestampSeconds * 1000,
    leagueName: clean(league.name),
    leagueCountry: clean(league.country),
    statusShort: clean(status.short),
    homeTeamId,
    homeName: clean(home.name),
    homeLogo: clean(home.logo) || null,
    awayTeamId,
    awayName: clean(away.name),
    awayLogo: clean(away.logo) || null,
    homeGoals: numberOrNull(goals.home),
    awayGoals: numberOrNull(goals.away),
  };
}

export async function getApiFootballHeadToHead(input: {
  homeTeamId: number;
  awayTeamId: number;
}) {
  if (
    !Number.isInteger(input.homeTeamId) ||
    input.homeTeamId <= 0 ||
    !Number.isInteger(input.awayTeamId) ||
    input.awayTeamId <= 0
  ) {
    throw new Error("معرّفات الفريقين لدى مزود البيانات غير صحيحة");
  }

  const result = await apiFootballGet<Array<Record<string, unknown>>>(
    "/fixtures/headtohead",
    { h2h: `${input.homeTeamId}-${input.awayTeamId}` },
  );

  return {
    fixtures: result.data
      .map(mapHeadToHeadFixture)
      .filter((item): item is ApiFootballHeadToHeadFixture => Boolean(item))
      .sort((a, b) => b.kickoffAt - a.kickoffAt),
    quotaRemaining: result.quotaRemaining,
  };
}

export async function getApiFootballPredictionByFixture(
  fixtureId: number,
): Promise<{
  prediction: ApiFootballFixturePrediction | null;
  quotaRemaining: number | null;
}> {
  if (!Number.isInteger(fixtureId) || fixtureId <= 0) {
    throw new Error("Fixture ID غير صحيح");
  }

  const result = await apiFootballGet<Array<Record<string, unknown>>>(
    "/predictions",
    { fixture: fixtureId },
  );
  const row = result.data[0];
  if (!row) {
    return { prediction: null, quotaRemaining: result.quotaRemaining };
  }

  const predictions = (row.predictions || {}) as Record<string, unknown>;
  const winner = (predictions.winner || {}) as Record<string, unknown>;
  const goals = (predictions.goals || {}) as Record<string, unknown>;
  const percent = (predictions.percent || {}) as Record<string, unknown>;
  const teams = (row.teams || {}) as Record<string, unknown>;
  const home = (teams.home || {}) as Record<string, unknown>;
  const away = (teams.away || {}) as Record<string, unknown>;
  const comparison = (row.comparison || {}) as Record<string, unknown>;
  const form = (comparison.form || {}) as Record<string, unknown>;
  const attack = (comparison.att || {}) as Record<string, unknown>;
  const defence = (comparison.def || {}) as Record<string, unknown>;
  const poisson = (comparison.poisson_distribution || {}) as Record<string, unknown>;
  const h2h = (comparison.h2h || {}) as Record<string, unknown>;
  const comparisonGoals = (comparison.goals || {}) as Record<string, unknown>;
  const total = (comparison.total || {}) as Record<string, unknown>;

  const homeTeamId = Number(home.id);
  const awayTeamId = Number(away.id);
  if (!Number.isInteger(homeTeamId) || !Number.isInteger(awayTeamId)) {
    return { prediction: null, quotaRemaining: result.quotaRemaining };
  }

  const winnerId = Number(winner.id);
  return {
    prediction: {
      fixtureId,
      homeTeamId,
      homeTeamName: clean(home.name),
      awayTeamId,
      awayTeamName: clean(away.name),
      winnerTeamId: Number.isInteger(winnerId) && winnerId > 0 ? winnerId : null,
      winnerName: clean(winner.name) || null,
      winnerComment: clean(winner.comment) || null,
      advice: clean(predictions.advice) || null,
      underOver: clean(predictions.under_over) || null,
      predictedGoalsHome: clean(goals.home) || null,
      predictedGoalsAway: clean(goals.away) || null,
      percentages: {
        home: percentNumber(percent.home),
        draw: percentNumber(percent.draw),
        away: percentNumber(percent.away),
      },
      comparison: {
        formHome: percentNumber(form.home),
        formAway: percentNumber(form.away),
        attackHome: percentNumber(attack.home),
        attackAway: percentNumber(attack.away),
        defenceHome: percentNumber(defence.home),
        defenceAway: percentNumber(defence.away),
        poissonHome: percentNumber(poisson.home),
        poissonAway: percentNumber(poisson.away),
        h2hHome: percentNumber(h2h.home),
        h2hAway: percentNumber(h2h.away),
        goalsHome: percentNumber(comparisonGoals.home),
        goalsAway: percentNumber(comparisonGoals.away),
        totalHome: percentNumber(total.home),
        totalAway: percentNumber(total.away),
      },
    },
    quotaRemaining: result.quotaRemaining,
  };
}

export type ApiFootballTeamLookup = {
  id: number;
  name: string;
  code: string;
  country: string;
  national: boolean;
  logo: string | null;
};

function normalizeTeamLookupName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function findApiFootballTeamByName(
  teamName: string,
): Promise<{
  team: ApiFootballTeamLookup | null;
  quotaRemaining: number | null;
}> {
  const query = clean(teamName);
  if (query.length < 2) throw new Error("اسم المنتخب قصير جدًا");

  const result = await apiFootballGet<Array<Record<string, unknown>>>(
    "/teams",
    { search: query },
  );
  const candidates = result.data
    .map((row) => {
      const team = (row.team || {}) as Record<string, unknown>;
      const id = Number(team.id);
      if (!Number.isInteger(id) || id <= 0) return null;
      return {
        id,
        name: clean(team.name),
        code: clean(team.code),
        country: clean(team.country),
        national: team.national === true,
        logo: clean(team.logo) || null,
      } satisfies ApiFootballTeamLookup;
    })
    .filter((team): team is ApiFootballTeamLookup => Boolean(team));

  const normalizedQuery = normalizeTeamLookupName(query);
  const exact = candidates.find(
    (team) => normalizeTeamLookupName(team.name) === normalizedQuery,
  );
  const national = candidates.find((team) => team.national);

  return {
    team: exact || national || candidates[0] || null,
    quotaRemaining: result.quotaRemaining,
  };
}
