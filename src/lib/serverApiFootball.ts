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
