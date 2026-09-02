import { createSign, randomBytes } from "crypto";

export type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
};

type FirestoreValue = {
  nullValue?: null;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  stringValue?: string;
  bytesValue?: string;
  referenceValue?: string;
  geoPointValue?: { latitude?: number; longitude?: number };
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
};

type ServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function cleanEnv(value: string | undefined) {
  let cleaned = String(value || "").trim();

  for (let pass = 0; pass < 3; pass += 1) {
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

function decodeBase64PrivateKey(value: string) {
  if (!value || value.includes("BEGIN PRIVATE KEY")) return value;

  try {
    const decoded = Buffer.from(value, "base64").toString("utf8").trim();
    return decoded.includes("BEGIN PRIVATE KEY") ? decoded : value;
  } catch {
    return value;
  }
}

function normalizePrivateKey(value: string | undefined) {
  let key = cleanEnv(value);

  if (!key) {
    key = cleanEnv(process.env.FIREBASE_ADMIN_PRIVATE_KEY_BASE64);
  }

  key = decodeBase64PrivateKey(key)
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();

  if (!key.includes("-----BEGIN PRIVATE KEY-----")) {
    throw new Error("FIREBASE_PRIVATE_KEY_INVALID");
  }

  return key.endsWith("\n") ? key : `${key}\n`;
}

function readServiceAccountJson(): ServiceAccount | null {
  const raw = cleanEnv(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const projectId = cleanEnv(String(parsed.project_id || parsed.projectId || ""));
    const clientEmail = cleanEnv(String(parsed.client_email || parsed.clientEmail || ""));
    const privateKey = normalizePrivateKey(
      String(parsed.private_key || parsed.privateKey || ""),
    );

    if (!projectId || !clientEmail) throw new Error("FIREBASE_SERVICE_ACCOUNT_INVALID");

    return { projectId, clientEmail, privateKey };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("FIREBASE_")) throw error;
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON_INVALID");
  }
}

export function getServiceAccount(): ServiceAccount {
  const json = readServiceAccountJson();
  if (json) return json;

  const projectId = cleanEnv(process.env.FIREBASE_ADMIN_PROJECT_ID);
  const clientEmail = cleanEnv(process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
  const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

  if (!projectId) throw new Error("FIREBASE_PROJECT_ID_MISSING");
  if (!clientEmail) throw new Error("FIREBASE_CLIENT_EMAIL_MISSING");

  return { projectId, clientEmail, privateKey };
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(payload: Record<string, unknown>, privateKey: string) {
  const header = { alg: "RS256", typ: "JWT" };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey);
  return `${unsigned}.${base64Url(signature)}`;
}

export function createFirebaseCustomToken(
  uid: string,
  claims: Record<string, unknown> = {},
) {
  const { clientEmail, privateKey } = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);

  return signJwt(
    {
      iss: clientEmail,
      sub: clientEmail,
      aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
      iat: now,
      exp: now + 60 * 60,
      uid,
      claims,
    },
    privateKey,
  );
}

async function getGoogleAccessToken() {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const { clientEmail, privateKey } = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt(
    {
      iss: clientEmail,
      scope:
        "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 60 * 60,
    },
    privateKey,
  );

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const text = await response.text();
  let data: { access_token?: string; expires_in?: number; error?: string } = {};
  try {
    data = text ? (JSON.parse(text) as typeof data) : {};
  } catch {
    throw new Error(`GOOGLE_OAUTH_NON_JSON_${response.status}`);
  }

  if (!response.ok || !data.access_token) {
    throw new Error(`GOOGLE_OAUTH_FAILED_${response.status}_${data.error || "unknown"}`);
  }

  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(60, Number(data.expires_in || 3600) - 60) * 1000,
  };

  return cachedAccessToken.token;
}

function firestoreBaseUrl() {
  const { projectId } = getServiceAccount();
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;
}

async function firestoreRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`FIRESTORE_NON_JSON_${response.status}`);
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? JSON.stringify((data as { error?: unknown }).error)
        : "unknown";
    throw new Error(`FIRESTORE_REQUEST_FAILED_${response.status}_${message}`);
  }

  return data as T;
}

function decodeValue(value: FirestoreValue | undefined): unknown {
  if (!value) return undefined;
  if ("nullValue" in value) return null;
  if (typeof value.stringValue === "string") return value.stringValue;
  if (typeof value.booleanValue === "boolean") return value.booleanValue;
  if (typeof value.integerValue === "string") return Number(value.integerValue);
  if (typeof value.doubleValue === "number") return value.doubleValue;
  if (typeof value.timestampValue === "string") return value.timestampValue;
  if (typeof value.bytesValue === "string") return value.bytesValue;
  if (typeof value.referenceValue === "string") return value.referenceValue;
  if (value.geoPointValue) return value.geoPointValue;
  if (value.arrayValue) return (value.arrayValue.values || []).map(decodeValue);
  if (value.mapValue) return decodeFields(value.mapValue.fields || {});
  return undefined;
}

