import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { syncPlatformGameXp } from "@/lib/serverPlatformGameXp";
import type { PlatformGameId } from "@/domain/games/platformGames";

export const runtime = "nodejs";

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) throw new Error("UNAUTHORIZED");
  return token;
}

function isPlatformGameId(value: unknown): value is PlatformGameId {
  return value === "word-game" || value === "flag-memory" || value === "ten-seconds" || value === "vocabulary";
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request);
    const decoded = await adminAuth.verifyIdToken(token);
    const body = (await request.json()) as { gameId?: unknown; sourceResultId?: unknown };
    const sourceResultId = String(body.sourceResultId || "").trim();

    if (!isPlatformGameId(body.gameId) || !sourceResultId) {
      return NextResponse.json({ error: "بيانات مزامنة اللعبة غير مكتملة" }, { status: 400 });
    }

    const result = await syncPlatformGameXp({
      gameId: body.gameId,
      sourceResultId,
      expectedUserId: decoded.uid,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Game XP sync error:", error);
    const message = error instanceof Error ? error.message : "";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json(
      { error: status === 403 ? "لا يمكنك مزامنة نتيجة عضو آخر" : "تعذر مزامنة XP اللعبة" },
      { status },
    );
  }
}
