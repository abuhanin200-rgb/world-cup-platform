import { addDoc, collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";

export type AdminLogAction =
  | "add_match"
  | "calculate_match"
  | "undo_match_calculation"
  | "update_member"
  | "reset_member_stats"
  | "update_settings"
  | "other";

export type AdminLog = {
  id: string;
  action: AdminLogAction;
  title: string;
  description: string;
  createdAt: string;
};

export type AddAdminLogInput = {
  action: AdminLogAction;
  title: string;
  description: string;
};

function toText(value: unknown) {
  return String(value || "").trim();
}

export async function addAdminLog(input: AddAdminLogInput) {
  const now = new Date().toISOString();

  await addDoc(collection(db, "admin_logs"), {
    action: input.action,
    title: input.title,
    description: input.description,
    createdAt: now,
  });
}

export async function getAdminLogs(maxCount = 30): Promise<AdminLog[]> {
  const logsRef = collection(db, "admin_logs");
  const q = query(logsRef, orderBy("createdAt", "desc"), limit(maxCount));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();

      return {
        id: docSnap.id,
        action: toText(data.action) as AdminLogAction,
        title: toText(data.title),
        description: toText(data.description),
        createdAt: toText(data.createdAt),
      };
    });
}