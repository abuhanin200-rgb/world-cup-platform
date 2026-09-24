import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type {
  OnlinePresence,
  PresenceActivity,
  PresenceDeviceInfo,
  PresencePage,
} from "@/types/presence";

const presenceCollection = "onlinePresence";
export const PRESENCE_ONLINE_WINDOW_MS = 2.5 * 60 * 1000;

const TOURNAMENT_NAMES: Record<string, string> = {
  "gulf-cup-27": "خليجي الديار العربية 27",
  "world-cup-2026": "كأس العالم 2026",
  "asian-cup-2027": "كأس آسيا 2027",
};

const TOURNAMENT_SECTION_NAMES: Record<string, string> = {
  matches: "المباريات",
  predictions: "توقعاتي",
  leaderboard: "الترتيب",
  studio: "الاستوديو",
  rules: "القوانين",
};

function stripQueryAndHash(path: string) {
  return (path || "/").split(/[?#]/)[0] || "/";
}

export function getPresencePageLabel(path: string): string {
  const cleanPath = stripQueryAndHash(path);

  if (cleanPath === "/") return "الرئيسية";
  if (cleanPath === "/tournaments") return "البطولات";

  const tournamentMatch = cleanPath.match(/^\/tournaments\/([^/]+)(?:\/([^/]+))?/);
  if (tournamentMatch) {
    const [, slug, section] = tournamentMatch;
    const tournamentName = TOURNAMENT_NAMES[slug] || "صفحة بطولة";
    if (!section) return `${tournamentName} - نظرة عامة`;
    return `${tournamentName} - ${TOURNAMENT_SECTION_NAMES[section] || "تفاصيل البطولة"}`;
  }

  if (cleanPath.startsWith("/matches")) return "المباريات";
  if (cleanPath.startsWith("/results")) return "النتائج";
  if (cleanPath.startsWith("/games")) return "الألعاب";
  if (cleanPath.startsWith("/challenge-studio")) return "استوديو التحدي";
  if (cleanPath.startsWith("/word-game")) return "خمن كلمة اليوم";
  if (cleanPath.startsWith("/vocabulary-challenge/profile")) return "ملف تحدي المفردات";
  if (cleanPath.startsWith("/vocabulary-challenge")) return "تحدي المفردات";
  if (cleanPath.startsWith("/flag-memory")) return "تحدي الأعلام";
  if (cleanPath.startsWith("/ten-seconds-challenge")) return "تحدي العشر ثواني";
  if (cleanPath.startsWith("/majlis")) return "مجلس التحدي";
  if (cleanPath.startsWith("/account")) return "حسابي";
  if (cleanPath.startsWith("/profile")) return "الملف الشخصي";
  if (cleanPath.startsWith("/members/")) return "ملف عضو";
  if (cleanPath.startsWith("/rules")) return "القوانين";
  if (cleanPath.startsWith("/login")) return "تسجيل الدخول";
  if (cleanPath.startsWith("/register")) return "إنشاء حساب";
  if (cleanPath.startsWith("/admin")) return "لوحة التحكم";
  if (cleanPath.startsWith("/test-")) return "صفحة اختبار";

  return "يتصفح المنصة";
}

function getTodayStartInMakkahTime() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const today = formatter.format(new Date());
  return new Date(`${today}T00:00:00+03:00`).getTime();
}

export function getPresenceInfoFromPath(path: string): {
  currentPage: PresencePage;
  activity: PresenceActivity;
} {
  const cleanPath = stripQueryAndHash(path);
  const label = getPresencePageLabel(cleanPath);

  if (cleanPath === "/") return { currentPage: "home", activity: "يشاهد الصفحة الرئيسية" };
  if (cleanPath === "/tournaments") return { currentPage: "tournaments", activity: "يتصفح البطولات" };
  if (cleanPath.startsWith("/tournaments/")) return { currentPage: "tournament", activity: `يتصفح ${label}` };
  if (cleanPath.startsWith("/matches")) return { currentPage: "matches", activity: "يتصفح المباريات" };
  if (cleanPath.startsWith("/results")) return { currentPage: "results", activity: "يتصفح النتائج" };
  if (cleanPath.startsWith("/games")) return { currentPage: "games", activity: "يتصفح الألعاب" };
  if (cleanPath.startsWith("/challenge-studio")) return { currentPage: "challengeStudio", activity: "يشاهد استوديو التحدي" };
  if (cleanPath.startsWith("/account")) return { currentPage: "account", activity: "يشاهد حسابه" };
  if (cleanPath.startsWith("/profile")) return { currentPage: "profile", activity: "يشاهد ملفه الشخصي" };
  if (cleanPath.startsWith("/members/")) return { currentPage: "memberProfile", activity: "يشاهد ملف عضو" };
  if (cleanPath.startsWith("/word-game")) return { currentPage: "wordGame", activity: "يلعب خمن كلمة اليوم" };
  if (cleanPath.startsWith("/vocabulary-challenge")) return { currentPage: "vocabularyChallenge", activity: "يلعب تحدي المفردات" };
  if (cleanPath.startsWith("/flag-memory")) return { currentPage: "flagMemory", activity: "يلعب تحدي الأعلام" };
  if (cleanPath.startsWith("/ten-seconds-challenge")) return { currentPage: "tenSecondsChallenge", activity: "يلعب تحدي العشر ثواني" };
  if (cleanPath.startsWith("/majlis")) return { currentPage: "majlis", activity: "داخل مجلس التحدي" };
  if (cleanPath.startsWith("/admin")) return { currentPage: "admin", activity: "داخل لوحة التحكم" };
  if (cleanPath.startsWith("/login")) return { currentPage: "login", activity: "في صفحة الدخول" };
  if (cleanPath.startsWith("/register")) return { currentPage: "register", activity: "في صفحة التسجيل" };
  if (cleanPath.startsWith("/rules")) return { currentPage: "rules", activity: "يشاهد القوانين" };

  return { currentPage: "unknown", activity: `يتصفح ${label}` };
}

export async function updateOnlinePresence(params: {
  userId: string;
  fullName: string;
  path: string;
  device?: PresenceDeviceInfo;
  sessionStartedAt?: number;
}) {
  const { currentPage, activity } = getPresenceInfoFromPath(params.path);
  const presenceRef = doc(db, presenceCollection, params.userId);
  const now = Date.now();

  const data: OnlinePresence = {
    userId: params.userId,
    fullName: params.fullName,
    currentPage,
    activity,
    path: params.path,
    lastSeen: now,
    ...(params.sessionStartedAt ? { sessionStartedAt: params.sessionStartedAt } : {}),
    ...(params.device
      ? {
          deviceType: params.device.deviceType,
          deviceLabel: params.device.deviceLabel,
          browserName: params.device.browserName,
          osName: params.device.osName,
          ...(typeof params.device.batteryLevelPct === "number" ? { batteryLevelPct: params.device.batteryLevelPct } : {}),
          ...(typeof params.device.batteryCharging === "boolean" ? { batteryCharging: params.device.batteryCharging } : {}),
          ...(params.device.networkType ? { networkType: params.device.networkType } : {}),
          ...(params.device.effectiveConnectionType ? { effectiveConnectionType: params.device.effectiveConnectionType } : {}),
          ...(typeof params.device.downlinkMbps === "number" ? { downlinkMbps: params.device.downlinkMbps } : {}),
          ...(typeof params.device.saveData === "boolean" ? { saveData: params.device.saveData } : {}),
        }
      : {}),
    ...(currentPage === "challengeStudio" ? { lastChallengeStudioVisit: now } : {}),
  };

  await setDoc(
    presenceRef,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getOnlineMembers(): Promise<OnlinePresence[]> {
  const since = Date.now() - PRESENCE_ONLINE_WINDOW_MS;
  const onlineQuery = query(collection(db, presenceCollection), where("lastSeen", ">=", since));
  const snapshot = await getDocs(onlineQuery);

  return snapshot.docs
    .map((item) => item.data() as OnlinePresence)
    .sort((a, b) => b.lastSeen - a.lastSeen);
}

export async function getAllPresenceMembers(): Promise<OnlinePresence[]> {
  const snapshot = await getDocs(collection(db, presenceCollection));
  return snapshot.docs
    .map((item) => item.data() as OnlinePresence)
    .filter((member) => Boolean(member.userId) && Number.isFinite(member.lastSeen))
    .sort((a, b) => b.lastSeen - a.lastSeen);
}

export async function getChallengeStudioOnlineViewers(): Promise<OnlinePresence[]> {
  const since = Date.now() - PRESENCE_ONLINE_WINDOW_MS;
  const snapshot = await getDocs(collection(db, presenceCollection));

  return snapshot.docs
    .map((item) => item.data() as OnlinePresence)
    .filter((member) => member.currentPage === "challengeStudio" && member.lastSeen >= since)
    .sort((a, b) => b.lastSeen - a.lastSeen);
}

export async function getChallengeStudioTodayVisitors(): Promise<OnlinePresence[]> {
  const todayStart = getTodayStartInMakkahTime();
  const snapshot = await getDocs(collection(db, presenceCollection));

  return snapshot.docs
    .map((item) => item.data() as OnlinePresence)
    .filter((member) => (member.lastChallengeStudioVisit ?? 0) >= todayStart)
    .sort((a, b) => (b.lastChallengeStudioVisit ?? 0) - (a.lastChallengeStudioVisit ?? 0));
}
