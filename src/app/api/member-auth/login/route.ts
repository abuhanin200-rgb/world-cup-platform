import { NextResponse } from "next/server";
import {
  createMemberCustomToken,
  findMemberByFullName,
  mapSafeMemberUser,
  verifyAndMigrateMemberPassword,
} from "@/lib/serverMemberAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function serverErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");

  if (/FIREBASE_ADMIN_|private key|credential|PEM/i.test(message)) {
    return {
      status: 503,
      code: "MEMBER_AUTH_SERVER_CONFIG",
      error: "خدمة دخول الأعضاء غير مكتملة الإعداد في السيرفر. راجع إعدادات Firebase Admin في Vercel.",
    };
  }

  return {
    status: 500,
    code: "MEMBER_AUTH_SERVER_ERROR",
    error: "تعذر تسجيل الدخول الآن، حاول مرة أخرى",
  };
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "member-auth-login", method: "POST" });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      fullName?: string;
      password?: string;
    };
    const fullName = String(body.fullName || "").trim();
    const password = String(body.password || "").trim();

    if (!fullName || !password) {
      return NextResponse.json(
        { error: "أدخل الاسم وكلمة المرور" },
        { status: 400 },
      );
    }

    const memberDoc = await findMemberByFullName(fullName);

    if (!memberDoc) {
      return NextResponse.json(
        { error: "بيانات الدخول غير صحيحة" },
        { status: 401 },
      );
    }

    const userData = memberDoc.data() as Record<string, unknown>;
    const valid = await verifyAndMigrateMemberPassword(
      memberDoc.id,
      userData,
      password,
    );

    if (!valid) {
      return NextResponse.json(
        { error: "بيانات الدخول غير صحيحة" },
        { status: 401 },
      );
    }

    const refreshed = await memberDoc.ref.get();
    const customToken = await createMemberCustomToken(memberDoc.id);

    return NextResponse.json({
      customToken,
      user: mapSafeMemberUser(
        refreshed.id,
        refreshed.data() as Record<string, unknown>,
      ),
    });
  } catch (error) {
    console.error("Member secure login error:", error);
    const details = serverErrorMessage(error);
    return NextResponse.json(
      { error: details.error, code: details.code },
      { status: details.status },
    );
  }
}
