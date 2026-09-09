import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import {
  getEffectiveMajlisBank,
  getMajlisSettings,
  majlisBankSummary,
} from "@/lib/serverMajlisQuestionBank";
import type {
  MajlisClientQuestion,
  MajlisDifficulty,
  MajlisGameStartResponse,
  MajlisAssistPayload,
  MajlisOnlinePublicState,
  MajlisOnlineRoom,
  MajlisVoiceMode,
} from "@/types/majlisGame";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SESSION_COLLECTION = "majlisGameSessions";
const ONLINE_ROOM_COLLECTION = "majlisOnlineRooms";
const GLOBAL_CYCLE_COLLECTION = "majlisGlobalQuestionCycles";
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const ONLINE_ROOM_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const ONLINE_PLAYER_LIMIT = 16;

function text(value: unknown) { return String(value ?? "").trim(); }
function number(value: unknown, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }

function shuffle<T>(items: T[]) {
  const list = [...items];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [list[index], list[target]] = [list[target], list[index]];
  }
  return list;
}

function cleanPrompt(value: string) {
  return value.replace(/^(?:سؤال المجلس|اختبر معلوماتك|للنقطة هذه|السؤال)\s*[:：-]?\s*/i, "").trim();
}

function normalizedArabic(value: unknown) {
  return text(value).toLocaleLowerCase("ar").replace(/[\u064B-\u065F\u0670]/g, "").replace(/[إأآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function quranQuoteIsSafe(question: BankQuestion) {
  if (!question.quoteText) return false;
  if (question.questionFamily === "quran_complete_verse") return false;
  const answer = normalizedArabic(question.answer).replace(/^سوره\s+/, "");
  const quote = normalizedArabic(question.quoteText);
  return answer.length < 3 || !quote.includes(answer);
}

function sessionTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function safeQuestion(
  question: Awaited<ReturnType<typeof getEffectiveMajlisBank>>["questions"][number],
  points: number,
  sessionId: string,
  audioId?: string,
  imageId?: string,
): MajlisClientQuestion {
  const mustProxyAudio = question.type === "audio" && Boolean(audioId);
  const audioPath = mustProxyAudio
    ? `/api/games/majlis/human-audio?sessionId=${encodeURIComponent(sessionId)}&audioId=${encodeURIComponent(audioId!)}`
    : undefined;
  return {
    id: question.id,
    categoryId: question.categoryId,
    questionFamily: question.questionFamily,
    family: question.questionFamily,
    prompt: cleanPrompt(question.prompt),
    difficulty: question.difficulty,
    points,
    hasHint: Boolean(text(question.hint)),
    optionsCount: question.options?.length || 0,
    type: question.type,
    // Quran quoteText historically contained the complete verse. The prompt already carries the
    // safe stem, so Quran reveal material is never serialized into the initial client payload.
    quoteText: question.categoryId === "quran" ? (quranQuoteIsSafe(question) ? question.quoteText : undefined) : question.quoteText,
    imageId,
    imageUrl: imageId ? `/api/games/majlis/question-image?sessionId=${encodeURIComponent(sessionId)}&imageId=${encodeURIComponent(imageId)}` : undefined,
    imageAlt: imageId ? "صورة السؤال" : undefined,
    audioId,
    audioUrl: audioPath,
    audioFallbackUrl: audioPath ? `${audioPath}&retry=1` : undefined,
    audioStartSeconds: question.audioStartSeconds,
    audioMaxSeconds: question.audioMaxSeconds,
    audioMinSeconds: question.audioMinSeconds,
    audioDuration: question.audioDuration,
    speechText: question.speechText,
    speechLang: question.speechLang,
  };
}

function pointsFor(difficulty: MajlisDifficulty, settings: Awaited<ReturnType<typeof getMajlisSettings>>) {
  return difficulty === "hard" ? settings.hardPoints : difficulty === "medium" ? settings.mediumPoints : settings.easyPoints;
}

type BankQuestion = Awaited<ReturnType<typeof getEffectiveMajlisBank>>["questions"][number];

function representativeGroups(items: BankQuestion[]) {
  const map = new Map<string, BankQuestion[]>();
  for (const item of items.filter((question) => question.enabled && question.difficulty !== "easy")) {
    const key = item.factKey || item.groupKey;
    const list = map.get(key) || [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

function diversityAxis(question: BankQuestion | undefined) {
  if (!question) return "unknown";
  if (["reciter", "dialects", "languages"].includes(question.categoryId)) return `answer:${question.answer}`;
  return `family:${question.questionFamily || question.family || `${question.categoryId}-general`}`;
}

function pickGroupKeys(
  groupMap: Map<string, BankQuestion[]>,
  candidates: string[],
  count: number,
  excluded = new Set<string>(),
  excludedAxes = new Set<string>(),
) {
  const keys = candidates.filter((key) => !excluded.has(key));
  const qFor = (key: string) => groupMap.get(key)?.[0];
  const axisBuckets = new Map<string, string[]>();
  for (const key of keys) {
    const axis = diversityAxis(qFor(key));
    if (excludedAxes.has(axis)) continue;
    const bucket = axisBuckets.get(axis) || [];
    bucket.push(key);
    axisBuckets.set(axis, bucket);
  }

  // Pick from the most populated diversity axes first. This keeps the end of a Global Cycle
  // balanced, so a six-question session can keep six distinct patterns all the way to the tail.
  const axes = shuffle([...axisBuckets.entries()])
    .sort((a, b) => b[1].length - a[1].length);

  // For a complete board column, reserve Medium facts across the remaining
  // Global Cycle instead of spending them early by chance. Always consume the
  // six largest axes so the cycle tail remains partitionable.
  if (count === 6 && excludedAxes.size === 0) {
    const available = [...axisBuckets.values()].flat();
    const mediumAvailable = available.filter((key) => qFor(key)?.difficulty === "medium").length;
    const sessionsLeft = Math.max(1, Math.ceil(available.length / 6));
    const targetMedium = mediumAvailable === 0 ? 0 : Math.max(1, Math.min(2, Math.round(mediumAvailable / sessionsLeft)));
    const selectedAxes = axes.slice(0, 6);
    const forcedMedium = selectedAxes.filter(([, bucket]) => !bucket.some((key) => qFor(key)?.difficulty === "hard"));
    const mediumCapable = selectedAxes.filter(([, bucket]) => bucket.some((key) => qFor(key)?.difficulty === "medium"));
    const mediumCount = Math.max(forcedMedium.length, Math.min(targetMedium, mediumCapable.length));
    const mediumAxes = new Set(forcedMedium.map(([axis]) => axis));
    const optionalMedium = shuffle(mediumCapable.filter(([axis]) => !mediumAxes.has(axis)))
      .sort(([, left], [, right]) => {
        const leftRatio = left.filter((key) => qFor(key)?.difficulty === "medium").length / left.length;
        const rightRatio = right.filter((key) => qFor(key)?.difficulty === "medium").length / right.length;
        return rightRatio - leftRatio;
      });
    optionalMedium.slice(0, Math.max(0, mediumCount - mediumAxes.size)).forEach(([axis]) => mediumAxes.add(axis));
    const exactSelection = selectedAxes.map(([axis, bucket]) => {
      const randomized = shuffle(bucket);
      const wanted = mediumAxes.has(axis) ? "medium" : "hard";
      return randomized.find((key) => qFor(key)?.difficulty === wanted) || randomized[0];
    }).filter(Boolean) as string[];
    if (exactSelection.length === 6) {
      return shuffle(exactSelection);
    }
  }

  const selected: string[] = [];
  const targetHard = Math.min(4, count);
  let hardCount = 0;

  const chooseFromBucket = (bucket: string[], preferHard: boolean) => {
    const shuffled = shuffle(bucket);
    if (preferHard) {
      const hard = shuffled.find((key) => qFor(key)?.difficulty === "hard");
      if (hard) return hard;
    }
    return shuffled.find((key) => qFor(key)?.difficulty === "medium") || shuffled[0];
  };

  // Largest axes go first so the Global Cycle tail remains partitionable without repeats.
  for (const [, bucket] of axes) {
    if (selected.length >= count) break;
    const key = chooseFromBucket(bucket, hardCount < targetHard);
    if (!key) continue;
    selected.push(key);
    if (qFor(key)?.difficulty === "hard") hardCount += 1;
  }

  // If hard ratio is still low, swap medium selections with hard candidates from the same axis.
  if (hardCount < Math.min(4, count)) {
    for (let i = 0; i < selected.length && hardCount < Math.min(4, count); i += 1) {
      if (qFor(selected[i]!)?.difficulty === "hard") continue;
      const axis = diversityAxis(qFor(selected[i]!));
      const hard = axisBuckets.get(axis)?.find((key) => qFor(key)?.difficulty === "hard");
      if (hard && !selected.includes(hard)) { selected[i] = hard; hardCount += 1; }
    }
  }
  // Keep one medium seat whenever the category has one, without sacrificing axis diversity.
  if (hardCount === count && count > 1) {
    for (let index = selected.length - 1; index >= 0; index -= 1) {
      const axis = diversityAxis(qFor(selected[index]!));
      const medium = axisBuckets.get(axis)?.find((key) => qFor(key)?.difficulty === "medium" && !selected.includes(key));
      if (medium) { selected[index] = medium; hardCount -= 1; break; }
    }
  }
  return selected.slice(0, count);
}

async function startGame(categoryIds: string[]): Promise<MajlisGameStartResponse> {
  const [bank, settings] = await Promise.all([getEffectiveMajlisBank(), getMajlisSettings()]);
  const activeCategories = bank.categories.filter((category) => category.enabled);
  const validIds = Array.from(new Set(categoryIds.map((item) => text(item)).filter(Boolean)));
  const wantedCount = settings.categoriesPerGame;
  if (validIds.length !== wantedCount) throw new Error(`اختر ${wantedCount} فئات بالضبط قبل بدء المجلس.`);

  const categories = validIds
    .map((id) => activeCategories.find((category) => category.id === id))
    .filter((category): category is NonNullable<typeof category> => Boolean(category));
  if (categories.length !== wantedCount) throw new Error("إحدى الفئات المختارة غير متاحة الآن.");

  const groupMaps = new Map<string, Map<string, BankQuestion[]>>();
  for (const category of categories) {
    const map = representativeGroups(bank.questions.filter((question) => question.categoryId === category.id));
    if (map.size < 6) throw new Error(`الفئة «${category.title}» لا تحتوي معلومات مستقلة كافية لبدء جولة كاملة.`);
    groupMaps.set(category.id, map);
  }

  const sessionId = randomUUID();
  const controlToken = `${randomUUID()}${randomUUID()}`;
  const createdAt = Date.now();
  const sessionRef = adminDb.collection(SESSION_COLLECTION).doc(sessionId);

  const allocated = await adminDb.runTransaction(async (transaction) => {
    // Firestore requires transaction reads before writes. Read every category cycle first.
    const cycleSnaps = new Map<string, unknown>();
    for (const category of categories) {
      const cycleRef = adminDb.collection(GLOBAL_CYCLE_COLLECTION).doc(category.id);
      cycleSnaps.set(category.id, await transaction.get(cycleRef));
    }

    const selectedByCategory = new Map<string, BankQuestion[]>();
    for (const category of categories) {
      const groupMap = groupMaps.get(category.id)!;
      const allKeys = [...groupMap.keys()];
      const snap = cycleSnaps.get(category.id) as { data(): Record<string, unknown> | undefined };
      const raw = snap.data() || {};
      let cycle = Math.max(1, Math.floor(number(raw.cycle, 1)));
      let usedKeys = new Set(Array.isArray(raw.usedGroupKeys) ? raw.usedGroupKeys.map(String).filter((key) => groupMap.has(key)) : []);
      // V17 changed fact/family composition substantially. Reset old V15/V16 cycle state once,
      // otherwise a legacy tail can be mathematically impossible to distribute without repeats.
      if (text(raw.bankVersion) !== "18") {
        cycle += 1;
        usedKeys = new Set<string>();
      }
      const selectedKeys: string[] = [];
      let resetOccurred = false;

      const remaining = allKeys.filter((key) => !usedKeys.has(key));
      const first = pickGroupKeys(groupMap, remaining, Math.min(6, remaining.length));
      selectedKeys.push(...first);

      const selectedAxes = new Set(selectedKeys.map((key) => diversityAxis(groupMap.get(key)?.[0])));
      if (selectedKeys.length < 6) {
        // Every remaining unseen fact is used first. The new cycle only fills the empty seats and
        // excludes the patterns already present in this session.
        cycle += 1;
        resetOccurred = true;
        usedKeys = new Set<string>();
        const fill = pickGroupKeys(groupMap, allKeys, 6 - selectedKeys.length, new Set(selectedKeys), selectedAxes);
        selectedKeys.push(...fill);
      }
      if (selectedKeys.length < 6) throw new Error(`الفئة «${category.title}» لا تحتوي ست معلومات مستقلة.`);

      const nextUsed = resetOccurred
        ? selectedKeys.slice(first.length)
        : [...usedKeys, ...selectedKeys];
      transaction.set(adminDb.collection(GLOBAL_CYCLE_COLLECTION).doc(category.id), {
        categoryId: category.id,
        cycle,
        usedGroupKeys: Array.from(new Set(nextUsed)),
        totalGroups: allKeys.length,
        bankVersion: "18",
        updatedAt: createdAt,
      }, { merge: true });

      const rows = selectedKeys.map((key) => {
        const variants = groupMap.get(key) || [];
        // عند وجود عدة صياغات للمعلومة نفسها نستخدم الصياغة الأساسية المباشرة.
        return [...variants].sort((a, b) => a.id.localeCompare(b.id))[0];
      }).filter(Boolean) as BankQuestion[];
      selectedByCategory.set(category.id, shuffle(rows));
    }

    const revealRows = [] as Array<Record<string, unknown>>;
    const audioAssets = [] as Array<Record<string, unknown>>;
    const audioIds = new Map<string, string>();
    const imageAssets = [] as Array<Record<string, unknown>>;
    const imageIds = new Map<string, string>();
    for (const rows of selectedByCategory.values()) {
      rows.forEach((question) => {
        revealRows.push({
          questionId: question.id,
          answer: question.answer,
          hint: question.hint || "",
          options: question.options || [],
          explanation: question.explanation || "",
          sourceLabel: question.sourceLabel || "",
          sourceName: question.sourceName || "",
          sourceUrl: question.sourceUrl || "",
          license: question.license || "",
          quranSurah: question.quranSurah || "",
          quranAyah: question.quranAyah || null,
          quranText: question.quranText || "",
          quranPage: question.quranPage || null,
          quranImageUrl: question.quranImageUrl || "",
          imageSourceName: question.imageSourceName || "",
          imageSourceUrl: question.imageSourceUrl || "",
          imageLicense: question.imageLicense || "",
        });
        if (question.type === "audio") {
          const audioId = randomUUID();
          audioIds.set(question.id, audioId);
          audioAssets.push({
            audioId,
            questionId: question.id,
            categoryId: question.categoryId,
            audioSourceKey: question.audioSourceKey || "",
            sources: [question.audioUrl, question.audioFallbackUrl, ...(question.audioFallbacks || [])].filter(Boolean).slice(0, 3),
          });
        }
        if (question.imageUrl) {
          const imageId = randomUUID();
          imageIds.set(question.id, imageId);
          imageAssets.push({ imageId, questionId: question.id, source: question.imageUrl });
        }
      });
    }
    transaction.set(sessionRef, {
      sessionId,
      createdAt,
      expiresAt: createdAt + SESSION_MAX_AGE_MS,
      categoryIds: categories.map((category) => category.id),
      controlTokenHash: sessionTokenHash(controlToken),
      reveals: revealRows,
      audioAssets,
      imageAssets,
      usedQuestionIds: [],
    });
    return { selectedByCategory, audioIds, imageIds };
  });

  const board: Record<string, MajlisClientQuestion[]> = {};
  for (const category of categories) {
    const rows = allocated.selectedByCategory.get(category.id) || [];
    board[category.id] = rows.map((question) => safeQuestion(question, pointsFor(question.difficulty, settings), sessionId, allocated.audioIds.get(question.id), allocated.imageIds.get(question.id)));
  }
  return { sessionId, createdAt, settings, categories, board, controlToken };
}

function assertSessionControl(data: Record<string, unknown>, controlToken: string) {
  const expiresAt = Number(data.expiresAt || 0);
  if (!expiresAt || Date.now() > expiresAt) throw new Error("انتهت جلسة المجلس. ابدأ جلسة جديدة.");
  const expectedHash = text(data.controlTokenHash);
  if (!expectedHash || sessionTokenHash(controlToken) !== expectedHash) throw new Error("صلاحية إدارة السؤال غير صحيحة.");
}

function privateSessionRow(data: Record<string, unknown>, questionId: string, controlToken?: string) {
  if (controlToken) assertSessionControl(data, controlToken);
  else if (!Number(data.expiresAt) || Date.now() > Number(data.expiresAt)) throw new Error("انتهت جلسة المجلس. ابدأ جلسة جديدة.");
  const reveals = Array.isArray(data.reveals) ? data.reveals as Array<Record<string, unknown>> : [];
  const row = reveals.find((item) => text(item.questionId) === questionId);
  if (!row) throw new Error("هذا السؤال لا ينتمي إلى الجلسة الحالية.");
  return row;
}

async function revealQuestion(sessionId: string, questionId: string, controlToken?: string) {
  const ref = adminDb.collection(SESSION_COLLECTION).doc(sessionId);
  return adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) throw new Error("انتهت جلسة المجلس. ابدأ جلسة جديدة.");
    const data = snap.data() || {};
    const row = privateSessionRow(data, questionId, controlToken);
    const used = Array.isArray(data.usedQuestionIds) ? data.usedQuestionIds.map(String) : [];
    if (!used.includes(questionId)) transaction.set(ref, { usedQuestionIds: [...used, questionId], lastRevealAt: Date.now() }, { merge: true });
    return {
      questionId,
      answer: text(row.answer),
      explanation: text(row.explanation),
      sourceLabel: text(row.sourceLabel),
      sourceName: text(row.sourceName) || undefined,
      sourceUrl: text(row.sourceUrl) || undefined,
      license: text(row.license) || undefined,
      quranSurah: text(row.quranSurah) || undefined,
      quranAyah: row.quranAyah == null ? undefined : Math.max(1, Math.floor(number(row.quranAyah, 1))),
      quranText: text(row.quranText) || undefined,
      quranPage: row.quranPage == null ? undefined : Math.max(1, Math.floor(number(row.quranPage, 1))),
      quranImageUrl: text(row.quranImageUrl) || undefined,
      imageSourceName: text(row.imageSourceName) || undefined,
      imageSourceUrl: text(row.imageSourceUrl) || undefined,
      imageLicense: text(row.imageLicense) || undefined,
    };
  });
}

async function revealAssist(sessionId: string, questionId: string, controlToken: string | undefined, kind: "hint" | "options"): Promise<MajlisAssistPayload> {
  const snap = await adminDb.collection(SESSION_COLLECTION).doc(sessionId).get();
  if (!snap.exists) throw new Error("انتهت جلسة المجلس. ابدأ جلسة جديدة.");
  const row = privateSessionRow(snap.data() || {}, questionId, controlToken);
  if (kind === "hint") return { questionId, kind, hint: text(row.hint) };
  const options = Array.isArray(row.options) ? row.options.map(text).filter(Boolean).slice(0, 6) : [];
  return { questionId, kind, options };
}

function bearerToken(request: NextRequest) {
  const [scheme, token] = (request.headers.get("authorization") || "").split(" ");
  if (scheme !== "Bearer" || !token) throw new Error("UNAUTHORIZED");
  return token;
}

async function verifiedMember(request: NextRequest) {
  let decoded;
  try { decoded = await adminAuth.verifyIdToken(bearerToken(request)); }
  catch { throw new Error("UNAUTHORIZED"); }
  const snap = await adminDb.collection("users").doc(decoded.uid).get();
  if (!snap.exists) throw new Error("UNAUTHORIZED");
  const user = snap.data() || {};
  return { userId: decoded.uid, userName: text(user.fullName) || text(decoded.name) || "عضو" };
}

function normalizeTeamCount(value: unknown) { return Math.max(2, Math.min(4, Math.floor(number(value, 2)))); }
function normalizeTeamNames(value: unknown, teamCount: number) {
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: teamCount }, (_, index) => text(source[index]) || `الفريق ${index + 1}`);
}
function voiceMode(value: unknown): MajlisVoiceMode { return value === "all" ? "all" : value === "team" ? "team" : "off"; }
function roomCodeValue() { return String(Math.floor(100000 + Math.random() * 900000)); }

async function uniqueOnlineCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const roomCode = roomCodeValue();
    const snap = await adminDb.collection(ONLINE_ROOM_COLLECTION).where("roomCode", "==", roomCode).limit(4).get();
    const hasActive = snap.docs.some((doc) => { const status = text(doc.data()?.status); return status === "lobby" || status === "playing"; });
    if (!hasActive) return roomCode;
  }
  throw new Error("تعذر إنشاء كود المجلس. حاول مرة أخرى.");
}

