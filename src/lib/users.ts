import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  signInWithCustomToken,
} from "firebase/auth";
import { auth, db } from "./firebase";

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

  seenNotices?: {
    knockoutRulesV2?: boolean;
    predictionEditWindowV1?: boolean;
    [key: string]: boolean | undefined;
  };

  createdAt?: string;
  updatedAt?: string;
  lastUpdated?: string;
};


async function signInMemberWithCustomToken(customToken: string) {
  const token = String(customToken || "").trim();

  if (!token || token.split(".").length !== 3) {
    throw new Error("تعذر إنشاء جلسة دخول آمنة. أعد المحاولة.");
  }

  const apiKey = String(auth.app.options.apiKey || "").trim();
  if (!apiKey) {
    throw new Error("إعدادات تسجيل الدخول غير مكتملة في النسخة المنشورة.");
  }

  // Safari/WebKit may have trouble with Firebase's IndexedDB-backed default
  // persistence. Prefer localStorage explicitly, then fall back to sessionStorage.
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (localPersistenceError) {
    console.warn(
      "Firebase local persistence unavailable; falling back to session persistence.",
      localPersistenceError,
    );
    try {
      await setPersistence(auth, browserSessionPersistence);
    } catch (sessionPersistenceError) {
      console.warn(
        "Firebase session persistence unavailable; continuing with current persistence.",
        sessionPersistenceError,
      );
    }
  }

  try {
    await signInWithCustomToken(auth, token);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "");
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code || "")
        : "";

    const safariPatternError = /string did not match the expected pattern/i.test(message);

    // One extra attempt with sessionStorage helps iOS Safari when persistence
    // initialization gets into a bad IndexedDB state.
    if (safariPatternError) {
      try {
        await setPersistence(auth, browserSessionPersistence);
        await signInWithCustomToken(auth, token);
        return;
      } catch (retryError) {
        console.error("Firebase Safari auth retry failed:", retryError);
        throw new Error(
          "تعذر بدء جلسة الدخول على Safari. أغلق الصفحة وافتحها من جديد ثم حاول مرة أخرى.",
        );
      }
    }

    if (code === "auth/invalid-custom-token" || code === "auth/custom-token-mismatch") {
      throw new Error("تعذر التحقق من جلسة الحساب. أعد المحاولة.");
    }

    if (code === "auth/network-request-failed") {
      throw new Error("تعذر الاتصال بخدمة تسجيل الدخول. تحقق من الإنترنت وحاول مرة أخرى.");
    }

    const fallbackMessage = /string did not match the expected pattern/i.test(message)
      ? "تعذر بدء جلسة الدخول. حدّث الصفحة ثم حاول مرة أخرى."
      : "تعذر تسجيل الدخول الآن. حاول مرة أخرى.";

    console.error("Firebase member auth failed:", error);
    throw new Error(fallbackMessage);
  }
}

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

export type UserNoticeKey = "knockoutRulesV2" | "predictionEditWindowV1";

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
  const result: NonNullable<AppUser["seenNotices"]> = {};

  Object.keys(notices).forEach((key) => {
    result[key] = Boolean(notices[key]);
  });

  return result;
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

    seenNotices: normalizeSeenNotices(data.seenNotices),

    createdAt: data.createdAt ? String(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
    lastUpdated: data.lastUpdated ? String(data.lastUpdated) : undefined,
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

  if (!fullName) throw new Error("الاسم مطلوب");
  if (fullName.length > 20) throw new Error("الاسم يجب ألا يتجاوز 20 حرفًا");
  if (!phone) throw new Error("رقم الجوال مطلوب");
  if (!password || password.length < 4) {
    throw new Error("كلمة المرور يجب ألا تقل عن 4 أرقام أو أحرف");
  }
  if (!favoriteTeam) throw new Error("اختر المنتخب المرشح");

  let response: Response;
  try {
    response = await fetch("/api/member-auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        phone,
        password,
        favoriteTeam,
        teamEmoji,
      }),
    });
  } catch (error) {
    console.error("Member register request failed:", error);
    throw new Error("تعذر الاتصال بخدمة إنشاء الحساب. حدّث الصفحة وحاول مرة أخرى.");
  }

  const data = (await response.json()) as {
    customToken?: string;
    user?: AppUser;
    error?: string;
  };

  if (!response.ok || !data.customToken || !data.user) {
    throw new Error(data.error || "تعذر إنشاء الحساب");
  }

  await signInMemberWithCustomToken(data.customToken);
  return data.user;
}

export async function loginUser(input: LoginUserInput): Promise<AppUser> {
  const fullName = cleanText(input.fullName);
  const password = cleanText(input.password);

  if (!fullName || !password) {
    throw new Error("أدخل الاسم وكلمة المرور");
  }

  let response: Response;
  try {
    response = await fetch("/api/member-auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, password }),
    });
  } catch (error) {
    console.error("Member login request failed:", error);
    throw new Error("تعذر الاتصال بخدمة تسجيل الدخول. حدّث الصفحة وحاول مرة أخرى.");
  }

  const data = (await response.json()) as {
    customToken?: string;
    user?: AppUser;
    error?: string;
  };

  if (!response.ok || !data.customToken || !data.user) {
    throw new Error(data.error || "بيانات الدخول غير صحيحة");
  }

  await signInMemberWithCustomToken(data.customToken);
  return data.user;
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

  if (!userId) throw new Error("معرّف العضو غير موجود");
  if (!newPassword || newPassword.length < 4) {
    throw new Error("كلمة المرور الجديدة يجب ألا تقل عن 4 أرقام أو أحرف");
  }
  if (newPassword !== confirmPassword) {
    throw new Error("كلمة المرور وتأكيدها غير متطابقين");
  }
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error("أعد تسجيل الدخول مرة واحدة قبل تغيير كلمة المرور");
  }

  const token = await auth.currentUser.getIdToken();
  const response = await fetch("/api/member-auth/password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ newPassword }),
  });
  const data = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "تعذر تغيير كلمة المرور");
  }

  const updatedUser = await getUserById(userId);
  if (!updatedUser) throw new Error("تعذر تحميل بيانات العضو بعد تغيير كلمة المرور");
  return updatedUser;
}

export async function markUserNoticeSeen(
  userId: string,
  noticeKey: UserNoticeKey
): Promise<AppUser> {
  const cleanUserId = cleanText(userId);

  if (!cleanUserId) {
    throw new Error("معرّف العضو غير موجود");
  }

  const now = new Date().toISOString();
  const userRef = doc(db, "users", cleanUserId);

  await updateDoc(userRef, {
    [`seenNotices.${noticeKey}`]: true,
    updatedAt: now,
  });

  const updatedUser = await getUserById(cleanUserId);

  if (!updatedUser) {
    throw new Error("تعذر تحميل بيانات العضو بعد تحديث الإشعار");
  }

  return updatedUser;
}
