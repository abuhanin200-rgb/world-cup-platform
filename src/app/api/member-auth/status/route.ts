import { NextResponse } from "next/server";
import { restAdminStatus } from "@/lib/serverFirebaseRest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const checks = await restAdminStatus();
    return NextResponse.json(
      {
        ok: true,
        service: "member-auth",
        transport: "google-rest",
        firebaseAdminSdk: "not_used",
        checks,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "");
    console.error("Member REST auth status failed:", error);

    let reason = "server_error";
    if (/PROJECT_ID/i.test(message)) reason = "project_id";
    else if (/CLIENT_EMAIL/i.test(message)) reason = "client_email";
    else if (/PRIVATE_KEY/i.test(message)) reason = "private_key";
    else if (/GOOGLE_OAUTH/i.test(message)) reason = "google_oauth";
    else if (/FIRESTORE/i.test(message)) reason = "firestore";

    return NextResponse.json(
      {
        ok: false,
        service: "member-auth",
        transport: "google-rest",
        reason,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
