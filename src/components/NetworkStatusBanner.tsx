"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function NetworkStatusBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 top-[calc(70px+env(safe-area-inset-top))] z-[175] mx-auto flex min-h-11 max-w-[520px] items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-[#18130a]/95 px-3 text-center text-[11px] font-black text-amber-100 shadow-2xl shadow-black/35 backdrop-blur-xl md:top-20 md:text-xs"
    >
      <WifiOff className="h-4 w-4 shrink-0 text-[#ffc210]" aria-hidden="true" />
      <span>الاتصال بالإنترنت غير متاح. سنحافظ على الشاشة الحالية حتى يعود الاتصال.</span>
    </div>
  );
}
