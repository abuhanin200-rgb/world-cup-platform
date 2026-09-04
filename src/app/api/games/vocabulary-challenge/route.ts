import { NextRequest, NextResponse } from "next/server";
import type { DocumentReference, QueryDocumentSnapshot, Transaction } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import {
  VOCABULARY_DICTIONARY_VERSION,
  createFairVocabularyLetters,
  drawFairVocabularyLetter,
  getVocabularyMoves,
  replaceVocabularyLetter,
} from "@/lib/vocabularyChallengeDictionary";
import {
  getVocabularyDictionaryOverrides,
  getVocabularyMovesServer,
  hasVocabularyMoveServer,
  isApprovedVocabularyWordServer,
  randomActiveStartingWord,
} from "@/lib/serverVocabularyDictionary";
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
const MATCHMAKING_COLLECTION = "vocabularyChallengeMatchmaking";
const HAND_SIZE = 10;
const TURN_DURATION_MS = 10_000;
const MATCH_DURATION_MS = 5 * 60_000;
const BOT_ID = "vocabulary-bot";
const BOT_NAME = "بوت التحدي";

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
  const ids = roomPlayerIds(room);
  return ids.find((id) => id !== currentUserId) || currentUserId;
}

function humanPlayerIds(room: Record<string, unknown>) {
  return roomPlayerIds(room).filter((id) => id !== BOT_ID);
}

