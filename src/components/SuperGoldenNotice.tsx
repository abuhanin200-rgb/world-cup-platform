"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  CheckCircle2,
  Crown,
  Rocket,
  Sparkles,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const STORAGE_KEY_PREFIX = "worldcup_2026_super_golden_notice_seen_";

const overlayMotion: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.22, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.18, ease: "easeIn" },
  },
};

const cardMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
    scale: 0.94,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.34,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    y: 18,
    scale: 0.96,
    transition: { duration: 0.18, ease: "easeIn" },
  },
};

const itemMotion: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: "easeOut" },
  },
};

function getStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function hasSeenNotice(userId: string) {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(getStorageKey(userId)) === "true";
}

function markNoticeAsSeen(userId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getStorageKey(userId), "true");
}

export default function SuperGoldenNotice() {
  const { user, isLoggedIn, loading } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading || !isLoggedIn || !user?.id) return;

    if (hasSeenNotice(user.id)) return;

    const timer = window.setTimeout(() => {
      setVisible(true);
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loading, isLoggedIn, user?.id]);

  function closeNotice() {
    if (user?.id) {
      markNoticeAsSeen(user.id);
    }

    setVisible(false);
  }

  if (!user?.id) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          dir="rtl"
          variants={overlayMotion}
          initial="hidden"
          animate="show"
          exit="exit"
          className="fixed inset-0 z-[9998] flex items-center justify-center overflow-hidden bg-slate-950/85 p-4 backdrop-blur-md"
        >
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            animate={{
              background: [
                "radial-gradient(circle at 50% 18%, rgba(217,70,239,0.22), transparent 32%), radial-gradient(circle at 15% 85%, rgba(251,191,36,0.16), transparent 30%)",
                "radial-gradient(circle at 55% 20%, rgba(251,191,36,0.22), transparent 34%), radial-gradient(circle at 85% 80%, rgba(168,85,247,0.17), transparent 28%)",
                "radial-gradient(circle at 50% 18%, rgba(217,70,239,0.22), transparent 32%), radial-gradient(circle at 15% 85%, rgba(251,191,36,0.16), transparent 30%)",
              ],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.div
            variants={cardMotion}
            initial="hidden"
            animate="show"
            exit="exit"
            className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-fuchsia-300/40 bg-gradient-to-br from-fuchsia-500/20 via-slate-950 to-amber-500/20 p-5 text-white shadow-2xl shadow-fuchsia-500/20"
          >
            <div className="pointer-events-none absolute -top-16 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-fuchsia-300/25 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-fuchsia-400 via-amber-300 to-yellow-400" />

            <button
              type="button"
              onClick={closeNotice}
              className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-slate-200 transition hover:bg-white/15 active:scale-95"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative text-center">
              <motion.div
                variants={itemMotion}
                className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border border-fuchsia-200/60 bg-fuchsia-400/20 text-amber-100 shadow-xl shadow-fuchsia-400/25"
                animate={{
                  scale: [1, 1.08, 1],
                  rotate: [0, -4, 4, 0],
                }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Rocket className="h-10 w-10" />
              </motion.div>

              <motion.div
                variants={itemMotion}
                className="mx-auto mb-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-fuchsia-200/50 bg-gradient-to-l from-fuchsia-400 via-amber-300 to-yellow-400 px-4 py-1 text-xs font-black text-slate-950 shadow-lg shadow-fuchsia-500/20"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>تحديث جديد</span>
              </motion.div>

              <motion.h2
                variants={itemMotion}
                className="text-2xl font-black text-fuchsia-100 md:text-3xl"
              >
                🚀 السوبر ذهبي وصل!
              </motion.h2>

              <motion.p
                variants={itemMotion}
                className="mx-auto mt-3 max-w-sm text-sm font-bold leading-7 text-slate-200"
              >
                فرصة الريمونتادا الكبرى بدأت. توقع واحد صح ممكن يقلب ترتيبك
                ويرجعك للمنافسة بقوة.
              </motion.p>

              <motion.div
                variants={itemMotion}
                className="mt-5 grid grid-cols-2 gap-3 text-right"
              >
                <div className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-black text-amber-100">
                    <Target className="h-4 w-4" />
                    <span>النتيجة بالملي</span>
                  </div>
                  <div className="text-2xl font-black text-white">+10</div>
                  <div className="mt-1 text-[11px] font-bold text-slate-300">
                    بدل النظام القديم
                  </div>
                </div>

                <div className="rounded-2xl border border-fuchsia-300/25 bg-fuchsia-400/10 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-black text-fuchsia-100">
                    <Trophy className="h-4 w-4" />
                    <span>الفائز صحيح</span>
                  </div>
                  <div className="text-2xl font-black text-white">+4</div>
                  <div className="mt-1 text-[11px] font-bold text-slate-300">
                    دفعة قوية للترتيب
                  </div>
                </div>

                <div className="rounded-2xl border border-sky-300/20 bg-sky-400/10 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-black text-sky-100">
                    <Crown className="h-4 w-4" />
                    <span>المتأهل صحيح</span>
                  </div>
                  <div className="text-2xl font-black text-white">+6</div>
                  <div className="mt-1 text-[11px] font-bold text-slate-300">
                    لخروج المغلوب
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-black text-emerald-100">
                    <Zap className="h-4 w-4" />
                    <span>طريقة التأهل</span>
                  </div>
                  <div className="text-2xl font-black text-white">+4</div>
                  <div className="mt-1 text-[11px] font-bold text-slate-300">
                    ركلات أو أشواط
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={itemMotion}
                className="mt-4 rounded-2xl border border-white/10 bg-white/10 p-3 text-sm font-black leading-7 text-slate-100"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <span>
                    في المراحل الحاسمة، الضربة الكاملة قد تصل إلى{" "}
                    <span className="text-amber-300">20 نقطة</span>.
                  </span>
                </span>
              </motion.div>

              <motion.button
                variants={itemMotion}
                type="button"
                onClick={closeNotice}
                whileTap={{ scale: 0.96 }}
                className="group relative mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-l from-fuchsia-400 via-amber-300 to-yellow-400 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-fuchsia-500/20 transition hover:brightness-110"
              >
                <span className="pointer-events-none absolute inset-0 translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition duration-700 group-hover:translate-x-[-120%]" />
                <Rocket className="relative h-4 w-4" />
                <span className="relative">فهمت.. خلنا نبدأ الريمونتادا</span>
              </motion.button>

              <motion.div
                variants={itemMotion}
                className="mt-3 text-[11px] font-bold text-slate-400"
              >
                يظهر هذا التنبيه مرة واحدة فقط.
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}