import { NextRequest, NextResponse } from "next/server";
import { getTournamentMatchLineup } from "@/lib/serverTournamentMatchLineup";

export const dynamic = "force-dynamic";

function clean(value: string | null) {
  return (value || "").trim();
}

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "MATCH_NOT_FOUND") return "المباراة غير موجودة.";
  if (message === "TEAMS_PENDING") return "لم يتم تحديد طرفي المباراة بعد.";
  if (message === "FIXTURE_NOT_LINKED") return "المباراة غير مرتبطة بمزود البيانات بعد.";
  if (message === "FIXTURE_NOT_FOUND_AT_PROVIDER") return "تعذر العثور على المباراة لدى مزود البيانات.";
  if (message === "API_FOOTBALL_KEY_MISSING") return "مفتاح مزود البيانات غير مفعّل على الخادم.";
  return "تعذر تحميل التشكيل حاليًا.";
}

export async function GET(request: NextRequest) {
  const tournamentId = clean(request.nextUrl.searchParams.get("tournamentId"));
  const matchId = clean(request.nextUrl.searchParams.get("matchId"));

  if (!tournamentId || !matchId) {
    return NextResponse.json(
      { ok: false, error: "بيانات المباراة غير مكتملة." },
      { status: 400 },
    );
  }

  try {
    const data = await getTournamentMatchLineup({ tournamentId, matchId });
    return NextResponse.json(
      { ok: true, data },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Tournament match lineup error:", error);
    return NextResponse.json(
      { ok: false, error: friendlyError(error) },
      { status: 500 },
    );
  }
}
