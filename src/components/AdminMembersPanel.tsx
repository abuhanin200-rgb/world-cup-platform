"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity, CalendarDays, Copy, Eye, EyeOff, Gamepad2, Hash, KeyRound, RefreshCw, Search, ShieldCheck,
  Trophy, UserRound, Users,
} from "lucide-react";
import {
  AdminMember, getAdminMembers, resetAdminMemberPassword, updateAdminMemberProfile,
} from "@/lib/adminMembers";
import { addAdminLog } from "@/lib/adminLogs";
import { getTeams, Team } from "@/lib/teams";

const MEMBERS_PER_PAGE = 20;

type MemberDetails = {
  summary: { tournamentPoints: number; tournamentPlayed: number; tournamentExact: number; gameXp: number; gameLevel: number; gamesPlayed: number; gamesWins: number };
  tournaments: Array<{ id: string; name: string; status: string; legacy: boolean; points: number; rank: number | null; played: number; exact: number; correct: number; wrong: number; bestStreak: number }>;
  games: { totalXp: number; level: number; gamesPlayed: number; wins: number; breakdown: Array<{ gameId: string; played: number; wins: number; xp: number }> };
};

type FormState = { fullName: string; phone: string; teamCode: string; password: string };

function dateLabel(value?: string) {
  if (!value) return "غير متوفر";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متوفر";
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "medium", timeZone: "Asia/Riyadh" }).format(date);
}

function gameLabel(id: string) {
  if (id === "word-game") return "خمن كلمة اليوم";
  if (id === "flag-memory") return "تحدي الأعلام";
  if (id === "ten-seconds") return "العشر ثواني";
  if (id === "vocabulary") return "تحدي المفردات";
  return id;
}

function buildForm(member: AdminMember, teams: Team[]): FormState {
  return { fullName: member.fullName, phone: member.phone, teamCode: teams.find((team) => team.nameAr === member.favoriteTeam)?.code || "", password: "" };
}

