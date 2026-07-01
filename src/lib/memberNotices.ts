import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export type MemberNoticeType =
  | "update"
  | "alert"
  | "announcement"
  | "contest"
  | "congrats"
  | "general";

export type MemberNoticeDisplayMode = "modal" | "banner" | "card";

export type MemberNoticeRepeatMode =
  | "once"
  | "everyLogin"
  | "daily"
  | "every6Hours";

export type MemberNoticeButton = {
  text: string;
  url: string;
};

export type MemberNoticeStats = {
  views: number;
  closes: number;
  primaryClicks: number;
  secondaryClicks: number;
};

export type MemberNotice = {
  id: string;

  title: string;
  shortDescription: string;
  body: string;

  type: MemberNoticeType;
  displayMode: MemberNoticeDisplayMode;

  imageUrl: string;

  primaryButtonText: string;
  primaryButtonUrl: string;

  secondaryButtonText: string;
  secondaryButtonUrl: string;

  isActive: boolean;
  isArchived: boolean;
  isDismissible: boolean;

  priority: number;

  startAt: string;
  endAt: string;

  repeatMode: MemberNoticeRepeatMode;

  stats: MemberNoticeStats;

  createdAt: string;
  updatedAt: string;
};

export type MemberNoticeView = {
  id: string;
  noticeId: string;
  userId: string;

  hasSeen: boolean;
  hasClosed: boolean;

  shownCount: number;
  closedCount: number;

  lastShownAt: string;
  lastClosedAt: string;

  primaryClickedAt: string;
  secondaryClickedAt: string;

  createdAt: string;
  updatedAt: string;
};

export type CreateMemberNoticeInput = {
  title: string;
  shortDescription: string;
  body: string;

  type: MemberNoticeType;
  displayMode: MemberNoticeDisplayMode;

  imageUrl?: string;

  primaryButtonText?: string;
  primaryButtonUrl?: string;

  secondaryButtonText?: string;
  secondaryButtonUrl?: string;

  isActive: boolean;
  isDismissible: boolean;

  priority: number;

  startAt: string;
  endAt: string;

  repeatMode: MemberNoticeRepeatMode;
};

export type UpdateMemberNoticeInput = CreateMemberNoticeInput & {
  id: string;
  isArchived: boolean;
};

const MEMBER_NOTICES_COLLECTION = "memberNotices";
const MEMBER_NOTICE_VIEWS_COLLECTION = "memberNoticeViews";

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toBoolean(value: unknown) {
  return Boolean(value);
}

function normalizeNoticeType(value: unknown): MemberNoticeType {
  if (
    value === "update" ||
    value === "alert" ||
    value === "announcement" ||
    value === "contest" ||
    value === "congrats" ||
    value === "general"
  ) {
    return value;
  }

  return "general";
}

function normalizeDisplayMode(value: unknown): MemberNoticeDisplayMode {
  if (value === "modal" || value === "banner" || value === "card") {
    return value;
  }

  return "modal";
}

function normalizeRepeatMode(value: unknown): MemberNoticeRepeatMode {
  if (
    value === "once" ||
    value === "everyLogin" ||
    value === "daily" ||
    value === "every6Hours"
  ) {
    return value;
  }

  return "once";
}

function normalizeStats(value: unknown): MemberNoticeStats {
  if (!value || typeof value !== "object") {
    return {
      views: 0,
      closes: 0,
      primaryClicks: 0,
      secondaryClicks: 0,
    };
  }

  const stats = value as Record<string, unknown>;

  return {
    views: toNumber(stats.views),
    closes: toNumber(stats.closes),
    primaryClicks: toNumber(stats.primaryClicks),
    secondaryClicks: toNumber(stats.secondaryClicks),
  };
}