function timeWinnerId(room: Record<string, unknown>) {
  const ids = roomPlayerIds(room);
  if (ids.length !== 2) return null;
  const [a, b] = ids;
  const aCount = cardCount(room, a);
  const bCount = cardCount(room, b);
  if (aCount === bCount) return null;
  return aCount < bCount ? a : b;
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
  const ids = humanPlayerIds(params.room);
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
  const startingWord = await randomActiveStartingWord();
  const roomRef = adminDb.collection(ROOM_COLLECTION).doc();
  const userCards = createCards(createFairVocabularyLetters(startingWord, HAND_SIZE));
  const roomCode = mode === "duel" ? await uniqueRoomCode() : null;
  const startsNow = mode === "solo";
  const matchStartedAt = startsNow ? now : null;
  const matchEndsAt = startsNow ? now + MATCH_DURATION_MS : null;
  const botCards = startsNow ? createCards(createFairVocabularyLetters(startingWord, HAND_SIZE)) : [];

  const players: Record<string, Record<string, unknown>> = {
    [userId]: { userId, userName, cardCount: userCards.length, moves: 0, draws: 0 },
  };
  if (startsNow) {
    players[BOT_ID] = { userId: BOT_ID, userName: BOT_NAME, cardCount: botCards.length, moves: 0, draws: 0, isBot: true };
  }

  const room = {
    id: roomRef.id,
    dictionaryVersion: VOCABULARY_DICTIONARY_VERSION,
    mode,
    status: startsNow ? "playing" : "waiting",
    roomCode,
    hostId: userId,
    hostName: userName,
    guestId: startsNow ? BOT_ID : null,
    guestName: startsNow ? BOT_NAME : null,
    playerOrder: startsNow ? [userId, BOT_ID] : [userId],
    players,
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
    recentMoves: [],
    resultIds: {},
    rematchRequestedBy: null,
    rematchRoomId: null,
    voiceSessionId: null,
    voiceOffer: null,
    voiceAnswer: null,
    voiceUpdatedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const batch = adminDb.batch();
  batch.set(roomRef, room);
  batch.set(roomRef.collection("hands").doc(userId), { userId, cards: userCards, updatedAt: now });
  if (startsNow) batch.set(roomRef.collection("hands").doc(BOT_ID), { userId: BOT_ID, cards: botCards, updatedAt: now });
  await batch.commit();

  return { roomId: roomRef.id, roomCode, status: room.status };
}

function startedDuelRoomData(params: {
  roomId: string;
  hostId: string;
  hostName: string;
  guestId: string;
  guestName: string;
  startingWord: string;
  now: number;
}) {
  const hostCards = createCards(createFairVocabularyLetters(params.startingWord, HAND_SIZE));
  const guestCards = createCards(createFairVocabularyLetters(params.startingWord, HAND_SIZE));
  const firstPlayer = Math.random() < 0.5 ? params.hostId : params.guestId;
  const matchEndsAt = params.now + MATCH_DURATION_MS;
  const room = {
    id: params.roomId,
    dictionaryVersion: VOCABULARY_DICTIONARY_VERSION,
    mode: "duel" as const,
    status: "playing" as const,
    roomCode: null,
    hostId: params.hostId,
    hostName: params.hostName,
    guestId: params.guestId,
    guestName: params.guestName,
    playerOrder: [params.hostId, params.guestId],
    players: {
      [params.hostId]: { userId: params.hostId, userName: params.hostName, cardCount: hostCards.length, moves: 0, draws: 0 },
      [params.guestId]: { userId: params.guestId, userName: params.guestName, cardCount: guestCards.length, moves: 0, draws: 0 },
    },
    startingWord: params.startingWord,
    currentWord: params.startingWord,
    turnPlayerId: firstPlayer,
    turnStartedAt: params.now,
    turnEndsAt: Math.min(params.now + TURN_DURATION_MS, matchEndsAt),
    turnDurationMs: TURN_DURATION_MS,
    matchStartedAt: params.now,
    matchEndsAt,
    matchDurationMs: MATCH_DURATION_MS,
    winnerId: null,
    finishReason: null,
    lastMove: null,
    recentMoves: [],
    resultIds: {},
    rematchRequestedBy: null,
    rematchRoomId: null,
    voiceSessionId: null,
    voiceOffer: null,
    voiceAnswer: null,
    voiceUpdatedAt: null,
    createdAt: params.now,
    updatedAt: params.now,
  };
  return { room, hostCards, guestCards };
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

async function matchmakeRoom(userId: string, userName: string) {
  const now = Date.now();
  const queueRef = adminDb.collection(MATCHMAKING_COLLECTION).doc(userId);
  const ownSnap = await queueRef.get();
  const own = ownSnap.exists ? ownSnap.data() || {} : {};
  if (text(own.status) === "matched" && text(own.roomId)) {
    const previousRoomId = text(own.roomId);
    const previousRoomSnap = await adminDb.collection(ROOM_COLLECTION).doc(previousRoomId).get();
    const previousRoom = previousRoomSnap.exists ? previousRoomSnap.data() || {} : {};
    const previousStatus = text(previousRoom.status);
    if (previousRoomSnap.exists && (previousStatus === "waiting" || previousStatus === "playing")) {
      return { matched: true, searching: false, roomId: previousRoomId };
    }
    await queueRef.delete().catch(() => undefined);
  }

  const waiting = await adminDb.collection(MATCHMAKING_COLLECTION).where("status", "==", "waiting").limit(30).get();
  const candidate = waiting.docs.find((docSnap) => {
    const data = docSnap.data() || {};
    return docSnap.id !== userId && number(data.expiresAt) > now && text(data.userId);
  });

  if (!candidate) {
    await queueRef.set({
      userId,
      userName,
      status: "waiting",
      roomId: null,
      createdAt: text(own.status) === "waiting" && number(own.createdAt) ? number(own.createdAt) : now,
      updatedAt: now,
      expiresAt: now + 70_000,
    }, { merge: true });
    return { matched: false, searching: true };
  }

  const candidateData = candidate.data() || {};
  const opponentId = text(candidateData.userId) || candidate.id;
  const opponentName = text(candidateData.userName) || "عضو";
  const roomRef = adminDb.collection(ROOM_COLLECTION).doc();
  const startingWord = await randomActiveStartingWord();
  const duel = startedDuelRoomData({
    roomId: roomRef.id,
    hostId: opponentId,
    hostName: opponentName,
    guestId: userId,
    guestName: userName,
    startingWord,
    now,
  });

  try {
    const matchedRoomId = await adminDb.runTransaction(async (transaction: Transaction) => {
      const [candidateSnap, latestOwnSnap] = await Promise.all([
        transaction.get(candidate.ref),
        transaction.get(queueRef),
      ]);
      const latestCandidate = candidateSnap.data() || {};
      const latestOwn = latestOwnSnap.exists ? latestOwnSnap.data() || {} : {};
      if (!candidateSnap.exists || text(latestCandidate.status) !== "waiting" || number(latestCandidate.expiresAt) <= now) {
        throw new Error("MATCH_CHANGED");
      }
      if (text(latestOwn.status) === "matched" && text(latestOwn.roomId)) return text(latestOwn.roomId);

      transaction.set(roomRef, duel.room);
      transaction.set(roomRef.collection("hands").doc(opponentId), { userId: opponentId, cards: duel.hostCards, updatedAt: now });
      transaction.set(roomRef.collection("hands").doc(userId), { userId, cards: duel.guestCards, updatedAt: now });
      transaction.set(candidate.ref, { ...latestCandidate, status: "matched", roomId: roomRef.id, updatedAt: now, expiresAt: now + 5 * 60_000 }, { merge: true });
      transaction.set(queueRef, { userId, userName, status: "matched", roomId: roomRef.id, createdAt: number(latestOwn.createdAt) || now, updatedAt: now, expiresAt: now + 5 * 60_000 }, { merge: true });
      return roomRef.id;
    });
    return { matched: true, searching: false, roomId: matchedRoomId || roomRef.id };
  } catch (error) {
    if (error instanceof Error && error.message === "MATCH_CHANGED") {
      await queueRef.set({ userId, userName, status: "waiting", roomId: null, createdAt: now, updatedAt: now, expiresAt: now + 70_000 }, { merge: true });
      return { matched: false, searching: true };
    }
    throw error;
  }
}

async function cancelMatchmaking(userId: string) {
  await adminDb.collection(MATCHMAKING_COLLECTION).doc(userId).delete().catch(() => undefined);
  return { cancelled: true };
}

async function requestRematch(userId: string, userName: string, roomId: string) {
  if (!roomId) throw new Error("ROOM_NOT_FOUND");
  const roomRef = adminDb.collection(ROOM_COLLECTION).doc(roomId);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) throw new Error("ROOM_NOT_FOUND");
  const room = roomSnap.data() || {};
  if (!participant(room, userId)) throw new Error("FORBIDDEN");
  if (text(room.status) !== "finished") throw new Error("GAME_NOT_FINISHED");

  if (text(room.mode) === "solo") {
    return createRoom(userId, userName, "solo");
  }

  if (text(room.rematchRoomId)) {
    return { roomId: text(room.rematchRoomId), matched: true, rematchWaiting: false };
  }

  const requestedBy = text(room.rematchRequestedBy);
  if (!requestedBy || requestedBy === userId) {
    await roomRef.set({ rematchRequestedBy: userId, updatedAt: Date.now() }, { merge: true });
    return { rematchWaiting: true, matched: false };
  }

  const hostId = text(room.hostId);
  const guestId = text(room.guestId);
  if (!hostId || !guestId) throw new Error("ROOM_NOT_AVAILABLE");
  const newRoomRef = adminDb.collection(ROOM_COLLECTION).doc();
  const now = Date.now();
  const startingWord = await randomActiveStartingWord();
  const duel = startedDuelRoomData({
    roomId: newRoomRef.id,
    hostId,
    hostName: playerName(room, hostId),
    guestId,
    guestName: playerName(room, guestId),
    startingWord,
    now,
  });

  const rematchRoomId = await adminDb.runTransaction(async (transaction: Transaction) => {
    const latestSnap = await transaction.get(roomRef);
    if (!latestSnap.exists) throw new Error("ROOM_NOT_FOUND");
    const latest = latestSnap.data() || {};
    if (text(latest.rematchRoomId)) return text(latest.rematchRoomId);
    if (text(latest.status) !== "finished" || text(latest.rematchRequestedBy) !== requestedBy) throw new Error("REMATCH_CHANGED");

    transaction.set(newRoomRef, duel.room);
    transaction.set(newRoomRef.collection("hands").doc(hostId), { userId: hostId, cards: duel.hostCards, updatedAt: now });
    transaction.set(newRoomRef.collection("hands").doc(guestId), { userId: guestId, cards: duel.guestCards, updatedAt: now });
    transaction.update(roomRef, {
      rematchRequestedBy: null,
      rematchRoomId: newRoomRef.id,
      rematchAcceptedAt: now,
      updatedAt: now,
    });
    return newRoomRef.id;
  });

  return { roomId: rematchRoomId || newRoomRef.id, matched: true, rematchWaiting: false };
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
      const winnerId = timeWinnerId(room);
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

    if (!afterWord || !(await isApprovedVocabularyWordServer(afterWord, transaction))) {
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
    const move = {
      actorId: userId,
      actorName: playerName(room, userId),
      beforeWord,
      afterWord,
      letter: text(card.letter),
      position,
      at: now,
    };
    const previousMoves = Array.isArray(room.recentMoves) ? room.recentMoves.slice(-7) : [];
    const recentMoves = [...previousMoves, move];
    const nextRoom = { ...room, players, currentWord: afterWord, lastMove: move, recentMoves };

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
        lastMove: move,
        recentMoves,
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
      lastMove: move,
      recentMoves,
      updatedAt: now,
    });

    return { finished: false, validWord: afterWord };
  });

  if (result.finished) await syncFinishedResults(result.resultIds);
  return result;
}


