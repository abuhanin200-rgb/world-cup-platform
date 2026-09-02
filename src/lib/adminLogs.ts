import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { auth, db } from "./firebase";

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
  metadata?: Record<string, unknown>;
  createdAt: string;
  createdAtServer?: unknown;
};

export type AddAdminLogInput = {
  action: AdminLogAction;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
};

function normalizeAction(value: unknown): AdminLogAction {
  if (
    value === "add_match" ||
    value === "calculate_match" ||
    value === "undo_match_calculation" ||
    value === "update_member" ||
    value === "reset_member_stats" ||
    value === "update_settings" ||
    value === "other"
  ) {
    return value;
  }

  return "other";
}

function toText(value: unknown) {
  return String(value || "").trim();
}

export async function addAdminLog(input: AddAdminLogInput) {
  const user = auth.currentUser;
  if (!user) throw new Error("انتهت جلسة الإدارة");
  const token = await user.getIdToken();
  const response = await fetch("/api/admin/logs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || "تعذر حفظ سجل الإدارة");
  }
}

export async function getAdminLogs(maxCount = 50): Promise<AdminLog[]> {
  const logsRef = collection(db, "admin_logs");
  const q = query(logsRef, orderBy("createdAt", "desc"), limit(maxCount));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();

      return {
        id: docSnap.id,
        action: normalizeAction(data.action),
        title: toText(data.title),
        description: toText(data.description),
        metadata: (data.metadata || {}) as Record<string, unknown>,
        createdAt: toText(data.createdAt),
        createdAtServer: data.createdAtServer,
      };
    });
}
