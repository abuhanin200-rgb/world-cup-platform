import dictionaryData from "@/data/vocabularyChallengeWords.json";

export const VOCABULARY_DICTIONARY_VERSION = dictionaryData.version;
export const VOCABULARY_DICTIONARY_POLICY = dictionaryData.policy;
export const VOCABULARY_ALLOWED_LETTERS = [
  "ا", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر", "ز", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ك", "ل", "م", "ن", "ه", "و", "ي",
] as const;

const allowedLetterSet = new Set<string>(VOCABULARY_ALLOWED_LETTERS);
const words = Array.from(new Set(dictionaryData.words.map((word) => String(word).trim())));
const wordSet = new Set(words);
const startingWords = dictionaryData.startingWords.filter((word) => wordSet.has(word));

export const VOCABULARY_BASE_WORDS = Object.freeze([...words]);
export const VOCABULARY_STARTING_WORDS = Object.freeze([...startingWords]);

export type VocabularyMove = {
  word: string;
  position: 0 | 1 | 2;
  letter: string;
};

export type VocabularyDictionaryOverrides = {
  enabledWords?: readonly string[];
  disabledWords?: readonly string[];
};

function assertDictionaryIntegrity() {
  for (const word of words) {
    const letters = Array.from(word);
    if (letters.length !== 3 || letters.some((letter) => !allowedLetterSet.has(letter))) {
      throw new Error(`Invalid vocabulary challenge dictionary entry: ${word}`);
    }
  }
  if (startingWords.length === 0) throw new Error("Vocabulary challenge has no valid starting words.");
}

assertDictionaryIntegrity();

export const VOCABULARY_DICTIONARY_SIZE = words.length;

export function normalizeVocabularyWord(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/ـ/g, "");
}

export function isValidVocabularyShape(value: unknown) {
  const clean = normalizeVocabularyWord(value);
  const letters = Array.from(clean);
  return letters.length === 3 && letters.every((letter) => allowedLetterSet.has(letter));
}

export function isApprovedVocabularyWord(value: unknown) {
  return wordSet.has(normalizeVocabularyWord(value));
}

export function isApprovedVocabularyWordWithOverrides(value: unknown, overrides?: VocabularyDictionaryOverrides) {
  const clean = normalizeVocabularyWord(value);
  if (!isValidVocabularyShape(clean)) return false;
  const disabled = new Set((overrides?.disabledWords || []).map(normalizeVocabularyWord));
  if (disabled.has(clean)) return false;
  const enabled = new Set((overrides?.enabledWords || []).map(normalizeVocabularyWord));
  return wordSet.has(clean) || enabled.has(clean);
}

export function replaceVocabularyLetter(word: string, position: number, letter: string) {
  const letters = Array.from(normalizeVocabularyWord(word));
  if (letters.length !== 3 || !Number.isInteger(position) || position < 0 || position > 2) return "";
  const cleanLetter = normalizeVocabularyWord(letter);
  if (Array.from(cleanLetter).length !== 1 || !allowedLetterSet.has(cleanLetter)) return "";
  letters[position] = cleanLetter;
  return letters.join("");
}

export function getVocabularyMoves(currentWord: string, handLetters?: readonly string[]) {
  const cleanWord = normalizeVocabularyWord(currentWord);
  const handSet = handLetters ? new Set(handLetters) : null;
  const result: VocabularyMove[] = [];

  for (let position = 0; position < 3; position += 1) {
    for (const letter of VOCABULARY_ALLOWED_LETTERS) {
      if (handSet && !handSet.has(letter)) continue;
      const candidate = replaceVocabularyLetter(cleanWord, position, letter);
      if (wordSet.has(candidate)) {
        result.push({ word: candidate, position: position as 0 | 1 | 2, letter });
      }
    }
  }

  return result;
}

export function getVocabularyMovesWithOverrides(
  currentWord: string,
  handLetters?: readonly string[],
  overrides?: VocabularyDictionaryOverrides,
) {
  const cleanWord = normalizeVocabularyWord(currentWord);
  const handSet = handLetters ? new Set(handLetters) : null;
  const enabled = new Set((overrides?.enabledWords || []).map(normalizeVocabularyWord));
  const disabled = new Set((overrides?.disabledWords || []).map(normalizeVocabularyWord));
  const result: VocabularyMove[] = [];

  for (let position = 0; position < 3; position += 1) {
    for (const letter of VOCABULARY_ALLOWED_LETTERS) {
      if (handSet && !handSet.has(letter)) continue;
      const candidate = replaceVocabularyLetter(cleanWord, position, letter);
      if (candidate && !disabled.has(candidate) && (wordSet.has(candidate) || enabled.has(candidate))) {
        result.push({ word: candidate, position: position as 0 | 1 | 2, letter });
      }
    }
  }

  return result;
}

export function hasVocabularyMove(currentWord: string, handLetters: readonly string[]) {
  return getVocabularyMoves(currentWord, handLetters).length > 0;
}

export function hasVocabularyMoveWithOverrides(
  currentWord: string,
  handLetters: readonly string[],
  overrides?: VocabularyDictionaryOverrides,
) {
  return getVocabularyMovesWithOverrides(currentWord, handLetters, overrides).length > 0;
}

export function randomVocabularyStartingWord() {
  const rich = startingWords.filter((word) => getVocabularyMoves(word).length >= 6);
  const pool = rich.length ? rich : startingWords;
  return pool[Math.floor(Math.random() * pool.length)] || "قال";
}

const weightedLetterBag = words.flatMap((word) => Array.from(word));

function pick<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffled<T>(items: readonly T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createFairVocabularyLetters(currentWord: string, size: number) {
  const safeSize = Math.max(1, Math.min(20, Math.floor(size)));
  const letters: string[] = [];
  let simulatedWord = currentWord;

  for (let index = 0; index < safeSize; index += 1) {
    const moves = getVocabularyMoves(simulatedWord);
    const shouldGuaranteePath = moves.length > 0 && (index < Math.ceil(safeSize * 0.65) || Math.random() < 0.58);

    if (shouldGuaranteePath) {
      const move = pick(moves);
      if (move) {
        letters.push(move.letter);
        if (Math.random() < 0.72) simulatedWord = move.word;
        continue;
      }
    }

    letters.push(pick(weightedLetterBag) || "م");
  }

  // A starting hand should always contain at least one legal move.
  if (!hasVocabularyMove(currentWord, letters)) {
    const move = pick(getVocabularyMoves(currentWord));
    if (move) letters[0] = move.letter;
  }

  return shuffled(letters);
}

export function drawFairVocabularyLetter(currentWord: string, handLetters: readonly string[]) {
  const moves = getVocabularyMoves(currentWord);
  const handSet = new Set(handLetters);
  const preferred = moves.filter((move) => !handSet.has(move.letter));
  const move = pick(preferred.length ? preferred : moves);
  if (move && Math.random() < 0.76) return move.letter;
  return pick(weightedLetterBag) || "م";
}
