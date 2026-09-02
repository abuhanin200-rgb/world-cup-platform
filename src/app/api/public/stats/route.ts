import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function collectionCount(
  collectionName: string,
  tournamentId?: string,
) {
  const base = adminDb.collection(collectionName);
  const query = tournamentId
    ? base.where("tournamentId", "==", tournamentId)
    : base;
  const snapshot = await query.count().get();
  return snapshot.data().count;
}

export async function GET(request: NextRequest) {
  try {
    const tournamentId = request.nextUrl.searchParams.get("tournamentId")?.trim();
    const scope = request.nextUrl.searchParams.get("scope")?.trim();
    if (tournamentId) {
      if (!/^[a-z0-9-]{1,80}$/i.test(tournamentId)) {
        return NextResponse.json(
          { error: "معرّف البطولة غير صالح" },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      const [matches, predictions, participants] = await Promise.all([
        collectionCount("tournamentMatches", tournamentId),
        collectionCount("tournamentPredictions", tournamentId),
        collectionCount("tournamentUserStats", tournamentId),
      ]);
      return NextResponse.json(
        { matches, predictions, participants },
        { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" } },
      );
    }

    if (scope === "legacy") {
      const [participants, predictions, matches] = await Promise.all([
        collectionCount("users"),
        collectionCount("predictions"),
        collectionCount("matches"),
      ]);
      return NextResponse.json(
        { matches, predictions, participants },
        { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" } },
      );
    }

    const [members, legacyPredictions, tournamentPredictions, legacyMatches, tournamentMatches, gamePlayers] =
      await Promise.all([
        collectionCount("users"),
        collectionCount("predictions"),
        collectionCount("tournamentPredictions"),
        collectionCount("matches"),
        collectionCount("tournamentMatches"),
        collectionCount("platformGameStats"),
      ]);

    return NextResponse.json(
      {
        members,
        predictions: legacyPredictions + tournamentPredictions,
        matches: legacyMatches + tournamentMatches,
        gamePlayers,
      },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" } },
    );
  } catch (error) {
    console.error("Public aggregate stats failed:", error);
    return NextResponse.json(
      { error: "تعذر تحميل إحصاءات المنصة" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
