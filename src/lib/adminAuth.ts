import { doc, getDoc } from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth, db } from "./firebase";

type AdminAccessResult = {
  unlocked: boolean;
  loading: boolean;
  user: User | null;
};

async function isFirebaseUserAdmin(user: User | null) {
  if (!user) return false;

  const adminRef = doc(db, "admins", user.uid);
  const adminSnap = await getDoc(adminRef);

  if (!adminSnap.exists()) return false;

  const data = adminSnap.data();

  return data.role === "admin" && data.enabled === true;
}

export function listenAdminAccess(
  callback: (result: AdminAccessResult) => void
) {
  callback({
    unlocked: false,
    loading: true,
    user: null,
  });

  return onAuthStateChanged(auth, async (user) => {
    try {
      const isAdmin = await isFirebaseUserAdmin(user);

      callback({
        unlocked: isAdmin,
        loading: false,
        user: isAdmin ? user : null,
      });

      if (user && !isAdmin) {
        await signOut(auth);
      }
    } catch (error) {
      console.error("Admin access check error:", error);

      callback({
        unlocked: false,
        loading: false,
        user: null,
      });

      await signOut(auth);
    }
  });
}

export async function unlockAdmin(email: string, password: string) {
  const cleanEmail = email.trim();
  const cleanPassword = password.trim();

  if (!cleanEmail || !cleanPassword) {
    throw new Error("أدخل إيميل الأدمن وكلمة المرور");
  }

  const credential = await signInWithEmailAndPassword(
    auth,
    cleanEmail,
    cleanPassword
  );

  const isAdmin = await isFirebaseUserAdmin(credential.user);

  if (!isAdmin) {
    await signOut(auth);
    throw new Error("هذا الحساب لا يملك صلاحية الأدمن");
  }

  return credential.user;
}

export async function lockAdmin() {
  await signOut(auth);
}