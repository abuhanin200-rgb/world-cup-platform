import test from "node:test";
import assert from "node:assert/strict";
import { buildTournamentLeaderboardRowsV2 } from "../../src/domain/tournaments/leaderboardV2.ts";

const tournamentId = "gulf-cup-27";
const matches = [
  { id: "m1", kickoffAt: 1_000 },
  { id: "m2", kickoffAt: 2_000 },
  { id: "m3", kickoffAt: 3_000 },
];

function prediction(overrides) {
  return {
    id: `${overrides.userId}_${overrides.matchId}`,
    tournamentId,
    userName: overrides.userId,
    homeScore: 1,
    awayScore: 0,
    points: 0,
    resultType: "wrong",
    isCalculated: true,
    submittedAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

test("إعادة بناء المتصدرين ثابتة ولا تضاعف النقاط", () => {
  const predictions = [
    prediction({ userId: "u1", matchId: "m1", points: 3, resultType: "exact" }),
    prediction({ userId: "u1", matchId: "m2", points: 1, resultType: "outcome" }),
  ];
  const input = { tournamentId, matches, predictions, now: 9_999 };
  const first = buildTournamentLeaderboardRowsV2(input);
  const second = buildTournamentLeaderboardRowsV2(input);
  assert.deepEqual(second, first);
  assert.equal(first[0].points, 4);
  assert.equal(first[0].played, 2);
});

test("يستخدم كاسر التعادل: الدقيق ثم الاتجاه الصحيح ثم الأخطاء", () => {
  const rows = buildTournamentLeaderboardRowsV2({
    tournamentId,
    matches,
    now: 9_999,
    predictions: [
      prediction({ userId: "u-exact", matchId: "m1", points: 3, resultType: "exact" }),
      prediction({ userId: "u-outcome", matchId: "m1", points: 1, resultType: "outcome" }),
      prediction({ userId: "u-outcome", matchId: "m2", points: 1, resultType: "outcome" }),
      prediction({ userId: "u-outcome", matchId: "m3", points: 1, resultType: "outcome" }),
    ],
  });
  assert.deepEqual(rows.map((row) => row.userId), ["u-exact", "u-outcome"]);
  assert.deepEqual(rows.map((row) => row.rank), [1, 2]);
});

test("يتجاهل غير المحتسب والمباراة غير المعروفة والمستخدم بلا توقع", () => {
  const rows = buildTournamentLeaderboardRowsV2({
    tournamentId,
    matches,
    now: 9_999,
    predictions: [
      prediction({ userId: "pending", matchId: "m1", isCalculated: false, points: null, resultType: null }),
      prediction({ userId: "unknown", matchId: "not-in-tournament", points: 3, resultType: "exact" }),
    ],
  });
  assert.deepEqual(rows, []);
});

test("السلسلة الصحيحة تتوقف عند أول توقع خاطئ", () => {
  const [row] = buildTournamentLeaderboardRowsV2({
    tournamentId,
    matches,
    now: 9_999,
    predictions: [
      prediction({ userId: "u1", matchId: "m1", points: 1, resultType: "outcome" }),
      prediction({ userId: "u1", matchId: "m2", points: 0, resultType: "wrong" }),
      prediction({ userId: "u1", matchId: "m3", points: 3, resultType: "exact" }),
    ],
  });
  assert.equal(row.currentStreak, 1);
  assert.equal(row.bestStreak, 1);
  assert.equal(row.wrong, 1);
});
