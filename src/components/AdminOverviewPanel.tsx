"use client";

import { useEffect, useState } from "react";
import { AdminOverview, getAdminOverview } from "@/lib/adminOverview";

function formatDate(dateText: string) {
  if (!dateText) return "-";

  const date = new Date(dateText);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }).format(date);
}

function StatCard({
  title,
  value,
  icon,
  note,
}: {
  title: string;
  value: number;
  icon: string;
  note: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-300">{title}</div>
          <div className="mt-2 text-3xl font-black text-white">{value}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-2xl">
          {icon}
        </div>
      </div>

      <div className="mt-4 text-xs leading-6 text-slate-400">{note}</div>
    </div>
  );
}

export default function AdminOverviewPanel() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadOverview(isRefresh = false) {
    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await getAdminOverview();
      setOverview(data);
    } catch (err) {
      console.error("فشل تحميل ملخص لوحة التحكم:", err);
      setError("تعذر تحميل ملخص لوحة التحكم");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  if (loading) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm text-slate-300">
          جاري تحميل النظرة العامة...
        </div>
      </section>
    );
  }

  if (!overview) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
        <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-5 text-center text-sm text-red-100">
          {error || "لا توجد بيانات متاحة حاليًا."}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black">نظرة عامة</h2>
          <p className="mt-2 text-sm text-slate-300">
            ملخص سريع لحالة المنصة والأعضاء والمباريات والتوقعات.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadOverview(true)}
          disabled={refreshing}
          className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {refreshing ? "جاري التحديث..." : "تحديث البيانات"}
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
        آخر تحديث:{" "}
        <span className="font-black text-amber-300">
          {formatDate(overview.updatedAt)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="عدد الأعضاء"
          value={overview.membersCount}
          icon="👥"
          note="إجمالي الأعضاء المسجلين في المنصة."
        />

        <StatCard
          title="عدد المباريات"
          value={overview.matchesCount}
          icon="📅"
          note={`مفعلة: ${overview.activeMatchesCount} | مخفية: ${overview.hiddenMatchesCount}`}
        />

        <StatCard
          title="المباريات القادمة"
          value={overview.scheduledMatchesCount}
          icon="⏳"
          note="مباريات لم يتم احتساب نتيجتها بعد."
        />

        <StatCard
          title="المباريات المحتسبة"
          value={overview.finishedMatchesCount}
          icon="✅"
          note="مباريات تم احتساب نتائجها وتوزيع نقاطها."
        />

        <StatCard
          title="إجمالي التوقعات"
          value={overview.predictionsCount}
          icon="🎯"
          note="كل التوقعات المسجلة من الأعضاء."
        />

        <StatCard
          title="توقعات محتسبة"
          value={overview.calculatedPredictionsCount}
          icon="🧮"
          note="توقعات دخلت في احتساب النقاط."
        />

        <StatCard
          title="توقعات معلقة"
          value={overview.pendingPredictionsCount}
          icon="⌛"
          note="توقعات تنتظر احتساب نتيجة المباراة."
        />

        <StatCard
          title="عمليات الأدمن"
          value={overview.logsCount}
          icon="📝"
          note="عدد العمليات المسجلة في سجل الأدمن."
        />
      </div>
    </section>
  );
}