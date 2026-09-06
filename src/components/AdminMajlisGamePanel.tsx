"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AudioLines,
  CheckCircle2,
  Download,
  FileUp,
  Layers3,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import type { MajlisCategory, MajlisDifficulty, MajlisQuestion, MajlisQuestionType, MajlisSettings } from "@/types/majlisGame";

type CategorySummary = MajlisCategory & { totalQuestions: number; activeQuestions: number; easy: number; medium: number; hard: number; audio: number };
type AdminResponse = { settings: MajlisSettings; categories: CategorySummary[]; questions: MajlisQuestion[]; total: number; page: number; pageSize: number; pages: number; error?: string };

type QuestionDraft = {
  id: string; categoryId: string; groupKey: string; prompt: string; answer: string; optionsText: string;
  difficulty: MajlisDifficulty; points: number; hint: string; explanation: string; sourceLabel: string;
  type: MajlisQuestionType; quoteText: string; speechText: string; speechLang: string; audioUrl: string; audioFallbackUrl: string; audioStartSeconds: number; audioMaxSeconds: number; reciterName: string; enabled: boolean; custom: boolean;
};

type CategoryDraft = { id: string; title: string; shortTitle: string; description: string; icon: string; accent: string; sortOrder: number; enabled: boolean; custom: boolean };

const EMPTY_QUESTION: QuestionDraft = { id: "", categoryId: "", groupKey: "", prompt: "", answer: "", optionsText: "", difficulty: "medium", points: 200, hint: "", explanation: "", sourceLabel: "", type: "text", quoteText: "", speechText: "", speechLang: "", audioUrl: "", audioFallbackUrl: "", audioStartSeconds: 0, audioMaxSeconds: 15, reciterName: "", enabled: true, custom: true };
const EMPTY_CATEGORY: CategoryDraft = { id: "", title: "", shortTitle: "", description: "", icon: "🧠", accent: "#d6b16b", sortOrder: 500, enabled: true, custom: true };

