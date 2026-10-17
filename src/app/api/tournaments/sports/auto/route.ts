import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/serverAdminAuth";
import { runTournamentSportsAutomation } from "@/lib/serverTournamentSportsSync";
import { reconcileGulfCup27Finalization } from "@/lib/serverGulfCup27Finalization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const force = request.nextUrl.searchParams.get("force") === "1";
    if (force) await requireAdminRequest(request);
    // Independent of Sports API configuration: covers results scored before deployment.
    const finalization = await reconcileGulfCup27Finalization().catch((error) => {
      console.error("Gulf 27 finalization check failed:", error);
      return { changed: false, reason: "check_failed" };
    });
    const result = await runTournamentSportsAutomation({ force });
    return NextResponse.json({ ok: true, ...result, finalization });
  } catch (error) {
    console.error("Tournament sports automation error:", error);
    const message = error instanceof Error ? error.message : "";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({
      ok: false,
      error: message === "API_FOOTBALL_KEY_MISSING" ? "Sports API غير مهيأ" : "تعذر تشغيل مزامنة Sports API",
    }, { status });
  }
}
