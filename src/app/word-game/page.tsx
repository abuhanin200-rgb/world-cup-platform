"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import WordGame from "@/components/word-game/WordGame";

export default function WordGamePage() {
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
                خمن كلمة اليوم
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

      <section className="mx-auto max-w-4xl px-3 py-4 md:px-4 md:py-6">
        <div className="mb-4 rounded-3xl border border-white/10 bg-white/10 p-4 text-center shadow-2xl md:p-5">
          <h2 className="mb-2 text-2xl font-black leading-snug md:text-4xl">
            🎮 خمن كلمة اليوم
          </h2>

          <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
            اكتب كلمة عربية من 5 حروف خلال 6 محاولات. إذا كان الحرف في مكانه
            الصحيح يظهر أخضر، وإذا كان موجودًا بمكان مختلف يظهر أصفر، وإذا لم
            يكن موجودًا يظهر رمادي.
          </p>
        </div>

        <WordGame />
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