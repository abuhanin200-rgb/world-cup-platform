import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const STAT_KEYS = new Set(["views", "closes", "primaryClicks", "secondaryClicks"]);

function bearerToken(request: NextRequest) {
  const [scheme, token] = (request.headers.get("authorization") || "").split(" ");
  if (scheme !== "Bearer" || !token) throw new Error("UNAUTHORIZED");
  return token;
}

export async function POST(request: NextRequest) {
  try {
    await adminAuth.verifyIdToken(bearerToken(request));
    const body = (await request.json().catch(() => null)) as { noticeId?: unknown; statKey?: unknown } | null;
    const noticeId = String(body?.noticeId || "").trim();
    const statKey = String(body?.statKey || "").trim();
    if (!noticeId || !STAT_KEYS.has(statKey)) {
      return NextResponse.json({ error: "بيانات التفاعل غير صحيحة." }, { status: 400 });
    }
    const ref = adminDb.collection("memberNotices").doc(noticeId);
    const notice = await ref.get();
    if (!notice.exists || notice.data()?.isActive !== true || notice.data()?.isArchived === true) {
      return NextResponse.json({ error: "الإشعار غير متاح." }, { status: 404 });
    }
    await ref.update({ [`stats.${statKey}`]: FieldValue.increment(1), updatedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    if (!unauthorized) console.error("Notice engagement error:", error);
    return NextResponse.json({ error: "تعذر تسجيل تفاعل الإشعار." }, { status: unauthorized ? 401 : 500 });
  }
}
