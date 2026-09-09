import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const bank = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "majlisQuestionBank.json"), "utf8"));
const routeSource = fs.readFileSync(path.join(root, "src", "app", "api", "games", "majlis", "route.ts"), "utf8");
const audioRouteSource = fs.readFileSync(path.join(root, "src", "app", "api", "games", "majlis", "human-audio", "route.ts"), "utf8");
const imageRouteSource = fs.readFileSync(path.join(root, "src", "app", "api", "games", "majlis", "question-image", "route.ts"), "utf8");
const clientSource = fs.readFileSync(path.join(root, "src", "components", "majlis", "MajlisGame.tsx"), "utf8");

let seed = 0x5eed1234;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
function shuffle(items) {
  const list = [...items];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [list[index], list[target]] = [list[target], list[index]];
  }
  return list;
}
const factKey = (q) => q.factKey || q.groupKey;
const axis = (q) => ["reciter", "dialects", "languages"].includes(q.categoryId)
  ? `answer:${q.answer}`
  : `family:${q.questionFamily || q.family}`;

function representativeGroups(categoryId) {
  const map = new Map();
  for (const q of bank.questions.filter((row) => row.enabled !== false && row.difficulty !== "easy" && row.categoryId === categoryId)) {
    const key = factKey(q);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(q);
  }
  return map;
}

function pickGroupKeys(groupMap, candidates, count, excluded = new Set(), excludedAxes = new Set()) {
  const qFor = (key) => groupMap.get(key)?.[0];
  const axisBuckets = new Map();
  for (const key of candidates.filter((item) => !excluded.has(item))) {
    const keyAxis = axis(qFor(key));
    if (excludedAxes.has(keyAxis)) continue;
    if (!axisBuckets.has(keyAxis)) axisBuckets.set(keyAxis, []);
    axisBuckets.get(keyAxis).push(key);
  }
  const axes = shuffle([...axisBuckets.entries()]).sort((a, b) => b[1].length - a[1].length);
  if (count === 6 && excludedAxes.size === 0) {
    const available = [...axisBuckets.values()].flat();
    const mediumAvailable = available.filter((key) => qFor(key)?.difficulty === "medium").length;
    const sessionsLeft = Math.max(1, Math.ceil(available.length / 6));
    const targetMedium = mediumAvailable === 0 ? 0 : Math.max(1, Math.min(2, Math.round(mediumAvailable / sessionsLeft)));
    const selectedAxes = axes.slice(0, 6);
    const forcedMedium = selectedAxes.filter(([, bucket]) => !bucket.some((key) => qFor(key)?.difficulty === "hard"));
    const mediumCapable = selectedAxes.filter(([, bucket]) => bucket.some((key) => qFor(key)?.difficulty === "medium"));
    const mediumCount = Math.max(forcedMedium.length, Math.min(targetMedium, mediumCapable.length));
    const mediumAxes = new Set(forcedMedium.map(([keyAxis]) => keyAxis));
    const optionalMedium = shuffle(mediumCapable.filter(([keyAxis]) => !mediumAxes.has(keyAxis)))
      .sort(([, left], [, right]) => (right.filter((key) => qFor(key)?.difficulty === "medium").length / right.length) - (left.filter((key) => qFor(key)?.difficulty === "medium").length / left.length));
    optionalMedium.slice(0, Math.max(0, mediumCount - mediumAxes.size)).forEach(([keyAxis]) => mediumAxes.add(keyAxis));
    const exactSelection = selectedAxes.map(([keyAxis, bucket]) => {
      const randomized = shuffle(bucket);
      const wanted = mediumAxes.has(keyAxis) ? "medium" : "hard";
      return randomized.find((key) => qFor(key)?.difficulty === wanted) || randomized[0];
    }).filter(Boolean);
    if (exactSelection.length === 6) return shuffle(exactSelection);
  }
  const selected = [];
  let hardCount = 0;
  const targetHard = Math.min(4, count);
  for (const [, bucket] of axes) {
    if (selected.length >= count) break;
    const randomized = shuffle(bucket);
    const key = hardCount < targetHard
      ? randomized.find((item) => qFor(item)?.difficulty === "hard") || randomized.find((item) => qFor(item)?.difficulty === "medium") || randomized[0]
      : randomized.find((item) => qFor(item)?.difficulty === "medium") || randomized[0];
    if (!key) continue;
    selected.push(key);
    if (qFor(key)?.difficulty === "hard") hardCount += 1;
  }
  if (hardCount < Math.min(4, count)) {
    for (let index = 0; index < selected.length && hardCount < Math.min(4, count); index += 1) {
      if (qFor(selected[index])?.difficulty === "hard") continue;
      const keyAxis = axis(qFor(selected[index]));
      const hard = axisBuckets.get(keyAxis)?.find((key) => qFor(key)?.difficulty === "hard");
      if (hard && !selected.includes(hard)) {
        selected[index] = hard;
        hardCount += 1;
      }
    }
  }
  if (hardCount === count && count > 1) {
    for (let index = selected.length - 1; index >= 0; index -= 1) {
      const keyAxis = axis(qFor(selected[index]));
      const medium = axisBuckets.get(keyAxis)?.find((key) => qFor(key)?.difficulty === "medium" && !selected.includes(key));
      if (medium) {
        selected[index] = medium;
        hardCount -= 1;
        break;
      }
    }
  }
  return selected.slice(0, count);
}

