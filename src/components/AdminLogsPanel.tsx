"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AdminLog, getAdminLogs } from "@/lib/adminLogs";

const LOGS_PER_PAGE = 20;

function getActionStyle(action: string) {
  if (action === "add_match") {
    return {
      icon: "➕",
      label: "إضافة مباراة",
      className: "bg-blue-400/10 text-blue-300",
    };
  }

  if (action === "calculate_match") {
    return {
      icon: "🧮",
      label: "احتساب نتيجة",
      className: "bg-emerald-400/10 text-emerald-300",
    };
  }

  if (action === "undo_match_calculation") {
    return {
      icon: "↩️",
      label: "تراجع عن حسبة",
      className: "bg-red-400/10 text-red-300",
    };
  }

  if (action === "update_member") {
    return {
      icon: "✏️",
      label: "تعديل عضو",
      className: "bg-amber-400/10 text-amber-300",
    };
  }

  if (action === "reset_member_stats") {
    return {
      icon: "🧹",
      label: "تصفير عضو",
      className: "bg-orange-400/10 text-orange-300",
    };
  }

  if (action === "update_settings") {
    return {
      icon: "⚙️",
      label: "تعديل إعدادات",
      className: "bg-purple-400/10 text-purple-300",
    };
  }

  return {
    icon: "📝",
    label: "عملية",
    className: "bg-white/10 text-slate-300",
  };
}

function formatDate(dateText: string) {
  if (!dateText) return "-";

  const date = new Date(dateText);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }).format(date);
}

export default function AdminLogsPanel() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((log) => (actionFilter === "all" || log.action === actionFilter) && (!q || `${log.title} ${log.description}`.toLowerCase().includes(q)));
  }, [logs, query, actionFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / LOGS_PER_PAGE));
  const visibleLogs = filteredLogs.slice((page - 1) * LOGS_PER_PAGE, page * LOGS_PER_PAGE);

  async function loadLogs() {
    try {
      setLoading(true);
      setError("");

      const data = await getAdminLogs(50);
      setLogs(data);
    } catch (err) {
      console.error("فشل تحميل سجل الأدمن:", err);
      setError("تعذر تحميل سجل العمليات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);
  useEffect(() => { setPage(1); }, [query, actionFilter]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black">سجل عمليات الأدمن</h2>
          <p className="mt-2 text-sm text-slate-300">
            آخر العمليات التي تمت داخل لوحة التحكم.
          </p>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15"
        >
          تحديث السجل
        </button>
      </div>

      <div className="mb-5 grid gap-2 md:grid-cols-[1fr_220px]">
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-slate-950/50 px-3"><Search className="h-4 w-4 text-slate-500"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في العمليات..." className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-slate-600" /></label>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="min-h-11 rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm font-bold"><option value="all">كل العمليات</option><option value="add_match">إضافة مباراة</option><option value="calculate_match">احتساب نتيجة</option><option value="undo_match_calculation">تراجع عن حسبة</option><option value="update_member">تعديل عضو</option><option value="reset_member_stats">تصفير عضو</option><option value="update_settings">تعديل إعدادات</option><option value="other">عمليات أخرى</option></select>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm text-slate-300">
          جاري تحميل سجل العمليات...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm text-slate-300">
          لا توجد عمليات مطابقة للبحث الحالي.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleLogs.map((log) => {
            const style = getActionStyle(log.action);

            return (
              <div
                key={log.id}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${style.className}`}
                      >
                        {style.icon} {style.label}
                      </span>

                      <span className="text-xs text-slate-400">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>

                    <h3 className="mt-3 font-black text-white">{log.title}</h3>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {log.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!loading && filteredLogs.length > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-2"><span className="text-[11px] font-bold text-slate-400">عرض {(page-1)*LOGS_PER_PAGE+1}–{Math.min(page*LOGS_PER_PAGE,filteredLogs.length)} من {filteredLogs.length}</span><div className="flex items-center gap-2"><button disabled={page===1} onClick={()=>setPage(value=>Math.max(1,value-1))} className="min-h-10 rounded-xl border border-white/10 px-3 text-xs font-black disabled:opacity-30">السابق</button><span className="min-w-16 text-center text-xs font-black">{page} / {totalPages}</span><button disabled={page===totalPages} onClick={()=>setPage(value=>Math.min(totalPages,value+1))} className="min-h-10 rounded-xl border border-white/10 px-3 text-xs font-black disabled:opacity-30">التالي</button></div></div>}
    </section>
  );
}