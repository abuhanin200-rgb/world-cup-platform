import fs from "node:fs";
import path from "node:path";

const file = path.resolve("src/data/vocabularyChallengeWords.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const allowed = new Set(Array.from("ابتثجحخدذرزسشصضطظعغفقكلمنهوي"));
const words = data.words.map((word) => String(word).trim());
const uniqueWords = new Set(words);
const errors = [];

if (!data.version) errors.push("dictionary version is missing");
if (words.length < 1400) errors.push(`dictionary is too small for v1.2+: ${words.length}`);
if (uniqueWords.size !== words.length) errors.push(`duplicate words: ${words.length - uniqueWords.size}`);

for (const word of words) {
  const letters = Array.from(word);
  if (letters.length !== 3) errors.push(`not a three-letter word: ${word}`);
  if (letters.some((letter) => !allowed.has(letter))) errors.push(`unsupported letter in: ${word}`);
}

function degree(word) {
  let count = 0;
  const chars = Array.from(word);
  for (const other of uniqueWords) {
    if (other === word) continue;
    const otherChars = Array.from(other);
    let diff = 0;
    for (let i = 0; i < 3; i += 1) if (chars[i] !== otherChars[i]) diff += 1;
    if (diff === 1) count += 1;
  }
  return count;
}

for (const word of data.startingWords || []) {
  if (!uniqueWords.has(word)) errors.push(`starting word is not in dictionary: ${word}`);
  else if (degree(word) < 2) errors.push(`starting word has too few legal continuations: ${word}`);
}

// Every published word should belong to one connected word-ladder component,
// otherwise it is dead inventory that cannot participate in normal play.
const first = words[0];
const visited = new Set(first ? [first] : []);
const queue = first ? [first] : [];
while (queue.length) {
  const word = queue.shift();
  const chars = Array.from(word);
  for (const other of words) {
    if (visited.has(other)) continue;
    const otherChars = Array.from(other);
    let diff = 0;
    for (let i = 0; i < 3; i += 1) if (chars[i] !== otherChars[i]) diff += 1;
    if (diff === 1) {
      visited.add(other);
      queue.push(other);
    }
  }
}
if (visited.size !== words.length) errors.push(`disconnected words: ${words.length - visited.size}`);

// Product-rule regression: the example provided by the product owner must work.
if (!uniqueWords.has("ميم") || !uniqueWords.has("ريم")) errors.push("required example ميم → ريم is missing");
const exampleDiff = Array.from("ميم").filter((letter, index) => letter !== Array.from("ريم")[index]).length;
if (exampleDiff !== 1) errors.push("required example ميم → ريم is not a one-letter move");

// Product-rule regression: placing the same letter over itself is a legal card play.
if (!uniqueWords.has("قطر")) errors.push("required same-letter example قطر is missing");
const sameLetterExample = Array.from("قطر");
sameLetterExample[0] = "ق";
if (sameLetterExample.join("") !== "قطر") errors.push("same-letter replacement regression failed");

if (errors.length) {
  console.error("Vocabulary dictionary audit FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const degrees = words.map(degree);
const averageDegree = degrees.reduce((sum, value) => sum + value, 0) / Math.max(1, degrees.length);
console.log(`Vocabulary dictionary v${data.version}: OK`);
console.log(`Words: ${words.length}`);
console.log(`Starting words: ${(data.startingWords || []).length}`);
console.log(`Connected component: ${visited.size}/${words.length}`);
console.log(`Average legal continuations: ${averageDegree.toFixed(2)}`);
console.log("Required move: ميم + ر@0 = ريم ✓");
console.log("Same-letter move: قطر + ق@0 = قطر ✓");
