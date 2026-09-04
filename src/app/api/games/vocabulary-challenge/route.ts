import { NextRequest, NextResponse } from "next/server";
import type { DocumentReference, QueryDocumentSnapshot, Transaction } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import {
  VOCABULARY_DICTIONARY_VERSION,
  createFairVocabularyLetters,
  drawFairVocabularyLetter,
  getVocabularyMoves,
  isApprovedVocabularyWord,
  randomVocabularyStartingWord,
  replaceVocabularyLetter,
} from "@/lib/vocabularyChallengeDictionary";
import { syncPlatformGameXp } from "@/lib/serverPlatformGameXp";
import type {
  VocabularyChallengeAction,
  VocabularyChallengeCard,
  VocabularyChallengeMode,
} from "@/types/vocabularyChallenge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ROOM_COLLECTION = "vocabularyChallengeRooms";
const RESULT_COLLECTION = "vocabularyChallengeResults";
const HAND_SIZE = 10;
const TURN_DURATION_MS = 10_000;
const MATCH_DURATION_MS = 5 * 60_000;

function text(value: unknown) {
  return String(value || "").trim();
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function bearerToken(request: NextRequest) {
  const [scheme, token] = (request.headers.get("authorization") || "").split(" ");
  if (scheme !== "Bearer" || !token) throw new Error("UNAUTHORIZED");
  return token;
}

async function verifiedMember(request: NextRequest) {
  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(bearerToken(request));
  } catch {
    throw new Error("UNAUTHORIZED");
  }

  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
  if (!userSnap.exists) throw new Error("UNAUTHORIZED");
  const user = userSnap.data() || {};
  return {
    userId: decoded.uid,
    userName: text(user.fullName) || text(decoded.name) || "عضو",
  };
}

function roomCodeValue() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function uniqueRoomCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = roomCodeValue();
    const existing = await adminDb.collection(ROOM_COLLECTION).where("roomCode", "==", code).limit(1).get();
    if (existing.empty) return code;
  }
  throw new Error("ROOM_CODE_FAILED");
}

function createCards(letters: readonly string[]): VocabularyChallengeCard[] {
  return letters.map((letter) => ({ id: crypto.randomUUID(), letter }));
}

function participant(room: Record<string, unknown>, userId: string) {
  return text(room.hostId) === userId || text(room.guestId) === userId;
}

function roomPlayerIds(room: Record<string, unknown>) {
  return [text(room.hostId), text(room.guestId)].filter(Boolean);
}

function playerName(room: Record<string, unknown>, userId: string) {
  const players = room.players && typeof room.players === "object"
    ? (room.players as Record<string, Record<string, unknown>>)
    : {};
  return text(players[userId]?.userName) || (userId === text(room.hostId) ? text(room.hostName) : text(room.guestName)) || "عضو";
}

function cardCount(room: Record<string, unknown>, userId: string) {
  const players = room.players && typeof room.players === "object"
    ? (room.players as Record<string, Record<string, unknown>>)
    : {};
  return Math.max(0, Math.floor(number(players[userId]?.cardCount)));
}

function updatePlayer(room: Record<string, unknown>, userId: string, patch: Record<string, unknown>) {
  const players = room.players && typeof room.players === "object"
    ? structuredClone(room.players as Record<string, Record<string, unknown>>)
    : {};
  players[userId] = { ...(players[userId] || {}), ...patch };
  return players;
}

function nextPlayerId(room: Record<string, unknown>, currentUserId: string) {
  if (text(room.mode) !== "duel") return currentUserId;
  const ids = roomPlayerIds(room);
  return ids.find((id) => id !== currentUserId) || currentUserId;
}

function resultId(roomId: string, userId: string) {
  return `${roomId}_${userId}`;
}

