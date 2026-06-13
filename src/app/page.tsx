"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LatestPredictionsTicker from "@/components/LatestPredictionsTicker";
import MatchesPredictionBox from "@/components/MatchesPredictionBox";

export default function HomePage() {
  const router = useRouter();
  const { user, loading, isLoggedIn, logout } = useAuth();

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
    >
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-2xl border border-white/20 bg-white/10">
              <img
                src="/wc2026-logo.png"
                alt="شعار منصة توقعات كأس العالم 2026"
                className="h-full w-full object-contain p-1"
              />
            </div>

            <div>
              <h1 className="text-base font-black md:text-xl">
                منصة توقعات كأس العالم 2026
              </h1>
              <p className="text-xs text-slate-300 md:text-sm">
                World Cup 2026 Predictions Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {loading ? (
              <div className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300">
                جاري التحقق...
              </div>
            ) : isLoggedIn && user ? (
              <>
                <div className="hidden rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100 md:block">
                  يا هلا، {user.fullName}
                </div>

                <button
                  onClick={() => router.push("/test-auth")}
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold hover:bg-white/10"
                >
                  حسابي
                </button>

                <button
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                  className="rounded-xl bg-red-500 px-3 py-2 text-sm font-bold text-white hover:bg-red-400"
                >
                  خروج
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push("/login")}
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold hover:bg-white/10"
                >
                  دخول
                </button>

                <button
                  onClick={() => router.push("/register")}
                  className="rounded-xl bg-amber-400 px-3 py-2 text-sm font-black text-slate-950 hover:bg-amber-300"
                >
                  تسجيل
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-center shadow-2xl">
          <h2 className="mb-3 text-2xl font-black md:text-4xl">
            تحدي توقعات كأس العالم 2026
          </h2>

          <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
            سجّل توقعاتك، تابع نقاطك، وتحدّى أصحابك لمعرفة من يملك أقوى قراءة
            لنتائج المباريات.
          </p>

          {!isLoggedIn && !loading && (
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={() => router.push("/register")}
                className="rounded-xl bg-amber-400 px-6 py-3 font-black text-slate-950 hover:bg-amber-300"
              >
                ابدأ التحدي الآن
              </button>

              <button
                onClick={() => router.push("/login")}
                className="rounded-xl border border-white/10 px-6 py-3 font-bold hover:bg-white/10"
              >
                لدي حساب
              </button>
            </div>
          )}

          {isLoggedIn && user && (
            <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-100">
              أهلًا بعودتك يا بطل {user.fullName}، نقاطك الحالية:{" "}
              <strong>{user.points}</strong>
            </div>
          )}
        </div>

        <div className="mt-6">
          <LatestPredictionsTicker />
        </div>

        <div className="mt-6">
          <MatchesPredictionBox />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="mb-2 text-2xl">🏆</div>
            <h3 className="font-black">ملك التوقعات</h3>
            <p className="mt-2 text-sm text-slate-300">
              سيظهر هنا صاحب المركز الأول بعد احتساب النتائج.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="mb-2 text-2xl">🔥</div>
            <h3 className="font-black">أفضل سلسلة صحيحة</h3>
            <p className="mt-2 text-sm text-slate-300">
              سيتم عرض أفضل المتسابقين في التوقعات المتتالية الصحيحة.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-6 text-center text-sm text-slate-300">
        فكرة وتصميم: عبدالسلام العنزي
      </footer>
    </main>
  );
}