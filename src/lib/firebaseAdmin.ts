import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function cleanServerEnv(value: string | undefined) {
  let cleaned = String(value || "").trim();

  if (
    cleaned.length >= 2 &&
    ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'")))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  return cleaned;
}

function getFirebaseAdminPrivateKey() {
  const privateKey = cleanServerEnv(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

  if (!privateKey) {
    throw new Error("FIREBASE_ADMIN_PRIVATE_KEY is missing");
  }

  return privateKey.replace(/\\n/g, "\n");
}

function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = cleanServerEnv(process.env.FIREBASE_ADMIN_PROJECT_ID);
  const clientEmail = cleanServerEnv(process.env.FIREBASE_ADMIN_CLIENT_EMAIL);

  if (!projectId) {
    throw new Error("FIREBASE_ADMIN_PROJECT_ID is missing");
  }

  if (!clientEmail) {
    throw new Error("FIREBASE_ADMIN_CLIENT_EMAIL is missing");
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: getFirebaseAdminPrivateKey(),
    }),
  });
}

const adminApp = getFirebaseAdminApp();

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
