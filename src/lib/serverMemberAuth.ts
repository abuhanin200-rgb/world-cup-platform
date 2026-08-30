import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import {
  hashMemberPassword,
  verifyMemberPassword,
  type StoredMemberCredential,
} from "@/lib/serverPassword";

export type SafeMemberUser = {
  id: string;
  fullName: string;
  phone: string;
  favoriteTeam: string;
  teamEmoji: string;
  points: number;
  total: number;
  correct: number;
  wrong: number;
  currentRank: number;
  previousRank: number;
  rankChange: number;
  rankDirection: "up" | "down" | "-";
  currentStreak: number;
  bestStreak: number;
  seenNotices: Record<string, boolean>;
  createdAt?: string;
  updatedAt?: string;
  lastUpdated?: string;
};

function text(value: unknown) {
  return String(value || "").trim();
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rankDirection(value: unknown): "up" | "down" | "-" {
  return value === "up" || value === "down" ? value : "-";
}

export function mapSafeMemberUser(
  id: string,
  data: Record<string, unknown>,
): SafeMemberUser {
  const rawNotices =
    data.seenNotices && typeof data.seenNotices === "object"
      ? (data.seenNotices as Record<string, unknown>)
      : {};
  const seenNotices: Record<string, boolean> = {};

  Object.entries(rawNotices).forEach(([key, value]) => {
    seenNotices[key] = Boolean(value);
  });

  return {
    id,
    fullName: text(data.fullName),
    phone: text(data.phone),
    favoriteTeam: text(data.favoriteTeam),
    teamEmoji: text(data.teamEmoji),
    points: number(data.points),
    total: number(data.total),
    correct: number(data.correct),
    wrong: number(data.wrong),
    currentRank: number(data.currentRank),
    previousRank: number(data.previousRank),
    rankChange: number(data.rankChange),
    rankDirection: rankDirection(data.rankDirection),
    currentStreak: number(data.currentStreak),
    bestStreak: number(data.bestStreak),
    seenNotices,
    createdAt: data.createdAt ? String(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
    lastUpdated: data.lastUpdated ? String(data.lastUpdated) : undefined,
  };
}

export async function findMemberByFullName(fullName: string) {
  const snapshot = await adminDb
    .collection("users")
    .where("fullName", "==", fullName.trim())
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  return snapshot.docs[0];
}

export async function verifyAndMigrateMemberPassword(
  userId: string,
  userData: Record<string, unknown>,
  password: string,
) {
  const credentialRef = adminDb.collection("memberCredentials").doc(userId);
  const credentialSnap = await credentialRef.get();

  if (credentialSnap.exists) {
    const valid = await verifyMemberPassword(
      password,
      credentialSnap.data() as Partial<StoredMemberCredential>,
    );

    if (valid && userData.authUid !== userId) {
      const now = new Date().toISOString();
      await adminDb.collection("users").doc(userId).set(
        {
          authUid: userId,
          memberAuthVersion: 2,
          memberAuthMigratedAt: userData.memberAuthMigratedAt || now,
          updatedAt: now,
        },
        { merge: true },
      );
    }

    return valid;
  }

  const legacyPassword = text(userData.password);

  if (!legacyPassword || legacyPassword !== password.trim()) {
    return false;
  }

  const credential = await hashMemberPassword(password);
  const now = new Date().toISOString();
  const batch = adminDb.batch();

  batch.set(credentialRef, credential, { merge: true });
  batch.set(
    adminDb.collection("users").doc(userId),
    {
      authUid: userId,
      memberAuthVersion: 2,
      memberAuthMigratedAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  await batch.commit();
  return true;
}

export async function createMemberCustomToken(userId: string) {
  return adminAuth.createCustomToken(userId, {
    member: true,
    memberAuthVersion: 2,
  });
}
