import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type AppUser = {
  id: string;
  fullName: string;
  password: string;
  phone: string;
  favoriteTeam: string;
  teamEmoji: string;
  residence?: string;
  points: number;
  total: number;
  correct: number;
  wrong: number;
  currentRank: number;
  previousRank: number;
  rankChange: number;
  rankDirection: string;
  currentStreak: number;
  bestStreak: number;
  createdAt?: string;
  lastUpdated?: string;
};

export type RegisterUserInput = {
  fullName: string;
  password: string;
  phone: string;
  favoriteTeam: string;
  teamEmoji: string;
};

export type LoginUserInput = {
  fullName: string;
  password: string;
};

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function normalizePhone(phone: string) {
  return phone.trim().replace(/\s+/g, "");
}

export async function registerUser(input: RegisterUserInput) {
  const fullName = normalizeName(input.fullName);
  const phone = normalizePhone(input.phone);
  const password = input.password.trim();

  if (!fullName || !phone || !password || !input.favoriteTeam || !input.teamEmoji) {
    throw new Error("جميع الحقول إلزامية");
  }

  if (fullName.length > 20) {
    throw new Error("الاسم يجب ألا يتجاوز 20 حرفًا");
  }

  if (password.length < 4) {
    throw new Error("الرقم السري يجب ألا يقل عن 4 خانات");
  }

  const usersRef = collection(db, "users");

  const nameQuery = query(usersRef, where("fullName", "==", fullName));
  const nameSnapshot = await getDocs(nameQuery);

  if (!nameSnapshot.empty) {
    throw new Error("هذا الاسم مستخدم مسبقًا، اختر اسمًا آخر");
  }

  const phoneQuery = query(usersRef, where("phone", "==", phone));
  const phoneSnapshot = await getDocs(phoneQuery);

  if (!phoneSnapshot.empty) {
    throw new Error("رقم الجوال مستخدم مسبقًا");
  }

  const now = new Date().toISOString();

  const newUser = {
    fullName,
    password,
    phone,
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

    createdAt: now,
    lastUpdated: now,
  };

  const docRef = await addDoc(usersRef, newUser);

  return {
    id: docRef.id,
    ...newUser,
  } as AppUser;
}

export async function loginUser(input: LoginUserInput) {
  const fullName = normalizeName(input.fullName);
  const password = input.password.trim();

  if (!fullName || !password) {
    throw new Error("أدخل الاسم والرقم السري");
  }

  const usersRef = collection(db, "users");
  const q = query(usersRef, where("fullName", "==", fullName));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error("الاسم أو الرقم السري غير صحيح");
  }

  const userDoc = snapshot.docs[0];
  const userData = userDoc.data() as Omit<AppUser, "id">;

  if (String(userData.password) !== password) {
    throw new Error("الاسم أو الرقم السري غير صحيح");
  }

  return {
    id: userDoc.id,
    ...userData,
  } as AppUser;
}

export async function getUserById(userId: string) {
  if (!userId) return null;

  const userRef = doc(db, "users", userId);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<AppUser, "id">),
  } as AppUser;
}

export async function updateUserProfile(
  userId: string,
  data: Partial<Pick<AppUser, "fullName" | "phone" | "favoriteTeam" | "teamEmoji" | "password">>
) {
  if (!userId) {
    throw new Error("معرّف العضو غير موجود");
  }

  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, {
    ...data,
    lastUpdated: new Date().toISOString(),
  });
}