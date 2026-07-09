"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  BookOpen,
  ChevronLeft,
  Copyright,
  Flag,
  Gamepad2,
  KeyRound,
  LogIn,
  LogOut,
  Mic2,
  ShieldCheck,
  Sparkles,
  Timer,
  Trophy,
  UserCircle,
  UserPlus,
} from "lucide-react";
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
import KhaledDabousMarriageNotice from "@/components/KhaledDabousMarriageNotice";
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
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-[15px] text-white antialiased [text-size-adjust:100%]"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 top-16 h-64 w-64 rounded-full bg-cyan-400/10 blur-2xl" />
        <div className="absolute -left-24 top-80 h-72 w-72 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="absolute bottom-20 right-1/2 h-72 w-72 translate-x-1/2 rounded-full bg-blue-500/10 blur-2xl" />
      </div>

      <ExactPredictionCelebration />
      <PredictionEditNotice />
      <KhaledDabousMarriageNotice />

      {isLoggedIn && user && <MemberNoticeRenderer userId={user.id} />}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 shadow-lg shadow-slate-950/25 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 md:px-4 md:py-4">
          <div
            className="flex min-w-0 items-center gap-2 md:gap-3"
          >
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-md shadow-cyan-950/20 ring-1 ring-white/10 md:h-12 md:w-12">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-cyan-400/10" />
              <img
                src="/wc2026-logo.png"
                alt="شعار منصة توقعات كأس العالم 2026"
                className="relative h-full w-full object-contain p-1"
              />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-[12px] font-black tracking-tight md:text-xl">
                منصة توقعات كأس العالم 2026
              </h1>

              <p className="truncate text-[10px] font-medium text-slate-300 md:text-sm">
                World Cup 2026 Predictions Platform
              </p>
            </div>
          </div>

          <div
            className="flex shrink-0 items-center gap-1.5 md:gap-2"
          >
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 text-[10px] font-bold text-slate-300 shadow-md shadow-slate-950/20 md:px-3 md:text-xs">
                جاري التحقق...
              </div>
            ) : isLoggedIn && user ? (
              <>
                <div className="hidden rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-bold text-emerald-100 shadow-md shadow-emerald-950/20 md:block">
                  يا هلا، {user.fullName}
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/account")}
                  className="group inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-black text-white shadow-md shadow-slate-950/20 transition duration-200 hover:border-white/20 hover:bg-white/10 active:scale-95 md:px-3 md:text-sm"
                >
                  <UserCircle className="h-4 w-4 text-cyan-200 transition group-hover:scale-110" />
                  <span>حسابي</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                  className="group inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-2xl bg-red-500 px-2.5 py-2 text-xs font-black text-white shadow-md shadow-red-950/25 transition duration-200 hover:bg-red-400 active:scale-95 md:px-3 md:text-sm"
                >
                  <LogOut className="h-4 w-4 transition group-hover:-translate-x-0.5" />
                  <span>خروج</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="group inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-black text-white shadow-md shadow-slate-950/20 transition duration-200 hover:border-white/20 hover:bg-white/10 active:scale-95 md:px-3 md:text-sm"
                >
                  <LogIn className="h-4 w-4 text-cyan-200 transition group-hover:-translate-x-0.5" />
                  <span>دخول</span>
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/register")}
                  className="group inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-2xl bg-amber-400 px-2.5 py-2 text-xs font-black text-slate-950 shadow-md shadow-amber-950/20 transition duration-200 hover:bg-amber-300 active:scale-95 md:px-3 md:text-sm"
                >
                  <UserPlus className="h-4 w-4 transition group-hover:scale-110" />
                  <span>تسجيل</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-3 py-4 md:px-4 md:py-6">
        <div
          className="relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/[0.08] p-4 text-center shadow-xl shadow-slate-950/30 backdrop-blur-md md:rounded-[2rem] md:p-6"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-cyan-400/5" />
          <div className="pointer-events-none absolute -top-20 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-amber-300/10 blur-2xl" />

          <div className="relative mx-auto mb-3 inline-flex items-center justify-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-[11px] font-black text-amber-100 shadow-md shadow-amber-950/20 md:text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>تحدي الأبطال يبدأ من توقعك</span>
          </div>

          <h2 className="relative mb-2 text-[24px] font-black leading-snug tracking-tight md:text-4xl">
            تحدي توقعات كأس العالم 2026
          </h2>

          <p className="relative mx-auto max-w-2xl text-[14px] font-medium leading-7 text-slate-200 md:text-base">
            سجّل توقعاتك، تابع نقاطك، وتحدّى أصحابك لمعرفة من يملك أقوى قراءة
            لنتائج المباريات
          </p>

          {!isLoggedIn && !loading && (
            <>
              <div className="relative mt-4 flex flex-row justify-center gap-2 md:mt-5 md:gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/register")}
                  className="group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 text-[13px] font-black text-slate-950 shadow-lg shadow-amber-950/20 transition duration-200 hover:bg-amber-300 active:scale-95 md:px-6 md:text-sm"
                >
                  <Trophy className="h-5 w-5 transition group-hover:scale-110 group-hover:rotate-[-6deg]" />
                  <span>ابدأ التحدي الآن</span>
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[13px] font-black text-white shadow-lg shadow-slate-950/20 transition duration-200 hover:border-white/20 hover:bg-white/10 active:scale-95 md:px-6 md:text-sm"
                >
                  <LogIn className="h-5 w-5 text-cyan-200 transition group-hover:-translate-x-0.5" />
                  <span>لدي حساب</span>
                </button>
              </div>

              <div className="relative mt-3">
                <a
                  href={forgotPasswordWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex min-h-[48px] w-full max-w-sm items-center justify-center gap-2 rounded-2xl border border-red-300/35 bg-red-600 px-4 py-3 text-[13px] font-black text-white shadow-lg shadow-red-950/25 transition duration-200 hover:bg-red-500 active:scale-95 md:text-base"
                >
                  <KeyRound className="h-5 w-5 transition group-hover:scale-110" />
                  <span>نسيت الرقم السري؟ تواصل معنا واتساب</span>
                </a>
              </div>
            </>
          )}

          {isLoggedIn && user && (
            <div
              className="relative mt-4 rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-[14px] font-bold text-emerald-100 shadow-lg shadow-emerald-950/15 md:mt-5 md:p-4 md:text-base"
            >
              <div className="inline-flex items-center justify-center gap-2">
                <BadgeCheck className="h-5 w-5 text-emerald-200" />
                <span>
                  أهلًا بعودتك يا بطل {user.fullName}، نقاطك الحالية:{" "}
                  <strong>{user.points}</strong>
                </span>
              </div>
            </div>
          )}

          <div className="relative mt-3">
            <button
              type="button"
              onClick={() => router.push("/rules")}
              className="group inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-black text-amber-100 shadow-md shadow-amber-950/10 transition duration-200 hover:border-amber-300/50 hover:bg-amber-400/20 active:scale-95 md:text-sm"
            >
              <BookOpen className="h-4 w-4 transition group-hover:scale-110" />
              <span>قوانين التحدي وطريقة احتساب النقاط</span>
              <ChevronLeft className="h-4 w-4 opacity-80 transition group-hover:-translate-x-0.5" />
            </button>
          </div>
        </div>

        <div
          className=""
        >
          <HomeBanner />
        </div>

        <div
          className="mt-4 md:mt-5"
        >
          <HomeStats />
        </div>

        <div
          className="mt-4 md:mt-5"
        >
          <LatestPredictionsTicker />
        </div>

        <div
          className=""
        >
          <HomeHighlights />
        </div>

        <div
          className="mt-4 md:mt-5"
        >
          <MatchesPredictionBox />
        </div>

        <div
          className=""
        >
          <ExactHitsTicker />
        </div>

        <div
          className="mt-5 grid grid-cols-2 gap-3 md:mt-6 md:grid-cols-4"
        >
          <button
            type="button"
            onClick={() => router.push("/word-game")}
            className="group relative min-h-[92px] overflow-hidden rounded-[1.45rem] border border-amber-400/30 bg-slate-950/55 p-3 text-right shadow-lg shadow-slate-950/25 backdrop-blur-sm transition duration-200 hover:border-amber-300/60 hover:bg-amber-400/10"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-300/12 via-transparent to-white/5" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-20 w-20 rounded-full bg-amber-300/15 blur-2xl transition duration-300 group-hover:scale-110" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/50 to-transparent" />

            <div className="relative flex h-full flex-col justify-between gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/15 text-amber-100 shadow-md shadow-amber-950/15 transition duration-200 group-hover:-translate-y-0.5">
                  <Gamepad2 className="h-5 w-5" />
                </div>

                <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black text-amber-100">
                  لعبة يومية
                </span>
              </div>

              <div>
                <h3 className="text-base font-black text-white md:text-lg">
                  خمن كلمة اليوم
                </h3>

                <p className="mt-0.5 text-[11px] font-bold leading-5 text-amber-50/90">
                  خمن الكلمة وادخل ترتيب اليوم.
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px] font-black text-amber-200">
                <span>ابدأ اللعب</span>
                <ChevronLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => router.push("/flag-memory")}
            className="group relative min-h-[92px] overflow-hidden rounded-[1.45rem] border border-emerald-400/30 bg-slate-950/55 p-3 text-right shadow-lg shadow-slate-950/25 backdrop-blur-sm transition duration-200 hover:border-emerald-300/60 hover:bg-emerald-400/10"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-300/12 via-transparent to-white/5" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-20 w-20 rounded-full bg-emerald-300/15 blur-2xl transition duration-300 group-hover:scale-110" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/50 to-transparent" />

            <div className="relative flex h-full flex-col justify-between gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-300/15 text-emerald-100 shadow-md shadow-emerald-950/15 transition duration-200 group-hover:-translate-y-0.5">
                  <Flag className="h-5 w-5" />
                </div>

                <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black text-emerald-100">
                  تحدي ذاكرة
                </span>
              </div>

              <div>
                <h3 className="text-base font-black text-white md:text-lg">
                  تحدي الأعلام
                </h3>

                <p className="mt-0.5 text-[11px] font-bold leading-5 text-emerald-50/90">
                  طابق أعلام المنتخبات بأسرع وقت.
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px] font-black text-emerald-200">
                <span>ادخل التحدي</span>
                <ChevronLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => router.push("/ten-seconds-challenge")}
            className="group relative min-h-[92px] overflow-hidden rounded-[1.45rem] border border-violet-400/30 bg-slate-950/55 p-3 text-right shadow-lg shadow-slate-950/25 backdrop-blur-sm transition duration-200 hover:border-violet-300/60 hover:bg-violet-400/10"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-300/12 via-transparent to-white/5" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-20 w-20 rounded-full bg-violet-300/15 blur-2xl transition duration-300 group-hover:scale-110" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/50 to-transparent" />

            <div className="relative flex h-full flex-col justify-between gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-300/30 bg-violet-300/15 text-violet-100 shadow-md shadow-violet-950/15 transition duration-200 group-hover:-translate-y-0.5">
                  <Timer className="h-5 w-5" />
                </div>

                <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2.5 py-1 text-[10px] font-black text-violet-100">
                  10 ثواني
                </span>
              </div>

              <div>
                <h3 className="text-base font-black text-white md:text-lg">
                  تحدي العشر ثواني
                </h3>

                <p className="mt-0.5 text-[11px] font-bold leading-5 text-violet-50/90">
                  أوقف المؤقت عند 00:10.000.
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px] font-black text-violet-200">
                <span>جرّب التحدي</span>
                <ChevronLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => router.push("/challenge-studio")}
            className="group relative min-h-[92px] overflow-hidden rounded-[1.45rem] border border-cyan-400/30 bg-slate-950/55 p-3 text-right shadow-lg shadow-slate-950/25 backdrop-blur-sm transition duration-200 hover:border-cyan-300/60 hover:bg-cyan-400/10"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-300/12 via-transparent to-white/5" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-20 w-20 rounded-full bg-cyan-300/15 blur-2xl transition duration-300 group-hover:scale-110" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent" />

            {hasUnreadChallengeStudio && (
              <span className="absolute left-3 top-3 z-20 inline-flex items-center justify-center rounded-full border border-white/20 bg-red-500 px-2.5 py-0.5 text-[10px] font-black text-white shadow-md shadow-red-500/25">
                جديد
              </span>
            )}

            <div className="relative flex h-full flex-col justify-between gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/15 text-cyan-100 shadow-md shadow-cyan-950/15 transition duration-200 group-hover:-translate-y-0.5">
                  <Mic2 className="h-5 w-5" />
                </div>

                <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black text-cyan-100">
                  نشرة وتحليل
                </span>
              </div>

              <div>
                <h3 className="text-base font-black text-white md:text-lg">
                  استوديو التحدي
                </h3>

                <p className="mt-0.5 text-[11px] font-bold leading-5 text-cyan-50/90">
                  نشرات وأجواء حماسية بين الأعضاء.
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px] font-black text-cyan-200">
                <span>افتح الاستوديو</span>
                <ChevronLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
              </div>
            </div>
          </button>
        </div>

        <div
          className=""
        >
          <LeaderboardTable />
        </div>

        <div
          className="mt-4 flex items-center justify-center"
        >
          <OnlineMembersCounter />
        </div>
      </section>

      <footer className="relative z-10 mt-6 border-t border-white/10 px-3 py-6 text-center text-xs text-slate-400">
        <div
          className="mx-auto flex max-w-xl flex-col items-center justify-center gap-3 rounded-[1.7rem] border border-white/10 bg-white/[0.06] px-4 py-4 shadow-lg shadow-slate-950/20 backdrop-blur-sm"
        >
          <div className="flex items-center justify-center gap-2 text-slate-300">
            <Copyright className="h-3.5 w-3.5" />
            <span>جميع الحقوق محفوظة</span>
            <span className="font-black text-white">2026</span>
          </div>

          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-[11px] font-black text-emerald-100 shadow-md shadow-emerald-950/10">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            <span>برمجة وتطوير</span>
            <span className="text-white">عبدالسلام العنزي</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
