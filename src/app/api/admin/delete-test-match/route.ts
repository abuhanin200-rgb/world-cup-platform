import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
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

async function deleteCollectionByQuery(
  collectionName: string,
  fieldName: string,
  fieldValue: string
) {
  const snapshot = await adminDb
    .collection(collectionName)
    .where(fieldName, "==", fieldValue)
    .get();

  let deletedCount = 0;
  let batch = adminDb.batch();
  let operationCount = 0;

  for (const docSnap of snapshot.docs) {
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
      const aTime = new Date(a.calculatedAt || a.createdAt).getTime();
      const bTime = new Date(b.calculatedAt || b.createdAt).getTime();

      return (
        (Number.isFinite(aTime) ? aTime : 0) -
        (Number.isFinite(bTime) ? bTime : 0)
      );
    });

  for (const prediction of calculatedPredictions) {
    const currentStats =
      statsByUserId.get(prediction.userId) ||
      ({
        points: 0,
        total: 0,
        correct: 0,
        wrong: 0,
        currentStreak: 0,
        bestStreak: 0,
      } satisfies UserStats);

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
      const stats = statsByUserId.get(docSnap.id) || {
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

  usersForRanking.forEach((user, index) => {
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
  });

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
        { ok: false, message: "معرّف المباراة غير موجود" },
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
        { ok: false, message: "المباراة غير موجودة" },
        { status: 404 }
      );
    }

    const matchData = matchSnap.data() || {};

    const deletedPredictionsCount = await deleteCollectionByQuery(
      "predictions",
      "matchId",
      matchId
    );

    await matchRef.delete();

    const rebuiltUsersCount = await rebuildAllUserStats();

    await adminDb.collection("admin_logs").add({
      action: "other",
      title: "حذف مباراة اختبار",
      description: `تم حذف مباراة اختبار وكل توقعاتها ثم إعادة بناء الإحصائيات.`,
      metadata: {
        matchId,
        homeTeamName: matchData.homeTeamName || "",
        awayTeamName: matchData.awayTeamName || "",
        deletedPredictionsCount,
        rebuiltUsersCount,
      },
      createdAt: new Date().toISOString(),
      createdAtServer: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      message: "تم حذف مباراة الاختبار وتنظيف الإحصائيات بنجاح",
      deletedPredictionsCount,
      rebuiltUsersCount,
    });
  } catch (error) {
    console.error("Delete test match error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "حدث خطأ أثناء حذف مباراة الاختبار",
      },
      { status: 500 }
    );
  }
}