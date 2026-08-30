import { NextResponse } from "next/server";
import {
  createMemberCustomToken,
  findMemberByFullName,
  mapSafeMemberUser,
  verifyAndMigrateMemberPassword,
} from "@/lib/serverMemberAuth";

export const runtime = "nodejs";

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
    return NextResponse.json(
      { error: "تعذر تسجيل الدخول الآن، حاول مرة أخرى" },
      { status: 500 },
    );
  }
}
