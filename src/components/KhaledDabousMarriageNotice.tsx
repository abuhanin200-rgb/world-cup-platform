"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

const NOTICE_KEY = "khaledDabousMarriageNoticeSeen_v1";

const KHALED_IMAGE =
  "https://i.postimg.cc/WprWLvgv/Whats-App-Image-2026-07-05-at-7-45-48-PM.jpg";

export default function KhaledDabousMarriageNotice() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const seen = window.localStorage.getItem(NOTICE_KEY);
    if (!seen) {
      const timer = window.setTimeout(() => {
        setIsOpen(true);
      }, 900);

      return () => window.clearTimeout(timer);
    }
  }, []);

  function closeNotice() {
    window.localStorage.setItem(NOTICE_KEY, "true");
    setIsOpen(false);
  }

  if (!isOpen) return null;

  return (
    <motion.div
      dir="rtl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-slate-950/85 px-3 backdrop-blur-md"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 26 }).map((_, index) => (
          <motion.span
            key={`fire-${index}`}
            className="absolute h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.95)]"
            style={{
              left: `${8 + ((index * 13) % 84)}%`,
              top: `${10 + ((index * 19) % 70)}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 2.4, 0],
              x: [0, index % 2 === 0 ? 44 : -44],
              y: [0, index % 3 === 0 ? -54 : 54],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              delay: index * 0.11,
              ease: "easeOut",
            }}
          />
        ))}

        {Array.from({ length: 42 }).map((_, index) => (
          <motion.span
            key={`confetti-${index}`}
            className="absolute h-2.5 w-1 rounded-full bg-white/80"
            style={{
              left: `${(index * 9) % 100}%`,
              top: "-10%",
            }}
            animate={{
              y: ["0vh", "115vh"],
              rotate: [0, 180, 360],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 4 + (index % 5),
              repeat: Infinity,
              delay: index * 0.08,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ scale: 0.86, y: 26, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 140, damping: 16 }}
        className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-amber-300/40 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-5 text-center shadow-2xl shadow-amber-950/40"
      >
        <button
          type="button"
          onClick={closeNotice}
          aria-label="إغلاق"
          className="absolute left-4 top-4 z-20 rounded-full border border-white/15 bg-white/10 p-2 text-white transition hover:bg-white/20 active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.25),transparent_42%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.14),transparent_45%)]" />

        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="mx-auto mb-3 inline-flex rounded-full border border-amber-300/35 bg-amber-300/10 px-4 py-1.5 text-sm font-black text-amber-100"
          >
            💍 عقد قران مبارك
          </motion.div>

          <motion.div
            animate={{ scale: [1, 1.035, 1] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            className="mx-auto mb-4 h-28 w-28 overflow-hidden rounded-full border-4 border-amber-300 bg-white/10 p-1 shadow-xl shadow-amber-400/25"
          >
            <img
              src={KHALED_IMAGE}
              alt="خالد دبوس"
              className="h-full w-full rounded-full object-cover"
            />
          </motion.div>

          <p className="text-[14px] font-bold leading-7 text-slate-100">
            🎉 بكل الفرح والمحبة، يبارك أعضاء منصة توقعات كأس العالم 2026
            لأخينا
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            🤍 خالد دبوس 🤍
          </h2>

          <p className="mt-3 text-[14px] font-bold leading-7 text-slate-100">
            بمناسبة عقد قرانه 💐
          </p>

          <p className="mt-3 text-[13px] font-semibold leading-7 text-slate-200">
            نسأل الله أن يبارك له ويبارك عليه، ويجمع بينه وبين زوجته على خير،
            ويرزقهما السعادة والمودة والذرية الصالحة
          </p>

          <div className="mt-4 rounded-3xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-lg font-black text-amber-100 shadow-lg shadow-amber-950/20">
            🥳 ألف مبروك يا أبو دبوس
          </div>

          <p className="mt-3 text-sm font-black text-cyan-100">
            🎊 شاركونا الدعوات والتبريكات له.
          </p>

          <button
            type="button"
            onClick={closeNotice}
            className="mt-5 min-h-[48px] w-full rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-950/25 transition hover:bg-amber-300 active:scale-95"
          >
            ألف مبروك 🎉
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}