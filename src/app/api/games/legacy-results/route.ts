import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { syncPlatformGameXp } from "@/lib/serverPlatformGameXp";

const TARGET_MS = 10_000;

function dateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function bearerToken(request: NextRequest) {
  const [scheme, token] = (request.headers.get("authorization") || "").split(" ");
  if (scheme !== "Bearer" || !token) throw new Error("UNAUTHORIZED");
  return token;
}

function whole(value: unknown, minimum: number, maximum: number) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return minimum;
  return Math.min(maximum, Math.max(minimum, number));
}

function scoreFlagMemory(timeSeconds: number, moves: number, mistakes: number, matchesCount: number) {
  const base = matchesCount * 20;
  const extraMoves = Math.max(0, moves - matchesCount * 2);
  const speed = timeSeconds <= 45 ? 50 : timeSeconds <= 60 ? 40 : timeSeconds <= 90 ? 30 : timeSeconds <= 120 ? 20 : timeSeconds <= 180 ? 10 : 0;
  return Math.max(0, base + speed - extraMoves * 2 - mistakes * 3 - Math.floor(timeSeconds / 30));
}

function tenDisplay(milliseconds: number) {
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1_000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds % 1_000).padStart(3, "0")}`;
}

async function userName(userId: string) {
  const user = await adminDb.collection("users").doc(userId).get();
  return String(user.data()?.fullName || "عضو").trim() || "عضو";
}

async function saveFlagMemory(userId: string, body: Record<string, unknown>) {
  const settings = await adminDb.collection("settings").doc("flagMemory").get();
  if (settings.data()?.enabled === false) throw new Error("GAME_DISABLED");
  const key = dateKey();
  const id = `${userId}_${key}`;
  const ref = adminDb.collection("flagMemoryResults").doc(id);
  if ((await ref.get()).exists) throw new Error("ALREADY_PLAYED");
  const timeSeconds = whole(body.timeSeconds, 1, 86_400);
  const moves = whole(body.moves, 0, 10_000);
  const mistakes = whole(body.mistakes, 0, 10_000);
  const matchesCount = whole(body.matchesCount, 1, 18);
  const result = {
    id, userId, userName: await userName(userId), dateKey: key, timeSeconds, moves, mistakes, matchesCount,
    score: scoreFlagMemory(timeSeconds, moves, mistakes, matchesCount), completed: true,
    createdAt: new Date().toISOString(),
  };
  await ref.create(result);
  await syncPlatformGameXp({ gameId: "flag-memory", sourceResultId: id, expectedUserId: userId });
  return result;
}

async function saveTenSeconds(userId: string, body: Record<string, unknown>) {
  const settings = (await adminDb.collection("settings").doc("tenSecondsChallenge").get()).data() || {};
  if (settings.enabled === false) throw new Error("GAME_DISABLED");
  const attemptsLimit = whole(settings.dailyAttempts, 1, 10) || 3;
  const tolerance = whole(settings.toleranceMs, 0, 200);
  const key = dateKey();
  const id = `${userId}_${key}`;
  const ref = adminDb.collection("tenSecondsChallengeDaily").doc(id);
  const elapsedMs = whole(body.elapsedMs, 0, 3_600_000);
  const diffMs = Math.abs(elapsedMs - TARGET_MS);
  const won = diffMs <= tolerance;
  const displayTime = won ? "00:10.000" : tenDisplay(elapsedMs);
  const now = new Date().toISOString();
  const result = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      const attempt = { attemptNumber: 1, elapsedMs, diffMs, displayTime, won, createdAt: now };
      const created = {
        id, userId, userName: await userName(userId), dateKey: key,
        attemptsCount: won ? 0 : 1, attempts: [attempt], bestElapsedMs: elapsedMs, bestDiffMs: diffMs,
        bestDisplayTime: displayTime, won, pointsAwarded: false, awardedPoints: 0, createdAt: now, updatedAt: now,
      };
      transaction.create(ref, created);
      return created;
    }
    const current = snapshot.data() || {};
    if (current.won === true) throw new Error("ALREADY_WON");
    const attempts = Array.isArray(current.attempts) ? current.attempts : [];
    const attemptsCount = Math.max(0, Number(current.attemptsCount || 0));
    if (attemptsCount >= attemptsLimit) throw new Error("ATTEMPTS_EXHAUSTED");
    const attempt = { attemptNumber: attempts.length + 1, elapsedMs, diffMs, displayTime, won, createdAt: now };
    const currentBest = Number.isFinite(Number(current.bestDiffMs)) ? Number(current.bestDiffMs) : Number.POSITIVE_INFINITY;
    const better = diffMs < currentBest;
    const update = {
      userName: await userName(userId), attemptsCount: won ? attemptsCount : attempts.length + 1, attempts: [...attempts, attempt],
      bestElapsedMs: better ? elapsedMs : current.bestElapsedMs, bestDiffMs: better ? diffMs : current.bestDiffMs,
      bestDisplayTime: better ? displayTime : current.bestDisplayTime, won, updatedAt: now,
    };
    transaction.update(ref, update);
    return { ...current, ...update, id };
  });
  await syncPlatformGameXp({ gameId: "ten-seconds", sourceResultId: id, expectedUserId: userId });
  return result;
}

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const decoded = await adminAuth.verifyIdToken(bearerToken(request));
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || (body.action !== "flag-memory" && body.action !== "ten-seconds")) {
      return NextResponse.json({ error: "بيانات اللعبة غير صحيحة." }, { status: 400 });
    }
    const result = body.action === "flag-memory"
      ? await saveFlagMemory(decoded.uid, body)
      : await saveTenSeconds(decoded.uid, body);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const unauthorized = message === "UNAUTHORIZED";
    const known = ["GAME_DISABLED", "ALREADY_PLAYED", "ALREADY_WON", "ATTEMPTS_EXHAUSTED"].includes(message);
    if (!unauthorized && !known) console.error("Legacy game result save error:", error);
    const errorMessage = message === "GAME_DISABLED" ? "التحدي متوقف مؤقتًا." : message === "ALREADY_PLAYED" ? "لديك نتيجة مسجلة اليوم." : message === "ALREADY_WON" ? "فزت اليوم بالفعل." : message === "ATTEMPTS_EXHAUSTED" ? "استهلكت محاولاتك اليومية." : unauthorized ? "سجّل الدخول مرة أخرى." : "تعذر حفظ النتيجة الآن.";
    return NextResponse.json({ error: errorMessage }, { status: unauthorized ? 401 : known ? 400 : 500 });
  }
}
