"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, EyeOff, KeyRound, Loader2, LogIn, ShieldCheck, User, UserPlus } from "lucide-react";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import SportsVideoBackdrop from "@/components/media/SportsVideoBackdrop";
import { useAuth } from "@/context/AuthContext";
import type { SocialProvider } from "@/lib/users";
import { playInteractionFeedback } from "@/lib/interactionFeedback";

const forgotPasswordMessage = "السلام عليكم، نسيت الرقم السري في منصة التحدي وأرغب في استعادته.";
const forgotUrl = `https://wa.me/966542180200?text=${encodeURIComponent(forgotPasswordMessage)}`;

type LoginFieldErrors = { fullName?: string; password?: string };

function getSafeReturnTo() {
  if (typeof window === "undefined") return "/";
  const value = new URLSearchParams(window.location.search).get("returnTo") || "/";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default function LoginPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { login, loginWithSocial, isLoggedIn, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [success, setSuccess] = useState(false);
  const fullNameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && isLoggedIn) router.replace(getSafeReturnTo());
  }, [authLoading, isLoggedIn, router]);

  async function complete(action: () => Promise<unknown>) {
    setError("");
    try {
      await action();
      setSuccess(true);
      playInteractionFeedback("success");
      window.setTimeout(() => router.push(getSafeReturnTo()), reduceMotion ? 80 : 360);
    } catch (err) {
      setSuccess(false);
      playInteractionFeedback("error");
      setError(err instanceof Error ? err.message : "تعذر تسجيل الدخول");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: LoginFieldErrors = {};
    if (!fullName.trim()) nextErrors.fullName = "اكتب اسم المستخدم";
    if (!password.trim()) nextErrors.password = "اكتب الرقم السري";
    setFieldErrors(nextErrors);
    if (nextErrors.fullName || nextErrors.password) {
      playInteractionFeedback("error");
      window.requestAnimationFrame(() => (nextErrors.fullName ? fullNameRef : passwordRef).current?.focus());
      return;
    }
    setLoading(true);
    await complete(() => login({ fullName, password }));
    setLoading(false);
  }

  async function socialLogin(provider: SocialProvider) {
    setSocialLoading(provider);
    await complete(() => loginWithSocial(provider));
    setSocialLoading(null);
  }

  return (
    <main dir="rtl" className="altahaddi-auth-stage relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-3 py-6 sm:px-4 md:px-6 md:py-10">
      <SportsVideoBackdrop
        fixed
        opacity={0.48}
        poster="/tournaments/gulf-cup-27/identity-cover.jpg"
        overlayClassName="bg-[linear-gradient(90deg,rgba(4,19,58,.70),rgba(4,19,58,.38)_50%,rgba(4,19,58,.66)),linear-gradient(180deg,rgba(4,19,58,.06),rgba(4,19,58,.52))]"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_15%,rgba(255,194,16,.12),transparent_25%),radial-gradient(circle_at_86%_80%,rgba(55,112,255,.18),transparent_34%)]" aria-hidden="true" />

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.38, ease: "easeOut" }}
        className="altahaddi-auth-shell relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[30px] md:grid-cols-[.92fr_1.08fr] md:rounded-[40px]"
      >
        <section className="relative hidden min-h-[590px] overflow-hidden border-l border-white/[0.08] p-8 md:grid md:place-items-center">
          <div className="altahaddi-grid absolute inset-0 opacity-18" />
          <div className="relative text-center">
            <div className="mx-auto grid h-44 w-44 place-items-center rounded-[42px] border border-white/[0.14] bg-white/[0.08] shadow-[0_30px_70px_rgba(0,0,0,.28)] backdrop-blur-2xl">
              {success ? <ShieldCheck className="h-16 w-16 text-emerald-300" /> : <img src="/brand/altahaddi-symbol-white.png" alt="" className="h-24 w-24 object-contain" />}
            </div>
            <h1 className="mt-6 text-4xl font-black">رجعت للتحدي</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-7 text-white/58">كل بطولاتك، توقعاتك وألعابك في حساب واحد.</p>
          </div>
        </section>

        <section className="p-4 sm:p-6 md:p-8 lg:p-10">
          <div className="mb-5 flex items-center gap-3 md:hidden">
            <img src="/brand/altahaddi-symbol-white.png" alt="" className="h-11 w-11 object-contain" />
            <div><div className="text-xl font-black">التحدي</div><div className="mt-1 text-[9px] font-bold text-[var(--brand-yellow)]">توقعات · بطولات · ألعاب</div></div>
          </div>

          <p className="text-[10px] font-black text-[var(--brand-yellow)] md:text-xs">تسجيل الدخول</p>
          <h2 className="mt-1 text-2xl font-black md:text-4xl">كمل منافستك</h2>
          <p className="mt-2 text-xs font-semibold leading-6 text-white/52 md:text-sm">ادخل بالطريقة المعتادة أو استخدم حسابك المفضل.</p>

          <div className="mt-6">
            <SocialAuthButtons loadingProvider={socialLoading} onSelect={socialLogin} disabled={loading || authLoading} />
          </div>

          <div className="my-5 flex items-center gap-3 text-[10px] font-black text-white/32"><span className="h-px flex-1 bg-white/[0.10]" /><span>أو بالاسم والرقم السري</span><span className="h-px flex-1 bg-white/[0.10]" /></div>

          <form onSubmit={submit} noValidate className="space-y-4">
            <label htmlFor="login-full-name" className="block text-xs font-black">اسم المستخدم
              <div className="relative mt-1.5"><User className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" aria-hidden="true" /><input ref={fullNameRef} id="login-full-name" value={fullName} onChange={(event) => { setFullName(event.target.value); if (fieldErrors.fullName) setFieldErrors((current) => ({ ...current, fullName: undefined })); }} onBlur={() => { if (!fullName.trim()) setFieldErrors((current) => ({ ...current, fullName: "اكتب اسم المستخدم" })); }} autoComplete="username" aria-invalid={Boolean(fieldErrors.fullName)} aria-describedby={fieldErrors.fullName ? "login-full-name-error" : undefined} className={`altahaddi-input pr-10 ${fieldErrors.fullName ? "border-red-300/70 focus:border-red-300 focus:ring-red-300/20" : ""}`} placeholder="اكتب اسم المستخدم" /></div>
              {fieldErrors.fullName ? <span id="login-full-name-error" role="alert" className="mt-1.5 block text-[11px] font-bold text-red-200">{fieldErrors.fullName}</span> : null}
            </label>
            <label htmlFor="login-password" className="block text-xs font-black">الرقم السري
              <div className="relative mt-1.5"><KeyRound className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" aria-hidden="true" /><input ref={passwordRef} id="login-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => { setPassword(event.target.value); if (fieldErrors.password) setFieldErrors((current) => ({ ...current, password: undefined })); }} onBlur={() => { if (!password.trim()) setFieldErrors((current) => ({ ...current, password: "اكتب الرقم السري" })); }} autoComplete="current-password" aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? "login-password-error" : undefined} className={`altahaddi-input pl-12 pr-10 ${fieldErrors.password ? "border-red-300/70 focus:border-red-300 focus:ring-red-300/20" : ""}`} placeholder="اكتب الرقم السري" /><button type="button" onClick={() => { setShowPassword((value) => !value); playInteractionFeedback("selection", { vibrate: false }); }} aria-label={showPassword ? "إخفاء الرقم السري" : "إظهار الرقم السري"} className="absolute left-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-white/60 transition hover:bg-white/[0.08] hover:text-[var(--brand-yellow)]">{showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}</button></div>
              {fieldErrors.password ? <span id="login-password-error" role="alert" className="mt-1.5 block text-[11px] font-bold text-red-200">{fieldErrors.password}</span> : null}
            </label>

            {error ? <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} role="alert" className="altahaddi-glass-soft rounded-2xl border-red-300/18 bg-red-400/[0.08] p-3 text-xs font-bold text-red-100">{error}</motion.div> : null}
            {success ? <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} role="status" className="altahaddi-glass-soft rounded-2xl border-emerald-300/18 bg-emerald-300/[0.08] p-3 text-xs font-black text-emerald-100">تم التحقق. جاري فتح حسابك…</motion.div> : null}

            <button disabled={loading || Boolean(socialLoading) || authLoading} className="altahaddi-primary-button w-full justify-center">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}{loading ? "جاري الدخول…" : "دخول"}</button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold"><a href={forgotUrl} target="_blank" rel="noreferrer" className="text-[var(--brand-yellow)] transition hover:text-[#ffd65f]">التواصل مع الدعم لاستعادة الحساب</a><Link href="/register" onClick={(event) => { event.preventDefault(); router.push(`/register?returnTo=${encodeURIComponent(getSafeReturnTo())}`); }} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[var(--brand-yellow)]/20 bg-[var(--brand-yellow)]/[0.07] px-3 text-[var(--brand-yellow)] backdrop-blur-xl transition hover:bg-[var(--brand-yellow)]/12"><UserPlus className="h-3.5 w-3.5" /> إنشاء حساب</Link></div>
          <p className="mt-5 text-[9px] font-semibold leading-5 text-white/32">الدخول الاجتماعي يربطك بنفس حساب «التحدي» عند تطابق البريد الإلكتروني.</p>
        </section>
      </motion.div>
    </main>
  );
}