function mapNoticeDoc(id: string, data: Record<string, unknown>): MemberNotice {
  return {
    id,

    title: cleanText(data.title),
    shortDescription: cleanText(data.shortDescription),
    body: cleanText(data.body),

    type: normalizeNoticeType(data.type),
    displayMode: normalizeDisplayMode(data.displayMode),

    imageUrl: cleanText(data.imageUrl),

    primaryButtonText: cleanText(data.primaryButtonText),
    primaryButtonUrl: cleanText(data.primaryButtonUrl),

    secondaryButtonText: cleanText(data.secondaryButtonText),
    secondaryButtonUrl: cleanText(data.secondaryButtonUrl),

    isActive: toBoolean(data.isActive),
    isArchived: toBoolean(data.isArchived),
    isDismissible: toBoolean(data.isDismissible),

    priority: toNumber(data.priority),

    startAt: cleanText(data.startAt),
    endAt: cleanText(data.endAt),

    repeatMode: normalizeRepeatMode(data.repeatMode),

    stats: normalizeStats(data.stats),

    createdAt: cleanText(data.createdAt),
    updatedAt: cleanText(data.updatedAt),
  };
}

function mapNoticeViewDoc(
  id: string,
  data: Record<string, unknown>
): MemberNoticeView {
  return {
    id,
    noticeId: cleanText(data.noticeId),
    userId: cleanText(data.userId),

    hasSeen: toBoolean(data.hasSeen),
    hasClosed: toBoolean(data.hasClosed),

    shownCount: toNumber(data.shownCount),
    closedCount: toNumber(data.closedCount),

    lastShownAt: cleanText(data.lastShownAt),
    lastClosedAt: cleanText(data.lastClosedAt),

    primaryClickedAt: cleanText(data.primaryClickedAt),
    secondaryClickedAt: cleanText(data.secondaryClickedAt),

    createdAt: cleanText(data.createdAt),
    updatedAt: cleanText(data.updatedAt),
  };
}

function getNoticeViewId(noticeId: string, userId: string) {
  return `${noticeId}_${userId}`;
}

function getTimeValue(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function isNoticeInsideDateRange(notice: MemberNotice) {
  const now = Date.now();

  const startTime = getTimeValue(notice.startAt);
  const endTime = getTimeValue(notice.endAt);

  if (startTime && now < startTime) {
    return false;
  }

  if (endTime && now > endTime) {
    return false;
  }

  return true;
}

function isSameSaudiDate(firstIso: string, secondDate: Date) {
  if (!firstIso) return false;

  const first = new Date(firstIso);

  if (!Number.isFinite(first.getTime())) return false;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(first) === formatter.format(secondDate);
}

function shouldShowByRepeatMode(
  notice: MemberNotice,
  view: MemberNoticeView | null
) {
  if (!view) return true;

  if (notice.repeatMode === "everyLogin") {
    return true;
  }

  if (notice.repeatMode === "once") {
    return !view.hasSeen && !view.hasClosed;
  }

  if (notice.repeatMode === "daily") {
    return !isSameSaudiDate(view.lastShownAt, new Date());
  }

  if (notice.repeatMode === "every6Hours") {
    const lastShownTime = getTimeValue(view.lastShownAt);

    if (!lastShownTime) return true;

    const sixHours = 6 * 60 * 60 * 1000;

    return Date.now() - lastShownTime >= sixHours;
  }

  return false;
}

export function getMemberNoticeTypeLabel(type: MemberNoticeType) {
  const labels: Record<MemberNoticeType, string> = {
    update: "تحديث",
    alert: "تنبيه",
    announcement: "إعلان",
    contest: "مسابقة",
    congrats: "تهنئة",
    general: "عام",
  };

  return labels[type];
}

export function getMemberNoticeDisplayModeLabel(
  displayMode: MemberNoticeDisplayMode
) {
  const labels: Record<MemberNoticeDisplayMode, string> = {
    modal: "نافذة منبثقة",
    banner: "بانر أعلى الصفحة",
    card: "بطاقة داخل الصفحة",
  };

  return labels[displayMode];
}

export function getMemberNoticeRepeatModeLabel(
  repeatMode: MemberNoticeRepeatMode
) {
  const labels: Record<MemberNoticeRepeatMode, string> = {
    once: "مرة واحدة فقط",
    everyLogin: "كل دخول",
    daily: "مرة يوميًا",
    every6Hours: "كل 6 ساعات",
  };

  return labels[repeatMode];
}

export async function getAllMemberNotices(): Promise<MemberNotice[]> {
  const snapshot = await getDocs(collection(db, MEMBER_NOTICES_COLLECTION));

  return snapshot.docs
    .map((docSnap) => mapNoticeDoc(docSnap.id, docSnap.data()))
    .sort((a, b) => {
      if (a.isArchived !== b.isArchived) {
        return a.isArchived ? 1 : -1;
      }

      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      return getTimeValue(b.createdAt) - getTimeValue(a.createdAt);
    });
}

export async function getVisibleMemberNoticesForUser(
  userId: string
): Promise<MemberNotice[]> {
  const cleanUserId = cleanText(userId);

  if (!cleanUserId) return [];

  const noticesQuery = query(
    collection(db, MEMBER_NOTICES_COLLECTION),
    where("isActive", "==", true),
    where("isArchived", "==", false)
  );

  const snapshot = await getDocs(noticesQuery);

  const activeNotices = snapshot.docs
    .map((docSnap) => mapNoticeDoc(docSnap.id, docSnap.data()))
    .filter(isNoticeInsideDateRange)
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      return getTimeValue(b.createdAt) - getTimeValue(a.createdAt);
    });

  const result: MemberNotice[] = [];

  for (const notice of activeNotices) {
    const view = await getMemberNoticeView(notice.id, cleanUserId);

    if (shouldShowByRepeatMode(notice, view)) {
      result.push(notice);
    }
  }

  return result;
}

