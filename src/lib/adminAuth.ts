const ADMIN_USERNAME = "admin";
const ADMIN_PASSCODE = "2026";

const ADMIN_STORAGE_KEY = "worldcup_2026_admin_access";

export function isAdminUnlocked() {
  if (typeof window === "undefined") return false;

  return localStorage.getItem(ADMIN_STORAGE_KEY) === "true";
}

export function unlockAdmin(username: string, passcode: string) {
  if (username.trim() !== ADMIN_USERNAME || passcode.trim() !== ADMIN_PASSCODE) {
    throw new Error("بيانات دخول الأدمن غير صحيحة");
  }

  localStorage.setItem(ADMIN_STORAGE_KEY, "true");
}

export function lockAdmin() {
  localStorage.removeItem(ADMIN_STORAGE_KEY);
}