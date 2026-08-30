import type { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new Error("UNAUTHORIZED");
  }

  return token;
}

export async function requireAdminRequest(request: NextRequest) {
  const token = getBearerToken(request);
  const decoded = await adminAuth.verifyIdToken(token);
  const adminSnap = await adminDb.collection("admins").doc(decoded.uid).get();

  if (
    !adminSnap.exists ||
    adminSnap.data()?.role !== "admin" ||
    adminSnap.data()?.enabled !== true
  ) {
    throw new Error("FORBIDDEN");
  }

  return decoded;
}