function mapOnlineRoom(id: string, data: Record<string, unknown>): MajlisOnlineRoom {
  const playersRaw = data.players && typeof data.players === "object" ? data.players as Record<string, Record<string, unknown>> : {};
  const players = Object.fromEntries(Object.entries(playersRaw).map(([userId, player]) => [userId, {
    userId,
    userName: text(player.userName) || "عضو",
    teamId: text(player.teamId) || "team-1",
    micMode: voiceMode(player.micMode),
    joinedAt: number(player.joinedAt),
    lastSeenAt: number(player.lastSeenAt),
  }]));
  const storedSession = data.session && typeof data.session === "object" ? data.session as MajlisGameStartResponse : null;
  const publicSession = storedSession ? { ...storedSession, controlToken: undefined } : null;
  return {
    id,
    roomCode: text(data.roomCode),
    hostId: text(data.hostId),
    hostName: text(data.hostName) || "المضيف",
    status: data.status === "playing" ? "playing" : data.status === "finished" ? "finished" : data.status === "closed" ? "closed" : "lobby",
    teamCount: normalizeTeamCount(data.teamCount),
    teamNames: normalizeTeamNames(data.teamNames, normalizeTeamCount(data.teamCount)),
    selectedCategoryIds: Array.isArray(data.selectedCategoryIds) ? data.selectedCategoryIds.map(String).slice(0, 8) : [],
    players,
    session: publicSession,
    publicState: data.publicState && typeof data.publicState === "object" ? data.publicState as MajlisOnlinePublicState : null,
    createdAt: number(data.createdAt),
    updatedAt: number(data.updatedAt),
    expiresAt: number(data.expiresAt),
  };
}

