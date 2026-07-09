"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { getSiteSettings } from "@/lib/siteSettings";

type MaintenanceState = {
  loading: boolean;
  enabled: boolean;
  message: string;
};

const fallbackMaintenanceMessage =
  "الموقع مغلق مؤقتًا للصيانة بسبب بعض المشاكل التقنية وتضخم البيانات. نعتذر لكم، وراح نرجع لكم قريب بإذن الله.";

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
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
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
      duration: 0.34,
      ease: "easeOut",
    },
  },
};

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
      <motion.main
        dir="rtl"
        variants={pageMotion}
        initial="hidden"
        animate="show"
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 text-white"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.16),transparent_34%),radial-gradient(circle_at_10%_30%,rgba(56,189,248,0.12),transparent_32%),radial-gradient(circle_at_90%_70%,rgba(52,211,153,0.10),transparent_30%)]" />
        <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-24 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />

        <motion.section
          variants={cardMotion}
          className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.08] p-6 text-center shadow-2xl shadow-slate-950/40 backdrop-blur-xl"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-amber-300/5" />
          <div className="pointer-events-none absolute -top-20 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-amber-300/15 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

          <motion.div
            variants={itemMotion}
            className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.7rem] border border-white/15 bg-slate-950/45 shadow-xl shadow-slate-950/30"
          >
            <motion.div
              aria-hidden="true"
              className="absolute inset-[-7px] rounded-[2rem] border border-amber-300/25"
              animate={{ rotate: 360 }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear",
              }}
            />

            <motion.div
              aria-hidden="true"
              className="absolute inset-[-13px] rounded-[2.2rem] border border-cyan-300/15 border-t-cyan-200/60"
              animate={{ rotate: -360 }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "linear",
              }}
            />

            <motion.img
              src="/wc2026-logo.png"
              alt="شعار منصة توقعات كأس العالم 2026"
              className="relative h-14 w-14 object-contain p-1"
              animate={{
                y: [0, -4, 0],
                scale: [1, 1.04, 1],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>

          <motion.div
            variants={itemMotion}
            className="relative mx-auto mb-3 inline-flex items-center justify-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-[11px] font-black text-amber-100"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>تجهيز التجربة</span>
          </motion.div>

          <motion.h1
            variants={itemMotion}
            className="relative text-2xl font-black leading-snug"
          >
             اللهم صل وسلم على نبينا محمد
          </motion.h1>

          <motion.p
            variants={itemMotion}
            className="relative mt-2 text-sm font-bold text-slate-300"
          >
            لحظات بسيطة ونجهز لك التحديات
          </motion.p>

          <motion.div
            variants={itemMotion}
            className="relative mt-5 overflow-hidden rounded-full border border-white/10 bg-slate-950/45 p-1"
          >
            <motion.div
              className="h-2 rounded-full bg-gradient-to-l from-amber-300 via-cyan-300 to-emerald-300"
              initial={{ x: "100%" }}
              animate={{ x: "-100%" }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>

          <motion.div
            variants={itemMotion}
            className="relative mt-4 text-[11px] font-bold text-slate-500"
          >
            World Cup 2026 Predictions Platform
          </motion.div>
        </motion.section>
      </motion.main>
    );
  }

  if (maintenance.enabled) {
    return (
      <motion.main
        dir="rtl"
        variants={pageMotion}
        initial="hidden"
        animate="show"
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 text-white"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.14),transparent_34%),radial-gradient(circle_at_10%_30%,rgba(251,191,36,0.12),transparent_32%),radial-gradient(circle_at_90%_70%,rgba(34,211,238,0.10),transparent_30%)]" />
        <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-red-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-24 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />

        <motion.section
          variants={cardMotion}
          className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-red-400/20 bg-white/[0.08] p-6 text-center shadow-2xl shadow-slate-950/40 backdrop-blur-xl md:p-8"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-red-300/5" />
          <div className="pointer-events-none absolute -top-20 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-red-300/15 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

          <motion.div
            variants={itemMotion}
            className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/15 bg-slate-950/45 shadow-xl shadow-slate-950/30"
          >
            <motion.div
              aria-hidden="true"
              className="absolute inset-[-8px] rounded-[2.35rem] border border-red-300/25 border-t-red-200/70"
              animate={{ rotate: 360 }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear",
              }}
            />

            <img
              src="/wc2026-logo.png"
              alt="شعار منصة توقعات كأس العالم 2026"
              className="relative h-16 w-16 object-contain p-1"
            />
          </motion.div>

          <motion.div
            variants={itemMotion}
            className="relative mx-auto mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-red-400/30 bg-red-500/15 px-4 py-2 text-sm font-black text-red-100"
          >
            <Wrench className="h-4 w-4" />
            <span>الموقع مغلق مؤقتًا</span>
          </motion.div>

          <motion.h1
            variants={itemMotion}
            className="relative text-2xl font-black leading-snug md:text-4xl"
          >
            نعتذر منكم يا أبطال
          </motion.h1>

          <motion.p
            variants={itemMotion}
            className="relative mt-5 whitespace-pre-line rounded-3xl border border-white/10 bg-slate-950/60 p-5 text-sm font-bold leading-8 text-slate-100 md:text-base"
          >
            {maintenance.message || fallbackMaintenanceMessage}
          </motion.p>

          <motion.div
            variants={itemMotion}
            className="relative mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm font-bold leading-7 text-amber-100"
          >
            شكرًا لصبركم، نشتغل على تحسين التجربة وترتيب البيانات عشان ترجع
            المنصة بشكل أفضل.
          </motion.div>

          <motion.button
            variants={itemMotion}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => router.push("/admin")}
            className="relative mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20 transition hover:bg-white/15"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            <span>دخول الأدمن</span>
          </motion.button>
        </motion.section>
      </motion.main>
    );
  }

  return <>{children}</>;
}