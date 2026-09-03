import { NextRequest, NextResponse } from "next/server";
import { generateChallengeStudioBulletinFromEvents } from "@/lib/challengeStudio/bulletinBuilder";
import { requireAdminRequest } from "@/lib/serverAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireAdminRequest(request);
    return NextResponse.json(await generateChallengeStudioBulletinFromEvents(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500;
    const message =
      status === 401
        ? "سجّل الدخول بحساب إداري أولًا."
        : status === 403
          ? "ليس لديك صلاحية استخدام محرّك الاستوديو."
          : "تعذر توليد نشرة الاستوديو الآن.";

    return NextResponse.json({ error: message }, { status });
  }
}
