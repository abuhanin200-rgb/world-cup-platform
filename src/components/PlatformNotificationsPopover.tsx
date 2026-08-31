"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
  CheckCheck,
  Clock3,
  Megaphone,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeUserNotifications,
  type UserNotification,
} from "@/lib/notifications";

function formatTime(value?: string) {
  if (!value) return "";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const diff = Math.max(0, Date.now() - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `قبل ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `قبل ${hours} س`;
  const days = Math.floor(hours / 24);
  return `قبل ${days} ي`;
}

function NotificationIcon({ type }: { type: UserNotification["type"] }) {
  if (type === "exact_hit") return <Target className="h-4 w-4" aria-hidden="true" />;
  if (type === "winner_hit" || type === "tournament_rank") {
    return <Trophy className="h-4 w-4" aria-hidden="true" />;
  }
  if (type === "prediction_open" || type === "prediction_reminder") {
    return <Clock3 className="h-4 w-4" aria-hidden="true" />;
  }
  if (type === "tournament_announcement") {
    return <Megaphone className="h-4 w-4" aria-hidden="true" />;
  }
  return <BellRing className="h-4 w-4" aria-hidden="true" />;
}

export default function PlatformNotificationsPopover() {
  const router = useRouter();
  const { user, isLoggedIn, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UserNotification[]>([]);
  const [marking, setMarking] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!user?.id || !isLoggedIn) {
      setItems([]);
      return;
    }
    return subscribeUserNotifications(user.id, setItems, 20);
  }, [isLoggedIn, user?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const unread = items.filter((item) => !item.isRead).length;

  async function openNotification(item: UserNotification) {
    try {
      if (!item.isRead) await markNotificationAsRead(item.id);
    } catch (error) {
      console.error("تعذر تعليم الإشعار كمقروء:", error);
    }
    setOpen(false);
    if (item.route) router.push(item.route);
  }

  async function markAll() {
    if (!user?.id) return;
    setMarking(true);
    try {
      await markAllNotificationsAsRead(user.id);
    } finally {
      setMarking(false);
    }
  }

  function toggle() {
    if (loading) return;
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setOpen((current) => !current);
  }

  const drawer = mounted && open ? createPortal(
    <>
      <button
        type="button"
        aria-label="إغلاق الإشعارات"
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-[190] bg-black/25 backdrop-blur-[1px] md:bg-black/10"
      />
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label="الإشعارات"
        className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+82px)] z-[200] max-h-[calc(100dvh-120px)] overflow-hidden rounded-[24px] border border-white/10 bg-[#071522]/[0.99] shadow-2xl shadow-black/60 backdrop-blur-xl md:inset-x-auto md:left-5 md:top-20 md:w-[400px] md:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div>
            <div className="text-sm font-black text-white">الإشعارات</div>
            <div className="mt-0.5 text-[11px] font-bold text-slate-400">
              {unread > 0 ? `${unread} غير مقروءة` : "كلها مقروءة"}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAll()}
                disabled={marking}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-2.5 text-[11px] font-black text-[var(--brand-yellow)] transition hover:bg-[var(--brand-yellow)]/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-yellow)] disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                قراءة الكل
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-yellow)]"
              aria-label="إغلاق الإشعارات"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(100dvh-190px)] overflow-x-hidden overflow-y-auto p-2.5 md:max-h-[520px]">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="mx-auto h-7 w-7 text-slate-500" aria-hidden="true" />
              <div className="mt-3 text-sm font-black text-slate-300">لا توجد إشعارات حاليًا</div>
              <div className="mt-1 text-xs text-slate-500">ستظهر هنا تنبيهات البطولات والنتائج.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openNotification(item)}
                  className={`w-full overflow-hidden rounded-2xl border p-3 text-right transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-yellow)] ${
                    item.isRead
                      ? "border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.05]"
                      : "border-[var(--brand-yellow)]/15 bg-[var(--brand-yellow)]/[0.065] hover:bg-[var(--brand-yellow)]/[0.1]"
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                        item.isRead
                          ? "border-white/10 bg-white/[0.05] text-slate-300"
                          : "border-[var(--brand-yellow)]/20 bg-[var(--brand-yellow)]/10 text-[var(--brand-yellow)]"
                      }`}
                    >
                      <NotificationIcon type={item.type} />
                    </span>
                    <span className="min-w-0 flex-1 overflow-hidden">
                      <span className="flex min-w-0 items-start justify-between gap-2">
                        <span className="min-w-0 break-words text-xs font-black leading-5 text-white">{item.title}</span>
                        <span className="shrink-0 whitespace-nowrap text-[10px] font-bold text-slate-500">{formatTime(item.createdAt)}</span>
                      </span>
                      <span className="mt-1 block break-words text-[11px] font-medium leading-5 text-slate-400">{item.message}</span>
                      {item.route && (
                        <span className="mt-1.5 block text-[10px] font-black text-[var(--brand-yellow)]">فتح التفاصيل ←</span>
                      )}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </>,
    document.body,
  ) : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-slate-200 transition hover:bg-white/[0.09] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-yellow)]"
        aria-label={unread > 0 ? `الإشعارات، ${unread} غير مقروءة` : "الإشعارات"}
        aria-expanded={open}
        title="الإشعارات"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -left-1 -top-1 inline-flex min-h-[19px] min-w-[19px] items-center justify-center rounded-full bg-[var(--brand-yellow)] px-1 text-[10px] font-black leading-none text-[#061a4d] ring-2 ring-[#071019]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {drawer}
    </div>
  );
}
