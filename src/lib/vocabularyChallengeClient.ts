"use client";

import { auth } from "@/lib/firebase";
import type {
  VocabularyChallengeAction,
  VocabularyBotDifficulty,
  VocabularyDictionaryClientOverrides,
  VocabularyLeaderboard,
  VocabularyLeaderboardPeriod,
  VocabularyProfile,
  VocabularyVoiceIceConfig,
} from "@/types/vocabularyChallenge";

type ActionResponse = {
  roomId?: string;
  roomCode?: string | null;
  status?: string;
  validWord?: string;
  finished?: boolean;
  drawn?: boolean;
  timedOut?: boolean;
  cancelled?: boolean;
  noop?: boolean;
  resultIds?: Record<string, string>;
  searching?: boolean;
  matched?: boolean;
  rematchWaiting?: boolean;
  reported?: boolean;
  heartbeat?: boolean;
  at?: number;
};

type ErrorPayload = {
  error?: string;
  code?: string;
  proposedWord?: string;
};

export class VocabularyChallengeApiError extends Error {
  code: string;
  proposedWord: string;

  constructor(message: string, code = "", proposedWord = "") {
    super(message);
    this.name = "VocabularyChallengeApiError";
    this.code = code;
    this.proposedWord = proposedWord;
  }
}

async function authHeaders(withJson = false) {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw new VocabularyChallengeApiError("انتهت جلسة الدخول. سجّل الدخول مرة أخرى.", "UNAUTHORIZED");
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${await firebaseUser.getIdToken()}`,
  };
  if (withJson) headers["Content-Type"] = "application/json";
  return headers;
}

async function actionRequest(body: VocabularyChallengeAction): Promise<ActionResponse> {
  const response = await fetch("/api/games/vocabulary-challenge", {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as ActionResponse & ErrorPayload;

  if (!response.ok) {
    throw new VocabularyChallengeApiError(
      data.error || "تعذر إتمام عملية تحدي المفردات الآن.",
      data.code || "",
      data.proposedWord || "",
    );
  }

  return data;
}

export function createVocabularyChallenge(mode: "solo" | "duel", botDifficulty: VocabularyBotDifficulty = "normal") {
  return actionRequest({ action: "create", mode, botDifficulty });
}

export function joinVocabularyChallenge(roomCode: string) {
  return actionRequest({ action: "join", roomCode });
}

export function playVocabularyCard(roomId: string, cardId: string, position: number) {
  return actionRequest({ action: "move", roomId, cardId, position });
}

export function drawVocabularyCard(roomId: string) {
  return actionRequest({ action: "draw", roomId });
}

export function processVocabularyTimeout(roomId: string) {
  return actionRequest({ action: "timeout", roomId });
}

export function forfeitVocabularyChallenge(roomId: string) {
  return actionRequest({ action: "forfeit", roomId });
}

export function heartbeatVocabularyChallenge(roomId: string) {
  return actionRequest({ action: "heartbeat", roomId });
}

export function claimVocabularyDisconnect(roomId: string) {
  return actionRequest({ action: "claimDisconnect", roomId });
}

export function requestVocabularyRematch(roomId: string) {
  return actionRequest({ action: "rematch", roomId });
}

export function matchmakeVocabularyChallenge() {
  return actionRequest({ action: "matchmake" });
}

export function cancelVocabularyMatchmaking() {
  return actionRequest({ action: "cancelMatchmaking" });
}


export function playVocabularyBotTurn(roomId: string) {
  return actionRequest({ action: "botTurn", roomId });
}

export function reportVocabularyWord(roomId: string, word: string) {
  return actionRequest({ action: "reportWord", roomId, word });
}

export function sendVocabularyVoiceSignal(
  roomId: string,
  kind: "offer" | "answer" | "reset",
  sessionId: string,
  sdp?: string,
) {
  return actionRequest({ action: "voiceSignal", roomId, kind, sessionId, sdp });
}


export async function getVocabularyActiveRoom(): Promise<{ roomId: string | null; status?: string; mode?: string }> {
  const response = await fetch("/api/games/vocabulary-challenge?view=active", {
    headers: await authHeaders(),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as { roomId?: string | null; status?: string; mode?: string } & ErrorPayload;
  if (!response.ok) throw new VocabularyChallengeApiError(data.error || "تعذر استعادة المباراة الحالية.", data.code || "");
  return { roomId: data.roomId || null, status: data.status, mode: data.mode };
}

export async function getVocabularyLeaderboard(period: VocabularyLeaderboardPeriod = "daily"): Promise<VocabularyLeaderboard> {
  const response = await fetch(`/api/games/vocabulary-challenge?view=leaderboard&period=${period}`, {
    method: "GET",
    headers: await authHeaders(),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as VocabularyLeaderboard & ErrorPayload;
  if (!response.ok) {
    throw new VocabularyChallengeApiError(data.error || "تعذر تحميل ترتيب المفردات.", data.code || "");
  }
  return data;
}

export function getVocabularyDailyLeaderboard() {
  return getVocabularyLeaderboard("daily");
}

export async function getVocabularyProfile(): Promise<VocabularyProfile> {
  const response = await fetch("/api/games/vocabulary-challenge?view=profile", {
    headers: await authHeaders(),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as VocabularyProfile & ErrorPayload;
  if (!response.ok) throw new VocabularyChallengeApiError(data.error || "تعذر تحميل ملف المفردات.", data.code || "");
  return data;
}

export async function getVocabularyDictionaryOverrides(): Promise<VocabularyDictionaryClientOverrides> {
  const response = await fetch("/api/games/vocabulary-challenge?view=overrides", {
    headers: await authHeaders(),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as VocabularyDictionaryClientOverrides & ErrorPayload;
  if (!response.ok) throw new VocabularyChallengeApiError(data.error || "تعذر تحديث قاموس اللعبة.", data.code || "");
  return {
    enabledWords: Array.isArray(data.enabledWords) ? data.enabledWords : [],
    disabledWords: Array.isArray(data.disabledWords) ? data.disabledWords : [],
  };
}

export async function getVocabularyVoiceIceServers(roomId: string): Promise<VocabularyVoiceIceConfig> {
  const response = await fetch(`/api/games/vocabulary-challenge?view=voice-ice&roomId=${encodeURIComponent(roomId)}`, {
    headers: await authHeaders(),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as Partial<VocabularyVoiceIceConfig> & ErrorPayload;
  if (!response.ok) throw new VocabularyChallengeApiError(data.error || "تعذر تجهيز خادم الصوت.", data.code || "");
  return {
    iceServers: Array.isArray(data.iceServers) ? data.iceServers as RTCIceServer[] : [],
    turnEnabled: Boolean(data.turnEnabled),
    provider: data.provider === "cloudflare" || data.provider === "static" ? data.provider : "stun-only",
  };
}
