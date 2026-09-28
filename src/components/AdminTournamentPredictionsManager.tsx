"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Eye, Loader2, LockKeyhole, Pencil, RefreshCw, Search, Trash2, UnlockKeyhole, UsersRound, X } from "lucide-react";
import TeamFlag from "@/components/TeamFlag";
import type { TournamentQualificationMethod } from "@/domain/tournaments";
import { addAdminLog } from "@/lib/adminLogs";
import { getTournamentV2AdminSnapshot } from "@/lib/tournamentV2Admin";
import {
  deleteAdminTournamentMatchPredictionsV2,
  deleteAdminTournamentPredictionV2,
  getAdminTournamentPredictionsV2,
  setAllTournamentPredictionEditingV2,
  setTournamentPredictionEditingV2,
  updateAdminTournamentPredictionV2,
  type AdminTournamentPredictionV2,
} from "@/lib/tournamentPredictionsAdminV2";
import type { TournamentMatchV2, TournamentTeamV2 } from "@/domain/tournaments";

const DATE_LOCALE = "ar-SA-u-ca-gregory-nu-latn";
const PAGE_SIZE = 20;

type Draft = { home: string; away: string; qualifiedTeamId: string; qualificationMethod: TournamentQualificationMethod | "" };

function TeamScore({ name, flagCode, score }: { name: string; flagCode?: string; score: number | string }) {
  return (
    <div className="flex min-w-[112px] items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-2.5 py-2" dir="rtl">
      <span className="flex min-w-0 items-center gap-1.5">
        <TeamFlag code={flagCode} name={name} size="sm" />
        <span className="max-w-[86px] truncate text-[11px] font-bold text-slate-200">{name}</span>
      </span>
      <strong dir="ltr" className="shrink-0 text-base font-black tabular-nums text-white [unicode-bidi:isolate]">{score}</strong>
    </div>
  );
}

function formatDate(timestamp: number) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat(DATE_LOCALE, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Riyadh" }).format(new Date(timestamp));
}

