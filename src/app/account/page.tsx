"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function StatCard({
  label,
  value,
  colorClass = "text-white",
}: {
  label: string;
  value: string | number;
  colorClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-center">
      <div className={`text-2xl font-black ${colorClass}`}>{value}</div>
      <div className="mt-2 text-xs text-slate-300 md:text-sm">{label}</div>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, isLoggedIn, logout, refreshUser } = useAuth();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login");
    }
  }, [loading, isLoggedIn, router]);

  useEffect(() => {
    if (isLoggedIn) {
      refreshUser();
    }
  }, [isLoggedIn]);

  if (loading || !user) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 text-white"
      >
        <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-center shadow-2xl">
          جاري تحميل حسابك...
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 text-white"
    >
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15"
          >
            العودة للرئيسية
          </button>

          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white hover:bg-red-400"
          >
            خروج
          </button>
        </header>

        <section className="rounded-3xl border border-white/10 bg-white/10 p-5 text-center shadow-2xl md:p-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 text-4xl">
            {user.teamEmoji || "🏆"}
          </div>

          <h1 className="text-3xl font-black md:text-4xl">{user.fullName}</h1>

          <p className="mt-2 text-sm text-slate-300 md:text-base">
            المنتخب المرشح:{" "}
            <span className="font-black text-amber-300">
              {user.favoriteTeam || "غير محدد"}
            </span>
          </p>

          <div className="mt-5 inline-flex rounded-full border border-white/10 bg-slate-950/60 px-5 py-2 text-sm text-slate-200">
            ترتيبك الحالي:{" "}
            <span className="mx-1 font-black text-amber-300">
              #{user.currentRank || "-"}
            </span>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="النقاط"
            value={user.points || 0}
            colorClass="text-amber-300"
          />

          <StatCard label="عدد التوقعات" value={user.total || 0} />

          <StatCard
            label="الصحيح"
            value={user.correct || 0}
            colorClass="text-emerald-300"
          />

          <StatCard
            label="الخطأ"
            value={user.wrong || 0}
            colorClass="text-red-300"
          />
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <StatCard
            label="السلسلة الحالية"
            value={user.currentStreak || 0}
            colorClass="text-sky-300"
          />

          <StatCard
            label="أفضل سلسلة صحيحة"
            value={user.bestStreak || 0}
            colorClass="text-orange-300"
          />
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl">
          <h2 className="mb-3 text-xl font-black">معلومة حسابك</h2>

          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-950/60 p-3">
              <span>رقم الجوال</span>
              <span className="font-bold text-white">{user.phone || "-"}</span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-950/60 p-3">
              <span>حالة الحساب</span>
              <span className="font-bold text-emerald-300">مفعل</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}