function botMoveScore(currentWord: string, candidateWord: string) {
  // The bot never reads the human hand. It only prefers words with fewer onward
  // paths, which makes it strategic without giving it hidden information.
  const onwardMoves = getVocabularyMoves(candidateWord).filter((move) => move.word !== candidateWord).length;
  const unchangedPenalty = candidateWord === currentWord ? 30 : 0;
  return onwardMoves + unchangedPenalty + Math.random() * 2.5;
}

async function playBotTurn(userId: string, roomId: string) {
  if (!roomId) throw new Error("ROOM_NOT_FOUND");
  const roomRef = adminDb.collection(ROOM_COLLECTION).doc(roomId);
  const botHandRef = roomRef.collection("hands").doc(BOT_ID);
  const now = Date.now();

  const result = await adminDb.runTransaction(async (transaction: Transaction) => {
    const [roomSnap, botHandSnap] = await Promise.all([transaction.get(roomRef), transaction.get(botHandRef)]);
    if (!roomSnap.exists || !botHandSnap.exists) throw new Error("ROOM_NOT_FOUND");
    const room = roomSnap.data() || {};
    if (!participant(room, userId)) throw new Error("FORBIDDEN");
    if (text(room.mode) !== "solo") throw new Error("BOT_ONLY_SOLO");
    if (text(room.status) !== "playing") throw new Error("GAME_NOT_PLAYING");
    if (text(room.turnPlayerId) !== BOT_ID) return { noop: true };

    if (number(room.matchEndsAt) && now >= number(room.matchEndsAt)) {
      const winnerId = timeWinnerId(room);
      const resultIds = finalizeRoom({ transaction, roomRef, roomId, room, winnerId, reason: "time", now });
      return { finished: true, resultIds };
    }

    const handData = botHandSnap.data() || {};
    const cards = Array.isArray(handData.cards) ? (handData.cards as VocabularyChallengeCard[]) : [];
    const beforeWord = text(room.currentWord);
    const legalMoves = await getVocabularyMovesServer(beforeWord, cards.map((card) => text(card.letter)), transaction);

    if (!legalMoves.length) {
      const newCard = createCards([drawFairVocabularyLetter(beforeWord, cards.map((card) => text(card.letter)))])[0];
      const nextCards = [...cards, newCard];
      const existingPlayers = room.players && typeof room.players === "object"
        ? room.players as Record<string, Record<string, unknown>>
        : {};
      const currentSummary = existingPlayers[BOT_ID] || {};
      const players = updatePlayer(room, BOT_ID, {
        cardCount: nextCards.length,
        draws: Math.max(0, Math.floor(number(currentSummary.draws))) + 1,
        isBot: true,
      });
      const matchEndsAt = number(room.matchEndsAt);

      transaction.set(botHandRef, { userId: BOT_ID, cards: nextCards, updatedAt: now }, { merge: true });
      transaction.update(roomRef, {
        players,
        turnPlayerId: text(room.hostId),
        turnStartedAt: now,
        turnEndsAt: matchEndsAt ? Math.min(now + TURN_DURATION_MS, matchEndsAt) : now + TURN_DURATION_MS,
        updatedAt: now,
      });
      return { botDrew: true };
    }

    const strategicMoves = [...legalMoves].sort((a, b) => botMoveScore(beforeWord, a.word) - botMoveScore(beforeWord, b.word));
    const shortlist = strategicMoves.slice(0, Math.min(4, strategicMoves.length));
    const chosen = shortlist[Math.floor(Math.random() * shortlist.length)] || strategicMoves[0];
    const cardIndex = cards.findIndex((card) => text(card.letter) === chosen.letter);
    if (cardIndex < 0) throw new Error("CARD_NOT_FOUND");
    const playedCard = cards[cardIndex];
    const nextCards = cards.filter((_, index) => index !== cardIndex);
    const existingPlayers = room.players && typeof room.players === "object"
      ? room.players as Record<string, Record<string, unknown>>
      : {};
    const currentSummary = existingPlayers[BOT_ID] || {};
    const players = updatePlayer(room, BOT_ID, {
      cardCount: nextCards.length,
      moves: Math.max(0, Math.floor(number(currentSummary.moves))) + 1,
      isBot: true,
    });
    const move = {
      actorId: BOT_ID,
      actorName: BOT_NAME,
      beforeWord,
      afterWord: chosen.word,
      letter: text(playedCard.letter),
      position: chosen.position,
      at: now,
    };
    const previousMoves = Array.isArray(room.recentMoves) ? room.recentMoves.slice(-7) : [];
    const recentMoves = [...previousMoves, move];
    const nextRoom = { ...room, players, currentWord: chosen.word, lastMove: move, recentMoves };

    transaction.set(botHandRef, { userId: BOT_ID, cards: nextCards, updatedAt: now }, { merge: true });

    if (nextCards.length === 0) {
      const resultIds = finalizeRoom({
        transaction,
        roomRef,
        roomId,
        room: nextRoom,
        winnerId: BOT_ID,
        reason: "cards",
        now,
      });
      transaction.update(roomRef, {
        players,
        currentWord: chosen.word,
        lastMove: move,
        recentMoves,
      });
      return { finished: true, botWord: chosen.word, resultIds };
    }

    const matchEndsAt = number(room.matchEndsAt);
    transaction.update(roomRef, {
      players,
      currentWord: chosen.word,
      turnPlayerId: text(room.hostId),
      turnStartedAt: now,
      turnEndsAt: matchEndsAt ? Math.min(now + TURN_DURATION_MS, matchEndsAt) : now + TURN_DURATION_MS,
      lastMove: move,
      recentMoves,
      updatedAt: now,
    });
    return { botWord: chosen.word };
  });

  if ("finished" in result && result.finished) await syncFinishedResults(result.resultIds);
  return result;
}

