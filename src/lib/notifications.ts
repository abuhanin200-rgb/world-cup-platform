import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
  doc,
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
  | "system";

export type UserNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
};

function toText(value: unknown) {
  return String(value || "").trim();
}

function toBoolean(value: unknown) {
  return Boolean(value);
}

function mapNotification(
  id: string,
  data: Record<string, unknown>
): UserNotification {
  return {
    id,
    userId: toText(data.userId),
    type: (toText(data.type) || "system") as NotificationType,
    title: toText(data.title),
    message: toText(data.message),
    isRead: toBoolean(data.isRead),
    createdAt: toText(data.createdAt),
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
  };

  const notificationRef = await addDoc(
    collection(db, "notifications"),
    notificationData
  );

  return {
    id: notificationRef.id,
    ...notificationData,
  } as UserNotification;
}

export async function getUserNotifications(
  userId: string,
  maxItems = 30
): Promise<UserNotification[]> {
  if (!userId) return [];

  const notificationsRef = collection(db, "notifications");

  const q = query(
    notificationsRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(maxItems)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) =>
    mapNotification(docSnap.id, docSnap.data())
  );
}

export async function getUnreadNotificationsCount(
  userId: string
): Promise<number> {
  if (!userId) return 0;

  const notificationsRef = collection(db, "notifications");

  const q = query(
    notificationsRef,
    where("userId", "==", userId),
    where("isRead", "==", false)
  );

  const snapshot = await getDocs(q);

  return snapshot.size;
}

export async function markNotificationAsRead(notificationId: string) {
  if (!notificationId) return;

  const notificationRef = doc(db, "notifications", notificationId);

  await updateDoc(notificationRef, {
    isRead: true,
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  if (!userId) return;

  const notifications = await getUserNotifications(userId, 50);

  await Promise.all(
    notifications
      .filter((notification) => !notification.isRead)
      .map((notification) => markNotificationAsRead(notification.id))
  );
}