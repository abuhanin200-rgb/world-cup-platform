import { NextResponse } from "next/server";
import { loginMember } from "@/lib/serverMemberAuthRest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function classifyServerError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");

  if (/FIREBASE_|GOOGLE_OAUTH_|FIRESTORE_/i.test(message)) {
    return {
      status: 503,
      code: "MEMBER_AUTH_INFRASTRUCTURE",
      error: "تعذر تشغيل خدمة دخول الأعضاء على السيرفر. راجع صفحة حالة الدخول ثم حاول مرة أخرى.",
    };
  }

  return {
    status: 500,
    code: "MEMBER_AUTH_SERVER_ERROR",
    error: "تعذر تسجيل الدخول الآن، حاول مرة أخرى.",
  };
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "member-auth-login", method: "POST" });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { fullName?: string; password?: string };
    const fullName = String(body.fullName || "").trim();
    const password = String(body.password || "").trim();

    if (!fullName || !password) {
      return NextResponse.json({ error: "أدخل الاسم وكلمة المرور" }, { status: 400 });
    }

    const result = await loginMember(fullName, password);
    if (!result) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Member REST login error:", error);
    const details = classifyServerError(error);
    return NextResponse.json(
      { error: details.error, code: details.code },
      { status: details.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