async function updateVoiceSignal(
  userId: string,
  roomId: string,
  kind: "offer" | "answer" | "reset",
  sessionId: string,
  rawSdp?: string,
) {
  if (!roomId) throw new Error("ROOM_NOT_FOUND");
  const cleanSessionId = text(sessionId).slice(0, 160);
  const sdp = String(rawSdp || "");
  if (kind !== "reset" && (!cleanSessionId || !sdp || sdp.length > 28_000 || !sdp.includes("v=0"))) {
    throw new Error("INVALID_VOICE_SIGNAL");
  }

  const roomRef = adminDb.collection(ROOM_COLLECTION).doc(roomId);
  const now = Date.now();
  return adminDb.runTransaction(async (transaction: Transaction) => {
    const roomSnap = await transaction.get(roomRef);
    if (!roomSnap.exists) throw new Error("ROOM_NOT_FOUND");
    const room = roomSnap.data() || {};
    if (!participant(room, userId)) throw new Error("FORBIDDEN");
    if (text(room.mode) !== "duel" || text(room.status) !== "playing") throw new Error("VOICE_NOT_AVAILABLE");

    if (kind === "reset") {
      transaction.update(roomRef, {
        voiceSessionId: null,
        voiceOffer: null,
        voiceAnswer: null,
        voiceUpdatedAt: now,
      });
      return { voiceUpdated: true };
    }

    if (kind === "offer") {
      if (text(room.hostId) !== userId) throw new Error("VOICE_HOST_ONLY");
      transaction.update(roomRef, {
        voiceSessionId: cleanSessionId,
        voiceOffer: { sessionId: cleanSessionId, fromUserId: userId, sdp, at: now },
        voiceAnswer: null,
        voiceUpdatedAt: now,
      });
      return { voiceUpdated: true };
    }

    if (text(room.guestId) !== userId) throw new Error("VOICE_GUEST_ONLY");
    if (text(room.voiceSessionId) !== cleanSessionId) throw new Error("VOICE_SESSION_CHANGED");
    transaction.update(roomRef, {
      voiceAnswer: { sessionId: cleanSessionId, fromUserId: userId, sdp, at: now },
      voiceUpdatedAt: now,
    });
    return { voiceUpdated: true };
  });
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
    if (await hasVocabularyMoveServer(text(room.currentWord), letters, transaction)) throw new Error("MOVE_AVAILABLE");

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
      const winnerId = timeWinnerId(room);
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

type LeaderboardPeriod = "daily" | "weekly" | "season";

function riyadhPeriodWindow(period: LeaderboardPeriod, now = Date.now()) {
  const shifted = new Date(now + RIYADH_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const day = shifted.getUTCDate();

  if (period === "season") {
    const start = Date.UTC(year, month, 1) - RIYADH_OFFSET_MS;
    const end = Date.UTC(year, month + 1, 1) - RIYADH_OFFSET_MS;
    return { start, end, periodKey: `${year}-${String(month + 1).padStart(2, "0")}` };
  }

  if (period === "weekly") {
    const dayOfWeek = shifted.getUTCDay();
    const start = Date.UTC(year, month, day - dayOfWeek) - RIYADH_OFFSET_MS;
    const end = start + 7 * 24 * 60 * 60_000;
    const startShifted = new Date(start + RIYADH_OFFSET_MS);
    const periodKey = `${startShifted.getUTCFullYear()}-${String(startShifted.getUTCMonth() + 1).padStart(2, "0")}-${String(startShifted.getUTCDate()).padStart(2, "0")}`;
    return { start, end, periodKey };
  }

  const start = Date.UTC(year, month, day) - RIYADH_OFFSET_MS;
  const end = start + 24 * 60 * 60_000;
  const periodKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { start, end, periodKey };
}

function calculateWinStreak(events: Array<{ at: number; won: boolean }>) {
  let streak = 0;
  for (const event of [...events].sort((a, b) => a.at - b.at)) {
    streak = event.won ? streak + 1 : 0;
  }
  return streak;
}

async function leaderboard(userId: string, period: LeaderboardPeriod) {
  const { start, end, periodKey } = riyadhPeriodWindow(period);
  const snapshot = await adminDb
    .collection(RESULT_COLLECTION)
    .where("finishedAt", ">=", start)
    .where("finishedAt", "<", end)
    .limit(period === "season" ? 5000 : 3000)
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
    events: Array<{ at: number; won: boolean }>;
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
      events: [],
    };

    current.games += 1;
    current.words += Math.max(0, Math.floor(number(result.moves)));
    current.events.push({ at: number(result.finishedAt), won });
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
    .map(({ events, ...entry }) => ({ ...entry, streak: calculateWinStreak(events) }))
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
    period,
    periodKey,
    timezone: "Asia/Riyadh" as const,
    totalPlayers: ranked.length,
    entries: ranked.slice(0, 10),
    me: ranked.find((entry) => entry.userId === userId) || null,
  };
}

