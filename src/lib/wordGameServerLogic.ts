import {
  evaluateWordGameGuess,
  isValidWordGameWord,
  normalizeWordGameText,
  WORD_GAME_MAX_ATTEMPTS,
} from "./wordGameLogic.ts";
import {
  getWordGameCategoryLabel,
  getWordGameWordCategory,
} from "./wordGameWords.ts";
import type { WordGameDailyGame } from "../types/wordGame.ts";

/** The browser never receives the daily answer until that player's game ends. */
export type WordGameClientGame = Omit<WordGameDailyGame, "targetWord"> & {
  categoryLabel: string;
  targetWord?: string;
};

export function projectWordGameForClient(game: WordGameDailyGame): WordGameClientGame {
  const { targetWord, ...safeGame } = game;

  return {
    ...safeGame,
    categoryLabel: getWordGameCategoryLabel(getWordGameWordCategory(targetWord)),
    ...(game.status === "playing" ? {} : { targetWord }),
  };
}

export function calculateWordGameGuess(params: {
  game: WordGameDailyGame;
  rawGuess: unknown;
  now: number;
}) {
  const guess = normalizeWordGameText(String(params.rawGuess || ""));
  if (!isValidWordGameWord(guess)) throw new Error("INVALID_GUESS");
  if (params.game.status !== "playing") throw new Error("GAME_FINISHED");

  const letters = evaluateWordGameGuess(guess, params.game.targetWord);
  const guesses = [...params.game.guesses, { word: guess, letters }];
  const won = guess === normalizeWordGameText(params.game.targetWord);
  const completedNow = won || guesses.length >= WORD_GAME_MAX_ATTEMPTS;
  const firstGuessAt = params.game.firstGuessAt || params.now;

  return {
    game: {
      ...params.game,
      guesses,
      won,
      attemptsUsed: guesses.length,
      firstGuessAt,
      status: won ? "won" : completedNow ? "lost" : "playing",
      finishedAt: completedNow ? params.now : null,
      durationMs: completedNow ? params.now - firstGuessAt : null,
    } satisfies WordGameDailyGame,
    completedNow,
  };
}
