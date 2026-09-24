import "server-only";

import { adminDb } from "@/lib/firebaseAdmin";
import {
  findApiFootballTeamByName,
  getApiFootballFixturesByIds,
  getApiFootballHeadToHead,
  getApiFootballPredictionByFixture,
  getApiFootballRecentTeamFixtures,
  type ApiFootballFixturePrediction,
  type ApiFootballHeadToHeadFixture,
} from "@/lib/serverApiFootball";

const CACHE_COLLECTION = "tournamentMatchInsightsCache";
const CACHE_TTL_UPCOMING_MS = 6 * 60 * 60 * 1000;
const CACHE_TTL_FINISHED_MS = 30 * 24 * 60 * 60 * 1000;
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN", "AWD", "WO"]);
const INSIGHTS_SCHEMA_VERSION = 3;

type MatchInsightMeeting = {
  fixtureId: number;
  kickoffAt: number;
  competition: string;
  country: string;
  homeTeamId: number;
  homeName: string;
  awayTeamId: number;
  awayName: string;
  homeGoals: number;
  awayGoals: number;
};

type RecentTeamMetrics = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  averageGoalsFor: number;
  averageGoalsAgainst: number;
  cleanSheets: number;
  cleanSheetRate: number;
  formScore: number;
};

export type TournamentMatchInsights = {
  tournamentId: string;
  matchId: string;
  providerFixtureId: number;
  fetchedAt: number;
  expiresAt: number;
  provider: "api-football";
  schemaVersion: number;
  providerHomeTeamId: number;
  providerAwayTeamId: number;
  providerHomeName: string;
  providerAwayName: string;
  summary: {
    total: number;
    homeWins: number;
    draws: number;
    awayWins: number;
    homeGoals: number;
    awayGoals: number;
    averageGoals: number;
  };
  historicalShares: {
    home: number;
    draw: number;
    away: number;
  } | null;
  probabilities: {
    source: "api_prediction" | "head_to_head_history";
    home: number;
    draw: number;
    away: number;
  } | null;
  prediction: {
    available: boolean;
    predictedWinnerTeamId: number | null;
    predictedWinnerName: string | null;
    predictedGoalsHome: string | null;
    predictedGoalsAway: string | null;
    underOver: string | null;
    comparison: ApiFootballFixturePrediction["comparison"] | null;
  };
  recent: {
    home: Array<"W" | "D" | "L">;
    away: Array<"W" | "D" | "L">;
  };
  recentTeams: {
    home: RecentTeamMetrics | null;
    away: RecentTeamMetrics | null;
  };
  meetings: MatchInsightMeeting[];
  warnings: string[];
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function cacheDocId(tournamentId: string, matchId: string) {
  return `${tournamentId}_${matchId}`;
}

function normalizePercentages(input: {
  home: number | null;
  draw: number | null;
  away: number | null;
}) {
  if (input.home == null || input.draw == null || input.away == null) return null;
  const sum = input.home + input.draw + input.away;
  if (sum <= 0) return null;
  return {
    home: Math.round((input.home / sum) * 100),
    draw: Math.round((input.draw / sum) * 100),
    away: Math.max(
      0,
      100 -
        Math.round((input.home / sum) * 100) -
        Math.round((input.draw / sum) * 100),
    ),
  };
}

function toHistoricalMeeting(row: ApiFootballHeadToHeadFixture): MatchInsightMeeting | null {
  if (
    !FINISHED_STATUSES.has(row.statusShort) ||
    row.homeGoals == null ||
    row.awayGoals == null
  ) {
    return null;
  }
  return {
    fixtureId: row.fixtureId,
    kickoffAt: row.kickoffAt,
    competition: row.leagueName,
    country: row.leagueCountry,
    homeTeamId: row.homeTeamId,
    homeName: row.homeName,
    awayTeamId: row.awayTeamId,
    awayName: row.awayName,
    homeGoals: row.homeGoals,
    awayGoals: row.awayGoals,
  };
}

function resultForTeam(
  meeting: MatchInsightMeeting,
  teamId: number,
): "W" | "D" | "L" | null {
  if (meeting.homeGoals === meeting.awayGoals) return "D";
  if (meeting.homeTeamId === teamId) {
    return meeting.homeGoals > meeting.awayGoals ? "W" : "L";
  }
  if (meeting.awayTeamId === teamId) {
    return meeting.awayGoals > meeting.homeGoals ? "W" : "L";
  }
  return null;
}

function summarizeMeetings(
  meetings: MatchInsightMeeting[],
  providerHomeTeamId: number,
  providerAwayTeamId: number,
) {
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let homeGoals = 0;
  let awayGoals = 0;

  for (const meeting of meetings) {
    const homeIsCurrentHome = meeting.homeTeamId === providerHomeTeamId;
    const awayIsCurrentHome = meeting.awayTeamId === providerHomeTeamId;
    if (!homeIsCurrentHome && !awayIsCurrentHome) continue;

    const currentHomeGoals = homeIsCurrentHome ? meeting.homeGoals : meeting.awayGoals;
    const currentAwayGoals = homeIsCurrentHome ? meeting.awayGoals : meeting.homeGoals;
    homeGoals += currentHomeGoals;
    awayGoals += currentAwayGoals;

    if (currentHomeGoals === currentAwayGoals) draws += 1;
    else if (currentHomeGoals > currentAwayGoals) homeWins += 1;
    else awayWins += 1;
  }

  const total = homeWins + draws + awayWins;
  return {
    summary: {
      total,
      homeWins,
      draws,
      awayWins,
      homeGoals,
      awayGoals,
      averageGoals: total > 0 ? Number(((homeGoals + awayGoals) / total).toFixed(2)) : 0,
    },
    historicalShares:
      total > 0
        ? {
            home: Math.round((homeWins / total) * 100),
            draw: Math.round((draws / total) * 100),
            away: Math.max(
              0,
              100 -
                Math.round((homeWins / total) * 100) -
                Math.round((draws / total) * 100),
            ),
          }
        : null,
    recent: {
      home: meetings
        .slice(0, 5)
        .map((meeting) => resultForTeam(meeting, providerHomeTeamId))
        .filter((value): value is "W" | "D" | "L" => Boolean(value)),
      away: meetings
        .slice(0, 5)
        .map((meeting) => resultForTeam(meeting, providerAwayTeamId))
        .filter((value): value is "W" | "D" | "L" => Boolean(value)),
    },
  };
}


function normalizeTeamName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sameTeamName(a: string, b: string) {
  const left = normalizeTeamName(a);
  const right = normalizeTeamName(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function orientPredictionComparison(
  comparison: ApiFootballFixturePrediction["comparison"] | null | undefined,
  reversed: boolean,
): ApiFootballFixturePrediction["comparison"] | null {
  if (!comparison) return null;
  if (!reversed) return comparison;
  return {
    formHome: comparison.formAway,
    formAway: comparison.formHome,
    attackHome: comparison.attackAway,
    attackAway: comparison.attackHome,
    defenceHome: comparison.defenceAway,
    defenceAway: comparison.defenceHome,
    poissonHome: comparison.poissonAway,
    poissonAway: comparison.poissonHome,
    h2hHome: comparison.h2hAway,
    h2hAway: comparison.h2hHome,
    goalsHome: comparison.goalsAway,
    goalsAway: comparison.goalsHome,
    totalHome: comparison.totalAway,
    totalAway: comparison.totalHome,
  };
}

function summarizeRecentTeamFixtures(
  rows: ApiFootballHeadToHeadFixture[],
  teamId: number,
): RecentTeamMetrics | null {
  const finished = rows
    .filter((row) => FINISHED_STATUSES.has(row.statusShort))
    .filter((row) => row.homeGoals != null && row.awayGoals != null)
    .filter((row) => row.homeTeamId === teamId || row.awayTeamId === teamId)
    .slice(0, 5);

  if (!finished.length) return null;

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let cleanSheets = 0;

  for (const row of finished) {
    const isHome = row.homeTeamId === teamId;
    const scored = isHome ? Number(row.homeGoals) : Number(row.awayGoals);
    const conceded = isHome ? Number(row.awayGoals) : Number(row.homeGoals);
    goalsFor += scored;
    goalsAgainst += conceded;
    if (conceded === 0) cleanSheets += 1;
    if (scored > conceded) wins += 1;
    else if (scored === conceded) draws += 1;
    else losses += 1;
  }

  const played = finished.length;
  const points = wins * 3 + draws;
  return {
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    averageGoalsFor: Number((goalsFor / played).toFixed(2)),
    averageGoalsAgainst: Number((goalsAgainst / played).toFixed(2)),
    cleanSheets,
    cleanSheetRate: Math.round((cleanSheets / played) * 100),
    formScore: Math.round((points / (played * 3)) * 100),
  };
}

async function getCached(tournamentId: string, matchId: string) {
  const snapshot = await adminDb
    .collection(CACHE_COLLECTION)
    .doc(cacheDocId(tournamentId, matchId))
    .get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() as TournamentMatchInsights | undefined;
  if (
    !data ||
    data.schemaVersion !== INSIGHTS_SCHEMA_VERSION ||
    numberOrNull(data.expiresAt) == null ||
    data.expiresAt <= Date.now()
  ) {
    return null;
  }
  return data;
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
    status: clean(data.status),
    homeTeamId: clean(data.homeTeamId),
    awayTeamId: clean(data.awayTeamId),
  };
}

async function loadLocalTeam(tournamentId: string, teamId: string) {
  const snapshot = await adminDb
    .collection("tournamentTeams")
    .doc(cacheDocId(tournamentId, teamId))
    .get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  return {
    id: teamId,
    nameEn: clean(data.nameEn),
    nameAr: clean(data.nameAr),
    code: clean(data.code),
  };
}

export async function getTournamentMatchInsights(input: {
  tournamentId: string;
  matchId: string;
  force?: boolean;
}): Promise<TournamentMatchInsights> {
  const match = await loadMatch(input.tournamentId, input.matchId);
  if (!match.homeTeamId || !match.awayTeamId) throw new Error("TEAMS_PENDING");

  if (!input.force) {
    const cached = await getCached(input.tournamentId, input.matchId);
    if (cached && cached.providerFixtureId === (match.providerFixtureId || 0)) return cached;
  }

  const warnings: string[] = [];
  const [localHome, localAway] = await Promise.all([
    loadLocalTeam(input.tournamentId, match.homeTeamId),
    loadLocalTeam(input.tournamentId, match.awayTeamId),
  ]);

  const fixtureResult = match.providerFixtureId
    ? await Promise.allSettled([
        getApiFootballFixturesByIds([match.providerFixtureId]),
        getApiFootballPredictionByFixture(match.providerFixtureId),
      ])
    : null;

  const providerFixture =
    fixtureResult?.[0]?.status === "fulfilled"
      ? fixtureResult[0].value.fixtures.find(
          (fixture) => fixture.fixtureId === match.providerFixtureId,
        ) || null
      : null;
  const providerPrediction =
    fixtureResult?.[1]?.status === "fulfilled"
      ? fixtureResult[1].value.prediction
      : null;

  if (match.providerFixtureId && fixtureResult?.[0]?.status === "rejected") {
    warnings.push("تعذر تحميل تفاصيل المباراة من مزود البيانات.");
  }
  if (match.providerFixtureId && fixtureResult?.[1]?.status === "rejected") {
    warnings.push("الاحتمالات الذكية غير متاحة حاليًا من مزود البيانات.");
  }

  let providerHomeTeamId =
    providerFixture?.homeProviderTeamId || providerPrediction?.homeTeamId || 0;
  let providerAwayTeamId =
    providerFixture?.awayProviderTeamId || providerPrediction?.awayTeamId || 0;
  let providerHomeName =
    providerFixture?.homeName || providerPrediction?.homeTeamName || "";
  let providerAwayName =
    providerFixture?.awayName || providerPrediction?.awayTeamName || "";

  if (!providerHomeTeamId || !providerAwayTeamId) {
    const [homeLookup, awayLookup] = await Promise.allSettled([
      findApiFootballTeamByName(localHome?.nameEn || localHome?.nameAr || match.homeTeamId),
      findApiFootballTeamByName(localAway?.nameEn || localAway?.nameAr || match.awayTeamId),
    ]);
    if (homeLookup.status === "fulfilled" && homeLookup.value.team) {
      providerHomeTeamId = homeLookup.value.team.id;
      providerHomeName = homeLookup.value.team.name;
    }
    if (awayLookup.status === "fulfilled" && awayLookup.value.team) {
      providerAwayTeamId = awayLookup.value.team.id;
      providerAwayName = awayLookup.value.team.name;
    }
    if (!match.providerFixtureId) {
      warnings.push("المباراة غير مربوطة بعد بـ Fixture ID؛ لذلك يعرض النظام سجل المواجهات والتقدير التاريخي فقط.");
    }
  }

  if (!providerHomeTeamId || !providerAwayTeamId) {
    throw new Error("PROVIDER_TEAMS_UNAVAILABLE");
  }

  // API-FOOTBALL may return the same two teams in an orientation that differs
  // from our local match card. Align all statistics to the local home/away order
  // before calculating wins, probabilities or comparison metrics.
  const localHomeName = localHome?.nameEn || localHome?.nameAr || "";
  const localAwayName = localAway?.nameEn || localAway?.nameAr || "";
  const providerLooksReversed =
    Boolean(localHomeName && localAwayName) &&
    sameTeamName(providerAwayName, localHomeName) &&
    sameTeamName(providerHomeName, localAwayName);

  if (providerLooksReversed) {
    [providerHomeTeamId, providerAwayTeamId] = [providerAwayTeamId, providerHomeTeamId];
    [providerHomeName, providerAwayName] = [providerAwayName, providerHomeName];
  }

  const predictionIsReversed = Boolean(
    providerPrediction &&
      providerPrediction.homeTeamId === providerAwayTeamId &&
      providerPrediction.awayTeamId === providerHomeTeamId,
  );

  let historicalRows: ApiFootballHeadToHeadFixture[] = [];
  try {
    const h2h = await getApiFootballHeadToHead({
      homeTeamId: providerHomeTeamId,
      awayTeamId: providerAwayTeamId,
    });
    historicalRows = h2h.fixtures;
  } catch {
    warnings.push("تعذر تحميل سجل المواجهات السابقة حاليًا.");
  }

  const meetings = historicalRows
    .filter((row) => row.fixtureId !== match.providerFixtureId)
    .map(toHistoricalMeeting)
    .filter((row): row is MatchInsightMeeting => Boolean(row));

  const { summary, historicalShares, recent } = summarizeMeetings(
    meetings,
    providerHomeTeamId,
    providerAwayTeamId,
  );

  const rawProviderProbabilities = providerPrediction
    ? normalizePercentages(providerPrediction.percentages)
    : null;
  const providerProbabilities = rawProviderProbabilities
    ? predictionIsReversed
      ? {
          home: rawProviderProbabilities.away,
          draw: rawProviderProbabilities.draw,
          away: rawProviderProbabilities.home,
        }
      : rawProviderProbabilities
    : null;

  const probabilities = providerProbabilities
    ? { source: "api_prediction" as const, ...providerProbabilities }
    : historicalShares
      ? { source: "head_to_head_history" as const, ...historicalShares }
      : null;

  if (!providerProbabilities && historicalShares) {
    warnings.push("الاحتمالات المعروضة مبنية على نتائج المواجهات السابقة فقط وليست نموذج التنبؤ الكامل.");
  }

  // Current form must come from each national team's own recent matches, not
  // from the prediction comparison block, which can legitimately return 0%
  // when a competition has insufficient season data.
  const recentTeamsSettled = await Promise.allSettled([
    getApiFootballRecentTeamFixtures({ teamId: providerHomeTeamId, last: 10 }),
    getApiFootballRecentTeamFixtures({ teamId: providerAwayTeamId, last: 10 }),
  ]);

  const recentHomeRows =
    recentTeamsSettled[0].status === "fulfilled"
      ? recentTeamsSettled[0].value.fixtures
      : [];
  const recentAwayRows =
    recentTeamsSettled[1].status === "fulfilled"
      ? recentTeamsSettled[1].value.fixtures
      : [];

  const recentTeams = {
    home: summarizeRecentTeamFixtures(
      recentHomeRows.filter((row) => row.fixtureId !== match.providerFixtureId),
      providerHomeTeamId,
    ),
    away: summarizeRecentTeamFixtures(
      recentAwayRows.filter((row) => row.fixtureId !== match.providerFixtureId),
      providerAwayTeamId,
    ),
  };

  if (recentTeamsSettled[0].status === "rejected" || recentTeamsSettled[1].status === "rejected") {
    warnings.push("تعذر تحميل بعض بيانات آخر 5 مباريات؛ تم إخفاء المؤشرات غير المكتملة بدل عرض أصفار مضللة.");
  }

  const orientedComparison = orientPredictionComparison(
    providerPrediction?.comparison,
    predictionIsReversed,
  );

  const now = Date.now();
  const isFinished =
    match.status === "finished" ||
    (match.kickoffAt > 0 && now > match.kickoffAt + 6 * 60 * 60 * 1000);

  const result: TournamentMatchInsights = {
    tournamentId: input.tournamentId,
    matchId: input.matchId,
    providerFixtureId: match.providerFixtureId || 0,
    fetchedAt: now,
    expiresAt: now + (isFinished ? CACHE_TTL_FINISHED_MS : CACHE_TTL_UPCOMING_MS),
    provider: "api-football",
    schemaVersion: INSIGHTS_SCHEMA_VERSION,
    providerHomeTeamId,
    providerAwayTeamId,
    providerHomeName,
    providerAwayName,
    summary,
    historicalShares,
    probabilities,
    prediction: {
      available: Boolean(providerProbabilities),
      predictedWinnerTeamId: providerPrediction?.winnerTeamId ?? null,
      predictedWinnerName: providerPrediction?.winnerName ?? null,
      predictedGoalsHome: predictionIsReversed
        ? providerPrediction?.predictedGoalsAway ?? null
        : providerPrediction?.predictedGoalsHome ?? null,
      predictedGoalsAway: predictionIsReversed
        ? providerPrediction?.predictedGoalsHome ?? null
        : providerPrediction?.predictedGoalsAway ?? null,
      underOver: providerPrediction?.underOver ?? null,
      comparison: orientedComparison,
    },
    recent,
    recentTeams,
    meetings,
    warnings,
  };

  await adminDb
    .collection(CACHE_COLLECTION)
    .doc(cacheDocId(input.tournamentId, input.matchId))
    .set(result, { merge: false });

  return result;
}
