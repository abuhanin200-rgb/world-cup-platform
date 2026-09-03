import test from "node:test";
import assert from "node:assert/strict";
import { buildLegacyLeaderboard } from "../../src/lib/legacyLeaderboardLogic.ts";
import { buildHomeHighlights } from "../../src/lib/highlights.ts";

test("legacy public leaderboard exposes only the derived display fields", () => {
  const users = [
    { id: "user-1", data: { fullName: "Member one", points: 3, total: 1, correct: 1, phone: "private" } },
    { id: "user-2", data: { fullName: "Member two", points: 1, total: 1, correct: 1 } },
  ];
  const predictions = [
    { id: "prediction-1", data: { userId: "user-1", matchId: "match-1", points: 3, resultType: "exact", isCalculated: true, createdAt: "2026-01-01T00:00:00.000Z", calculatedAt: "2026-01-02T00:00:00.000Z" } },
    { id: "prediction-2", data: { userId: "user-2", matchId: "match-1", points: 1, resultType: "winner", isCalculated: true, createdAt: "2026-01-01T00:01:00.000Z", calculatedAt: "2026-01-02T00:00:00.000Z" } },
  ];
  const leaderboard = buildLegacyLeaderboard(users, predictions);
  assert.deepEqual(leaderboard.map((item) => item.id), ["user-1", "user-2"]);
  assert.equal(leaderboard[0].exact, 1);
  assert.equal(leaderboard[1].winner, 1);
  assert.equal("phone" in leaderboard[0], false);
});

test("home highlights are built on the server from derived records", () => {
  const result = buildHomeHighlights({
    users: [{ id: "user-1", data: { fullName: "Member one", points: 3, total: 1, correct: 1, bestStreak: 1 } }],
    predictions: [{ id: "prediction-1", data: { userId: "user-1", userName: "Member one", matchId: "match-1", homeTeamName: "Home", awayTeamName: "Away", homeScore: 1, awayScore: 0, points: 3, resultType: "exact", isCalculated: true, createdAt: new Date().toISOString(), calculatedAt: new Date().toISOString() } }],
    matches: [{ id: "match-1", data: { matchStage: "group", resultCalculated: true } }],
  });
  assert.equal(result.predictionKing?.id, "user-1");
  assert.equal(result.exactHits.length, 1);
  assert.equal(result.isFinalCalculated, false);
});
