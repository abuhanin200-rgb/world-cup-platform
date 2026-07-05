"use client";

import { motion, type Variants } from "framer-motion";
import {
  AlertTriangle,
  ExternalLink,
  Gift,
  Megaphone,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import {
  getMemberNoticeTypeLabel,
  markMemberNoticeClosed,
  markMemberNoticePrimaryClicked,
  markMemberNoticeSecondaryClicked,
  type MemberNotice,
} from "@/lib/memberNotices";

type MemberNoticeBannerProps = {
  notice: MemberNotice;
  userId: string;
  onClose: () => void;
};

const bannerMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 28,
    scale: 0.96,
    filter: "blur(8px)",
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.48,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.06,
    },
  },
};

const itemMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: "easeOut",
    },
  },
};

function openNoticeUrl(url: string) {
  const cleanUrl = url.trim();

  if (!cleanUrl) return;

  window.open(cleanUrl, "_blank", "noopener,noreferrer");
}

function getNoticeIcon(type: string) {
  const normalizedType = type.toLowerCase();

  if (normalizedType.includes("warning") || normalizedType.includes("alert")) {
    return <AlertTriangle className="h-4 w-4" />;
  }

  if (normalizedType.includes("gift") || normalizedType.includes("reward")) {
    return <Gift className="h-4 w-4" />;
  }

  if (
    normalizedType.includes("winner") ||
    normalizedType.includes("trophy") ||
    normalizedType.includes("achievement")
  ) {
    return <Trophy className="h-4 w-4" />;
  }

  if (normalizedType.includes("update") || normalizedType.includes("feature")) {
    return <Sparkles className="h-4 w-4" />;
  }

  return <Megaphone className="h-4 w-4" />;
}

export default function MemberNoticeBanner({
  notice,
  userId,
  onClose,
}: MemberNoticeBannerProps) {
  async function handleClose() {
    try {
      await markMemberNoticeClosed(notice.id, userId);
    } catch (error) {
      console.error("Close member notice banner error:", error);
    } finally {
      onClose();
    }
  }

  async function handlePrimaryClick() {
    try {
      await markMemberNoticePrimaryClicked(notice.id, userId);
    } catch (error) {
      console.error("Primary notice banner button error:", error);
    }

    openNoticeUrl(notice.primaryButtonUrl);
  }

  async function handleSecondaryClick() {
    try {
      await markMemberNoticeSecondaryClicked(notice.id, userId);
    } catch (error) {
      console.error("Secondary notice banner button error:", error);
    }

    openNoticeUrl(notice.secondaryButtonUrl);
  }

  return (
    <motion.section
      variants={bannerMotion}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.28 }}
      whileTap={{ scale: 0.985 }}
      className="relative mt-4 overflow-hidden rounded-3xl border border-amber-400/30 bg-amber-400/10 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur-xl md:mt-5 md:p-5"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-amber-300/10" />
      <div className="pointer-events-none absolute -right-16 top-4 h-32 w-32 rounded-full bg-amber-300/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-2 h-32 w-32 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

      <div className="relative flex flex-col gap-4 md:flex-row md:items-center">
        {notice.imageUrl && (
          <motion.div
            variants={itemMotion}
            className="relative h-28 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-lg md:h-24 md:w-44 md:shrink-0"
          >
            <img
              src={notice.imageUrl}
              alt={notice.title}
              className="h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
          </motion.div>
        )}

        <div className="min-w-0 flex-1">
          <motion.div
            variants={itemMotion}
            className="mb-2 inline-flex items-center justify-center gap-1.5 rounded-full border border-amber-300/40 bg-slate-950/40 px-3 py-1 text-[11px] font-black text-amber-100 shadow-lg shadow-amber-950/10"
          >
            {getNoticeIcon(notice.type)}
            <span>{getMemberNoticeTypeLabel(notice.type)}</span>
          </motion.div>

          <motion.h2
            variants={itemMotion}
            className="text-lg font-black leading-snug text-white md:text-xl"
          >
            {notice.title}
          </motion.h2>

          <motion.p
            variants={itemMotion}
            className="mt-2 text-sm font-medium leading-7 text-amber-50"
          >
            {notice.shortDescription}
          </motion.p>

          {notice.body && (
            <motion.p
              variants={itemMotion}
              className="mt-2 line-clamp-2 text-xs leading-6 text-slate-200 md:text-sm"
            >
              {notice.body}
            </motion.p>
          )}
        </div>

        <motion.div
          variants={itemMotion}
          className="flex flex-col gap-2 md:w-44 md:shrink-0"
        >
          {notice.primaryButtonText && notice.primaryButtonUrl && (
            <button
              type="button"
              onClick={handlePrimaryClick}
              className="group relative inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-2xl bg-amber-400 px-4 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300 active:scale-95 md:text-sm"
            >
              <span className="pointer-events-none absolute inset-0 translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition duration-700 group-hover:translate-x-[-120%]" />
              <span className="relative">{notice.primaryButtonText}</span>
              <ExternalLink className="relative h-4 w-4" />
            </button>
          )}

          {notice.secondaryButtonText && notice.secondaryButtonUrl && (
            <button
              type="button"
              onClick={handleSecondaryClick}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black text-white shadow-lg shadow-slate-950/20 transition hover:bg-white/10 active:scale-95 md:text-sm"
            >
              <span>{notice.secondaryButtonText}</span>
              <ExternalLink className="h-4 w-4" />
            </button>
          )}

          {notice.isDismissible && (
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-xs font-black text-red-100 shadow-lg shadow-red-950/10 transition hover:bg-red-500/20 active:scale-95"
            >
              <X className="h-4 w-4" />
              <span>إغلاق</span>
            </button>
          )}
        </motion.div>
      </div>
    </motion.section>
  );
}