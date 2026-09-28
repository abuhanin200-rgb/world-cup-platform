"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, CalendarDays, CheckCircle2, ChevronLeft, CircleDot,
  ClipboardList, Gamepad2, History, RefreshCw, Target, Users, UsersRound,
} from "lucide-react";
import { AdminOverview, getAdminOverview } from "@/lib/adminOverview";
import AdminOnlinePresencePanel from "@/components/AdminOnlinePresencePanel";

const DATE_LOCALE = "ar-SA-u-ca-gregory-nu-latn";

type AdminDestination = "members" | "tournamentsV2" | "predictions" | "matches" | "games" | "logs";

function formatDate(dateText: string) {
  if (!dateText) return "—";
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(DATE_LOCALE, {
    day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit",
    hour12: true, timeZone: "Asia/Riyadh",
  }).format(date);
}

function StatCard({ title, value, note, icon: Icon }: { title: string; value: number; note: string; icon: typeof Users }) {
  return (
    <div className="group rounded-[24px] border border-white/10 bg-gradient-to-br from-white/[0.075] to-white/[0.025] p-4 shadow-lg transition hover:border-amber-300/20 hover:bg-white/[0.08]">
      <div className="flex items-start justify-between gap-3">
        <div><div className="text-xs font-bold text-slate-400">{title}</div><div className="mt-2 text-3xl font-black tabular-nums text-white">{value.toLocaleString("ar-SA")}</div></div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-300/10 text-amber-200"><Icon className="h-5 w-5" /></span>
      </div>
      <div className="mt-3 text-[11px] leading-5 text-slate-500">{note}</div>
    </div>
  );
}

function QuickAction({ label, note, icon: Icon, onClick }: { label: string; note: string; icon: typeof Users; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex min-h-[76px] w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/15 p-3 text-right transition hover:border-amber-300/25 hover:bg-white/[0.07]">
    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.07] text-amber-200"><Icon className="h-5 w-5" /></span>
    <span className="min-w-0 flex-1"><strong className="block text-sm font-black text-white">{label}</strong><span className="mt-1 block truncate text-[11px] text-slate-500">{note}</span></span>
    <ChevronLeft className="h-4 w-4 shrink-0 text-slate-600" />
  </button>;
}

export default function AdminOverviewPanel({ onNavigate }: { onNavigate?: (tab: AdminDestination) => void }) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadOverview(isRefresh = false) {
    try { setError(""); isRefresh ? setRefreshing(true) : setLoading(true); setOverview(await getAdminOverview()); }
    catch (err) { console.error("فشل تحميل ملخص لوحة التحكم:", err); setError("تعذر تحميل ملخص لوحة التحكم"); }
    finally { setLoading(false); setRefreshing(false); }
  }
  useEffect(() => { void loadOverview(); }, []);

  const completion = useMemo(() => {
    if (!overview?.predictionsCount) return 0;
    return Math.round((overview.calculatedPredictionsCount / overview.predictionsCount) * 100);
  }, [overview]);

  if (loading) return <section className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6"><div className="flex items-center justify-center gap-3 py-12 text-sm font-bold text-slate-300"><RefreshCw className="h-5 w-5 animate-spin" /> جاري تجهيز مركز التشغيل...</div></section>;
  if (!overview) return <section className="rounded-[28px] border border-red-400/25 bg-red-400/10 p-6 text-center text-sm text-red-100">{error || "لا توجد بيانات متاحة حاليًا."}</section>;

  const go = (tab: AdminDestination) => onNavigate?.(tab);
  return <div className="space-y-5" dir="rtl">
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-slate-900/95 via-slate-950/95 to-black/90 shadow-2xl">
      <div className="border-b border-white/10 p-4 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3"><span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200"><Activity className="h-6 w-6" /></span><div><div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black text-emerald-200"><CircleDot className="h-3 w-3" /> مركز التشغيل</div><h2 className="text-2xl font-black md:text-3xl">لوحة المنصة</h2><p className="mt-1 text-sm text-slate-400">ملخص مباشر لأهم ما يحتاج المتابعة والإدارة.</p></div></div>
          <div className="flex flex-col items-start gap-2 lg:items-end"><button type="button" onClick={() => void loadOverview(true)} disabled={refreshing} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-black hover:bg-white/10 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />{refreshing ? "جاري التحديث" : "تحديث الآن"}</button><span className="text-[10px] text-slate-600">آخر تحديث: {formatDate(overview.updatedAt)}</span></div>
        </div>
      </div>
      {error ? <div className="mx-4 mt-4 rounded-2xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-100 md:mx-6">{error}</div> : null}
      <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4 md:p-6">
        <StatCard title="الأعضاء" value={overview.membersCount} note="إجمالي الحسابات المسجلة" icon={UsersRound} />
        <StatCard title="المباريات" value={overview.matchesCount} note={`${overview.scheduledMatchesCount} بانتظار الاحتساب`} icon={CalendarDays} />
        <StatCard title="التوقعات" value={overview.predictionsCount} note={`${overview.pendingPredictionsCount} بانتظار النتيجة`} icon={Target} />
        <StatCard title="المحتسبة" value={overview.calculatedPredictionsCount} note={`${completion}% من التوقعات الحالية`} icon={CheckCircle2} />
      </div>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-4 md:p-5">
        <div className="mb-4"><h3 className="text-lg font-black">الوصول السريع</h3><p className="mt-1 text-xs text-slate-500">أكثر أقسام الإدارة استخدامًا في مكان واحد.</p></div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <QuickAction label="إدارة الأعضاء" note="الحسابات والنشاط والأمان" icon={Users} onClick={() => go("members")} />
          <QuickAction label="إدارة البطولات" note="خليجي 27 والبطولات الحالية" icon={ClipboardList} onClick={() => go("tournamentsV2")} />
          <QuickAction label="توقعات الأعضاء" note="المراجعة والتعديل والمتابعة" icon={Target} onClick={() => go("predictions")} />
          <QuickAction label="إدارة المباريات" note="حالة وجدول المباريات" icon={CalendarDays} onClick={() => go("matches")} />
          <QuickAction label="الألعاب والتحديات" note="إدارة ألعاب المنصة" icon={Gamepad2} onClick={() => go("games")} />
          <QuickAction label="سجل الإدارة" note={`${overview.logsCount} عملية مسجلة`} icon={History} onClick={() => go("logs")} />
        </div>
      </div>
      <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-4 md:p-5">
        <h3 className="text-lg font-black">حالة العمل</h3><p className="mt-1 text-xs text-slate-500">قراءة سريعة لما يحتاج انتباهك.</p>
        <div className="mt-5 space-y-3">
          <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.07] p-4"><div className="text-xs font-bold text-amber-100/70">توقعات بانتظار الاحتساب</div><div className="mt-1 text-3xl font-black text-amber-200">{overview.pendingPredictionsCount.toLocaleString("ar-SA")}</div></div>
          <div className="rounded-2xl border border-sky-300/15 bg-sky-300/[0.06] p-4"><div className="text-xs font-bold text-sky-100/70">مباريات قادمة</div><div className="mt-1 text-3xl font-black text-sky-200">{overview.scheduledMatchesCount.toLocaleString("ar-SA")}</div></div>
          <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-4"><div className="text-xs font-bold text-emerald-100/70">مباريات محتسبة</div><div className="mt-1 text-3xl font-black text-emerald-200">{overview.finishedMatchesCount.toLocaleString("ar-SA")}</div></div>
        </div>
      </div>
    </section>
    <AdminOnlinePresencePanel />
  </div>;
}