function resultPayload(params: {
  roomId: string;
  room: Record<string, unknown>;
  userId: string;
  won: boolean;
  outcome: "win" | "loss" | "draw";
  reason: "cards" | "time" | "forfeit";
  now: number;
}) {
  const players = params.room.players && typeof params.room.players === "object"
    ? (params.room.players as Record<string, Record<string, unknown>>)
    : {};
  const stats = players[params.userId] || {};
  const startedAt = number(params.room.matchStartedAt);
  return {
    id: resultId(params.roomId, params.userId),
    gameId: "vocabulary",
    roomId: params.roomId,
    mode: text(params.room.mode),
    userId: params.userId,
    userName: playerName(params.room, params.userId),
    won: params.won,
    outcome: params.outcome,
    completed: true,
    finishReason: params.reason,
    cardsRemaining: cardCount(params.room, params.userId),
    moves: Math.max(0, Math.floor(number(stats.moves))),
    draws: Math.max(0, Math.floor(number(stats.draws))),
    startedAt,
    finishedAt: params.now,
    durationMs: startedAt ? Math.max(0, params.now - startedAt) : 0,
    dictionaryVersion: text(params.room.dictionaryVersion) || VOCABULARY_DICTIONARY_VERSION,
    createdAt: params.now,
  };
}

function finalizeRoom(params: {
  transaction: Transaction;
  roomRef: DocumentReference;
  roomId: string;
  room: Record<string, unknown>;
  winnerId: string | null;
  reason: "cards" | "time" | "forfeit";
  now: number;
}) {
  const ids = roomPlayerIds(params.room);
  const resultIds: Record<string, string> = {};

  for (const userId of ids) {
    const won = Boolean(params.winnerId && params.winnerId === userId);
    const outcome: "win" | "loss" | "draw" = params.winnerId ? (won ? "win" : "loss") : "draw";
    const id = resultId(params.roomId, userId);
    resultIds[userId] = id;
    params.transaction.set(
      adminDb.collection(RESULT_COLLECTION).doc(id),
      resultPayload({
        roomId: params.roomId,
        room: params.room,
        userId,
        won,
        outcome,
        reason: params.reason,
        now: params.now,
      }),
      { merge: false },
    );
  }

  params.transaction.update(params.roomRef, {
    status: "finished",
    winnerId: params.winnerId,
    finishReason: params.reason,
    turnPlayerId: null,
    turnStartedAt: null,
    turnEndsAt: null,
    resultIds,
    updatedAt: params.now,
  });

  return resultIds;
}

async function syncFinishedResults(resultIds: Record<string, string> | undefined) {
  if (!resultIds) return;
  await Promise.allSettled(
    Object.values(resultIds).map((sourceResultId) =>
      syncPlatformGameXp({ gameId: "vocabulary", sourceResultId }),
    ),
  );
}

async function createRoom(userId: string, userName: string, mode: VocabularyChallengeMode) {
  const now = Date.now();
  const startingWord = randomVocabularyStartingWord();
  const roomRef = adminDb.collection(ROOM_COLLECTION).doc();
  const cards = createCards(createFairVocabularyLetters(startingWord, HAND_SIZE));
  const roomCode = mode === "duel" ? await uniqueRoomCode() : null;
  const startsNow = mode === "solo";
  const matchStartedAt = startsNow ? now : null;
  const matchEndsAt = startsNow ? now + MATCH_DURATION_MS : null;

  const room = {
    id: roomRef.id,
    dictionaryVersion: VOCABULARY_DICTIONARY_VERSION,
    mode,
    status: startsNow ? "playing" : "waiting",
    roomCode,
    hostId: userId,
    hostName: userName,
    guestId: null,
    guestName: null,
    playerOrder: [userId],
    players: {
      [userId]: { userId, userName, cardCount: cards.length, moves: 0, draws: 0 },
    },
    startingWord,
    currentWord: startingWord,
    turnPlayerId: startsNow ? userId : null,
    turnStartedAt: startsNow ? now : null,
    turnEndsAt: startsNow ? now + TURN_DURATION_MS : null,
    turnDurationMs: TURN_DURATION_MS,
    matchStartedAt,
    matchEndsAt,
    matchDurationMs: MATCH_DURATION_MS,
    winnerId: null,
    finishReason: null,
    lastMove: null,
    resultIds: {},
    createdAt: now,
    updatedAt: now,
  };

  const batch = adminDb.batch();
  batch.set(roomRef, room);
  batch.set(roomRef.collection("hands").doc(userId), { userId, cards, updatedAt: now });
  await batch.commit();

  return { roomId: roomRef.id, roomCode, status: room.status };
}

