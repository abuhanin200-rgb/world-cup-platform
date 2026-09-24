"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Clock3,
  Laptop,
  MonitorSmartphone,
  RefreshCw,
  Search,
  Smartphone,
  Tablet,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  getAllPresenceMembers,
  getPresencePageLabel,
  PRESENCE_ONLINE_WINDOW_MS,
} from "@/lib/presenceService";
import type { OnlinePresence, PresenceDeviceType } from "@/types/presence";

const OFFLINE_PAGE_SIZE = 25;
const AUTO_REFRESH_MS = 30 * 1000;

type StatusFilter = "all" | "online" | "offline";
type DeviceFilter = "all" | PresenceDeviceType;

function arabicDuration(value: number, singular: string, dual: string, plural: string) {
  if (value <= 1) return singular;
  if (value === 2) return dual;
  if (value >= 3 && value <= 10) return `${value} ${plural}`;
  return `${value} ${singular}`;
}

function formatLastSeen(lastSeen: number, now = Date.now()) {
  const diffSeconds = Math.max(0, Math.floor((now - lastSeen) / 1000));
  if (diffSeconds < 45) return "الآن";
  if (diffSeconds < 60) return `منذ ${diffSeconds} ثانية`;

  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `منذ ${arabicDuration(minutes, "دقيقة", "دقيقتين", "دقائق")}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${arabicDuration(hours, "ساعة", "ساعتين", "ساعات")}`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `منذ ${arabicDuration(days, "يوم", "يومين", "أيام")}`;

  const weeks = Math.floor(days / 7);
  if (days < 30) return `منذ ${arabicDuration(weeks, "أسبوع", "أسبوعين", "أسابيع")}`;

  const months = Math.floor(days / 30);
  if (days < 365) return `منذ ${arabicDuration(months, "شهر", "شهرين", "أشهر")}`;

  const years = Math.floor(days / 365);
  return `منذ ${arabicDuration(years, "سنة", "سنتين", "سنوات")}`;
}

