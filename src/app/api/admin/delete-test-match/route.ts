import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

function toText(value: unknown) {
  return String(value || "").trim();
}

async function getPredictionsForMatch(matchId: string) {
  const snapshot = await adminDb
    .collection("predictions")
    .where("matchId", "==", matchId)
    .get();

  return snapshot.docs.filter((docSnap) => docSnap.id !== "_init");
}

async function deletePredictionDocs(
  docs: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[]
) {
  let deletedCount = 0;
  let batch = adminDb.batch();
  let operationCount = 0;

  for (const docSnap of docs) {
    batch.delete(docSnap.ref);
    deletedCount += 1;
    operationCount += 1;

    if (operationCount >= 400) {
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

    const predictions = await getPredictionsForMatch(matchId);

    const hasCalculatedPredictions = predictions.some((docSnap) => {
      const data = docSnap.data();

      return Boolean(data.isCalculated) || Number(data.points || 0) > 0;
    });

    if (hasCalculatedPredictions) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "هذه المباراة عليها توقعات محتسبة. استخدم تراجع عن الحسبة أولًا، ثم احذفها.",
        },
        { status: 400 }
      );
    }

    const deletedPredictionsCount = await deletePredictionDocs(predictions);

    await matchRef.delete();

    try {
      await adminDb.collection("admin_logs").add({
        action: "other",
        title: "حذف مباراة اختبار",
        description:
          "تم حذف مباراة اختبار غير محتسبة مع توقعاتها دون إعادة بناء الإحصائيات.",
        metadata: {
          matchId,
          homeTeamName: matchData.homeTeamName || "",
          awayTeamName: matchData.awayTeamName || "",
          deletedPredictionsCount,
        },
        createdAt: new Date().toISOString(),
      });
    } catch (logError) {
      console.error("Admin log after delete test match failed:", logError);
    }

    return NextResponse.json({
      ok: true,
      message: "تم حذف مباراة الاختبار بنجاح",
      deletedPredictionsCount,
      rebuiltUsersCount: 0,
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