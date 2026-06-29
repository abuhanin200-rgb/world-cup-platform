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
  PresencePage,
} from "@/types/presence";

const presenceCollection = "onlinePresence";
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

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
  if (path === "/") {
    return {
      currentPage: "home",
      activity: "يشاهد الصفحة الرئيسية",
    };
  }

  if (path.startsWith("/challenge-studio")) {
    return {
      currentPage: "challengeStudio",
      activity: "يشاهد استوديو التحدي",
    };
  }

  if (path.startsWith("/account")) {
    return {
      currentPage: "account",
      activity: "يشاهد حسابه",
    };
  }

  if (path.startsWith("/word-game")) {
    return {
      currentPage: "wordGame",
      activity: "يلعب خمن كلمة اليوم",
    };
  }

  if (path.startsWith("/admin")) {
    return {
      currentPage: "admin",
      activity: "داخل لوحة الأدمن",
    };
  }

  if (path.startsWith("/login")) {
    return {
      currentPage: "login",
      activity: "في صفحة الدخول",
    };
  }

  if (path.startsWith("/register")) {
    return {
      currentPage: "register",
      activity: "في صفحة التسجيل",
    };
  }

  if (path.startsWith("/rules")) {
    return {
      currentPage: "rules",
      activity: "يشاهد القوانين",
    };
  }

  return {
    currentPage: "unknown",
    activity: "يتصفح الموقع",
  };
}

export async function updateOnlinePresence(params: {
  userId: string;
  fullName: string;
  path: string;
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
  ...(currentPage === "challengeStudio"
    ? { lastChallengeStudioVisit: now }
    : {}),
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
  const since = Date.now() - ONLINE_WINDOW_MS;

  const onlineQuery = query(
    collection(db, presenceCollection),
    where("lastSeen", ">=", since)
  );

  const snapshot = await getDocs(onlineQuery);

  return snapshot.docs
    .map((item) => item.data() as OnlinePresence)
    .sort((a, b) => b.lastSeen - a.lastSeen);
}

export async function getChallengeStudioOnlineViewers(): Promise<
  OnlinePresence[]
> {
  const since = Date.now() - ONLINE_WINDOW_MS;

  const snapshot = await getDocs(collection(db, presenceCollection));

  return snapshot.docs
    .map((item) => item.data() as OnlinePresence)
    .filter(
      (member) =>
        member.currentPage === "challengeStudio" &&
        member.lastSeen >= since
    )
    .sort((a, b) => b.lastSeen - a.lastSeen);
}

export async function getChallengeStudioTodayVisitors(): Promise<
  OnlinePresence[]
> {
  const todayStart = getTodayStartInMakkahTime();

  const snapshot = await getDocs(collection(db, presenceCollection));

  return snapshot.docs
    .map((item) => item.data() as OnlinePresence)
    .filter((member) => (member.lastChallengeStudioVisit ?? 0) >= todayStart)
    .sort(
      (a, b) =>
        (b.lastChallengeStudioVisit ?? 0) -
        (a.lastChallengeStudioVisit ?? 0)
    );
}