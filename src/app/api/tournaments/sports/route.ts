import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/serverAdminAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  approveTournamentProviderResult,
  checkTournamentSportsSeasonAvailability,
  discoverTournamentSportsFixtures,
  getTournamentSportsIntegration,
  saveTournamentSportsIntegration,
  searchTournamentSportsLeagues,
  setTournamentSportsFixtureLink,
  syncTournamentSportsProvider,
  testTournamentSportsProvider,
} from "@/lib/serverTournamentSportsSync";
import { GULF_CUP_27_TOURNAMENT_ID } from "@/domain/tournaments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "تعذر تنفيذ العملية";
  const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
  const friendly =
    message === "API_FOOTBALL_KEY_MISSING"
      ? "أضف API_FOOTBALL_KEY في Environment Variables أولًا"
      : message.startsWith("API_FOOTBALL_HTTP_")
        ? "تعذر الاتصال بمزود API-FOOTBALL"
        : message.startsWith("API_FOOTBALL_ERROR:")
          ? message.replace("API_FOOTBALL_ERROR:", "مزود البيانات: ")
          : message;
  return NextResponse.json({ ok: false, error: friendly }, { status });
}

async function logAdmin(action: string, description: string, metadata?: Record<string, unknown>) {
  await adminDb.collection("admin_logs").add({
    action: "other",
    title: action,
    description,
    metadata: metadata || {},
    createdAt: new Date().toISOString(),
    source: "sports-api-v2",
  });
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminRequest(request);
    const status = await getTournamentSportsIntegration(GULF_CUP_27_TOURNAMENT_ID);
    return NextResponse.json({ ok: true, ...status });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminRequest(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action || "");
    const tournamentId = GULF_CUP_27_TOURNAMENT_ID;

    if (action === "test") {
      const result = await testTournamentSportsProvider();
      return NextResponse.json(result);
    }

    if (action === "search_leagues") {
      const result = await searchTournamentSportsLeagues(String(body.search || ""));
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "check_season") {
      const result = await checkTournamentSportsSeasonAvailability(tournamentId, { force: true });
      await logAdmin(
        "فحص توفر موسم Sports API",
        result.available
          ? `موسم ${result.season} متاح الآن لدى ${result.leagueName || result.leagueId}.`
          : `موسم ${result.season} لم يظهر بعد لدى ${result.leagueName || result.leagueId}.`,
        result as unknown as Record<string, unknown>,
      );
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "save_config") {
      const config = await saveTournamentSportsIntegration(tournamentId, {
        enabled: body.enabled === true,
        leagueId: body.leagueId == null || body.leagueId === "" ? null : Number(body.leagueId),
        season: Number(body.season || 2026),
        syncSchedule: body.syncSchedule !== false,
        syncStatus: body.syncStatus !== false,
        syncResults: body.syncResults !== false,
        syncMode: body.syncMode === "review_only" ? "review_only" : "protected_auto",
        autoDiscover: body.autoDiscover !== false,
      });
      await logAdmin("تحديث ربط Sports API", `تم تحديث إعدادات مزود البيانات لخليجي 27.`, { tournamentId, leagueId: config.leagueId, season: config.season, syncMode: config.syncMode });
      return NextResponse.json({ ok: true, config });
    }

    if (action === "discover") {
      const result = await discoverTournamentSportsFixtures(tournamentId);
      await logAdmin("ربط مباريات خليجي 27 بالمزود", `تم ربط ${result.linked} مباراة تلقائيًا.`, result as unknown as Record<string, unknown>);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "map_fixture") {
      const matchId = String(body.matchId || "").trim();
      if (!matchId) throw new Error("اختر المباراة");
      await setTournamentSportsFixtureLink({
        tournamentId,
        matchId,
        providerFixtureId: body.providerFixtureId == null || body.providerFixtureId === "" ? null : Number(body.providerFixtureId),
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "sync") {
      const result = await syncTournamentSportsProvider(tournamentId, "admin");
      await logAdmin("مزامنة Sports API", `تم فحص ${result.checked} مباراة، تحديث ${result.updated}، احتساب ${result.calculated}، تعارضات ${result.conflicts}.`, result as unknown as Record<string, unknown>);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "approve_result") {
      const matchId = String(body.matchId || "").trim();
      if (!matchId) throw new Error("اختر المباراة");
      const result = await approveTournamentProviderResult({ tournamentId, matchId });
      await logAdmin("اعتماد نتيجة Sports API", `تم اعتماد نتيجة المزود واحتساب مباراة ${matchId}.`, { tournamentId, matchId, ...result });
      return NextResponse.json({ ok: true, ...result });
    }

    throw new Error("عملية غير معروفة");
  } catch (error) {
    return errorResponse(error);
  }
}
