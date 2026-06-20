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
import type { OnlinePresence, PresenceActivity, PresencePage } from "@/types/presence";

const presenceCollection = "onlinePresence";
const ONLINE_WINDOW_MS = 60 * 1000;

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

  const data: OnlinePresence = {
    userId: params.userId,
    fullName: params.fullName,
    currentPage,
    activity,
    path: params.path,
    lastSeen: Date.now(),
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