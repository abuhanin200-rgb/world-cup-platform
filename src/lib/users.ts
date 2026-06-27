import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export type AppUser = {
  id: string;
  fullName: string;
  phone: string;
  password?: string;

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
  lastUpdated?: string;

  seenNotices?: {
    knockoutRulesV1?: boolean;
  };
};

export type RegisterUserInput = {
  fullName: string;
  phone: string;
  password: string;
  favoriteTeam: string;
  teamEmoji: string;
};

export type LoginUserInput = {
  fullName: string;
  password: string;
};

export type UpdateUserProfileInput = {
  userId: string;
  fullName: string;
  phone: string;
  favoriteTeam: string;
  teamEmoji: string;
};

export type UpdateUserPasswordInput = {
  userId: string;
  newPassword: string;
  confirmPassword: string;
};

function cleanText(value: string) {
  return value.trim();
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeRankDirection(value: unknown): "up" | "down" | "-" {
  if (value === "up" || value === "down" || value === "-") {
    return value;
  }

  return "-";
}

function normalizeSeenNotices(value: unknown): AppUser["seenNotices"] {
  if (!value || typeof value !== "object") {
    return {};
  }

  const notices = value as Record<string, unknown>;

  return {
    knockoutRulesV1: notices.knockoutRulesV1 === true,
  };
}

function mapUserDoc(id: string, data: Record<string, unknown>): AppUser {
  return {
    id,
    fullName: String(data.fullName || ""),
    phone: String(data.phone || ""),
    password: data.password ? String(data.password) : undefined,

    favoriteTeam: String(data.favoriteTeam || ""),
    teamEmoji: String(data.teamEmoji || ""),

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
    lastUpdated: data.lastUpdated ? String(data.lastUpdated) : undefined,

    seenNotices: normalizeSeenNotices(data.seenNotices),
  };
}

async function getUserByFullName(fullName: string) {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("fullName", "==", fullName), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];

  return mapUserDoc(docSnap.id, docSnap.data());
}

async function getUserByPhone(phone: string) {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("phone", "==", phone), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];

  return mapUserDoc(docSnap.id, docSnap.data());
}

export async function getUserById(userId: string): Promise<AppUser | null> {
  if (!userId) return null;

  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return null;

  return mapUserDoc(userSnap.id, userSnap.data());
}

export async function registerUser(input: RegisterUserInput): Promise<AppUser> {
  const fullName = cleanText(input.fullName);
  const phone = cleanText(input.phone);
  const password = cleanText(input.password);
  const favoriteTeam = cleanText(input.favoriteTeam);
  const teamEmoji = cleanText(input.teamEmoji);

  if (!fullName) {
    throw new Error("الاسم مطلوب");
  }

  if (fullName.length > 20) {
    throw new Error("الاسم يجب ألا يتجاوز 20 حرفًا");
  }

  if (!phone) {
    throw new Error("رقم الجوال مطلوب");
  }

  if (!password || password.length < 4) {
    throw new Error("كلمة المرور يجب ألا تقل عن 4 أرقام أو أحرف");
  }

  if (!favoriteTeam) {
    throw new Error("اختر المنتخب المرشح");
  }

  const existingName = await getUserByFullName(fullName);

  if (existingName) {
    throw new Error("هذا الاسم مستخدم مسبقًا");
  }

  const existingPhone = await getUserByPhone(phone);

  if (existingPhone) {
    throw new Error("رقم الجوال مستخدم مسبقًا");
  }

  const now = new Date().toISOString();

  const userData = {
    fullName,
    phone,
    password,

    favoriteTeam,
    teamEmoji,

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

    createdAt: now,
    updatedAt: now,

    seenNotices: {
      knockoutRulesV1: false,
    },
  };

  const userRef = await addDoc(collection(db, "users"), userData);

  return {
    id: userRef.id,
    ...userData,
    rankDirection: "-",
  };
}

export async function loginUser(input: LoginUserInput): Promise<AppUser> {
  const fullName = cleanText(input.fullName);
  const password = cleanText(input.password);

  if (!fullName || !password) {
    throw new Error("أدخل الاسم وكلمة المرور");
  }

  const user = await getUserByFullName(fullName);

  if (!user) {
    throw new Error("بيانات الدخول غير صحيحة");
  }

  if (String(user.password || "") !== password) {
    throw new Error("بيانات الدخول غير صحيحة");
  }

  return user;
}

export async function updateUserProfile(
  input: UpdateUserProfileInput
): Promise<AppUser> {
  const userId = cleanText(input.userId);
  const fullName = cleanText(input.fullName);
  const phone = cleanText(input.phone);
  const favoriteTeam = cleanText(input.favoriteTeam);
  const teamEmoji = cleanText(input.teamEmoji);

  if (!userId) {
    throw new Error("معرّف العضو غير موجود");
  }

  if (!fullName) {
    throw new Error("الاسم مطلوب");
  }

  if (fullName.length > 20) {
    throw new Error("الاسم يجب ألا يتجاوز 20 حرفًا");
  }

  if (!phone) {
    throw new Error("رقم الجوال مطلوب");
  }

  if (!favoriteTeam) {
    throw new Error("اختر المنتخب المرشح");
  }

  const existingName = await getUserByFullName(fullName);

  if (existingName && existingName.id !== userId) {
    throw new Error("هذا الاسم مستخدم من عضو آخر");
  }

  const existingPhone = await getUserByPhone(phone);

  if (existingPhone && existingPhone.id !== userId) {
    throw new Error("رقم الجوال مستخدم من عضو آخر");
  }

  const now = new Date().toISOString();

  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, {
    fullName,
    phone,
    favoriteTeam,
    teamEmoji,
    updatedAt: now,
  });

  const updatedUser = await getUserById(userId);

  if (!updatedUser) {
    throw new Error("تعذر تحميل بيانات العضو بعد التعديل");
  }

  return updatedUser;
}

export async function updateUserPassword(
  input: UpdateUserPasswordInput
): Promise<AppUser> {
  const userId = cleanText(input.userId);
  const newPassword = cleanText(input.newPassword);
  const confirmPassword = cleanText(input.confirmPassword);

  if (!userId) {
    throw new Error("معرّف العضو غير موجود");
  }

  if (!newPassword || newPassword.length < 4) {
    throw new Error("كلمة المرور الجديدة يجب ألا تقل عن 4 أرقام أو أحرف");
  }

  if (newPassword !== confirmPassword) {
    throw new Error("كلمة المرور وتأكيدها غير متطابقين");
  }

  const userRef = doc(db, "users", userId);
  const now = new Date().toISOString();

  await updateDoc(userRef, {
    password: newPassword,
    updatedAt: now,
  });

  const updatedUser = await getUserById(userId);

  if (!updatedUser) {
    throw new Error("تعذر تحميل بيانات العضو بعد تغيير كلمة المرور");
  }

  return updatedUser;
}

export async function markKnockoutRulesNoticeSeen(userId: string) {
  const cleanUserId = cleanText(userId);

  if (!cleanUserId) {
    throw new Error("معرّف العضو غير موجود");
  }

  const userRef = doc(db, "users", cleanUserId);

  await updateDoc(userRef, {
    "seenNotices.knockoutRulesV1": true,
    updatedAt: new Date().toISOString(),
  });
}