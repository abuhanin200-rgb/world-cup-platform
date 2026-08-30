import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  EMPTY_GAME_BREAKDOWN,
  getPlatformLevel,
  type GameXpAward,
  type PlatformGameBreakdown,
  type PlatformGameId,
  type PlatformGameStats,
} from "@/domain/games/platformGames";

function text(value: unknown) {
  return String(value || "").trim();
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function bool(value: unknown) {
  return value === true;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function eventId(gameId: PlatformGameId, sourceResultId: string) {
  return `${gameId}__${sourceResultId}`;
}

async function getWordGameAward(sourceResultId: string): Promise<GameXpAward | null> {
  const snap = await adminDb.collection("wordGameDailyResults").doc(sourceResultId).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  const won = bool(data.won);
  const attemptsUsed = clamp(number(data.attemptsUsed), 1, 6);
  const xp = won ? 10 + (7 - attemptsUsed) * 2 : 2;

  return {
    gameId: "word-game",
    sourceResultId,
    userId: text(data.userId),
    userName: text(data.userName) || "عضو",
    xp,
    won,
    dateKey: text(data.dateKey),
    reason: won ? `حل الكلمة في ${attemptsUsed} محاولات` : "إكمال تحدي الكلمة",
  };
}

async function getFlagMemoryAward(sourceResultId: string): Promise<GameXpAward | null> {
  const snap = await adminDb.collection("flagMemoryResults").doc(sourceResultId).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  if (!bool(data.completed)) return null;
  const score = Math.max(0, number(data.score));
  const xp = clamp(5 + Math.floor(score / 25), 5, 20);

  return {
    gameId: "flag-memory",
    sourceResultId,
    userId: text(data.userId),
    userName: text(data.userName) || "عضو",
    xp,
    won: true,
    dateKey: text(data.dateKey),
    reason: `إكمال تحدي الأعلام بنتيجة ${Math.floor(score)}`,
  };
}

async function getTenSecondsAward(sourceResultId: string): Promise<GameXpAward | null> {
  const snap = await adminDb.collection("tenSecondsChallengeDaily").doc(sourceResultId).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  const won = bool(data.won);
  const attemptsCount = Math.max(0, Math.floor(number(data.attemptsCount)));

  const settingsSnap = await adminDb.collection("settings").doc("tenSecondsChallenge").get();
  const settings = settingsSnap.data() || {};
  const dailyAttempts = clamp(number(settings.dailyAttempts) || 3, 1, 10);
  const configuredReward = clamp(number(settings.awardedPoints) || 5, 1, 50);
  const recordedLegacyReward = Math.max(0, Math.floor(number(data.awardedPoints)));

  if (!won && attemptsCount < dailyAttempts) {
    return null;
  }

  return {
    gameId: "ten-seconds",
    sourceResultId,
    userId: text(data.userId),
    userName: text(data.userName) || "عضو",
    xp: won ? (recordedLegacyReward > 0 ? recordedLegacyReward : configuredReward) : 2,
    won,
    dateKey: text(data.dateKey),
    reason: won ? "إصابة 10.000 ثانية" : "إكمال المحاولات اليومية",
  };
}

export async function getGameXpAward(
  gameId: PlatformGameId,
  sourceResultId: string,
): Promise<GameXpAward | null> {
  if (gameId === "word-game") return getWordGameAward(sourceResultId);
  if (gameId === "flag-memory") return getFlagMemoryAward(sourceResultId);
  return getTenSecondsAward(sourceResultId);
}

function mapBreakdown(value: unknown): PlatformGameBreakdown {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    played: Math.max(0, Math.floor(number(data.played))),
    wins: Math.max(0, Math.floor(number(data.wins))),
    xp: Math.max(0, Math.floor(number(data.xp))),
  };
}

function emptyGameStats(): PlatformGameStats["gameStats"] {
  return {
    "word-game": { ...EMPTY_GAME_BREAKDOWN },
    "flag-memory": { ...EMPTY_GAME_BREAKDOWN },
    "ten-seconds": { ...EMPTY_GAME_BREAKDOWN },
  };
}

export async function awardPlatformGameXp(award: GameXpAward) {
  if (!award.userId || award.xp <= 0) {
    return { awarded: false, xp: 0, totalXp: 0, level: 1 };
  }

  const xpEventRef = adminDb.collection("gameXpEvents").doc(eventId(award.gameId, award.sourceResultId));
  const statsRef = adminDb.collection("platformGameStats").doc(award.userId);

  return adminDb.runTransaction(async (transaction) => {
    const [eventSnap, statsSnap] = await Promise.all([
      transaction.get(xpEventRef),
      transaction.get(statsRef),
    ]);

    if (eventSnap.exists) {
      const current = statsSnap.data() || {};
      return {
        awarded: false,
        xp: 0,
        totalXp: number(current.totalXp),
        level: Math.max(1, Math.floor(number(current.level) || 1)),
      };
    }

    const current = statsSnap.data() || {};
    const currentGameStats = current.gameStats && typeof current.gameStats === "object"
      ? (current.gameStats as Record<string, unknown>)
      : {};
    const breakdowns = emptyGameStats();

    (Object.keys(breakdowns) as PlatformGameId[]).forEach((gameId) => {
      breakdowns[gameId] = mapBreakdown(currentGameStats[gameId]);
    });

    const currentBreakdown = breakdowns[award.gameId];
    breakdowns[award.gameId] = {
      played: currentBreakdown.played + 1,
      wins: currentBreakdown.wins + (award.won ? 1 : 0),
      xp: currentBreakdown.xp + award.xp,
    };

    const totalXp = Math.max(0, Math.floor(number(current.totalXp))) + award.xp;
    const gamesPlayed = Math.max(0, Math.floor(number(current.gamesPlayed))) + 1;
    const wins = Math.max(0, Math.floor(number(current.wins))) + (award.won ? 1 : 0);
    const level = getPlatformLevel(totalXp);
    const now = new Date().toISOString();

    transaction.set(xpEventRef, {
      ...award,
      eventId: xpEventRef.id,
      createdAt: now,
    });

    transaction.set(statsRef, {
      userId: award.userId,
      userName: award.userName,
      totalXp,
      level,
      gamesPlayed,
      wins,
      gameStats: breakdowns,
      updatedAt: now,
    }, { merge: true });

    return { awarded: true, xp: award.xp, totalXp, level };
  });
}

export async function syncPlatformGameXp(params: {
  gameId: PlatformGameId;
  sourceResultId: string;
  expectedUserId?: string;
}) {
  const award = await getGameXpAward(params.gameId, params.sourceResultId);

  if (!award) {
    return { awarded: false, xp: 0, totalXp: 0, level: 1 };
  }

  if (params.expectedUserId && award.userId !== params.expectedUserId) {
    throw new Error("FORBIDDEN");
  }

  return awardPlatformGameXp(award);
}

async function deleteCollectionDocuments(collectionName: string) {
  while (true) {
    const snapshot = await adminDb.collection(collectionName).limit(400).get();
    if (snapshot.empty) return;
    const batch = adminDb.batch();
    snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  }
}

export async function rebuildAllPlatformGameXp() {
  await deleteCollectionDocuments("gameXpEvents");
  await deleteCollectionDocuments("platformGameStats");

  const [wordResults, flagResults, tenResults] = await Promise.all([
    adminDb.collection("wordGameDailyResults").get(),
    adminDb.collection("flagMemoryResults").get(),
    adminDb.collection("tenSecondsChallengeDaily").get(),
  ]);

  const sources: Array<{ gameId: PlatformGameId; sourceResultId: string }> = [
    ...wordResults.docs.map((docSnap) => ({ gameId: "word-game" as const, sourceResultId: docSnap.id })),
    ...flagResults.docs.map((docSnap) => ({ gameId: "flag-memory" as const, sourceResultId: docSnap.id })),
    ...tenResults.docs.map((docSnap) => ({ gameId: "ten-seconds" as const, sourceResultId: docSnap.id })),
  ];

  let events = 0;
  for (const source of sources) {
    const result = await syncPlatformGameXp(source);
    if (result.awarded) events += 1;
  }

  const usersSnapshot = await adminDb.collection("platformGameStats").get();
  await adminDb.collection("admin_logs").add({
    action: "other",
    title: "إعادة بناء XP الألعاب",
    description: `تمت إعادة بناء ${events} حدث XP لـ ${usersSnapshot.size} عضوًا دون التأثير على نقاط البطولات.`,
    metadata: {
      events,
      users: usersSnapshot.size,
      sources: sources.length,
    },
    createdAt: new Date().toISOString(),
    serverTimestamp: FieldValue.serverTimestamp(),
  });

  return { events, users: usersSnapshot.size, sources: sources.length };
}
