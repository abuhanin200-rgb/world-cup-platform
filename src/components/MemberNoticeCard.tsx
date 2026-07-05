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

type MemberNoticeCardProps = {
  notice: MemberNotice;
  userId: string;
  onClose: () => void;
};

const cardMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 34,
    scale: 0.96,
    filter: "blur(8px)",
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.07,
    },
  },
};

const itemMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
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

export default function MemberNoticeCard({
  notice,
  userId,
  onClose,
}: MemberNoticeCardProps) {
  async function handleClose() {
    try {
      await markMemberNoticeClosed(notice.id, userId);
    } catch (error) {
      console.error("Close member notice card error:", error);
    } finally {
      onClose();
    }
  }

  async function handlePrimaryClick() {
    try {
      await markMemberNoticePrimaryClicked(notice.id, userId);
    } catch (error) {
      console.error("Primary notice card button error:", error);
    }

    openNoticeUrl(notice.primaryButtonUrl);
  }

  async function handleSecondaryClick() {
    try {
      await markMemberNoticeSecondaryClicked(notice.id, userId);
    } catch (error) {
      console.error("Secondary notice card button error:", error);
    }

    openNoticeUrl(notice.secondaryButtonUrl);
  }

  return (
    <motion.section
      variants={cardMotion}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.24 }}
      whileTap={{ scale: 0.985 }}
      className="relative mt-4 overflow-hidden rounded-3xl border border-cyan-400/25 bg-cyan-400/10 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur-xl md:mt-5 md:p-5"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-cyan-300/10" />
      <div className="pointer-events-none absolute -right-20 top-8 h-40 w-40 rounded-full bg-cyan-300/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-4 h-40 w-40 rounded-full bg-amber-300/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

      <div className="relative flex flex-col gap-4 lg:flex-row">
        {notice.imageUrl && (
          <motion.div
            variants={itemMotion}
            className="relative h-40 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-lg lg:h-auto lg:w-64 lg:shrink-0"
          >
            <img
              src={notice.imageUrl}
              alt={notice.title}
              className="h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
          </motion.div>
        )}

        <div className="min-w-0 flex-1">
          <motion.div
            variants={itemMotion}
            className="mb-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-cyan-300/40 bg-slate-950/40 px-3 py-1 text-[11px] font-black text-cyan-100 shadow-lg shadow-cyan-950/10"
          >
            {getNoticeIcon(notice.type)}
            <span>{getMemberNoticeTypeLabel(notice.type)}</span>
          </motion.div>

          <motion.h2
            variants={itemMotion}
            className="text-xl font-black leading-snug text-white md:text-2xl"
          >
            {notice.title}
          </motion.h2>

          <motion.p
            variants={itemMotion}
            className="mt-3 text-sm font-medium leading-7 text-cyan-50 md:text-base"
          >
            {notice.shortDescription}
          </motion.p>

          <motion.div
            variants={itemMotion}
            className="mt-4 whitespace-pre-line rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm leading-8 text-slate-100 shadow-inner"
          >
            {notice.body}
          </motion.div>

          {(notice.primaryButtonText ||
            notice.secondaryButtonText ||
            notice.isDismissible) && (
            <motion.div
              variants={itemMotion}
              className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3"
            >
              {notice.primaryButtonText && notice.primaryButtonUrl && (
                <button
                  type="button"
                  onClick={handlePrimaryClick}
                  className="group relative inline-flex min-h-[48px] items-center justify-center gap-2 overflow-hidden rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-200 active:scale-95"
                >
                  <span className="pointer-events-none absolute inset-0 translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent transition duration-700 group-hover:translate-x-[-120%]" />
                  <span className="relative">{notice.primaryButtonText}</span>
                  <ExternalLink className="relative h-4 w-4" />
                </button>
              )}

              {notice.secondaryButtonText && notice.secondaryButtonUrl && (
                <button
                  type="button"
                  onClick={handleSecondaryClick}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20 transition hover:bg-white/10 active:scale-95"
                >
                  <span>{notice.secondaryButtonText}</span>
                  <ExternalLink className="h-4 w-4" />
                </button>
              )}

              {notice.isDismissible && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100 shadow-lg shadow-red-950/10 transition hover:bg-red-500/20 active:scale-95"
                >
                  <X className="h-4 w-4" />
                  <span>إغلاق الإشعار</span>
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.section>
  );
}