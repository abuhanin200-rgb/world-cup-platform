"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import {
  Gamepad2,
  Home,
  LogIn,
  LogOut,
  Sparkles,
  UserCircle,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import WordGame from "@/components/word-game/WordGame";

const pageMotion: Variants = {
  hidden: {
    opacity: 0,
  },
  show: {
    opacity: 1,
    transition: {
      duration: 0.24,
      ease: "easeOut",
    },
  },
};

const scrollOnceViewport = {
  once: true,
  amount: 0.18,
} as const;

const revealMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
    scale: 0.99,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.32,
      ease: "easeOut",
    },
  },
};

const headerMotion: Variants = {
  hidden: {
    opacity: 0,
    y: -10,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.26,
      ease: "easeOut",
    },
  },
};

function HeaderButton({
  children,
  onClick,
  variant = "ghost",
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "ghost" | "gold" | "danger";
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={`inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition md:px-3 md:text-sm ${
        variant === "gold"
          ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-500/15 hover:bg-amber-300"
          : variant === "danger"
            ? "bg-red-500 text-white shadow-md shadow-red-950/15 hover:bg-red-400"
            : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
      }`}
    >
      {children}
    </motion.button>
  );
}

export default function WordGamePage() {
  const router = useRouter();
  const { user, loading, isLoggedIn, logout } = useAuth();

  return (
    <motion.main
      dir="rtl"
      variants={pageMotion}
      initial="hidden"
      animate="show"
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-[15px] text-white antialiased [text-size-adjust:100%]"
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.12),transparent_34%),radial-gradient(circle_at_10%_30%,rgba(56,189,248,0.10),transparent_32%),radial-gradient(circle_at_90%_70%,rgba(52,211,153,0.08),transparent_30%)]" />

      <motion.header
        variants={headerMotion}
        className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 shadow-md shadow-slate-950/20 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 md:px-4 md:py-4">
          <motion.div
            whileTap={{ scale: 0.98 }}
            className="flex min-w-0 items-center gap-2 md:gap-3"
          >
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-md shadow-slate-950/20 md:h-12 md:w-12">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 to-transparent" />

              <img
                src="/wc2026-logo.png"
                alt="شعار منصة توقعات كأس العالم 2026"
                className="relative h-full w-full object-contain p-1"
              />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-xs font-black md:text-xl">
                منصة توقعات كأس العالم 2026
              </h1>

              <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-slate-300 md:text-sm">
                <Gamepad2 className="h-3 w-3 text-amber-300 md:h-4 md:w-4" />
                <span>خمن كلمة اليوم</span>
              </p>
            </div>
          </motion.div>

          <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
            {loading ? (
              <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-[10px] text-slate-300 md:px-3 md:text-xs">
                جاري التحقق...
              </div>
            ) : isLoggedIn && user ? (
              <>
                <HeaderButton onClick={() => router.push("/")}>
                  <Home className="h-3.5 w-3.5" />
                  <span>الرئيسية</span>
                </HeaderButton>

                <HeaderButton onClick={() => router.push("/account")}>
                  <UserCircle className="h-3.5 w-3.5" />
                  <span>حسابي</span>
                </HeaderButton>

                <HeaderButton
                  variant="danger"
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>خروج</span>
                </HeaderButton>
              </>
            ) : (
              <>
                <HeaderButton onClick={() => router.push("/")}>
                  <Home className="h-3.5 w-3.5" />
                  <span>الرئيسية</span>
                </HeaderButton>

                <HeaderButton onClick={() => router.push("/login")}>
                  <LogIn className="h-3.5 w-3.5" />
                  <span>دخول</span>
                </HeaderButton>

                <HeaderButton
                  variant="gold"
                  onClick={() => router.push("/register")}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>تسجيل</span>
                </HeaderButton>
              </>
            )}
          </div>
        </div>
      </motion.header>

      <section className="relative mx-auto max-w-4xl px-3 py-4 md:px-4 md:py-6">
        <motion.div
          variants={revealMotion}
          initial="hidden"
          whileInView="show"
          viewport={scrollOnceViewport}
          whileTap={{ scale: 0.99 }}
          className="relative mb-4 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.09] p-4 text-center shadow-lg shadow-slate-950/25 backdrop-blur-sm md:p-5"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-amber-300/10" />
          <div className="pointer-events-none absolute -right-20 top-0 h-40 w-40 rounded-full bg-amber-300/10 blur-2xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-cyan-300/10 blur-2xl" />
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

          <div className="relative">
            <motion.div
              animate={{
                y: [0, -5, 0],
                rotate: [0, -2, 2, 0],
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl border border-amber-300/25 bg-amber-300/10 text-amber-200 shadow-md shadow-amber-950/20"
            >
              <Gamepad2 className="h-7 w-7" />
            </motion.div>

            <h2 className="mb-2 inline-flex items-center justify-center gap-2 text-[24px] font-black leading-snug md:text-4xl">
              <span>خمن كلمة اليوم</span>
              <Sparkles className="h-5 w-5 text-amber-300 md:h-7 md:w-7" />
            </h2>

            <p className="mx-auto max-w-2xl text-[14px] font-medium leading-7 text-slate-200 md:text-base">
              اكتب كلمة عربية من 5 حروف خلال 6 محاولات. إذا كان الحرف في مكانه
              الصحيح يظهر أخضر، وإذا كان موجودًا بمكان مختلف يظهر أصفر، وإذا لم
              يكن موجودًا يظهر رمادي.
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={revealMotion}
          initial="hidden"
          whileInView="show"
          viewport={scrollOnceViewport}
        >
          <WordGame />
        </motion.div>
      </section>

      <motion.footer
        variants={revealMotion}
        initial="hidden"
        whileInView="show"
        viewport={scrollOnceViewport}
        className="relative z-10 mt-6 border-t border-white/10 px-3 py-6 text-center text-xs text-slate-400"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />

        <motion.div
          whileTap={{ scale: 0.99 }}
          className="relative mx-auto flex max-w-xl flex-col items-center justify-center gap-3 overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/[0.06] px-4 py-4 shadow-lg shadow-slate-950/20 backdrop-blur-sm"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-amber-300/5" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-amber-300/10 blur-2xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />

          <div className="relative flex items-center justify-center gap-2 text-slate-300">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[13px]">
              ©
            </span>
            <span>جميع الحقوق محفوظة</span>
            <span className="font-black text-white">2026</span>
          </div>

          <div className="relative inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-[11px] font-black text-emerald-100 shadow-md shadow-emerald-950/10">
            <span className="text-emerald-300">✓</span>
            <span>برمجة وتطوير</span>
            <span className="text-white">عبدالسلام العنزي</span>
          </div>

          <div className="relative text-[10px] font-bold text-slate-500">
            World Cup 2026 Predictions Platform
          </div>
        </motion.div>
      </motion.footer>
    </motion.main>
  );
}