"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, Plus, RefreshCw, RotateCcw, Search, ShieldCheck, XCircle } from "lucide-react";
import { auth } from "@/lib/firebase";

type DictionaryEntry = {
  word: string;
  base: boolean;
  enabled: boolean;
  overridden: boolean;
  updatedAt: number | null;
  updatedBy: string;
  note: string;
  baseMoves: number;
};

type DictionaryResponse = {
  query: string;
  baseCount: number;
  overrideCount: number;
  results: DictionaryEntry[];
};

async function authorizedFetch(url: string, init?: RequestInit) {
  const current = auth.currentUser;
  if (!current) throw new Error("سجّل الدخول بحساب الإدارة مرة أخرى.");
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${await current.getIdToken()}`);
  if (init?.body) headers.set("Content-Type", "application/json");
  return fetch(url, { ...init, headers, cache: "no-store" });
}

export default function AdminVocabularyDictionaryPanel() {
  const [data, setData] = useState<DictionaryResponse | null>(null);
  const [query, setQuery] = useState("");
  const [newWord, setNewWord] = useState("");
  const [busyWord, setBusyWord] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function load(search = query) {
    try {
      setLoading(true);
      setMessage("");
      const response = await authorizedFetch(`/api/admin/games/vocabulary-dictionary?q=${encodeURIComponent(search.trim())}`);
      const payload = await response.json().catch(() => ({})) as DictionaryResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || "تعذر تحميل القاموس.");
      setData(payload);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحميل القاموس.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setWord(word: string, enabled: boolean) {
    try {
      setBusyWord(word);
      setMessage("");
      const response = await authorizedFetch("/api/admin/games/vocabulary-dictionary", {
        method: "POST",
        body: JSON.stringify({ action: "set", word, enabled }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "تعذر تحديث الكلمة.");
      await load(query);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحديث الكلمة.");
    } finally {
      setBusyWord("");
    }
  }

  async function restoreWord(word: string) {
    try {
      setBusyWord(word);
      const response = await authorizedFetch("/api/admin/games/vocabulary-dictionary", {
        method: "POST",
        body: JSON.stringify({ action: "restore", word }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "تعذر استعادة الحالة الأصلية.");
      await load(query);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر استعادة الحالة الأصلية.");
    } finally {
      setBusyWord("");
    }
  }

  async function addWord(event: FormEvent) {
    event.preventDefault();
    const word = newWord.trim();
    if (!word) return;
    await setWord(word, true);
    setNewWord("");
    setQuery(word);
    await load(word);
  }

  return (
    <section className="space-y-4" dir="rtl">
      <div className="rounded-3xl border border-emerald-200/15 bg-emerald-950/35 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-emerald-200"><ShieldCheck className="h-4 w-4" /><span className="text-xs font-black">تحدي المفردات</span></div>
            <h3 className="mt-1 text-xl font-black text-white">إدارة قاموس اللعبة</h3>
            <p className="mt-1 text-xs font-semibold leading-6 text-slate-300">ابحث عن أي كلمة، عطّلها أو أعد اعتمادها، وأضف كلمة ثلاثية جديدة بدون تعديل الكود.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black text-white/70 disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث</button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:max-w-md">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-xl font-black text-emerald-200" dir="ltr">{data?.baseCount ?? "—"}</div><div className="mt-1 text-[10px] font-bold text-white/45">كلمة أساسية</div></div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-xl font-black text-amber-200" dir="ltr">{data?.overrideCount ?? "—"}</div><div className="mt-1 text-[10px] font-bold text-white/45">تعديل إداري</div></div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <form onSubmit={(event) => { event.preventDefault(); void load(query); }} className="flex gap-2">
            <div className="relative min-w-0 flex-1"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن كلمة مثل: ريم" className="h-12 w-full rounded-xl border border-white/10 bg-slate-950/70 pr-10 pl-3 text-sm font-bold text-white outline-none focus:border-emerald-300/50" /></div>
            <button type="submit" className="min-w-20 rounded-xl bg-emerald-300 px-3 text-sm font-black text-emerald-950">بحث</button>
          </form>
        </div>

        <form onSubmit={addWord} className="rounded-3xl border border-amber-200/15 bg-amber-300/[0.06] p-4">
          <label className="text-xs font-black text-amber-100">إضافة كلمة جديدة</label>
          <div className="mt-2 flex gap-2"><input value={newWord} onChange={(event) => setNewWord(event.target.value.slice(0, 3))} maxLength={3} placeholder="3 أحرف" className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/70 px-3 text-center text-lg font-black text-white outline-none focus:border-amber-300/50" /><button type="submit" disabled={!newWord.trim() || Boolean(busyWord)} className="grid h-12 w-12 place-items-center rounded-xl bg-amber-300 text-slate-950 disabled:opacity-40"><Plus className="h-5 w-5" /></button></div>
          <p className="mt-2 text-[10px] font-semibold leading-5 text-white/40">الإضافة تعني اعتماد الكلمة للعبة. راجع صحتها اللغوية قبل الحفظ.</p>
        </form>
      </div>

      {message ? <div className="rounded-2xl border border-rose-200/15 bg-rose-400/[0.07] p-3 text-xs font-bold text-rose-100">{message}</div> : null}

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/40">
        <div className="grid grid-cols-[minmax(90px,1fr)_90px_90px_130px] gap-2 border-b border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black text-white/45">
          <span>الكلمة</span><span>المصدر</span><span>الحالة</span><span>الإجراء</span>
        </div>
        {loading && !data ? <div className="flex min-h-40 items-center justify-center gap-2 text-xs font-black text-white/45"><LoaderCircle className="h-4 w-4 animate-spin" /> جاري التحميل…</div> : null}
        {!loading && data?.results.length === 0 ? <div className="p-8 text-center text-sm font-bold text-white/40">لا توجد كلمة مطابقة.</div> : null}
        <div className="divide-y divide-white/[0.07]">
          {data?.results.map((entry) => (
            <div key={entry.word} className="grid grid-cols-[minmax(90px,1fr)_90px_90px_130px] items-center gap-2 px-3 py-3 text-xs">
              <div><div className="text-lg font-black text-white">{entry.word}</div><div className="mt-0.5 text-[9px] font-semibold text-white/35">{entry.baseMoves} مسارات أساسية</div></div>
              <span className="text-[10px] font-bold text-white/50">{entry.base ? "أساسي" : "إضافة"}</span>
              <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black ${entry.enabled ? "bg-emerald-300/10 text-emerald-200" : "bg-rose-300/10 text-rose-200"}`}>{entry.enabled ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}{entry.enabled ? "معتمدة" : "موقوفة"}</span>
              <div className="flex items-center gap-1.5">
                <button type="button" disabled={busyWord === entry.word} onClick={() => void setWord(entry.word, !entry.enabled)} className={`min-h-10 flex-1 rounded-xl border px-2 text-[10px] font-black disabled:opacity-40 ${entry.enabled ? "border-rose-200/15 bg-rose-400/[0.06] text-rose-100" : "border-emerald-200/15 bg-emerald-300/[0.08] text-emerald-100"}`}>{entry.enabled ? "تعطيل" : "اعتماد"}</button>
                {entry.overridden ? <button type="button" title="استعادة الحالة الأصلية" aria-label={`استعادة حالة ${entry.word}`} disabled={busyWord === entry.word} onClick={() => void restoreWord(entry.word)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/55 disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" /></button> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
