"use client";

import { auth } from "@/lib/firebase";
import type { VocabularyChallengeAction, VocabularyDailyLeaderboard } from "@/types/vocabularyChallenge";

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

async function actionRequest(body: VocabularyChallengeAction): Promise<ActionResponse> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw new VocabularyChallengeApiError("انتهت جلسة الدخول. سجّل الدخول مرة أخرى.", "UNAUTHORIZED");
  }

  const response = await fetch("/api/games/vocabulary-challenge", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await firebaseUser.getIdToken()}`,
    },
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

export function createVocabularyChallenge(mode: "solo" | "duel") {
  return actionRequest({ action: "create", mode });
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


export async function getVocabularyDailyLeaderboard(): Promise<VocabularyDailyLeaderboard> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw new VocabularyChallengeApiError("انتهت جلسة الدخول. سجّل الدخول مرة أخرى.", "UNAUTHORIZED");
  }

  const response = await fetch("/api/games/vocabulary-challenge", {
    method: "GET",
    headers: { Authorization: `Bearer ${await firebaseUser.getIdToken()}` },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as VocabularyDailyLeaderboard & ErrorPayload;
  if (!response.ok) {
    throw new VocabularyChallengeApiError(data.error || "تعذر تحميل ترتيب اليوم.", data.code || "");
  }
  return data;
}
