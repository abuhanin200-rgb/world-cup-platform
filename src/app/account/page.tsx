"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { Award, Gamepad2, Medal, Settings, ShieldCheck, Target, Trophy, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { getTournamentLeaderboardV2 } from "@/lib/tournamentV2Firestore";
import { updateUserProfile } from "@/lib/users";
import { ASIAN_CUP_2027_TOURNAMENT, GULF_CUP_27_TOURNAMENT, GULF_CUP_27_TOURNAMENT_ID, WORLD_CUP_2026_TOURNAMENT, getTournamentHref } from "@/domain/tournaments";
import type { PlatformGameStats } from "@/domain/games/platformGames";
import { getLevelLabel } from "@/domain/games/platformGames";

type Tab = "overview" | "gulf" | "world" | "asia" | "games" | "settings";
type V2Stats = { points:number; rank:number|null; played:number; exact:number; correctOutcome:number; wrong:number; bestStreak:number };
const EMPTY_V2: V2Stats = { points:0, rank:null, played:0, exact:0, correctOutcome:0, wrong:0, bestStreak:0 };

function Stat({ label, value, accent=false }: { label:string; value:string|number; accent?:boolean }) {
  return <div className="rounded-[18px] border border-white/10 bg-white/[0.05] p-3 text-center md:rounded-[22px] md:p-4"><div dir="ltr" className={`text-xl font-black md:text-2xl ${accent ? "text-[var(--brand-yellow)]" : "text-white"}`}>{value}</div><div className="mt-1 text-[10px] font-bold text-white/45 md:text-xs">{label}</div></div>;
}

