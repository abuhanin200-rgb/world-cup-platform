import { WORD_GAME_WORDS } from "@/lib/wordGameWords";
import type { WordGameGuessLetter } from "@/types/wordGame";

export const WORD_GAME_WORD_LENGTH = 5;
export const WORD_GAME_MAX_ATTEMPTS = 6;

export function normalizeWordGameText(value: string): string {
  return value
    .trim()
    .replace(/[إأآ]/g, "ا")
    .replace(/[^\u0621-\u064A]/g, "");
}

export function isValidWordGameWord(value: string): boolean {
  const normalized = normalizeWordGameText(value);
  return normalized.length === WORD_GAME_WORD_LENGTH;
}

export function getMakkahDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function getWordForUserByDate(params: {
  userId: string;
  dateKey: string;
  previousWord?: string | null;
  usedWordsToday?: string[];
}): string {
  const { userId, dateKey, previousWord, usedWordsToday = [] } = params;

  const cleanWords = WORD_GAME_WORDS.filter(
    (word) => normalizeWordGameText(word).length === WORD_GAME_WORD_LENGTH
  );

  if (cleanWords.length === 0) {
    throw new Error("لا توجد كلمات صالحة للعبة خمن كلمة اليوم.");
  }

  const usedWordsSet = new Set(usedWordsToday.map(normalizeWordGameText));
  const previousNormalizedWord = previousWord
    ? normalizeWordGameText(previousWord)
    : null;

  let availableWords = cleanWords.filter((word) => {
    const normalizedWord = normalizeWordGameText(word);

    return (
      !usedWordsSet.has(normalizedWord) &&
      normalizedWord !== previousNormalizedWord
    );
  });

  if (availableWords.length === 0) {
    availableWords = cleanWords.filter(
      (word) => normalizeWordGameText(word) !== previousNormalizedWord
    );
  }

  if (availableWords.length === 0) {
    availableWords = cleanWords;
  }

  const baseIndex = hashString(`${userId}-${dateKey}`) % availableWords.length;

  return availableWords[baseIndex];
}

export function evaluateWordGameGuess(
  guess: string,
  targetWord: string
): WordGameGuessLetter[] {
  const normalizedGuess = normalizeWordGameText(guess);
  const normalizedTarget = normalizeWordGameText(targetWord);

  const result: WordGameGuessLetter[] = normalizedGuess
    .split("")
    .map((letter) => ({
      letter,
      status: "absent",
    }));

  const remainingTargetLetters = normalizedTarget.split("");

  for (let index = 0; index < WORD_GAME_WORD_LENGTH; index += 1) {
    if (normalizedGuess[index] === normalizedTarget[index]) {
      result[index].status = "correct";
      remainingTargetLetters[index] = "";
    }
  }

  for (let index = 0; index < WORD_GAME_WORD_LENGTH; index += 1) {
    if (result[index].status === "correct") continue;

    const foundIndex = remainingTargetLetters.indexOf(normalizedGuess[index]);

    if (foundIndex !== -1) {
      result[index].status = "present";
      remainingTargetLetters[foundIndex] = "";
    }
  }

  return result;
}

export function getNextMakkahMidnight(date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return new Date(Date.UTC(year, month - 1, day + 1, 21, 0, 0));
}

export function formatDurationMs(durationMs: number | null): string {
  if (durationMs === null) return "-";

  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}