const errors = [];
const activeCategories = bank.categories.filter((category) => category.enabled !== false);
const state = new Map(activeCategories.map((category) => [category.id, { used: new Set(), cycle: 1 }]));
const maps = new Map(activeCategories.map((category) => [category.id, representativeGroups(category.id)]));
let selectedQuestions = 0;
let completedCycles = 0;
let allHardSessions = 0;
let nonIdealMixSessions = 0;
let categorySessions = 0;

const GAME_COUNT = 10_000;
for (let game = 0; game < GAME_COUNT; game += 1) {
  const gameCategories = shuffle(activeCategories).slice(0, Math.min(5, activeCategories.length));
  for (const category of gameCategories) {
    const groupMap = maps.get(category.id);
    const cycleState = state.get(category.id);
    const allKeys = [...groupMap.keys()];
    const remaining = allKeys.filter((key) => !cycleState.used.has(key));
    const first = pickGroupKeys(groupMap, remaining, Math.min(6, remaining.length));
    if (first.length < Math.min(6, remaining.length)) {
      errors.push(`${category.id}: cycle tail could not consume every unseen fact (${first.length}/${Math.min(6, remaining.length)})`);
      break;
    }
    const selected = [...first];
    const axes = new Set(selected.map((key) => axis(groupMap.get(key)?.[0])));
    if (selected.length < 6) {
      completedCycles += 1;
      cycleState.cycle += 1;
      cycleState.used = new Set();
      selected.push(...pickGroupKeys(groupMap, allKeys, 6 - selected.length, new Set(selected), axes));
    }
    if (selected.length !== 6) errors.push(`${category.id}: session has ${selected.length} questions`);
    if (new Set(selected).size !== selected.length) errors.push(`${category.id}: duplicate fact inside a session`);
    const selectedAxes = selected.map((key) => axis(groupMap.get(key)?.[0]));
    if (new Set(selectedAxes).size !== selectedAxes.length) errors.push(`${category.id}: repeated family/voice inside a session`);
    const hard = selected.filter((key) => groupMap.get(key)?.[0]?.difficulty === "hard").length;
    if (hard < 4) nonIdealMixSessions += 1;
    if (hard === 6) allHardSessions += 1;
    categorySessions += 1;
    const nextUsed = first.length < 6 ? selected.slice(first.length) : [...cycleState.used, ...selected];
    cycleState.used = new Set(nextUsed);
    selectedQuestions += selected.length;
    if (errors.length) break;
  }
  if (errors.length) break;
}

const safeStart = routeSource.indexOf("function safeQuestion(");
const safeEnd = routeSource.indexOf("function pointsFor", safeStart);
const safeBody = routeSource.slice(safeStart, safeEnd);
for (const forbidden of ["answer:", "hint:", "options:", "sourceLabel:", "sourceUrl:", "license:", "factKey:", "groupKey:", "audioSourceKey:", "reciterName:", "speechLanguage:"]) {
  if (safeBody.includes(forbidden)) errors.push(`safeQuestion serializes forbidden field: ${forbidden}`);
}
if (!routeSource.includes("const row = privateSessionRow(data, questionId, controlToken)")) errors.push("Reveal endpoint is not protected by the session control token");
if (audioRouteSource.includes("searchParams.get(\"questionId\")")) errors.push("Audio proxy still accepts a revealing questionId");
if (!audioRouteSource.includes("searchParams.get(\"audioId\")")) errors.push("Audio proxy does not require an opaque audioId");
if (imageRouteSource.includes("searchParams.get(\"questionId\")")) errors.push("Image proxy still accepts a revealing questionId");
if (!imageRouteSource.includes("searchParams.get(\"imageId\")")) errors.push("Image proxy does not require an opaque imageId");
if (!clientSource.includes('if(state==="playing"){if(timerPaused)')) errors.push("Audio timer is not gated on the HTMLAudio playing state");
if (categorySessions && (categorySessions - allHardSessions - nonIdealMixSessions) / categorySessions < 0.9) errors.push("Fewer than 90% of category rounds meet the 4–5 Hard target");

console.log("Majlis Session Simulation");
console.log("-------------------------");
console.log(`Games simulated: ${GAME_COUNT}`);
console.log(`Question seats checked: ${selectedQuestions}`);
console.log(`Global cycles crossed: ${completedCycles}`);
console.log(`Target 4–5 Hard mix: ${categorySessions - allHardSessions - nonIdealMixSessions}/${categorySessions} (${(((categorySessions - allHardSessions - nonIdealMixSessions) / categorySessions) * 100).toFixed(2)}%)`);
console.log(`All-hard category rounds: ${allHardSessions}`);
console.log(`Rounds below four Hard: ${nonIdealMixSessions}`);
console.log("Client payload denylist: checked");
console.log("Opaque audio routing: checked");
console.log("Opaque image routing: checked");
console.log("Audio playing-gated timer: checked");
if (errors.length) {
  console.error(`\nFAIL (${errors.length})`);
  errors.slice(0, 40).forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log("\nSIMULATION: PASS");