async function joinRoom(userId: string, userName: string, rawCode: unknown) {
  const roomCode = text(rawCode).replace(/\D/g, "").slice(0, 6);
  if (roomCode.length !== 6) throw new Error("INVALID_ROOM_CODE");

  const candidates = await adminDb.collection(ROOM_COLLECTION).where("roomCode", "==", roomCode).limit(4).get();
  const match = candidates.docs.find((docSnap: QueryDocumentSnapshot) => text(docSnap.data().status) === "waiting");
  if (!match) throw new Error("ROOM_NOT_FOUND");
  const roomRef = match.ref;
  const now = Date.now();

  const result = await adminDb.runTransaction(async (transaction: Transaction) => {
    const roomSnap = await transaction.get(roomRef);
    if (!roomSnap.exists) throw new Error("ROOM_NOT_FOUND");
    const room = roomSnap.data() || {};
    if (text(room.status) !== "waiting" || text(room.mode) !== "duel") throw new Error("ROOM_NOT_AVAILABLE");
    if (text(room.hostId) === userId) throw new Error("OWN_ROOM");
    if (text(room.guestId)) throw new Error("ROOM_NOT_AVAILABLE");

    const cards = createCards(createFairVocabularyLetters(text(room.currentWord), HAND_SIZE));
    const hostId = text(room.hostId);
    const hostName = text(room.hostName) || "عضو";
    const players = {
      ...(room.players && typeof room.players === "object" ? room.players as Record<string, unknown> : {}),
      [userId]: { userId, userName, cardCount: cards.length, moves: 0, draws: 0 },
    };
    const hostPlayer = players[hostId] && typeof players[hostId] === "object"
      ? players[hostId] as Record<string, unknown>
      : {};
    const firstPlayer = Math.random() < 0.5 ? hostId : userId;
    const matchEndsAt = now + MATCH_DURATION_MS;

    transaction.set(roomRef.collection("hands").doc(userId), { userId, cards, updatedAt: now });
    transaction.update(roomRef, {
      status: "playing",
      guestId: userId,
      guestName: userName,
      playerOrder: [hostId, userId],
      players: {
        ...players,
        [hostId]: {
          ...hostPlayer,
          userId: hostId,
          userName: hostName,
        },
      },
      turnPlayerId: firstPlayer,
      turnStartedAt: now,
      turnEndsAt: Math.min(now + TURN_DURATION_MS, matchEndsAt),
      matchStartedAt: now,
      matchEndsAt,
      updatedAt: now,
    });

    return { roomId: roomRef.id, roomCode };
  });

  return result;
}