async function vocabularyProfile(userId: string) {
  const snapshot = await adminDb.collection(RESULT_COLLECTION).where("userId", "==", userId).limit(1500).get();
  const results = snapshot.docs
    .map((docSnap) => docSnap.data() || {})
    .filter((result) => Boolean(result.completed))
    .sort((a, b) => number(a.finishedAt) - number(b.finishedAt));

  let wins = 0;
  let losses = 0;
  let draws = 0;
  let duelWins = 0;
  let soloWins = 0;
  let words = 0;
  let cardsDrawn = 0;
  let bestDurationMs: number | null = null;
  let currentStreak = 0;
  let bestWinStreak = 0;
  let noDrawWins = 0;
  let fastWins = 0;

  const todayWindow = riyadhPeriodWindow("daily");
  let todayWinStreak = 0;
  for (const result of results) {
    const won = Boolean(result.won);
    const outcome = text(result.outcome);
    const mode = text(result.mode);
    const finishedAt = number(result.finishedAt);
    const durationMs = Math.max(0, number(result.durationMs));
    words += Math.max(0, Math.floor(number(result.moves)));
    cardsDrawn += Math.max(0, Math.floor(number(result.draws)));

    if (won) {
      wins += 1;
      currentStreak += 1;
      bestWinStreak = Math.max(bestWinStreak, currentStreak);
      if (mode === "duel") duelWins += 1;
      else soloWins += 1;
      if (number(result.draws) === 0) noDrawWins += 1;
      if (durationMs > 0 && durationMs <= 60_000) fastWins += 1;
      if (durationMs > 0 && (bestDurationMs === null || durationMs < bestDurationMs)) bestDurationMs = durationMs;
    } else {
      currentStreak = 0;
      if (outcome === "draw") draws += 1;
      else losses += 1;
    }

    if (finishedAt >= todayWindow.start && finishedAt < todayWindow.end) {
      todayWinStreak = won ? todayWinStreak + 1 : 0;
    }
  }

  const games = results.length;
  const achievements = [
    { id: "first-win", title: "أول انتصار", description: "حقق أول فوز في تحدي المفردات.", progress: wins, target: 1 },
    { id: "ten-wins", title: "منافس ثابت", description: "حقق 10 انتصارات.", progress: wins, target: 10 },
    { id: "streak-3", title: "ثلاثية ساخنة", description: "حقق 3 انتصارات متتالية.", progress: bestWinStreak, target: 3 },
    { id: "words-100", title: "رصيد لغوي", description: "استخدم 100 كلمة صحيحة.", progress: words, target: 100 },
    { id: "clean-win", title: "فوز نظيف", description: "افز بدون سحب أي بطاقة.", progress: noDrawWins, target: 1 },
    { id: "fast-win", title: "خاطف الجولة", description: "احسم مباراة خلال 60 ثانية.", progress: fastWins, target: 1 },
    { id: "duel-25", title: "سيّد المواجهات", description: "حقق 25 فوزًا ضد لاعبين.", progress: duelWins, target: 25 },
  ].map((achievement) => ({ ...achievement, unlocked: achievement.progress >= achievement.target }));

  return {
    games,
    wins,
    losses,
    draws,
    duelWins,
    soloWins,
    words,
    cardsDrawn,
    winRate: games ? Math.round((wins / games) * 100) : 0,
    bestDurationMs,
    todayWinStreak,
    bestWinStreak,
    achievements,
  };
}

