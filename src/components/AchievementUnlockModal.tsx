"use client";

import { motion, type Variants } from "framer-motion";
import { Medal, Sparkles } from "lucide-react";

type AchievementUnlockModalProps = {
  icon: string;
  title: string;
  description: string;
  onClose: () => void;
};

const overlayMotion: Variants = {
  hidden: {
    opacity: 0,
  },
  show: {
    opacity: 1,
    transition: {
      duration: 0.24,
      ease: "easeOut",
    },
  },
};

const modalMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 28,
    scale: 0.9,
    filter: "blur(10px)",
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.42,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
    },
  },
};

const itemMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
    scale: 0.97,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.28,
      ease: "easeOut",
    },
  },
};

export default function AchievementUnlockModal({
  icon,
  title,
  description,
  onClose,
}: AchievementUnlockModalProps) {
  return (
    <motion.div
      variants={overlayMotion}
      initial="hidden"
      animate="show"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/80 p-4 backdrop-blur-sm"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(251,191,36,0.18),transparent_36%),radial-gradient(circle_at_15%_80%,rgba(34,211,238,0.10),transparent_32%),radial-gradient(circle_at_90%_70%,rgba(52,211,153,0.08),transparent_30%)]" />

      {Array.from({ length: 18 }).map((_, index) => (
        <motion.span
          key={index}
          aria-hidden="true"
          className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-amber-300"
          style={{
            top: `${12 + ((index * 23) % 78)}%`,
            right: `${8 + ((index * 31) % 84)}%`,
          }}
          initial={{ opacity: 0, y: 16, scale: 0.6 }}
          animate={{
            opacity: [0, 1, 0],
            y: [16, -24, -46],
            scale: [0.6, 1, 0.8],
          }}
          transition={{
            duration: 1.8 + (index % 4) * 0.2,
            delay: index * 0.04,
            repeat: Infinity,
            repeatDelay: 1.2,
            ease: "easeOut",
          }}
        />
      ))}

      <motion.div
        variants={modalMotion}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-amber-400/30 bg-slate-950 p-5 text-center shadow-2xl shadow-amber-950/20"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-amber-300/10" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-amber-300/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-44 w-44 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="relative">
          <motion.div
            variants={itemMotion}
            animate={{
              y: [0, -5, 0],
              scale: [1, 1.04, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 text-5xl shadow-lg shadow-amber-500/10"
          >
            {icon}
          </motion.div>

          <motion.div
            variants={itemMotion}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-sm font-black text-amber-300"
          >
            <Medal className="h-4 w-4" />
            <span>وسام جديد</span>
            <Sparkles className="h-3.5 w-3.5" />
          </motion.div>

          <motion.h2
            variants={itemMotion}
            className="mt-2 text-2xl font-black text-white"
          >
            {title}
          </motion.h2>

          <motion.p
            variants={itemMotion}
            className="mt-3 text-sm font-bold leading-7 text-slate-300"
          >
            {description}
          </motion.p>

          <motion.button
            type="button"
            onClick={onClose}
            variants={itemMotion}
            whileTap={{ scale: 0.94, y: 2 }}
            className="group relative mt-5 w-full overflow-hidden rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300"
          >
            <span className="pointer-events-none absolute inset-0 translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent transition duration-700 group-hover:translate-x-[-120%]" />
            <span className="relative">تم، يا بطل 🔥</span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}