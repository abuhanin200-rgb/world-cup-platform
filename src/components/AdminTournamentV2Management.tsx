"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  CirclePlus,
  Loader2,
  Pencil,
  Save,
  Settings2,
  ShieldAlert,
  Trash2,
  Trophy,
  UsersRound,
} from "lucide-react";
import {
  GULF_CUP_27_TOURNAMENT_ID,
  TOURNAMENT_CALCULATION_MODES,
  TOURNAMENT_MATCH_STATUSES,
  TOURNAMENT_STATUSES,
  type TournamentCalculationMode,
  type TournamentMatchStatus,
  type TournamentStatus,
} from "@/domain/tournaments";
import { addAdminLog } from "@/lib/adminLogs";
import {
  createTournamentMatchV2,
  createTournamentTeamV2,
  deleteTournamentMatchV2Safely,
  deleteTournamentTeamV2Safely,
  getTournamentV2AdminSnapshot,
  updateTournamentMatchV2,
  updateTournamentTeamV2,
  updateTournamentV2Metadata,
  type TournamentV2MatchInput,
  type TournamentV2MetaInput,
  type TournamentV2TeamInput,
} from "@/lib/tournamentV2Admin";
import type { TournamentMatchV2, TournamentTeamV2 } from "@/domain/tournaments";

const STATUS_LABEL: Record<TournamentStatus, string> = {
  draft: "مسودة",
  coming_soon: "قريبًا",
  registration_open: "التسجيل مفتوح",
  active: "جارية",
  paused: "متوقفة مؤقتًا",
  finished: "منتهية",
  hidden: "مخفية",
};

const CALC_LABEL: Record<TournamentCalculationMode, string> = {
  automatic: "تلقائي",
  automatic_guarded: "تلقائي مع حماية الاستثناءات",
  manual: "يدوي",
};

const MATCH_STATUS_LABEL: Record<TournamentMatchStatus, string> = {
  scheduled: "مجدولة",
  prediction_open: "التوقع مفتوح",
  live: "مباشر",
  finished: "منتهية",
  postponed: "مؤجلة",
  cancelled: "ملغاة",
};

function toLocalInput(timestamp: number | null | undefined) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function teamDraft(team?: TournamentTeamV2): TournamentV2TeamInput {
  return {
    id: team?.id ?? "",
    code: team?.code ?? "",
    flagCode: team?.flagCode ?? "",
    nameAr: team?.nameAr ?? "",
    nameEn: team?.nameEn ?? "",
    shortName: team?.shortName ?? "",
    group: team?.group ?? "",
    sortOrder: team?.sortOrder ?? 0,
    isActive: team?.isActive ?? true,
  };
}

function matchDraft(match?: TournamentMatchV2): TournamentV2MatchInput {
  return {
    id: match?.id ?? "",
    stage: match?.stage ?? "group",
    round: match?.round ?? "الجولة 1",
    group: match?.group ?? "A",
    homeTeamId: match?.homeTeamId ?? "",
    awayTeamId: match?.awayTeamId ?? "",
    homeSourceLabel: match?.homeSourceLabel ?? "",
    awaySourceLabel: match?.awaySourceLabel ?? "",
    kickoffAt: match?.kickoffAt ?? Date.now(),
    stadium: match?.stadium ?? "",
    city: match?.city ?? "جدة",
    status: match?.status ?? "scheduled",
  };
}

export type AdminTournamentManagementSection = "settings" | "teams" | "matches";

type AdminTournamentV2ManagementProps = {
  section?: AdminTournamentManagementSection;
  showTabs?: boolean;
};