async function makeMove(userId: string, roomId: string, cardId: string, rawPosition: unknown) {
  const position = Math.floor(number(rawPosition));
  if (!roomId || !cardId || position < 0 || position > 2) throw new Error("INVALID_MOVE");
  const roomRef = adminDb.collection(ROOM_COLLECTION).doc(roomId);
  const handRef = roomRef.collection("hands").doc(userId);
  const now = Date.now();

  const result = await adminDb.runTransaction(async (transaction: Transaction) => {
    const [roomSnap, handSnap] = await Promise.all([transaction.get(roomRef), transaction.get(handRef)]);
    if (!roomSnap.exists || !handSnap.exists) throw new Error("ROOM_NOT_FOUND");
    const room = roomSnap.data() || {};
    if (!participant(room, userId)) throw new Error("FORBIDDEN");
    if (text(room.status) !== "playing") throw new Error("GAME_NOT_PLAYING");

    if (number(room.matchEndsAt) && now >= number(room.matchEndsAt)) {
      const ids = roomPlayerIds(room);
      let winnerId: string | null = null;
      if (text(room.mode) === "duel" && ids.length === 2) {
        const [a, b] = ids;
        const aCount = cardCount(room, a);
        const bCount = cardCount(room, b);
        if (aCount !== bCount) winnerId = aCount < bCount ? a : b;
      }
      const resultIds = finalizeRoom({ transaction, roomRef, roomId, room, winnerId, reason: "time", now });
      return { finished: true, resultIds };
    }

    if (text(room.turnPlayerId) !== userId) throw new Error("NOT_YOUR_TURN");
    if (number(room.turnEndsAt) && now >= number(room.turnEndsAt)) throw new Error("TURN_EXPIRED");

    const handData = handSnap.data() || {};
    const cards = Array.isArray(handData.cards) ? (handData.cards as VocabularyChallengeCard[]) : [];
    const cardIndex = cards.findIndex((card) => text(card.id) === cardId);
    if (cardIndex < 0) throw new Error("CARD_NOT_FOUND");
    const card = cards[cardIndex];
    const beforeWord = text(room.currentWord);
    const afterWord = replaceVocabularyLetter(beforeWord, position, text(card.letter));

    if (!afterWord || !isApprovedVocabularyWord(afterWord)) {
      const error = new Error("INVALID_WORD") as Error & { proposedWord?: string };
      error.proposedWord = afterWord;
      throw error;
    }

    const nextCards = cards.filter((_, index) => index !== cardIndex);
    const existingPlayers = room.players && typeof room.players === "object"
      ? room.players as Record<string, Record<string, unknown>>
      : {};
    const currentSummary = existingPlayers[userId] || {};
    const players = updatePlayer(room, userId, {
      cardCount: nextCards.length,
      moves: Math.max(0, Math.floor(number(currentSummary.moves))) + 1,
    });
    const nextRoom = { ...room, players, currentWord: afterWord };

    transaction.set(handRef, { userId, cards: nextCards, updatedAt: now }, { merge: true });

    if (nextCards.length === 0) {
      const resultIds = finalizeRoom({
        transaction,
        roomRef,
        roomId,
        room: nextRoom,
        winnerId: userId,
        reason: "cards",
        now,
      });
      transaction.update(roomRef, {
        players,
        currentWord: afterWord,
        lastMove: {
          actorId: userId,
          actorName: playerName(room, userId),
          beforeWord,
          afterWord,
          letter: text(card.letter),
          position,
          at: now,
        },
      });
      return { finished: true, validWord: afterWord, resultIds };
    }

    const nextTurn = nextPlayerId(room, userId);
    const matchEndsAt = number(room.matchEndsAt);
    transaction.update(roomRef, {
      players,
      currentWord: afterWord,
      turnPlayerId: nextTurn,
      turnStartedAt: now,
      turnEndsAt: matchEndsAt ? Math.min(now + TURN_DURATION_MS, matchEndsAt) : now + TURN_DURATION_MS,
      lastMove: {
        actorId: userId,
        actorName: playerName(room, userId),
        beforeWord,
        afterWord,
        letter: text(card.letter),
        position,
        at: now,
      },
      updatedAt: now,
    });

    return { finished: false, validWord: afterWord };
  });

  if (result.finished) await syncFinishedResults(result.resultIds);
  return result;
}

