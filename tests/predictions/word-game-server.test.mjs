import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateWordGameGuess,
  projectWordGameForClient,
} from "../../src/lib/wordGameServerLogic.ts";

const answer = "\u0633\u064a\u0627\u0631\u0629";
const wrong = "\u0645\u062f\u0631\u0633\u0629";

function playingGame(overrides = {}) {
  return {
    id: "user-1_2026-09-03",
    userId: "user-1",
    dateKey: "2026-09-03",
    targetWord: answer,
    guesses: [],
    status: "playing",
    attemptsUsed: 0,
    startedAt: 1_000,
    firstGuessAt: null,
    finishedAt: null,
    durationMs: null,
    won: false,
    ...overrides,
  };
}

test("word-game API projection never includes the answer during an active game", () => {
  const game = projectWordGameForClient(playingGame());
  assert.equal("targetWord" in game, false);
  assert.equal(game.userId, "user-1");
  assert.equal(game.attemptsUsed, 0);
});

test("word-game server calculates a first attempt and allows a saved game to continue", () => {
  const first = calculateWordGameGuess({ game: playingGame(), rawGuess: wrong, now: 2_000 });
  assert.equal(first.completedNow, false);
  assert.equal(first.game.status, "playing");
  assert.equal(first.game.attemptsUsed, 1);
  assert.equal(first.game.firstGuessAt, 2_000);

  const continued = calculateWordGameGuess({ game: first.game, rawGuess: answer, now: 5_000 });
  assert.equal(continued.completedNow, true);
  assert.equal(continued.game.status, "won");
  assert.equal(continued.game.attemptsUsed, 2);
  assert.equal(continued.game.durationMs, 3_000);
  assert.equal(projectWordGameForClient(continued.game).targetWord, answer);
});

test("word-game server records a loss only on the sixth attempt", () => {
  const existingGuesses = Array.from({ length: 5 }, () => ({
    word: wrong,
    letters: [],
  }));
  const result = calculateWordGameGuess({
    game: playingGame({ guesses: existingGuesses, attemptsUsed: 5, firstGuessAt: 2_000 }),
    rawGuess: wrong,
    now: 8_000,
  });
  assert.equal(result.completedNow, true);
  assert.equal(result.game.status, "lost");
  assert.equal(result.game.won, false);
  assert.equal(result.game.attemptsUsed, 6);
  assert.equal(result.game.durationMs, 6_000);
});

test("word-game server rejects invalid input and a duplicate completion", () => {
  assert.throws(
    () => calculateWordGameGuess({ game: playingGame(), rawGuess: "abc", now: 2_000 }),
    /INVALID_GUESS/,
  );
  assert.throws(
    () => calculateWordGameGuess({ game: playingGame({ status: "won", won: true }), rawGuess: answer, now: 2_000 }),
    /GAME_FINISHED/,
  );
});
