import { NextRequest, NextResponse } from "next/server";
import { runTournamentSportsAutomation } from "@/lib/serverTournamentSportsSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runTournamentSportsAutomation({ force: true });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Tournament sports cron error:", error);
    return NextResponse.json({ ok: false, error: "Sports sync failed" }, { status: 500 });
  }
}
