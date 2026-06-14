"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSiteSettings } from "@/lib/siteSettings";

type MaintenanceState = {
  loading: boolean;
  enabled: boolean;
  message: string;
};

const fallbackMaintenanceMessage =
  "الموقع مغلق مؤقتًا للصيانة بسبب بعض المشاكل التقنية وتضخم البيانات. نعتذر لكم، وراح نرجع لكم قريب بإذن الله.";

export default function MaintenanceGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [maintenance, setMaintenance] = useState<MaintenanceState>({
    loading: true,
    enabled: false,
    message: "",
  });

  const isAdminPage = pathname?.startsWith("/admin");

  useEffect(() => {
    async function loadMaintenanceSettings() {
      try {
        const settings = await getSiteSettings();

        setMaintenance({
          loading: false,
          enabled: settings.maintenanceMode,
          message: settings.maintenanceMessage,
        });
      } catch (error) {
        console.error("فشل تحميل إعدادات الصيانة العامة:", error);

        setMaintenance({
          loading: false,
          enabled: false,
          message: "",
        });
      }
    }

    loadMaintenanceSettings();

    const interval = setInterval(loadMaintenanceSettings, 15000);

    return () => clearInterval(interval);
  }, []);

  if (isAdminPage) {
    return <>{children}</>;
  }

  if (maintenance.loading) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 text-white"
      >
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-6 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 h-14 w-14 overflow-hidden rounded-2xl border border-white/20 bg-white/10">
            <img
              src="/wc2026-logo.png"
              alt="شعار منصة توقعات كأس العالم 2026"
              className="h-full w-full object-contain p-1"
            />
          </div>

          <h1 className="text-xl font-black">جاري تحميل المنصة...</h1>
          <p className="mt-2 text-sm text-slate-300">لحظات بسيطة</p>
        </section>
      </main>
    );
  }

  if (maintenance.enabled) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 text-white"
      >
        <section className="w-full max-w-xl rounded-[2rem] border border-red-400/20 bg-white/10 p-6 text-center shadow-2xl backdrop-blur-xl md:p-8">
          <div className="mx-auto mb-5 h-20 w-20 overflow-hidden rounded-3xl border border-white/20 bg-white/10 md:h-24 md:w-24">
            <img
              src="/wc2026-logo.png"
              alt="شعار منصة توقعات كأس العالم 2026"
              className="h-full w-full object-contain p-2"
            />
          </div>

          <div className="mx-auto mb-5 w-fit rounded-full border border-red-400/30 bg-red-500/15 px-4 py-2 text-sm font-black text-red-100">
            الموقع مغلق مؤقتًا
          </div>

          <h1 className="text-2xl font-black leading-snug md:text-4xl">
            نعتذر منكم يا أبطال
          </h1>

          <p className="mt-5 whitespace-pre-line rounded-3xl border border-white/10 bg-slate-950/60 p-5 text-sm leading-8 text-slate-100 md:text-base">
            {maintenance.message || fallbackMaintenanceMessage}
          </p>

          <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-7 text-amber-100">
            شكرًا لصبركم، نشتغل على تحسين التجربة وترتيب البيانات عشان ترجع
            المنصة بشكل أفضل.
          </div>

          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="mt-6 rounded-xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15"
          >
            دخول الأدمن
          </button>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}