export async function getMemberNoticeView(
  noticeId: string,
  userId: string
): Promise<MemberNoticeView | null> {
  const cleanNoticeId = cleanText(noticeId);
  const cleanUserId = cleanText(userId);

  if (!cleanNoticeId || !cleanUserId) return null;

  const viewId = getNoticeViewId(cleanNoticeId, cleanUserId);
  const viewRef = doc(db, MEMBER_NOTICE_VIEWS_COLLECTION, viewId);
  const viewSnap = await getDoc(viewRef);

  if (!viewSnap.exists()) return null;

  return mapNoticeViewDoc(viewSnap.id, viewSnap.data());
}

export async function createMemberNotice(
  input: CreateMemberNoticeInput
): Promise<MemberNotice> {
  const now = new Date().toISOString();

  const data = {
    title: cleanText(input.title),
    shortDescription: cleanText(input.shortDescription),
    body: cleanText(input.body),

    type: input.type,
    displayMode: input.displayMode,

    imageUrl: cleanText(input.imageUrl),

    primaryButtonText: cleanText(input.primaryButtonText),
    primaryButtonUrl: cleanText(input.primaryButtonUrl),

    secondaryButtonText: cleanText(input.secondaryButtonText),
    secondaryButtonUrl: cleanText(input.secondaryButtonUrl),

    isActive: input.isActive,
    isArchived: false,
    isDismissible: input.isDismissible,

    priority: toNumber(input.priority),

    startAt: cleanText(input.startAt),
    endAt: cleanText(input.endAt),

    repeatMode: input.repeatMode,

    stats: {
      views: 0,
      closes: 0,
      primaryClicks: 0,
      secondaryClicks: 0,
    },

    createdAt: now,
    updatedAt: now,
  };

  validateNoticeData(data);

  const noticeRef = await addDoc(collection(db, MEMBER_NOTICES_COLLECTION), data);

  return {
    id: noticeRef.id,
    ...data,
  };
}

export async function updateMemberNotice(
  input: UpdateMemberNoticeInput
): Promise<MemberNotice> {
  const cleanId = cleanText(input.id);

  if (!cleanId) {
    throw new Error("معرّف الإشعار غير موجود");
  }

  const noticeRef = doc(db, MEMBER_NOTICES_COLLECTION, cleanId);
  const currentSnap = await getDoc(noticeRef);

  if (!currentSnap.exists()) {
    throw new Error("الإشعار غير موجود");
  }

  const currentNotice = mapNoticeDoc(currentSnap.id, currentSnap.data());

  const now = new Date().toISOString();

  const data = {
    title: cleanText(input.title),
    shortDescription: cleanText(input.shortDescription),
    body: cleanText(input.body),

    type: input.type,
    displayMode: input.displayMode,

    imageUrl: cleanText(input.imageUrl),

    primaryButtonText: cleanText(input.primaryButtonText),
    primaryButtonUrl: cleanText(input.primaryButtonUrl),

    secondaryButtonText: cleanText(input.secondaryButtonText),
    secondaryButtonUrl: cleanText(input.secondaryButtonUrl),

    isActive: input.isActive,
    isArchived: input.isArchived,
    isDismissible: input.isDismissible,

    priority: toNumber(input.priority),

    startAt: cleanText(input.startAt),
    endAt: cleanText(input.endAt),

    repeatMode: input.repeatMode,

    stats: currentNotice.stats,

    createdAt: currentNotice.createdAt,
    updatedAt: now,
  };

  validateNoticeData(data);

  await updateDoc(noticeRef, data);

  return {
    id: cleanId,
    ...data,
  };
}

