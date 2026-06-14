"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import GlobalStats from "@/components/GlobalStats";
import TopCandidateTeams from "@/components/TopCandidateTeams";
import LatestPredictionsTicker from "@/components/LatestPredictionsTicker";
import HomeHighlights, { ExactHitsTicker } from "@/components/HomeHighlights";
import MatchesPredictionBox from "@/components/MatchesPredictionBox";
import LeaderboardTable from "@/components/LeaderboardTable";
import ExactPredictionCelebration from "@/components/ExactPredictionCelebration";

export default function HomePage() {
  const router = useRouter();
  const { user, loading, isLoggedIn, logout } = useAuth();

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
    >
      <ExactPredictionCelebration />

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
                منصة توقعات كأس العالم 2026
              </h1>
              <p className="text-[10px] text-slate-300 md:text-sm">
                تحدي التوقعات بين الأعضاء
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
                  className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-2 py-2 text-xs font-bold text-emerald-100 hover:bg-emerald-400/20 md:px-3 md:text-sm"
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
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 p-5 text-center shadow-2xl md:p-8">
          <div className="absolute -top-20 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-amber-400/20 blur-3xl" />

          <div className="relative">
            <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 shadow-xl md:h-32 md:w-32">
              <img
                src="/wc2026-logo.png"
                alt="شعار منصة توقعات كأس العالم 2026"
                className="h-full w-full object-contain p-3"
              />
            </div>

            <h2 className="text-3xl font-black leading-snug md:text-5xl">
              تحدي توقعات كأس العالم 2026
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-200 md:text-lg md:leading-8">
              سجّل توقعك قبل بداية المباراة، تابع نقاطك في لوحة الصدارة،
              ونشوف من بطل التوقعات في نهاية التحدي.
            </p>

            {isLoggedIn && user ? (
              <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100 md:text-base">
                يا هلا {user.fullName}، نقاطك الحالية:{" "}
                <strong>{user.points}</strong>
              </div>
            ) : (
              !loading && (
                <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100 md:text-base">
                  سجّل دخولك وشاركنا توقعك الرسمي.
                </div>
              )
            )}

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/rules")}
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black hover:bg-white/20"
              >
                📘 قوانين التحدي
              </button>

              <button
                type="button"
                onClick={() => router.push(isLoggedIn ? "/account" : "/login")}
                className="rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300"
              >
                {isLoggedIn ? "حسابي ونقاطي" : "ابدأ التحدي"}
              </button>
            </div>
          </div>
        </div>

        <GlobalStats />

        <TopCandidateTeams />

        <LatestPredictionsTicker />

        <HomeHighlights />

        <MatchesPredictionBox />

        <ExactHitsTicker />

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