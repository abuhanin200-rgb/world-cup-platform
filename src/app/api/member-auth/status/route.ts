import { NextResponse } from "next/server";
import {
  getFirebaseAdminDiagnostics,
  getFirebaseAdminServices,
} from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const env = getFirebaseAdminDiagnostics();

  try {
    const { db, auth } = getFirebaseAdminServices();

    // Firestore read verifies project + credentials. Creating a token verifies the
    // private signing key without exposing any member data or secret values.
    await db.collection("users").limit(1).get();
    await auth.createCustomToken("member-auth-health-check", { healthCheck: true });

    return NextResponse.json(
      {
        ok: true,
        service: "member-auth",
        firebaseAdmin: "ready",
        environment: env,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "");
    console.error("Member auth status failed:", error);

    let reason = "server_error";
    if (/PROJECT_ID|project/i.test(message)) reason = "project_id";
    else if (/CLIENT_EMAIL|client.?email/i.test(message)) reason = "client_email";
    else if (/PRIVATE_KEY|private key|PEM|credential/i.test(message)) reason = "private_key";

    return NextResponse.json(
      {
        ok: false,
        service: "member-auth",
        firebaseAdmin: "not_ready",
        reason,
        environment: env,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
