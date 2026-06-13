"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import TopCandidateTeams from "@/components/TopCandidateTeams";
import LatestPredictionsTicker from "@/components/LatestPredictionsTicker";
import MatchesPredictionBox from "@/components/MatchesPredictionBox";
import LeaderboardTable from "@/components/LeaderboardTable";

export default function HomePage() {
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
                  onClick={() => router.push("/test-auth")}
                  className="rounded-xl border border-white/10 px-2 py-2 text-xs font-bold hover:bg-white/10 md:px-3 md:text-sm"
                >
                  حسابي
                </button>

                <button
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
                  onClick={() => router.push("/login")}
                  className="rounded-xl border border-white/10 px-2 py-2 text-xs font-bold hover:bg-white/10 md:px-3 md:text-sm"
                >
                  دخول
                </button>

                <button
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

      <section className="mx-auto max-w-6xl px-3 py-5 md:px-4 md:py-8">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-4 text-center shadow-2xl md:p-6">
          <h2 className="mb-3 text-2xl font-black leading-snug md:text-4xl">
            تحدي توقعات كأس العالم 2026
          </h2>

          <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
            سجّل توقعاتك، تابع نقاطك، وتحدّى أصحابك لمعرفة من يملك أقوى قراءة
            لنتائج المباريات.
          </p>

          {!isLoggedIn && !loading && (
            <div className="mt-5 flex flex-row justify-center gap-2 md:mt-6 md:gap-3">
              <button
                onClick={() => router.push("/register")}
                className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 md:px-6"
              >
                ابدأ التحدي الآن
              </button>

              <button
                onClick={() => router.push("/login")}
                className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold hover:bg-white/10 md:px-6"
              >
                لدي حساب
              </button>
            </div>
          )}

          {isLoggedIn && user && (
            <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100 md:mt-6 md:p-4 md:text-base">
              أهلًا بعودتك يا بطل {user.fullName}، نقاطك الحالية:{" "}
              <strong>{user.points}</strong>
            </div>
          )}
        </div>

        <div className="mt-5 md:mt-6">
          <TopCandidateTeams />
        </div>

        <div className="mt-5 md:mt-6">
          <LatestPredictionsTicker />
        </div>

        <div className="mt-5 md:mt-6">
          <MatchesPredictionBox />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:mt-8 md:gap-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3 md:p-5">
            <div className="mb-2 text-xl md:text-2xl">🏆</div>
            <h3 className="text-sm font-black md:text-base">ملك التوقعات</h3>
            <p className="mt-2 text-xs leading-6 text-slate-300 md:text-sm">
              سيظهر هنا صاحب المركز الأول بعد احتساب النتائج.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3 md:p-5">
            <div className="mb-2 text-xl md:text-2xl">🔥</div>
            <h3 className="text-sm font-black md:text-base">
              أفضل سلسلة صحيحة
            </h3>
            <p className="mt-2 text-xs leading-6 text-slate-300 md:text-sm">
              سيتم عرض أفضل المتسابقين في التوقعات المتتالية الصحيحة.
            </p>
          </div>
        </div>

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