"use client";

import { useEffect, useState } from "react";
import {
  getChallengeStudioOnlineViewers,
  getChallengeStudioTodayVisitors,
} from "@/lib/presenceService";
import type { OnlinePresence } from "@/types/presence";

function formatLastSeen(lastSeen: number) {
  const diffSeconds = Math.max(0, Math.floor((Date.now() - lastSeen) / 1000));

  if (diffSeconds < 10) return "الآن";
  if (diffSeconds < 60) return `قبل ${diffSeconds} ثانية`;

  const minutes = Math.floor(diffSeconds / 60);
  return `قبل ${minutes} دقيقة`;
}

export default function AdminChallengeStudioViewersPanel() {
  const [loading, setLoading] = useState(true);
  const [onlineViewers, setOnlineViewers] = useState<OnlinePresence[]>([]);
  const [todayVisitors, setTodayVisitors] = useState<OnlinePresence[]>([]);

  async function loadData() {
    try {
      setLoading(true);

      const [online, today] = await Promise.all([
        getChallengeStudioOnlineViewers(),
        getChallengeStudioTodayVisitors(),
      ]);

      setOnlineViewers(online);
      setTodayVisitors(today);
    } catch (error) {
      console.error("Challenge studio viewers load error:", error);
      alert("تعذر تحميل مشاهدي استوديو التحدي");
    } finally {
      setLoading(false);
    }
  }

 useEffect(() => {
  loadData();
}, []);

  const onlineIds = new Set(onlineViewers.map((item) => item.userId));

  return (
    <section className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-4 shadow-2xl md:p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black md:text-2xl">
            👀 مشاهدو استوديو التحدي
          </h2>
          <p className="mt-1 text-sm text-cyan-100">
            يعرض من يشاهد الاستوديو الآن، ومن دخل الصفحة خلال اليوم.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10 disabled:opacity-50"
        >
          {loading ? "جاري التحديث..." : "تحديث"}
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
          <div className="text-sm text-emerald-100">يشاهد الآن</div>
          <div className="mt-2 text-3xl font-black text-white">
            {onlineViewers.length}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
          <div className="text-sm text-amber-100">دخلوا اليوم</div>
          <div className="mt-2 text-3xl font-black text-white">
            {todayVisitors.length}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
          جاري تحميل المشاهدين...
        </div>
      ) : todayVisitors.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
          لا يوجد أعضاء دخلوا استوديو التحدي اليوم.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[44px_1fr_140px_120px] bg-white/10 text-[12px] font-black text-slate-300 md:text-sm">
              <div className="px-2 py-3 text-center">#</div>
              <div className="px-2 py-3 text-right">العضو</div>
              <div className="px-2 py-3 text-center">الحالة</div>
              <div className="px-2 py-3 text-center">آخر ظهور</div>
            </div>

            {todayVisitors.map((member, index) => {
              const isOnline = onlineIds.has(member.userId);

              return (
                <div
                  key={member.userId}
                  className="grid grid-cols-[44px_1fr_140px_120px] items-center border-t border-white/10 text-[12px] md:text-sm"
                >
                  <div className="px-2 py-3 text-center font-bold text-emerald-300">
                    {index + 1}
                  </div>

                  <div className="truncate px-2 py-3 text-right font-semibold text-white">
                    {member.fullName}
                  </div>

                  <div className="px-2 py-3 text-center">
                    {isOnline ? (
                      <span className="rounded-full bg-emerald-400 px-3 py-1 text-[11px] font-black text-slate-950">
                        🟢 متواجد الآن
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-700 px-3 py-1 text-[11px] font-bold text-slate-200">
                        دخل اليوم
                      </span>
                    )}
                  </div>

                  <div className="px-2 py-3 text-center text-slate-300">
                    {formatLastSeen(member.lastSeen)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}