async function authorizedFetch(url: string, init?: RequestInit) {
  const current = auth.currentUser;
  if (!current) throw new Error("سجّل الدخول بحساب الإدارة مرة أخرى.");
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${await current.getIdToken()}`);
  if (init?.body) headers.set("Content-Type", "application/json");
  return fetch(url, { ...init, headers, cache: "no-store" });
}

function questionDraft(question?: MajlisQuestion): QuestionDraft {
  if (!question) return { ...EMPTY_QUESTION };
  return {
    id: question.id, categoryId: question.categoryId, groupKey: question.groupKey, prompt: question.prompt, answer: question.answer,
    optionsText: (question.options || []).join("\n"), difficulty: question.difficulty, points: question.points, hint: question.hint || "",
    explanation: question.explanation || "", sourceLabel: question.sourceLabel || "", type: question.type, quoteText: question.quoteText || "", speechText: question.speechText || "", speechLang: question.speechLang || "", audioUrl: question.audioUrl || "", audioFallbackUrl: question.audioFallbackUrl || "", audioStartSeconds: question.audioStartSeconds || 0,
    audioMaxSeconds: question.audioMaxSeconds || 15, reciterName: question.reciterName || "", enabled: question.enabled, custom: question.custom === true,
  };
}

function categoryDraft(category?: CategorySummary): CategoryDraft {
  if (!category) return { ...EMPTY_CATEGORY };
  return { id: category.id, title: category.title, shortTitle: category.shortTitle, description: category.description, icon: category.icon, accent: category.accent, sortOrder: category.sortOrder, enabled: category.enabled, custom: category.custom === true };
}

export default function AdminMajlisGamePanel() {
  const [data, setData] = useState<AdminResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<QuestionDraft>({ ...EMPTY_QUESTION });
  const [catDraft, setCatDraft] = useState<CategoryDraft>({ ...EMPTY_CATEGORY });

  const load = useCallback(async (targetPage = page) => {
    try {
      setLoading(true); setMessage("");
      const params = new URLSearchParams({ page: String(targetPage), pageSize: "50" });
      if (query.trim()) params.set("q", query.trim());
      if (categoryFilter) params.set("category", categoryFilter);
      if (difficultyFilter) params.set("difficulty", difficultyFilter);
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      const response = await authorizedFetch(`/api/admin/games/majlis?${params}`);
      const payload = await response.json().catch(() => ({})) as AdminResponse;
      if (!response.ok) throw new Error(payload.error || "تعذر تحميل إدارة المجلس.");
      setData(payload); setPage(payload.page);
      if (!draft.categoryId && payload.categories[0]) setDraft((current) => ({ ...current, categoryId: payload.categories[0].id }));
    } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر تحميل إدارة المجلس."); }
    finally { setLoading(false); }
  }, [page, query, categoryFilter, difficultyFilter, typeFilter, statusFilter, draft.categoryId]);

  useEffect(() => { void load(1); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function post(body: Record<string, unknown>) {
    const response = await authorizedFetch("/api/admin/games/majlis", { method: "POST", body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new Error(payload.error || "تعذر حفظ التعديل.");
    return payload;
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault(); if (!data) return;
    try { setBusy(true); await post({ action: "save_settings", settings: data.settings }); setMessage("تم حفظ إعدادات المجلس."); await load(page); }
    catch (error) { setMessage(error instanceof Error ? error.message : "تعذر الحفظ."); }
    finally { setBusy(false); }
  }

  async function saveQuestion(event: FormEvent) {
    event.preventDefault();
    try {
      setBusy(true); setMessage("");
      await post({ action: "save_question", question: { ...draft, options: draft.optionsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) } });
      setMessage(draft.id ? "تم تحديث السؤال." : "تمت إضافة السؤال.");
      setDraft((current) => ({ ...EMPTY_QUESTION, categoryId: current.categoryId || data?.categories[0]?.id || "" }));
      await load(1);
    } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر حفظ السؤال."); }
    finally { setBusy(false); }
  }

  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    try { setBusy(true); await post({ action: "save_category", category: catDraft }); setMessage(catDraft.id ? "تم تحديث الفئة." : "تمت إضافة الفئة."); setCatDraft({ ...EMPTY_CATEGORY }); await load(1); }
    catch (error) { setMessage(error instanceof Error ? error.message : "تعذر حفظ الفئة."); }
    finally { setBusy(false); }
  }

  async function toggleQuestion(question: MajlisQuestion) {
    try { setBusy(true); await post({ action: "save_question", question: { ...question, enabled: !question.enabled } }); await load(page); }
    catch (error) { setMessage(error instanceof Error ? error.message : "تعذر تحديث السؤال."); }
    finally { setBusy(false); }
  }

  async function restoreQuestion(question: MajlisQuestion) {
    try { setBusy(true); await post({ action: "restore_question", id: question.id }); await load(page); }
    catch (error) { setMessage(error instanceof Error ? error.message : "تعذر استعادة السؤال."); }
    finally { setBusy(false); }
  }

  async function deleteCustomQuestion(question: MajlisQuestion) {
    if (!confirm(`حذف السؤال «${question.prompt.slice(0, 50)}»؟`)) return;
    try { setBusy(true); await post({ action: "delete_custom_question", id: question.id }); await load(page); }
    catch (error) { setMessage(error instanceof Error ? error.message : "تعذر حذف السؤال."); }
    finally { setBusy(false); }
  }

  async function restoreCategory(category: CategorySummary) {
    try {
      setBusy(true);
      await post({ action: "restore_category", id: category.id });
      setCatDraft({ ...EMPTY_CATEGORY });
      setMessage("تمت استعادة إعدادات الفئة الأصلية.");
      await load(page);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر استعادة الفئة.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCustomCategory(category: CategorySummary) {
    if (!confirm(`حذف فئة «${category.title}»؟ لن تُحذف أسئلتها المخصصة تلقائيًا.`)) return;
    try {
      setBusy(true);
      await post({ action: "delete_custom_category", id: category.id });
      setCatDraft({ ...EMPTY_CATEGORY });
      setMessage("تم حذف الفئة المخصصة.");
      await load(1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حذف الفئة.");
    } finally {
      setBusy(false);
    }
  }

  async function exportBank() {
    try {
      const response = await authorizedFetch("/api/admin/games/majlis?mode=export");
      if (!response.ok) throw new Error("تعذر تصدير البنك.");
      const payload = await response.json();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `majlis-bank-${new Date().toISOString().slice(0,10)}.json`; anchor.click(); URL.revokeObjectURL(url);
    } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر التصدير."); }
  }

  async function importBank(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    try {
      setBusy(true); const text = await file.text(); const parsed = JSON.parse(text) as { questions?: unknown[] } | unknown[];
      const questions = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(questions)) throw new Error("الملف لا يحتوي مصفوفة questions صالحة.");
      const response = await authorizedFetch("/api/admin/games/majlis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bulk_import", questions }) });
      const payload = await response.json().catch(() => ({})) as { imported?: number; error?: string };
      if (!response.ok) throw new Error(payload.error || "تعذر الاستيراد."); setMessage(`تم استيراد ${payload.imported || 0} سؤال.`); await load(1);
    } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر استيراد الملف."); }
    finally { setBusy(false); }
  }

  const totalActive = useMemo(() => data?.categories.reduce((sum, category) => sum + category.activeQuestions, 0) || 0, [data]);

  return (
    <section className="space-y-5" dir="rtl">
      <div className="rounded-3xl border border-[#d6b16b]/20 bg-[#183a34]/55 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="flex items-center gap-2 text-[#ead8ad]"><ShieldCheck className="h-4 w-4" /><span className="text-xs font-black">مجلس التحدي</span></div><h3 className="mt-1 text-xl font-black text-white">إدارة كاملة لبنك الأسئلة</h3><p className="mt-1 max-w-2xl text-xs font-semibold leading-6 text-slate-300">فئات، أسئلة، أصوات، مستويات، نقاط، تلميحات ومصادر. الأسئلة الأساسية تبقى محفوظة ويمكن تعطيلها أو تعديلها من هنا.</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={exportBank} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black text-white/70"><Download className="h-4 w-4" /> تصدير JSON</button><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black text-white/70"><FileUp className="h-4 w-4" /> استيراد JSON<input type="file" accept="application/json,.json" onChange={importBank} className="hidden" /></label><button type="button" onClick={() => void load(page)} disabled={loading} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/60"><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /></button></div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 md:max-w-xl"><div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-xl font-black text-[#ead8ad]" dir="ltr">{data?.categories.length ?? "—"}</div><div className="mt-1 text-[10px] font-bold text-white/40">فئات</div></div><div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-xl font-black text-emerald-200" dir="ltr">{totalActive || "—"}</div><div className="mt-1 text-[10px] font-bold text-white/40">سؤال نشط</div></div><div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-xl font-black text-cyan-200" dir="ltr">{data?.categories.find((item) => item.id === "reciter")?.audio ?? "—"}</div><div className="mt-1 text-[10px] font-bold text-white/40">سؤال صوتي</div></div></div>
      </div>

      {message ? <div className="rounded-2xl border border-amber-200/15 bg-amber-300/[0.07] p-3 text-xs font-bold leading-6 text-amber-50">{message}</div> : null}

      {data ? <form onSubmit={saveSettings} className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-5"><div className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-amber-300"/><h4 className="font-black">إعدادات الجلسة</h4></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
        ["categoriesPerGame","عدد الفئات",4,8],["questionSeconds","وقت السؤال",10,90],["stealSeconds","وقت الفزعة",5,30],["easyPoints","نقاط السهل",50,1000],["mediumPoints","نقاط المتوسط",50,1000],["hardPoints","نقاط الصعب",50,1000],
      ].map(([key,label,min,max]) => <label key={String(key)} className="text-xs font-black text-white/65">{label}<input type="number" min={Number(min)} max={Number(max)} value={Number(data.settings[key as keyof MajlisSettings])} onChange={(event) => setData((current) => current ? { ...current, settings: { ...current.settings, [key]: Number(event.target.value) } } : current)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 font-bold text-white outline-none" /></label>)}</div><div className="mt-3 flex flex-wrap gap-4">{[["allowSteal","تفعيل الفزعة"],["showExplanations","عرض المعلومة بعد الإجابة"]].map(([key,label]) => <label key={key} className="flex items-center gap-2 text-xs font-black text-white/65"><input type="checkbox" checked={Boolean(data.settings[key as keyof MajlisSettings])} onChange={(event) => setData((current) => current ? { ...current, settings: { ...current.settings, [key]: event.target.checked } } : current)} className="h-4 w-4" />{label}</label>)}</div><button type="submit" disabled={busy} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-300 px-4 text-xs font-black text-slate-950 disabled:opacity-50"><Save className="h-4 w-4" /> حفظ الإعدادات</button></form> : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-[#ead8ad]"/><h4 className="font-black">الفئات</h4></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data?.categories.map((category) => (
                <div key={category.id} className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                  <button type="button" onClick={() => setCatDraft(categoryDraft(category))} className="w-full text-right transition hover:opacity-90">
                    <div className="flex items-start justify-between"><span className="text-xl">{category.icon}</span><span className={`rounded-full px-2 py-1 text-[9px] font-black ${category.enabled ? "bg-emerald-300/10 text-emerald-200" : "bg-rose-300/10 text-rose-200"}`}>{category.enabled ? "نشطة" : "موقوفة"}</span></div>
                    <div className="mt-2 text-sm font-black">{category.title}</div>
                    <div className="mt-1 text-[9px] font-bold text-white/35" dir="ltr">{category.activeQuestions}/{category.totalQuestions} سؤال</div>
                  </button>
                  {(category.custom || category.overridden) ? <div className="mt-2 flex gap-1.5 border-t border-white/[0.06] pt-2">
                    {category.overridden && !category.custom ? <button type="button" disabled={busy} onClick={() => void restoreCategory(category)} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 text-[9px] font-black text-white/55"><RotateCcw className="h-3.5 w-3.5"/> استعادة الأصل</button> : null}
                    {category.custom ? <button type="button" disabled={busy} onClick={() => void deleteCustomCategory(category)} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-xl border border-rose-300/10 bg-rose-400/[0.05] text-[9px] font-black text-rose-200"><Trash2 className="h-3.5 w-3.5"/> حذف الفئة</button> : null}
                  </div> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4"><form onSubmit={(event) => { event.preventDefault(); setPage(1); void load(1); }} className="grid gap-2 lg:grid-cols-[1fr_170px_130px_130px_130px_auto]"><div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="بحث في السؤال أو الإجابة…" className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 pr-9 pl-3 text-xs font-bold text-white outline-none"/></div><select value={categoryFilter} onChange={(e)=>setCategoryFilter(e.target.value)} className="h-11 rounded-xl border border-white/10 bg-slate-950/60 px-2 text-xs font-bold text-white"><option value="">كل الفئات</option>{data?.categories.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select><select value={difficultyFilter} onChange={(e)=>setDifficultyFilter(e.target.value)} className="h-11 rounded-xl border border-white/10 bg-slate-950/60 px-2 text-xs font-bold text-white"><option value="">كل الصعوبات</option><option value="easy">سهل</option><option value="medium">متوسط</option><option value="hard">صعب</option></select><select value={typeFilter} onChange={(e)=>setTypeFilter(e.target.value)} className="h-11 rounded-xl border border-white/10 bg-slate-950/60 px-2 text-xs font-bold text-white"><option value="">كل الأنواع</option><option value="text">نصي</option><option value="multiple_choice">خيارات</option><option value="audio">ملف صوتي</option><option value="speech">نطق / لغة ولهجة</option></select><select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="h-11 rounded-xl border border-white/10 bg-slate-950/60 px-2 text-xs font-bold text-white"><option value="">كل الحالات</option><option value="enabled">نشط</option><option value="disabled">موقوف</option></select><button className="h-11 rounded-xl bg-amber-300 px-4 text-xs font-black text-slate-950">بحث</button></form></div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/35"><div className="divide-y divide-white/[0.07]">{loading ? <div className="flex min-h-40 items-center justify-center gap-2 text-xs font-black text-white/40"><LoaderCircle className="h-4 w-4 animate-spin"/> جاري التحميل…</div> : data?.questions.map((question) => <div key={question.id} className="grid gap-3 p-3 md:grid-cols-[1fr_auto] md:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><span className={`rounded-full px-2 py-1 text-[9px] font-black ${question.enabled ? "bg-emerald-300/10 text-emerald-200" : "bg-rose-300/10 text-rose-200"}`}>{question.enabled ? "نشط" : "موقوف"}</span><span className="rounded-full bg-white/[0.05] px-2 py-1 text-[9px] font-black text-white/40">{question.difficulty}</span>{question.type === "audio" ? <AudioLines className="h-3.5 w-3.5 text-cyan-200"/> : null}</div><div className="mt-2 text-sm font-black leading-6 text-white">{question.prompt}</div><div className="mt-1 text-[10px] font-bold text-amber-100/60">الإجابة: {question.answer}</div></div><div className="flex gap-1.5"><button type="button" onClick={()=>setDraft(questionDraft(question))} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/60"><Pencil className="h-4 w-4"/></button><button type="button" onClick={()=>void toggleQuestion(question)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/60">{question.enabled ? <XCircle className="h-4 w-4 text-rose-200"/> : <CheckCircle2 className="h-4 w-4 text-emerald-200"/>}</button>{question.custom ? <button type="button" onClick={()=>void deleteCustomQuestion(question)} className="grid h-10 w-10 place-items-center rounded-xl border border-rose-200/10 bg-rose-400/[0.05] text-rose-200"><Trash2 className="h-4 w-4"/></button> : question.overridden ? <button type="button" onClick={()=>void restoreQuestion(question)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/50"><RotateCcw className="h-4 w-4"/></button> : null}</div></div>)}</div><div className="flex items-center justify-between border-t border-white/10 p-3 text-[10px] font-black text-white/45"><span dir="ltr">{data?.total || 0} سؤال</span><div className="flex items-center gap-2"><button disabled={page<=1} onClick={()=>{setPage(page-1);void load(page-1)}} className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-25">السابق</button><span dir="ltr">{page}/{data?.pages || 1}</span><button disabled={page>= (data?.pages || 1)} onClick={()=>{setPage(page+1);void load(page+1)}} className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-25">التالي</button></div></div></div>
        </div>

        <div className="space-y-4">
          <form onSubmit={saveQuestion} className="rounded-3xl border border-amber-200/15 bg-amber-300/[0.05] p-4"><div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-black text-amber-200">{draft.id ? "تعديل" : "إضافة"}</p><h4 className="mt-1 font-black">سؤال المجلس</h4></div><button type="button" onClick={()=>setDraft({ ...EMPTY_QUESTION, categoryId:data?.categories[0]?.id || "" })} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5"><Plus className="h-4 w-4"/></button></div><div className="mt-3 space-y-2"><select value={draft.categoryId} onChange={(e)=>setDraft({...draft,categoryId:e.target.value})} className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-xs font-bold text-white"><option value="">اختر الفئة</option>{data?.categories.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select><textarea value={draft.prompt} onChange={(e)=>setDraft({...draft,prompt:e.target.value})} rows={3} placeholder="نص السؤال" className="w-full rounded-xl border border-white/10 bg-slate-950/70 p-3 text-xs font-bold text-white outline-none"/><input value={draft.answer} onChange={(e)=>setDraft({...draft,answer:e.target.value})} placeholder="الإجابة الصحيحة" className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-xs font-bold text-white"/><div className="grid grid-cols-2 gap-2"><select value={draft.difficulty} onChange={(e)=>setDraft({...draft,difficulty:e.target.value as MajlisDifficulty,points:e.target.value==='hard'?300:e.target.value==='medium'?200:100})} className="h-11 rounded-xl border border-white/10 bg-slate-950/70 px-2 text-xs font-bold text-white"><option value="easy">سهل</option><option value="medium">متوسط</option><option value="hard">صعب</option></select><select value={draft.type} onChange={(e)=>setDraft({...draft,type:e.target.value as MajlisQuestionType})} className="h-11 rounded-xl border border-white/10 bg-slate-950/70 px-2 text-xs font-bold text-white"><option value="text">نصي</option><option value="multiple_choice">خيارات</option><option value="audio">ملف صوتي</option><option value="speech">نطق / لغة ولهجة</option></select></div><textarea value={draft.quoteText} onChange={(e)=>setDraft({...draft,quoteText:e.target.value})} rows={2} placeholder="نص مقتبس يظهر في بطاقة مستقلة (اختياري، مناسب لأسئلة القرآن)" className="w-full rounded-xl border border-[#d6b16b]/15 bg-slate-950/70 p-3 text-xs font-bold text-white outline-none"/>{draft.type==='speech'?<div className="grid grid-cols-[1fr_120px] gap-2"><input value={draft.speechText} onChange={(e)=>setDraft({...draft,speechText:e.target.value})} placeholder="النص الذي سيُنطق" className="h-11 rounded-xl border border-cyan-200/15 bg-slate-950/70 px-3 text-xs font-bold text-white"/><input value={draft.speechLang} onChange={(e)=>setDraft({...draft,speechLang:e.target.value})} placeholder="ar-SA" dir="ltr" className="h-11 rounded-xl border border-cyan-200/15 bg-slate-950/70 px-3 text-xs font-bold text-white"/></div>:null}<textarea value={draft.optionsText} onChange={(e)=>setDraft({...draft,optionsText:e.target.value})} rows={3} placeholder={'الخيارات — خيار في كل سطر'} className="w-full rounded-xl border border-white/10 bg-slate-950/70 p-3 text-xs font-bold text-white"/><input value={draft.hint} onChange={(e)=>setDraft({...draft,hint:e.target.value})} placeholder="التلميح / المشورة" className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-xs font-bold text-white"/><textarea value={draft.explanation} onChange={(e)=>setDraft({...draft,explanation:e.target.value})} rows={2} placeholder="معلومة إضافية بعد الإجابة" className="w-full rounded-xl border border-white/10 bg-slate-950/70 p-3 text-xs font-bold text-white"/><input value={draft.sourceLabel} onChange={(e)=>setDraft({...draft,sourceLabel:e.target.value})} placeholder="المصدر" className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-xs font-bold text-white"/>{draft.type==='audio'?<><input value={draft.audioUrl} onChange={(e)=>setDraft({...draft,audioUrl:e.target.value})} placeholder="رابط ملف الصوت https://..." dir="ltr" className="h-11 w-full rounded-xl border border-cyan-200/15 bg-slate-950/70 px-3 text-xs font-bold text-white"/><input value={draft.audioFallbackUrl} onChange={(e)=>setDraft({...draft,audioFallbackUrl:e.target.value})} placeholder="رابط احتياطي للصوت (اختياري)" dir="ltr" className="h-11 w-full rounded-xl border border-cyan-200/15 bg-slate-950/70 px-3 text-xs font-bold text-white"/><div className="grid grid-cols-2 gap-2"><label className="text-[10px] font-black text-white/55">ابدأ من الثانية<input type="number" min={0} value={draft.audioStartSeconds} onChange={(e)=>setDraft({...draft,audioStartSeconds:Number(e.target.value)})} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-xs font-bold text-white"/></label><label className="text-[10px] font-black text-white/55">مدة المقطع<input type="number" min={4} max={20} value={draft.audioMaxSeconds} onChange={(e)=>setDraft({...draft,audioMaxSeconds:Number(e.target.value)})} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-xs font-bold text-white"/></label></div><input value={draft.reciterName} onChange={(e)=>setDraft({...draft,reciterName:e.target.value})} placeholder="اسم القارئ للإدارة" className="h-11 w-full rounded-xl border border-cyan-200/15 bg-slate-950/70 px-3 text-xs font-bold text-white"/></>:null}<label className="flex items-center gap-2 text-xs font-black text-white/60"><input type="checkbox" checked={draft.enabled} onChange={(e)=>setDraft({...draft,enabled:e.target.checked})}/> السؤال نشط</label></div><button type="submit" disabled={busy} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 text-xs font-black text-slate-950 disabled:opacity-40"><Save className="h-4 w-4"/> حفظ السؤال</button></form>

          <form onSubmit={saveCategory} className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-[9px] font-black text-[#ead8ad]">{catDraft.id ? "تعديل الفئة" : "إضافة فئة"}</p><h4 className="mt-1 font-black">إدارة فئة</h4></div>
              <button type="button" onClick={() => setCatDraft({ ...EMPTY_CATEGORY })} className="text-[10px] font-black text-amber-200">فئة جديدة</button>
            </div>
            <div className="mt-3 space-y-2">
              <input value={catDraft.title} onChange={(e)=>setCatDraft({...catDraft,title:e.target.value})} placeholder="اسم الفئة" className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-xs font-bold text-white"/>
              <input value={catDraft.shortTitle} onChange={(e)=>setCatDraft({...catDraft,shortTitle:e.target.value})} placeholder="الاسم المختصر" className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-xs font-bold text-white"/>
              <div className="grid grid-cols-[72px_1fr] gap-2"><input value={catDraft.icon} onChange={(e)=>setCatDraft({...catDraft,icon:e.target.value})} placeholder="🎯" className="h-11 rounded-xl border border-white/10 bg-slate-950/60 px-2 text-center text-lg"/><input value={catDraft.description} onChange={(e)=>setCatDraft({...catDraft,description:e.target.value})} placeholder="وصف مختصر" className="h-11 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-xs font-bold text-white"/></div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] font-black text-white/55">لون الفئة<input type="color" value={catDraft.accent} onChange={(e)=>setCatDraft({...catDraft,accent:e.target.value})} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 p-1"/></label>
                <label className="text-[10px] font-black text-white/55">ترتيب الظهور<input type="number" min={0} max={9999} value={catDraft.sortOrder} onChange={(e)=>setCatDraft({...catDraft,sortOrder:Number(e.target.value)})} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-xs font-bold text-white"/></label>
              </div>
              <label className="flex items-center gap-2 text-xs font-black text-white/60"><input type="checkbox" checked={catDraft.enabled} onChange={(e)=>setCatDraft({...catDraft,enabled:e.target.checked})}/> الفئة نشطة</label>
            </div>
            <button type="submit" disabled={busy || !catDraft.title.trim()} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] text-xs font-black text-white disabled:opacity-40"><Save className="h-4 w-4"/> حفظ الفئة</button>
          </form>
        </div>
      </div>
    </section>
  );
}
