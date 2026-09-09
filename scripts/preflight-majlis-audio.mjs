import fs from "node:fs";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";

const bank = JSON.parse(fs.readFileSync(new URL("../src/data/majlisQuestionBank.json", import.meta.url), "utf8"));
const failures = [];
const checks = [];

function findAudioSrc(value) {
  if (!value) return "";
  if (typeof value === "string") return value.startsWith("https://") ? value : "";
  if (Array.isArray(value)) {
    for (const item of value) { const found = findAudioSrc(item); if (found) return found; }
    return "";
  }
  if (typeof value === "object") {
    for (const key of ["src", "url", "href", "audio", "row", "value", "data"]) {
      const found = findAudioSrc(value[key]);
      if (found) return found;
    }
  }
  return "";
}

async function audioHead(label, url) {
  const response = await fetch(url, {
    headers: { Range: "bytes=0-2047", "User-Agent": "Altahaddi-Majlis-Preflight/18.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (!response.ok || (contentType && !contentType.startsWith("audio/") && !contentType.includes("octet-stream"))) {
    throw new Error(`${label}: HTTP ${response.status}, ${contentType || "no content-type"}`);
  }
  await response.body?.cancel();
  checks.push(`${label}: ${response.status} ${contentType || "binary"}`);
}

async function datasetAudio(label, params) {
  const response = await fetch(`https://datasets-server.huggingface.co/rows?${params}`, {
    headers: { "User-Agent": "Altahaddi-Majlis-Preflight/18.0" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${label}: dataset HTTP ${response.status}`);
  const json = await response.json();
  const source = findAudioSrc(json.rows?.[0]);
  if (!source) throw new Error(`${label}: no human audio URL returned`);
  await audioHead(label, source);
}

async function fleursArchive(label, config) {
  const response = await fetch(`https://huggingface.co/datasets/google/fleurs/resolve/main/data/${config}/audio/dev.tar.gz`, {
    headers: { "User-Agent": "Altahaddi-Majlis-Preflight/18.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok || !response.body) throw new Error(`${label}: archive HTTP ${response.status}`);
  const input = Readable.fromWeb(response.body);
  const gunzip = createGunzip();
  input.pipe(gunzip);
  let pending = Buffer.alloc(0);
  let remaining = 0;
  let padding = 0;
  let capture = false;
  let wavIndex = 0;
  let wavBytes = 0;
  let scanned = 0;
  try {
    for await (const rawChunk of gunzip) {
      const chunk = Buffer.from(rawChunk);
      scanned += chunk.length;
      if (scanned > 64 * 1024 * 1024) throw new Error(`${label}: archive scan limit`);
      pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
      while (pending.length) {
        if (remaining > 0) {
          const take = Math.min(remaining, pending.length);
          if (capture) wavBytes += take;
          pending = pending.subarray(take);
          remaining -= take;
          if (remaining === 0 && capture) {
            if (wavBytes < 44) throw new Error(`${label}: invalid WAV payload`);
            checks.push(`${label}: streamed WAV (${wavBytes} bytes)`);
            return;
          }
          continue;
        }
        if (padding > 0) {
          const take = Math.min(padding, pending.length);
          pending = pending.subarray(take);
          padding -= take;
          continue;
        }
        if (pending.length < 512) break;
        const header = pending.subarray(0, 512);
        pending = pending.subarray(512);
        const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
        const size = Number.parseInt(header.subarray(124, 136).toString("ascii").replace(/\0.*$/, "").trim() || "0", 8);
        if (!Number.isFinite(size) || size < 0 || size > 8 * 1024 * 1024) throw new Error(`${label}: invalid TAR entry`);
        const isWav = /\.wav$/i.test(name);
        capture = isWav && wavIndex === 1;
        if (isWav) wavIndex += 1;
        remaining = size;
        padding = (512 - (size % 512)) % 512;
      }
    }
  } finally {
    gunzip.destroy();
    input.destroy();
  }
  throw new Error(`${label}: no WAV found`);
}

const reciters = bank.questions.filter((q) => q.enabled !== false && q.categoryId === "reciter");
const voiceSamples = [];
const seenVoices = new Set();
for (const question of reciters) {
  if (seenVoices.has(question.answer)) continue;
  seenVoices.add(question.answer);
  voiceSamples.push(question);
  if (voiceSamples.length === 12) break;
}

const reciterJobs = [];
for (const question of voiceSamples) {
  const sources = [question.audioUrl, question.audioFallbackUrl, ...(question.audioFallbacks || [])].filter(Boolean).slice(0, 3);
  sources.forEach((url, index) => reciterJobs.push(audioHead(`${question.answer} / source ${index + 1} / ${question.id}`, url)));
}
const datasetJobs = [];
for (const [code, offset] of [["KSA", 23000], ["EGY", 14000], ["MOR", 38000]]) {
  datasetJobs.push(() => datasetAudio(`nadi-${code}`, `dataset=UBC-NLP%2FNADI_2026_ADI20_micro&config=default&split=train&offset=${offset}&length=1`));
}
for (const config of ["en_us", "fr_fr", "ja_jp"]) {
  datasetJobs.push(() => fleursArchive(`fleurs-${config}`, config));
}

const results = await Promise.allSettled(reciterJobs);
results.forEach((result) => { if (result.status === "rejected") failures.push(result.reason instanceof Error ? result.reason.message : String(result.reason)); });
for (const job of datasetJobs) {
  try { await job(); }
  catch (error) { failures.push(error instanceof Error ? error.message : String(error)); }
}

console.log("Majlis Human Audio Preflight");
console.log("----------------------------");
console.log(`Checks passed: ${checks.length}/${reciterJobs.length + datasetJobs.length}`);
checks.forEach((item) => console.log(`PASS: ${item}`));
if (failures.length) {
  console.error(`\nNETWORK VALIDATION: FAIL (${failures.length})`);
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log("\nNETWORK VALIDATION: PASS");
