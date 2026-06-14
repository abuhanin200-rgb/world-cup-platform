import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

export type AdminMember = {
  id: string;
  fullName: string;
  phone: string;
  password: string;

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

  createdAt?: string;
  updatedAt?: string;
};

export type UpdateAdminMemberInput = {
  userId: string;
  fullName: string;
  phone: string;
  password: string;
  favoriteTeam: string;
  teamEmoji: string;

  points: number;
  total: number;
  correct: number;
  wrong: number;
  currentStreak: number;
  bestStreak: number;
};

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toText(value: unknown) {
  return String(value || "").trim();
}

function normalizeRankDirection(value: unknown): "up" | "down" | "-" {
  if (value === "up" || value === "down" || value === "-") {
    return value;
  }

  return "-";
}

function mapMember(id: string, data: Record<string, unknown>): AdminMember {
  return {
    id,
    fullName: toText(data.fullName) || "عضو بدون اسم",
    phone: toText(data.phone),
    password: toText(data.password),

    favoriteTeam: toText(data.favoriteTeam),
    teamEmoji: toText(data.teamEmoji),

    points: toNumber(data.points),
    total: toNumber(data.total),
    correct: toNumber(data.correct),
    wrong: toNumber(data.wrong),

    currentRank: toNumber(data.currentRank),
    previousRank: toNumber(data.previousRank),
    rankChange: toNumber(data.rankChange),
    rankDirection: normalizeRankDirection(data.rankDirection),

    currentStreak: toNumber(data.currentStreak),
    bestStreak: toNumber(data.bestStreak),

    createdAt: data.createdAt ? String(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
  };
}

function getRankMovement(oldRank: number, newRank: number) {
  let rankDirection: "up" | "down" | "-" = "-";
  let rankChange = 0;

  if (oldRank > newRank) {
    rankDirection = "up";
    rankChange = oldRank - newRank;
  } else if (oldRank < newRank) {
    rankDirection = "down";
    rankChange = newRank - oldRank;
  }

  return {
    rankDirection,
    rankChange,
  };
}

async function refreshLeaderboardRanks() {
  const members = await getAdminMembers();

  const rankedMembers = [...members].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.correct !== a.correct) return b.correct - a.correct;
    if (a.total !== b.total) return a.total - b.total;
    return a.fullName.localeCompare(b.fullName, "ar");
  });

  const batch = writeBatch(db);
  const now = new Date().toISOString();

  rankedMembers.forEach((member, index) => {
    const newRank = index + 1;
    const oldRank = member.currentRank > 0 ? member.currentRank : newRank;
    const movement = getRankMovement(oldRank, newRank);

    batch.update(doc(db, "users", member.id), {
      previousRank: oldRank,
      currentRank: newRank,
      rankDirection: movement.rankDirection,
      rankChange: movement.rankChange,
      lastUpdated: now,
    });
  });

  await batch.commit();
}

export async function getAdminMembers(): Promise<AdminMember[]> {
  const snapshot = await getDocs(collection(db, "users"));

  return snapshot.docs
    .map((docSnap) => mapMember(docSnap.id, docSnap.data()))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.correct !== a.correct) return b.correct - a.correct;
      if (a.total !== b.total) return a.total - b.total;
      return a.fullName.localeCompare(b.fullName, "ar");
    })
    .map((member, index) => ({
      ...member,
      currentRank: index + 1,
    }));
}

export async function getAdminMemberById(
  userId: string
): Promise<AdminMember | null> {
  if (!userId) return null;

  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return null;

  return mapMember(userSnap.id, userSnap.data());
}

export async function updateAdminMember(input: UpdateAdminMemberInput) {
  const userId = toText(input.userId);
  const fullName = toText(input.fullName);
  const phone = toText(input.phone);
  const password = toText(input.password);
  const favoriteTeam = toText(input.favoriteTeam);
  const teamEmoji = toText(input.teamEmoji);

  if (!userId) {
    throw new Error("معرّف العضو غير موجود");
  }

  if (!fullName) {
    throw new Error("اسم العضو مطلوب");
  }

  if (fullName.length > 20) {
    throw new Error("اسم العضو يجب ألا يتجاوز 20 حرفًا");
  }

  if (!phone) {
    throw new Error("رقم الجوال مطلوب");
  }

  if (!password || password.length < 4) {
    throw new Error("الرقم السري يجب ألا يقل عن 4 أحرف أو أرقام");
  }

  if (!favoriteTeam) {
    throw new Error("المنتخب المرشح مطلوب");
  }

  const now = new Date().toISOString();

  await updateDoc(doc(db, "users", userId), {
    fullName,
    phone,
    password,

    favoriteTeam,
    teamEmoji,

    points: Math.max(0, toNumber(input.points)),
    total: Math.max(0, toNumber(input.total)),
    correct: Math.max(0, toNumber(input.correct)),
    wrong: Math.max(0, toNumber(input.wrong)),

    currentStreak: Math.max(0, toNumber(input.currentStreak)),
    bestStreak: Math.max(0, toNumber(input.bestStreak)),

    updatedAt: now,
    lastUpdated: now,
  });

  await refreshLeaderboardRanks();

  return getAdminMemberById(userId);
}

export async function resetAdminMemberStats(userId: string) {
  const cleanUserId = toText(userId);

  if (!cleanUserId) {
    throw new Error("اختر العضو أولًا");
  }

  const now = new Date().toISOString();

  await updateDoc(doc(db, "users", cleanUserId), {
    points: 0,
    total: 0,
    correct: 0,
    wrong: 0,

    currentStreak: 0,
    bestStreak: 0,

    rankChange: 0,
    rankDirection: "-",

    updatedAt: now,
    lastUpdated: now,
  });

  await refreshLeaderboardRanks();

  return true;
}