async function getOnlineRoomForUser(roomId: string, userId: string) {
  const ref = adminDb.collection(ONLINE_ROOM_COLLECTION).doc(roomId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("المجلس غير موجود.");
  const room = mapOnlineRoom(snap.id, snap.data() || {});
  if (!room.players[userId]) throw new Error("أنت لست ضمن هذا المجلس.");
  if (room.expiresAt && Date.now() > room.expiresAt) throw new Error("انتهت صلاحية المجلس.");
  return { ref, room };
}

async function createOnlineRoom(userId: string, userName: string, teamCountRaw: unknown, teamNamesRaw: unknown) {
  const teamCount = normalizeTeamCount(teamCountRaw);
  const teamNames = normalizeTeamNames(teamNamesRaw, teamCount);
  const now = Date.now();
  const roomCode = await uniqueOnlineCode();
  const ref = adminDb.collection(ONLINE_ROOM_COLLECTION).doc();
  await ref.set({
    roomCode, hostId: userId, hostName: userName, status: "lobby", teamCount, teamNames,
    selectedCategoryIds: [],
    players: { [userId]: { userId, userName, teamId: "team-1", micMode: "off", joinedAt: now, lastSeenAt: now } },
    session: null, publicState: null,
    createdAt: now, updatedAt: now, expiresAt: now + ONLINE_ROOM_MAX_AGE_MS,
  });
  const snap = await ref.get();
  return mapOnlineRoom(ref.id, snap.data() || {});
}

async function joinOnlineRoom(userId: string, userName: string, code: string) {
  const query = await adminDb.collection(ONLINE_ROOM_COLLECTION).where("roomCode", "==", code).limit(1).get();
  if (query.empty) throw new Error("كود المجلس غير صحيح.");
  const ref = query.docs[0].ref;
  await adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) throw new Error("المجلس غير موجود.");
    const data = snap.data() || {};
    if (data.status === "closed" || data.status === "finished") throw new Error("هذا المجلس انتهى.");
    if (Number(data.expiresAt || 0) < Date.now()) throw new Error("انتهت صلاحية المجلس.");
    const players = data.players && typeof data.players === "object" ? structuredClone(data.players as Record<string, Record<string, unknown>>) : {};
    if (!players[userId] && Object.keys(players).length >= ONLINE_PLAYER_LIMIT) throw new Error("اكتمل عدد أعضاء المجلس.");
    const teamCount = normalizeTeamCount(data.teamCount);
    const counts = Array.from({ length: teamCount }, (_, index) => Object.values(players).filter((player) => text(player.teamId) === `team-${index + 1}`).length);
    const smallest = counts.indexOf(Math.min(...counts));
    const now = Date.now();
    players[userId] = { ...(players[userId] || {}), userId, userName, teamId: text(players[userId]?.teamId) || `team-${smallest + 1}`, micMode: voiceMode(players[userId]?.micMode), joinedAt: number(players[userId]?.joinedAt, now), lastSeenAt: now };
    transaction.set(ref, { players, updatedAt: now }, { merge: true });
  });
  const snap = await ref.get();
  return mapOnlineRoom(ref.id, snap.data() || {});
}

