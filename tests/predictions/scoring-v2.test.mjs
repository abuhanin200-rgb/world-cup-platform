import test from "node:test";
import assert from "node:assert/strict";
import {
  createTournamentResultHash,
  scoreGulfCup27KnockoutPredictionV1,
  scoreGulfCup27PredictionV1,
  validateKnockoutResultV2,
} from "../../src/domain/tournaments/scoringV2.ts";

function groupMatch(homeScore, awayScore) {
  return { stage: "group", result: { homeScore, awayScore } };
}

test("دور المجموعات: نتيجة دقيقة = 3 نقاط", () => {
  const score = scoreGulfCup27PredictionV1({
    prediction: { homeScore: 2, awayScore: 1 },
    match: groupMatch(2, 1),
  });
  assert.equal(score.points, 3);
  assert.equal(score.resultType, "exact");
});

test("دور المجموعات: فائز صحيح أو تعادل صحيح بنتيجة مختلفة = نقطة", () => {
  const winner = scoreGulfCup27PredictionV1({
    prediction: { homeScore: 3, awayScore: 0 },
    match: groupMatch(2, 1),
  });
  const draw = scoreGulfCup27PredictionV1({
    prediction: { homeScore: 2, awayScore: 2 },
    match: groupMatch(1, 1),
  });
  assert.equal(winner.points, 1);
  assert.equal(draw.points, 1);
  assert.equal(winner.resultType, "outcome");
  assert.equal(draw.resultType, "outcome");
});

test("دور المجموعات: اتجاه خاطئ = صفر", () => {
  const score = scoreGulfCup27PredictionV1({
    prediction: { homeScore: 0, awayScore: 1 },
    match: groupMatch(2, 1),
  });
  assert.equal(score.points, 0);
  assert.equal(score.resultType, "wrong");
});

test("لا يُحتسب دور المجموعات بلا نتيجة رسمية", () => {
  assert.throws(
    () =>
      scoreGulfCup27PredictionV1({
        prediction: { homeScore: 0, awayScore: 0 },
        match: groupMatch(null, null),
      }),
    /قبل إدخال نتيجة المباراة/,
  );
});

function knockoutMatch(qualificationMethod) {
  return {
    stage: "knockout",
    homeTeamId: "home",
    awayTeamId: "away",
    result: {
      homeScore: 1,
      awayScore: 1,
      qualifiedTeamId: "home",
      qualificationMethod,
    },
  };
}

test("خروج المغلوب: نتيجة وتعادل ومتأهل وطريقة صحيحة = 6 نقاط", () => {
  for (const qualificationMethod of ["extra_time", "penalties"]) {
    const score = scoreGulfCup27KnockoutPredictionV1({
      prediction: {
        homeScore: 1,
        awayScore: 1,
        qualifiedTeamId: "home",
        qualificationMethod,
      },
      match: knockoutMatch(qualificationMethod),
    });
    assert.equal(score.points, 6);
    assert.deepEqual(score.pointsBreakdown, {
      score: 3,
      qualified: 2,
      method: 1,
    });
  }
});

test("خروج المغلوب: الفوز المباشر الدقيق يحتسب النتيجة والمتأهل والطريقة = 6", () => {
  const score = scoreGulfCup27KnockoutPredictionV1({
    prediction: {
      homeScore: 2,
      awayScore: 1,
      qualifiedTeamId: "home",
      qualificationMethod: "regular",
    },
    match: {
      stage: "knockout",
      homeTeamId: "home",
      awayTeamId: "away",
      result: {
        homeScore: 2,
        awayScore: 1,
        qualifiedTeamId: "home",
        qualificationMethod: "regular",
      },
    },
  });
  assert.equal(score.points, 6);
  assert.deepEqual(score.pointsBreakdown, { score: 3, qualified: 2, method: 1 });
});

test("خروج المغلوب: فائز مباشر صحيح بنتيجة مختلفة = 4", () => {
  const score = scoreGulfCup27KnockoutPredictionV1({
    prediction: { homeScore: 1, awayScore: 0 },
    match: {
      stage: "knockout",
      homeTeamId: "home",
      awayTeamId: "away",
      result: {
        homeScore: 3,
        awayScore: 1,
        qualifiedTeamId: "home",
        qualificationMethod: "regular",
      },
    },
  });
  assert.equal(score.points, 4);
  assert.deepEqual(score.pointsBreakdown, { score: 1, qualified: 2, method: 1 });
});

