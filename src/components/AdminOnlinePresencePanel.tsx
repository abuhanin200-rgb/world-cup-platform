"use client";

import { useEffect, useState } from "react";
import { getOnlineMembers } from "@/lib/presenceService";
import type { OnlinePresence } from "@/types/presence";

function formatLastSeen(lastSeen: number) {
  const diffSeconds = Math.max(0, Math.floor((Date.now() - lastSeen) / 1000));

  if (diffSeconds < 10) return "الآن";
  if (diffSeconds < 60) return `قبل ${diffSeconds} ثانية`;

  const minutes = Math.floor(diffSeconds / 60);
  return `قبل ${minutes} دقيقة`;
}

function getPageLabel(path: string) {
  if (path === "/") return "الرئيسية";
  if (path.startsWith("/word-game")) return "خمن كلمة اليوم";
  if (path.startsWith("/vocabulary-challenge")) return "تحدي المفردات";
  if (path.startsWith("/account")) return "حسابي";
  if (path.startsWith("/rules")) return "القوانين";
  if (path.startsWith("/login")) return "الدخول";
  if (path.startsWith("/register")) return "التسجيل";
  if (path.startsWith("/admin")) return "لوحة الأدمن";

  return path;
}

export default function AdminOnlinePresencePanel() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<OnlinePresence[]>([]);

  async function loadData() {
    try {
      setLoading(true);
      const data = await getOnlineMembers();
      setMembers(data);
    } catch (error) {
      console.error("Online presence load error:", error);
      alert("تعذر تحميل المتواجدين الآن");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black md:text-2xl">
            🟢 المتواجدون الآن
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            يعرض الأعضاء النشطين خلال آخر دقيقة. التحديث يدوي فقط.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "جاري التحديث..." : "تحديث"}
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
          جاري تحميل المتواجدين...
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
          لا يوجد أعضاء متواجدون الآن.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[44px_1fr_140px_1fr_110px] bg-white/10 text-[12px] font-black text-slate-300 md:text-sm">
              <div className="px-2 py-3 text-center">#</div>
              <div className="px-2 py-3 text-right">العضو</div>
              <div className="px-2 py-3 text-center">الصفحة</div>
              <div className="px-2 py-3 text-right">النشاط</div>
              <div className="px-2 py-3 text-center">آخر ظهور</div>
            </div>

            {members.map((member, index) => (
              <div
                key={member.userId}
                className="grid grid-cols-[44px_1fr_140px_1fr_110px] items-center border-t border-white/10 text-[12px] md:text-sm"
              >
                <div className="px-2 py-3 text-center font-bold text-emerald-300">
                  {index + 1}
                </div>

                <div className="truncate px-2 py-3 text-right font-semibold text-white">
                  {member.fullName}
                </div>

                <div className="px-2 py-3 text-center font-bold text-amber-300">
                  {getPageLabel(member.path)}
                </div>

                <div className="truncate px-2 py-3 text-right text-slate-200">
                  {member.activity}
                </div>

                <div className="px-2 py-3 text-center text-slate-300">
                  {formatLastSeen(member.lastSeen)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}