"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  Home,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogIn,
  MessageCircle,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const forgotPasswordMessage = `السلام عليكم، نسيت الرقم السري في منصة توقعات كأس العالم 2026.

*بيانات التحقق*

الاسم المسجل:
رقم الجوال المسجل:
المنتخب المرشح:

أرجو إعادة تعيين كلمة المرور.`;

const forgotPasswordWhatsappUrl = `https://wa.me/966542180200?text=${encodeURIComponent(
  forgotPasswordMessage
)}`;

const pageMotion: Variants = {
  hidden: {
    opacity: 0,
  },
  show: {
    opacity: 1,
    transition: {
      duration: 0.35,
      ease: "easeOut",
      staggerChildren: 0.08,
    },
  },
};

const cardMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 34,
    scale: 0.94,
    filter: "blur(10px)",
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.07,
    },
  },
};

const itemMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
    scale: 0.98,
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

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggedIn, loading: authLoading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      router.push("/");
    }
  }, [authLoading, isLoggedIn, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const user = await login({
        fullName,
        password,
      });

      setMessage(`أهلًا بعودتك يا بطل ${user.fullName}`);

      setTimeout(() => {
        router.push("/");
      }, 900);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء تسجيل الدخول";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.main
      dir="rtl"
      variants={pageMotion}
      initial="hidden"
      animate="show"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 text-white"
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.14),transparent_34%),radial-gradient(circle_at_12%_35%,rgba(56,189,248,0.10),transparent_32%),radial-gradient(circle_at_90%_70%,rgba(52,211,153,0.08),transparent_30%)]" />
      <div className="pointer-events-none absolute -right-24 top-20 h-60 w-60 rounded-full bg-amber-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-20 h-60 w-60 rounded-full bg-cyan-300/10 blur-3xl" />

      <motion.div
        variants={cardMotion}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-slate-950/35 backdrop-blur-xl"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-amber-300/10" />
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="relative">
          <motion.div variants={itemMotion} className="mb-8 text-center">
            <motion.div
              animate={{
                y: [0, -5, 0],
                scale: [1, 1.03, 1],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-lg shadow-slate-950/25"
            >
              <img
                src="/wc2026-logo.png"
                alt="شعار المنصة"
                className="h-full w-full object-contain p-2"
              />
            </motion.div>

            <div className="mx-auto mb-3 inline-flex items-center justify-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-200">
              <ShieldCheck className="h-4 w-4" />
              <span>دخول آمن للمنصة</span>
            </div>

            <h1 className="mb-2 text-2xl font-black">تسجيل الدخول</h1>

            <p className="text-sm font-medium leading-6 text-slate-300">
              أدخل بياناتك للعودة إلى منصة توقعات كأس العالم 2026.
            </p>
          </motion.div>

          <motion.form
            variants={itemMotion}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="login-full-name"
                className="mb-2 flex items-center gap-2 text-sm font-bold"
              >
                <User className="h-4 w-4 text-amber-300" />
                <span>الاسم</span>
              </label>

              <input
                id="login-full-name"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:bg-slate-950/80"
                placeholder="اكتب اسمك"
                required
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-2 flex items-center gap-2 text-sm font-bold"
              >
                <KeyRound className="h-4 w-4 text-amber-300" />
                <span>الرقم السري</span>
              </label>

              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:bg-slate-950/80"
                placeholder="اكتب الرقم السري"
                required
              />
            </div>

            <AnimatePresence mode="popLayout">
              {message && (
                <motion.div
                  key={message}
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                  className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3 text-sm font-bold text-emerald-200"
                >
                  {message}
                </motion.div>
              )}

              {error && (
                <motion.div
                  key={error}
                  role="alert"
                  aria-live="assertive"
                  aria-atomic="true"
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                  className="rounded-xl border border-red-500/40 bg-red-500/15 p-3 text-sm font-bold text-red-200"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading || authLoading}
              whileTap={loading || authLoading ? undefined : { scale: 0.96, y: 2 }}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="pointer-events-none absolute inset-0 translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent transition duration-700 group-hover:translate-x-[-120%]" />

              {loading ? (
                <Loader2 className="relative h-5 w-5 animate-spin" />
              ) : (
                <LogIn className="relative h-5 w-5" />
              )}

              <span className="relative">
                {loading ? "جاري الدخول..." : "دخول"}
              </span>
            </motion.button>
          </motion.form>

          <motion.button
            type="button"
            onClick={() => router.push("/register")}
            variants={itemMotion}
            whileTap={{ scale: 0.96, y: 2 }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10"
          >
            <UserPlus className="h-4 w-4" />
            <span>ما عندك حساب؟ تسجيل جديد</span>
          </motion.button>

          <motion.a
            href={forgotPasswordWhatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            variants={itemMotion}
            whileTap={{ scale: 0.96, y: 2 }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-300/40 bg-red-600 px-4 py-3 text-center text-sm font-black text-white shadow-lg shadow-red-950/30 transition hover:bg-red-500"
          >
            <LockKeyhole className="h-4 w-4" />
            <span>نسيت الرقم السري؟ تواصل معنا واتساب</span>
            <MessageCircle className="h-4 w-4" />
          </motion.a>

          <motion.button
            type="button"
            onClick={() => router.push("/")}
            variants={itemMotion}
            whileTap={{ scale: 0.96, y: 2 }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/10"
          >
            <Home className="h-4 w-4" />
            <span>العودة للرئيسية</span>
          </motion.button>
        </div>
      </motion.div>
    </motion.main>
  );
}
