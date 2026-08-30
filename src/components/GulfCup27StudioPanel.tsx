"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, Gift, Loader2, LockKeyhole, Newspaper, RefreshCw, Sparkles, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { GULF_CUP_27_ACHIEVEMENTS, GULF_CUP_27_TOURNAMENT_ID, type TournamentRewardV2, type TournamentStudioPostV2, type TournamentUserAchievementV2 } from "@/domain/tournaments";
import { getTournamentRewardsV2, getTournamentStudioPostsV2, getUserTournamentAchievementsV2 } from "@/lib/tournamentEngagementV2";

const CATEGORY_LABELS = { news: "خبر", analysis: "تحليل", alert: "تنبيه", achievement: "إنجاز" } as const;
const RARITY_LABELS = { common: "عادية", rare: "نادرة", epic: "ملحمية", legendary: "أسطورية" } as const;

function PostCard({ post }: { post: TournamentStudioPostV2 }) {
  return <article className="rounded-[24px] border border-white/10 bg-black/15 p-5">
    <div className="flex flex-wrap items-center gap-2 text-[11px] font-black">
      <span className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-2.5 py-1 text-emerald-100">{CATEGORY_LABELS[post.category]}</span>
      {post.pinned && <span className="rounded-full border border-amber-300/15 bg-amber-300/10 px-2.5 py-1 text-amber-100">مثبت</span>}
    </div>
    <h3 className="mt-3 text-lg font-black">{post.title}</h3>
    <p className="mt-2 text-sm font-semibold leading-7 text-white/60">{post.summary}</p>
    {post.body && <p className="mt-3 whitespace-pre-line border-t border-white/[0.07] pt-3 text-sm font-medium leading-7 text-white/75">{post.body}</p>}
  </article>;
}

export default function GulfCup27StudioPanel() {
  const { user } = useAuth();
  const [posts,setPosts]=useState<TournamentStudioPostV2[]>([]); const [rewards,setRewards]=useState<TournamentRewardV2[]>([]); const [achievements,setAchievements]=useState<TournamentUserAchievementV2[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  async function load(){ setLoading(true);setError(""); try { const [p,r,a]=await Promise.all([getTournamentStudioPostsV2(GULF_CUP_27_TOURNAMENT_ID),getTournamentRewardsV2(GULF_CUP_27_TOURNAMENT_ID),user?getUserTournamentAchievementsV2(GULF_CUP_27_TOURNAMENT_ID,user.id):Promise.resolve([])]); setPosts(p);setRewards(r);setAchievements(a);} catch(e){console.error(e);setError("تعذر تحميل استوديو خليجي 27");} finally{setLoading(false);} }
  useEffect(()=>{void load();},[user?.id]);
  const unlocked=useMemo(()=>new Set(achievements.map((item)=>item.key)),[achievements]);
  if(loading) return <div className="rounded-[28px] border border-white/10 bg-white/5 p-10 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-200"/><p className="mt-3 font-bold text-white/60">جاري تحميل الاستوديو...</p></div>;
  return <div className="space-y-5">
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-200"><Newspaper className="h-6 w-6"/></div><div><p className="text-xs font-black text-emerald-200/75">محتوى البطولة</p><h2 className="text-xl font-black md:text-2xl">استوديو خليجي 27</h2></div></div><button type="button" onClick={()=>void load()} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><RefreshCw className="h-4 w-4"/>تحديث</button></div>
      {error && <div role="alert" className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/10 p-3 text-sm font-bold text-red-100">{error}</div>}
      <div className="mt-5 grid gap-3">{posts.length?posts.map((post)=><PostCard key={post.id} post={post}/>):<div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm font-semibold text-white/45">لا توجد نشرات منشورة حتى الآن.</div>}</div>
    </section>

    <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 md:p-6">
      <div className="flex items-center gap-3"><Award className="h-7 w-7 text-amber-200"/><div><p className="text-xs font-black text-amber-200/70">مسيرتك</p><h2 className="text-xl font-black">الشارات والإنجازات</h2></div></div>
      {!user && <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/15 p-4 text-sm font-bold text-white/55"><LockKeyhole className="h-5 w-5"/>سجّل الدخول لعرض شاراتك المفتوحة.</div>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{GULF_CUP_27_ACHIEVEMENTS.map((def)=>{const isUnlocked=unlocked.has(def.key);return <article key={def.key} className={`rounded-[22px] border p-4 ${isUnlocked?"border-amber-300/25 bg-amber-300/[0.08]":"border-white/[0.08] bg-black/10 opacity-65"}`}><div className="flex items-start gap-3"><div className="text-3xl" aria-hidden="true">{def.badge}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{def.title}</h3>{isUnlocked&&<Sparkles className="h-4 w-4 text-amber-200"/>}</div><p className="mt-1 text-xs font-semibold leading-6 text-white/50">{def.description}</p><p className="mt-2 text-[10px] font-black text-white/35">{RARITY_LABELS[def.rarity]} · {isUnlocked?"مفتوحة":"مقفلة"}</p></div></div></article>;})}</div>
    </section>

    <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 md:p-6">
      <div className="flex items-center gap-3"><Gift className="h-7 w-7 text-sky-200"/><div><p className="text-xs font-black text-sky-200/70">جوائز البطولة</p><h2 className="text-xl font-black">الجوائز والمراكز</h2></div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">{rewards.length?rewards.map((reward)=><article key={reward.id} className="rounded-[22px] border border-sky-300/15 bg-sky-300/[0.05] p-4"><div className="flex items-start gap-3"><Trophy className="mt-1 h-6 w-6 text-sky-200"/><div><div className="text-[11px] font-black text-sky-200/70">المراكز {reward.rankFrom === reward.rankTo ? reward.rankFrom : `${reward.rankFrom}–${reward.rankTo}`}</div><h3 className="mt-1 font-black">{reward.title}</h3><p className="mt-1 text-sm font-semibold leading-6 text-white/55">{reward.description}</p></div></div></article>):<div className="md:col-span-2 rounded-2xl border border-dashed border-white/15 p-7 text-center text-sm font-semibold text-white/45">سيتم إعلان الجوائز هنا عند اعتمادها.</div>}</div>
    </section>
  </div>;
}
