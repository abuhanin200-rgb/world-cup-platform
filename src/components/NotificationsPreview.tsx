"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  UserNotification,
} from "@/lib/notifications";

function formatTime(value?: string) {
  if (!value) return "—";

  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "—";

  const diffMinutes = Math.max(0, Math.floor((Date.now() - time) / 60000));

  if (diffMinutes < 1) return "الآن";
  if (diffMinutes < 60) return `قبل ${diffMinutes} دقيقة`;

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours === 1) return "قبل ساعة";
  if (diffHours === 2) return "قبل ساعتين";
  if (diffHours <= 10) return `قبل ${diffHours} ساعات`;
  if (diffHours < 24) return `قبل ${diffHours} ساعة`;

  return "قبل أكثر من يوم";
}

function getNotificationIcon(type: UserNotification["type"]) {
  if (type === "achievement") return "🏅";
  if (type === "exact_hit") return "🎯";
  if (type === "winner_hit") return "🏆";
  if (type === "rank_up") return "⬆️";
  if (type === "rank_down") return "⬇️";
  if (type === "leader") return "👑";
  if (type === "streak") return "🔥";

  return "🔔";
}

export default function NotificationsPreview() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);

  async function loadNotifications() {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getUserNotifications(user.id);
      setNotifications(data);
    } catch (error) {
      console.error("فشل تحميل الإشعارات:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAllAsRead() {
    if (!user) return;

    try {
      setMarkingRead(true);
      await markAllNotificationsAsRead(user.id);

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );
    } catch (error) {
      console.error("فشل تعليم الإشعارات كمقروءة:", error);
    } finally {
      setMarkingRead(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, [user?.id]);

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/40 p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black md:text-2xl">🔔 الإشعارات</h2>

          <p className="mt-1 text-xs text-slate-300 md:text-sm">
            آخر التنبيهات والإنجازات الخاصة بحسابك
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={markingRead}
            className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950 hover:bg-amber-300 disabled:opacity-60"
          >
            {markingRead ? "جاري..." : "قراءة الكل"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm text-slate-300">
          جاري تحميل الإشعارات...
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm text-slate-300">
          لا توجد إشعارات حتى الآن.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-2xl border p-4 ${
                notification.isRead
                  ? "border-white/10 bg-slate-950/60"
                  : "border-amber-400/30 bg-amber-400/10"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl">
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-black text-white">
                      {notification.title}
                    </h3>

                    {!notification.isRead && (
                      <span className="rounded-full bg-amber-400 px-2 py-1 text-[10px] font-black text-slate-950">
                        جديد
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs leading-6 text-slate-300">
                    {notification.message}
                  </p>

                  <div className="mt-2 text-[11px] text-slate-500">
                    {formatTime(notification.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}