export async function GET(request: NextRequest) {
  try {
    const member = await verifiedMember(request);
    const view = request.nextUrl.searchParams.get("view") || "leaderboard";
    if (view === "overrides") return NextResponse.json(await getVocabularyDictionaryOverrides());
    if (view === "profile") return NextResponse.json(await vocabularyProfile(member.userId));
    const rawPeriod = request.nextUrl.searchParams.get("period");
    const period: LeaderboardPeriod = rawPeriod === "weekly" || rawPeriod === "season" ? rawPeriod : "daily";
    return NextResponse.json(await leaderboard(member.userId, period));
  } catch (error) {
    console.error("Vocabulary challenge GET error:", error);
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
    GAME_NOT_FINISHED: "انتظر حتى تنتهي المباراة قبل طلب الإعادة.",
    REMATCH_CHANGED: "تغيرت حالة طلب الإعادة. حاول مرة أخرى.",
    MATCH_CHANGED: "تم حجز الخصم قبل لحظات. جاري البحث عن منافس آخر.",
    ROOM_CODE_FAILED: "تعذر إنشاء كود الغرفة. حاول مرة أخرى.",
    BOT_ONLY_SOLO: "دور البوت متاح فقط في اللعب الفردي.",
    VOICE_NOT_AVAILABLE: "المحادثة الصوتية متاحة فقط أثناء مباراة لاعب ضد لاعب.",
    VOICE_HOST_ONLY: "جاري إعادة تجهيز الاتصال الصوتي.",
    VOICE_GUEST_ONLY: "جاري إعادة تجهيز الاتصال الصوتي.",
    VOICE_SESSION_CHANGED: "تغير الاتصال الصوتي. جاري إعادة المحاولة.",
    INVALID_VOICE_SIGNAL: "تعذر تجهيز الاتصال الصوتي.",
  };

  const status = code === "UNAUTHORIZED" ? 401
    : code === "FORBIDDEN" ? 403
      : ["ROOM_NOT_FOUND"].includes(code) ? 404
        : ["INVALID_WORD", "MOVE_AVAILABLE", "NOT_YOUR_TURN", "TURN_EXPIRED", "ROOM_NOT_AVAILABLE", "OWN_ROOM", "GAME_NOT_FINISHED", "REMATCH_CHANGED", "MATCH_CHANGED"].includes(code) ? 409
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
    if (body.action === "rematch") {
      return NextResponse.json(await requestRematch(member.userId, member.userName, text(body.roomId)));
    }
    if (body.action === "matchmake") {
      return NextResponse.json(await matchmakeRoom(member.userId, member.userName));
    }
    if (body.action === "cancelMatchmaking") {
      return NextResponse.json(await cancelMatchmaking(member.userId));
    }
    if (body.action === "botTurn") {
      return NextResponse.json(await playBotTurn(member.userId, text(body.roomId)));
    }
    if (body.action === "voiceSignal") {
      return NextResponse.json(await updateVoiceSignal(member.userId, text(body.roomId), body.kind, text(body.sessionId), body.sdp));
    }

    throw new Error("INVALID_MOVE");
  } catch (error) {
    console.error("Vocabulary challenge API error:", error);
    return errorResponse(error);
  }
}