export function decodeFields(fields: Record<string, FirestoreValue> = {}) {
  const output: Record<string, unknown> = {};
  Object.entries(fields).forEach(([key, value]) => {
    output[key] = decodeValue(value);
  });
  return output;
}

function encodeValue(value: unknown): FirestoreValue {
  if (value === null || typeof value === "undefined") return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === "object") {
    const fields: Record<string, FirestoreValue> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      if (typeof item !== "undefined") fields[key] = encodeValue(item);
    });
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

export function encodeFields(data: Record<string, unknown>) {
  const fields: Record<string, FirestoreValue> = {};
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value !== "undefined") fields[key] = encodeValue(value);
  });
  return fields;
}

export function documentId(document: FirestoreDocument) {
  return document.name.split("/").pop() || "";
}

export async function queryCollectionByField(
  collectionId: string,
  fieldPath: string,
  value: string,
  limit = 1,
) {
  const url = `${firestoreBaseUrl()}:runQuery`;
  const response = await firestoreRequest<Array<{ document?: FirestoreDocument }>>(url, {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: "EQUAL",
            value: { stringValue: value },
          },
        },
        limit,
      },
    }),
  });

  return response.flatMap((item) => (item.document ? [item.document] : []));
}

export async function listCollection(collectionId: string, pageSize = 1) {
  const url = `${firestoreBaseUrl()}/${encodeURIComponent(collectionId)}?pageSize=${pageSize}`;
  const response = await firestoreRequest<{ documents?: FirestoreDocument[] }>(url);
  return response.documents || [];
}

export async function getDocument(collectionId: string, id: string) {
  const url = `${firestoreBaseUrl()}/${encodeURIComponent(collectionId)}/${encodeURIComponent(id)}`;
  try {
    return await firestoreRequest<FirestoreDocument>(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (message.includes("FIRESTORE_REQUEST_FAILED_404")) return null;
    throw error;
  }
}

type FirestoreWrite = {
  update: FirestoreDocument;
  updateMask?: { fieldPaths: string[] };
  currentDocument?: { exists?: boolean; updateTime?: string };
};

export async function commitWrites(writes: FirestoreWrite[]) {
  const url = `${firestoreBaseUrl()}:commit`;
  return firestoreRequest<{ writeResults?: unknown[]; commitTime?: string }>(url, {
    method: "POST",
    body: JSON.stringify({ writes }),
  });
}

export function documentName(collectionId: string, id: string) {
  return `${firestoreBaseUrl().replace("https://firestore.googleapis.com/v1/", "")}/${collectionId}/${id}`;
}

export function createDocumentWrite(
  collectionId: string,
  id: string,
  data: Record<string, unknown>,
  fieldPaths?: string[],
): FirestoreWrite {
  return {
    update: {
      name: documentName(collectionId, id),
      fields: encodeFields(data),
    },
    ...(fieldPaths ? { updateMask: { fieldPaths } } : {}),
  };
}

export function createDocumentIfMissingWrite(
  collectionId: string,
  id: string,
  data: Record<string, unknown>,
): FirestoreWrite {
  return {
    update: {
      name: documentName(collectionId, id),
      fields: encodeFields(data),
    },
    currentDocument: { exists: false },
  };
}

export function newDocumentId() {
  return randomBytes(18).toString("base64url").slice(0, 20);
}

export async function verifyFirebaseIdTokenViaRest(idToken: string) {
  const apiKey = cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
  if (!apiKey) throw new Error("FIREBASE_WEB_API_KEY_MISSING");

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    },
  );

  const text = await response.text();
  let data: { users?: Array<{ localId?: string }>; error?: unknown } = {};
  try {
    data = text ? (JSON.parse(text) as typeof data) : {};
  } catch {
    throw new Error(`IDENTITY_TOOLKIT_NON_JSON_${response.status}`);
  }

  const uid = data.users?.[0]?.localId;
  if (!response.ok || !uid) {
    throw new Error(`IDENTITY_TOKEN_INVALID_${response.status}`);
  }

  return uid;
}

export async function restAdminStatus() {
  const account = getServiceAccount();
  const token = createFirebaseCustomToken("member-auth-health-check", {
    healthCheck: true,
  });
  const docs = await listCollection("users", 1);
  return {
    projectIdConfigured: Boolean(account.projectId),
    clientEmailConfigured: Boolean(account.clientEmail),
    privateKeyConfigured: Boolean(account.privateKey),
    customTokenSigned: token.split(".").length === 3,
    firestoreReachable: Array.isArray(docs),
  };
}
