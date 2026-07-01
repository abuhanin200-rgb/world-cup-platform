"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import HomeStats from "@/components/HomeStats";
import LatestPredictionsTicker from "@/components/LatestPredictionsTicker";
import MatchesPredictionBox from "@/components/MatchesPredictionBox";
import LeaderboardTable from "@/components/LeaderboardTable";
import HomeHighlights, { ExactHitsTicker } from "@/components/HomeHighlights";
import ExactPredictionCelebration from "@/components/ExactPredictionCelebration";
import HomeBanner from "@/components/HomeBanner";
import OnlineMembersCounter from "@/components/OnlineMembersCounter";
import PredictionEditNotice from "../components/PredictionEditNotice";
import MemberNoticeRenderer from "@/components/MemberNoticeRenderer";
import { getPublishedChallengeStudioBulletins } from "@/lib/challengeStudio";

const CHALLENGE_STUDIO_LAST_SEEN_KEY = "challengeStudioLastSeenBulletin";

const forgotPasswordMessage = `السلام عليكم، نسيت الرقم السري في منصة توقعات كأس العالم 2026.

*بيانات التحقق*

الاسم المسجل:
رقم الجوال المسجل:
المنتخب المرشح:

أرجو إعادة تعيين كلمة المرور.`;

const forgotPasswordWhatsappUrl = `https://wa.me/966542180200?text=${encodeURIComponent(
  forgotPasswordMessage
)}`;

function getChallengeStudioBulletinSeenKey(bulletin: {
  id?: string;
  date?: string;
  summary?: string;
}) {
  return `${bulletin.id || ""}-${bulletin.date || ""}-${
    bulletin.summary || ""
  }`;
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading, isLoggedIn, logout } = useAuth();

  const [hasUnreadChallengeStudio, setHasUnreadChallengeStudio] =
    useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkChallengeStudioUnread() {
      try {
        const bulletins = await getPublishedChallengeStudioBulletins(1);
        const latestBulletin = bulletins[0];

        if (!latestBulletin) {
          if (isMounted) {
            setHasUnreadChallengeStudio(false);
          }

          return;
        }

        const latestKey = getChallengeStudioBulletinSeenKey(latestBulletin);
        const savedKey = window.localStorage.getItem(
          CHALLENGE_STUDIO_LAST_SEEN_KEY
        );

        if (isMounted) {
          setHasUnreadChallengeStudio(
            Boolean(latestKey && latestKey !== savedKey)
          );
        }
      } catch (error) {
        console.error("Challenge studio unread check error:", error);
      }
    }

    checkChallengeStudioUnread();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
    >
      <ExactPredictionCelebration />
      <PredictionEditNotice />

      {isLoggedIn && user && <MemberNoticeRenderer userId={user.id} />}

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
        <div className="rounded-3xl border border-white/10 bg-white/10 p-4 text-center shadow-2xl md:p-5">
          <h2 className="mb-2 text-2xl font-black leading-snug md:text-4xl">
            تحدي توقعات كأس العالم 2026
          </h2>

          <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
            سجّل توقعاتك، تابع نقاطك، وتحدّى أصحابك لمعرفة من يملك أقوى قراءة
            لنتائج المباريات.
          </p>

          {!isLoggedIn && !loading && (
            <>
              <div className="mt-4 flex flex-row justify-center gap-2 md:mt-5 md:gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/register")}
                  className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 md:px-6"
                >
                  ابدأ التحدي الآن
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold hover:bg-white/10 md:px-6"
                >
                  لدي حساب
                </button>
              </div>

              <div className="mt-3">
                <a
                  href={forgotPasswordWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full max-w-sm items-center justify-center rounded-xl border border-red-300/40 bg-red-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-red-950/30 hover:bg-red-500 md:text-base"
                >
                  🔐 نسيت الرقم السري؟ تواصل معنا واتساب
                </a>
              </div>
            </>
          )}

          {isLoggedIn && user && (
            <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100 md:mt-5 md:p-4 md:text-base">
              أهلًا بعودتك يا بطل {user.fullName}، نقاطك الحالية:{" "}
              <strong>{user.points}</strong>
            </div>
          )}

          <div className="mt-3">
            <button
              type="button"
              onClick={() => router.push("/rules")}
              className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-black text-amber-100 hover:bg-amber-400/20 md:text-sm"
            >
              📘 قوانين التحدي وطريقة احتساب النقاط
            </button>
          </div>
        </div>

        <HomeBanner />

        <div className="mt-4 md:mt-5">
          <HomeStats />
        </div>

        <div className="mt-4 md:mt-5">
          <LatestPredictionsTicker />
        </div>

        <HomeHighlights />

        <div className="mt-4 md:mt-5">
          <MatchesPredictionBox />
        </div>

        <ExactHitsTicker />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => router.push("/word-game")}
            className="inline-flex min-h-[54px] items-center justify-center rounded-full border border-amber-400/30 bg-slate-950/40 px-3 py-3 text-xs font-black text-amber-100 shadow-lg shadow-slate-950/30 transition hover:border-amber-300/50 hover:bg-amber-400/10 md:px-6 md:text-sm"
          >
            <span className="ml-2 text-lg">🎮</span>
            <span>خمن كلمة اليوم</span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/challenge-studio")}
            className="relative inline-flex min-h-[54px] items-center justify-center rounded-full border border-cyan-400/30 bg-slate-950/40 px-3 py-3 text-xs font-black text-cyan-100 shadow-lg shadow-slate-950/30 transition hover:border-cyan-300/50 hover:bg-cyan-400/10 md:px-6 md:text-sm"
          >
            {hasUnreadChallengeStudio && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-red-500 ring-2 ring-slate-950" />
              </span>
            )}

            <span className="ml-2 text-lg">🎙️</span>
            <span>استوديو التحدي</span>
          </button>
        </div>

        <LeaderboardTable />

        <div className="mt-4 flex items-center justify-center">
          <OnlineMembersCounter />
        </div>
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