test("لا يمنح اتجاه التعادل إذا انتهى الوقت الأصلي بفوز", () => {
  const score = scoreGulfCup27KnockoutPredictionV1({
    prediction: {
      homeScore: 1,
      awayScore: 1,
      qualifiedTeamId: "home",
      qualificationMethod: "penalties",
    },
    match: {
      stage: "knockout",
      homeTeamId: "home",
      awayTeamId: "away",
      result: {
        homeScore: 2,
        awayScore: 1,
        qualifiedTeamId: "home",
        qualificationMethod: "regular",
      },
    },
  });
  assert.equal(score.points, 2);
  assert.deepEqual(score.pointsBreakdown, { score: 0, qualified: 2, method: 0 });
  assert.equal(score.resultType, "wrong");
});

test("المتأهل الصحيح يحتسب حتى لو اختلف اتجاه نتيجة الوقت الأصلي", () => {
  const score = scoreGulfCup27KnockoutPredictionV1({
    prediction: { homeScore: 2, awayScore: 1 },
    match: knockoutMatch("extra_time"),
  });
  assert.equal(score.points, 2);
  assert.deepEqual(score.pointsBreakdown, { score: 0, qualified: 2, method: 0 });
  assert.equal(score.resultType, "wrong");
});

test("طريقة التأهل الصحيحة مستقلة ولا تمنح نقاط المتأهل الخاطئ", () => {
  const score = scoreGulfCup27KnockoutPredictionV1({
    prediction: { homeScore: 0, awayScore: 1 },
    match: {
      stage: "knockout",
      homeTeamId: "home",
      awayTeamId: "away",
      result: {
        homeScore: 1,
        awayScore: 0,
        qualifiedTeamId: "home",
        qualificationMethod: "regular",
      },
    },
  });
  assert.equal(score.points, 1);
  assert.deepEqual(score.pointsBreakdown, { score: 0, qualified: 0, method: 1 });
  assert.equal(score.resultType, "wrong");
});

test("كل تفاصيل خروج المغلوب الخاطئة = صفر", () => {
  const score = scoreGulfCup27KnockoutPredictionV1({
    prediction: { homeScore: 0, awayScore: 1 },
    match: knockoutMatch("penalties"),
  });
  assert.equal(score.points, 0);
  assert.deepEqual(score.pointsBreakdown, { score: 0, qualified: 0, method: 0 });
});

test("خروج المغلوب: المتأهل صحيح والطريقة خاطئة لا تمنح نقطة الطريقة", () => {
  const score = scoreGulfCup27KnockoutPredictionV1({
    prediction: {
      homeScore: 1,
      awayScore: 1,
      qualifiedTeamId: "home",
      qualificationMethod: "extra_time",
    },
    match: knockoutMatch("penalties"),
  });
  assert.equal(score.points, 5);
  assert.deepEqual(score.pointsBreakdown, {
    score: 3,
    qualified: 2,
    method: 0,
  });
});

test("التحقق يطابق المتأهل مع نتيجة الإضافي أو الترجيح", () => {
  assert.doesNotThrow(() =>
    validateKnockoutResultV2({
      homeTeamId: "home",
      awayTeamId: "away",
      homeScore: 1,
      awayScore: 1,
      qualifiedTeamId: "home",
      qualificationMethod: "extra_time",
      extraTimeHomeScore: 2,
      extraTimeAwayScore: 1,
    }),
  );
  assert.throws(
    () =>
      validateKnockoutResultV2({
        homeTeamId: "home",
        awayTeamId: "away",
        homeScore: 0,
        awayScore: 0,
        qualifiedTeamId: "home",
        qualificationMethod: "penalties",
        penaltiesHomeScore: 4,
        penaltiesAwayScore: 5,
      }),
    /المتأهل لا يطابق نتيجة ركلات الترجيح/,
  );
});

test("بصمة النتيجة ثابتة للتكرار وتتغير عند تصحيحها", () => {
  const input = {
    tournamentId: "gulf-cup-27",
    matchId: "match-1",
    homeScore: 2,
    awayScore: 1,
    scoringVersion: "gulf27-v1",
  };
  const first = createTournamentResultHash(input);
  assert.equal(createTournamentResultHash(input), first);
  assert.notEqual(createTournamentResultHash({ ...input, homeScore: 3 }), first);
});
