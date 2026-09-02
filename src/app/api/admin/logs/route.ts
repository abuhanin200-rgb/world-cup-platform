import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import type { AdminLogAction } from "@/lib/adminLogs";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdminRequest } from "@/lib/serverAdminAuth";

const ACTIONS = new Set<AdminLogAction>([
  "add_match",
  "calculate_match",
  "undo_match_calculation",
  "update_member",
  "reset_member_stats",
  "update_settings",
  "other",
]);

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminRequest(request);
    const body = (await request.json().catch(() => null)) as {
      action?: AdminLogAction;
      title?: string;
      description?: string;
      metadata?: Record<string, unknown>;
    } | null;
    const action = body?.action && ACTIONS.has(body.action) ? body.action : "other";
    const title = String(body?.title || "").trim().slice(0, 180);
    const description = String(body?.description || "").trim().slice(0, 2_000);
    if (!title || !description) {
      return NextResponse.json(
        { error: "بيانات سجل الإدارة غير مكتملة" },
        { status: 400 },
      );
    }

    const ref = await adminDb.collection("admin_logs").add({
      action,
      title,
      description,
      metadata: body?.metadata || {},
      actorUid: admin.uid,
      createdAt: new Date().toISOString(),
      createdAtServer: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ id: ref.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error("Admin log write failed:", error);
    return NextResponse.json(
      { error: status === 500 ? "تعذر حفظ سجل الإدارة" : "غير مصرح" },
      { status },
    );
  }
}
