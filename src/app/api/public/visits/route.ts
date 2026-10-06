import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHARD_COUNT = 16;
const DEDUP_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  // Reject ordinary cross-origin browser requests. This is not bot protection;
  // the metric represents reported browser visits, not verified unique people.
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.nextUrl.host) {
        return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
  }

  if (Number(request.headers.get("content-length") || 0) > 512) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  let visitId: unknown;
  try {
    const body = (await request.json()) as { visitId?: unknown };
    visitId = body?.visitId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof visitId !== "string" || !UUID_PATTERN.test(visitId)) {
    return NextResponse.json({ error: "Invalid visit" }, { status: 400 });
  }

  try {
    // Only an opaque, randomly generated session ID is stored. No IP, user ID,
    // or device fingerprint is persisted for the public visit counter.
    const digest = createHash("sha256").update(visitId).digest("hex");
    const shardIndex = Number.parseInt(digest.slice(0, 8), 16) % SHARD_COUNT;
    const visitRef = adminDb.collection("platformVisitSessions").doc(digest);
    const counterRef = adminDb.collection("platformVisitCounterShards").doc(String(shardIndex).padStart(2, "0"));

    await adminDb.runTransaction(async (tx) => {
      const previous = await tx.get(visitRef);
      if (previous.exists) return;
      tx.create(visitRef, {
        createdAt: FieldValue.serverTimestamp(),
        // Enable Firestore TTL on this field to prune old deduplication records.
        expiresAt: Timestamp.fromMillis(Date.now() + DEDUP_RETENTION_MS),
      });
      tx.set(counterRef, { count: FieldValue.increment(1) }, { merge: true });
    });

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Platform visit tracking failed:", error);
    return NextResponse.json({ error: "Visit tracking unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
