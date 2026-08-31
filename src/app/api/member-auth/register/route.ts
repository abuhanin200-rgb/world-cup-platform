import { NextResponse } from "next/server";
import { registerMember } from "@/lib/serverMemberAuthRest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function clean(value: unknown) {
  return String(value || "").trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const fullName = clean(body.fullName);
    const phone = clean(body.phone);
    const email = clean(body.email).toLowerCase();
    const password = clean(body.password);
    const favoriteTeam = clean(body.favoriteTeam);
    const teamEmoji = clean(body.teamEmoji);

    if (!fullName) return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
    if (fullName.length > 20) {
      return NextResponse.json({ error: "الاسم يجب ألا يتجاوز 20 حرفًا" }, { status: 400 });
    }
    if (!phone) return NextResponse.json({ error: "رقم الجوال مطلوب" }, { status: 400 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "أدخل بريدًا إلكترونيًا صحيحًا" }, { status: 400 });
    }
    if (!password || password.length < 4) {
      return NextResponse.json(
        { error: "كلمة المرور يجب ألا تقل عن 4 أرقام أو أحرف" },
        { status: 400 },
      );
    }
    if (!favoriteTeam) {
      return NextResponse.json({ error: "اختر المنتخب المرشح" }, { status: 400 });
    }

    const result = await registerMember({
      fullName,
      phone,
      email,
      password,
      favoriteTeam,
      teamEmoji,
    });

    return NextResponse.json(result, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "");
    console.error("Member REST register error:", error);

    if (message === "NAME_EXISTS") {
      return NextResponse.json({ error: "هذا الاسم مستخدم مسبقًا" }, { status: 409 });
    }
    if (message === "PHONE_EXISTS") {
      return NextResponse.json({ error: "رقم الجوال مستخدم مسبقًا" }, { status: 409 });
    }

    const infrastructure = /FIREBASE_|GOOGLE_OAUTH_|FIRESTORE_/i.test(message);
    return NextResponse.json(
      {
        error: infrastructure
          ? "تعذر تشغيل خدمة إنشاء الحساب على السيرفر. حاول بعد قليل."
          : "تعذر إنشاء الحساب الآن، حاول مرة أخرى.",
        code: infrastructure ? "MEMBER_AUTH_INFRASTRUCTURE" : "MEMBER_REGISTER_ERROR",
      },
      { status: infrastructure ? 503 : 500 },
    );
  }
}
