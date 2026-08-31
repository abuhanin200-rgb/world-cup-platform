import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { hashMemberPassword } from "@/lib/serverPassword";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");
  return scheme === "Bearer" ? token : "";
}

export async function POST(request: Request) {
  try {
    const token = bearerToken(request);

    if (!token) {
      return NextResponse.json(
        { error: "أعد تسجيل الدخول لتغيير كلمة المرور" },
        { status: 401 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const body = (await request.json()) as { newPassword?: string };
    const newPassword = String(body.newPassword || "").trim();

    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json(
        { error: "كلمة المرور الجديدة يجب ألا تقل عن 4 أرقام أو أحرف" },
        { status: 400 },
      );
    }

    const userRef = adminDb.collection("users").doc(decoded.uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
    }

    const credentialRef = adminDb
      .collection("memberCredentials")
      .doc(decoded.uid);
    const oldCredential = await credentialRef.get();
    const oldCreatedAt = oldCredential.data()?.createdAt;
    const credential = await hashMemberPassword(
      newPassword,
      typeof oldCreatedAt === "string" ? oldCreatedAt : undefined,
    );
    const now = new Date().toISOString();
    const batch = adminDb.batch();

    batch.set(credentialRef, credential, { merge: true });
    batch.set(
      userRef,
      {
        password: FieldValue.delete(),
        authUid: decoded.uid,
        memberAuthVersion: 2,
        memberAuthMigratedAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
    await batch.commit();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Member password update error:", error);
    return NextResponse.json(
      { error: "تعذر تغيير كلمة المرور" },
      { status: 401 },
    );
  }
}