export default function AdminMembersPanel() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [details, setDetails] = useState<MemberDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [showPassword, setShowPassword] = useState(false);

  const selected = members.find((member) => member.id === selectedId) || null;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => [m.fullName, m.phone, m.favoriteTeam, m.email, m.id, m.memberNumber].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [members, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / MEMBERS_PER_PAGE));
  const visible = filtered.slice((page - 1) * MEMBERS_PER_PAGE, page * MEMBERS_PER_PAGE);
  const withPhone = members.filter((m) => m.phone).length;
  const newThisMonth = members.filter((m) => {
    if (!m.createdAt) return false;
    const d = new Date(m.createdAt); const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
  }).length;
  const memberStats: Array<[string, number, LucideIcon]> = [
    ["إجمالي الأعضاء", members.length, Users],
    ["بأرقام جوال", withPhone, ShieldCheck],
    ["جدد هذا الشهر", newThisMonth, UserRound],
    ["نتائج البحث", filtered.length, Search],
  ];
  const activityStats: Array<[string, number, LucideIcon]> = [
    ["نقاط البطولات", details?.summary.tournamentPoints ?? 0, Trophy],
    ["مشاركات البطولات", details?.summary.tournamentPlayed ?? 0, Activity],
    ["نقاط خبرة الألعاب", details?.summary.gameXp ?? 0, Gamepad2],
    ["مستوى الألعاب", details?.summary.gameLevel ?? 1, ShieldCheck],
  ];

  async function load() {
    try {
      setLoading(true); setError("");
      const [memberData, teamData] = await Promise.all([getAdminMembers(), getTeams()]);
      setMembers(memberData); setTeams(teamData);
      if (selectedId) {
        const current = memberData.find((m) => m.id === selectedId);
        if (current) setForm(buildForm(current, teamData));
      }
    } catch (e) { console.error(e); setError("تعذر تحميل الأعضاء"); } finally { setLoading(false); }
  }

  async function loadDetails(id: string) {
    try {
      setDetailsLoading(true); setDetails(null);
      const response = await fetch(`/api/members/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("details");
      setDetails((await response.json()) as MemberDetails);
    } catch { setError("تعذر تحميل نشاط العضو"); } finally { setDetailsLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { setPage(1); }, [search]);

  function choose(member: AdminMember) {
    setSelectedId(member.id); setForm(buildForm(member, teams)); setMessage(""); setError("");
    void loadDetails(member.id);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!selected || !form) return;
    const team = teams.find((item) => item.code === form.teamCode);
    if (!team) { setError("اختر المنتخب المفضل"); return; }
    try {
      setSaving(true); setError(""); setMessage("");
      await updateAdminMemberProfile({ userId: selected.id, fullName: form.fullName, phone: form.phone, favoriteTeam: team.nameAr, teamEmoji: team.emoji });
      if (form.password.trim()) await resetAdminMemberPassword(selected.id, form.password);
      await addAdminLog({ action: "update_member", title: "تحديث حساب عضو", description: `تم تحديث بيانات حساب العضو ${selected.fullName}.` });
      setMessage("تم حفظ بيانات العضو بنجاح"); await load(); await loadDetails(selected.id);
      setForm((current) => current ? { ...current, password: "" } : current);
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر حفظ بيانات العضو"); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.09] to-white/[0.035] shadow-2xl">
        <div className="border-b border-white/10 p-4 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300 text-slate-950 shadow-lg shadow-amber-300/10"><Users className="h-6 w-6" /></span>
              <div><h2 className="text-2xl font-black md:text-3xl">إدارة الأعضاء</h2><p className="mt-1 text-sm text-slate-300">إدارة مركزية لحسابات أعضاء منصة التحدي ونشاطهم في جميع البطولات والألعاب.</p></div>
            </div>
            <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm font-black hover:bg-white/10"><RefreshCw className="h-4 w-4" />تحديث</button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {memberStats.map(([label, value, Icon]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-slate-950/45 p-3"><div className="flex items-center justify-between text-xs text-slate-400"><span>{String(label)}</span><Icon className="h-4 w-4" /></div><div className="mt-2 text-2xl font-black">{Number(value)}</div></div>)}
          </div>
        </div>

        {(message || error) && <div className="px-4 pt-4 md:px-6">{message && <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">{message}</div>}{error && <div className="mt-2 rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-100">{error}</div>}</div>}

        <div className="grid min-h-[650px] lg:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="border-b border-white/10 p-4 lg:border-b-0 lg:border-l lg:p-5">
            <div className="relative mb-4"><Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="الاسم، رقم العضوية، الجوال أو البريد" className="min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950/70 pr-11 pl-4 text-sm outline-none focus:border-amber-300/60"/></div>
            {loading ? <div className="p-8 text-center text-sm text-slate-400">جاري تحميل الأعضاء...</div> : <div className="space-y-2">
              {visible.map((member) => <button key={member.id} type="button" onClick={() => choose(member)} className={`w-full rounded-2xl border p-3 text-right transition ${selectedId === member.id ? "border-amber-300/50 bg-amber-300/10" : "border-white/10 bg-white/[0.035] hover:bg-white/[0.07]"}`}>
                <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg">{member.teamEmoji || "👤"}</span><div className="min-w-0 flex-1"><div className="truncate font-black">{member.fullName}</div><div className="mt-1 flex items-center gap-2 text-xs text-slate-400"><span className="rounded-md bg-white/5 px-1.5 py-0.5 font-black text-amber-200">#{member.memberNumber || "—"}</span><span className="truncate" dir="ltr">{member.phone || member.email || "بدون رقم"}</span></div></div><span className="text-xs text-slate-500">›</span></div>
              </button>)}
              {!visible.length && <div className="p-8 text-center text-sm text-slate-400">لا يوجد أعضاء مطابقون.</div>}
            </div>}
            <div className="mt-4 flex items-center justify-between gap-2"><button disabled={page === 1} onClick={() => setPage((p) => Math.max(1,p-1))} className="min-h-10 rounded-xl border border-white/10 px-3 text-xs font-bold disabled:opacity-30">السابق</button><span className="text-xs text-slate-400">{page} / {pages}</span><button disabled={page === pages} onClick={() => setPage((p) => Math.min(pages,p+1))} className="min-h-10 rounded-xl border border-white/10 px-3 text-xs font-bold disabled:opacity-30">التالي</button></div>
          </aside>

          <div className="p-4 md:p-6">
            {!selected || !form ? <div className="flex min-h-[520px] flex-col items-center justify-center text-center"><span className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/[0.06]"><UserRound className="h-7 w-7 text-slate-400"/></span><h3 className="text-xl font-black">اختر عضوًا</h3><p className="mt-2 max-w-sm text-sm leading-7 text-slate-400">ستظهر هنا بيانات الحساب، البطولات، الألعاب وخيارات إدارة العضو.</p></div> : <div className="space-y-5">
              <div className="flex flex-col gap-4 rounded-3xl border border-amber-300/20 bg-amber-300/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-xs font-bold text-amber-200">ملف العضو</div><div className="mt-1 text-2xl font-black">{selected.fullName}</div><div className="mt-3 flex flex-wrap gap-2"><span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-[11px] font-black text-white"><Hash className="h-3.5 w-3.5 text-amber-300"/>رقم العضوية {selected.memberNumber || "—"}</span><span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-[11px] font-bold text-slate-300"><CalendarDays className="h-3.5 w-3.5 text-amber-300"/>تاريخ التسجيل {dateLabel(selected.createdAt)}</span></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => navigator.clipboard?.writeText(selected.id)} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold"><Copy className="h-4 w-4"/>نسخ المعرّف</button><a href={`/members/${selected.id}`} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-3 text-xs font-bold">عرض الملف</a></div></div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{activityStats.map(([label,value,Icon]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-slate-950/50 p-3"><div className="flex items-center gap-2 text-xs text-slate-400"><Icon className="h-4 w-4"/>{String(label)}</div><div className="mt-2 text-xl font-black">{detailsLoading ? "…" : Number(value)}</div></div>)}</div>

              <form onSubmit={save} className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 md:p-5"><div className="mb-4 flex items-center gap-2"><UserRound className="h-5 w-5 text-amber-300"/><h3 className="font-black">بيانات الحساب</h3></div><div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs font-bold text-slate-300">الاسم<input maxLength={20} required value={form.fullName} onChange={(e)=>setForm({...form,fullName:e.target.value})} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-white px-3 text-sm text-slate-950 outline-none focus:border-amber-300"/></label>
                <label className="text-xs font-bold text-slate-300">رقم الجوال<input required value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-white px-3 text-sm text-slate-950 outline-none focus:border-amber-300" dir="ltr"/></label>
                <label className="text-xs font-bold text-slate-300">المنتخب المفضل<select required value={form.teamCode} onChange={(e)=>setForm({...form,teamCode:e.target.value})} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm"><option value="">اختر المنتخب</option>{teams.map((t)=><option key={t.code} value={t.code}>{t.emoji} {t.nameAr}</option>)}</select></label>
                <label className="text-xs font-bold text-slate-300">تعيين رقم سري جديد<div className="relative mt-2"><input type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} placeholder="اتركه فارغًا بدون تغيير" className="min-h-11 w-full rounded-xl border border-white/10 bg-white pr-3 pl-12 text-sm text-slate-950 outline-none focus:border-amber-300"/><button type="button" onClick={()=>setShowPassword((value)=>!value)} aria-label={showPassword ? "إخفاء الرقم السري" : "إظهار الرقم السري"} className="absolute left-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">{showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></div></label>
              </div><button disabled={saving} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 text-sm font-black text-slate-950 disabled:opacity-50"><KeyRound className="h-4 w-4"/>{saving ? "جاري الحفظ…" : "حفظ بيانات العضو"}</button></form>

              <section className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 md:p-5"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-black">البطولات</h3><p className="mt-1 text-xs text-slate-400">كل بطولة مستقلة بإحصائياتها وترتيبها.</p></div><Trophy className="h-5 w-5 text-amber-300"/></div>{detailsLoading ? <div className="py-6 text-center text-sm text-slate-400">جاري تحميل النشاط…</div> : <div className="grid gap-3 md:grid-cols-2">{details?.tournaments.map((t)=><div key={t.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="flex items-center justify-between gap-2"><div className="font-black">{t.name}</div>{t.legacy && <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-slate-400">نظام سابق</span>}</div><div className="mt-3 grid grid-cols-4 gap-2 text-center"><div><b className="block text-lg">{t.points}</b><span className="text-[10px] text-slate-400">نقطة</span></div><div><b className="block text-lg">{t.rank || "—"}</b><span className="text-[10px] text-slate-400">الترتيب</span></div><div><b className="block text-lg">{t.played}</b><span className="text-[10px] text-slate-400">محتسبة</span></div><div><b className="block text-lg text-emerald-300">{t.exact}</b><span className="text-[10px] text-slate-400">بالملي</span></div></div></div>)}</div>}</section>

              <section className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 md:p-5"><div className="mb-4 flex items-center gap-2"><Gamepad2 className="h-5 w-5 text-cyan-300"/><h3 className="font-black">الألعاب والتحديات</h3></div><div className="grid gap-2 sm:grid-cols-2">{details?.games.breakdown.map((g)=><div key={g.gameId} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] p-3"><div><div className="text-sm font-black">{gameLabel(g.gameId)}</div><div className="mt-1 text-[11px] text-slate-400">{g.played} لعب • {g.wins} فوز</div></div><span className="rounded-xl bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-200">{g.xp} نقطة خبرة</span></div>)}</div></section>
            </div>}
          </div>
        </div>
      </section>
    </div>
  );
}