function sanitizePublicState(value: unknown, room: MajlisOnlineRoom): MajlisOnlinePublicState {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const phase = data.phase === "finished" ? "finished" : "board";
  const teamsRaw = Array.isArray(data.teams) ? data.teams.slice(0, 4) : [];
  const teams = teamsRaw.map((teamRaw, index) => {
    const team = teamRaw && typeof teamRaw === "object" ? teamRaw as Record<string, unknown> : {};
    const assists = team.assists && typeof team.assists === "object" ? team.assists as Record<string, unknown> : {};
    return {
      id: text(team.id) || `team-${index + 1}`,
      name: text(team.name) || `الفريق ${index + 1}`,
      score: Math.max(0, Math.floor(number(team.score))),
      accent: text(team.accent) || "#d6b16b",
      assists: { hint: assists.hint !== false, time: assists.time !== false, double: assists.double !== false, options: assists.options !== false },
    };
  });
  const requestedActive = data.activeQuestion && typeof data.activeQuestion === "object" ? data.activeQuestion as Record<string, unknown> : null;
  const activeId = text(requestedActive?.id);
  const active = activeId && room.session
    ? Object.values(room.session.board).flat().find((question) => question.id === activeId) || null
    : null;
  const revealRaw = data.reveal && typeof data.reveal === "object" ? data.reveal as Record<string, unknown> : null;
  const reveal = revealRaw && text(revealRaw.questionId) === active?.id ? {
    questionId: text(revealRaw.questionId),
    answer: text(revealRaw.answer),
    explanation: text(revealRaw.explanation),
    sourceLabel: text(revealRaw.sourceLabel),
    sourceName: text(revealRaw.sourceName) || undefined,
    sourceUrl: text(revealRaw.sourceUrl) || undefined,
    license: text(revealRaw.license) || undefined,
    quranSurah: text(revealRaw.quranSurah) || undefined,
    quranAyah: revealRaw.quranAyah == null ? undefined : Math.max(1, Math.floor(number(revealRaw.quranAyah, 1))),
    quranText: text(revealRaw.quranText) || undefined,
    quranPage: revealRaw.quranPage == null ? undefined : Math.max(1, Math.floor(number(revealRaw.quranPage, 1))),
    quranImageUrl: text(revealRaw.quranImageUrl) || undefined,
    imageSourceName: text(revealRaw.imageSourceName) || undefined,
    imageSourceUrl: text(revealRaw.imageSourceUrl) || undefined,
    imageLicense: text(revealRaw.imageLicense) || undefined,
  } : null;
  const secondsLeft = Math.max(0, Math.min(120, Math.floor(number(data.secondsLeft))));
  const timerPaused = data.timerPaused === true;
  const serverNow = Date.now();
  const playback = text(data.audioPlaybackState);
  const audioPlaybackState = playback === "loading" || playback === "playing" || playback === "buffering" || playback === "paused" || playback === "error" || playback === "ended" ? playback : "idle";
  return {
    phase, teams,
    currentTeamIndex: Math.max(0, Math.min(3, Math.floor(number(data.currentTeamIndex)))),
    usedQuestionIds: Array.isArray(data.usedQuestionIds) ? data.usedQuestionIds.map(String).slice(0, 80) : [],
    activeQuestion: active,
    questionOwnerIndex: Math.max(0, Math.min(3, Math.floor(number(data.questionOwnerIndex)))),
    answeringTeamIndex: Math.max(0, Math.min(3, Math.floor(number(data.answeringTeamIndex)))),
    secondsLeft,
    timerPaused,
    // Online clients receive a server-clock canonical deadline, not the host device clock.
    questionDeadlineAt: !active || timerPaused ? null : serverNow + secondsLeft * 1000,
    reveal,
    hintVisible: data.hintVisible === true,
    optionsVisible: data.optionsVisible === true,
    visibleHint: data.hintVisible === true ? text(data.visibleHint) || null : null,
    visibleOptions: data.optionsVisible === true && Array.isArray(data.visibleOptions) ? data.visibleOptions.map(text).filter(Boolean).slice(0, 6) : [],
    audioPlaybackState,
    doubleActive: data.doubleActive === true,
    timeBonusActive: data.timeBonusActive === true,
    stealMode: data.stealMode === true,
    finishReason: data.finishReason === "manual" ? "manual" : "complete",
    updatedAt: serverNow,
  };
}

