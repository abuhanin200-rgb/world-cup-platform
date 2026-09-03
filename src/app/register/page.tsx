"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, LogIn, Mail, Smartphone, User, UserPlus } from "lucide-react";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import NationalTeamSelect from "@/components/NationalTeamSelect";
import SportsVideoBackdrop from "@/components/media/SportsVideoBackdrop";
import { useAuth } from "@/context/AuthContext";
import { beginSocialRegistration, type SocialProvider, type SocialRegistrationIdentity } from "@/lib/users";
import { playInteractionFeedback } from "@/lib/interactionFeedback";

type RegisterFieldErrors = {
  fullName?: string;
  phone?: string;
  password?: string;
  email?: string;
  favoriteTeam?: string;
};

function getSafeReturnTo() {
  if (typeof window === "undefined") return "/";
  const value = new URLSearchParams(window.location.search).get("returnTo") || "/";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default function RegisterPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { register, isLoggedIn, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [teamEmoji, setTeamEmoji] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const [socialIdentity, setSocialIdentity] = useState<SocialRegistrationIdentity | null>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && isLoggedIn) router.replace(getSafeReturnTo());
  }, [authLoading, isLoggedIn, router]);


  function teamChange(value: string) {
    setFavoriteTeam(value);
    setTeamEmoji("");
    setFieldErrors((current) => ({ ...current, favoriteTeam: undefined }));
    playInteractionFeedback("selection", { vibrate: false });
  }

  async function socialRegister(provider: SocialProvider) {
    setError("");
    setSocialLoading(provider);
    try {
      const identity = await beginSocialRegistration(provider);
      setSocialIdentity(identity);
      setEmail(identity.email);
      setFieldErrors((current) => ({ ...current, email: undefined }));
      if (!fullName.trim() && identity.displayName) setFullName(identity.displayName.slice(0, 20));
      playInteractionFeedback("success");
    } catch (err) {
      playInteractionFeedback("error");
      setError(err instanceof Error ? err.message : "تعذر التحقق من الحساب الاجتماعي");
    } finally {
      setSocialLoading(null);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const nextErrors: RegisterFieldErrors = {};
    const phoneDigits = phone.replace(/\D/g, "");
    if (!fullName.trim()) nextErrors.fullName = "اكتب اسم المستخدم";
    else if (fullName.trim().length > 20) nextErrors.fullName = "اسم المستخدم يجب ألا يتجاوز 20 حرفًا";
    if (!phone.trim()) nextErrors.phone = "اكتب رقم الجوال";
    else if (phoneDigits.length < 9 || phoneDigits.length > 15) nextErrors.phone = "رقم الجوال غير صحيح";
    if (!password.trim()) nextErrors.password = "اكتب الرقم السري";
    else if (password.trim().length < 4) nextErrors.password = "الرقم السري يجب ألا يقل عن 4 أرقام أو أحرف";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = "اكتب بريدًا إلكترونيًا صحيحًا";
    if (!favoriteTeam) nextErrors.favoriteTeam = "اختر المنتخب المفضل";
    setFieldErrors(nextErrors);

    const firstInvalid = nextErrors.fullName ? fullNameRef.current
      : nextErrors.phone ? phoneRef.current
        : nextErrors.password ? passwordRef.current
          : nextErrors.email ? emailRef.current
            : nextErrors.favoriteTeam ? teamRef.current?.querySelector<HTMLButtonElement>("button")
              : null;
    if (firstInvalid) {
      playInteractionFeedback("error");
      window.requestAnimationFrame(() => firstInvalid.focus());
      return;
    }

    setLoading(true);
    try {
      await register({
        fullName,
        password,
        phone,
        email,
        favoriteTeam,
        teamEmoji,
        socialProvider: socialIdentity?.provider,
        socialIdToken: socialIdentity?.idToken,
      });
      playInteractionFeedback("success");
      router.push(getSafeReturnTo());
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إنشاء الحساب");
      playInteractionFeedback("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="altahaddi-auth-stage relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-3 py-6 sm:px-4 md:px-6 md:py-10">
      <SportsVideoBackdrop
        fixed
        opacity={0.44}
        poster="/tournaments/gulf-cup-27/identity-cover.jpg"
        overlayClassName="bg-[linear-gradient(90deg,rgba(4,19,58,.72),rgba(4,19,58,.40)_50%,rgba(4,19,58,.68)),linear-gradient(180deg,rgba(4,19,58,.08),rgba(4,19,58,.54))]"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(255,194,16,.11),transparent_25%),radial-gradient(circle_at_84%_76%,rgba(55,112,255,.18),transparent_34%)]" aria-hidden="true" />

      <motion.div initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36 }} className="altahaddi-auth-shell relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[30px] md:grid-cols-[.84fr_1.16fr] md:rounded-[40px]">
        <section className="relative hidden min-h-[650px] overflow-hidden border-l border-white/[0.08] p-8 md:grid md:place-items-center">
          <div className="altahaddi-grid absolute inset-0 opacity-18" />
          <div className="relative text-center">
            <div className="mx-auto grid h-44 w-44 place-items-center rounded-[42px] border border-white/[0.14] bg-white/[0.08] shadow-[0_30px_70px_rgba(0,0,0,.28)] backdrop-blur-2xl"><UserPlus className="h-16 w-16 text-[var(--brand-yellow)]" /></div>
            <h1 className="altahaddi-page-title mt-6 font-black">ابدأ تحديك</h1>
            <p className="altahaddi-body-copy mx-auto mt-3 max-w-sm font-semibold text-white/58">حساب واحد للبطولات، الألعاب، النقاط والإنجازات.</p>
          </div>
        </section>

        <section className="p-4 sm:p-6 md:p-8 lg:p-10">
          <div className="mb-5 flex items-center gap-3 md:hidden"><img src="/brand/altahaddi-symbol-white.png" alt="" className="h-11 w-11 object-contain" /><div><div className="text-xl font-black">التحدي</div><div className="mt-1 text-[9px] font-bold text-[var(--brand-yellow)]">توقعات · بطولات · ألعاب</div></div></div>
          <p className="altahaddi-eyebrow font-black text-[var(--brand-yellow)]">عضوية جديدة</p>
          <h2 className="altahaddi-page-title mt-1 font-black">أنشئ حسابك</h2>
          <p className="altahaddi-body-copy mt-2 font-semibold text-white/52">سجّل مباشرة أو ابدأ بحساب Google أو Apple أو Facebook.</p>

          <div className="mt-5">
            <SocialAuthButtons loadingProvider={socialLoading} onSelect={socialRegister} disabled={loading || authLoading} />
            {socialIdentity ? (
              <div className="altahaddi-glass-soft mt-3 flex items-center gap-2 rounded-2xl border-emerald-300/16 bg-emerald-300/[0.07] px-3 py-2.5 text-[11px] font-bold text-emerald-100">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> تم التحقق من {socialIdentity.provider === "google" ? "Google" : socialIdentity.provider === "apple" ? "Apple" : "Facebook"} — أكمل بيانات العضوية فقط.
              </div>
            ) : null}
          </div>

          <div className="my-5 flex items-center gap-3 text-[10px] font-black text-white/32"><span className="h-px flex-1 bg-white/[0.10]" /><span>بيانات العضوية</span><span className="h-px flex-1 bg-white/[0.10]" /></div>

          <form onSubmit={submit} noValidate className="grid gap-3 md:grid-cols-2">
            <label htmlFor="register-full-name" className="text-xs font-black md:col-span-2">اسم المستخدم
              <div className="relative mt-1.5"><User className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" aria-hidden="true" /><input ref={fullNameRef} id="register-full-name" value={fullName} maxLength={20} autoComplete="username" onChange={(event) => { setFullName(event.target.value); if (fieldErrors.fullName) setFieldErrors((current) => ({ ...current, fullName: undefined })); }} aria-invalid={Boolean(fieldErrors.fullName)} aria-describedby={fieldErrors.fullName ? "register-full-name-error" : undefined} className={`altahaddi-input pr-10 ${fieldErrors.fullName ? "border-red-300/70" : ""}`} placeholder="الاسم الذي سيظهر في الترتيب" /></div>
              {fieldErrors.fullName ? <span id="register-full-name-error" role="alert" className="mt-1.5 block text-[11px] font-bold text-red-200">{fieldErrors.fullName}</span> : null}
            </label>

            <label htmlFor="register-phone" className="text-xs font-black">رقم الجوال
              <div className="relative mt-1.5"><Smartphone className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" aria-hidden="true" /><input ref={phoneRef} id="register-phone" value={phone} onChange={(event) => { setPhone(event.target.value); if (fieldErrors.phone) setFieldErrors((current) => ({ ...current, phone: undefined })); }} inputMode="tel" autoComplete="tel" aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? "register-phone-error" : undefined} className={`altahaddi-input pr-10 ${fieldErrors.phone ? "border-red-300/70" : ""}`} placeholder="05xxxxxxxx" /></div>
              {fieldErrors.phone ? <span id="register-phone-error" role="alert" className="mt-1.5 block text-[11px] font-bold text-red-200">{fieldErrors.phone}</span> : null}
            </label>

            <label htmlFor="register-password" className="text-xs font-black">الرقم السري
              <div className="relative mt-1.5"><KeyRound className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" aria-hidden="true" /><input ref={passwordRef} id="register-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => { setPassword(event.target.value); if (fieldErrors.password) setFieldErrors((current) => ({ ...current, password: undefined })); }} autoComplete="new-password" aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? "register-password-error" : undefined} className={`altahaddi-input pl-12 pr-10 ${fieldErrors.password ? "border-red-300/70" : ""}`} placeholder="4 أرقام أو أحرف على الأقل" /><button type="button" onClick={() => { setShowPassword((value) => !value); playInteractionFeedback("selection", { vibrate: false }); }} aria-label={showPassword ? "إخفاء الرقم السري" : "إظهار الرقم السري"} className="absolute left-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-white/60 transition hover:bg-white/[0.08] hover:text-[var(--brand-yellow)]">{showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}</button></div>
              {fieldErrors.password ? <span id="register-password-error" role="alert" className="mt-1.5 block text-[11px] font-bold text-red-200">{fieldErrors.password}</span> : null}
            </label>

            <label htmlFor="register-email" className="text-xs font-black md:col-span-2">البريد الإلكتروني <span className="font-bold text-white/55">(اختياري)</span>
              <div className="relative mt-1.5"><Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" aria-hidden="true" /><input ref={emailRef} id="register-email" type="email" inputMode="email" autoComplete="email" value={email} readOnly={Boolean(socialIdentity)} onChange={(event) => { setEmail(event.target.value); if (fieldErrors.email) setFieldErrors((current) => ({ ...current, email: undefined })); }} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "register-email-error" : undefined} className={`altahaddi-input pr-10 read-only:opacity-80 ${fieldErrors.email ? "border-red-300/70" : ""}`} placeholder="name@example.com" /></div>
              {fieldErrors.email ? <span id="register-email-error" role="alert" className="mt-1.5 block text-[11px] font-bold text-red-200">{fieldErrors.email}</span> : null}
            </label>

            <div className="text-xs font-black md:col-span-2"><span id="favorite-team-label">المنتخب المفضل</span>
              <div ref={teamRef} className={`mt-1.5 rounded-2xl ${fieldErrors.favoriteTeam ? "ring-1 ring-red-300/70" : ""}`} aria-labelledby="favorite-team-label" aria-describedby={fieldErrors.favoriteTeam ? "favorite-team-error" : undefined}><NationalTeamSelect value={favoriteTeam} onChange={(value) => teamChange(value)} /></div>
              {fieldErrors.favoriteTeam ? <span id="favorite-team-error" role="alert" className="mt-1.5 block text-[11px] font-bold text-red-200">{fieldErrors.favoriteTeam}</span> : null}
            </div>

            {error ? <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="altahaddi-glass-soft md:col-span-2 rounded-2xl border-red-300/18 bg-red-400/[0.08] p-3 text-xs font-bold text-red-100">{error}</motion.div> : null}

            <button disabled={loading || Boolean(socialLoading) || authLoading} className="md:col-span-2 altahaddi-primary-button w-full justify-center">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}{loading ? "جاري إنشاء الحساب…" : "إنشاء الحساب"}</button>
          </form>

          <div className="mt-4 text-center text-xs font-bold text-white/60">لديك حساب؟ <Link href="/login" onClick={(event) => { event.preventDefault(); router.push(`/login?returnTo=${encodeURIComponent(getSafeReturnTo())}`); }} className="inline-flex min-h-[44px] items-center gap-1 text-[var(--brand-yellow)]"><LogIn className="h-3.5 w-3.5" /> تسجيل الدخول</Link></div>
        </section>
      </motion.div>
    </main>
  );
}
