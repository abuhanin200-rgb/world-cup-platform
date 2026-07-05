"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  Flag,
  Home,
  KeyRound,
  Loader2,
  LogIn,
  ShieldCheck,
  Smartphone,
  Trophy,
  User,
  UserPlus,
} from "lucide-react";
import { getTeams, Team } from "@/lib/teams";
import { useAuth } from "@/context/AuthContext";

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

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoggedIn, loading: authLoading } = useAuth();

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [teamEmoji, setTeamEmoji] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      router.push("/");
    }
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    async function loadTeams() {
      try {
        const data = await getTeams();
        setTeams(data);
      } catch (err) {
        console.error(err);
        setError("تعذر تحميل قائمة المنتخبات");
      } finally {
        setTeamsLoading(false);
      }
    }

    loadTeams();
  }, []);

  function handleTeamChange(value: string) {
    setFavoriteTeam(value);

    const selected = teams.find((team) => team.nameAr === value);

    if (selected) {
      setTeamEmoji(selected.emoji);
    } else {
      setTeamEmoji("");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (fullName.trim().length > 20) {
      setError("الاسم يجب ألا يتجاوز 20 حرفًا");
      return;
    }

    if (!fullName.trim() || !password.trim() || !phone.trim() || !favoriteTeam) {
      setError("جميع الحقول إلزامية");
      return;
    }

    setLoading(true);

    try {
      const newUser = await register({
        fullName,
        password,
        phone,
        favoriteTeam,
        teamEmoji,
      });

      setMessage(`تم تسجيلك بنجاح، حيّاك الله يا ${newUser.fullName}`);

      setTimeout(() => {
        router.push("/");
      }, 900);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء التسجيل";
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
              <span>تسجيل عضو جديد</span>
            </div>

            <h1 className="mb-2 text-2xl font-black">تسجيل عضو جديد</h1>

            <p className="text-sm font-medium leading-6 text-slate-300">
              سجّل بياناتك وادخل تحدي توقعات كأس العالم 2026.
            </p>
          </motion.div>

          <motion.form
            variants={itemMotion}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-bold">
                <User className="h-4 w-4 text-amber-300" />
                <span>الاسم</span>
                <span className="text-slate-400">(20 حرف كحد أقصى)</span>
              </label>

              <input
                type="text"
                value={fullName}
                maxLength={20}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:bg-slate-950/80"
                placeholder="اكتب اسمك"
                required
              />

              <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                <span>{fullName.length}/20</span>
                <span>الاسم يظهر في لوحة الصدارة</span>
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-bold">
                <KeyRound className="h-4 w-4 text-amber-300" />
                <span>الرقم السري</span>
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:bg-slate-950/80"
                placeholder="اكتب الرقم السري"
                required
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-bold">
                <Smartphone className="h-4 w-4 text-amber-300" />
                <span>رقم الجوال</span>
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:bg-slate-950/80"
                placeholder="05xxxxxxxx"
                required
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-bold">
                <Flag className="h-4 w-4 text-amber-300" />
                <span>المنتخب المرشح للقب</span>
              </label>

              <select
                value={favoriteTeam}
                onChange={(event) => handleTeamChange(event.target.value)}
                disabled={teamsLoading}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-amber-400 focus:bg-slate-950/80 disabled:cursor-not-allowed disabled:opacity-60"
                required
              >
                <option value="">
                  {teamsLoading ? "جاري تحميل المنتخبات..." : "اختر المنتخب"}
                </option>

                {teams.map((team) => (
                  <option key={team.code} value={team.nameAr}>
                    {team.emoji} {team.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <AnimatePresence mode="popLayout">
              {favoriteTeam && (
                <motion.div
                  key={favoriteTeam}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                  className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm font-bold text-amber-100"
                >
                  <span className="inline-flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-300" />
                    <span>
                      منتخبك المرشح: {teamEmoji} {favoriteTeam}
                    </span>
                  </span>
                </motion.div>
              )}

              {message && (
                <motion.div
                  key={message}
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
              disabled={loading || teamsLoading || authLoading}
              whileTap={
                loading || teamsLoading || authLoading
                  ? undefined
                  : { scale: 0.96, y: 2 }
              }
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="pointer-events-none absolute inset-0 translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent transition duration-700 group-hover:translate-x-[-120%]" />

              {loading ? (
                <Loader2 className="relative h-5 w-5 animate-spin" />
              ) : (
                <UserPlus className="relative h-5 w-5" />
              )}

              <span className="relative">
                {loading ? "جاري التسجيل..." : "تسجيل"}
              </span>
            </motion.button>
          </motion.form>

          <motion.button
            type="button"
            onClick={() => router.push("/login")}
            variants={itemMotion}
            whileTap={{ scale: 0.96, y: 2 }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10"
          >
            <LogIn className="h-4 w-4" />
            <span>عندك حساب؟ تسجيل الدخول</span>
          </motion.button>

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