export default function AdminTournamentPredictionsManager({ tournamentId, tournamentLabel }: { tournamentId: string; tournamentLabel: string }) {
  const [predictions, setPredictions] = useState<AdminTournamentPredictionV2[]>([]);
  const [matches, setMatches] = useState<TournamentMatchV2[]>([]);
  const [teams, setTeams] = useState<TournamentTeamV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [search, setSearch] = useState("");
  const [matchFilter, setMatchFilter] = useState("all");
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState<Draft>({ home: "", away: "", qualifiedTeamId: "", qualificationMethod: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const teamMap = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const matchMap = useMemo(() => new Map(matches.map((match) => [match.id, match])), [matches]);

  async function load() {
    setLoading(true); setError("");
    try {
      const [rows, snapshot] = await Promise.all([
        getAdminTournamentPredictionsV2(tournamentId),
        getTournamentV2AdminSnapshot(tournamentId),
      ]);
      setPredictions(rows); setMatches(snapshot.matches); setTeams(snapshot.teams);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل توقعات البطولة");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [tournamentId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return predictions.filter((item) => {
      if (matchFilter !== "all" && item.matchId !== matchFilter) return false;
      if (!q) return true;
      const match = item.match;
      const home = match ? teamMap.get(match.homeTeamId)?.nameAr || match.homeSourceLabel || "" : "";
      const away = match ? teamMap.get(match.awayTeamId)?.nameAr || match.awaySourceLabel || "" : "";
      return `${item.userName || ""} ${item.userId} ${home} ${away}`.toLowerCase().includes(q);
    });
  }, [predictions, matchFilter, search, teamMap]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, matchFilter, tournamentId]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  function startEdit(row: AdminTournamentPredictionV2) {
    setEditingId(row.id);
    setDraft({ home: String(row.homeScore), away: String(row.awayScore), qualifiedTeamId: row.qualifiedTeamId || "", qualificationMethod: row.qualificationMethod || "" });
  }

  async function saveEdit(row: AdminTournamentPredictionV2) {
    setWorking(`edit-${row.id}`); setError(""); setMessage("");
    try {
      const home = Number(draft.home), away = Number(draft.away);
      await updateAdminTournamentPredictionV2({ predictionId: row.id, homeScore: home, awayScore: away, qualifiedTeamId: draft.qualifiedTeamId || null, qualificationMethod: draft.qualificationMethod || null });
      await addAdminLog({ action: "other", title: `تعديل توقع في ${tournamentLabel}`, description: `تم تعديل توقع ${row.userName || row.userId}.`, metadata: { tournamentId, predictionId: row.id, matchId: row.matchId } });
      setEditingId(""); setMessage("تم تعديل التوقع."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر تعديل التوقع"); }
    finally { setWorking(""); }
  }

  async function remove(row: AdminTournamentPredictionV2) {
    if (!window.confirm(`حذف توقع ${row.userName || row.userId}؟`)) return;
    setWorking(`delete-${row.id}`); setError(""); setMessage("");
    try {
      await deleteAdminTournamentPredictionV2(row.id);
      await addAdminLog({ action: "other", title: `حذف توقع من ${tournamentLabel}`, description: `تم حذف توقع ${row.userName || row.userId}.`, metadata: { tournamentId, predictionId: row.id, matchId: row.matchId } });
      setMessage("تم حذف التوقع."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر حذف التوقع"); }
    finally { setWorking(""); }
  }

  async function toggleEdit(match: TournamentMatchV2, open: boolean) {
    setWorking(`lock-${match.id}`); setError(""); setMessage("");
    try {
      await setTournamentPredictionEditingV2(tournamentId, match.id, open);
      setMessage(open ? "تم فتح تعديل التوقعات لهذه المباراة." : "تم إغلاق تعديل التوقعات لهذه المباراة."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر تحديث تعديل التوقعات"); }
    finally { setWorking(""); }
  }

  async function toggleAllEdits(open: boolean) {
    setWorking("all-edits"); setError(""); setMessage("");
    try { const count = await setAllTournamentPredictionEditingV2(tournamentId, open); setMessage(`${open ? "تم فتح" : "تم إغلاق"} تعديل التوقعات في ${count} مباراة.`); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "تعذر تحديث تعديل التوقعات"); }
    finally { setWorking(""); }
  }

  async function removeMatchPredictions(matchId: string) {
    const match = matchMap.get(matchId);
    if (!window.confirm(`حذف جميع التوقعات غير المحتسبة${match ? ` لمباراة ${teamMap.get(match.homeTeamId)?.nameAr || ""} × ${teamMap.get(match.awayTeamId)?.nameAr || ""}` : ""}؟`)) return;
    setWorking(`clear-${matchId}`); setError(""); setMessage("");
    try { const count = await deleteAdminTournamentMatchPredictionsV2(tournamentId, matchId); setMessage(`تم حذف ${count} توقع.`); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "تعذر حذف توقعات المباراة"); }
    finally { setWorking(""); }
  }

  if (loading) return <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/45 p-7 text-center text-slate-300"><Loader2 className="mx-auto h-6 w-6 animate-spin"/><p className="mt-2 text-sm font-bold">جاري تحميل توقعات الأعضاء…</p></div>;

  return <section className="mt-5 rounded-3xl border border-white/10 bg-slate-950/35 p-4 md:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-black text-emerald-200">توقعات الأعضاء</p><h3 className="mt-1 text-lg font-black">{tournamentLabel}</h3><p className="mt-1 text-xs font-semibold text-slate-400">عرض التوقعات وتعديلها وإدارتها.</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={()=>void toggleAllEdits(true)} disabled={Boolean(working)} className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-emerald-400 px-3 text-xs font-black text-slate-950 disabled:opacity-50"><UnlockKeyhole className="h-4 w-4"/>فتح تعديل الكل</button><button onClick={()=>void toggleAllEdits(false)} disabled={Boolean(working)} className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 text-xs font-black text-amber-100 disabled:opacity-50"><LockKeyhole className="h-4 w-4"/>إغلاق تعديل الكل</button><button onClick={()=>void load()} className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-black"><RefreshCw className="h-4 w-4"/>تحديث</button></div>
    </div>

    {(message||error) && <div role={error?"alert":"status"} className={`mt-3 rounded-xl border px-3 py-2 text-xs font-black ${error?"border-red-300/20 bg-red-400/10 text-red-100":"border-emerald-300/20 bg-emerald-300/10 text-emerald-100"}`}>{error||message}</div>}

    <div className="mt-4 grid gap-2 md:grid-cols-[1fr_280px]">
      <label className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث باسم العضو أو المنتخب…" className="h-11 w-full rounded-xl border border-white/10 bg-black/20 pr-10 pl-3 text-sm outline-none focus:border-emerald-300"/></label>
      <select value={matchFilter} onChange={e=>setMatchFilter(e.target.value)} className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm font-bold"><option value="all">كل المباريات</option>{matches.map(m=><option key={m.id} value={m.id}>{teamMap.get(m.homeTeamId)?.nameAr || m.homeSourceLabel || "؟"} × {teamMap.get(m.awayTeamId)?.nameAr || m.awaySourceLabel || "؟"}</option>)}</select>
    </div>

    <div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-xl bg-white/5 p-3"><div className="text-[10px] font-bold text-slate-500">إجمالي التوقعات</div><div className="mt-1 text-xl font-black">{predictions.length}</div></div><div className="rounded-xl bg-white/5 p-3"><div className="text-[10px] font-bold text-slate-500">المعروض</div><div className="mt-1 text-xl font-black">{filtered.length}</div></div><div className="rounded-xl bg-white/5 p-3"><div className="text-[10px] font-bold text-slate-500">المحتسبة</div><div className="mt-1 text-xl font-black">{predictions.filter(p=>p.isCalculated).length}</div></div></div>

    <details className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025]">
      <summary className="cursor-pointer list-none px-4 py-3 text-xs font-black text-slate-300">التحكم في تعديل التوقعات حسب المباراة</summary>
      <div className="space-y-2 border-t border-white/10 p-3">{matches.map(match=>{const editOpen=match.predictionEditingIsOpen!==false;const count=predictions.filter(p=>p.matchId===match.id).length;const home=teamMap.get(match.homeTeamId),away=teamMap.get(match.awayTeamId);return <div key={match.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/15 p-3"><div className="flex min-w-0 items-center gap-2"><div className="flex items-center gap-1"><TeamFlag code={home?.flagCode} name={home?.nameAr} size="sm"/><span className="text-xs font-black">{home?.nameAr||match.homeSourceLabel||"؟"}</span><span className="text-slate-500">×</span><TeamFlag code={away?.flagCode} name={away?.nameAr} size="sm"/><span className="text-xs font-black">{away?.nameAr||match.awaySourceLabel||"؟"}</span></div><span className="rounded-full bg-black/25 px-2 py-1 text-[10px] font-black text-slate-400">{count} توقع</span></div><div className="flex gap-2"><button onClick={()=>void toggleEdit(match,!editOpen)} className={`inline-flex min-h-[38px] items-center gap-1 rounded-lg px-2.5 text-[10px] font-black ${editOpen?"bg-emerald-300/10 text-emerald-100":"bg-amber-300/10 text-amber-100"}`}>{editOpen?<UnlockKeyhole className="h-3.5 w-3.5"/>:<LockKeyhole className="h-3.5 w-3.5"/>}{editOpen?"التعديل مفتوح":"التعديل مغلق"}</button><button onClick={()=>void removeMatchPredictions(match.id)} disabled={count===0||Boolean(working)} className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-red-300/15 bg-red-400/[0.07] px-2.5 text-[10px] font-black text-red-100 disabled:opacity-35"><Trash2 className="h-3.5 w-3.5"/>حذف غير المحتسبة</button></div></div>})}</div>
    </details>

    <div className="mt-4 space-y-2 md:hidden">
      {visibleRows.map(row=>{const match=row.match;const home=match?teamMap.get(match.homeTeamId):undefined;const away=match?teamMap.get(match.awayTeamId):undefined;const editing=editingId===row.id;return <article key={row.id} className="rounded-2xl border border-white/10 bg-black/15 p-3"><div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-2 text-sm font-black"><UsersRound className="h-4 w-4 text-emerald-300"/>{row.userName||row.userId}</span><span className={`rounded-full px-2 py-1 text-[10px] font-black ${row.isCalculated?"bg-sky-300/10 text-sky-100":"bg-amber-300/10 text-amber-100"}`}>{row.isCalculated?`${row.points??0} نقطة`:"بانتظار الاحتساب"}</span></div><div className="mt-3">{editing?<div className="grid grid-cols-2 gap-2"><label className="rounded-xl border border-white/10 p-2 text-center"><span className="text-[10px] text-slate-400">{home?.nameAr||match?.homeSourceLabel||"الفريق الأول"}</span><input value={draft.home} onChange={e=>setDraft({...draft,home:e.target.value})} type="number" min={0} max={30} className="mt-1 h-9 w-full rounded-lg bg-black/25 text-center font-black" dir="ltr"/></label><label className="rounded-xl border border-white/10 p-2 text-center"><span className="text-[10px] text-slate-400">{away?.nameAr||match?.awaySourceLabel||"الفريق الثاني"}</span><input value={draft.away} onChange={e=>setDraft({...draft,away:e.target.value})} type="number" min={0} max={30} className="mt-1 h-9 w-full rounded-lg bg-black/25 text-center font-black" dir="ltr"/></label></div>:<div className="flex items-center gap-2"><TeamScore name={home?.nameAr||match?.homeSourceLabel||"الفريق الأول"} flagCode={home?.flagCode} score={row.homeScore}/><span className="text-slate-500">×</span><TeamScore name={away?.nameAr||match?.awaySourceLabel||"الفريق الثاني"} flagCode={away?.flagCode} score={row.awayScore}/></div>}</div><div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3"><span className="text-[10px] text-slate-500">{formatDate(row.updatedAt)}</span><div className="flex gap-1.5">{editing?<><button onClick={()=>void saveEdit(row)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400 text-slate-950"><Check className="h-4 w-4"/></button><button onClick={()=>setEditingId("")} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10"><X className="h-4 w-4"/></button></>:<button disabled={Boolean(row.isCalculated)} onClick={()=>startEdit(row)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 disabled:opacity-30"><Pencil className="h-4 w-4"/></button>}<button disabled={Boolean(row.isCalculated)} onClick={()=>void remove(row)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-300/15 text-red-200 disabled:opacity-30"><Trash2 className="h-4 w-4"/></button></div></div></article>})}
    </div>

    <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-white/10 md:block">
      <table className="min-w-[780px] w-full text-right text-xs"><thead className="bg-white/[0.06] text-slate-400"><tr><th className="p-3">العضو</th><th className="p-3">التوقع</th><th className="p-3">آخر تعديل</th><th className="p-3">الحالة</th><th className="p-3">الإجراءات</th></tr></thead><tbody>{visibleRows.map(row=>{const match=row.match;const home=match?teamMap.get(match.homeTeamId):undefined;const away=match?teamMap.get(match.awayTeamId):undefined;const editing=editingId===row.id;return <tr key={row.id} className="border-t border-white/10"><td className="p-3 font-black"><span className="inline-flex items-center gap-2"><UsersRound className="h-4 w-4 text-emerald-300"/>{row.userName||row.userId}</span></td><td className="p-3">{editing?<div className="grid min-w-[250px] grid-cols-2 gap-2"><label className="rounded-xl border border-white/10 bg-black/20 p-2 text-center"><span className="mb-1 block truncate text-[10px] font-bold text-slate-400">{home?.nameAr||match?.homeSourceLabel||"الفريق الأول"}</span><input value={draft.home} onChange={e=>setDraft({...draft,home:e.target.value})} type="number" min={0} max={30} className="h-9 w-full rounded-lg bg-black/25 text-center font-black" dir="ltr"/></label><label className="rounded-xl border border-white/10 bg-black/20 p-2 text-center"><span className="mb-1 block truncate text-[10px] font-bold text-slate-400">{away?.nameAr||match?.awaySourceLabel||"الفريق الثاني"}</span><input value={draft.away} onChange={e=>setDraft({...draft,away:e.target.value})} type="number" min={0} max={30} className="h-9 w-full rounded-lg bg-black/25 text-center font-black" dir="ltr"/></label></div>:<div className="flex min-w-[250px] items-center gap-2"><TeamScore name={home?.nameAr||match?.homeSourceLabel||"الفريق الأول"} flagCode={home?.flagCode} score={row.homeScore}/><span className="shrink-0 text-[10px] font-black text-slate-500">×</span><TeamScore name={away?.nameAr||match?.awaySourceLabel||"الفريق الثاني"} flagCode={away?.flagCode} score={row.awayScore}/></div>}</td><td className="p-3 text-slate-400">{formatDate(row.updatedAt)}</td><td className="p-3">{row.isCalculated?<span className="inline-flex items-center gap-1 text-sky-200"><Check className="h-3.5 w-3.5"/>محتسب · {row.points??0} نقطة</span>:<span className="text-amber-200">غير محتسب</span>}</td><td className="p-3"><div className="flex gap-1.5">{editing?<><button onClick={()=>void saveEdit(row)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400 text-slate-950"><Check className="h-4 w-4"/></button><button onClick={()=>setEditingId("")} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10"><X className="h-4 w-4"/></button></>:<button disabled={Boolean(row.isCalculated)} onClick={()=>startEdit(row)} title="تعديل" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 disabled:opacity-30"><Pencil className="h-4 w-4"/></button>}<button disabled={Boolean(row.isCalculated)} onClick={()=>void remove(row)} title="حذف" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-300/15 text-red-200 disabled:opacity-30"><Trash2 className="h-4 w-4"/></button><span title="عرض" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400"><Eye className="h-4 w-4"/></span></div></td></tr>})}</tbody></table>
    </div>
    {filtered.length===0?<div className="p-7 text-center text-sm font-bold text-slate-500">لا توجد توقعات مطابقة.</div>:null}

    {filtered.length>0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/15 px-3 py-2"><span className="text-[11px] font-bold text-slate-400">عرض {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,filtered.length)} من {filtered.length}</span><div className="flex items-center gap-2"><button disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="min-h-10 rounded-xl border border-white/10 px-3 text-xs font-black disabled:opacity-30">السابق</button><span className="min-w-16 text-center text-xs font-black">{page} / {totalPages}</span><button disabled={page===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="min-h-10 rounded-xl border border-white/10 px-3 text-xs font-black disabled:opacity-30">التالي</button></div></div>}
  </section>;
}
