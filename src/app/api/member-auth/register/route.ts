import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { hashMemberPassword } from "@/lib/serverPassword";
import {
  createMemberCustomToken,
  mapSafeMemberUser,
} from "@/lib/serverMemberAuth";

export const runtime = "nodejs";

function clean(value: unknown) {
  return String(value || "").trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const fullName = clean(body.fullName);
    const phone = clean(body.phone);
    const password = clean(body.password);
    const favoriteTeam = clean(body.favoriteTeam);
    const teamEmoji = clean(body.teamEmoji);

    if (!fullName) {
      return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
    }
    if (fullName.length > 20) {
      return NextResponse.json(
        { error: "الاسم يجب ألا يتجاوز 20 حرفًا" },
        { status: 400 },
      );
    }
    if (!phone) {
      return NextResponse.json({ error: "رقم الجوال مطلوب" }, { status: 400 });
    }
    if (!password || password.length < 4) {
      return NextResponse.json(
        { error: "كلمة المرور يجب ألا تقل عن 4 أرقام أو أحرف" },
        { status: 400 },
      );
    }
    if (!favoriteTeam) {
      return NextResponse.json(
        { error: "اختر المنتخب المرشح" },
        { status: 400 },
      );
    }

    const [nameSnapshot, phoneSnapshot] = await Promise.all([
      adminDb.collection("users").where("fullName", "==", fullName).limit(1).get(),
      adminDb.collection("users").where("phone", "==", phone).limit(1).get(),
    ]);

    if (!nameSnapshot.empty) {
      return NextResponse.json(
        { error: "هذا الاسم مستخدم مسبقًا" },
        { status: 409 },
      );
    }
    if (!phoneSnapshot.empty) {
      return NextResponse.json(
        { error: "رقم الجوال مستخدم مسبقًا" },
        { status: 409 },
      );
    }

    const userRef = adminDb.collection("users").doc();
    const now = new Date().toISOString();
    const userData = {
      fullName,
      phone,
      favoriteTeam,
      teamEmoji,
      points: 0,
      total: 0,
      correct: 0,
      wrong: 0,
      currentRank: 0,
      previousRank: 0,
      rankChange: 0,
      rankDirection: "-",
      currentStreak: 0,
      bestStreak: 0,
      seenNotices: {},
      authUid: userRef.id,
      memberAuthVersion: 2,
      memberAuthMigratedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const credential = await hashMemberPassword(password);
    const batch = adminDb.batch();

    batch.set(userRef, userData);
    batch.set(
      adminDb.collection("memberCredentials").doc(userRef.id),
      credential,
    );
    await batch.commit();

    const customToken = await createMemberCustomToken(userRef.id);

    return NextResponse.json(
      {
        customToken,
        user: mapSafeMemberUser(userRef.id, userData),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Member secure register error:", error);
    return NextResponse.json(
      { error: "تعذر إنشاء الحساب الآن، حاول مرة أخرى" },
      { status: 500 },
    );
  }
}
