import { NextRequest, NextResponse } from "next/server";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdminRequest } from "@/lib/serverAdminAuth";
import { hashMemberPassword } from "@/lib/serverPassword";

export const runtime = "nodejs";

const BATCH_SIZE = 25;

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminRequest(request);
    const body = (await request.json().catch(() => ({}))) as { cursor?: string };
    const cursor = String(body.cursor || "").trim();

    let query = adminDb
      .collection("users")
      .orderBy(FieldPath.documentId())
      .limit(BATCH_SIZE);

    if (cursor) {
      query = query.startAfter(cursor);
    }

    const snapshot = await query.get();
    let migrated = 0;
    let alreadySecure = 0;
    let unresolved = 0;

    for (const memberDoc of snapshot.docs) {
      const userData = memberDoc.data() as Record<string, unknown>;
      const legacyPassword = String(userData.password || "").trim();
      const credentialRef = adminDb
        .collection("memberCredentials")
        .doc(memberDoc.id);
      const credentialSnap = await credentialRef.get();
      const now = new Date().toISOString();

      if (credentialSnap.exists) {
        const update: Record<string, unknown> = {
          authUid: memberDoc.id,
          memberAuthVersion: 2,
          memberAuthMigratedAt:
            userData.memberAuthMigratedAt || credentialSnap.data()?.updatedAt || now,
          updatedAt: now,
        };

        if (legacyPassword) update.password = FieldValue.delete();
        await memberDoc.ref.set(update, { merge: true });
        alreadySecure += 1;
        continue;
      }

      if (!legacyPassword) {
        unresolved += 1;
        continue;
      }

      const credential = await hashMemberPassword(legacyPassword);
      const batch = adminDb.batch();
      batch.set(credentialRef, credential);
      batch.set(
        memberDoc.ref,
        {
          password: FieldValue.delete(),
          authUid: memberDoc.id,
          memberAuthVersion: 2,
          memberAuthMigratedAt: now,
          updatedAt: now,
        },
        { merge: true },
      );
      await batch.commit();
      migrated += 1;
    }

    const nextCursor =
      snapshot.docs.length === BATCH_SIZE
        ? snapshot.docs[snapshot.docs.length - 1].id
        : null;

    await adminDb.collection("admin_logs").add({
      action: "other",
      title: "ترحيل أمان حسابات الأعضاء",
      description: `تمت معالجة ${snapshot.docs.length} حسابًا: ${migrated} ترحيل جديد، ${alreadySecure} مؤمّن مسبقًا، ${unresolved} يحتاج تعيين كلمة مرور.`,
      metadata: {
        migrated,
        alreadySecure,
        unresolved,
        processed: snapshot.docs.length,
        nextCursor,
      },
      adminUid: admin.uid,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      processed: snapshot.docs.length,
      migrated,
      alreadySecure,
      unresolved,
      nextCursor,
      done: nextCursor == null,
    });
  } catch (error) {
    console.error("Member credentials migration error:", error);
    const message = error instanceof Error ? error.message : "";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;

    return NextResponse.json(
      { error: status === 403 ? "لا تملك صلاحية الأدمن" : "تعذر ترحيل حسابات الأعضاء" },
      { status },
    );
  }
}
