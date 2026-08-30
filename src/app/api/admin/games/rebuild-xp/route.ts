import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/serverAdminAuth";
import { rebuildAllPlatformGameXp } from "@/lib/serverPlatformGameXp";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await requireAdminRequest(request);
    const result = await rebuildAllPlatformGameXp();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Rebuild platform game XP error:", error);
    const message = error instanceof Error ? error.message : "";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json(
      { error: status === 403 ? "لا تملك صلاحية الأدمن" : "تعذر إعادة بناء ترتيب الألعاب" },
      { status },
    );
  }
}
