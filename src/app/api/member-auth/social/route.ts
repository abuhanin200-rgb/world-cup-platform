import { NextResponse } from "next/server";
import {
  createFirebaseCustomToken,
  decodeFields,
  documentId,
  getDocument,
  queryCollectionByField,
} from "@/lib/serverFirebaseRest";
import { mapSafeMemberUser } from "@/lib/serverMemberAuthRest";
import { verifyFirebaseSocialSession, type SocialProvider } from "@/lib/serverSocialAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED = new Set<SocialProvider>(["google", "facebook", "apple"]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { idToken?: string; provider?: SocialProvider };
    const idToken = String(body.idToken || "").trim();
    const provider = body.provider;
    if (!idToken || !provider || !ALLOWED.has(provider)) {
      return NextResponse.json({ error: "جلسة الدخول الاجتماعي غير مكتملة" }, { status: 400 });
    }

    const identity = await verifyFirebaseSocialSession(idToken, provider);
    const profiles = await queryCollectionByField("memberPrivateProfiles", "email", identity.email, 2);
    const profile = profiles[0];

    if (profiles.length > 1) {
      return NextResponse.json(
        { error: "هذا البريد مرتبط بأكثر من حساب. تواصل مع الإدارة لتوحيد الربط.", code: "SOCIAL_EMAIL_AMBIGUOUS" },
        { status: 409 },
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          error: "لا يوجد حساب في التحدي مرتبط بهذا البريد. اختر إنشاء حساب جديد لإكمال التسجيل.",
          code: "SOCIAL_EMAIL_NOT_LINKED",
          registration: { email: identity.email, displayName: identity.displayName, provider },
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
          socialLogin: provider,
        }),
        user: mapSafeMemberUser(userId, decodeFields(member.fields || {})),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "");
    console.error("Social member login error:", error);
    const authError = /SOCIAL_SESSION|SOCIAL_PROVIDER|SOCIAL_EMAIL/i.test(message);
    const infrastructure = /FIREBASE_|GOOGLE_OAUTH_|FIRESTORE_/i.test(message);
    return NextResponse.json(
      {
        error: authError
          ? "تعذر التحقق من حساب مزود الدخول. أعد المحاولة."
          : infrastructure
            ? "تعذر تشغيل خدمة الدخول الاجتماعي الآن. حاول بعد قليل."
            : "تعذر تسجيل الدخول الاجتماعي.",
        code: infrastructure ? "SOCIAL_LOGIN_INFRASTRUCTURE" : message || "SOCIAL_LOGIN_ERROR",
      },
      { status: authError ? 401 : infrastructure ? 503 : 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
