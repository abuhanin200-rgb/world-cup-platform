"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, CalendarClock, ChevronDown, Crown, Crosshair, ExternalLink, Flame, Gift, Loader2, LockKeyhole, Medal, Newspaper, Radio, RefreshCw, Sparkles, Target, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { GULF_CUP_27_ACHIEVEMENTS, GULF_CUP_27_TOURNAMENT_ID, type TournamentRewardV2, type TournamentStudioPostV2, type TournamentUserAchievementV2 } from "@/domain/tournaments";
import { getTournamentRewardsV2, getTournamentStudioPostsV2, getUserTournamentAchievementsV2 } from "@/lib/tournamentEngagementV2";
import type { GulfCup27NewsItem } from "@/lib/gulfCup27News";

const CATEGORY_LABELS = { news: "خبر", analysis: "تحليل", alert: "تنبيه", achievement: "إنجاز" } as const;
const RARITY_LABELS = { common: "عادية", rare: "نادرة", epic: "ملحمية", legendary: "أسطورية" } as const;
const ACHIEVEMENT_ICONS: Record<string, typeof Trophy> = {
  first_exact: Target,
  three_exact: Crosshair,
  five_streak: Flame,
  top_three: Medal,
  prediction_king: Crown,
  champion: Trophy,
};
const RARITY_STYLES = { common: "border-slate-300/15 bg-slate-300/[0.08] text-slate-100", rare: "border-sky-300/20 bg-sky-300/[0.09] text-sky-100", epic: "border-fuchsia-300/20 bg-fuchsia-300/[0.09] text-fuchsia-100", legendary: "border-amber-300/25 bg-amber-300/[0.10] text-amber-100" } as const;

const NEWS_DATE_FORMATTER = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Riyadh" });
const NEWS_RELATIVE_FORMATTER = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });

function formatNewsTime(timestamp: number) {
  if (!timestamp) return "حديث";
  const diffMinutes = Math.round((timestamp - Date.now()) / 60_000);
  if (Math.abs(diffMinutes) < 60) return NEWS_RELATIVE_FORMATTER.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return NEWS_RELATIVE_FORMATTER.format(diffHours, "hour");
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) <= 6) return NEWS_RELATIVE_FORMATTER.format(diffDays, "day");
  return NEWS_DATE_FORMATTER.format(new Date(timestamp));
}

function AutoNewsCard({ item, featured = false }: { item: GulfCup27NewsItem; featured?: boolean }) {
  return <a href={item.url} target="_blank" rel="noopener noreferrer" className={`group block rounded-[22px] border border-white/10 bg-black/15 transition hover:border-emerald-300/25 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${featured ? "p-5 md:p-6" : "p-4"}`}>
    <div className="flex items-center justify-between gap-3 text-[11px] font-black">
      <span className="inline-flex min-w-0 items-center gap-2 text-emerald-200"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-emerald-300/15 bg-emerald-300/10"><Newspaper className="h-3.5 w-3.5"/></span><span className="truncate">{item.source}</span></span>
      <span className="inline-flex shrink-0 items-center gap-1.5 text-white/42"><CalendarClock className="h-3.5 w-3.5"/>{formatNewsTime(item.publishedAt)}</span>
    </div>
    <h3 className={`mt-3 font-black leading-[1.75] text-white transition group-hover:text-emerald-50 ${featured ? "text-lg md:text-xl" : "text-[15px]"}`}>{item.title}</h3>
    <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-black text-white/42 group-hover:text-emerald-200"><ExternalLink className="h-3.5 w-3.5"/>قراءة الخبر من المصدر</div>
  </a>;
}

