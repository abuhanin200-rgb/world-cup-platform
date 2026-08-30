import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/serverAdminAuth";
import { runTournamentNotificationAutomationV2 } from "@/lib/serverTournamentNotificationAutomation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const force = request.nextUrl.searchParams.get("force") === "1";

    if (force) {
      await requireAdminRequest(request);
    }

    const result = await runTournamentNotificationAutomationV2({ force });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Tournament notification automation error:", error);
    const message = error instanceof Error ? error.message : "";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json(
      {
        ok: false,
        error:
          status === 403
            ? "لا تملك صلاحية الأدمن"
            : "تعذر تشغيل أتمتة إشعارات البطولة",
      },
      { status },
    );
  }
}