async function drawCard(userId: string, roomId: string) {
  if (!roomId) throw new Error("ROOM_NOT_FOUND");
  const roomRef = adminDb.collection(ROOM_COLLECTION).doc(roomId);
  const handRef = roomRef.collection("hands").doc(userId);
  const now = Date.now();

  return adminDb.runTransaction(async (transaction: Transaction) => {
    const [roomSnap, handSnap] = await Promise.all([transaction.get(roomRef), transaction.get(handRef)]);
    if (!roomSnap.exists || !handSnap.exists) throw new Error("ROOM_NOT_FOUND");
    const room = roomSnap.data() || {};
    if (!participant(room, userId)) throw new Error("FORBIDDEN");
    if (text(room.status) !== "playing") throw new Error("GAME_NOT_PLAYING");
    if (number(room.matchEndsAt) && now >= number(room.matchEndsAt)) throw new Error("TURN_EXPIRED");
    if (text(room.turnPlayerId) !== userId) throw new Error("NOT_YOUR_TURN");
    if (number(room.turnEndsAt) && now >= number(room.turnEndsAt)) throw new Error("TURN_EXPIRED");

    const handData = handSnap.data() || {};
    const cards = Array.isArray(handData.cards) ? (handData.cards as VocabularyChallengeCard[]) : [];
    const letters = cards.map((card) => text(card.letter));
    if (getVocabularyMoves(text(room.currentWord), letters).length > 0) throw new Error("MOVE_AVAILABLE");

    const newCard = createCards([drawFairVocabularyLetter(text(room.currentWord), letters)])[0];
    const nextCards = [...cards, newCard];
    const existingPlayers = room.players && typeof room.players === "object"
      ? room.players as Record<string, Record<string, unknown>>
      : {};
    const currentSummary = existingPlayers[userId] || {};
    const players = updatePlayer(room, userId, {
      cardCount: nextCards.length,
      draws: Math.max(0, Math.floor(number(currentSummary.draws))) + 1,
    });
    const nextTurn = nextPlayerId(room, userId);
    const matchEndsAt = number(room.matchEndsAt);

    transaction.set(handRef, { userId, cards: nextCards, updatedAt: now }, { merge: true });
    transaction.update(roomRef, {
      players,
      turnPlayerId: nextTurn,
      turnStartedAt: now,
      turnEndsAt: matchEndsAt ? Math.min(now + TURN_DURATION_MS, matchEndsAt) : now + TURN_DURATION_MS,
      updatedAt: now,
    });

    return { drawn: true };
  });
}

async function handleTimeout(userId: string, roomId: string) {
  if (!roomId) throw new Error("ROOM_NOT_FOUND");
  const roomRef = adminDb.collection(ROOM_COLLECTION).doc(roomId);
  const now = Date.now();

  const result = await adminDb.runTransaction(async (transaction: Transaction) => {
    const roomSnap = await transaction.get(roomRef);
    if (!roomSnap.exists) throw new Error("ROOM_NOT_FOUND");
    const room = roomSnap.data() || {};
    if (!participant(room, userId)) throw new Error("FORBIDDEN");
    if (text(room.status) !== "playing") return { noop: true };

    const matchEndsAt = number(room.matchEndsAt);
    if (matchEndsAt && now >= matchEndsAt) {
      const ids = roomPlayerIds(room);
      let winnerId: string | null = null;
      if (text(room.mode) === "duel" && ids.length === 2) {
        const [a, b] = ids;
        const aCount = cardCount(room, a);
        const bCount = cardCount(room, b);
        if (aCount !== bCount) winnerId = aCount < bCount ? a : b;
      }
      const resultIds = finalizeRoom({ transaction, roomRef, roomId, room, winnerId, reason: "time", now });
      return { finished: true, resultIds };
    }

    const turnEndsAt = number(room.turnEndsAt);
    if (!turnEndsAt || now < turnEndsAt) return { noop: true };
    const timedOutId = text(room.turnPlayerId);
    if (!timedOutId) return { noop: true };
    const timedOutHandRef = roomRef.collection("hands").doc(timedOutId);
    const handSnap = await transaction.get(timedOutHandRef);
    if (!handSnap.exists) throw new Error("ROOM_NOT_FOUND");

    const handData = handSnap.data() || {};
    const cards = Array.isArray(handData.cards) ? (handData.cards as VocabularyChallengeCard[]) : [];
    const newCard = createCards([drawFairVocabularyLetter(text(room.currentWord), cards.map((card) => text(card.letter)))])[0];
    const nextCards = [...cards, newCard];
    const existingPlayers = room.players && typeof room.players === "object"
      ? room.players as Record<string, Record<string, unknown>>
      : {};
    const currentSummary = existingPlayers[timedOutId] || {};
    const players = updatePlayer(room, timedOutId, {
      cardCount: nextCards.length,
      draws: Math.max(0, Math.floor(number(currentSummary.draws))) + 1,
    });
    const nextTurn = nextPlayerId(room, timedOutId);

    transaction.set(timedOutHandRef, { userId: timedOutId, cards: nextCards, updatedAt: now }, { merge: true });
    transaction.update(roomRef, {
      players,
      turnPlayerId: nextTurn,
      turnStartedAt: now,
      turnEndsAt: matchEndsAt ? Math.min(now + TURN_DURATION_MS, matchEndsAt) : now + TURN_DURATION_MS,
      updatedAt: now,
    });
    return { timedOut: true };
  });

  if ("finished" in result && result.finished) await syncFinishedResults(result.resultIds);
  return result;
}

