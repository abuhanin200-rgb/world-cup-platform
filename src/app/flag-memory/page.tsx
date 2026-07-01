"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import FlagMemoryGame from "@/components/flag-memory/FlagMemoryGame";

export default function FlagMemoryPage() {
  const router = useRouter();
  const { user, loading, isLoggedIn, logout } = useAuth();

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
    >
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 md:px-4 md:py-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-2xl border border-white/20 bg-white/10 md:h-12 md:w-12">
              <img
                src="/wc2026-logo.png"
                alt="شعار منصة توقعات كأس العالم 2026"
                className="h-full w-full object-contain p-1"
              />
            </div>

            <div>
              <h1 className="text-xs font-black md:text-xl">
                منصة توقعات كأس العالم 2026
              </h1>
              <p className="text-[10px] text-slate-300 md:text-sm">
                World Cup 2026 Predictions Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            {loading ? (
              <div className="rounded-xl border border-white/10 px-2 py-2 text-[10px] text-slate-300 md:px-3 md:text-xs">
                جاري التحقق...
              </div>
            ) : isLoggedIn && user ? (
              <>
                <div className="hidden rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100 md:block">
                  يا هلا، {user.fullName}
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="rounded-xl border border-white/10 px-2 py-2 text-xs font-bold hover:bg-white/10 md:px-3 md:text-sm"
                >
                  الرئيسية
                </button>

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
                  onClick={() => router.push("/")}
                  className="rounded-xl border border-white/10 px-2 py-2 text-xs font-bold hover:bg-white/10 md:px-3 md:text-sm"
                >
                  الرئيسية
                </button>

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
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl border border-amber-400/30 bg-amber-400/10 text-3xl shadow-lg shadow-slate-950/30">
            🎌
          </div>

          <h2 className="mb-2 text-2xl font-black leading-snug md:text-4xl">
            تحدي تطابق الأعلام
          </h2>

          <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
            اختبر ذاكرتك، طابق أعلام المنتخبات، ونافس الأعضاء على أسرع وقت
            وأعلى نقاط في تحدي يومي جديد.
          </p>

          <div className="mt-4 flex flex-row justify-center gap-2 md:mt-5 md:gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold hover:bg-white/10 md:px-6"
            >
              العودة للرئيسية
            </button>

            <button
              type="button"
              onClick={() => router.push("/word-game")}
              className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-black text-amber-100 hover:bg-amber-400/20 md:px-6"
            >
              خمن كلمة اليوم
            </button>
          </div>
        </div>

        <FlagMemoryGame />
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