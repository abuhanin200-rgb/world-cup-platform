import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

type UserStats = {
  points: number;
  total: number;
  correct: number;
  wrong: number;
  currentStreak: number;
  bestStreak: number;
};

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toText(value: unknown) {
  return String(value || "").trim();
}

function getTimeValue(value: unknown) {
  const text = toText(value);

  if (!text) return 0;

  const time = new Date(text).getTime();

  return Number.isFinite(time) ? time : 0;
}

async function deletePredictionsByMatchId(matchId: string) {
  const snapshot = await adminDb
    .collection("predictions")
    .where("matchId", "==", matchId)
    .get();

  let deletedCount = 0;
  let batch = adminDb.batch();
  let operationCount = 0;

  for (const docSnap of snapshot.docs) {
    if (docSnap.id === "_init") continue;

    batch.delete(docSnap.ref);
    deletedCount += 1;
    operationCount += 1;

    if (operationCount >= 450) {
      await batch.commit();
      batch = adminDb.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }

  return deletedCount;
}

async function rebuildAllUserStats() {
  const usersSnapshot = await adminDb.collection("users").get();
  const predictionsSnapshot = await adminDb.collection("predictions").get();

  const statsByUserId = new Map<string, UserStats>();

  for (const userDoc of usersSnapshot.docs) {
    if (userDoc.id === "_init") continue;

    statsByUserId.set(userDoc.id, {
      points: 0,
      total: 0,
      correct: 0,
      wrong: 0,
      currentStreak: 0,
      bestStreak: 0,
    });
  }

  const calculatedPredictions = predictionsSnapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();

      return {
        id: docSnap.id,
        userId: toText(data.userId),
        points: toNumber(data.points),
        resultType: toText(data.resultType),
        isCalculated: Boolean(data.isCalculated),
        calculatedAt: toText(data.calculatedAt),
        createdAt: toText(data.createdAt),
      };
    })
    .filter((prediction) => prediction.userId && prediction.isCalculated)
    .sort((a, b) => {
      return (
        getTimeValue(a.calculatedAt || a.createdAt) -
        getTimeValue(b.calculatedAt || b.createdAt)
      );
    });

  for (const prediction of calculatedPredictions) {
    const currentStats =
      statsByUserId.get(prediction.userId) || {
        points: 0,
        total: 0,
        correct: 0,
        wrong: 0,
        currentStreak: 0,
        bestStreak: 0,
      };

    currentStats.points += prediction.points;
    currentStats.total += 1;

    if (prediction.resultType === "exact" || prediction.resultType === "winner") {
      currentStats.correct += 1;
      currentStats.currentStreak += 1;
      currentStats.bestStreak = Math.max(
        currentStats.bestStreak,
        currentStats.currentStreak
      );
    } else {
      currentStats.wrong += 1;
      currentStats.currentStreak = 0;
    }

    statsByUserId.set(prediction.userId, currentStats);
  }

  const usersForRanking = usersSnapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();

      const stats =
        statsByUserId.get(docSnap.id) || {
          points: 0,
          total: 0,
          correct: 0,
          wrong: 0,
          currentStreak: 0,
          bestStreak: 0,
        };

      return {
        id: docSnap.id,
        ref: docSnap.ref,
        fullName: toText(data.fullName),
        previousRank: toNumber(data.currentRank || data.previousRank),
        ...stats,
      };
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.correct !== a.correct) return b.correct - a.correct;
      if (a.total !== b.total) return a.total - b.total;

      return a.fullName.localeCompare(b.fullName, "ar");
    });

  let batch = adminDb.batch();
  let operationCount = 0;

  for (let index = 0; index < usersForRanking.length; index += 1) {
    const user = usersForRanking[index];

    batch.set(
      user.ref,
      {
        points: user.points,
        total: user.total,
        correct: user.correct,
        wrong: user.wrong,
        currentStreak: user.currentStreak,
        bestStreak: user.bestStreak,
        previousRank: user.previousRank || index + 1,
        currentRank: index + 1,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    operationCount += 1;

    if (operationCount >= 450) {
      await batch.commit();
      batch = adminDb.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }

  return usersForRanking.length;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const matchId = toText(body.matchId);
    const confirmText = toText(body.confirmText);

    if (!matchId) {
      return NextResponse.json(
        {
          ok: false,
          message: "معرّف المباراة غير موجود",
        },
        { status: 400 }
      );
    }

    if (confirmText !== "حذف مباراة اختبار") {
      return NextResponse.json(
        {
          ok: false,
          message: "عبارة التأكيد غير صحيحة",
        },
        { status: 400 }
      );
    }

    const matchRef = adminDb.collection("matches").doc(matchId);
    const matchSnap = await matchRef.get();

    if (!matchSnap.exists) {
      return NextResponse.json(
        {
          ok: false,
          message: "المباراة غير موجودة أو تم حذفها مسبقًا",
        },
        { status: 404 }
      );
    }

    const matchData = matchSnap.data() || {};

    if (matchData.isActive === true) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "لا يمكن حذف مباراة ظاهرة للجمهور. أخفِ المباراة أولًا ثم احذفها.",
        },
        { status: 400 }
      );
    }

    const deletedPredictionsCount = await deletePredictionsByMatchId(matchId);

    await matchRef.delete();

    const rebuiltUsersCount = await rebuildAllUserStats();

    try {
      await adminDb.collection("admin_logs").add({
        action: "other",
        title: "حذف مباراة اختبار",
        description:
          "تم حذف مباراة اختبار وكل توقعاتها ثم إعادة بناء الإحصائيات.",
        metadata: {
          matchId,
          homeTeamName: matchData.homeTeamName || "",
          awayTeamName: matchData.awayTeamName || "",
          deletedPredictionsCount,
          rebuiltUsersCount,
        },
        createdAt: new Date().toISOString(),
      });
    } catch (logError) {
      console.error("Admin log after delete test match failed:", logError);
    }

    return NextResponse.json({
      ok: true,
      message: "تم حذف مباراة الاختبار وتنظيف الإحصائيات بنجاح",
      deletedPredictionsCount,
      rebuiltUsersCount,
    });
  } catch (error) {
    console.error("Delete test match error:", error);

    const message =
      error instanceof Error
        ? `حدث خطأ أثناء حذف مباراة الاختبار: ${error.message}`
        : "حدث خطأ أثناء حذف مباراة الاختبار";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 }
    );
  }
}