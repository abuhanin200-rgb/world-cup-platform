import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export type StoredMemberCredential = {
  algorithm: "scrypt-v1";
  salt: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export async function hashMemberPassword(
  password: string,
  existingCreatedAt?: string,
): Promise<StoredMemberCredential> {
  const cleanPassword = password.trim();

  if (!cleanPassword || cleanPassword.length < 4) {
    throw new Error("كلمة المرور يجب ألا تقل عن 4 أرقام أو أحرف");
  }

  const salt = randomBytes(16);
  const derived = (await scrypt(cleanPassword, salt, KEY_LENGTH)) as Buffer;
  const now = new Date().toISOString();

  return {
    algorithm: "scrypt-v1",
    salt: salt.toString("base64"),
    passwordHash: derived.toString("base64"),
    createdAt: existingCreatedAt || now,
    updatedAt: now,
  };
}

export async function verifyMemberPassword(
  password: string,
  credential: Partial<StoredMemberCredential>,
) {
  if (
    credential.algorithm !== "scrypt-v1" ||
    typeof credential.salt !== "string" ||
    typeof credential.passwordHash !== "string"
  ) {
    return false;
  }

  try {
    const salt = Buffer.from(credential.salt, "base64");
    const expected = Buffer.from(credential.passwordHash, "base64");

    if (expected.length !== KEY_LENGTH) return false;

    const actual = (await scrypt(password.trim(), salt, KEY_LENGTH)) as Buffer;

    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
