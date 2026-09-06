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
  if (!String(q.groupKey || "").trim()) fail(`Missing groupKey: ${q.id}`);
  if (!String(q.questionFamily || q.family || "").trim()) fail(`Missing questionFamily: ${q.id}`);
  if (q.difficulty === "easy") fail(`Easy question is active: ${q.id}`);
  if (/^(?:سؤال المجلس|اختبر معلوماتك|للنقطة هذه|السؤال)\s*[:：-]?/i.test(String(q.prompt || ""))) fail(`Weak preamble in prompt: ${q.id}`);
}

// groupKey is a fact key: variants may exist, but the answer may not conflict.
const groupMap = new Map();
for (const q of active) {
  const key = `${q.categoryId}::${q.groupKey}`;
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
  promptMap.get(key).add(q.groupKey);
}
for (const [key, facts] of promptMap) if (facts.size > 1) fail(`Same prompt points to multiple facts: ${key}`);

const specialAxis = new Set(["reciter", "dialects", "languages"]);
function representatives(items) {
  const map = new Map();
  for (const q of items) if (!map.has(q.groupKey)) map.set(q.groupKey, q);
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

for (const category of categories.filter((c) => c.enabled !== false)) {
  const items = byCategory.get(category.id) || [];
  const reps = representatives(items);
  const uniqueFacts = reps.length;
  const families = new Set(reps.map((q) => q.questionFamily || q.family).filter(Boolean));
  const hard = reps.filter((q) => q.difficulty === "hard").length;
  const medium = reps.filter((q) => q.difficulty === "medium").length;
  if (uniqueFacts < 50) fail(`Weak category ${category.id}: only ${uniqueFacts} unique facts`);
  if (category.id === "quran" && uniqueFacts < 100) fail(`Quran needs >=100 unique facts, got ${uniqueFacts}`);
  if (category.id === "seerah" && uniqueFacts < 100) fail(`Seerah needs >=100 unique facts, got ${uniqueFacts}`);
  if (!specialAxis.has(category.id) && families.size < 6) fail(`Weak family diversity ${category.id}: ${families.size}`);
  if (hard < Math.ceil(uniqueFacts * 0.55)) warn(`Hard ratio is lower than preferred in ${category.id}: ${hard}/${uniqueFacts}`);
  if (medium < 1) warn(`No medium facts in ${category.id}`);
  const feasibility = canPartitionWithoutRepeat(category.id, reps);
  if (!feasibility.ok) fail(`Cannot guarantee 6-session diversity for ${category.id}: axes=${feasibility.axes}, maxBucket=${feasibility.max}, sessions=${feasibility.sessions}`);
  if (!category.imageUrl || !category.imageSourceUrl || !category.imageLicense) fail(`Category missing real-image attribution: ${category.id}`);
}

// Quran-specific anti-monotony and reveal metadata.
const quran = active.filter((q) => q.categoryId === "quran");
for (const fam of ["quran-ayah-count", "quran-surah-order"]) {
  const n = representatives(quran.filter((q) => (q.questionFamily || q.family) === fam)).length;
  if (n > 10) fail(`Quran family ${fam} is overrepresented: ${n}`);
}
for (const fam of ["quran_complete_verse", "quran_people", "quran_vocabulary", "quran_story"]) {
  if (!quran.some((q) => (q.questionFamily || q.family) === fam)) fail(`Missing Quran family: ${fam}`);
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
    if ((q.audioMaxSeconds || 0) > 15 || (q.audioMaxSeconds || 0) < 8) fail(`Audio cap outside 8–15s: ${q.id}`);
    if (["dialects", "languages"].includes(q.categoryId) && (q.audioMinSeconds || 0) < 6) fail(`Human sentence minimum too short: ${q.id}`);
    if (["dialects", "languages"].includes(q.categoryId) && !String(q.audioUrl).startsWith("/api/games/majlis/human-audio?questionId=")) fail(`Client audio is not proxied: ${q.id}`);
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
  if (q.categoryId === "reciter" && !String(q.audioSourceKey || "").startsWith("reciter:")) fail(`Reciter must be server-proxied: ${q.id}`);
}

// SpeechSynthesis is allowed only for non-human demonstration questions; never dialect/language/reciter.
for (const q of active.filter((q) => q.type === "speech")) {
  if (["dialects", "languages", "reciter"].includes(q.categoryId)) fail(`TTS forbidden in human-audio category: ${q.id}`);
}

const uniqueFacts = new Set(active.map((q) => `${q.categoryId}::${q.groupKey}`)).size;
const allFamilies = new Set(active.map((q) => q.questionFamily || q.family).filter(Boolean));
console.log("Majlis Bank Audit");
console.log("-----------------");
console.log(`Version: ${bank.version || "unknown"}`);
console.log(`Categories: ${categories.length}`);
console.log(`Questions: ${active.length} active / ${questions.length} total`);
console.log(`Unique facts: ${uniqueFacts}`);
console.log(`Question families: ${allFamilies.size}`);
console.log(`Human audio clips: ${humanAudio}`);
console.log(`AI/TTS audio in human categories: ${aiTts}`);
console.log(`Broken audio metadata: ${brokenAudioMetadata}`);
console.log(`Warnings: ${warnings.length}`);
if (warnings.length) warnings.slice(0, 30).forEach((message) => console.log(`WARN: ${message}`));
if (errors.length) {
  console.error(`\nFAIL (${errors.length})`);
  errors.slice(0, 120).forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}
console.log("\nPASS");
