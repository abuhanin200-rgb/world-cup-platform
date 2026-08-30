import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdminRequest } from "@/lib/serverAdminAuth";
import { hashMemberPassword } from "@/lib/serverPassword";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminRequest(request);
    const body = (await request.json()) as {
      userId?: string;
      newPassword?: string;
    };
    const userId = String(body.userId || "").trim();
    const newPassword = String(body.newPassword || "").trim();

    if (!userId) {
      return NextResponse.json({ error: "معرّف العضو غير موجود" }, { status: 400 });
    }
    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json(
        { error: "كلمة المرور الجديدة يجب ألا تقل عن 4 أرقام أو أحرف" },
        { status: 400 },
      );
    }

    const userRef = adminDb.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
    }

    const credentialRef = adminDb.collection("memberCredentials").doc(userId);
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
        authUid: userId,
        memberAuthVersion: 2,
        memberAuthMigratedAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
    batch.set(adminDb.collection("admin_logs").doc(), {
      action: "update_member",
      title: "تغيير كلمة مرور عضو",
      description: `تم تعيين كلمة مرور آمنة جديدة للعضو ${String(userSnap.data()?.fullName || userId)}.`,
      adminUid: admin.uid,
      createdAt: now,
    });

    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin member password update error:", error);
    const message = error instanceof Error ? error.message : "";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json(
      { error: status === 403 ? "لا تملك صلاحية الأدمن" : "تعذر تغيير كلمة مرور العضو" },
      { status },
    );
  }
}
