"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Clock3, Sparkles, Trophy, X, Zap } from "lucide-react";

const STORAGE_KEY = "tenSecondsChallengeNoticeSeen_v1";

export default function TenSecondsChallengeNotice({
  isLoggedIn,
}: {
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;

    const seen = window.localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      const timer = window.setTimeout(() => setShow(true), 900);
      return () => window.clearTimeout(timer);
    }
  }, [isLoggedIn]);

  function closeNotice() {
    window.localStorage.setItem(STORAGE_KEY, "true");
    setShow(false);
  }

  function startChallenge() {
    window.localStorage.setItem(STORAGE_KEY, "true");
    setShow(false);
    router.push("/ten-seconds-challenge");
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          dir="rtl"
          className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeNotice}
        >
          <motion.div
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9, y: 22 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 18 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl shadow-amber-950/30"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-300/20 via-white/5 to-cyan-300/10" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-cyan-300/15 blur-3xl" />

            <button
              type="button"
              onClick={closeNotice}
              className="absolute left-4 top-4 z-10 rounded-full border border-white/10 bg-white/10 p-2 text-white transition hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative text-center">
              <motion.div
                animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-amber-300/30 bg-amber-300/15 text-amber-100 shadow-lg shadow-amber-950/20"
              >
                <Clock3 className="h-8 w-8" />
              </motion.div>

              <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-[11px] font-black text-amber-100">
                <Sparkles className="h-3.5 w-3.5" />
                تحدي يومي جديد
              </div>

              <h2 className="text-2xl font-black leading-snug">
                ⏱️ تحدي جديد ينتظرك!
              </h2>

              <p className="mt-3 text-sm font-bold leading-7 text-slate-200">
                هل تستطيع إيقاف المؤقت عند{" "}
                <span className="font-black text-amber-200" dir="ltr">
                  00:10.000
                </span>
                ؟ لديك <strong>3 محاولات يوميًا</strong> فقط، وإذا أصبت الهدف
                تحصل على <strong className="text-emerald-200">+5 نقاط رسمية</strong>{" "}
                تضاف مباشرة إلى رصيدك في لوحة الصدارة.
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-lg">🎯</div>
                  <div className="mt-1 text-[10px] font-bold text-slate-400">
                    الهدف
                  </div>
                  <div className="text-xs font-black text-white" dir="ltr">
                    00:10.000
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3">
                  <Trophy className="mx-auto h-5 w-5 text-emerald-200" />
                  <div className="mt-1 text-[10px] font-bold text-emerald-100/70">
                    الجائزة
                  </div>
                  <div className="text-xs font-black text-emerald-100">
                    +5 نقاط
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3">
                  <Zap className="mx-auto h-5 w-5 text-amber-200" />
                  <div className="mt-1 text-[10px] font-bold text-amber-100/70">
                    المحاولات
                  </div>
                  <div className="text-xs font-black text-amber-100">
                    3 يوميًا
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs font-bold leading-6 text-slate-300">
                يتم احتساب المحاولة عند الخطأ فقط، وإذا فزت تتوقف محاولاتك حتى
                تحدي الغد.
              </div>

              <div className="mt-5 grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={startChallenge}
                  className="min-h-[48px] rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-950/20 transition hover:bg-amber-300 active:scale-95"
                >
                  ابدأ التحدي الآن
                </button>

                <button
                  type="button"
                  onClick={closeNotice}
                  className="min-h-[44px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10 active:scale-95"
                >
                  لاحقًا
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}