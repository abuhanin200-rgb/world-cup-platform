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

type Draft = { home: string; away: string; qualifiedTeamId: string; qualificationMethod: TournamentQualificationMethod | "" };

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

  return <section className="mt-5 rounded-3xl border border-white/10 bg-slate-950/35 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-black text-emerald-200">إدارة توقعات الأعضاء</p><h3 className="mt-1 text-lg font-black">تحكم كامل — {tournamentLabel}</h3><p className="mt-1 text-xs font-semibold text-slate-400">مشاهدة وتعديل وحذف التوقعات والتحكم في السماح بالتعديل بدون الرجوع للكود.</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={()=>void toggleAllEdits(true)} disabled={Boolean(working)} className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-emerald-400 px-3 text-xs font-black text-slate-950 disabled:opacity-50"><UnlockKeyhole className="h-4 w-4"/>فتح تعديل الكل</button><button onClick={()=>void toggleAllEdits(false)} disabled={Boolean(working)} className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 text-xs font-black text-amber-100 disabled:opacity-50"><LockKeyhole className="h-4 w-4"/>إغلاق تعديل الكل</button><button onClick={()=>void load()} className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-black"><RefreshCw className="h-4 w-4"/>تحديث</button></div>
    </div>

    {(message||error) && <div role={error?"alert":"status"} className={`mt-3 rounded-xl border px-3 py-2 text-xs font-black ${error?"border-red-300/20 bg-red-400/10 text-red-100":"border-emerald-300/20 bg-emerald-300/10 text-emerald-100"}`}>{error||message}</div>}

    <div className="mt-4 grid gap-2 md:grid-cols-[1fr_280px]">
      <label className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث باسم العضو أو المنتخب…" className="h-11 w-full rounded-xl border border-white/10 bg-black/20 pr-10 pl-3 text-sm outline-none focus:border-emerald-300"/></label>
      <select value={matchFilter} onChange={e=>setMatchFilter(e.target.value)} className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm font-bold"><option value="all">كل المباريات</option>{matches.map(m=><option key={m.id} value={m.id}>{teamMap.get(m.homeTeamId)?.nameAr || m.homeSourceLabel || "؟"} × {teamMap.get(m.awayTeamId)?.nameAr || m.awaySourceLabel || "؟"}</option>)}</select>
    </div>

    <div className="mt-4 grid gap-2 sm:grid-cols-3"><div className="rounded-xl bg-white/5 p-3"><div className="text-[10px] font-bold text-slate-500">إجمالي التوقعات</div><div className="mt-1 text-xl font-black">{predictions.length}</div></div><div className="rounded-xl bg-white/5 p-3"><div className="text-[10px] font-bold text-slate-500">المعروض الآن</div><div className="mt-1 text-xl font-black">{filtered.length}</div></div><div className="rounded-xl bg-white/5 p-3"><div className="text-[10px] font-bold text-slate-500">توقعات محتسبة</div><div className="mt-1 text-xl font-black">{predictions.filter(p=>p.isCalculated).length}</div></div></div>

    <div className="mt-4 space-y-2">
      {matches.map(match=>{
        const editOpen = match.predictionEditingIsOpen !== false;
        const count = predictions.filter(p=>p.matchId===match.id).length;
        const home=teamMap.get(match.homeTeamId), away=teamMap.get(match.awayTeamId);
        return <div key={match.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3"><div className="flex min-w-0 items-center gap-2"><div className="flex items-center gap-1"><TeamFlag code={home?.flagCode} name={home?.nameAr} size="sm"/><span className="text-xs font-black">{home?.nameAr||match.homeSourceLabel||"؟"}</span><span className="text-slate-500">×</span><TeamFlag code={away?.flagCode} name={away?.nameAr} size="sm"/><span className="text-xs font-black">{away?.nameAr||match.awaySourceLabel||"؟"}</span></div><span className="rounded-full bg-black/25 px-2 py-1 text-[10px] font-black text-slate-400">{count} توقع</span></div><div className="flex gap-2"><button onClick={()=>void toggleEdit(match,!editOpen)} className={`inline-flex min-h-[38px] items-center gap-1 rounded-lg px-2.5 text-[10px] font-black ${editOpen?"bg-emerald-300/10 text-emerald-100":"bg-amber-300/10 text-amber-100"}`}>{editOpen?<UnlockKeyhole className="h-3.5 w-3.5"/>:<LockKeyhole className="h-3.5 w-3.5"/>}{editOpen?"التعديل مفتوح":"التعديل مغلق"}</button><button onClick={()=>void removeMatchPredictions(match.id)} disabled={count===0||Boolean(working)} className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-red-300/15 bg-red-400/[0.07] px-2.5 text-[10px] font-black text-red-100 disabled:opacity-35"><Trash2 className="h-3.5 w-3.5"/>حذف توقعات المباراة</button></div></div>
      })}
    </div>

    <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
      <table className="min-w-[920px] w-full text-right text-xs"><thead className="bg-white/[0.06] text-slate-400"><tr><th className="p-3">العضو</th><th className="p-3">المباراة</th><th className="p-3">التوقع</th><th className="p-3">آخر تعديل</th><th className="p-3">الحالة</th><th className="p-3">الإجراءات</th></tr></thead><tbody>{filtered.map(row=>{const match=row.match;const home=match?teamMap.get(match.homeTeamId):undefined;const away=match?teamMap.get(match.awayTeamId):undefined;const editing=editingId===row.id;return <tr key={row.id} className="border-t border-white/10"><td className="p-3 font-black"><span className="inline-flex items-center gap-2"><UsersRound className="h-4 w-4 text-emerald-300"/>{row.userName||row.userId}</span></td><td className="p-3"><div className="flex items-center gap-1.5"><TeamFlag code={home?.flagCode} name={home?.nameAr} size="sm"/><span>{home?.nameAr||match?.homeSourceLabel||"؟"}</span><span className="text-slate-500">×</span><TeamFlag code={away?.flagCode} name={away?.nameAr} size="sm"/><span>{away?.nameAr||match?.awaySourceLabel||"؟"}</span></div></td><td className="p-3">{editing?<div className="space-y-1.5"><div className="flex items-center gap-1"><input value={draft.home} onChange={e=>setDraft({...draft,home:e.target.value})} type="number" min={0} max={30} className="h-9 w-14 rounded-lg bg-black/25 text-center font-black"/><span>—</span><input value={draft.away} onChange={e=>setDraft({...draft,away:e.target.value})} type="number" min={0} max={30} className="h-9 w-14 rounded-lg bg-black/25 text-center font-black"/></div>{match?.stage==="knockout"&&draft.home!==""&&draft.home===draft.away?<div className="flex gap-1"><select aria-label="المتأهل" value={draft.qualifiedTeamId} onChange={e=>setDraft({...draft,qualifiedTeamId:e.target.value})} className="h-8 rounded-lg bg-slate-900 px-1 text-[10px]"><option value="">المتأهل</option><option value={match.homeTeamId}>{home?.nameAr||"الأول"}</option><option value={match.awayTeamId}>{away?.nameAr||"الثاني"}</option></select><select aria-label="طريقة التأهل" value={draft.qualificationMethod} onChange={e=>setDraft({...draft,qualificationMethod:e.target.value as TournamentQualificationMethod})} className="h-8 rounded-lg bg-slate-900 px-1 text-[10px]"><option value="">الطريقة</option><option value="extra_time">إضافي</option><option value="penalties">ترجيح</option></select></div>:null}</div>:<span dir="ltr" className="rounded-lg bg-black/20 px-2 py-1 font-black">{row.homeScore} - {row.awayScore}</span>}</td><td className="p-3 text-slate-400">{formatDate(row.updatedAt)}</td><td className="p-3">{row.isCalculated?<span className="inline-flex items-center gap-1 text-sky-200"><Check className="h-3.5 w-3.5"/>محتسب · {row.points??0} نقطة</span>:<span className="text-amber-200">غير محتسب</span>}</td><td className="p-3"><div className="flex gap-1.5">{editing?<><button onClick={()=>void saveEdit(row)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400 text-slate-950"><Check className="h-4 w-4"/></button><button onClick={()=>setEditingId("")} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10"><X className="h-4 w-4"/></button></>:<button disabled={Boolean(row.isCalculated)} onClick={()=>startEdit(row)} title="تعديل" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 disabled:opacity-30"><Pencil className="h-4 w-4"/></button>}<button disabled={Boolean(row.isCalculated)} onClick={()=>void remove(row)} title="حذف" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-300/15 text-red-200 disabled:opacity-30"><Trash2 className="h-4 w-4"/></button><span title="مشاهدة توقع العضو" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400"><Eye className="h-4 w-4"/></span></div></td></tr>})}</tbody></table>
      {filtered.length===0?<div className="p-7 text-center text-sm font-bold text-slate-500">لا توجد توقعات مطابقة.</div>:null}
    </div>
  </section>;
}
