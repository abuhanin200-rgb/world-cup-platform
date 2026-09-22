import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  GULF_CUP_27_MATCHES,
  GULF_CUP_27_TEAMS,
  GULF_CUP_27_TOURNAMENT_ID,
  TOURNAMENT_PREDICTION_OPEN_LEAD_MS,
} from "@/domain/tournaments";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function num(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

export async function getGulfCup27HealthServer() {
  const tournamentId = GULF_CUP_27_TOURNAMENT_ID;
  const [tournamentSnap, teamsSnap, matchesSnap, predictionsSnap, statsSnap, achievementsSnap, integrationSnap] =
    await Promise.all([
      adminDb.collection("tournaments").doc(tournamentId).get(),
      adminDb.collection("tournamentTeams").where("tournamentId", "==", tournamentId).get(),
      adminDb.collection("tournamentMatches").where("tournamentId", "==", tournamentId).get(),
      adminDb.collection("tournamentPredictions").where("tournamentId", "==", tournamentId).get(),
      adminDb.collection("tournamentUserStats").where("tournamentId", "==", tournamentId).get(),
      adminDb.collection("tournamentAchievements").where("tournamentId", "==", tournamentId).get(),
      adminDb.collection("tournamentIntegrations").doc(tournamentId).get(),
    ]);

  const teamIds = new Set(teamsSnap.docs.map((doc) => clean(doc.data().id) || doc.id.replace(`${tournamentId}_`, "")));
  const expectedTeamIds = new Set(GULF_CUP_27_TEAMS.map((team) => team.id));
  const teamsComplete =
    teamIds.size === expectedTeamIds.size && [...expectedTeamIds].every((id) => teamIds.has(id));

  const matchRows = matchesSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: clean(data.id) || doc.id.replace(`${tournamentId}_`, ""),
      stage: clean(data.stage),
      kickoffAt: num(data.kickoffAt),
      predictionOpensAt: data.predictionOpensAt == null ? null : num(data.predictionOpensAt),
      predictionClosesAt: data.predictionClosesAt == null ? null : num(data.predictionClosesAt),
      predictionManualOverride:
        data.predictionManualOverride === "open" || data.predictionManualOverride === "closed"
          ? data.predictionManualOverride
          : null,
      providerFixtureId: data.providerFixtureId == null ? null : num(data.providerFixtureId),
      providerSyncState: clean(data.providerSyncState),
      status: clean(data.status),
      calculationStatus: clean(data.calculationStatus),
    };
  });
  const matchIds = matchRows.map((row) => row.id);
  const duplicateMatchIds = [...new Set(matchIds.filter((id, index) => matchIds.indexOf(id) !== index))];
  const expectedMatchIds = new Set(GULF_CUP_27_MATCHES.map((match) => match.id));
  const matchesComplete =
    matchRows.length === expectedMatchIds.size &&
    duplicateMatchIds.length === 0 &&
    [...expectedMatchIds].every((id) => matchIds.includes(id));

  const windowIssues = matchRows
    .filter((match) => {
      if (!match.kickoffAt || match.predictionOpensAt == null || match.predictionClosesAt == null) return true;
      return (
        match.kickoffAt - match.predictionOpensAt !== TOURNAMENT_PREDICTION_OPEN_LEAD_MS ||
        match.predictionClosesAt !== match.kickoffAt
      );
    })
    .map((match) => match.id);

  const predictionKeys = predictionsSnap.docs.map((doc) => {
    const data = doc.data();
    return `${clean(data.userId)}::${clean(data.matchId)}`;
  });
  const duplicatePredictionKeys = [
    ...new Set(predictionKeys.filter((key, index) => key !== "::" && predictionKeys.indexOf(key) !== index)),
  ];

  const integration = (integrationSnap.exists ? integrationSnap.data() || {} : {}) as Record<string, unknown>;
  const linkedFixtures = matchRows.filter((row) => Boolean(row.providerFixtureId)).length;
  const conflicts = matchRows.filter((row) => row.providerSyncState === "conflict").length;
  const now = Date.now();
  const nextMatch = matchRows
    .filter((row) => row.kickoffAt > now)
    .sort((a, b) => a.kickoffAt - b.kickoffAt)[0] ?? null;

  const checks = {
    database: tournamentSnap.exists,
    tournamentInitialized: tournamentSnap.exists && teamsComplete && matchesComplete,
    teams: teamsComplete,
    fixtures: matchesComplete && duplicateMatchIds.length === 0,
    predictions: duplicatePredictionKeys.length === 0 && windowIssues.length === 0,
    scoring: matchRows.every((row) => row.calculationStatus !== "error"),
    sportsApi:
      integrationSnap.exists &&
      integration.enabled === true &&
      num(integration.leagueId) > 0 &&
      clean(integration.providerLeagueName).toLowerCase().includes("gulf") &&
      !clean(integration.providerLeagueName).toLowerCase().includes("u23"),
    notifications: Boolean(process.env.CRON_SECRET),
  };

  return {
    tournamentId,
    source: "firestore" as const,
    fallbackUsed: false,
    checkedAt: now,
    checks,
    counts: {
      teams: teamsSnap.size,
      matches: matchesSnap.size,
      groupMatches: matchRows.filter((row) => row.stage === "group").length,
      knockoutMatches: matchRows.filter((row) => row.stage === "knockout").length,
      predictions: predictionsSnap.size,
      userStats: statsSnap.size,
      achievements: achievementsSnap.size,
      linkedFixtures,
      unlinkedFixtures: Math.max(0, matchRows.length - linkedFixtures),
      conflicts,
      calculated: matchRows.filter((row) => row.calculationStatus === "calculated").length,
    },
    sports: {
      configured: integrationSnap.exists,
      enabled: integration.enabled === true,
      leagueId: integration.leagueId == null ? null : num(integration.leagueId),
      leagueName: clean(integration.providerLeagueName) || null,
      season: integration.season == null ? null : num(integration.season),
      seasonAvailability: clean(integration.seasonAvailability) || "unknown",
      lastSyncAt: integration.lastSyncAt == null ? null : num(integration.lastSyncAt),
      lastSuccessAt: integration.lastSuccessAt == null ? null : num(integration.lastSuccessAt),
      lastError: clean(integration.lastError) || null,
    },
    nextMatch,
    issues: {
      duplicateMatchIds,
      duplicatePredictionKeys,
      predictionWindowMatchIds: windowIssues,
      missingTeamIds: [...expectedTeamIds].filter((id) => !teamIds.has(id)),
      missingMatchIds: [...expectedMatchIds].filter((id) => !matchIds.includes(id)),
    },
  };
}