export default function AccountPage() {
  const router=useRouter(); const {user,isLoggedIn,loading,refreshUser}=useAuth();
  const [tab,setTab]=useState<Tab>("overview"); const [gulf,setGulf]=useState<V2Stats>(EMPTY_V2); const [games,setGames]=useState<PlatformGameStats|null>(null);
  const [editing,setEditing]=useState(false); const [fullName,setFullName]=useState(""); const [phone,setPhone]=useState(""); const [favoriteTeam,setFavoriteTeam]=useState(""); const [message,setMessage]=useState(""); const [saving,setSaving]=useState(false);

  useEffect(()=>{if(!loading&&!isLoggedIn)router.replace("/login")},[loading,isLoggedIn,router]);
  useEffect(()=>{if(!user)return;setFullName(user.fullName);setPhone(user.phone);setFavoriteTeam(user.favoriteTeam);void getTournamentLeaderboardV2(GULF_CUP_27_TOURNAMENT_ID).then((rows)=>{const row=rows.find(x=>x.userId===user.id);if(row)setGulf({points:row.points,rank:row.rank,played:row.played,exact:row.exact,correctOutcome:row.correctOutcome,wrong:row.wrong,bestStreak:row.bestStreak})}).catch(console.error);return onSnapshot(doc(db,"platformGameStats",user.id),(snap)=>setGames(snap.exists()?snap.data() as PlatformGameStats:null))},[user]);

  const general=useMemo(()=>({points:(user?.points||0)+gulf.points,played:(user?.total||0)+gulf.played,exact:(user?.correct||0)+gulf.exact,bestMath:Math.max(user?.bestStreak||0,gulf.bestStreak),gameXp:games?.totalXp||0}),[user,gulf,games]);
  if(loading||!user)return <main className="flex min-h-[60vh] items-center justify-center text-sm font-bold text-white/55">جاري تحميل الملف الشخصي…</main>;

  const tabs:[Tab,string,typeof Trophy][]=[
    ["overview","نظرة عامة",UserRound],["gulf","خليجي 27",Trophy],["world","كأس العالم",Medal],["asia","آسيا 2027",Award],["games","الألعاب",Gamepad2],["settings","الإعدادات",Settings]
  ];

  async function saveProfile(e:FormEvent){e.preventDefault();if(!user){setMessage("تعذر العثور على بيانات الحساب. سجّل الدخول مرة أخرى.");return;}setSaving(true);setMessage("");try{await updateUserProfile({userId:user.id,fullName,phone,favoriteTeam,teamEmoji:user.teamEmoji});await refreshUser();setMessage("تم حفظ بياناتك بنجاح");setEditing(false)}catch(err){setMessage(err instanceof Error?err.message:"تعذر حفظ البيانات")}finally{setSaving(false)}}

  return <main dir="rtl" className="mx-auto max-w-7xl px-3 pb-12 pt-5 sm:px-4 md:px-6 md:pb-16 md:pt-8">
    <section className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#071d54] p-4 md:rounded-[34px] md:p-7"><div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(255,194,16,.18),transparent_28%)]"/><div className="relative flex items-center gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] border border-white/12 bg-white/[0.06] text-2xl font-black text-[var(--brand-yellow)] md:h-20 md:w-20 md:rounded-[24px]">{user.fullName.trim().charAt(0)}</div><div className="min-w-0 flex-1"><p className="text-[10px] font-black text-[var(--brand-yellow)] md:text-xs">ملف العضو</p><h1 className="mt-1 truncate text-2xl font-black md:text-3xl">{user.fullName}</h1><p className="mt-1 text-xs font-semibold text-white/50 md:text-sm">{user.favoriteTeam ? `يشجع ${user.favoriteTeam}` : "عضو في منصة التحدي"}</p></div></div></section>

    <div className="hidden-scrollbar mt-4 flex gap-1.5 overflow-x-auto pb-1 md:mt-6 md:gap-2">{tabs.map(([key,label,Icon])=><button key={key} onClick={()=>setTab(key)} className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[10px] font-black md:min-h-[44px] md:px-4 md:text-xs ${tab===key?"border-[var(--brand-yellow)] bg-[var(--brand-yellow)] text-[#061a4d]":"border-white/10 bg-white/[0.05] text-white/60"}`}><Icon className="h-3.5 w-3.5 md:h-4 md:w-4"/>{label}</button>)}</div>

    <section className="mt-4 md:mt-6">
      {tab==="overview"&&<><div className="grid grid-cols-2 gap-2.5 md:grid-cols-5"><Stat label="نقاط البطولات" value={general.points} accent/><Stat label="المشاركات" value={general.played}/><Stat label="إصابات صحيحة" value={general.exact}/><Stat label="أفضل سلسلة" value={general.bestMath}/><Stat label="XP الألعاب" value={general.gameXp}/></div><div className="mt-4 grid gap-2.5 md:grid-cols-3">{[[GULF_CUP_27_TOURNAMENT,gulf.rank?`المركز ${gulf.rank}`:"شارك وابدأ المنافسة"],[WORLD_CUP_2026_TOURNAMENT,user.currentRank?`المركز ${user.currentRank}`:"السجل النهائي"],[ASIAN_CUP_2027_TOURNAMENT,"قريبًا"]].map(([t,meta])=><Link key={(t as typeof GULF_CUP_27_TOURNAMENT).id} href={getTournamentHref(t as typeof GULF_CUP_27_TOURNAMENT)} className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/[0.05] p-4 transition hover:bg-white/[0.08]"><div><div className="text-sm font-black">{(t as typeof GULF_CUP_27_TOURNAMENT).shortName}</div><div className="mt-1 text-[10px] font-bold text-white/45">{meta as string}</div></div><Trophy className="h-5 w-5 text-[var(--brand-yellow)]"/></Link>)}</div></>}

      {tab==="gulf"&&<div><div className="mb-3"><h2 className="text-xl font-black">خليجي 27</h2><p className="mt-1 text-xs font-semibold text-white/50">إحصائيات مشاركتك في البطولة الحالية.</p></div><div className="grid grid-cols-2 gap-2.5 md:grid-cols-6"><Stat label="المركز" value={gulf.rank||"—"} accent/><Stat label="النقاط" value={gulf.points}/><Stat label="المباريات" value={gulf.played}/><Stat label="بالملي" value={gulf.exact}/><Stat label="صحيح" value={gulf.correctOutcome}/><Stat label="أفضل سلسلة" value={gulf.bestStreak}/></div><Link href="/tournaments/gulf-cup-27" className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-[var(--brand-yellow)] px-4 text-xs font-black text-[#061a4d]">دخول البطولة</Link></div>}

      {tab==="world"&&<div><div className="mb-3"><h2 className="text-xl font-black">كأس العالم 2026</h2><p className="mt-1 text-xs font-semibold text-white/50">نتيجتك النهائية في البطولة.</p></div><div className="grid grid-cols-2 gap-2.5 md:grid-cols-6"><Stat label="المركز" value={user.currentRank||"—"} accent/><Stat label="النقاط" value={user.points}/><Stat label="التوقعات" value={user.total}/><Stat label="الصحيح" value={user.correct}/><Stat label="الخطأ" value={user.wrong}/><Stat label="أفضل سلسلة" value={user.bestStreak}/></div><Link href="/tournaments/world-cup-2026" className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-white px-4 text-xs font-black text-[#061a4d]">استعراض البطولة</Link></div>}

      {tab==="asia"&&<div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-7 text-center"><Award className="mx-auto h-8 w-8 text-[var(--brand-yellow)]"/><h2 className="mt-3 text-xl font-black">كأس آسيا 2027</h2><p className="mt-2 text-sm font-semibold text-white/50">سيظهر سجل مشاركتك وإحصائياتك هنا عند بدء البطولة.</p></div>}

      {tab==="games"&&<div><div className="mb-3"><h2 className="text-xl font-black">الألعاب والتحديات</h2><p className="mt-1 text-xs font-semibold text-white/50">مستواك ونشاطك في ألعاب منصة التحدي.</p></div><div className="grid grid-cols-2 gap-2.5 md:grid-cols-5"><Stat label="XP" value={games?.totalXp||0} accent/><Stat label="المستوى" value={games?.level||1}/><Stat label="التحديات" value={games?.gamesPlayed||0}/><Stat label="الانتصارات" value={games?.wins||0}/><Stat label="التصنيف" value={getLevelLabel(games?.level||1)}/></div><Link href="/games" className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-[var(--brand-yellow)] px-4 text-xs font-black text-[#061a4d]">فتح الألعاب</Link></div>}

      {tab==="settings"&&<div className="max-w-2xl rounded-[24px] border border-white/10 bg-white/[0.05] p-4 md:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">بيانات الحساب</h2><p className="mt-1 text-xs font-semibold text-white/45">حدّث بياناتك الأساسية عند الحاجة.</p></div><ShieldCheck className="h-6 w-6 text-[var(--brand-yellow)]"/></div><form onSubmit={saveProfile} className="mt-5 space-y-3"><label className="block text-xs font-black">الاسم<input disabled={!editing} value={fullName} onChange={e=>setFullName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none disabled:opacity-60 focus:border-[var(--brand-yellow)]"/></label><label className="block text-xs font-black">الجوال<input disabled={!editing} value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none disabled:opacity-60 focus:border-[var(--brand-yellow)]"/></label><label className="block text-xs font-black">المنتخب المفضل<input disabled={!editing} value={favoriteTeam} onChange={e=>setFavoriteTeam(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none disabled:opacity-60 focus:border-[var(--brand-yellow)]"/></label>{message?<div className="text-xs font-bold text-emerald-300">{message}</div>:null}<div className="flex gap-2">{editing?<><button disabled={saving} className="min-h-[44px] rounded-xl bg-[var(--brand-yellow)] px-4 text-xs font-black text-[#061a4d]">{saving?"جاري الحفظ…":"حفظ التعديلات"}</button><button type="button" onClick={()=>setEditing(false)} className="min-h-[44px] rounded-xl border border-white/10 px-4 text-xs font-black">إلغاء</button></>:<button type="button" onClick={()=>setEditing(true)} className="min-h-[44px] rounded-xl bg-white px-4 text-xs font-black text-[#061a4d]">تعديل البيانات</button>}</div></form></div>}
    </section>
  </main>;
}
