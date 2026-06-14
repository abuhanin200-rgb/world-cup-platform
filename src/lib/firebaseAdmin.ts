import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getFirebaseAdminPrivateKey() {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("FIREBASE_ADMIN_PRIVATE_KEY is missing");
  }

  return privateKey.replace(/\\n/g, "\n");
}

function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

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

export const adminDb = getFirestore(getFirebaseAdminApp());