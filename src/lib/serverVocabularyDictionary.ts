import type { Transaction } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  VOCABULARY_BASE_WORDS,
  VOCABULARY_STARTING_WORDS,
  getVocabularyMoves,
  isApprovedVocabularyWord,
  isValidVocabularyShape,
  normalizeVocabularyWord,
  replaceVocabularyLetter,
} from "@/lib/vocabularyChallengeDictionary";

export const VOCABULARY_OVERRIDE_COLLECTION = "vocabularyChallengeDictionaryOverrides";

type DictionaryOverrideData = {
  word?: unknown;
  enabled?: unknown;
};

function overrideRef(word: string) {
  return adminDb.collection(VOCABULARY_OVERRIDE_COLLECTION).doc(word);
}

function enabledFromOverride(data: DictionaryOverrideData | undefined, fallback: boolean) {
  if (!data || typeof data.enabled !== "boolean") return fallback;
  return data.enabled;
}

export async function isApprovedVocabularyWordServer(value: unknown, transaction?: Transaction) {
  const word = normalizeVocabularyWord(value);
  if (!isValidVocabularyShape(word)) return false;
  const ref = overrideRef(word);
  const snapshot = transaction ? await transaction.get(ref) : await ref.get();
  return enabledFromOverride(snapshot.exists ? snapshot.data() : undefined, isApprovedVocabularyWord(word));
}

export async function hasVocabularyMoveServer(
  currentWord: string,
  handLetters: readonly string[],
  transaction?: Transaction,
) {
  const cleanWord = normalizeVocabularyWord(currentWord);
  const candidates = new Set<string>();
  for (let position = 0; position < 3; position += 1) {
    for (const letter of new Set(handLetters.map(normalizeVocabularyWord))) {
      const candidate = replaceVocabularyLetter(cleanWord, position, letter);
      if (candidate && isValidVocabularyShape(candidate)) candidates.add(candidate);
    }
  }
  if (!candidates.size) return false;

  const entries = Array.from(candidates);
  const snapshots = transaction
    ? await Promise.all(entries.map((word) => transaction.get(overrideRef(word))))
    : await adminDb.getAll(...entries.map((word) => overrideRef(word)));

  return entries.some((word, index) => {
    const snapshot = snapshots[index];
    return enabledFromOverride(snapshot?.exists ? snapshot.data() : undefined, isApprovedVocabularyWord(word));
  });
}

export async function randomActiveStartingWord() {
  const rich = VOCABULARY_STARTING_WORDS.filter((word) => getVocabularyMoves(word).length >= 6);
  const pool = rich.length ? rich : VOCABULARY_STARTING_WORDS;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  for (const word of shuffled.slice(0, 24)) {
    if (await isApprovedVocabularyWordServer(word)) return word;
  }
  return "قال";
}

export async function getVocabularyDictionaryOverrides() {
  const snapshot = await adminDb.collection(VOCABULARY_OVERRIDE_COLLECTION).limit(5000).get();
  const enabledWords: string[] = [];
  const disabledWords: string[] = [];
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() || {};
    const word = normalizeVocabularyWord(data.word || docSnap.id);
    if (!isValidVocabularyShape(word)) continue;
    if (data.enabled === true && !isApprovedVocabularyWord(word)) enabledWords.push(word);
    if (data.enabled === false && isApprovedVocabularyWord(word)) disabledWords.push(word);
  }
  return { enabledWords, disabledWords };
}

export async function dictionaryAdminEntries(query = "") {
  const cleanQuery = normalizeVocabularyWord(query);
  const overrideSnapshot = await adminDb.collection(VOCABULARY_OVERRIDE_COLLECTION).limit(5000).get();
  const overrides = new Map<string, { enabled: boolean; updatedAt: number; updatedBy: string; note: string }>();
  for (const docSnap of overrideSnapshot.docs) {
    const data = docSnap.data() || {};
    const word = normalizeVocabularyWord(data.word || docSnap.id);
    if (!isValidVocabularyShape(word)) continue;
    overrides.set(word, {
      enabled: data.enabled === true,
      updatedAt: Number(data.updatedAt || 0),
      updatedBy: String(data.updatedBy || ""),
      note: String(data.note || ""),
    });
  }

  const allWords = new Set<string>(VOCABULARY_BASE_WORDS);
  overrides.forEach((_, word) => allWords.add(word));
  const filtered = Array.from(allWords)
    .filter((word) => !cleanQuery || word.includes(cleanQuery))
    .sort((a, b) => a.localeCompare(b, "ar"))
    .slice(0, 300)
    .map((word) => {
      const base = isApprovedVocabularyWord(word);
      const override = overrides.get(word);
      return {
        word,
        base,
        enabled: override ? override.enabled : base,
        overridden: Boolean(override),
        updatedAt: override?.updatedAt || null,
        updatedBy: override?.updatedBy || "",
        note: override?.note || "",
        baseMoves: getVocabularyMoves(word).length,
      };
    });

  return {
    query: cleanQuery,
    baseCount: VOCABULARY_BASE_WORDS.length,
    overrideCount: overrides.size,
    results: filtered,
  };
}
