import Link from "next/link";
import { Gamepad2, LogIn, ShieldCheck, UserPlus } from "lucide-react";

type AuthGateCardProps = {
  returnTo: string;
  title: string;
  description: string;
  benefit?: string;
  compact?: boolean;
  primaryLabel?: string;
};

function authHref(pathname: "/login" | "/register", returnTo: string) {
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  return `${pathname}?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

export default function AuthGateCard({
  returnTo,
  title,
  description,
  benefit = "سجّل دخولك حتى تُحفظ مشاركتك وتظهر في ترتيب المنصة.",
  compact = false,
  primaryLabel = "سجّل الدخول للعب",
}: AuthGateCardProps) {
  return (
    <section
      aria-labelledby="auth-gate-title"
      className={`relative overflow-hidden rounded-[28px] border border-white/12 bg-white/[0.065] text-center shadow-xl shadow-black/15 backdrop-blur-xl ${compact ? "p-5 md:p-6" : "p-6 md:p-9"}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,194,16,.13),transparent_36%),linear-gradient(145deg,rgba(255,255,255,.055),transparent_58%)]" />
      <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[var(--brand-yellow)]/25 bg-[var(--brand-yellow)]/[0.09] text-[var(--brand-yellow)]">
        <Gamepad2 className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 id="auth-gate-title" className="relative mt-4 text-xl font-black md:text-2xl">{title}</h2>
      <p className="relative mx-auto mt-2 max-w-xl text-sm font-semibold leading-7 text-white/68">{description}</p>
      <div className="relative mx-auto mt-4 flex max-w-xl items-start gap-2 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2.5 text-right text-xs font-bold leading-6 text-emerald-100/85">
        <ShieldCheck className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{benefit}</span>
      </div>
      <div className="relative mx-auto mt-5 grid max-w-md gap-2 sm:grid-cols-2">
        <Link href={authHref("/login", returnTo)} className="altahaddi-primary-button justify-center">
          <LogIn className="h-4 w-4" aria-hidden="true" />
          {primaryLabel}
        </Link>
        <Link href={authHref("/register", returnTo)} className="altahaddi-secondary-button justify-center">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          إنشاء حساب
        </Link>
      </div>
      <p className="relative mt-4 text-[11px] font-bold text-white/48">لن تُسجّل أي نقاط أو XP قبل تسجيل الدخول.</p>
    </section>
  );
}
