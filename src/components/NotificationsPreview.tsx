"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Bell,
  CheckCheck,
  Crown,
  Flame,
  Medal,
  MoveDown,
  MoveUp,
  Target,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  UserNotification,
} from "@/lib/notifications";

const sectionMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 26,
    scale: 0.97,
    filter: "blur(8px)",
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.48,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.06,
    },
  },
};

const itemMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 18,
    scale: 0.96,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.34,
      ease: "easeOut",
    },
  },
};

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
  if (type === "achievement") return <Medal className="h-5 w-5" />;
  if (type === "exact_hit") return <Target className="h-5 w-5" />;
  if (type === "winner_hit") return <Trophy className="h-5 w-5" />;
  if (type === "rank_up") return <MoveUp className="h-5 w-5" />;
  if (type === "rank_down") return <MoveDown className="h-5 w-5" />;
  if (type === "leader") return <Crown className="h-5 w-5" />;
  if (type === "streak") return <Flame className="h-5 w-5" />;

  return <Bell className="h-5 w-5" />;
}

function getNotificationIconClass(type: UserNotification["type"]) {
  if (type === "achievement") return "text-amber-300";
  if (type === "exact_hit") return "text-emerald-300";
  if (type === "winner_hit") return "text-amber-300";
  if (type === "rank_up") return "text-emerald-300";
  if (type === "rank_down") return "text-red-300";
  if (type === "leader") return "text-amber-300";
  if (type === "streak") return "text-orange-300";

  return "text-sky-300";
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
    <motion.section
      variants={sectionMotion}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.18 }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/40 p-4 shadow-lg shadow-slate-950/25 md:p-5"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-amber-300/8" />
      <div className="pointer-events-none absolute -right-20 top-8 h-44 w-44 rounded-full bg-amber-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-8 h-44 w-44 rounded-full bg-sky-300/10 blur-3xl" />

      <div className="relative">
        <motion.div
          variants={itemMotion}
          className="mb-4 flex items-center justify-between gap-3"
        >
          <div>
            <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-200 shadow-lg shadow-amber-950/10">
              <Bell className="h-5 w-5" />
            </div>

            <h2 className="text-xl font-black md:text-2xl">الإشعارات</h2>

            <p className="mt-1 text-xs text-slate-300 md:text-sm">
              آخر التنبيهات والإنجازات الخاصة بحسابك
            </p>
          </div>

          {unreadCount > 0 && (
            <motion.button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={markingRead}
              whileTap={{ scale: 0.94 }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCheck className="h-4 w-4" />
              <span>{markingRead ? "جاري..." : "قراءة الكل"}</span>
            </motion.button>
          )}
        </motion.div>

        {loading ? (
          <motion.div
            variants={itemMotion}
            className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm text-slate-300"
          >
            جاري تحميل الإشعارات...
          </motion.div>
        ) : notifications.length === 0 ? (
          <motion.div
            variants={itemMotion}
            className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm text-slate-300"
          >
            لا توجد إشعارات حتى الآن.
          </motion.div>
        ) : (
          <motion.div variants={sectionMotion} className="space-y-3">
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                variants={itemMotion}
                whileTap={{ scale: 0.985 }}
                className={`relative overflow-hidden rounded-2xl border p-4 shadow-lg shadow-slate-950/20 ${
                  notification.isRead
                    ? "border-white/10 bg-slate-950/60"
                    : "border-amber-400/30 bg-amber-400/10"
                }`}
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent" />

                {!notification.isRead && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute left-3 top-3 h-2.5 w-2.5 rounded-full bg-amber-300 shadow-lg shadow-amber-300/40"
                    animate={{ scale: [1, 1.35, 1], opacity: [1, 0.65, 1] }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}

                <div className="relative flex items-start gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 ${getNotificationIconClass(
                      notification.type
                    )}`}
                  >
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

                    <div className="mt-2 text-[11px] font-bold text-slate-500">
                      {formatTime(notification.createdAt)}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.section>
  );
}