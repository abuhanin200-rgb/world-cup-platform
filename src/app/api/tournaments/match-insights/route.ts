import { NextRequest, NextResponse } from "next/server";
import { getTournamentMatchInsights } from "@/lib/serverTournamentMatchInsights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_ID = /^[a-zA-Z0-9_-]{1,100}$/;

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  if (message === "MATCH_NOT_FOUND") {
    return { status: 404, message: "المباراة غير موجودة." };
  }
  if (message === "TEAMS_PENDING") {
    return { status: 409, message: "تتوفر المواجهات والإحصائيات بعد تحديد طرفي المباراة." };
  }
  if (message === "FIXTURE_NOT_LINKED") {
    return {
      status: 409,
      message: "الإحصائيات غير متاحة بعد. يجب ربط المباراة بـ Sports API من لوحة التحكم أولًا.",
    };
  }
  if (message === "PROVIDER_TEAMS_UNAVAILABLE") {
    return { status: 409, message: "تعذر تحديد المنتخبين لدى مزود البيانات لهذه المباراة." };
  }
  if (message === "API_FOOTBALL_KEY_MISSING") {
    return { status: 503, message: "مزود إحصائيات المباريات غير مفعّل حاليًا." };
  }
  if (message.startsWith("API_FOOTBALL_HTTP_") || message.startsWith("API_FOOTBALL_ERROR:")) {
    return { status: 503, message: "تعذر تحميل إحصائيات المباراة من المزود حاليًا. حاول لاحقًا." };
  }
  return { status: 500, message: "تعذر تحميل المواجهات والإحصائيات حاليًا." };
}

export async function GET(request: NextRequest) {
  try {
    const tournamentId = String(request.nextUrl.searchParams.get("tournamentId") || "").trim();
    const matchId = String(request.nextUrl.searchParams.get("matchId") || "").trim();
    if (!SAFE_ID.test(tournamentId) || !SAFE_ID.test(matchId)) {
      return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
    }

    const data = await getTournamentMatchInsights({ tournamentId, matchId });
    return NextResponse.json(
      { ok: true, data },
      {
        headers: {
          "Cache-Control": "private, max-age=0, must-revalidate",
        },
      },
    );
  } catch (error) {
    const result = friendlyError(error);
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status });
  }
}
