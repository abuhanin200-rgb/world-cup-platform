"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogIn,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const forgotPasswordMessage =
  "السلام عليكم، نسيت الرقم السري في منصة التحدي وأرغب في استعادته.";
const forgotUrl = `https://wa.me/966542180200?text=${encodeURIComponent(forgotPasswordMessage)}`;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggedIn, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && isLoggedIn) router.replace("/");
  }, [authLoading, isLoggedIn, router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ fullName, password });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="mx-auto flex min-h-[calc(100dvh-140px)] max-w-7xl items-center justify-center px-3 py-8 sm:px-4 md:px-6 md:py-12"
    >
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/25 md:grid-cols-[1fr_1.05fr] md:rounded-[36px]">
        <section className="relative hidden bg-[#071d54] p-8 md:flex md:flex-col md:justify-between lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(255,194,16,.20),transparent_28%)]" />
          <div className="relative">
            <img
              src="/brand/altahaddi-logo-white.png"
              alt="شعار منصة التحدي"
              className="h-36 w-36 object-contain"
            />
            <h1 className="mt-6 text-4xl font-black">رجعت للتحدي</h1>
            <p className="mt-3 max-w-sm text-sm font-semibold leading-7 text-white/60">
              تابع توقعاتك ومراكزك وإنجازاتك، وادخل بطولتك أو لعبتك المفضلة مباشرة.
            </p>
          </div>
          <div className="relative flex items-center gap-2 text-xs font-bold text-white/45">
            <ShieldCheck className="h-4 w-4 text-[var(--brand-yellow)]" />
            جلسة حساب آمنة ومتصلة ببياناتك
          </div>
        </section>

        <section className="p-4 sm:p-6 md:p-8 lg:p-10">
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <img
              src="/brand/altahaddi-symbol-white.png"
              alt=""
              className="h-12 w-12 object-contain"
            />
            <div>
              <div className="text-xl font-black">التحدي</div>
              <div className="text-[10px] font-bold text-white/45">تسجيل الدخول</div>
            </div>
          </div>

          <p className="text-[10px] font-black text-[var(--brand-yellow)] md:text-xs">
            حسابي
          </p>
          <h2 className="mt-1 text-2xl font-black md:text-3xl">تسجيل الدخول</h2>
          <p className="mt-2 text-xs font-semibold leading-6 text-white/50 md:text-sm">
            أدخل اسمك ورقمك السري للعودة إلى حسابك في منصة التحدي.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-xs font-black">
              الاسم
              <div className="relative mt-1.5">
                <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  autoComplete="username"
                  required
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-3 pr-10 text-sm outline-none transition focus:border-[var(--brand-yellow)]"
                  placeholder="اكتب اسمك"
                />
              </div>
            </label>

            <label className="block text-xs font-black">
              الرقم السري
              <div className="relative mt-1.5">
                <KeyRound className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-10 text-sm outline-none transition focus:border-[var(--brand-yellow)]"
                  placeholder="اكتب الرقم السري"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "إخفاء الرقم السري" : "إظهار الرقم السري"}
                  aria-pressed={showPassword}
                  className="absolute left-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-white/45 transition hover:bg-white/[0.06] hover:text-[var(--brand-yellow)]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </label>

            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-red-300/15 bg-red-400/[0.08] p-3 text-xs font-bold text-red-100"
              >
                {error}
              </div>
            ) : null}

            <button
              disabled={loading || authLoading}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[#ffc210] bg-[#ffc210] px-4 text-sm font-black text-[#04133a] shadow-lg shadow-[#ffc210]/10 transition hover:bg-[#ffd04a] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {loading ? "جاري الدخول…" : "دخول"}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
            <a
              href={forgotUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[#ffc210] transition hover:text-[#ffd65f]"
            >
              نسيت الرقم السري؟
            </a>
            <Link
              href="/register"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#ffc210]/25 bg-[#ffc210]/[0.05] px-3 text-[#ffc210] transition hover:bg-[#ffc210]/10"
            >
              <UserPlus className="h-3.5 w-3.5" />
              إنشاء حساب
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
