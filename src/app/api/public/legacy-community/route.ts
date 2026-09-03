import { NextRequest, NextResponse } from "next/server";
import type { QuerySnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { buildLegacyLeaderboard } from "@/lib/legacyLeaderboardLogic";
import { buildHomeHighlights } from "@/lib/highlights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function records(snapshot: QuerySnapshot) {
  return snapshot.docs.map((item) => ({ id: item.id, data: item.data() as Record<string, unknown> }));
}

function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function exact(data: Record<string, unknown>) { return Boolean(data.isCalculated) && (data.resultType === "exact" || number(data.points) === 3 || number(data.points) === 6); }
function winner(data: Record<string, unknown>) { return Boolean(data.isCalculated) && (data.resultType === "winner" || number(data.points) === 1 || number(data.points) === 2); }

function homeStats(predictions: ReturnType<typeof records>, matches: ReturnType<typeof records>) {
  const predictionRows = predictions.filter((item) => item.id !== "_init").map((item) => item.data);
  const matchRows = matches.filter((item) => item.id !== "_init").map((item) => item.data);
  const calculatedPredictions = predictionRows.filter((item) => Boolean(item.isCalculated)).length;
  const winnerCorrect = predictionRows.filter(winner).length;
  const exactCorrect = predictionRows.filter(exact).length;
  return {
    totalPredictions: predictionRows.length,
    winnerCorrect,
    exactCorrect,
    calculatedMatches: matchRows.filter((item) => Boolean(item.resultCalculated)).length,
    successRate: calculatedPredictions > 0 ? ((winnerCorrect + exactCorrect) / calculatedPredictions) * 100 : 0,
  };
}

function topCandidates(users: ReturnType<typeof records>, teams: ReturnType<typeof records>) {
  const emojis = new Map(teams.map((item) => [String(item.data.nameAr || "").trim(), String(item.data.emoji || "").trim()]));
  const counts = new Map<string, { teamName: string; teamEmoji: string; votes: number }>();
  users.forEach(({ data }) => {
    const teamName = String(data.favoriteTeam || "").trim();
    if (!teamName) return;
    const current = counts.get(teamName) || { teamName, teamEmoji: String(data.teamEmoji || "").trim() || emojis.get(teamName) || "🏳️", votes: 0 };
    current.votes += 1;
    counts.set(teamName, current);
  });
  return [...counts.values()].sort((a, b) => b.votes - a.votes).slice(0, 3).map((item, index) => ({ ...item, rank: index + 1 }));
}

function latestPredictions(predictions: ReturnType<typeof records>, matches: ReturnType<typeof records>, maxItems: number) {
  const matchesById = new Map(matches.map((item) => [item.id, item.data]));
  const now = Date.now();
  return predictions.filter((item) => item.id !== "_init").map(({ id, data }) => ({ id, data, match: matchesById.get(String(data.matchId || "")) }))
    .filter(({ data, match }) => {
      const startAt = new Date(String(match?.startAt || "")).getTime();
      return Boolean(match) && data.isCalculated === false && Number.isFinite(startAt) && startAt <= now;
    })
    .sort((a, b) => new Date(String(b.data.createdAt || "")).getTime() - new Date(String(a.data.createdAt || "")).getTime())
    .slice(0, maxItems)
    .map(({ id, data, match }) => ({
      id, userName: String(data.userName || "عضو"), matchId: String(data.matchId || ""),
      homeTeamName: String(data.homeTeamName || ""), homeTeamEmoji: String(data.homeTeamEmoji || ""), homeTeamCode: String(data.homeTeamCode || "") || null,
      awayTeamName: String(data.awayTeamName || ""), awayTeamEmoji: String(data.awayTeamEmoji || ""), awayTeamCode: String(data.awayTeamCode || "") || null,
      homeScore: number(data.homeScore), awayScore: number(data.awayScore), qualifiedTeamCode: String(data.qualifiedTeamCode || "") || null,
      qualificationMethod: data.qualificationMethod === "extraTime" || data.qualificationMethod === "penalties" ? data.qualificationMethod : null,
      predictionType: data.predictionType === "golden" ? "golden" : "normal", matchStage: match?.matchStage === "knockout" ? "knockout" : "group",
      knockoutRound: ["general", "semiFinal", "thirdPlace", "final"].includes(String(match?.knockoutRound || "")) ? match?.knockoutRound : undefined,
      createdAt: String(data.createdAt || "") || undefined,
    }));
}

export async function GET(request: NextRequest) {
  const view = request.nextUrl.searchParams.get("view");
  if (!view || !["leaderboard", "highlights", "home-stats", "top-candidates", "latest-predictions"].includes(view)) {
    return NextResponse.json({ error: "نوع البيانات غير صالح." }, { status: 400 });
  }
  try {
    if (view === "top-candidates") {
      const [users, teams] = await Promise.all([adminDb.collection("users").get(), adminDb.collection("teams").get()]);
      return NextResponse.json({ teams: topCandidates(records(users), records(teams)) }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" } });
    }

    const [users, predictions, matches] = await Promise.all([
      adminDb.collection("users").get(), adminDb.collection("predictions").get(), adminDb.collection("matches").get(),
    ]);
    const userRows = records(users); const predictionRows = records(predictions); const matchRows = records(matches);
    if (view === "latest-predictions") {
      const requested = Number(request.nextUrl.searchParams.get("limit"));
      const limit = Number.isInteger(requested) ? Math.min(2_000, Math.max(1, requested)) : 100;
      return NextResponse.json({ predictions: latestPredictions(predictionRows, matchRows, limit) }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
    }
    const response = view === "leaderboard"
      ? { users: buildLegacyLeaderboard(userRows, predictionRows) }
      : view === "highlights"
        ? buildHomeHighlights({ users: userRows, predictions: predictionRows, matches: matchRows })
        : homeStats(predictionRows, matchRows);
    return NextResponse.json(response, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" } });
  } catch (error) {
    console.error("Public legacy community data failed:", error);
    return NextResponse.json({ error: "تعذر تحميل بيانات المنصة الآن." }, { status: 500 });
  }
}