export async function archiveMemberNotice(
  noticeId: string,
  isArchived: boolean
) {
  const cleanNoticeId = cleanText(noticeId);

  if (!cleanNoticeId) {
    throw new Error("معرّف الإشعار غير موجود");
  }

  const noticeRef = doc(db, MEMBER_NOTICES_COLLECTION, cleanNoticeId);

  await updateDoc(noticeRef, {
    isArchived,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteMemberNotice(noticeId: string) {
  const cleanNoticeId = cleanText(noticeId);

  if (!cleanNoticeId) {
    throw new Error("معرّف الإشعار غير موجود");
  }

  await deleteDoc(doc(db, MEMBER_NOTICES_COLLECTION, cleanNoticeId));
}

export async function markMemberNoticeShown(
  noticeId: string,
  userId: string
): Promise<void> {
  const cleanNoticeId = cleanText(noticeId);
  const cleanUserId = cleanText(userId);

  if (!cleanNoticeId || !cleanUserId) return;

  const now = new Date().toISOString();
  const viewId = getNoticeViewId(cleanNoticeId, cleanUserId);
  const viewRef = doc(db, MEMBER_NOTICE_VIEWS_COLLECTION, viewId);

  const viewSnap = await getDoc(viewRef);

  if (viewSnap.exists()) {
    await updateDoc(viewRef, {
      hasSeen: true,
      shownCount: increment(1),
      lastShownAt: now,
      updatedAt: now,
    });
  } else {
    await setDoc(viewRef, {
      noticeId: cleanNoticeId,
      userId: cleanUserId,

      hasSeen: true,
      hasClosed: false,

      shownCount: 1,
      closedCount: 0,

      lastShownAt: now,
      lastClosedAt: "",

      primaryClickedAt: "",
      secondaryClickedAt: "",

      createdAt: now,
      updatedAt: now,
    });
  }

  await updateMemberNoticeStats(cleanNoticeId, "views");
}

export async function markMemberNoticeClosed(
  noticeId: string,
  userId: string
): Promise<void> {
  const cleanNoticeId = cleanText(noticeId);
  const cleanUserId = cleanText(userId);

  if (!cleanNoticeId || !cleanUserId) return;

  const now = new Date().toISOString();
  const viewId = getNoticeViewId(cleanNoticeId, cleanUserId);
  const viewRef = doc(db, MEMBER_NOTICE_VIEWS_COLLECTION, viewId);

  const viewSnap = await getDoc(viewRef);

  if (viewSnap.exists()) {
    await updateDoc(viewRef, {
      hasClosed: true,
      closedCount: increment(1),
      lastClosedAt: now,
      updatedAt: now,
    });
  } else {
    await setDoc(viewRef, {
      noticeId: cleanNoticeId,
      userId: cleanUserId,

      hasSeen: true,
      hasClosed: true,

      shownCount: 1,
      closedCount: 1,

      lastShownAt: now,
      lastClosedAt: now,

      primaryClickedAt: "",
      secondaryClickedAt: "",

      createdAt: now,
      updatedAt: now,
    });
  }

  await updateMemberNoticeStats(cleanNoticeId, "closes");
}

export async function markMemberNoticePrimaryClicked(
  noticeId: string,
  userId: string
): Promise<void> {
  await markMemberNoticeButtonClicked(noticeId, userId, "primary");
}

export async function markMemberNoticeSecondaryClicked(
  noticeId: string,
  userId: string
): Promise<void> {
  await markMemberNoticeButtonClicked(noticeId, userId, "secondary");
}

async function markMemberNoticeButtonClicked(
  noticeId: string,
  userId: string,
  buttonType: "primary" | "secondary"
): Promise<void> {
  const cleanNoticeId = cleanText(noticeId);
  const cleanUserId = cleanText(userId);

  if (!cleanNoticeId || !cleanUserId) return;

  const now = new Date().toISOString();
  const viewId = getNoticeViewId(cleanNoticeId, cleanUserId);
  const viewRef = doc(db, MEMBER_NOTICE_VIEWS_COLLECTION, viewId);

  const fieldName =
    buttonType === "primary" ? "primaryClickedAt" : "secondaryClickedAt";

  const viewSnap = await getDoc(viewRef);

  if (viewSnap.exists()) {
    await updateDoc(viewRef, {
      [fieldName]: now,
      updatedAt: now,
    });
  } else {
    await setDoc(viewRef, {
      noticeId: cleanNoticeId,
      userId: cleanUserId,

      hasSeen: true,
      hasClosed: false,

      shownCount: 1,
      closedCount: 0,

      lastShownAt: now,
      lastClosedAt: "",

      primaryClickedAt: buttonType === "primary" ? now : "",
      secondaryClickedAt: buttonType === "secondary" ? now : "",

      createdAt: now,
      updatedAt: now,
    });
  }

  await updateMemberNoticeStats(
    cleanNoticeId,
    buttonType === "primary" ? "primaryClicks" : "secondaryClicks"
  );
}

async function updateMemberNoticeStats(
  noticeId: string,
  statKey: keyof MemberNoticeStats
) {
  const noticeRef = doc(db, MEMBER_NOTICES_COLLECTION, noticeId);

  await updateDoc(noticeRef, {
    [`stats.${statKey}`]: increment(1),
    updatedAt: new Date().toISOString(),
  });
}

function validateNoticeData(data: {
  title: string;
  shortDescription: string;
  body: string;
  type: MemberNoticeType;
  displayMode: MemberNoticeDisplayMode;
  imageUrl: string;
  primaryButtonText: string;
  primaryButtonUrl: string;
  secondaryButtonText: string;
  secondaryButtonUrl: string;
  isActive: boolean;
  isArchived: boolean;
  isDismissible: boolean;
  priority: number;
  startAt: string;
  endAt: string;
  repeatMode: MemberNoticeRepeatMode;
}) {
  if (!data.title) {
    throw new Error("عنوان الإشعار مطلوب");
  }

  if (data.title.length > 80) {
    throw new Error("عنوان الإشعار يجب ألا يتجاوز 80 حرفًا");
  }

  if (!data.shortDescription) {
    throw new Error("الوصف المختصر مطلوب");
  }

  if (data.shortDescription.length > 180) {
    throw new Error("الوصف المختصر يجب ألا يتجاوز 180 حرفًا");
  }

  if (!data.body) {
    throw new Error("النص الكامل مطلوب");
  }

  if (data.body.length > 1500) {
    throw new Error("النص الكامل يجب ألا يتجاوز 1500 حرف");
  }

  if (!data.startAt) {
    throw new Error("تاريخ البداية مطلوب");
  }

  if (!data.endAt) {
    throw new Error("تاريخ النهاية مطلوب");
  }

  const startTime = getTimeValue(data.startAt);
  const endTime = getTimeValue(data.endAt);

  if (!startTime || !endTime) {
    throw new Error("تاريخ البداية أو النهاية غير صحيح");
  }

  if (endTime <= startTime) {
    throw new Error("تاريخ النهاية يجب أن يكون بعد تاريخ البداية");
  }

  if (data.priority < 0 || data.priority > 999) {
    throw new Error("الأولوية يجب أن تكون بين 0 و 999");
  }

  if (data.primaryButtonText && !data.primaryButtonUrl) {
    throw new Error("أدخل رابط الزر الرئيسي");
  }

  if (data.primaryButtonUrl && !data.primaryButtonText) {
    throw new Error("أدخل نص الزر الرئيسي");
  }

  if (data.secondaryButtonText && !data.secondaryButtonUrl) {
    throw new Error("أدخل رابط الزر الثانوي");
  }

  if (data.secondaryButtonUrl && !data.secondaryButtonText) {
    throw new Error("أدخل نص الزر الثانوي");
  }
}