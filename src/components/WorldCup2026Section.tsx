"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { BookOpen, Newspaper, Target } from "lucide-react";
import MatchesPredictionBox from "@/components/MatchesPredictionBox";
import LeaderboardTable from "@/components/LeaderboardTable";
import HomeHighlights from "@/components/HomeHighlights";
import TeamFlag from "@/components/TeamFlag";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { getAccountPredictions, type AccountPrediction } from "@/lib/accountPredictions";
import type { TournamentSection } from "@/domain/tournaments";

type Bulletin = { id: string; date: string; summary: string; published: boolean; cards: Array<{ title?: string; content?: string }> };

function PredictionsArchive() {
  const { user, isLoggedIn } = useAuth();
  const [rows, setRows] = useState<AccountPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    async function load() {
      if (!user?.id) { setRows([]); setLoading(false); return; }
      try {
        const nextRows = await getAccountPredictions(user.id);
        if (active) setRows(nextRows);
      } catch (e) { console.error(e); } finally { if (active) setLoading(false); }
    }
    void load(); return () => { active = false; };
  }, [user?.id]);

  if (!isLoggedIn) return <div className="rounded-[24px] border border-white/10 bg-white/[0.055] p-6 text-center"><Target className="mx-auto h-8 w-8 text-cyan-300" /><h2 className="mt-3 text-xl font-black">توقعاتك في كأس العالم 2026</h2><p className="mt-2 text-sm font-semibold text-white/55">سجّل الدخول لعرض سجل توقعاتك في البطولة.</p></div>;
  return <div><div className="mb-4"><h2 className="text-xl font-black md:text-2xl">سجل توقعاتي</h2><p className="mt-1 text-xs font-semibold text-white/50">كل توقعاتك مرتبة من الأحدث إلى الأقدم مع نتائج احتسابها.</p></div>{loading ? <div className="p-8 text-center text-white/50">جاري تحميل التوقعات…</div> : rows.length === 0 ? <div className="rounded-[22px] border border-white/10 bg-white/[0.05] p-7 text-center text-sm font-bold text-white/50">لا توجد توقعات مسجلة لهذا الحساب.</div> : <div className="grid gap-2.5 md:grid-cols-2">{rows.map((row) => <article key={row.id} className="rounded-[20px] border border-white/10 bg-white/[0.05] p-4"><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm font-black"><div className="flex min-w-0 items-center gap-2"><TeamFlag code={row.homeTeamCode} emoji={row.homeTeamEmoji} name={row.homeTeamName} size="sm"/><span className="truncate">{row.homeTeamName}</span></div><span dir="ltr" className="rounded-xl bg-black/20 px-3 py-1.5">{row.homeScore} - {row.awayScore}</span><div className="flex min-w-0 items-center justify-end gap-2"><span className="truncate">{row.awayTeamName}</span><TeamFlag code={row.awayTeamCode} emoji={row.awayTeamEmoji} name={row.awayTeamName} size="sm"/></div></div><div className="mt-3 flex items-center justify-between border-t border-white/[0.07] pt-3 text-xs font-bold text-white/50"><span>{row.isCalculated ? (row.resultType === "exact" ? "بالملي" : row.points > 0 ? "توقع صحيح" : "لم يصب") : "بانتظار الاحتساب"}</span><span dir="ltr" className="font-black text-amber-300">{row.points} نقطة</span></div></article>)}</div>}</div>;
}

function StudioArchive() {
  const [posts, setPosts] = useState<Bulletin[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; (async () => { try { const snap = await getDocs(query(collection(db, "challengeStudio"), where("published", "==", true))); if (!active) return; const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Bulletin,"id">) })).sort((a,b) => String(b.date).localeCompare(String(a.date))); setPosts(items); } catch(e){console.error(e)} finally {if(active)setLoading(false)} })(); return () => {active=false}; }, []);
  return <div><div className="mb-4"><h2 className="text-xl font-black md:text-2xl">استوديو كأس العالم 2026</h2><p className="mt-1 text-xs font-semibold text-white/50">أبرز النشرات والتحليلات التي رافقت البطولة.</p></div>{loading ? <div className="p-8 text-center text-white/50">جاري تحميل الاستوديو…</div> : posts.length === 0 ? <HomeHighlights /> : <div className="grid gap-3">{posts.map((post) => <article key={post.id} className="rounded-[22px] border border-white/10 bg-white/[0.05] p-4 md:p-5"><div className="flex items-center gap-2 text-xs font-black text-cyan-300"><Newspaper className="h-4 w-4" />{post.date || "نشرة البطولة"}</div><h3 className="mt-2 text-lg font-black">{post.summary || "من استوديو البطولة"}</h3>{Array.isArray(post.cards) && post.cards.length ? <div className="mt-3 grid gap-2 md:grid-cols-2">{post.cards.slice(0,4).map((card,i) => <div key={i} className="rounded-xl bg-black/15 p-3"><div className="text-sm font-black">{card.title || "تحليل"}</div><p className="mt-1 text-xs font-semibold leading-6 text-white/55">{card.content || ""}</p></div>)}</div> : null}</article>)}</div>}</div>;
}

function RulesArchive() {
  const cards = [
    ["دور المجموعات", "3 نقاط للتوقع بالملي، ونقطة واحدة لتوقع الفائز أو التعادل الصحيح."],
    ["خروج المغلوب", "تدخل نقاط النتيجة والمتأهل وطريقة التأهل حسب نظام البطولة المعتمد وقتها."],
    ["التوقعات", "سجل البطولة معروض كما انتهى، بما في ذلك النقاط والترتيب النهائي لكل عضو."],
  ];
  return <div className="grid gap-3 md:grid-cols-3">{cards.map(([title,text]) => <article key={title} className="rounded-[22px] border border-white/10 bg-white/[0.05] p-5"><BookOpen className="h-5 w-5 text-cyan-300"/><h2 className="mt-3 text-lg font-black">{title}</h2><p className="mt-2 text-sm font-semibold leading-7 text-white/55">{text}</p></article>)}</div>;
}

export default function WorldCup2026Section({ section }: { section: TournamentSection }) {
  const content = useMemo(() => {
    if (section === "matches") return <MatchesPredictionBox />;
    if (section === "predictions") return <PredictionsArchive />;
    if (section === "leaderboard") return <LeaderboardTable />;
    if (section === "studio") return <StudioArchive />;
    return <RulesArchive />;
  }, [section]);
  return <div className="mx-auto max-w-7xl px-3 pb-14 pt-1 sm:px-4 md:px-6 md:pb-20">{content}</div>;
}
