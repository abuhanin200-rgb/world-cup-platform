import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, "..", "src", "data", "majlisQuestionBank.json");
const bank = JSON.parse(fs.readFileSync(file, "utf8"));
const categories = Array.isArray(bank.categories) ? bank.categories : [];
const questions = Array.isArray(bank.questions) ? bank.questions : [];
const active = questions.filter((q) => q.enabled !== false);
const errors = [];
const warnings = [];
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);
const norm = (value) => String(value ?? "").trim().toLowerCase().replace(/[\u064B-\u065F\u0670]/g, "").replace(/[إأآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const factKey = (q) => String(q.factKey || q.groupKey || "").trim();
const quranAnswerToken = (value) => norm(value).replace(/^سوره\s+/, "").trim();
const containsPhrase = (value, phrase) => Boolean(phrase) && ` ${norm(value)} `.includes(` ${norm(phrase)} `);
const answerLeakIds = new Set();
let missingSourceLicense = 0;
let brokenImageMetadata = 0;

const byCategory = new Map(categories.map((category) => [category.id, []]));
for (const q of active) {
  if (!byCategory.has(q.categoryId)) byCategory.set(q.categoryId, []);
  byCategory.get(q.categoryId).push(q);
}

// Global integrity.
const ids = new Set();
for (const q of questions) {
  if (!q.id) fail("Question without id");
  else if (ids.has(q.id)) fail(`Duplicate id: ${q.id}`);
  ids.add(q.id);
  if (q.enabled === false) continue;
  if (!String(q.answer || "").trim()) fail(`Missing answer: ${q.id}`);
  if (!String(q.prompt || "").trim()) fail(`Missing prompt: ${q.id}`);
  if (!String(q.groupKey || "").trim()) fail(`Missing groupKey compatibility alias: ${q.id}`);
  if (!String(q.factKey || "").trim()) fail(`Missing factKey: ${q.id}`);
  if (!String(q.questionFamily || q.family || "").trim()) fail(`Missing questionFamily: ${q.id}`);
  if (q.difficulty === "easy") fail(`Easy question is active: ${q.id}`);
  if (/^(?:سؤال المجلس|اختبر معلوماتك|للنقطة هذه|السؤال)\s*[:：-]?/i.test(String(q.prompt || ""))) fail(`Weak preamble in prompt: ${q.id}`);
  const answer = quranAnswerToken(q.answer);
  if (answer.length >= 3 && containsPhrase(q.prompt, answer)) {
    answerLeakIds.add(q.id);
    fail(`Answer appears in question: ${q.id}`);
  }
  if (answer.length >= 3 && containsPhrase(q.hint, answer)) {
    answerLeakIds.add(q.id);
    fail(`Answer appears in hint: ${q.id}`);
  }
  if (Array.isArray(q.options) && q.options.length && !q.options.some((option) => norm(option) === norm(q.answer))) fail(`Options omit the correct answer: ${q.id}`);
  if (answer.length >= 3 && containsPhrase([q.audioUrl, q.audioFallbackUrl, ...(q.audioFallbacks || [])].join(" "), answer)) fail(`Audio URL leaks answer: ${q.id}`);
  if (answer.length >= 3 && containsPhrase(q.imageUrl, answer)) fail(`Image URL leaks answer: ${q.id}`);
  if (q.imageUrl && (!q.imageSourceName || !q.imageSourceUrl || !q.imageLicense)) {
    brokenImageMetadata += 1;
    fail(`Visual question missing image attribution: ${q.id}`);
  }
  if (q.type === "image" && !q.imageUrl) fail(`Image question has no image: ${q.id}`);
  if (!q.sourceUrl || !q.license) missingSourceLicense += 1;
}

// factKey is the canonical fact identity: variants may exist, but the answer may not conflict.
const groupMap = new Map();
for (const q of active) {
  const key = `${q.categoryId}::${factKey(q)}`;
  if (!groupMap.has(key)) groupMap.set(key, []);
  groupMap.get(key).push(q);
}
for (const [key, rows] of groupMap) {
  const answers = new Set(rows.map((q) => norm(q.answer)));
  if (answers.size > 1) fail(`Conflicting answers inside groupKey ${key}: ${[...answers].join(" | ")}`);
  if (rows.length > 4) warn(`Many phrasings for one fact (${rows.length}): ${key}`);
}

// Exact textual duplicates across different facts are suspicious (audio identification prompt is intentionally repeated).
const promptMap = new Map();
for (const q of active) {
  if (["reciter", "dialects", "languages"].includes(q.categoryId)) continue;
  const key = `${q.categoryId}::${norm(q.prompt)}::${norm(q.quoteText || q.imageUrl || "")}`;
  if (!promptMap.has(key)) promptMap.set(key, new Set());
  promptMap.get(key).add(factKey(q));
}
for (const [key, facts] of promptMap) if (facts.size > 1) fail(`Same prompt points to multiple facts: ${key}`);

// Conservative semantic detector: only compare different facts with the same answer
// and category, then require very high prompt-token overlap to avoid false merges.
const semanticDuplicatePairs = [];
const semanticBuckets = new Map();
const tokenSet = (value) => new Set(norm(value).split(" ").filter((token) => token.length > 1));
const jaccard = (left, right) => {
  const intersection = [...left].filter((token) => right.has(token)).length;
  return intersection / Math.max(1, new Set([...left, ...right]).size);
};
for (const q of active) {
  if (["reciter", "dialects", "languages"].includes(q.categoryId)) continue;
  const key = `${q.categoryId}::${norm(q.answer)}`;
  if (!semanticBuckets.has(key)) semanticBuckets.set(key, new Map());
  if (!semanticBuckets.get(key).has(factKey(q))) semanticBuckets.get(key).set(factKey(q), q);
}
for (const bucket of semanticBuckets.values()) {
  const rows = [...bucket.values()];
  for (let left = 0; left < rows.length; left += 1) {
    for (let right = left + 1; right < rows.length; right += 1) {
      const similarity = jaccard(tokenSet(`${rows[left].prompt} ${rows[left].quoteText || ""}`), tokenSet(`${rows[right].prompt} ${rows[right].quoteText || ""}`));
      if (similarity >= 0.82) semanticDuplicatePairs.push(`${rows[left].id} ~ ${rows[right].id} (${similarity.toFixed(2)})`);
    }
  }
}
semanticDuplicatePairs.slice(0, 30).forEach((pair) => warn(`Possible semantic duplicate: ${pair}`));

const specialAxis = new Set(["reciter", "dialects", "languages"]);
function representatives(items) {
  const map = new Map();
  for (const q of items) if (!map.has(factKey(q))) map.set(factKey(q), q);
  return [...map.values()];
}
function axisFor(categoryId, q) {
  return specialAxis.has(categoryId) ? `answer:${norm(q.answer)}` : `family:${q.questionFamily || q.family}`;
}
function canPartitionWithoutRepeat(categoryId, reps) {
  const counts = new Map();
  for (const q of reps) counts.set(axisFor(categoryId, q), (counts.get(axisFor(categoryId, q)) || 0) + 1);
  const sessions = Math.ceil(reps.length / 6);
  const max = Math.max(0, ...counts.values());
  if (counts.size < 6 || max > sessions) return { ok: false, axes: counts.size, max, sessions };
  // Greedy simulation: take one from the six currently largest buckets per full session.
  const work = new Map(counts);
  while ([...work.values()].reduce((a, b) => a + b, 0) >= 6) {
    const top = [...work.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (top.length < 6) return { ok: false, axes: counts.size, max, sessions };
    for (const [axis, n] of top) work.set(axis, n - 1);
  }
  const tailAxes = [...work.values()].filter((n) => n > 0);
  if (tailAxes.some((n) => n > 1)) return { ok: false, axes: counts.size, max, sessions };
  return { ok: true, axes: counts.size, max, sessions };
}

const weakCategories = new Set();
for (const category of categories.filter((c) => c.enabled !== false)) {
  const items = byCategory.get(category.id) || [];
  const reps = representatives(items);
  const uniqueFacts = reps.length;
  const families = new Set(reps.map((q) => q.questionFamily || q.family).filter(Boolean));
  const hard = reps.filter((q) => q.difficulty === "hard").length;
  const medium = reps.filter((q) => q.difficulty === "medium").length;
  if (uniqueFacts < 50) { weakCategories.add(category.id); fail(`Weak category ${category.id}: only ${uniqueFacts} unique facts`); }
  if (category.id === "quran" && uniqueFacts < 100) fail(`Quran needs >=100 unique facts, got ${uniqueFacts}`);
  if (category.id === "seerah" && uniqueFacts < 100) fail(`Seerah needs >=100 unique facts, got ${uniqueFacts}`);
  if (!specialAxis.has(category.id) && families.size < 6) fail(`Weak family diversity ${category.id}: ${families.size}`);
  if (hard < Math.ceil(uniqueFacts * 0.55)) warn(`Hard ratio is lower than preferred in ${category.id}: ${hard}/${uniqueFacts}`);
  if (medium < 1) warn(`No medium facts in ${category.id}`);
  const feasibility = canPartitionWithoutRepeat(category.id, reps);
  if (!feasibility.ok) fail(`Cannot guarantee 6-session diversity for ${category.id}: axes=${feasibility.axes}, maxBucket=${feasibility.max}, sessions=${feasibility.sessions}`);
  if (!category.imageUrl || !category.imageSourceUrl || !category.imageLicense) fail(`Category missing real-image attribution: ${category.id}`);
}

// Quran-specific anti-monotony, leakage checks, family coverage, and reveal metadata.
const quran = active.filter((q) => q.categoryId === "quran");
const quranReps = representatives(quran);
const roteCount = quranReps.filter((q) => ["quran_ayah_count", "quran_order"].includes(q.questionFamily || q.family)).length;
if (roteCount / quranReps.length > 0.12) fail(`Quran count/order ratio exceeds 12%: ${roteCount}/${quranReps.length}`);
const requiredQuranFamilies = [
  "quran_complete_verse", "quran_which_surah", "quran_who_is_meant", "quran_meaning",
  "quran_vocabulary", "quran_context", "quran_story", "quran_people", "quran_places",
  "quran_events", "quran_opening", "quran_closing", "quran_names", "quran_repeated_phrase",
  "quran_tadabbur_objective", "quran_order", "quran_ayah_count", "quran_similar_verses",
  "quran_topic", "quran_sequence", "quran_prophets", "quran_nations",
];
for (const fam of requiredQuranFamilies) {
  if (!quran.some((q) => (q.questionFamily || q.family) === fam)) fail(`Missing Quran family: ${fam}`);
}
for (const q of quran) {
  const answer = quranAnswerToken(q.answer);
  const publicStem = norm([q.prompt, q.hint, q.quoteText].filter(Boolean).join(" "));
  if (answer.length >= 3 && publicStem.includes(answer)) { answerLeakIds.add(q.id); fail(`Quran answer leaks through pre-reveal content: ${q.id}`); }
  if ((q.questionFamily || q.family) === "quran_complete_verse" && q.quoteText) fail(`Complete-verse answer is exposed as quoteText: ${q.id}`);
}
for (const q of quran.filter((q) => ["quran_complete_verse", "quran_people", "quran_vocabulary", "quran_story", "quran_context", "quran_events"].includes(q.questionFamily || q.family))) {
  if (!q.quranSurah || !q.quranAyah || !q.quranText) fail(`Quran reveal metadata incomplete: ${q.id}`);
  if (!String(q.sourceUrl || "").includes("qurancomplex.gov.sa")) fail(`Quran source is not KFGQPC developer source: ${q.id}`);
}

// Seerah family coverage.
const seerah = representatives(active.filter((q) => q.categoryId === "seerah"));
const seerahFamilies = new Set(seerah.map((q) => q.questionFamily || q.family));
for (const fam of ["seerah_battles", "seerah_events", "seerah_people", "seerah_places", "seerah_hijrah", "seerah_timeline", "seerah_treaties", "seerah_companions", "seerah_family", "seerah_makkah_period", "seerah_madinah_period", "seerah_causes_results", "seerah_geography"]) {
  if (!seerahFamilies.has(fam)) fail(`Missing Seerah family: ${fam}`);
}

// Audio integrity: human-only for reciter/dialects/languages and no answer leakage to client URLs.
const audio = active.filter((q) => q.type === "audio");
let humanAudio = 0;
let aiTts = 0;
let brokenAudioMetadata = 0;
const nadiMap = { KSA:"السعودية", KUW:"الكويتية", BAH:"البحرينية", QAT:"القطرية", UAE:"الإماراتية", OMA:"العُمانية", YEM:"اليمنية", IRA:"العراقية", EGY:"المصرية", SUD:"السودانية", PAL:"الفلسطينية", JOR:"الأردنية", LEB:"اللبنانية", SYR:"السورية", MOR:"المغربية", ALG:"الجزائرية", TUN:"التونسية", LIB:"الليبية" };
for (const q of audio) {
  const source = `${q.sourceLabel || ""} ${q.sourceName || ""} ${q.audioSourceKey || ""}`.toLowerCase();
  if (/speechsynthesis|elevenlabs|google tts|text.to.speech|ai voice|synthetic/.test(source)) { aiTts += 1; fail(`Synthetic audio marker: ${q.id}`); }
  if (["reciter", "dialects", "languages"].includes(q.categoryId)) {
    humanAudio += 1;
    const missing = !q.sourceName || !q.sourceUrl || !q.license || !q.audioSourceKey || !q.audioUrl;
    if (missing) { brokenAudioMetadata += 1; fail(`Broken human-audio metadata: ${q.id}`); }
    if ((q.audioMaxSeconds || 0) > 20 || (q.audioMaxSeconds || 0) < 8) fail(`Audio cap outside 8–20s: ${q.id}`);
    if (["dialects", "languages"].includes(q.categoryId) && (q.audioMinSeconds || 0) < 6) fail(`Human sentence minimum too short: ${q.id}`);
    if (!/^https:\/\//.test(String(q.audioUrl || "")) && !String(q.audioUrl || "").startsWith("/api/games/majlis/human-audio")) fail(`Private bank audio locator is invalid: ${q.id}`);
  }
  if (q.categoryId === "dialects") {
    const key = String(q.audioSourceKey || "");
    const code = key.startsWith("nadi:") ? key.slice(5) : "";
    if (!nadiMap[code]) fail(`Unknown NADI dialect code: ${q.id}`);
    else if (norm(nadiMap[code]) !== norm(q.answer)) fail(`Dialect answer/source mismatch: ${q.id} ${code} -> ${q.answer}`);
    if (q.license !== "MIT") fail(`Dialect license must be MIT from NADI dataset: ${q.id}`);
  }
  if (q.categoryId === "languages") {
    if (!String(q.audioSourceKey || "").startsWith("fleurs:")) fail(`Language source must be FLEURS: ${q.id}`);
    if (!String(q.license || "").toLowerCase().includes("cc by 4.0")) fail(`Language license must be CC BY 4.0: ${q.id}`);
    if (norm(q.speechLanguage) !== norm(q.answer)) fail(`Language answer/metadata mismatch: ${q.id}`);
  }
  if (q.categoryId === "reciter") {
    if (!String(q.audioSourceKey || "").startsWith("reciter:")) fail(`Reciter source key is invalid: ${q.id}`);
    const sources = [q.audioUrl, q.audioFallbackUrl, ...(q.audioFallbacks || [])].filter(Boolean);
    if (new Set(sources).size < 3) fail(`Reciter needs three private source attempts: ${q.id}`);
  }
}

// SpeechSynthesis is allowed only for non-human demonstration questions; never dialect/language/reciter.
for (const q of active.filter((q) => q.type === "speech")) {
  if (["dialects", "languages", "reciter"].includes(q.categoryId)) fail(`TTS forbidden in human-audio category: ${q.id}`);
}

const uniqueFacts = new Set(active.map((q) => `${q.categoryId}::${factKey(q)}`)).size;
const allFamilies = new Set(active.map((q) => q.questionFamily || q.family).filter(Boolean));
const representativeFacts = [...groupMap.values()].map((rows) => rows[0]);
const hardFacts = representativeFacts.filter((q) => q.difficulty === "hard").length;
const mediumFacts = representativeFacts.filter((q) => q.difficulty === "medium").length;
const visualQuestions = active.filter((q) => q.type === "image" && q.imageUrl).length;
const duplicateVariantRows = active.length - uniqueFacts;
console.log("Majlis Bank Audit");
console.log("-----------------");
console.log(`Version: ${bank.version || "unknown"}`);
console.log(`Categories: ${categories.length}`);
console.log(`Questions: ${active.length} active / ${questions.length} total`);
console.log(`Unique facts: ${uniqueFacts}`);
console.log(`Question families: ${allFamilies.size}`);
console.log(`Human audio clips: ${humanAudio}`);
console.log(`AI/TTS audio in human categories: ${aiTts}`);
console.log(`Visual questions: ${visualQuestions}`);
console.log(`Broken audio metadata: ${brokenAudioMetadata}`);
console.log(`Broken image metadata: ${brokenImageMetadata}`);
console.log(`Answer leaks: ${answerLeakIds.size}`);
console.log(`Duplicate fact variants: ${duplicateVariantRows}`);
console.log(`Possible semantic duplicate pairs: ${semanticDuplicatePairs.length}`);
console.log(`Weak categories: ${weakCategories.size ? [...weakCategories].join(", ") : "0"}`);
console.log(`Hard ratio (unique facts): ${hardFacts}/${representativeFacts.length} (${(hardFacts / representativeFacts.length * 100).toFixed(1)}%)`);
console.log(`Medium ratio (unique facts): ${mediumFacts}/${representativeFacts.length} (${(mediumFacts / representativeFacts.length * 100).toFixed(1)}%)`);
console.log(`Rows missing source URL/license: ${missingSourceLicense}`);
console.log(`Quran required families: ${requiredQuranFamilies.length}/${requiredQuranFamilies.length}`);
console.log(`Warnings: ${warnings.length}`);
if (warnings.length) warnings.slice(0, 30).forEach((message) => console.log(`WARN: ${message}`));
if (errors.length) {
  console.error(`\nFAIL (${errors.length})`);
  errors.slice(0, 120).forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}
console.log("\nSTRUCTURAL VALIDATION: PASS");
console.log("CONTENT VERIFICATION: PARTIAL (source_checked/unverified statuses are reported, never inferred)");
const verificationCounts = new Map();
for (const q of active) verificationCounts.set(q.verifiedStatus || "unverified", (verificationCounts.get(q.verifiedStatus || "unverified") || 0) + 1);
console.log(`Verification statuses: ${[...verificationCounts].map(([key, value]) => `${key}=${value}`).join(", ")}`);
