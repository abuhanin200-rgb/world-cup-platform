"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function TestAuthPage() {
  const { user, loading, isLoggedIn, logout, refreshUser } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-950 text-white p-6">
        جاري التحقق من جلسة الدخول...
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white p-6"
    >
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/10 p-6">
        <h1 className="mb-4 text-2xl font-black">اختبار تسجيل الدخول</h1>

        {isLoggedIn && user ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-4 text-emerald-200">
              أنت مسجل دخول حاليًا ✅
            </div>

            <div className="rounded-xl bg-slate-950/60 p-4 space-y-2">
              <p>
                <strong>الاسم:</strong> {user.fullName}
              </p>
              <p>
                <strong>الجوال:</strong> {user.phone || "غير محدد"}
              </p>
              <p>
                <strong>المنتخب المرشح:</strong> {user.teamEmoji}{" "}
                {user.favoriteTeam}
              </p>
              <p>
                <strong>النقاط:</strong> {user.points}
              </p>
              <p>
                <strong>عدد التوقعات:</strong> {user.total}
              </p>
            </div>

            <button
              onClick={refreshUser}
              className="w-full rounded-xl bg-blue-500 px-4 py-3 font-bold"
            >
              تحديث بياناتي من Firebase
            </button>

            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="w-full rounded-xl bg-red-500 px-4 py-3 font-bold"
            >
              تسجيل الخروج
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-red-500/40 bg-red-500/15 p-4 text-red-200">
              أنت غير مسجل دخول
            </div>

            <button
              onClick={() => router.push("/login")}
              className="w-full rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950"
            >
              الذهاب لتسجيل الدخول
            </button>
          </div>
        )}
      </div>
    </main>
  );
}