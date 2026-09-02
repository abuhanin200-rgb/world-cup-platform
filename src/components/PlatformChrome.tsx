"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { CircleUserRound, Gamepad2, Home, LogOut, Medal, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PlatformNotificationsPopover from "@/components/PlatformNotificationsPopover";
import TournamentAutomationHeartbeat from "@/components/TournamentAutomationHeartbeat";
import InteractionSoundToggle from "@/components/interaction/InteractionSoundToggle";
import NetworkStatusBanner from "@/components/NetworkStatusBanner";
import { playInteractionFeedback } from "@/lib/interactionFeedback";

const WHATSAPP_URL = "https://wa.me/966542180200";
const NAV_ITEMS = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/tournaments", label: "البطولات", icon: Trophy },
  { href: "/games", label: "الألعاب", icon: Gamepad2 },
  { href: "/tournaments/gulf-cup-27/leaderboard", label: "الترتيب", icon: Medal },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/tournaments/gulf-cup-27/leaderboard") return pathname.endsWith("/leaderboard");
  if (href === "/tournaments") return pathname.startsWith("/tournaments") && !pathname.endsWith("/leaderboard");
  if (href === "/games") {
    return pathname === "/games" || pathname === "/word-game" || pathname === "/flag-memory" || pathname === "/ten-seconds-challenge";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isAccountActive(pathname: string) {
  return pathname === "/account" || pathname === "/login" || pathname === "/register";
}

export default function PlatformChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { user, isLoggedIn, logout } = useAuth();
  const isAdmin = pathname.startsWith("/admin");
  const accountHref = isLoggedIn ? "/account" : "/login";

  function handleLogout() {
    playInteractionFeedback("selection");
    logout();
    router.push("/");
  }

  if (isAdmin) {
    return <div className="min-h-screen bg-[var(--brand-navy-950)] text-white">{children}<footer className="border-t border-white/10 bg-[#04133a] px-4 py-5 text-center text-xs font-bold text-white/60"><a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="transition hover:text-[#ffc210]">برمجة وتطوير: عبدالسلام العنزي</a></footer></div>;
  }

  return (
    <div className="altahaddi-glass-world min-h-screen bg-[var(--brand-navy-950)] text-white">
      <TournamentAutomationHeartbeat />
      <NetworkStatusBanner />
      <header className="sticky top-0 z-[70] border-b border-white/[0.09] bg-[#04133a]/58 pt-[env(safe-area-inset-top)] backdrop-blur-2xl">
        <div className="mx-auto flex min-h-[64px] max-w-7xl items-center justify-between gap-2 px-2.5 sm:px-4 md:min-h-[72px] md:px-6">
          <Link href="/" aria-label="منصة التحدي - الرئيسية" className="flex min-w-0 items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffc210]">
            <img src="/brand/altahaddi-symbol-white.png" alt="" className="h-9 w-9 shrink-0 object-contain md:h-10 md:w-10" />
            <div className="min-w-0"><div className="text-base font-black leading-none sm:text-lg md:text-xl">التحدي</div><div className="mt-1 whitespace-nowrap text-[8.5px] font-bold leading-none text-[#ffc210]/90 sm:text-[10px]">توقعات · بطولات · ألعاب</div></div>
          </Link>

          <nav className="altahaddi-glass-soft hidden items-center gap-1 rounded-2xl p-1 lg:flex" aria-label="التنقل الرئيسي">
            {NAV_ITEMS.slice(0, 3).map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return <Link key={item.href} href={item.href} onClick={() => playInteractionFeedback("selection", { vibrate: false })} className={`relative inline-flex min-h-[42px] items-center gap-2 rounded-xl px-3.5 text-sm font-black transition ${active ? "text-[#04133a]" : "text-white/68 hover:text-white"}`}>{active ? <motion.span layoutId="desktop-nav-active" className="absolute inset-0 rounded-xl bg-[#ffc210]" transition={{ type: "spring", stiffness: 300, damping: 28 }} /> : null}<Icon className="relative z-10 h-4 w-4" /><span className="relative z-10">{item.label}</span></Link>;
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <InteractionSoundToggle />
            {isLoggedIn && user ? <PlatformNotificationsPopover /> : null}
            <Link href={accountHref} onClick={() => playInteractionFeedback("selection", { vibrate: false })} className={`inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-2 text-[10px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffc210] sm:min-h-[44px] sm:px-3 sm:text-xs md:text-sm ${isLoggedIn ? "border border-white/10 bg-white/[0.055] text-white hover:bg-white/[0.09]" : "border border-[#ffc210]/25 bg-[#ffc210]/[0.08] text-[#ffc210] hover:bg-[#ffc210]/[0.12]"}`}><CircleUserRound className="h-4 w-4 text-[#ffc210]" /><span className="hidden max-w-[110px] truncate sm:inline">{isLoggedIn && user ? user.fullName : "تسجيل الدخول"}</span></Link>
            {isLoggedIn && user ? <button type="button" onClick={handleLogout} aria-label="تسجيل الخروج" title="تسجيل الخروج" className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-red-300/12 bg-red-400/[0.06] px-2 text-red-100 transition hover:bg-red-400/[0.12] sm:px-3"><LogOut className="h-4 w-4" /><span className="hidden text-xs font-black sm:inline">خروج</span></button> : null}
          </div>
        </div>
      </header>

      <motion.div key={pathname} initial={reduceMotion ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.24, ease: "easeOut" }} className="min-h-[calc(100vh-72px)] pb-[calc(108px+env(safe-area-inset-bottom))] md:pb-0">{children}</motion.div>

      <footer className="border-t border-white/[0.07] bg-[#04133a] px-4 pb-[calc(112px+env(safe-area-inset-bottom))] pt-7 text-center text-xs font-bold text-white/60 md:py-7">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4">
          <nav aria-label="روابط الفوتر" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link href="/" className="transition hover:text-[#ffc210]">الرئيسية</Link>
            <Link href="/tournaments" className="transition hover:text-[#ffc210]">البطولات</Link>
            <Link href="/games" className="transition hover:text-[#ffc210]">الألعاب</Link>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="transition hover:text-[#ffc210]">الدعم</a>
          </nav>
          <div className="flex flex-col items-center justify-center gap-2 border-t border-white/[0.06] pt-3 sm:flex-row sm:gap-4"><span>منصة التحدي</span><span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" /><a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="text-white/78 transition hover:text-[#ffc210]">برمجة وتطوير: عبدالسلام العنزي</a></div>
        </div>
      </footer>

      <nav className="altahaddi-mobile-dock altahaddi-glass-strong fixed inset-x-2 bottom-[max(8px,env(safe-area-inset-bottom))] z-[80] mx-auto max-w-[520px] rounded-[26px] p-1.5 md:hidden" aria-label="التنقل الرئيسي للجوال">
        <div className="grid grid-cols-5 gap-0.5">
          {[...NAV_ITEMS, { href: accountHref, label: "حسابي", icon: CircleUserRound } as const].map((item) => {
            const Icon = item.icon;
            const active = item.label === "حسابي" ? isAccountActive(pathname) : isActive(pathname, item.href);
            return (
              <Link key={`${item.href}-${item.label}`} href={item.href} aria-current={active ? "page" : undefined} onClick={() => playInteractionFeedback("selection")} className={`relative flex min-h-[61px] flex-col items-center justify-end rounded-2xl px-1 pb-1.5 pt-5 text-[9px] font-black transition ${active ? "text-[#ffc210]" : "text-white/48 active:bg-white/[0.05]"}`}>
                {active ? <motion.span layoutId="mobile-nav-orb" className="absolute -top-[13px] grid h-11 w-11 place-items-center rounded-full border-[3px] border-[#071b4e] bg-[#ffc210] text-[#04133a] shadow-[0_0_0_1px_rgba(255,194,16,.25),0_8px_26px_rgba(255,194,16,.32)]" transition={{ type: "spring", stiffness: 280, damping: 23 }}><Icon className="h-[19px] w-[19px]" /></motion.span> : <Icon className="absolute top-2.5 h-[18px] w-[18px]" />}
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
