"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { RefreshCw, ShieldCheck, Sparkles, Trophy, Users, Zap } from "lucide-react";
import { db } from "@/lib/firebase";
import { rebuildPlatformGameXpFromAdmin } from "@/lib/platformGameXpClient";
import type { PlatformGameStats } from "@/domain/games/platformGames";

function mapStats(id: string, data: Record<string, unknown>): PlatformGameStats {
  return {
    userId: String(data.userId || id),
    userName: String(data.userName || "عضو"),
    totalXp: Number(data.totalXp || 0),
    level: Math.max(1, Number(data.level || 1)),
    gamesPlayed: Number(data.gamesPlayed || 0),
    wins: Number(data.wins || 0),
    gameStats: (data.gameStats || {}) as PlatformGameStats["gameStats"],
    updatedAt: data.updatedAt,
  };
}

export default function AdminPlatformGamesXpPanel() {
  const [items, setItems] = useState<PlatformGameStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const q = query(collection(db, "platformGameStats"), orderBy("totalXp", "desc"));
    return onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map((item) => mapStats(item.id, item.data())));
      setLoading(false);
    }, (error) => {
      console.error("Admin platform game stats error:", error);
      setLoading(false);
    });
  }, []);

  const totals = useMemo(() => ({
    users: items.length,
    xp: items.reduce((sum, item) => sum + item.totalXp, 0),
    played: items.reduce((sum, item) => sum + item.gamesPlayed, 0),
  }), [items]);

  async function handleRebuild() {
    const confirmed = window.confirm(
      "إعادة بناء XP ستقرأ كل نتائج الألعاب الحالية وتعيد إنشاء ترتيب الألعاب من الصفر. لن تمس نقاط البطولات أو كأس العالم. هل تريد المتابعة؟",
    );
    if (!confirmed) return;

    try {
      setRebuilding(true);
      setMessage("");
      const result = await rebuildPlatformGameXpFromAdmin();
      setMessage(`تمت إعادة البناء: ${result.events || 0} حدث XP لـ ${result.users || 0} عضو.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إعادة بناء XP الألعاب");
    } finally {
      setRebuilding(false);
    }
  }

  return (
    <section className="space-y-4" dir="rtl">
      <div className="rounded-3xl border border-amber-300/15 bg-amber-300/[0.06] p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-amber-300">
              <Zap className="h-5 w-5" aria-hidden="true" />
              <h3 className="text-lg font-black">XP وترتيب الألعاب</h3>
            </div>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
              هذا النظام مستقل بالكامل عن نقاط البطولات. إعادة البناء مفيدة بعد حذف نتيجة لعبة أو عند ترحيل النتائج القديمة لأول مرة.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRebuild}
            disabled={rebuilding}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 text-sm font-black text-slate-950 transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${rebuilding ? "animate-spin" : ""}`} aria-hidden="true" />
            {rebuilding ? "جاري إعادة البناء…" : "إعادة بناء XP"}
          </button>
        </div>
        {message && <p className="mt-3 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-xs font-bold text-slate-200">{message}</p>}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <Users className="h-5 w-5 text-emerald-300" aria-hidden="true" />
          <div className="mt-3 text-2xl font-black">{loading ? "…" : totals.users}</div>
          <div className="mt-1 text-xs font-bold text-slate-400">أعضاء في ترتيب الألعاب</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <Sparkles className="h-5 w-5 text-amber-300" aria-hidden="true" />
          <div dir="ltr" className="mt-3 text-2xl font-black">{loading ? "…" : `${totals.xp} XP`}</div>
          <div className="mt-1 text-xs font-bold text-slate-400">إجمالي XP الممنوح</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <Trophy className="h-5 w-5 text-sky-300" aria-hidden="true" />
          <div className="mt-3 text-2xl font-black">{loading ? "…" : totals.played}</div>
          <div className="mt-1 text-xs font-bold text-slate-400">نتائج ألعاب محتسبة</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/35">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" />
          <h4 className="text-sm font-black">أفضل 10 في الألعاب</h4>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {items.slice(0, 10).map((item, index) => (
            <div key={item.userId} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 px-4 py-3">
              <div className="text-center text-sm font-black text-slate-500">{index + 1}</div>
              <div className="min-w-0">
                <div className="truncate text-sm font-black">{item.userName}</div>
                <div className="mt-1 text-[10px] font-bold text-slate-500">Level {item.level} · {item.gamesPlayed} لعبة · {item.wins} فوز</div>
              </div>
              <div dir="ltr" className="text-sm font-black text-amber-300">{item.totalXp} XP</div>
            </div>
          ))}
          {!loading && items.length === 0 && (
            <div className="p-6 text-center text-sm font-bold text-slate-500">اضغط «إعادة بناء XP» لترحيل نتائج الألعاب الحالية.</div>
          )}
        </div>
      </div>
    </section>
  );
}
