import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

export type NotificationType =
  | "achievement"
  | "exact_hit"
  | "winner_hit"
  | "rank_up"
  | "rank_down"
  | "leader"
  | "streak"
  | "tournament_announcement"
  | "prediction_open"
  | "prediction_reminder"
  | "match_result"
  | "tournament_rank"
  | "system";

export type UserNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
  tournamentId?: string | null;
  matchId?: string | null;
  route?: string | null;
  dedupeKey?: string | null;
};

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  tournamentId?: string | null;
  matchId?: string | null;
  route?: string | null;
  dedupeKey?: string | null;
};

function toText(value: unknown) {
  return String(value || "").trim();
}

function toBoolean(value: unknown) {
  return Boolean(value);
}

function toNullableText(value: unknown) {
  const result = toText(value);
  return result || null;
}

function mapNotification(
  id: string,
  data: Record<string, unknown>,
): UserNotification {
  return {
    id,
    userId: toText(data.userId),
    type: (toText(data.type) || "system") as NotificationType,
    title: toText(data.title),
    message: toText(data.message),
    isRead: toBoolean(data.isRead),
    createdAt: toText(data.createdAt),
    readAt: toNullableText(data.readAt),
    tournamentId: toNullableText(data.tournamentId),
    matchId: toNullableText(data.matchId),
    route: toNullableText(data.route),
    dedupeKey: toNullableText(data.dedupeKey),
  };
}

export async function createUserNotification(input: CreateNotificationInput) {
  if (!input.userId) return null;

  const now = new Date().toISOString();

  const notificationData = {
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    isRead: false,
    createdAt: now,
    readAt: null,
    tournamentId: input.tournamentId ?? null,
    matchId: input.matchId ?? null,
    route: input.route ?? null,
    dedupeKey: input.dedupeKey ?? null,
  };

  const notificationRef = await addDoc(
    collection(db, "notifications"),
    notificationData,
  );

  return {
    id: notificationRef.id,
    ...notificationData,
  } as UserNotification;
}

export async function getUserNotifications(
  userId: string,
  maxItems = 30,
): Promise<UserNotification[]> {
  if (!userId) return [];

  const notificationsRef = collection(db, "notifications");

  const q = query(
    notificationsRef,
    where("userId", "==", userId),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((docSnap) => mapNotification(docSnap.id, docSnap.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, maxItems);
}

export function subscribeUserNotifications(
  userId: string,
  callback: (items: UserNotification[]) => void,
  maxItems = 12,
): Unsubscribe {
  if (!userId) {
    callback([]);
    return () => undefined;
  }

  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(
        snapshot.docs
          .map((docSnap) => mapNotification(docSnap.id, docSnap.data()))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, maxItems),
      );
    },
    (error) => {
      console.error("Notification subscription failed:", error);
      callback([]);
    },
  );
}

export async function getUnreadNotificationsCount(
  userId: string,
): Promise<number> {
  if (!userId) return 0;

  const notifications = await getUserNotifications(userId, 200);
  return notifications.filter((notification) => !notification.isRead).length;
}

export async function markNotificationAsRead(notificationId: string) {
  if (!notificationId) return;

  const notificationRef = doc(db, "notifications", notificationId);

  await updateDoc(notificationRef, {
    isRead: true,
    readAt: new Date().toISOString(),
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  if (!userId) return;

  const notifications = await getUserNotifications(userId, 50);

  await Promise.all(
    notifications
      .filter((notification) => !notification.isRead)
      .map((notification) => markNotificationAsRead(notification.id)),
  );
}