async function forfeitRoom(userId: string, roomId: string) {
  if (!roomId) throw new Error("ROOM_NOT_FOUND");
  const roomRef = adminDb.collection(ROOM_COLLECTION).doc(roomId);
  const now = Date.now();
  const result = await adminDb.runTransaction(async (transaction: Transaction) => {
    const roomSnap = await transaction.get(roomRef);
    if (!roomSnap.exists) throw new Error("ROOM_NOT_FOUND");
    const room = roomSnap.data() || {};
    if (!participant(room, userId)) throw new Error("FORBIDDEN");

    if (text(room.status) === "waiting" || text(room.mode) === "solo") {
      transaction.update(roomRef, {
        status: "cancelled",
        finishReason: "cancelled",
        turnPlayerId: null,
        turnEndsAt: null,
        updatedAt: now,
      });
      return { cancelled: true };
    }

    if (text(room.status) !== "playing") return { noop: true };
    const winnerId = roomPlayerIds(room).find((id) => id !== userId) || null;
    const resultIds = finalizeRoom({ transaction, roomRef, roomId, room, winnerId, reason: "forfeit", now });
    return { finished: true, resultIds };
  });

  if ("finished" in result && result.finished) await syncFinishedResults(result.resultIds);
  return result;
}


const RIYADH_OFFSET_MS = 3 * 60 * 60_000;

