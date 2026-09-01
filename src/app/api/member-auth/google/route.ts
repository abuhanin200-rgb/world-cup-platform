import { NextResponse } from "next/server";
import {
  createFirebaseCustomToken,
  decodeFields,
  documentId,
  getDocument,
  queryCollectionByField,
} from "@/lib/serverFirebaseRest";
import { mapSafeMemberUser } from "@/lib/serverMemberAuthRest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type LookupUser = {
  localId?: string;
  email?: string;
  emailVerified?: boolean;
  providerUserInfo?: Array<{ providerId?: string }>;
};

async function verifyFirebaseGoogleSession(idToken: string) {
  const apiKey = String(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim();
  if (!apiKey) throw new Error("FIREBASE_API_KEY_MISSING");

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    },
  );

  const data = (await response.json().catch(() => ({}))) as { users?: LookupUser[]; error?: unknown };
  if (!response.ok || !data.users?.[0]) throw new Error("GOOGLE_SESSION_INVALID");

  const user = data.users[0];
  const isGoogle = user.providerUserInfo?.some((provider) => provider.providerId === "google.com");
  const email = String(user.email || "").trim().toLowerCase();

  if (!isGoogle || !user.emailVerified || !email) throw new Error("GOOGLE_ACCOUNT_UNVERIFIED");
  return { email };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { idToken?: string };
    const idToken = String(body.idToken || "").trim();
    if (!idToken) return NextResponse.json({ error: "جلسة Google غير مكتملة" }, { status: 400 });

    const { email } = await verifyFirebaseGoogleSession(idToken);
    const profiles = await queryCollectionByField("memberPrivateProfiles", "email", email, 2);
    const profile = profiles[0];
    if (profiles.length > 1) {
      return NextResponse.json(
        { error: "هذا البريد مرتبط بأكثر من حساب. تواصل مع الإدارة لتوحيد الربط قبل استخدام Google.", code: "GOOGLE_EMAIL_AMBIGUOUS" },
        { status: 409 },
      );
    }
    if (!profile) {
      return NextResponse.json(
        {
          error: "لا يوجد حساب في التحدي مرتبط بهذا البريد. أضف البريد نفسه إلى حسابك أو أنشئ حسابًا جديدًا أولًا.",
          code: "GOOGLE_EMAIL_NOT_LINKED",
        },
        { status: 404 },
      );
    }

    const userId = documentId(profile);
    const member = await getDocument("users", userId);
    if (!member) return NextResponse.json({ error: "تعذر العثور على حساب العضو" }, { status: 404 });

    return NextResponse.json(
      {
        customToken: createFirebaseCustomToken(userId, {
          member: true,
          memberAuthVersion: 2,
          googleLogin: true,
        }),
        user: mapSafeMemberUser(userId, decodeFields(member.fields || {})),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "");
    console.error("Google member login error:", error);
    if (message === "GOOGLE_SESSION_INVALID" || message === "GOOGLE_ACCOUNT_UNVERIFIED") {
      return NextResponse.json(
        { error: "تعذر التحقق من حساب Google. أعد اختيار الحساب وحاول مرة أخرى.", code: message },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    const infrastructure = /FIREBASE_|GOOGLE_OAUTH_|FIRESTORE_/i.test(message);
    return NextResponse.json(
      {
        error: infrastructure
          ? "تعذر تشغيل خدمة Google الآن. حاول مرة أخرى بعد قليل."
          : "تعذر تسجيل الدخول بواسطة Google.",
        code: infrastructure ? "GOOGLE_LOGIN_INFRASTRUCTURE" : "GOOGLE_LOGIN_ERROR",
      },
      { status: infrastructure ? 503 : 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
