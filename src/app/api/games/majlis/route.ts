import { randomUUID } from "node:crypto";
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

function safeQuestion(question: Awaited<ReturnType<typeof getEffectiveMajlisBank>>["questions"][number], points: number): MajlisClientQuestion {
  return {
    id: question.id,
    categoryId: question.categoryId,
    groupKey: question.groupKey,
    family: question.family,
    prompt: cleanPrompt(question.prompt),
    options: question.options,
    difficulty: question.difficulty,
    points,
    hint: question.hint,
    type: question.type,
    quoteText: question.quoteText,
    audioUrl: question.audioSourceKey ? `/api/games/majlis/human-audio?questionId=${encodeURIComponent(question.id)}` : question.audioUrl,
    audioFallbackUrl: question.audioSourceKey ? `/api/games/majlis/human-audio?questionId=${encodeURIComponent(question.id)}&retry=1` : question.audioFallbackUrl,
    audioStartSeconds: question.audioStartSeconds,
    audioMaxSeconds: question.audioMaxSeconds,
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
    const list = map.get(item.groupKey) || [];
    list.push(item);
    map.set(item.groupKey, list);
  }
  return map;
}

function pickGroupKeys(
  groupMap: Map<string, BankQuestion[]>,
  candidates: string[],
  count: number,
  excluded = new Set<string>(),
  distinctAnswers = false,
) {
  const keys = shuffle(candidates.filter((key) => !excluded.has(key)));
  const qFor = (key: string) => groupMap.get(key)?.[0];
  const difficultyFor = (key: string) => qFor(key)?.difficulty || "medium";
  const answerFor = (key: string) => qFor(key)?.answer || "";
  const familyFor = (key: string) => qFor(key)?.family || `${qFor(key)?.categoryId || "general"}-general`;
  const hard = keys.filter((key) => difficultyFor(key) === "hard");
  const medium = keys.filter((key) => difficultyFor(key) === "medium");
  const result: string[] = [];
  const usedAnswers = new Set<string>();
  const usedFamilies = new Map<string, number>();

  const push = (pool: string[], wanted: number, preferDistinctAnswer = distinctAnswers) => {
    // Pass 1: new family + new answer. Pass 2: family may repeat once. Pass 3: any remaining.
    for (const familyLimit of [0, 1, 99]) {
      for (const requireDistinctAnswer of preferDistinctAnswer ? [true, false] : [false]) {
        for (const key of pool) {
          if (result.includes(key)) continue;
          const answer = answerFor(key);
          const family = familyFor(key);
          const usedFamilyCount = usedFamilies.get(family) || 0;
          if (familyLimit < 99 && usedFamilyCount > familyLimit) continue;
          if (requireDistinctAnswer && answer && usedAnswers.has(answer)) continue;
          result.push(key);
          if (answer) usedAnswers.add(answer);
          usedFamilies.set(family, usedFamilyCount + 1);
          if (result.length >= wanted) return;
        }
      }
    }
  };

  // V16: السؤال الصعب هو الغالب، مع منع تكتل نفس قالب السؤال قدر الإمكان.
  push(hard, Math.min(count, 5));
  push(medium, Math.min(count, 6));
  push(keys, count);
  return result.slice(0, count);
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
      const selectedKeys: string[] = [];
      let resetOccurred = false;

      const remaining = allKeys.filter((key) => !usedKeys.has(key));
      const first = pickGroupKeys(groupMap, remaining, Math.min(6, remaining.length), new Set<string>(), ["reciter", "dialects", "languages"].includes(category.id));
      selectedKeys.push(...first);

      if (selectedKeys.length < 6) {
        // Every still-unseen fact is consumed before a new cycle begins.
        cycle += 1;
        resetOccurred = true;
        usedKeys = new Set<string>();
        const fill = pickGroupKeys(groupMap, allKeys, 6 - selectedKeys.length, new Set(selectedKeys), ["reciter", "dialects", "languages"].includes(category.id));
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
        updatedAt: createdAt,
      }, { merge: true });

      const rows = selectedKeys.map((key) => {
        const variants = groupMap.get(key) || [];
        // عند وجود عدة صياغات للمعلومة نفسها نستخدم الصياغة الأساسية المباشرة.
        return [...variants].sort((a, b) => a.id.localeCompare(b.id))[0];
      }).filter(Boolean) as BankQuestion[];
      selectedByCategory.set(category.id, shuffle(rows));
    }

    const revealRows: Array<{ questionId: string; answer: string; explanation: string; sourceLabel: string }> = [];
    for (const rows of selectedByCategory.values()) {
      rows.forEach((question) => revealRows.push({
        questionId: question.id,
        answer: question.answer,
        explanation: question.explanation || "",
        sourceLabel: question.sourceLabel || "",
      }));
    }
    transaction.set(sessionRef, {
      sessionId,
      createdAt,
      expiresAt: createdAt + SESSION_MAX_AGE_MS,
      categoryIds: categories.map((category) => category.id),
      reveals: revealRows,
      usedQuestionIds: [],
    });
    return selectedByCategory;
  });

  const board: Record<string, MajlisClientQuestion[]> = {};
  for (const category of categories) {
    const rows = allocated.get(category.id) || [];
    board[category.id] = rows.map((question) => safeQuestion(question, pointsFor(question.difficulty, settings)));
  }
  return { sessionId, createdAt, settings, categories, board };
}

