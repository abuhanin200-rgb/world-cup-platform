import { NextResponse } from "next/server";
import { replaceMemberPassword } from "@/lib/serverMemberAuthRest";
import { verifyFirebaseIdTokenViaRest } from "@/lib/serverFirebaseRest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");
  return scheme === "Bearer" ? token : "";
}

export async function POST(request: Request) {
  try {
    const token = bearerToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "أعد تسجيل الدخول لتغيير كلمة المرور" },
        { status: 401 },
      );
    }

    const userId = await verifyFirebaseIdTokenViaRest(token);
    const body = (await request.json()) as { newPassword?: string };
    const newPassword = String(body.newPassword || "").trim();

    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json(
        { error: "كلمة المرور الجديدة يجب ألا تقل عن 4 أرقام أو أحرف" },
        { status: 400 },
      );
    }

    await replaceMemberPassword(userId, newPassword);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Member REST password update error:", error);
    return NextResponse.json(
      { error: "تعذر تغيير كلمة المرور" },
      { status: 401 },
    );
  }
}
