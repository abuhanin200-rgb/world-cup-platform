import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { syncPlatformGameXp } from "@/lib/serverPlatformGameXp";
import {
  getMakkahDateKey,
  getWordForUserByDate,
} from "@/lib/wordGameLogic";
import {
  calculateWordGameGuess,
  projectWordGameForClient,
} from "@/lib/wordGameServerLogic";
import type { WordGameDailyGame } from "@/types/wordGame";
import {
  getWordGameCategoryLabel,
  getWordGameWordCategory,
} from "@/lib/wordGameWords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Game = WordGameDailyGame;

function bearerToken(request: NextRequest) {
  const [scheme, token] = (request.headers.get("authorization") || "").split(" ");
  if (scheme !== "Bearer" || !token) throw new Error("UNAUTHORIZED");
  return token;
}

async function verifiedUser(request: NextRequest) {
  try {
    return await adminAuth.verifyIdToken(bearerToken(request));
  } catch {
    throw new Error("UNAUTHORIZED");
  }
}

function text(value: unknown) { return String(value || "").trim(); }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function isAdmin(data: Record<string, unknown> | undefined) { return data?.role === "admin" && data.enabled === true; }
function errorMessage(code: string) {
  return code === "UNAUTHORIZED" ? "سجّل الدخول أولًا للعب كلمة اليوم."
    : code === "FORBIDDEN" ? "لا تملك صلاحية تنفيذ هذه العملية."
    : code === "INVALID_GUESS" ? "اكتب كلمة عربية صحيحة من خمسة أحرف."
    : code === "GAME_FINISHED" ? "انتهت محاولاتك لهذا اليوم."
    : "تعذر إتمام عملية لعبة الكلمات الآن.";
}

function gameFrom(id: string, data: Record<string, unknown>): Game {
  return {
    id, userId: text(data.userId), dateKey: text(data.dateKey), targetWord: text(data.targetWord),
    guesses: Array.isArray(data.guesses) ? data.guesses as Game["guesses"] : [],
    status: data.status === "won" || data.status === "lost" ? data.status : "playing",
    attemptsUsed: number(data.attemptsUsed), startedAt: number(data.startedAt),
    firstGuessAt: data.firstGuessAt == null ? null : number(data.firstGuessAt),
    finishedAt: data.finishedAt == null ? null : number(data.finishedAt),
    durationMs: data.durationMs == null ? null : number(data.durationMs), won: data.won === true,
  };
}

function clientGame(game: Game) {
  return projectWordGameForClient(game);
}