async function generateVoiceIce() {
  const keyId = text(process.env.CLOUDFLARE_TURN_KEY_ID);
  const token = text(process.env.CLOUDFLARE_TURN_KEY_API_TOKEN);
  const fallback: RTCIceServer[] = [{ urls: ["stun:stun.cloudflare.com:3478", "stun:stun.cloudflare.com:53", "stun:stun.l.google.com:19302"] }];
  if (!keyId || !token) return { iceServers: fallback, turnEnabled: false, provider: "stun-only" as const };
  try {
    const response = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: 3600 }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`TURN_${response.status}`);
    const payload = await response.json() as { iceServers?: RTCIceServer[] };
    const rawServers = Array.isArray(payload.iceServers) && payload.iceServers.length ? payload.iceServers : fallback;
    // We use non-trickle ICE in the browser. Cloudflare notes that port 53 is blocked by browsers and can delay gathering,
    // so remove only port-53 URLs while preserving UDP/TCP/TLS TURN fallbacks.
    const iceServers = rawServers.map((server) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      const filtered = urls.filter((url) => typeof url === "string" && !/(?:\:53)(?:\?|$)/.test(url));
      return { ...server, urls: filtered.length ? filtered : urls };
    });
    return { iceServers, turnEnabled: true, provider: "cloudflare" as const };
  } catch (error) {
    console.warn("Majlis TURN fallback", error);
    return { iceServers: fallback, turnEnabled: false, provider: "stun-only" as const };
  }
}