function formatExactLastSeen(lastSeen: number) {
  if (!Number.isFinite(lastSeen)) return "-";
  return new Intl.DateTimeFormat("ar-SA", {
    timeZone: "Asia/Riyadh",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(lastSeen));
}

function formatSessionDuration(startedAt?: number, now = Date.now()) {
  if (!startedAt || !Number.isFinite(startedAt) || startedAt > now) return "-";
  const minutes = Math.max(1, Math.floor((now - startedAt) / 60000));
  if (minutes < 60) return arabicDuration(minutes, "دقيقة", "دقيقتين", "دقائق");
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return remainingMinutes > 0 ? `${hours} س ${remainingMinutes} د` : `${hours} س`;
  const days = Math.floor(hours / 24);
  return `${days} يوم`;
}

function getDeviceIcon(type?: PresenceDeviceType) {
  if (type === "iphone" || type === "android") return Smartphone;
  if (type === "ipad") return Tablet;
  if (type === "computer") return Laptop;
  return MonitorSmartphone;
}

function getDeviceLabel(member: OnlinePresence) {
  if (member.deviceLabel) return member.deviceLabel;
  if (member.deviceType === "iphone") return "iPhone";
  if (member.deviceType === "ipad") return "iPad";
  if (member.deviceType === "android") return "Android";
  if (member.deviceType === "computer") return "كمبيوتر";
  return "غير معروف";
}

function makkahDayKey(timestamp: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

function PresenceRow({ member, online, now }: { member: OnlinePresence; online: boolean; now: number }) {
  const DeviceIcon = getDeviceIcon(member.deviceType);
  const pageLabel = getPresencePageLabel(member.path || "/");

  return (
    <div
      className={`grid gap-3 border-t border-white/8 px-3 py-3 text-[12px] md:grid-cols-[minmax(180px,1.1fr)_minmax(190px,1.1fr)_minmax(150px,.8fr)_130px_120px] md:items-center md:text-sm ${
        online ? "bg-emerald-400/[0.035]" : "bg-transparent"
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${online ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.7)]" : "bg-slate-500"}`} />
          <span className="truncate font-black text-white">{member.fullName || "عضو"}</span>
          {online ? (
            <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-black text-emerald-300">
              متواجد
            </span>
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        <div className="truncate font-black text-amber-200">{pageLabel}</div>
        <div className="mt-1 truncate text-[10px] font-bold text-slate-400">{member.activity || "يتصفح المنصة"}</div>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/8 bg-white/[0.04] text-sky-200">
          <DeviceIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate font-black text-slate-100">{getDeviceLabel(member)}</div>
          <div className="mt-0.5 truncate text-[10px] font-bold text-slate-500">
            {[member.browserName, member.osName].filter(Boolean).join(" · ") || "يُحدّث عند الزيارة القادمة"}
          </div>
        </div>
      </div>

      <div>
        <div className={`font-black ${online ? "text-emerald-300" : "text-slate-300"}`}>{formatLastSeen(member.lastSeen, now)}</div>
        <div className="mt-1 text-[10px] font-bold text-slate-500">{formatExactLastSeen(member.lastSeen)}</div>
      </div>

      <div>
        <div className="font-black text-slate-200">{online ? formatSessionDuration(member.sessionStartedAt, now) : "-"}</div>
        <div className="mt-1 text-[10px] font-bold text-slate-500">{online ? "مدة الجلسة" : "غير متصل"}</div>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, tone = "slate" }: { icon: typeof Users; label: string; value: number; tone?: "emerald" | "sky" | "amber" | "slate" }) {
  const tones = {
    emerald: "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300",
    sky: "border-sky-400/15 bg-sky-400/[0.07] text-sky-300",
    amber: "border-amber-400/15 bg-amber-400/[0.07] text-amber-300",
    slate: "border-white/10 bg-white/[0.04] text-slate-200",
  };

  return (
    <div className={`rounded-2xl border p-3 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <Icon className="h-4 w-4" />
        <strong className="text-xl font-black text-white">{value}</strong>
      </div>
      <div className="mt-2 text-[10px] font-black opacity-80">{label}</div>
    </div>
  );
}

export default function AdminOnlinePresencePanel() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<OnlinePresence[]>([]);
  const [queryText, setQueryText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>("all");
  const [offlinePage, setOfflinePage] = useState(1);
  const [now, setNow] = useState(Date.now());

  async function loadData(initial = false) {
    try {
      if (initial) setLoading(true);
      else setRefreshing(true);
      const data = await getAllPresenceMembers();
      setMembers(data);
      setNow(Date.now());
    } catch (error) {
      console.error("Presence history load error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData(true);
    const refreshTimer = window.setInterval(() => void loadData(false), AUTO_REFRESH_MS);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 15 * 1000);
    return () => {
      window.clearInterval(refreshTimer);
      window.clearInterval(clockTimer);
    };
  }, []);

  const isOnline = (member: OnlinePresence) => now - member.lastSeen <= PRESENCE_ONLINE_WINDOW_MS;
  const todayKey = makkahDayKey(now);

  const stats = useMemo(() => {
    const onlineCount = members.filter((member) => now - member.lastSeen <= PRESENCE_ONLINE_WINDOW_MS).length;
    const activeToday = members.filter((member) => makkahDayKey(member.lastSeen) === todayKey).length;
    const iphoneCount = members.filter((member) => member.deviceType === "iphone").length;
    const androidCount = members.filter((member) => member.deviceType === "android").length;
    const computerCount = members.filter((member) => member.deviceType === "computer").length;
    return { onlineCount, activeToday, iphoneCount, androidCount, computerCount };
  }, [members, now, todayKey]);

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return members.filter((member) => {
      const online = now - member.lastSeen <= PRESENCE_ONLINE_WINDOW_MS;
      if (statusFilter === "online" && !online) return false;
      if (statusFilter === "offline" && online) return false;
      if (deviceFilter !== "all" && member.deviceType !== deviceFilter) return false;
      if (!q) return true;
      const haystack = [
        member.fullName,
        member.userId,
        member.deviceLabel,
        member.browserName,
        member.osName,
        member.activity,
        getPresencePageLabel(member.path || "/"),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [members, queryText, statusFilter, deviceFilter, now]);

  const onlineMembers = filtered.filter(isOnline).sort((a, b) => b.lastSeen - a.lastSeen);
  const offlineMembers = filtered.filter((member) => !isOnline(member)).sort((a, b) => b.lastSeen - a.lastSeen);
  const offlinePages = Math.max(1, Math.ceil(offlineMembers.length / OFFLINE_PAGE_SIZE));
  const safeOfflinePage = Math.min(offlinePage, offlinePages);
  const visibleOffline = offlineMembers.slice((safeOfflinePage - 1) * OFFLINE_PAGE_SIZE, safeOfflinePage * OFFLINE_PAGE_SIZE);

  useEffect(() => {
    setOfflinePage(1);
  }, [queryText, statusFilter, deviceFilter]);

  if (loading) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">جاري تحميل سجل تواجد الأعضاء...</div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.07] shadow-2xl">
      <div className="border-b border-white/10 p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-emerald-300" />
              <h2 className="text-xl font-black md:text-2xl">حضور الأعضاء ونشاطهم</h2>
            </div>
            <p className="mt-2 max-w-3xl text-xs font-bold leading-6 text-slate-400 md:text-sm">
              المتواجدون الآن يظهرون أولًا، ثم آخر من زار المنصة. الصفحة والجهاز وآخر ظهور تُحدّث تلقائيًا كل 30 ثانية.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData(false)}
            disabled={refreshing}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-xs font-black text-white hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "جاري التحديث" : "تحديث الآن"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <MiniStat icon={Wifi} label="متواجد الآن" value={stats.onlineCount} tone="emerald" />
          <MiniStat icon={Clock3} label="نشط اليوم" value={stats.activeToday} tone="amber" />
          <MiniStat icon={Users} label="دخلوا المنصة" value={members.length} tone="slate" />
          <MiniStat icon={Smartphone} label="iPhone" value={stats.iphoneCount} tone="sky" />
          <MiniStat icon={Smartphone} label="Android" value={stats.androidCount} tone="emerald" />
          <MiniStat icon={Laptop} label="كمبيوتر" value={stats.computerCount} tone="slate" />
        </div>

        <div className="mt-4 grid gap-2 lg:grid-cols-[1fr_auto_auto]">
          <label className="relative block">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              placeholder="ابحث بالاسم أو الصفحة أو الجهاز..."
              className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/55 pr-10 pl-3 text-xs font-bold text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/30"
            />
          </label>

          <div className="flex min-h-11 overflow-hidden rounded-xl border border-white/10 bg-slate-950/45 p-1">
            {(["all", "online", "offline"] as StatusFilter[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-3 text-[10px] font-black transition ${statusFilter === status ? "bg-white/12 text-white" : "text-slate-500"}`}
              >
                {status === "all" ? "الكل" : status === "online" ? "متواجد" : "غير متصل"}
              </button>
            ))}
          </div>

          <select
            value={deviceFilter}
            onChange={(event) => setDeviceFilter(event.target.value as DeviceFilter)}
            className="h-11 rounded-xl border border-white/10 bg-slate-950/70 px-3 text-[11px] font-black text-white outline-none"
          >
            <option value="all">كل الأجهزة</option>
            <option value="iphone">iPhone</option>
            <option value="ipad">iPad</option>
            <option value="android">Android</option>
            <option value="computer">كمبيوتر</option>
            <option value="other">أخرى</option>
          </select>
        </div>
      </div>

      <div className="p-3 md:p-4">
        {statusFilter !== "offline" ? (
          <div className="overflow-hidden rounded-2xl border border-emerald-400/15 bg-slate-950/40">
            <div className="flex items-center justify-between gap-3 bg-emerald-400/[0.07] px-4 py-3">
              <div className="flex items-center gap-2 font-black text-emerald-200">
                <Wifi className="h-4 w-4" />
                المتواجدون الآن
              </div>
              <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black text-emerald-300">{onlineMembers.length}</span>
            </div>
            {onlineMembers.length > 0 ? (
              <div>
                <div className="hidden grid-cols-[minmax(180px,1.1fr)_minmax(190px,1.1fr)_minmax(150px,.8fr)_130px_120px] bg-white/[0.025] px-3 py-2 text-[10px] font-black text-slate-500 md:grid">
                  <div>العضو</div><div>الصفحة الحالية</div><div>الجهاز</div><div>آخر ظهور</div><div>الجلسة</div>
                </div>
                {onlineMembers.map((member) => <PresenceRow key={member.userId} member={member} online now={now} />)}
              </div>
            ) : (
              <div className="p-6 text-center text-xs font-bold text-slate-500">لا يوجد أعضاء متواجدون ضمن الفلتر الحالي.</div>
            )}
          </div>
        ) : null}

        {statusFilter !== "online" ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35">
            <div className="flex items-center justify-between gap-3 bg-white/[0.035] px-4 py-3">
              <div className="flex items-center gap-2 font-black text-slate-300">
                <WifiOff className="h-4 w-4" />
                غير المتصلين - آخر ظهور
              </div>
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-black text-slate-400">{offlineMembers.length}</span>
            </div>
            {visibleOffline.length > 0 ? (
              <div>
                <div className="hidden grid-cols-[minmax(180px,1.1fr)_minmax(190px,1.1fr)_minmax(150px,.8fr)_130px_120px] bg-white/[0.02] px-3 py-2 text-[10px] font-black text-slate-600 md:grid">
                  <div>العضو</div><div>آخر صفحة</div><div>الجهاز</div><div>آخر ظهور</div><div>الحالة</div>
                </div>
                {visibleOffline.map((member) => <PresenceRow key={member.userId} member={member} online={false} now={now} />)}
              </div>
            ) : (
              <div className="p-6 text-center text-xs font-bold text-slate-500">لا يوجد أعضاء غير متصلين ضمن الفلتر الحالي.</div>
            )}

            {offlinePages > 1 ? (
              <div className="flex items-center justify-between gap-3 border-t border-white/8 p-3">
                <button
                  type="button"
                  disabled={safeOfflinePage <= 1}
                  onClick={() => setOfflinePage((page) => Math.max(1, page - 1))}
                  className="min-h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[10px] font-black text-white disabled:opacity-30"
                >
                  السابق
                </button>
                <span className="text-[10px] font-black text-slate-500">صفحة {safeOfflinePage} من {offlinePages}</span>
                <button
                  type="button"
                  disabled={safeOfflinePage >= offlinePages}
                  onClick={() => setOfflinePage((page) => Math.min(offlinePages, page + 1))}
                  className="min-h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[10px] font-black text-white disabled:opacity-30"
                >
                  التالي
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 rounded-2xl border border-sky-400/10 bg-sky-400/[0.04] px-4 py-3 text-[10px] font-bold leading-5 text-slate-400">
          ملاحظة: بيانات نوع الجهاز والمتصفح تبدأ بالظهور بعد زيارة العضو للمنصة بعد تركيب هذا التحديث. الأعضاء القدامى سيظهر جهازهم «غير معروف» إلى أن يدخلوا مرة أخرى.
        </div>
      </div>
    </section>
  );
}