async function ensureGame(userId: string): Promise<Game> {
  const dateKey = getMakkahDateKey();
  const id = `${userId}_${dateKey}`;
  const ref = adminDb.collection("wordGameDailyGames").doc(id);
  const existing = await ref.get();
  if (existing.exists) return gameFrom(id, existing.data() || {});

  const [previous, today] = await Promise.all([
    adminDb.collection("wordGameDailyGames").where("userId", "==", userId).orderBy("dateKey", "desc").limit(1).get(),
    adminDb.collection("wordGameDailyGames").where("dateKey", "==", dateKey).get(),
  ]);
  const previousWord = previous.docs[0] ? text(previous.docs[0].data().targetWord) : null;
  const usedWordsToday = today.docs.map((item) => text(item.data().targetWord)).filter(Boolean);
  const targetWord = getWordForUserByDate({ userId, dateKey, previousWord, usedWordsToday });
  const game: Game = { id, userId, dateKey, targetWord, guesses: [], status: "playing", attemptsUsed: 0, startedAt: Date.now(), firstGuessAt: null, finishedAt: null, durationMs: null, won: false };
  try { await ref.create({ ...game, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); }
  catch { const retried = await ref.get(); if (retried.exists) return gameFrom(id, retried.data() || {}); throw new Error("GAME_CREATE_FAILED"); }
  return game;
}

async function state(userId: string, currentGame?: Game) {
  const game = currentGame || await ensureGame(userId);
  const dateKey = game.dateKey;
  const [results, stats] = await Promise.all([
    adminDb.collection("wordGameDailyResults").where("dateKey", "==", dateKey).get(),
    adminDb.collection("wordGameUserStats").doc(userId).get(),
  ]);

  // النتائج القديمة لم تكن تحفظ تصنيف الكلمة داخل مستند النتيجة.
  // نجلب لعبة العضو فقط عند غياب التصنيف حتى يظهر لكل عضو تصنيفه الحقيقي.
  const missingCategoryDocs = results.docs.filter(
    (item) => !text(item.data().categoryLabel)
  );
  const categoryByResultId = new Map<string, string>();

  if (missingCategoryDocs.length > 0) {
    const gameRefs = missingCategoryDocs.map((item) =>
      adminDb.collection("wordGameDailyGames").doc(item.id)
    );
    const gameSnaps = await adminDb.getAll(...gameRefs);

    gameSnaps.forEach((snap) => {
      if (!snap.exists) return;
      const targetWord = text(snap.data()?.targetWord);
      categoryByResultId.set(
        snap.id,
        getWordGameCategoryLabel(getWordGameWordCategory(targetWord))
      );
    });
  }

  const leaderboard = results.docs
    .map((item) => ({ id: item.id, data: item.data() }))
    .sort((a, b) => {
      if (a.data.won !== b.data.won) return a.data.won ? -1 : 1;
      if (number(a.data.durationMs) !== number(b.data.durationMs))
        return number(a.data.durationMs) - number(b.data.durationMs);
      return number(a.data.attemptsUsed) - number(b.data.attemptsUsed);
    })
    .map((item, index) => ({
      userId: text(item.data.userId),
      userName: text(item.data.userName) || "عضو",
      won: item.data.won === true,
      attemptsUsed: number(item.data.attemptsUsed),
      durationMs:
        item.data.durationMs == null ? null : number(item.data.durationMs),
      finishedAt: number(item.data.finishedAt),
      rank: index + 1,
      categoryLabel:
        text(item.data.categoryLabel) ||
        categoryByResultId.get(item.id) ||
        "عامة",
    }));

  return {
    game: clientGame(game),
    leaderboard,
    stats: stats.exists ? stats.data() : null,
  };
}

async function guess(userId: string, rawGuess: unknown) {
  const initial = await ensureGame(userId);
  const gameRef = adminDb.collection("wordGameDailyGames").doc(initial.id);
  const resultRef = adminDb.collection("wordGameDailyResults").doc(initial.id);
  const statsRef = adminDb.collection("wordGameUserStats").doc(userId);
  const next = await adminDb.runTransaction(async (transaction) => {
    const gameSnap = await transaction.get(gameRef);
    const current = gameFrom(initial.id, gameSnap.data() || {});
    if (current.userId !== userId || current.dateKey !== getMakkahDateKey() || current.status !== "playing") throw new Error("GAME_FINISHED");
    const now = Date.now();
    const { game: updated, completedNow } = calculateWordGameGuess({ game: current, rawGuess, now });
    if (completedNow) {
      const [resultSnap, statsSnap, userSnap] = await Promise.all([transaction.get(resultRef), transaction.get(statsRef), transaction.get(adminDb.collection("users").doc(userId))]);
      if (!resultSnap.exists) {
        const existingStats = statsSnap.data() || {}; const played = number(existingStats.gamesPlayed) + 1; const gamesWon = number(existingStats.gamesWon) + (updated.won ? 1 : 0); const streak = updated.won ? number(existingStats.currentWinStreak) + 1 : 0;
        transaction.create(resultRef, { id: updated.id, userId, userName: text(userSnap.data()?.fullName) || "عضو", dateKey: updated.dateKey, won: updated.won, attemptsUsed: updated.attemptsUsed, durationMs: updated.durationMs, finishedAt: now, categoryLabel: getWordGameCategoryLabel(getWordGameWordCategory(updated.targetWord)) });
        transaction.set(statsRef, { userId, gamesPlayed: played, gamesWon, winRate: Math.round((gamesWon / played) * 100), currentWinStreak: streak, bestWinStreak: Math.max(number(existingStats.bestWinStreak), streak), lastPlayedDateKey: updated.dateKey }, { merge: true });
      }
    }
    transaction.set(gameRef, { ...updated, updatedAt: new Date().toISOString() }, { merge: true });
    return updated;
  });
  if (next.status !== "playing") await syncPlatformGameXp({ gameId: "word-game", sourceResultId: next.id, expectedUserId: userId });
  return state(userId, next);
}

async function requireAdmin(userId: string) { if (!isAdmin((await adminDb.collection("admins").doc(userId).get()).data())) throw new Error("FORBIDDEN"); }

export async function GET(request: NextRequest) {
  try { const user = await verifiedUser(request); return NextResponse.json(await state(user.uid), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { const code = error instanceof Error ? error.message : ""; return NextResponse.json({ error: errorMessage(code) }, { status: code === "UNAUTHORIZED" ? 401 : 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifiedUser(request); const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new Error("INVALID_GUESS");
    if (body.action === "admin_list") { await requireAdmin(user.uid); const key = getMakkahDateKey(); const games = await adminDb.collection("wordGameDailyGames").where("dateKey", "==", key).get(); return NextResponse.json({ games: games.docs.map((item) => { const g = gameFrom(item.id, item.data()); return { userId: g.userId, targetWord: g.targetWord, status: g.status, attemptsUsed: g.attemptsUsed, durationMs: g.durationMs, won: g.won }; }) }); }
    if (body.action === "admin_delete_user_today" || body.action === "admin_delete_today") { await requireAdmin(user.uid); return NextResponse.json({ error: "هذه العملية الإدارية غير متاحة من المتصفح بعد الآن." }, { status: 501 }); }
    return NextResponse.json(await guess(user.uid, body.guess), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { const code = error instanceof Error ? error.message : ""; return NextResponse.json({ error: errorMessage(code) }, { status: code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 400 }); }
}
