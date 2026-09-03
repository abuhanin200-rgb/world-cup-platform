import { auth } from "@/lib/firebase";
import type {
  WordGameDailyGame,
  WordGameLeaderboardItem,
  WordGameUserStats,
} from "@/types/wordGame";
import type { WordGameClientGame } from "@/lib/wordGameServerLogic";

export type { WordGameClientGame } from "@/lib/wordGameServerLogic";

export type WordGameAdminGameItem = {
  userId: string;
  targetWord: string;
  status: WordGameDailyGame["status"];
  attemptsUsed: number;
  durationMs: number | null;
  won: boolean;
};

type WordGameState = {
  game: WordGameClientGame;
  leaderboard: WordGameLeaderboardItem[];
  stats: WordGameUserStats | null;
};

async function authenticatedRequest(path: string, init: RequestInit = {}) {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error("سجّل الدخول أولًا للعب كلمة اليوم.");

  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await firebaseUser.getIdToken()}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(data?.error || "تعذر إتمام عملية لعبة الكلمات الآن.");
  return data;
}

export async function getOrCreateTodayWordGame(params: { userId: string }): Promise<WordGameClientGame> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser || firebaseUser.uid !== params.userId) {
    throw new Error("انتهت جلسة الدخول. سجّل الدخول مرة أخرى.");
  }
  const data = await authenticatedRequest("/api/games/word-game") as WordGameState;
  return data.game;
}

export async function submitWordGameGuess(params: { userId: string; guess: string }): Promise<WordGameState> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser || firebaseUser.uid !== params.userId) {
    throw new Error("انتهت جلسة الدخول. سجّل الدخول مرة أخرى.");
  }
  return authenticatedRequest("/api/games/word-game", {
    method: "POST",
    body: JSON.stringify({ guess: params.guess }),
  }) as Promise<WordGameState>;
}

export async function getTodayWordGameLeaderboard(): Promise<WordGameLeaderboardItem[]> {
  const data = await authenticatedRequest("/api/games/word-game") as WordGameState;
  return data.leaderboard;
}

export async function getWordGameUserStats(userId: string): Promise<WordGameUserStats | null> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser || firebaseUser.uid !== userId) return null;
  const data = await authenticatedRequest("/api/games/word-game") as WordGameState;
  return data.stats;
}

async function adminAction(action: string, body: Record<string, unknown> = {}) {
  return authenticatedRequest("/api/games/word-game", {
    method: "POST",
    body: JSON.stringify({ action, ...body }),
  });
}

export async function getTodayWordGameAdminGames(): Promise<WordGameAdminGameItem[]> {
  const data = await adminAction("admin_list") as { games?: WordGameAdminGameItem[] };
  return data.games || [];
}

export async function adminDeleteUserTodayWordGameResult(userId: string) {
  await adminAction("admin_delete_user_today", { userId });
}

export async function adminDeleteTodayWordGameResults() {
  const data = await adminAction("admin_delete_today") as { deletedGames?: number; deletedResults?: number };
  return { deletedGames: data.deletedGames || 0, deletedResults: data.deletedResults || 0 };
}
