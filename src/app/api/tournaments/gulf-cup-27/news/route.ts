import { NextResponse } from "next/server";
import { fetchGulfCup27News } from "@/lib/gulfCup27News";

export const runtime = "nodejs";
export const revalidate = 600;

export async function GET() {
  try {
    const items = await fetchGulfCup27News();
    return NextResponse.json(
      { items, updatedAt: Date.now() },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("Gulf Cup 27 news feed error:", error);
    return NextResponse.json(
      { items: [], updatedAt: Date.now(), error: "news_unavailable" },
      { status: 503, headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }
}
