"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, Download, Share2, Smartphone, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const PROMPT_SHOWN_KEY = "altahaddi:pwa-install-prompt-shown";
const INSTALLED_KEY = "altahaddi:pwa-installed";

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  const standaloneMedia = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return Boolean(standaloneMedia || iosStandalone);
}

function detectDevice() {
  if (typeof navigator === "undefined") return { ios: false, android: false };
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const ios = /iPad|iPhone|iPod/i.test(ua) || (platform === "MacIntel" && maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  return { ios, android };
}

function wasPromptShown() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(PROMPT_SHOWN_KEY) === "1";
}

export default function PWAClient() {
  const pathname = usePathname() || "/";
  const [{ ios, android }, setDevice] = useState({ ios: false, android: false });
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  const excluded = pathname.startsWith("/admin");
  const supportedMobile = ios || android;

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      } catch (error) {
        console.warn("PWA service worker registration failed", error);
      }
    };

    if (document.readyState === "complete") void register();
    else window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);

  useEffect(() => {
    setDevice(detectDevice());
    const standalone = isStandaloneMode() || window.localStorage.getItem(INSTALLED_KEY) === "1";
    setInstalled(standalone);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      window.localStorage.setItem(INSTALLED_KEY, "1");
      setInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const canShow = useMemo(() => {
    if (excluded || installed || !supportedMobile) return false;
    if (wasPromptShown()) return false;
    if (ios) return true;
    return android && Boolean(deferredPrompt);
  }, [android, deferredPrompt, excluded, installed, ios, supportedMobile]);

  useEffect(() => {
    if (!canShow) {
      setVisible(false);
      return;
    }

    const delay = pathname === "/tournaments/gulf-cup-27" ? 4200 : 2200;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(PROMPT_SHOWN_KEY, "1");
      setVisible(true);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [canShow, pathname]);

  async function installAndroid() {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        window.localStorage.setItem(INSTALLED_KEY, "1");
        setInstalled(true);
        setVisible(false);
      } else {
        setVisible(false);
      }
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  }

  function dismiss() {
    // The prompt is intentionally shown only once per browser/device.
    window.localStorage.setItem(PROMPT_SHOWN_KEY, "1");
    setVisible(false);
  }

  if (!visible || excluded || installed) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[120] px-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-4" dir="rtl">
      <div className="mx-auto max-w-[520px] overflow-hidden rounded-[28px] border border-white/15 bg-[#061a4d]/95 shadow-[0_-18px_60px_rgba(0,0,0,.38)] backdrop-blur-2xl">
        <div className="relative p-4 sm:p-5">
          <button
            type="button"
            onClick={dismiss}
            aria-label="إغلاق"
            className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white/65 transition hover:bg-white/[0.1] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3 pl-10">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[#ffc210]/25 bg-[#ffc210]/10 text-[#ffc210] shadow-[inset_0_1px_0_rgba(255,255,255,.09)]">
              <Smartphone className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-[#ffc210]">تجربة أسرع على الجوال</p>
              <h2 className="mt-0.5 text-lg font-black text-white">ثبّت تطبيق التحدي</h2>
              <p className="mt-1 text-xs leading-6 text-white/62">
                افتح التحدي كتطبيق مستقل من الشاشة الرئيسية بدون شريط المتصفح، مع وصول أسرع للبطولات والألعاب.
              </p>
            </div>
          </div>

          {ios ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.055] p-3.5">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Share2 className="h-4 w-4 text-[#65d7ff]" />
                <span>على iPhone</span>
              </div>
              <div className="mt-2 grid gap-2 text-xs leading-6 text-white/68">
                <p><span className="font-black text-white">1.</span> اضغط زر المشاركة <Share2 className="mx-1 inline h-4 w-4" /> من المتصفح.</p>
                <p><span className="font-black text-white">2.</span> اختر <span className="font-black text-[#ffc210]">إضافة إلى الشاشة الرئيسية</span>.</p>
                <p><span className="font-black text-white">3.</span> اضغط <span className="font-black text-white">إضافة</span>.</p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={installAndroid}
              disabled={!deferredPrompt || installing}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ffc210] px-4 text-sm font-black text-[#04133a] shadow-[0_12px_30px_rgba(255,194,16,.24)] transition active:scale-[.99] disabled:cursor-wait disabled:opacity-60"
            >
              {installing ? <CheckCircle2 className="h-5 w-5 animate-pulse" /> : <Download className="h-5 w-5" />}
              {installing ? "جاري فتح التثبيت..." : "تثبيت تطبيق التحدي"}
            </button>
          )}

          <button type="button" onClick={dismiss} className="mt-3 w-full text-center text-xs font-bold text-white/42 transition hover:text-white/65">
            ليس الآن
          </button>
        </div>
      </div>
    </div>
  );
}
