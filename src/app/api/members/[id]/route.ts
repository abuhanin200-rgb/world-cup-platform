import { NextResponse } from "next/server";
import {
  decodeFields,
  documentId,
  getDocument,
  queryCollectionByField,
  type FirestoreDocument,
} from "@/lib/serverFirebaseRest";
import { getRegisteredTournaments } from "@/domain/tournaments/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function text(value: unknown) {
  return String(value || "").trim();
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dataOf(document: FirestoreDocument | null) {
  return document ? decodeFields(document.fields || {}) : {};
}

function tournamentLabel(id: string) {
  const tournament = getRegisteredTournaments().find((item) => item.id === id);
  return tournament?.shortName || tournament?.name || "بطولة";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await context.params;
    const userId = text(rawId);
    if (!userId) return NextResponse.json({ error: "MEMBER_ID_REQUIRED" }, { status: 400 });

    const [userDocument, v2Documents, gameDocument, legacyPredictions] = await Promise.all([
      getDocument("users", userId),
      queryCollectionByField("tournamentUserStats", "userId", userId, 100),
      getDocument("platformGameStats", userId),
      queryCollectionByField("predictions", "userId", userId, 500),
    ]);

    if (!userDocument) return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 404 });

    const user = dataOf(userDocument);
    const legacyStats = legacyPredictions.reduce((stats, document) => {
      const prediction = dataOf(document);
      if (!Boolean(prediction.isCalculated)) return stats;
      const points = number(prediction.points);
      const resultType = text(prediction.resultType);
      if (resultType === "exact" || points === 3 || points === 6) { stats.exact += 1; stats.correct += 1; }
      else if (resultType === "winner" || points === 1 || points === 2) { stats.correct += 1; }
      else if (points === 0) stats.wrong += 1;
      stats.played += 1;
      return stats;
    }, { played: 0, exact: 0, correct: 0, wrong: 0 });
    const registered = getRegisteredTournaments();
    const statsByTournament = new Map(
      v2Documents.map((document) => {
        const data = dataOf(document);
        return [text(data.tournamentId), { id: documentId(document), data }] as const;
      }),
    );

    const tournaments = registered.map((tournament) => {
      if (tournament.slug === "world-cup-2026") {
        return {
          id: tournament.id,
          slug: tournament.slug,
          name: tournament.shortName || tournament.name,
          status: tournament.status,
          legacy: true,
          points: number(user.points),
          rank: number(user.currentRank) || null,
          played: legacyStats.played || number(user.total),
          exact: legacyStats.exact,
          correct: legacyStats.correct || number(user.correct),
          wrong: legacyStats.wrong || number(user.wrong),
          bestStreak: number(user.bestStreak),
        };
      }

      const stored = statsByTournament.get(tournament.id)?.data || {};
      return {
        id: tournament.id,
        slug: tournament.slug,
        name: tournament.shortName || tournament.name,
        status: tournament.status,
        legacy: false,
        points: number(stored.points),
        rank: number(stored.rank) || null,
        played: number(stored.played),
        exact: number(stored.exact),
        correct: number(stored.correctOutcome),
        wrong: number(stored.wrong),
        bestStreak: number(stored.bestStreak),
      };
    });

    // Include any future V2 tournament stats even before the tournament is added
    // to the local fallback registry.
    for (const document of v2Documents) {
      const data = dataOf(document);
      const tournamentId = text(data.tournamentId);
      if (!tournamentId || tournaments.some((item) => item.id === tournamentId)) continue;
      tournaments.push({
        id: tournamentId,
        slug: "",
        name: tournamentLabel(tournamentId),
        status: "active" as const,
        legacy: false,
        points: number(data.points),
        rank: number(data.rank) || null,
        played: number(data.played),
        exact: number(data.exact),
        correct: number(data.correctOutcome),
        wrong: number(data.wrong),
        bestStreak: number(data.bestStreak),
      });
    }

    const games = dataOf(gameDocument);
    const gameStats = games.gameStats && typeof games.gameStats === "object"
      ? (games.gameStats as Record<string, unknown>)
      : {};

    const gameBreakdown = ["word-game", "flag-memory", "ten-seconds", "vocabulary"].map((gameId) => {
      const entry = gameStats[gameId] && typeof gameStats[gameId] === "object"
        ? (gameStats[gameId] as Record<string, unknown>)
        : {};
      return {
        gameId,
        played: number(entry.played),
        wins: number(entry.wins),
        xp: number(entry.xp),
      };
    });

    const tournamentPoints = tournaments.reduce((sum, item) => sum + number(item.points), 0);
    const tournamentPlayed = tournaments.reduce((sum, item) => sum + number(item.played), 0);
    const tournamentExact = tournaments.reduce((sum, item) => sum + number(item.exact), 0);

    return NextResponse.json({
      member: {
        id: userId,
        fullName: text(user.fullName) || "عضو",
        favoriteTeam: text(user.favoriteTeam),
        teamEmoji: text(user.teamEmoji),
        createdAt: user.createdAt ? String(user.createdAt) : null,
      },
      summary: {
        tournamentPoints,
        tournamentPlayed,
        tournamentExact,
        gameXp: number(games.totalXp),
        gameLevel: number(games.level) || 1,
        gamesPlayed: number(games.gamesPlayed),
        gamesWins: number(games.wins),
      },
      tournaments,
      games: {
        totalXp: number(games.totalXp),
        level: number(games.level) || 1,
        gamesPlayed: number(games.gamesPlayed),
        wins: number(games.wins),
        breakdown: gameBreakdown,
      },
    });
  } catch (error) {
    console.error("Public member profile error:", error);
    return NextResponse.json({ error: "MEMBER_PROFILE_FAILED" }, { status: 500 });
  }
}