function riyadhDayWindow(now = Date.now()) {
  const shifted = new Date(now + RIYADH_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const day = shifted.getUTCDate();
  const start = Date.UTC(year, month, day) - RIYADH_OFFSET_MS;
  const end = start + 24 * 60 * 60_000;
  const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { start, end, dateKey };
}

async function dailyLeaderboard(userId: string) {
  const { start, end, dateKey } = riyadhDayWindow();
  const snapshot = await adminDb
    .collection(RESULT_COLLECTION)
    .where("finishedAt", ">=", start)
    .where("finishedAt", "<", end)
    .limit(2000)
    .get();

  const aggregate = new Map<string, {
    userId: string;
    userName: string;
    score: number;
    wins: number;
    duelWins: number;
    soloWins: number;
    games: number;
    words: number;
    bestDurationMs: number | null;
  }>();

  for (const docSnap of snapshot.docs) {
    const result = docSnap.data() || {};
    if (!result.completed) continue;
    const id = text(result.userId);
    if (!id) continue;
    const mode = text(result.mode);
    const won = Boolean(result.won);
    const outcome = text(result.outcome);
    const durationMs = Math.max(0, number(result.durationMs));
    const current = aggregate.get(id) || {
      userId: id,
      userName: text(result.userName) || "عضو",
      score: 0,
      wins: 0,
      duelWins: 0,
      soloWins: 0,
      games: 0,
      words: 0,
      bestDurationMs: null,
    };

    current.games += 1;
    current.words += Math.max(0, Math.floor(number(result.moves)));
    if (won) {
      current.wins += 1;
      if (mode === "duel") {
        current.duelWins += 1;
        current.score += 3;
      } else {
        current.soloWins += 1;
        current.score += 2;
      }
      if (durationMs > 0 && (current.bestDurationMs === null || durationMs < current.bestDurationMs)) {
        current.bestDurationMs = durationMs;
      }
    } else if (mode === "duel" && outcome === "draw") {
      current.score += 1;
    }
    if (text(result.userName)) current.userName = text(result.userName);
    aggregate.set(id, current);
  }

  const ranked = Array.from(aggregate.values())
    .sort((a, b) =>
      b.score - a.score
      || b.duelWins - a.duelWins
      || b.wins - a.wins
      || b.words - a.words
      || (a.bestDurationMs ?? Number.MAX_SAFE_INTEGER) - (b.bestDurationMs ?? Number.MAX_SAFE_INTEGER)
      || a.userName.localeCompare(b.userName, "ar"),
    )
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return {
    dateKey,
    timezone: "Asia/Riyadh" as const,
    totalPlayers: ranked.length,
    entries: ranked.slice(0, 10),
    me: ranked.find((entry) => entry.userId === userId) || null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const member = await verifiedMember(request);
    return NextResponse.json(await dailyLeaderboard(member.userId));
  } catch (error) {
    console.error("Vocabulary challenge leaderboard error:", error);
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  const proposedWord = error && typeof error === "object" && "proposedWord" in error
    ? text((error as { proposedWord?: unknown }).proposedWord)
    : "";

  const messages: Record<string, string> = {
    UNAUTHORIZED: "سجّل الدخول أولًا لبدء تحدي المفردات.",
    FORBIDDEN: "لا تملك صلاحية لهذه المباراة.",
    INVALID_ROOM_CODE: "أدخل كود غرفة صحيحًا من 6 أرقام.",
    ROOM_NOT_FOUND: "الغرفة غير موجودة أو انتهت صلاحيتها.",
    ROOM_NOT_AVAILABLE: "هذه الغرفة بدأت أو لم تعد متاحة.",
    OWN_ROOM: "لا يمكنك الانضمام إلى الغرفة التي أنشأتها بنفس الحساب.",
    NOT_YOUR_TURN: "انتظر دورك.",
    TURN_EXPIRED: "انتهى وقت الدور. جاري الانتقال للدور التالي.",
    INVALID_MOVE: "اختر بطاقة ومكانًا صحيحًا.",
    CARD_NOT_FOUND: "هذه البطاقة لم تعد موجودة في يدك.",
    INVALID_WORD: proposedWord ? `«${proposedWord}» ليست كلمة معتمدة في قاموس اللعبة.` : "الكلمة الناتجة غير معتمدة.",
    MOVE_AVAILABLE: "لديك حركة صحيحة؛ استخدم إحدى بطاقاتك بدل السحب.",
    GAME_NOT_PLAYING: "المباراة ليست في حالة لعب الآن.",
    ROOM_CODE_FAILED: "تعذر إنشاء كود الغرفة. حاول مرة أخرى.",
  };

  const status = code === "UNAUTHORIZED" ? 401
    : code === "FORBIDDEN" ? 403
      : ["ROOM_NOT_FOUND"].includes(code) ? 404
        : ["INVALID_WORD", "MOVE_AVAILABLE", "NOT_YOUR_TURN", "TURN_EXPIRED", "ROOM_NOT_AVAILABLE", "OWN_ROOM"].includes(code) ? 409
          : 400;

  return NextResponse.json({ error: messages[code] || "تعذر إتمام عملية تحدي المفردات الآن.", code, proposedWord }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const member = await verifiedMember(request);
    const body = (await request.json().catch(() => null)) as VocabularyChallengeAction | null;
    if (!body || !body.action) throw new Error("INVALID_MOVE");

    if (body.action === "create") {
      const mode = body.mode === "duel" ? "duel" : "solo";
      return NextResponse.json(await createRoom(member.userId, member.userName, mode));
    }
    if (body.action === "join") {
      return NextResponse.json(await joinRoom(member.userId, member.userName, body.roomCode));
    }
    if (body.action === "move") {
      return NextResponse.json(await makeMove(member.userId, text(body.roomId), text(body.cardId), body.position));
    }
    if (body.action === "draw") {
      return NextResponse.json(await drawCard(member.userId, text(body.roomId)));
    }
    if (body.action === "timeout") {
      return NextResponse.json(await handleTimeout(member.userId, text(body.roomId)));
    }
    if (body.action === "forfeit") {
      return NextResponse.json(await forfeitRoom(member.userId, text(body.roomId)));
    }

    throw new Error("INVALID_MOVE");
  } catch (error) {
    console.error("Vocabulary challenge API error:", error);
    return errorResponse(error);
  }
}