export async function GET(request: NextRequest) {
  try {
    const view = text(request.nextUrl.searchParams.get("view"));
    if (!view) {
      const [bank, settings] = await Promise.all([getEffectiveMajlisBank(), getMajlisSettings()]);
      const categories = majlisBankSummary(bank.categories, bank.questions).filter((category) => category.enabled && category.activeQuestions >= 6);
      return NextResponse.json({ categories, settings, bankVersion: bank.version, totalQuestions: bank.questions.filter((question) => question.enabled).length }, { headers: { "Cache-Control": "no-store" } });
    }

    const member = await verifiedMember(request);
    const roomId = text(request.nextUrl.searchParams.get("roomId"));
    if (view === "online") {
      const { room } = await getOnlineRoomForUser(roomId, member.userId);
      return NextResponse.json({ room }, { headers: { "Cache-Control": "no-store" } });
    }
    if (view === "voice-ice") {
      await getOnlineRoomForUser(roomId, member.userId);
      return NextResponse.json(await generateVoiceIce(), { headers: { "Cache-Control": "no-store" } });
    }
    if (view === "voice-signals") {
      await getOnlineRoomForUser(roomId, member.userId);
      const since = Math.max(0, number(request.nextUrl.searchParams.get("since")));
      const snap = await adminDb.collection(ONLINE_ROOM_COLLECTION).doc(roomId).collection("voiceSignals").orderBy("createdAt", "desc").limit(100).get();
      const signals = snap.docs
        .map((doc): Record<string, unknown> & { id: string } => ({
          ...(doc.data() as Record<string, unknown>),
          id: doc.id,
        }))
        .filter((item) => text(item["targetUserId"]) === member.userId && number(item["createdAt"]) > since)
        .sort((a, b) => number(a["createdAt"]) - number(b["createdAt"]));
      return NextResponse.json({ signals, serverTime: Date.now() }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تحميل مجلس التحدي.";
    return NextResponse.json({ error: message === "UNAUTHORIZED" ? "سجّل الدخول أولًا." : message }, { status: message === "UNAUTHORIZED" ? 401 : 400, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const action = text(body.action);
    if (action === "start") {
      const categoryIds = Array.isArray(body.categoryIds) ? body.categoryIds.map(String) : [];
      return NextResponse.json(await startGame(categoryIds), { headers: { "Cache-Control": "no-store" } });
    }
    if (action === "reveal") {
      const sessionId = text(body.sessionId), questionId = text(body.questionId), controlToken = text(body.controlToken);
      if (!sessionId || !questionId || !controlToken) throw new Error("طلب إظهار الإجابة غير مكتمل.");
      return NextResponse.json(await revealQuestion(sessionId, questionId, controlToken), { headers: { "Cache-Control": "no-store" } });
    }
    if (action === "assist") {
      const sessionId = text(body.sessionId), questionId = text(body.questionId), controlToken = text(body.controlToken);
      const kind = body.kind === "options" ? "options" : "hint";
      if (!sessionId || !questionId || !controlToken) throw new Error("طلب المساعدة غير مكتمل.");
      return NextResponse.json(await revealAssist(sessionId, questionId, controlToken, kind), { headers: { "Cache-Control": "no-store" } });
    }
    if (action === "closeSession") {
      const sessionId = text(body.sessionId), controlToken = text(body.controlToken);
      if (!sessionId || !controlToken) throw new Error("جلسة المجلس غير مكتملة.");
      const ref = adminDb.collection(SESSION_COLLECTION).doc(sessionId);
      const snap = await ref.get();
      if (snap.exists) assertSessionControl(snap.data() || {}, controlToken);
      await ref.delete().catch(() => undefined);
      return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    }

    const member = await verifiedMember(request);
    if (action === "onlineCreate") {
      const room = await createOnlineRoom(member.userId, member.userName, body.teamCount, body.teamNames);
      return NextResponse.json({ room });
    }
    if (action === "onlineJoin") {
      const room = await joinOnlineRoom(member.userId, member.userName, text(body.roomCode));
      return NextResponse.json({ room });
    }

    const roomId = text(body.roomId);
    const { ref, room } = await getOnlineRoomForUser(roomId, member.userId);
    const now = Date.now();

    if (action === "onlineHeartbeat") {
      const players = structuredClone(room.players);
      players[member.userId] = { ...players[member.userId], lastSeenAt: now };
      await ref.set({ players, updatedAt: now }, { merge: true });
      return NextResponse.json({ ok: true });
    }
    if (action === "onlineLeave") {
      const players = structuredClone(room.players);
      delete players[member.userId];
      if (member.userId === room.hostId || Object.keys(players).length === 0) {
        const signals = await ref.collection("voiceSignals").get();
        const batch = adminDb.batch();
        signals.docs.slice(0, 400).forEach((doc) => batch.delete(doc.ref));
        batch.delete(ref);
        await batch.commit();
        if (room.session?.sessionId) await adminDb.collection(SESSION_COLLECTION).doc(room.session.sessionId).delete().catch(() => undefined);
      } else {
        await ref.set({ players, updatedAt: now }, { merge: true });
      }
      return NextResponse.json({ ok: true });
    }
    if (action === "onlineLobby") {
      if (member.userId !== room.hostId || room.status !== "lobby") throw new Error("تعديل إعدادات المجلس متاح للمضيف فقط.");
      const teamCount = normalizeTeamCount(body.teamCount);
      const teamNames = normalizeTeamNames(body.teamNames, teamCount);
      const selectedCategoryIds = Array.isArray(body.selectedCategoryIds) ? body.selectedCategoryIds.map(String).slice(0, 8) : [];
      const players = structuredClone(room.players);
      Object.values(players).forEach((player) => {
        const index = Math.max(1, Math.min(teamCount, Number(text(player.teamId).split("-")[1]) || 1));
        player.teamId = `team-${index}`;
      });
      await ref.set({ teamCount, teamNames, selectedCategoryIds, players, updatedAt: now }, { merge: true });
      const snap = await ref.get();
      return NextResponse.json({ room: mapOnlineRoom(ref.id, snap.data() || {}) });
    }
    if (action === "onlineTeam") {
      if (room.status !== "lobby") throw new Error("لا يمكن تغيير الفريق بعد بدء المجلس.");
      const teamId = text(body.teamId);
      const allowed = Array.from({ length: room.teamCount }, (_, index) => `team-${index + 1}`);
      if (!allowed.includes(teamId)) throw new Error("الفريق غير صالح.");
      const players = structuredClone(room.players);
      players[member.userId] = { ...players[member.userId], teamId, lastSeenAt: now };
      await ref.set({ players, updatedAt: now }, { merge: true });
      const snap = await ref.get();
      return NextResponse.json({ room: mapOnlineRoom(ref.id, snap.data() || {}) });
    }
    if (action === "onlineVoiceMode") {
      const players = structuredClone(room.players);
      players[member.userId] = { ...players[member.userId], micMode: voiceMode(body.micMode), lastSeenAt: now };
      await ref.set({ players, updatedAt: now }, { merge: true });
      const snap = await ref.get();
      return NextResponse.json({ room: mapOnlineRoom(ref.id, snap.data() || {}) });
    }
    if (action === "onlineStart") {
      if (member.userId !== room.hostId || room.status !== "lobby") throw new Error("بدء المجلس متاح للمضيف فقط.");
      const teamCount = normalizeTeamCount(body.teamCount);
      const teamNames = normalizeTeamNames(body.teamNames, teamCount);
      const categoryIds = Array.isArray(body.categoryIds) ? body.categoryIds.map(String) : [];
      const session = await startGame(categoryIds);
      const publicSession = Object.fromEntries(Object.entries(session).filter(([key]) => key !== "controlToken")) as MajlisGameStartResponse;
      const teams = Array.from({ length: teamCount }, (_, index) => ({ id: `team-${index + 1}`, name: teamNames[index], score: 0, accent: ["#d6b16b", "#7fb3a8", "#c77a62", "#8f9fc9"][index] || "#d6b16b", assists: { hint: true, time: true, double: true, options: true } }));
      const publicState: MajlisOnlinePublicState = { phase: "board", teams, currentTeamIndex: 0, usedQuestionIds: [], activeQuestion: null, questionOwnerIndex: 0, answeringTeamIndex: 0, secondsLeft: 0, timerPaused: false, questionDeadlineAt: null, reveal: null, hintVisible: false, optionsVisible: false, visibleHint: null, visibleOptions: [], audioPlaybackState: "idle", doubleActive: false, timeBonusActive: false, stealMode: false, finishReason: "complete", updatedAt: now };
      await ref.set({ status: "playing", teamCount, teamNames, selectedCategoryIds: categoryIds, session: publicSession, publicState, updatedAt: now }, { merge: true });
      const snap = await ref.get();
      return NextResponse.json({ room: mapOnlineRoom(ref.id, snap.data() || {}), session: publicSession });
    }
    if (action === "onlineReveal") {
      if (member.userId !== room.hostId || room.status !== "playing" || !room.session?.sessionId) throw new Error("كشف الإجابة متاح للمضيف فقط.");
      const questionId = text(body.questionId);
      if (!questionId) throw new Error("السؤال غير مكتمل.");
      return NextResponse.json(await revealQuestion(room.session.sessionId, questionId), { headers: { "Cache-Control": "no-store" } });
    }
    if (action === "onlineAssist") {
      if (member.userId !== room.hostId || room.status !== "playing" || !room.session?.sessionId) throw new Error("المساعدة متاحة للمضيف فقط.");
      const questionId = text(body.questionId);
      const kind = body.kind === "options" ? "options" : "hint";
      if (!questionId) throw new Error("السؤال غير مكتمل.");
      return NextResponse.json(await revealAssist(room.session.sessionId, questionId, undefined, kind), { headers: { "Cache-Control": "no-store" } });
    }
    if (action === "onlineSync") {
      if (member.userId !== room.hostId || room.status !== "playing") throw new Error("مزامنة المجلس متاحة للمضيف فقط.");
      const publicState = sanitizePublicState(body.publicState, room);
      await ref.set({ publicState, status: publicState.phase === "finished" ? "finished" : "playing", updatedAt: now }, { merge: true });
      return NextResponse.json({ ok: true });
    }
    if (action === "onlineClose") {
      if (member.userId !== room.hostId) throw new Error("إنهاء المجلس متاح للمضيف فقط.");
      const signals = await ref.collection("voiceSignals").get();
      for (let start = 0; start < signals.docs.length; start += 400) {
        const batch = adminDb.batch();
        signals.docs.slice(start, start + 400).forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
      const sessionId = room.session?.sessionId;
      if (sessionId) await adminDb.collection(SESSION_COLLECTION).doc(sessionId).delete().catch(() => undefined);
      await ref.delete();
      return NextResponse.json({ ok: true });
    }
    if (action === "onlineVoiceSignal") {
      const targetUserId = text(body.targetUserId);
      if (!room.players[targetUserId] || targetUserId === member.userId) throw new Error("عضو الصوت غير صالح.");
      const kind = body.kind === "answer" ? "answer" : body.kind === "reset" ? "reset" : "offer";
      const sessionId = text(body.sessionId).slice(0, 100);
      const sdp = text(body.sdp);
      if (!sessionId) throw new Error("جلسة الصوت غير مكتملة.");
      if (kind !== "reset" && (!sdp || sdp.length > 300_000)) throw new Error("بيانات الاتصال الصوتي غير صالحة.");
      await ref.collection("voiceSignals").doc(randomUUID()).set({ roomId, fromUserId: member.userId, targetUserId, kind, sessionId, sdp: kind === "reset" ? "" : sdp, createdAt: now });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تنفيذ العملية.";
    return NextResponse.json({ error: message === "UNAUTHORIZED" ? "سجّل الدخول أولًا." : message }, { status: message === "UNAUTHORIZED" ? 401 : 400, headers: { "Cache-Control": "no-store" } });
  }
}
