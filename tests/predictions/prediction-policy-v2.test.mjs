import test from "node:test";
import assert from "node:assert/strict";
import {
  canEditTournamentPredictionV2,
  getTournamentPredictionDeadlineV2,
  getTournamentPredictionSubmissionDecisionV2,
  getTournamentPredictionWindowStateV2,
} from "../../src/domain/tournaments/predictionPolicyV2.ts";

const kickoffAt = 1_800_000_000_000;

function match(overrides = {}) {
  return {
    homeTeamId: "home",
    awayTeamId: "away",
    kickoffAt,
    status: "prediction_open",
    predictionOpensAt: kickoffAt - 7 * 24 * 60 * 60 * 1000,
    predictionClosesAt: kickoffAt,
    predictionIsOpen: true,
    predictionEditingIsOpen: true,
    ...overrides,
  };
}

test("يقبل الحفظ والتعديل قبل البداية بيوم ودقيقة وثانية", () => {
  for (const offset of [86_400_000, 60_000, 1_000]) {
    const now = kickoffAt - offset;
    assert.equal(getTournamentPredictionWindowStateV2(match(), now), "open");
    assert.deepEqual(
      getTournamentPredictionSubmissionDecisionV2({
        match: match(),
        now,
        hasPrediction: false,
      }),
      { allowed: true, code: "PREDICTION_ALLOWED" },
    );
    assert.equal(canEditTournamentPredictionV2(match(), now), true);
  }
});

test("يرفض الحفظ والتعديل لحظة البداية وبعدها", () => {
  for (const offset of [0, 1_000, 60_000]) {
    const now = kickoffAt + offset;
    assert.equal(getTournamentPredictionWindowStateV2(match(), now), "closed");
    assert.equal(
      getTournamentPredictionSubmissionDecisionV2({
        match: match(),
        now,
        hasPrediction: false,
      }).allowed,
      false,
    );
    assert.equal(
      getTournamentPredictionSubmissionDecisionV2({
        match: match(),
        now,
        hasPrediction: true,
      }).allowed,
      false,
    );
    assert.equal(canEditTournamentPredictionV2(match(), now), false);
  }
});

test("وقت الخادم الممرر للسياسة هو الحاكم لا ساعة المتصفح", () => {
  const fakeClientNow = kickoffAt + 60_000;
  const trustedServerNow = kickoffAt - 1_000;
  assert.ok(fakeClientNow > kickoffAt);
  assert.equal(
    getTournamentPredictionSubmissionDecisionV2({
      match: match(),
      now: trustedServerNow,
      hasPrediction: false,
    }).allowed,
    true,
  );
});

test("الإغلاق الإداري المبكر يغلب موعد البداية", () => {
  const closedEarly = match({ predictionIsOpen: false });
  assert.equal(
    getTournamentPredictionWindowStateV2(closedEarly, kickoffAt - 60_000),
    "closed",
  );
  assert.equal(
    getTournamentPredictionSubmissionDecisionV2({
      match: closedEarly,
      now: kickoffAt - 60_000,
      hasPrediction: false,
    }).code,
    "PREDICTION_CLOSED",
  );
});

test("إغلاق التعديل إداريًا يمنع تعديل توقع محفوظ", () => {
  const editingClosed = match({ predictionEditingIsOpen: false });
  assert.equal(canEditTournamentPredictionV2(editingClosed, kickoffAt - 1_000), false);
  assert.equal(
    getTournamentPredictionSubmissionDecisionV2({
      match: editingClosed,
      now: kickoffAt - 1_000,
      hasPrediction: true,
    }).code,
    "PREDICTION_EDITING_CLOSED",
  );
});

test("المؤجلة والملغاة والمباشرة والمنتهية لا تقبل توقعًا", () => {
  for (const [status, expectedState] of [
    ["postponed", "postponed"],
    ["cancelled", "cancelled"],
    ["live", "live"],
    ["finished", "finished"],
  ]) {
    const current = match({ status });
    assert.equal(
      getTournamentPredictionWindowStateV2(current, kickoffAt - 60_000),
      expectedState,
    );
    assert.equal(
      getTournamentPredictionSubmissionDecisionV2({
        match: current,
        now: kickoffAt - 60_000,
        hasPrediction: false,
      }).allowed,
      false,
    );
  }
});

test("تغيير الموعد يستخدم الموعد والإغلاق الجديدين", () => {
  const delayedKickoff = kickoffAt + 3_600_000;
  const rescheduled = match({
    kickoffAt: delayedKickoff,
    predictionClosesAt: delayedKickoff,
  });
  assert.equal(
    getTournamentPredictionWindowStateV2(rescheduled, kickoffAt + 1_000),
    "open",
  );
  assert.equal(getTournamentPredictionDeadlineV2(rescheduled), delayedKickoff);
});

test("موعد إغلاق مخصص أسبق من البداية يغلق النافذة", () => {
  const deadline = kickoffAt - 3_600_000;
  const earlyDeadline = match({ predictionClosesAt: deadline });
  assert.equal(getTournamentPredictionDeadlineV2(earlyDeadline), deadline);
  assert.equal(
    getTournamentPredictionWindowStateV2(earlyDeadline, deadline),
    "closed",
  );
});
