import {
  commitWrites,
  createDocumentWrite,
  createFirebaseCustomToken,
  decodeFields,
  documentId,
  getDocument,
  newDocumentId,
  queryCollectionByField,
  type FirestoreDocument,
} from "@/lib/serverFirebaseRest";
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

function direction(value: unknown): "up" | "down" | "-" {
  return value === "up" || value === "down" ? value : "-";
}

export function mapSafeMemberUser(
  id: string,
  data: Record<string, unknown>,
): SafeMemberUser {
  const raw =
    data.seenNotices && typeof data.seenNotices === "object"
      ? (data.seenNotices as Record<string, unknown>)
      : {};
  const seenNotices: Record<string, boolean> = {};
  Object.entries(raw).forEach(([key, value]) => {
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
    rankDirection: direction(data.rankDirection),
    currentStreak: number(data.currentStreak),
    bestStreak: number(data.bestStreak),
    seenNotices,
    createdAt: data.createdAt ? String(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
    lastUpdated: data.lastUpdated ? String(data.lastUpdated) : undefined,
  };
}

function documentData(document: FirestoreDocument) {
  return decodeFields(document.fields || {});
}

export async function findMemberByFullName(fullName: string) {
  const documents = await queryCollectionByField(
    "users",
    "fullName",
    fullName.trim(),
    1,
  );
  return documents[0] || null;
}

export async function findMemberByPhone(phone: string) {
  const documents = await queryCollectionByField("users", "phone", phone.trim(), 1);
  return documents[0] || null;
}

export async function findMemberPrivateProfileByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const documents = await queryCollectionByField("memberPrivateProfiles", "email", normalized, 1);
  return documents[0] || null;
}

export async function verifyAndMigrateMemberPassword(
  memberDocument: FirestoreDocument,
  password: string,
) {
  const userId = documentId(memberDocument);
  const userData = documentData(memberDocument);
  const credentialDocument = await getDocument("memberCredentials", userId);

  if (credentialDocument) {
    const valid = await verifyMemberPassword(
      password,
      documentData(credentialDocument) as Partial<StoredMemberCredential>,
    );

    if (valid && userData.authUid !== userId) {
      const now = new Date().toISOString();
      await commitWrites([
        createDocumentWrite(
          "users",
          userId,
          {
            authUid: userId,
            memberAuthVersion: 2,
            memberAuthMigratedAt: userData.memberAuthMigratedAt || now,
            updatedAt: now,
          },
          ["authUid", "memberAuthVersion", "memberAuthMigratedAt", "updatedAt"],
        ),
      ]);
    }

    return valid;
  }

  const legacyPassword = text(userData.password);
  if (!legacyPassword || legacyPassword !== password.trim()) return false;

  const credential = await hashMemberPassword(password);
  const now = new Date().toISOString();

  await commitWrites([
    createDocumentWrite("memberCredentials", userId, credential),
    // Including `password` in the mask while omitting it from fields deletes the
    // old plaintext password after the first successful secure login.
    createDocumentWrite(
      "users",
      userId,
      {
        authUid: userId,
        memberAuthVersion: 2,
        memberAuthMigratedAt: now,
        updatedAt: now,
      },
      [
        "authUid",
        "memberAuthVersion",
        "memberAuthMigratedAt",
        "updatedAt",
        "password",
      ],
    ),
  ]);

  return true;
}

export async function loginMember(fullName: string, password: string) {
  const member = await findMemberByFullName(fullName);
  if (!member) return null;

  const valid = await verifyAndMigrateMemberPassword(member, password);
  if (!valid) return null;

  const userId = documentId(member);
  const refreshed = (await getDocument("users", userId)) || member;
  return {
    customToken: createFirebaseCustomToken(userId, {
      member: true,
      memberAuthVersion: 2,
    }),
    user: mapSafeMemberUser(userId, documentData(refreshed)),
  };
}

export async function registerMember(input: {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  favoriteTeam: string;
  teamEmoji: string;
}) {
  const [sameName, samePhone, sameEmail] = await Promise.all([
    findMemberByFullName(input.fullName),
    findMemberByPhone(input.phone),
    input.email ? findMemberPrivateProfileByEmail(input.email) : Promise.resolve(null),
  ]);

  if (sameName) throw new Error("NAME_EXISTS");
  if (samePhone) throw new Error("PHONE_EXISTS");
  if (sameEmail) throw new Error("EMAIL_EXISTS");

  const userId = newDocumentId();
  const now = new Date().toISOString();
  const userData: Record<string, unknown> = {
    fullName: input.fullName,
    phone: input.phone,
    favoriteTeam: input.favoriteTeam,
    teamEmoji: input.teamEmoji,
    points: 0,
    total: 0,
    correct: 0,
    wrong: 0,
    currentRank: 0,
    previousRank: 0,
    rankChange: 0,
    rankDirection: "-",
    currentStreak: 0,
    bestStreak: 0,
    seenNotices: {},
    authUid: userId,
    memberAuthVersion: 2,
    memberAuthMigratedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  const credential = await hashMemberPassword(input.password);
  const writes = [
    createDocumentWrite("users", userId, userData),
    createDocumentWrite("memberCredentials", userId, credential),
  ];
  if (input.email) {
    writes.push(
      createDocumentWrite("memberPrivateProfiles", userId, {
        email: input.email.trim().toLowerCase(),
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  await commitWrites(writes);

  return {
    customToken: createFirebaseCustomToken(userId, {
      member: true,
      memberAuthVersion: 2,
    }),
    user: mapSafeMemberUser(userId, userData),
  };
}

export async function replaceMemberPassword(userId: string, newPassword: string) {
  const user = await getDocument("users", userId);
  if (!user) throw new Error("USER_NOT_FOUND");

  const oldCredential = await getDocument("memberCredentials", userId);
  const oldData = oldCredential ? documentData(oldCredential) : {};
  const credential = await hashMemberPassword(
    newPassword,
    typeof oldData.createdAt === "string" ? oldData.createdAt : undefined,
  );
  const now = new Date().toISOString();

  await commitWrites([
    createDocumentWrite("memberCredentials", userId, credential),
    createDocumentWrite(
      "users",
      userId,
      {
        authUid: userId,
        memberAuthVersion: 2,
        memberAuthMigratedAt: now,
        updatedAt: now,
      },
      [
        "authUid",
        "memberAuthVersion",
        "memberAuthMigratedAt",
        "updatedAt",
        "password",
      ],
    ),
  ]);
}
