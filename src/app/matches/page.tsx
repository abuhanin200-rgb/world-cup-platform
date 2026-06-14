"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import MatchesPredictionBox from "@/components/MatchesPredictionBox";
import LatestPredictionsTicker from "@/components/LatestPredictionsTicker";
import LeaderboardTable from "@/components/LeaderboardTable";

export default function MatchesPage() {
  const router = useRouter();
  const { user, loading, isLoggedIn, logout } = useAuth();

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
    >
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 md:px-4 md:py-4">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-2 md:gap-3"
          >
            <div className="h-10 w-10 overflow-hidden rounded-2xl border border-white/20 bg-white/10 md:h-12 md:w-12">
              <img
                src="/wc2026-logo.png"
                alt="شعار منصة توقعات كأس العالم 2026"
                className="h-full w-full object-contain p-1"
              />
            </div>

            <div className="text-right">
              <h1 className="text-xs font-black md:text-xl">
                مباريات وتوقعات كأس العالم 2026
              </h1>
              <p className="text-[10px] text-slate-300 md:text-sm">
                سجّل توقعك وتابع نقاطك في لوحة الصدارة
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1.5 md:gap-2">
            {loading ? (
              <div className="rounded-xl border border-white/10 px-2 py-2 text-[10px] text-slate-300 md:px-3 md:text-xs">
                جاري التحقق...
              </div>
            ) : isLoggedIn && user ? (
              <>
                <button
                  type="button"
                  onClick={() => router.push("/account")}
                  className="rounded-xl border border-white/10 px-2 py-2 text-xs font-bold hover:bg-white/10 md:px-3 md:text-sm"
                >
                  حسابي
                </button>

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                  className="rounded-xl bg-red-500 px-2 py-2 text-xs font-bold text-white hover:bg-red-400 md:px-3 md:text-sm"
                >
                  خروج
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="rounded-xl border border-white/10 px-2 py-2 text-xs font-bold hover:bg-white/10 md:px-3 md:text-sm"
                >
                  دخول
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/register")}
                  className="rounded-xl bg-amber-400 px-2 py-2 text-xs font-black text-slate-950 hover:bg-amber-300 md:px-3 md:text-sm"
                >
                  تسجيل
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-3 py-4 md:px-4 md:py-6">
        <div className="mb-4 rounded-3xl border border-white/10 bg-white/10 p-4 text-center shadow-2xl md:mb-5 md:p-5">
          <h2 className="text-2xl font-black leading-snug md:text-4xl">
            🔥 شاركنا توقعك
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
            اختر نتيجة المباراة قبل بدايتها، وبعد الاحتساب تظهر نقاطك مباشرة في
            لوحة الصدارة.
          </p>

          {isLoggedIn && user ? (
            <div className="mx-auto mt-4 max-w-xl rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100 md:text-base">
              أهلًا يا {user.fullName}، نقاطك الحالية:{" "}
              <strong>{user.points}</strong>
            </div>
          ) : (
            !loading && (
              <div className="mx-auto mt-4 max-w-xl rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100 md:text-base">
                سجّل دخولك عشان تعتمد توقعك رسميًا.
              </div>
            )
          )}

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-black hover:bg-white/10 md:text-sm"
            >
              الرئيسية
            </button>

            <button
              type="button"
              onClick={() => router.push("/rules")}
              className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-black text-amber-100 hover:bg-amber-400/20 md:text-sm"
            >
              📘 قوانين التحدي
            </button>
          </div>
        </div>

        <div className="mb-4 md:mb-5">
          <LatestPredictionsTicker />
        </div>

        <MatchesPredictionBox />

        <LeaderboardTable />
      </section>

      <footer className="border-t border-white/10 py-5 text-center text-xs text-slate-400">
        <div className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
          <span>©</span>
          <span>فكرة وتصميم</span>
          <span className="font-bold text-slate-200">عبدالسلام العنزي</span>
        </div>
      </footer>
    </main>
  );
}