async function revealQuestion(sessionId: string, questionId: string) {
  const ref = adminDb.collection(SESSION_COLLECTION).doc(sessionId);
  return adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) throw new Error("انتهت جلسة المجلس. ابدأ جلسة جديدة.");
    const data = snap.data() || {};
    const expiresAt = Number(data.expiresAt || 0);
    if (!expiresAt || Date.now() > expiresAt) throw new Error("انتهت جلسة المجلس. ابدأ جلسة جديدة.");
    const reveals = Array.isArray(data.reveals) ? data.reveals as Array<Record<string, unknown>> : [];
    const row = reveals.find((item) => text(item.questionId) === questionId);
    if (!row) throw new Error("هذا السؤال لا ينتمي إلى الجلسة الحالية.");
    const used = Array.isArray(data.usedQuestionIds) ? data.usedQuestionIds.map(String) : [];
    if (!used.includes(questionId)) transaction.set(ref, { usedQuestionIds: [...used, questionId], lastRevealAt: Date.now() }, { merge: true });
    return { questionId, answer: text(row.answer), explanation: text(row.explanation), sourceLabel: text(row.sourceLabel) };
  });
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
    session: data.session && typeof data.session === "object" ? data.session as MajlisGameStartResponse : null,
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

function sanitizePublicState(value: unknown): MajlisOnlinePublicState {
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
  const active = data.activeQuestion && typeof data.activeQuestion === "object" ? data.activeQuestion as MajlisClientQuestion : null;
  const revealRaw = data.reveal && typeof data.reveal === "object" ? data.reveal as Record<string, unknown> : null;
  const reveal = revealRaw ? { questionId: text(revealRaw.questionId), answer: text(revealRaw.answer), explanation: text(revealRaw.explanation), sourceLabel: text(revealRaw.sourceLabel) } : null;
  return {
    phase, teams,
    currentTeamIndex: Math.max(0, Math.min(3, Math.floor(number(data.currentTeamIndex)))),
    usedQuestionIds: Array.isArray(data.usedQuestionIds) ? data.usedQuestionIds.map(String).slice(0, 80) : [],
    activeQuestion: active,
    questionOwnerIndex: Math.max(0, Math.min(3, Math.floor(number(data.questionOwnerIndex)))),
    answeringTeamIndex: Math.max(0, Math.min(3, Math.floor(number(data.answeringTeamIndex)))),
    secondsLeft: Math.max(0, Math.min(120, Math.floor(number(data.secondsLeft)))),
    timerPaused: data.timerPaused === true,
    questionDeadlineAt: data.questionDeadlineAt == null ? null : number(data.questionDeadlineAt),
    reveal,
    hintVisible: data.hintVisible === true,
    optionsVisible: data.optionsVisible === true,
    doubleActive: data.doubleActive === true,
    timeBonusActive: data.timeBonusActive === true,
    stealMode: data.stealMode === true,
    finishReason: data.finishReason === "manual" ? "manual" : "complete",
    updatedAt: Date.now(),
  };
}

async function generateVoiceIce(roomId: string, userId: string) {
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
      return NextResponse.json({ categories, settings, bankVersion: "1.5.0", totalQuestions: bank.questions.filter((question) => question.enabled).length }, { headers: { "Cache-Control": "no-store" } });
    }

    const member = await verifiedMember(request);
    const roomId = text(request.nextUrl.searchParams.get("roomId"));
    if (view === "online") {
      const { room } = await getOnlineRoomForUser(roomId, member.userId);
      return NextResponse.json({ room }, { headers: { "Cache-Control": "no-store" } });
    }
    if (view === "voice-ice") {
      await getOnlineRoomForUser(roomId, member.userId);
      return NextResponse.json(await generateVoiceIce(roomId, member.userId), { headers: { "Cache-Control": "no-store" } });
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
      const sessionId = text(body.sessionId), questionId = text(body.questionId);
      if (!sessionId || !questionId) throw new Error("طلب إظهار الإجابة غير مكتمل.");
      return NextResponse.json(await revealQuestion(sessionId, questionId), { headers: { "Cache-Control": "no-store" } });
    }
    if (action === "closeSession") {
      const sessionId = text(body.sessionId);
      if (!sessionId) throw new Error("جلسة المجلس غير مكتملة.");
      await adminDb.collection(SESSION_COLLECTION).doc(sessionId).delete().catch(() => undefined);
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
      const teams = Array.from({ length: teamCount }, (_, index) => ({ id: `team-${index + 1}`, name: teamNames[index], score: 0, accent: ["#d6b16b", "#7fb3a8", "#c77a62", "#8f9fc9"][index] || "#d6b16b", assists: { hint: true, time: true, double: true, options: true } }));
      const publicState: MajlisOnlinePublicState = { phase: "board", teams, currentTeamIndex: 0, usedQuestionIds: [], activeQuestion: null, questionOwnerIndex: 0, answeringTeamIndex: 0, secondsLeft: 0, timerPaused: false, questionDeadlineAt: null, reveal: null, hintVisible: false, optionsVisible: false, doubleActive: false, timeBonusActive: false, stealMode: false, finishReason: "complete", updatedAt: now };
      await ref.set({ status: "playing", teamCount, teamNames, selectedCategoryIds: categoryIds, session, publicState, updatedAt: now }, { merge: true });
      const snap = await ref.get();
      return NextResponse.json({ room: mapOnlineRoom(ref.id, snap.data() || {}), session });
    }
    if (action === "onlineSync") {
      if (member.userId !== room.hostId || room.status !== "playing") throw new Error("مزامنة المجلس متاحة للمضيف فقط.");
      const publicState = sanitizePublicState(body.publicState);
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
