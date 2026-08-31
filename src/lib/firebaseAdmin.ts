import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

type AdminServices = {
  app: App;
  db: Firestore;
  auth: Auth;
};

let cachedServices: AdminServices | null = null;

function cleanServerEnv(value: string | undefined) {
  let cleaned = String(value || "").trim();

  // Vercel values are sometimes pasted with quotes from .env files.
  for (let pass = 0; pass < 2; pass += 1) {
    if (
      cleaned.length >= 2 &&
      ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'")))
    ) {
      cleaned = cleaned.slice(1, -1).trim();
    }
  }

  return cleaned;
}

function decodePossibleBase64(value: string) {
  const cleanValue = value.trim();
  if (!cleanValue || cleanValue.includes("BEGIN PRIVATE KEY")) return cleanValue;

  try {
    const decoded = Buffer.from(cleanValue, "base64").toString("utf8").trim();
    return decoded.includes("BEGIN PRIVATE KEY") ? decoded : cleanValue;
  } catch {
    return cleanValue;
  }
}

function normalizePrivateKey(value: string | undefined) {
  let privateKey = cleanServerEnv(value);

  if (!privateKey) {
    const base64Key = cleanServerEnv(process.env.FIREBASE_ADMIN_PRIVATE_KEY_BASE64);
    if (base64Key) privateKey = decodePossibleBase64(base64Key);
  }

  if (!privateKey) {
    throw new Error("FIREBASE_ADMIN_PRIVATE_KEY is missing");
  }

  privateKey = decodePossibleBase64(privateKey)
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();

  if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    throw new Error("FIREBASE_ADMIN_PRIVATE_KEY has an invalid format");
  }

  return privateKey.endsWith("\n") ? privateKey : `${privateKey}\n`;
}

function readServiceAccountJson() {
  const raw = cleanServerEnv(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      projectId: cleanServerEnv(String(parsed.project_id || parsed.projectId || "")),
      clientEmail: cleanServerEnv(String(parsed.client_email || parsed.clientEmail || "")),
      privateKey: normalizePrivateKey(String(parsed.private_key || parsed.privateKey || "")),
    };
  } catch {
    throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is invalid JSON");
  }
}

function resolveAdminCredential() {
  const jsonCredential = readServiceAccountJson();
  if (jsonCredential) return jsonCredential;

  const projectId = cleanServerEnv(process.env.FIREBASE_ADMIN_PROJECT_ID);
  const clientEmail = cleanServerEnv(process.env.FIREBASE_ADMIN_CLIENT_EMAIL);

  if (!projectId) throw new Error("FIREBASE_ADMIN_PROJECT_ID is missing");
  if (!clientEmail) throw new Error("FIREBASE_ADMIN_CLIENT_EMAIL is missing");

  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
  };
}

/**
 * Lazy initialization is intentional.
 * Vercel evaluates route modules while starting a serverless function. If a
 * Firebase Admin environment value is malformed, eager initialization at module
 * import time crashes the whole function and Vercel responds with an HTML error
 * page. Initializing inside the request lets our API return a controlled JSON
 * error instead and avoids the production-only "Unexpected token '<'" failure.
 */
export function getFirebaseAdminServices(): AdminServices {
  if (cachedServices) return cachedServices;

  const existingApp = getApps()[0];
  const app =
    existingApp ||
    initializeApp({
      credential: cert(resolveAdminCredential()),
    });

  cachedServices = {
    app,
    db: getFirestore(app),
    auth: getAuth(app),
  };

  return cachedServices;
}

function bindLazy<T extends object>(kind: "db" | "auth") {
  return new Proxy({} as T, {
    get(_target, property) {
      const service = getFirebaseAdminServices()[kind] as unknown as Record<PropertyKey, unknown>;
      const value = service[property];
      return typeof value === "function" ? value.bind(service) : value;
    },
    set(_target, property, value) {
      const service = getFirebaseAdminServices()[kind] as unknown as Record<PropertyKey, unknown>;
      service[property] = value;
      return true;
    },
  });
}

// Keep the existing API used by the rest of the project, but make both objects lazy.
export const adminDb = bindLazy<Firestore>("db");
export const adminAuth = bindLazy<Auth>("auth");

export function getFirebaseAdminDiagnostics() {
  const projectId = cleanServerEnv(process.env.FIREBASE_ADMIN_PROJECT_ID);
  const clientEmail = cleanServerEnv(process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
  const privateKey = cleanServerEnv(process.env.FIREBASE_ADMIN_PRIVATE_KEY);
  const serviceJson = cleanServerEnv(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON);

  return {
    hasProjectId: Boolean(projectId),
    hasClientEmail: Boolean(clientEmail),
    hasPrivateKey: Boolean(privateKey || serviceJson),
  };
}
