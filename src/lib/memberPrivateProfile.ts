import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type MemberPrivateProfile = {
  email: string;
  createdAt?: string;
  updatedAt?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  const email = normalizeEmail(value);
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function getMemberPrivateProfile(userId: string): Promise<MemberPrivateProfile | null> {
  const id = userId.trim();
  if (!id || auth.currentUser?.uid !== id) return null;
  const snap = await getDoc(doc(db, "memberPrivateProfiles", id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    email: String(data.email || ""),
    createdAt: data.createdAt ? String(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
  };
}

export async function updateMemberEmail(userId: string, value: string) {
  const id = userId.trim();
  const email = normalizeEmail(value);
  if (!id) throw new Error("معرّف العضو غير موجود");
  if (auth.currentUser?.uid !== id) throw new Error("أعد تسجيل الدخول قبل تعديل البريد الإلكتروني");
  if (!isValidEmail(email)) throw new Error("أدخل بريدًا إلكترونيًا صحيحًا");
  if (email.length > 160) throw new Error("البريد الإلكتروني طويل جدًا");

  const ref = doc(db, "memberPrivateProfiles", id);
  const existing = await getDoc(ref);
  const now = new Date().toISOString();
  await setDoc(
    ref,
    {
      email,
      createdAt: existing.exists() ? String(existing.data().createdAt || now) : now,
      updatedAt: now,
    },
    { merge: true },
  );
  return email;
}
