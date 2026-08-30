"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CircleUserRound, Gamepad2, Home, LogOut, Medal, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PlatformNotificationsPopover from "@/components/PlatformNotificationsPopover";
import TournamentAutomationHeartbeat from "@/components/TournamentAutomationHeartbeat";

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
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PlatformChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { user, isLoggedIn, logout } = useAuth();
  const isAdmin = pathname.startsWith("/admin");
  const accountHref = isLoggedIn ? "/account" : "/login";

  function handleLogout() {
    logout();
    router.push("/");
  }

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-[var(--brand-navy-950)] text-white">
        {children}
        <footer className="border-t border-white/10 bg-[#04133a] px-4 py-5 text-center text-xs font-bold text-white/60">
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="transition hover:text-[var(--brand-yellow)] focus-visible:text-[var(--brand-yellow)]">
            برمجة وتطوير: عبدالسلام العنزي
          </a>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--brand-navy-950)] text-white">
      <TournamentAutomationHeartbeat />
      <header className="sticky top-0 z-[70] border-b border-[#ffc210]/15 bg-[#061a4d]/96 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[64px] max-w-7xl items-center justify-between gap-2 px-2.5 sm:px-4 md:min-h-[72px] md:px-6">
          <Link href="/" aria-label="منصة التحدي - الرئيسية" className="flex min-w-0 items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-yellow)]">
            <img src="/brand/altahaddi-symbol-white.png" alt="" className="h-9 w-9 shrink-0 object-contain md:h-10 md:w-10" />
            <div className="min-w-0">
              <div className="text-base font-black leading-none text-white sm:text-lg md:text-xl">التحدي</div>
              <div className="mt-1 whitespace-nowrap text-[8.5px] font-bold leading-none text-[var(--brand-yellow)]/90 sm:text-[10px]">توقعات · بطولات · ألعاب</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
            {NAV_ITEMS.slice(0, 3).map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3.5 text-sm font-black transition ${active ? "bg-[#ffc210]/10 text-[#ffc210] ring-1 ring-inset ring-[#ffc210]/20" : "text-white/75 hover:bg-white/10 hover:text-white"}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {isLoggedIn && user ? <PlatformNotificationsPopover /> : null}
            <Link href={accountHref} className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl px-2.5 text-[10px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffc210] sm:min-h-[44px] sm:px-3 sm:text-xs md:text-sm ${isLoggedIn ? "border border-white/12 bg-white/[0.06] text-white hover:bg-white/10" : "border border-[#ffc210]/35 bg-[#ffc210]/10 text-[#ffc210] hover:bg-[#ffc210]/15"}`}>
              <CircleUserRound className="h-4 w-4 text-[var(--brand-yellow)]" aria-hidden="true" />
              <span className="max-w-[72px] truncate sm:max-w-[110px]">{isLoggedIn && user ? user.fullName : "تسجيل الدخول"}</span>
            </Link>
            {isLoggedIn && user ? (
              <button type="button" onClick={handleLogout} aria-label="تسجيل الخروج" title="تسجيل الخروج" className="inline-flex min-h-[42px] min-w-[42px] items-center justify-center gap-1.5 rounded-xl border border-red-300/15 bg-red-400/[0.08] px-2 text-red-100 transition hover:bg-red-400/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 sm:min-h-[44px] sm:px-3">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden text-xs font-black sm:inline">خروج</span>
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="min-h-[calc(100vh-72px)] pb-[78px] md:pb-0">{children}</div>

      <footer className="border-t border-white/10 bg-[#04133a] px-4 pb-[calc(92px+env(safe-area-inset-bottom))] pt-6 text-center text-xs font-bold text-white/55 md:py-7">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
          <span>منصة التحدي</span>
          <span className="hidden h-1 w-1 rounded-full bg-white/25 sm:block" />
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="text-white/75 transition hover:text-[var(--brand-yellow)] focus-visible:text-[var(--brand-yellow)]">
            برمجة وتطوير: عبدالسلام العنزي
          </a>
        </div>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-[80] border-t border-white/10 bg-[#061a4d]/96 px-1.5 pb-[max(6px,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-12px_30px_rgba(0,0,0,.3)] backdrop-blur-xl md:hidden" aria-label="التنقل الرئيسي للجوال">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-[55px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[9.5px] font-black transition ${active ? "bg-white/10 text-[var(--brand-yellow)]" : "text-white/55 active:bg-white/[0.06]"}`}>
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <Link href={accountHref} aria-current={pathname === "/account" || pathname === "/login" ? "page" : undefined} className={`flex min-h-[55px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[9.5px] font-black transition ${pathname === "/account" || pathname === "/login" ? "bg-white/10 text-[var(--brand-yellow)]" : "text-white/55 active:bg-white/[0.06]"}`}>
            <CircleUserRound className="h-[18px] w-[18px]" aria-hidden="true" />
            <span>حسابي</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
