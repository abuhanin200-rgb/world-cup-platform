"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Link2, Loader2, RefreshCw, ShieldCheck, WifiOff } from "lucide-react";
import { getGulfCup27AdminHealth, type GulfCup27Health } from "@/lib/adminTournamentHealthApi";

function Metric({ label, value, tone = "normal" }: { label: string; value: number; tone?: "normal" | "good" | "warn" }) {
  const cls = tone === "good" ? "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-100" : tone === "warn" ? "border-amber-300/15 bg-amber-300/[0.06] text-amber-100" : "border-white/10 bg-white/[0.04] text-white";
  return <div className={`rounded-2xl border p-4 ${cls}`}><div className="text-[11px] font-bold opacity-65">{label}</div><div className="mt-1 text-2xl font-black tabular-nums">{value.toLocaleString("ar-SA")}</div></div>;
}

export default function AdminTournamentHealthPanel() {
  const [data, setData] = useState<GulfCup27Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() { try { setLoading(true); setError(""); setData(await getGulfCup27AdminHealth()); } catch (e) { setError(e instanceof Error ? e.message : "تعذر فحص حالة البطولة"); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  const issues = useMemo(() => data ? [
    ["مباريات غير مربوطة بالمصدر", data.counts.unlinkedFixtures],
    ["تعارضات الربط", data.counts.conflicts],
    ["معرفات مباريات مكررة", data.issues.duplicateMatchIds.length],
    ["توقعات مكررة", data.issues.duplicatePredictionKeys.length],
    ["نوافذ توقع تحتاج مراجعة", data.issues.predictionWindowMatchIds.length],
    ["منتخبات ناقصة", data.issues.missingTeamIds.length],
    ["مباريات ناقصة", data.issues.missingMatchIds.length],
  ] as const : [], [data]);
  const issueCount = issues.reduce((sum, [, count]) => sum + count, 0);
  if (loading && !data) return <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-sm font-bold text-slate-300"><Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin"/>جاري فحص حالة البطولة...</div>;
  return <section className="mt-5 space-y-4" dir="rtl">
    <div className="rounded-[28px] border border-white/10 bg-slate-950/45 p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${issueCount ? "bg-amber-300/10 text-amber-200" : "bg-emerald-300/10 text-emerald-200"}`}>{issueCount ? <AlertTriangle/> : <ShieldCheck/>}</span><div><h3 className="text-lg font-black">صحة البطولة</h3><p className="mt-1 text-xs leading-6 text-slate-400">فحص سريع للربط والبيانات والتوقعات قبل أن تتحول المشكلة إلى خطأ ظاهر للمستخدم.</p></div></div><button onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}/>فحص الآن</button></div>
      {error ? <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">{error}</div> : null}
      {data ? <><div className={`mt-4 flex items-center gap-2 rounded-2xl border p-3 text-sm font-black ${issueCount ? "border-amber-300/20 bg-amber-300/[0.07] text-amber-100" : "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100"}`}>{issueCount ? <AlertTriangle className="h-4 w-4"/> : <CheckCircle2 className="h-4 w-4"/>}{issueCount ? `يوجد ${issueCount} تنبيه يحتاج مراجعة` : "لا توجد مشاكل ظاهرة في الفحص الحالي"}</div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4"><Metric label="المباريات" value={data.counts.matches}/><Metric label="المربوطة بالمصدر" value={data.counts.linkedFixtures} tone="good"/><Metric label="غير المربوطة" value={data.counts.unlinkedFixtures} tone={data.counts.unlinkedFixtures ? "warn" : "good"}/><Metric label="المحتسبة" value={data.counts.calculated} tone="good"/></div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">{issues.map(([label,count]) => <div key={label} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-bold ${count ? "border-amber-300/15 bg-amber-300/[0.05] text-amber-100" : "border-white/[0.07] bg-black/10 text-slate-400"}`}><span>{label}</span><span className="tabular-nums">{count.toLocaleString("ar-SA")}</span></div>)}</div>
      <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold"><span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${data.sports.configured && data.sports.enabled ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" : "border-red-300/20 bg-red-300/10 text-red-100"}`}>{data.sports.configured && data.sports.enabled ? <Link2 className="h-3.5 w-3.5"/> : <WifiOff className="h-3.5 w-3.5"/>}{data.sports.configured && data.sports.enabled ? "مصدر البيانات متصل" : "مصدر البيانات يحتاج مراجعة"}</span>{data.sports.lastError ? <span className="rounded-full border border-red-300/20 bg-red-300/10 px-3 py-1.5 text-red-100">آخر مزامنة بها خطأ</span> : null}</div></> : null}
    </div>
  </section>;
}