function GulfCup27AutoNews() {
  const [items, setItems] = useState<GulfCup27NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [updatedAt, setUpdatedAt] = useState(0);

  const loadNews = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/tournaments/gulf-cup-27/news");
      if (!response.ok) throw new Error(`News ${response.status}`);
      const payload = await response.json() as { items?: GulfCup27NewsItem[]; updatedAt?: number };
      setItems(Array.isArray(payload.items) ? payload.items : []);
      setUpdatedAt(Number(payload.updatedAt) || Date.now());
    } catch (loadError) {
      console.error("Gulf Cup 27 news UI error:", loadError);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { queueMicrotask(() => void loadNews()); }, [loadNews]);

  return <section className="overflow-hidden rounded-[28px] border border-emerald-300/15 bg-gradient-to-b from-emerald-300/[0.07] to-white/[0.035]">
    <div className="border-b border-white/[0.08] p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-emerald-300/15 bg-emerald-300/10 text-emerald-200"><Radio className="h-6 w-6"/></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-black text-emerald-200/80">تغطية تلقائية</p><span className="inline-flex items-center gap-1 rounded-full border border-red-300/15 bg-red-400/10 px-2 py-0.5 text-[9px] font-black text-red-100"><span className="h-1.5 w-1.5 rounded-full bg-red-300 animate-pulse"/>مباشر</span></div><h2 className="mt-0.5 text-xl font-black md:text-2xl">آخر أخبار خليجي الديار العربية 27</h2><p className="mt-1 text-xs font-semibold leading-6 text-white/48">أحدث الأخبار من مصادر متعددة في مكان واحد.</p></div></div>
        <button type="button" onClick={() => void loadNews()} disabled={loading} aria-label="تحديث أخبار خليجي 27" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/65 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}/></button>
      </div>
      {!loading && !error && items.length > 0 && <div className="mt-3 text-[10px] font-bold text-white/35">{items.length} خبر · آخر تحديث {formatNewsTime(updatedAt)}</div>}
    </div>

    <div className="p-4 md:p-5">
      {loading && items.length === 0 ? <div className="grid min-h-40 place-items-center text-center"><div><Loader2 className="mx-auto h-7 w-7 animate-spin text-emerald-200"/><p className="mt-3 text-sm font-bold text-white/50">جاري جلب آخر أخبار البطولة...</p></div></div> : error && items.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 p-7 text-center"><p className="text-sm font-bold text-white/55">تعذر تحديث الأخبار الآن.</p><button type="button" onClick={() => void loadNews()} className="mt-3 min-h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black">إعادة المحاولة</button></div> : items.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 p-7 text-center text-sm font-semibold text-white/45">لا توجد أخبار جديدة حاليًا.</div> : <>
        <AutoNewsCard item={items[0]} featured/>
        {items.length > 1 && <div className="mt-3 grid gap-3 md:grid-cols-2">{items.slice(1, visibleCount).map((item) => <AutoNewsCard key={item.id} item={item}/>)}</div>}
        {visibleCount < items.length && <button type="button" onClick={() => setVisibleCount((count) => Math.min(count + 12, items.length))} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-4 text-xs font-black text-white/65 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"><ChevronDown className="h-4 w-4"/>عرض المزيد من الأخبار</button>}
      </>}
    </div>
  </section>;
}

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
  const load=useCallback(async()=>{ setLoading(true);setError(""); try { const [p,r,a]=await Promise.all([getTournamentStudioPostsV2(GULF_CUP_27_TOURNAMENT_ID),getTournamentRewardsV2(GULF_CUP_27_TOURNAMENT_ID),user?getUserTournamentAchievementsV2(GULF_CUP_27_TOURNAMENT_ID,user.id):Promise.resolve([])]); setPosts(p);setRewards(r);setAchievements(a);} catch(e){console.error(e);setError("تعذر تحميل استوديو خليجي الديار العربية 27");} finally{setLoading(false);} },[user]);
  useEffect(()=>{queueMicrotask(()=>void load());},[load]);
  const unlocked=useMemo(()=>new Set(achievements.map((item)=>item.key)),[achievements]);
  if(loading) return <div className="rounded-[28px] border border-white/10 bg-white/5 p-10 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-200"/><p className="mt-3 font-bold text-white/60">جاري تحميل الاستوديو...</p></div>;
  return <div className="space-y-5">
    <GulfCup27AutoNews />

    <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-200"><Newspaper className="h-6 w-6"/></div><div><p className="text-xs font-black text-emerald-200/75">محتوى البطولة</p><h2 className="text-xl font-black md:text-2xl">استوديو خليجي الديار العربية 27</h2></div></div><button type="button" onClick={()=>void load()} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><RefreshCw className="h-4 w-4"/>تحديث</button></div>
      {error && <div role="alert" className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/10 p-3 text-sm font-bold text-red-100">{error}</div>}
      <div className="mt-5 grid gap-3">{posts.length?posts.map((post)=><PostCard key={post.id} post={post}/>):<div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm font-semibold text-white/45">لا توجد نشرات منشورة حتى الآن.</div>}</div>
    </section>

    <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 md:p-6">
      <div className="flex items-center gap-3"><Award className="h-7 w-7 text-amber-200"/><div><p className="text-xs font-black text-amber-200/70">مسيرتك</p><h2 className="text-xl font-black">الشارات والإنجازات</h2></div></div>
      {!user && <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/15 p-4 text-sm font-bold text-white/55"><LockKeyhole className="h-5 w-5"/>سجّل الدخول لعرض شاراتك المفتوحة.</div>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{GULF_CUP_27_ACHIEVEMENTS.map((def)=>{const isUnlocked=unlocked.has(def.key);const Icon=ACHIEVEMENT_ICONS[def.key]||Award;return <article key={def.key} className={`rounded-[22px] border p-4 ${isUnlocked?"border-amber-300/25 bg-amber-300/[0.08]":"border-white/[0.08] bg-black/10 opacity-65"}`}><div className="flex items-start gap-3"><div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${RARITY_STYLES[def.rarity]}`} aria-hidden="true"><Icon className="h-5 w-5"/></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{def.title}</h3>{isUnlocked&&<Sparkles className="h-4 w-4 text-amber-200"/>}</div><p className="mt-1 text-xs font-semibold leading-6 text-white/58">{def.description}</p><p className="mt-2 text-[10px] font-black text-white/50">{RARITY_LABELS[def.rarity]} · {isUnlocked?"مفتوحة":"مقفلة"}</p></div></div></article>;})}</div>
    </section>

    <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 md:p-6">
      <div className="flex items-center gap-3"><Gift className="h-7 w-7 text-sky-200"/><div><p className="text-xs font-black text-sky-200/70">جوائز البطولة</p><h2 className="text-xl font-black">الجوائز والمراكز</h2></div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">{rewards.length?rewards.map((reward)=><article key={reward.id} className="rounded-[22px] border border-sky-300/15 bg-sky-300/[0.05] p-4"><div className="flex items-start gap-3"><Trophy className="mt-1 h-6 w-6 text-sky-200"/><div><div className="text-[11px] font-black text-sky-200/70">المراكز {reward.rankFrom === reward.rankTo ? reward.rankFrom : `${reward.rankFrom}–${reward.rankTo}`}</div><h3 className="mt-1 font-black">{reward.title}</h3><p className="mt-1 text-sm font-semibold leading-6 text-white/55">{reward.description}</p></div></div></article>):<div className="md:col-span-2 rounded-2xl border border-dashed border-white/15 p-7 text-center text-sm font-semibold text-white/45">سيتم إعلان الجوائز هنا عند اعتمادها.</div>}</div>
    </section>
  </div>;
}
