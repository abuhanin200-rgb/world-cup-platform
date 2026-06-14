"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const router = useRouter();
  const { user, loading, isLoggedIn, logout } = useAuth();

  return (
    <nav
      dir="rtl"
      className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl"
    >
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
            <h1 className="text-xs font-black text-white md:text-xl">
              منصة توقعات كأس العالم 2026
            </h1>
            <p className="text-[10px] text-slate-300 md:text-sm">
              World Cup 2026 Predictions Platform
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
              <div className="hidden rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100 md:block">
                يا هلا، {user.fullName}
              </div>

              <button
                type="button"
                onClick={() => router.push("/account")}
                className="rounded-xl border border-white/10 px-2 py-2 text-xs font-bold text-white hover:bg-white/10 md:px-3 md:text-sm"
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
                className="rounded-xl border border-white/10 px-2 py-2 text-xs font-bold text-white hover:bg-white/10 md:px-3 md:text-sm"
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
    </nav>
  );
}