export default function AdminTournamentV2Management({
  section = "settings",
  showTabs = true,
}: AdminTournamentV2ManagementProps) {
  const [tab, setTab] = useState<AdminTournamentManagementSection>(section);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<TournamentV2MetaInput | null>(null);
  const [teams, setTeams] = useState<TournamentTeamV2[]>([]);
  const [matches, setMatches] = useState<TournamentMatchV2[]>([]);
  const [teamForm, setTeamForm] = useState<TournamentV2TeamInput>(teamDraft());
  const [editingTeamId, setEditingTeamId] = useState("");
  const [matchForm, setMatchForm] = useState<TournamentV2MatchInput>(matchDraft());
  const [editingMatchId, setEditingMatchId] = useState("");

  const activeTeams = useMemo(() => teams.filter((item) => item.isActive), [teams]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const snapshot = await getTournamentV2AdminSnapshot(GULF_CUP_27_TOURNAMENT_ID);
      setTeams(snapshot.teams);
      setMatches(snapshot.matches);
      if (snapshot.tournament) {
        setMeta({
          name: snapshot.tournament.name,
          shortName: snapshot.tournament.shortName,
          description: snapshot.tournament.description ?? "",
          hostCountry: snapshot.tournament.hostCountry ?? "",
          hostCities: snapshot.tournament.hostCities,
          startAt: snapshot.tournament.startAt,
          endAt: snapshot.tournament.endAt,
          status: snapshot.tournament.status,
          sortOrder: snapshot.tournament.sortOrder,
          isCurrent: snapshot.tournament.isCurrent,
          calculationMode: snapshot.tournament.calculationMode,
        });
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل إدارة البطولة");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setTab(section);
  }, [section]);

  async function saveMeta() {
    if (!meta) return;
    setWorking("meta");
    setMessage("");
    setError("");
    try {
      await updateTournamentV2Metadata(GULF_CUP_27_TOURNAMENT_ID, meta);
      await addAdminLog({
        action: "other",
        title: "تعديل إعدادات خليجي 27",
        description: `تم تحديث بيانات البطولة وحالتها إلى: ${STATUS_LABEL[meta.status]}.`,
        metadata: { tournamentId: GULF_CUP_27_TOURNAMENT_ID, ...meta },
      });
      setMessage("تم حفظ إعدادات البطولة.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذر حفظ إعدادات البطولة");
    } finally {
      setWorking("");
    }
  }

  async function saveTeam() {
    setWorking("team");
    setMessage("");
    setError("");
    try {
      if (editingTeamId) {
        const { id: _id, ...patch } = teamForm;
        await updateTournamentTeamV2(GULF_CUP_27_TOURNAMENT_ID, editingTeamId, patch);
        await addAdminLog({ action: "other", title: "تعديل منتخب في خليجي 27", description: `تم تعديل ${teamForm.nameAr}.`, metadata: { teamId: editingTeamId } });
        setMessage("تم تعديل المنتخب.");
      } else {
        const id = await createTournamentTeamV2(GULF_CUP_27_TOURNAMENT_ID, teamForm);
        await addAdminLog({ action: "other", title: "إضافة منتخب إلى خليجي 27", description: `تمت إضافة ${teamForm.nameAr}.`, metadata: { teamId: id } });
        setMessage("تمت إضافة المنتخب.");
      }
      setEditingTeamId("");
      setTeamForm(teamDraft());
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذر حفظ المنتخب");
    } finally {
      setWorking("");
    }
  }

  async function removeTeam(team: TournamentTeamV2) {
    if (!window.confirm(`حذف منتخب ${team.nameAr}؟`)) return;
    setWorking(`delete-team-${team.id}`);
    setMessage("");
    setError("");
    try {
      await deleteTournamentTeamV2Safely(GULF_CUP_27_TOURNAMENT_ID, team.id);
      await addAdminLog({ action: "other", title: "حذف منتخب من خليجي 27", description: `تم حذف ${team.nameAr}.`, metadata: { teamId: team.id } });
      setMessage("تم حذف المنتخب.");
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "تعذر حذف المنتخب");
    } finally {
      setWorking("");
    }
  }

  async function saveMatch() {
    setWorking("match");
    setMessage("");
    setError("");
    try {
      if (editingMatchId) {
        const { id: _id, ...patch } = matchForm;
        await updateTournamentMatchV2(GULF_CUP_27_TOURNAMENT_ID, editingMatchId, patch);
        await addAdminLog({ action: "other", title: "تعديل مباراة خليجي 27", description: `تم تعديل ${matchForm.round}.`, metadata: { matchId: editingMatchId } });
        setMessage("تم تعديل المباراة.");
      } else {
        const id = await createTournamentMatchV2(GULF_CUP_27_TOURNAMENT_ID, matchForm);
        await addAdminLog({ action: "other", title: "إضافة مباراة إلى خليجي 27", description: `تمت إضافة مباراة ${matchForm.round}.`, metadata: { matchId: id } });
        setMessage("تمت إضافة المباراة.");
      }
      setEditingMatchId("");
      setMatchForm(matchDraft());
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذر حفظ المباراة");
    } finally {
      setWorking("");
    }
  }

  async function removeMatch(match: TournamentMatchV2) {
    if (!window.confirm(`حذف مباراة ${match.round}؟ لا يمكن حذف مباراة عليها توقعات.`)) return;
    setWorking(`delete-match-${match.id}`);
    setMessage("");
    setError("");
    try {
      await deleteTournamentMatchV2Safely(GULF_CUP_27_TOURNAMENT_ID, match.id);
      await addAdminLog({ action: "other", title: "حذف مباراة من خليجي 27", description: `تم حذف ${match.round}.`, metadata: { matchId: match.id } });
      setMessage("تم حذف المباراة.");
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "تعذر حذف المباراة");
    } finally {
      setWorking("");
    }
  }

  if (loading) {
    return <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/45 p-6 text-center text-slate-300"><Loader2 className="mx-auto h-6 w-6 animate-spin" aria-hidden="true" /><p className="mt-2 text-sm font-bold">جاري تحميل إدارة البطولة...</p></div>;
  }

  if (!meta) {
    return <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm font-bold text-amber-100"><ShieldAlert className="mb-2 h-5 w-5" aria-hidden="true" />هيّئ خليجي 27 أولًا، ثم ستظهر أدوات الإدارة الكاملة هنا.</div>;
  }

  const tabs = [
    { id: "settings" as const, label: "إعدادات البطولة", icon: Settings2 },
    { id: "teams" as const, label: "المنتخبات", icon: UsersRound },
    { id: "matches" as const, label: "المباريات", icon: CalendarClock },
  ];

  return (
    <section className="mt-5 rounded-3xl border border-white/10 bg-slate-950/35 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-emerald-300">إدارة البطولة</p>
          <h3 className="mt-1 flex items-center gap-2 text-lg font-black text-white"><Trophy className="h-5 w-5 text-amber-300" aria-hidden="true" />خليجي 27 — إعداد كامل</h3>
        </div>
        {showTabs && (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="أقسام إدارة البطولة">
            {tabs.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => setTab(item.id)} className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-xs font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${active ? "bg-emerald-400 text-slate-950" : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"}`}><Icon className="h-4 w-4" aria-hidden="true" />{item.label}</button>;
            })}
          </div>
        )}
      </div>

      {(message || error) && <div role={error ? "alert" : "status"} aria-live="polite" className={`mt-4 rounded-2xl border p-3 text-sm font-bold ${error ? "border-red-300/20 bg-red-400/10 text-red-100" : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"}`}>{error || message}</div>}

      {tab === "settings" && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="text-sm font-bold text-slate-200">اسم البطولة<input value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3 outline-none focus-visible:border-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-300/25" /></label>
          <label className="text-sm font-bold text-slate-200">الاسم المختصر<input value={meta.shortName} onChange={(e) => setMeta({ ...meta, shortName: e.target.value })} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3 outline-none focus-visible:border-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-300/25" /></label>
          <label className="text-sm font-bold text-slate-200">الحالة<select value={meta.status} onChange={(e) => setMeta({ ...meta, status: e.target.value as TournamentStatus })} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-slate-900 px-3 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25">{TOURNAMENT_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}</select></label>
          <label className="text-sm font-bold text-slate-200">وضع الاحتساب<select value={meta.calculationMode} onChange={(e) => setMeta({ ...meta, calculationMode: e.target.value as TournamentCalculationMode })} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-slate-900 px-3 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25">{TOURNAMENT_CALCULATION_MODES.map((mode) => <option key={mode} value={mode}>{CALC_LABEL[mode]}</option>)}</select></label>
          <label className="text-sm font-bold text-slate-200">الدولة المستضيفة<input value={meta.hostCountry} onChange={(e) => setMeta({ ...meta, hostCountry: e.target.value })} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25" /></label>
          <label className="text-sm font-bold text-slate-200">المدن <span className="text-xs text-slate-500">(افصل بفاصلة)</span><input value={meta.hostCities.join(", ")} onChange={(e) => setMeta({ ...meta, hostCities: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25" /></label>
          <label className="text-sm font-bold text-slate-200">تاريخ البداية<input type="datetime-local" value={toLocalInput(meta.startAt)} onChange={(e) => setMeta({ ...meta, startAt: fromLocalInput(e.target.value) })} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25" /></label>
          <label className="text-sm font-bold text-slate-200">تاريخ النهاية<input type="datetime-local" value={toLocalInput(meta.endAt)} onChange={(e) => setMeta({ ...meta, endAt: fromLocalInput(e.target.value) })} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25" /></label>
          <label className="text-sm font-bold text-slate-200">ترتيب الظهور<input type="number" min={0} value={meta.sortOrder} onChange={(e) => setMeta({ ...meta, sortOrder: Number(e.target.value) || 0 })} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25" /></label>
          <label className="flex min-h-[52px] items-center gap-3 self-end rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white"><input type="checkbox" checked={meta.isCurrent} onChange={(e) => setMeta({ ...meta, isCurrent: e.target.checked })} className="h-5 w-5 accent-emerald-400" />هذه البطولة الحالية</label>
          <label className="text-sm font-bold text-slate-200 lg:col-span-2">الوصف<textarea rows={3} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 p-3 outline-none focus-visible:border-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-300/25" /></label>
          <div className="lg:col-span-2"><button type="button" onClick={() => void saveMeta()} disabled={working === "meta"} className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-black text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50">{working === "meta" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}حفظ إعدادات البطولة</button></div>
        </div>
      )}

      {tab === "teams" && (
        <div className="mt-5 grid gap-5 xl:grid-cols-[360px_1fr]">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <h4 className="flex items-center gap-2 font-black text-white">{editingTeamId ? <Pencil className="h-4 w-4 text-amber-300" aria-hidden="true" /> : <CirclePlus className="h-4 w-4 text-emerald-300" aria-hidden="true" />}{editingTeamId ? "تعديل منتخب" : "إضافة منتخب"}</h4>
            <div className="mt-4 grid gap-3">
              {!editingTeamId && <label className="text-xs font-bold text-slate-300">المعرّف الإنجليزي<input dir="ltr" value={teamForm.id} onChange={(e) => setTeamForm({ ...teamForm, id: e.target.value })} placeholder="ksa" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25" /></label>}
              <label className="text-xs font-bold text-slate-300">الاسم العربي<input value={teamForm.nameAr} onChange={(e) => setTeamForm({ ...teamForm, nameAr: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25" /></label>
              <label className="text-xs font-bold text-slate-300">الاسم الإنجليزي<input dir="ltr" value={teamForm.nameEn} onChange={(e) => setTeamForm({ ...teamForm, nameEn: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25" /></label>
              <div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-slate-300">الكود<input dir="ltr" value={teamForm.code} onChange={(e) => setTeamForm({ ...teamForm, code: e.target.value })} placeholder="KSA" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25" /></label><label className="text-xs font-bold text-slate-300">رمز العلم<input dir="ltr" value={teamForm.flagCode} onChange={(e) => setTeamForm({ ...teamForm, flagCode: e.target.value })} placeholder="sa" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25" /></label></div>
              <div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-slate-300">المجموعة<input value={teamForm.group ?? ""} onChange={(e) => setTeamForm({ ...teamForm, group: e.target.value })} placeholder="A" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25" /></label><label className="text-xs font-bold text-slate-300">الترتيب<input type="number" min={0} value={teamForm.sortOrder} onChange={(e) => setTeamForm({ ...teamForm, sortOrder: Number(e.target.value) || 0 })} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25" /></label></div>
              <label className="flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold"><input type="checkbox" checked={teamForm.isActive} onChange={(e) => setTeamForm({ ...teamForm, isActive: e.target.checked })} className="h-4 w-4 accent-emerald-400" />منتخب نشط</label>
              <div className="flex gap-2"><button type="button" onClick={() => void saveTeam()} disabled={working === "team"} className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-3 text-xs font-black text-slate-950 disabled:opacity-50">{working === "team" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}{editingTeamId ? "حفظ التعديل" : "إضافة"}</button>{editingTeamId && <button type="button" onClick={() => { setEditingTeamId(""); setTeamForm(teamDraft()); }} className="min-h-[44px] rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black">إلغاء</button>}</div>
            </div>
          </div>
          <div className="space-y-2">
            {teams.map((team) => <div key={team.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3"><div><div className="flex items-center gap-2"><span className="font-black text-white">{team.nameAr}</span><span dir="ltr" className="rounded-md bg-white/5 px-2 py-1 text-[11px] font-bold text-slate-400">{team.code}</span>{team.group && <span className="rounded-md bg-emerald-300/10 px-2 py-1 text-[11px] font-black text-emerald-200">المجموعة {team.group}</span>}</div><p className="mt-1 text-xs text-slate-500">{team.isActive ? "نشط" : "غير نشط"} · ترتيب {team.sortOrder}</p></div><div className="flex gap-2"><button type="button" onClick={() => { setEditingTeamId(team.id); setTeamForm(teamDraft(team)); }} className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black hover:bg-white/10"><Pencil className="h-4 w-4" aria-hidden="true" />تعديل</button><button type="button" onClick={() => void removeTeam(team)} disabled={working === `delete-team-${team.id}`} className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-red-300/20 bg-red-400/10 px-3 text-xs font-black text-red-100 disabled:opacity-50"><Trash2 className="h-4 w-4" aria-hidden="true" />حذف</button></div></div>)}
          </div>
        </div>
      )}

      {tab === "matches" && (
        <div className="mt-5 grid gap-5 xl:grid-cols-[390px_1fr]">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <h4 className="flex items-center gap-2 font-black text-white">{editingMatchId ? <Pencil className="h-4 w-4 text-amber-300" aria-hidden="true" /> : <CirclePlus className="h-4 w-4 text-emerald-300" aria-hidden="true" />}{editingMatchId ? "تعديل مباراة" : "إضافة مباراة"}</h4>
            <div className="mt-4 grid gap-3">
              {!editingMatchId && <label className="text-xs font-bold text-slate-300">المعرّف الإنجليزي<input dir="ltr" value={matchForm.id} onChange={(e) => setMatchForm({ ...matchForm, id: e.target.value })} placeholder="g27-custom-1" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25" /></label>}
              <div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-slate-300">المرحلة<select value={matchForm.stage} onChange={(e) => setMatchForm({ ...matchForm, stage: e.target.value as "group" | "knockout" })} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3"><option value="group">مجموعات</option><option value="knockout">خروج مغلوب</option></select></label><label className="text-xs font-bold text-slate-300">الحالة<select value={matchForm.status} onChange={(e) => setMatchForm({ ...matchForm, status: e.target.value as TournamentMatchStatus })} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3">{TOURNAMENT_MATCH_STATUSES.map((status) => <option key={status} value={status}>{MATCH_STATUS_LABEL[status]}</option>)}</select></label></div>
              <div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-slate-300">الجولة/الدور<input value={matchForm.round} onChange={(e) => setMatchForm({ ...matchForm, round: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3" /></label><label className="text-xs font-bold text-slate-300">المجموعة<input value={matchForm.group ?? ""} onChange={(e) => setMatchForm({ ...matchForm, group: e.target.value })} disabled={matchForm.stage === "knockout"} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 disabled:opacity-50" /></label></div>
              <label className="text-xs font-bold text-slate-300">الفريق الأول<select value={matchForm.homeTeamId} onChange={(e) => setMatchForm({ ...matchForm, homeTeamId: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3"><option value="">لم يتحدد</option>{activeTeams.map((team) => <option key={team.id} value={team.id}>{team.nameAr}</option>)}</select></label>
              <label className="text-xs font-bold text-slate-300">الفريق الثاني<select value={matchForm.awayTeamId} onChange={(e) => setMatchForm({ ...matchForm, awayTeamId: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3"><option value="">لم يتحدد</option>{activeTeams.map((team) => <option key={team.id} value={team.id}>{team.nameAr}</option>)}</select></label>
              {matchForm.stage === "knockout" && <div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-slate-300">وصف الطرف الأول<input value={matchForm.homeSourceLabel ?? ""} onChange={(e) => setMatchForm({ ...matchForm, homeSourceLabel: e.target.value })} placeholder="متصدر A" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3" /></label><label className="text-xs font-bold text-slate-300">وصف الطرف الثاني<input value={matchForm.awaySourceLabel ?? ""} onChange={(e) => setMatchForm({ ...matchForm, awaySourceLabel: e.target.value })} placeholder="وصيف B" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3" /></label></div>}
              <label className="text-xs font-bold text-slate-300">موعد المباراة<input type="datetime-local" value={toLocalInput(matchForm.kickoffAt)} onChange={(e) => setMatchForm({ ...matchForm, kickoffAt: fromLocalInput(e.target.value) ?? Date.now() })} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3" /></label>
              <div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-slate-300">الملعب<input value={matchForm.stadium} onChange={(e) => setMatchForm({ ...matchForm, stadium: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3" /></label><label className="text-xs font-bold text-slate-300">المدينة<input value={matchForm.city} onChange={(e) => setMatchForm({ ...matchForm, city: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3" /></label></div>
              <div className="flex gap-2"><button type="button" onClick={() => void saveMatch()} disabled={working === "match"} className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-3 text-xs font-black text-slate-950 disabled:opacity-50">{working === "match" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}{editingMatchId ? "حفظ التعديل" : "إضافة المباراة"}</button>{editingMatchId && <button type="button" onClick={() => { setEditingMatchId(""); setMatchForm(matchDraft()); }} className="min-h-[44px] rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black">إلغاء</button>}</div>
            </div>
          </div>
          <div className="space-y-2">
            {matches.map((match) => <div key={match.id} className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="font-black text-white">{match.round}</span><span className="rounded-md bg-white/5 px-2 py-1 text-[11px] font-bold text-slate-400">{match.stage === "group" ? `المجموعة ${match.group ?? "-"}` : "خروج المغلوب"}</span><span className="rounded-md bg-sky-300/10 px-2 py-1 text-[11px] font-bold text-sky-100">{MATCH_STATUS_LABEL[match.status]}</span></div><p className="mt-1 text-xs font-bold text-slate-300">{teams.find((x) => x.id === match.homeTeamId)?.nameAr || match.homeSourceLabel || "لم يتحدد"} × {teams.find((x) => x.id === match.awayTeamId)?.nameAr || match.awaySourceLabel || "لم يتحدد"}</p><p className="mt-1 text-[11px] text-slate-500">{new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Riyadh" }).format(new Date(match.kickoffAt))} · {match.stadium || "بدون ملعب"}</p></div><div className="flex gap-2"><button type="button" onClick={() => { setEditingMatchId(match.id); setMatchForm(matchDraft(match)); }} className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black"><Pencil className="h-4 w-4" aria-hidden="true" />تعديل</button><button type="button" onClick={() => void removeMatch(match)} disabled={working === `delete-match-${match.id}`} className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-red-300/20 bg-red-400/10 px-3 text-xs font-black text-red-100 disabled:opacity-50"><Trash2 className="h-4 w-4" aria-hidden="true" />حذف</button></div></div></div>)}
          </div>
        </div>
      )}
    </section>
  );
}
