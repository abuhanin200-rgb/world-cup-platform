import { NextRequest, NextResponse } from "next/server";
import { getTournamentActivityServer } from "@/lib/serverTournamentActivity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const tournamentId = request.nextUrl.searchParams.get("tournamentId")?.trim();
    if (!tournamentId) {
      return NextResponse.json(
        { ok: false, error: "معرّف البطولة مطلوب" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const result = await getTournamentActivityServer(tournamentId, 100);
    const publicEvent = (item: (typeof result.predictions)[number]) => ({
      id: item.id,
      type: item.type,
      tournamentId: item.tournamentId,
      matchId: item.matchId,
      userName: item.userName,
      homeTeamId: item.homeTeamId,
      awayTeamId: item.awayTeamId,
      homeTeamName: item.homeTeamName,
      awayTeamName: item.awayTeamName,
      homeTeamFlagCode: item.homeTeamFlagCode,
      awayTeamFlagCode: item.awayTeamFlagCode,
      resultHomeScore: item.resultHomeScore,
      resultAwayScore: item.resultAwayScore,
      createdAt: item.createdAt,
    });
    return NextResponse.json(
      {
        ok: true,
        predictions: result.predictions.map(publicEvent),
        exactHits: result.exactHits.map(publicEvent),
        generatedAt: Date.now(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Tournament activity API error:", error);
    return NextResponse.json(
      { ok: false, error: "تعذر تحميل نشاط البطولة الآن" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
