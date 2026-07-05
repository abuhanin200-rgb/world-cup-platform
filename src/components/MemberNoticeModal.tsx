"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  AlertTriangle,
  BellRing,
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

type MemberNoticeModalProps = {
  notice: MemberNotice;
  userId: string;
  onClose: () => void;
};

const overlayMotion: Variants = {
  hidden: {
    opacity: 0,
  },
  show: {
    opacity: 1,
    transition: {
      duration: 0.22,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.18,
      ease: "easeIn",
    },
  },
};

const modalMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 42,
    scale: 0.94,
    filter: "blur(10px)",
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.46,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.07,
    },
  },
  exit: {
    opacity: 0,
    y: 26,
    scale: 0.96,
    filter: "blur(8px)",
    transition: {
      duration: 0.22,
      ease: "easeIn",
    },
  },
};

const itemMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
    scale: 0.98,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
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
    return <AlertTriangle className="h-5 w-5" />;
  }

  if (normalizedType.includes("gift") || normalizedType.includes("reward")) {
    return <Gift className="h-5 w-5" />;
  }

  if (
    normalizedType.includes("winner") ||
    normalizedType.includes("trophy") ||
    normalizedType.includes("achievement")
  ) {
    return <Trophy className="h-5 w-5" />;
  }

  if (normalizedType.includes("update") || normalizedType.includes("feature")) {
    return <Sparkles className="h-5 w-5" />;
  }

  return <Megaphone className="h-5 w-5" />;
}

export default function MemberNoticeModal({
  notice,
  userId,
  onClose,
}: MemberNoticeModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  async function handleClose() {
    if (isClosing) return;

    try {
      await markMemberNoticeClosed(notice.id, userId);
    } catch (error) {
      console.error("Close member notice modal error:", error);
    } finally {
      setIsClosing(true);
      window.setTimeout(() => {
        onClose();
      }, 230);
    }
  }

  async function handlePrimaryClick() {
    try {
      await markMemberNoticePrimaryClicked(notice.id, userId);
    } catch (error) {
      console.error("Primary notice button error:", error);
    }

    openNoticeUrl(notice.primaryButtonUrl);
  }

  async function handleSecondaryClick() {
    try {
      await markMemberNoticeSecondaryClicked(notice.id, userId);
    } catch (error) {
      console.error("Secondary notice button error:", error);
    }

    openNoticeUrl(notice.secondaryButtonUrl);
  }

  if (!isMounted) return null;

  return createPortal(
    <AnimatePresence>
      {!isClosing && (
        <motion.div
          dir="rtl"
          variants={overlayMotion}
          initial="hidden"
          animate="show"
          exit="exit"
          className="fixed inset-0 z-[9999] flex items-end justify-center overflow-hidden bg-slate-950/85 px-3 pb-3 pt-8 backdrop-blur-md md:items-center md:p-6"
        >
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            animate={{
              background: [
                "radial-gradient(circle at 50% 8%, rgba(251,191,36,0.18), transparent 32%), radial-gradient(circle at 10% 90%, rgba(56,189,248,0.12), transparent 30%)",
                "radial-gradient(circle at 58% 12%, rgba(52,211,153,0.14), transparent 34%), radial-gradient(circle at 90% 85%, rgba(251,191,36,0.12), transparent 28%)",
                "radial-gradient(circle at 50% 8%, rgba(251,191,36,0.18), transparent 32%), radial-gradient(circle at 10% 90%, rgba(56,189,248,0.12), transparent 30%)",
              ],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.div
            variants={modalMotion}
            initial="hidden"
            animate="show"
            exit="exit"
            className="relative max-h-[90vh] w-full max-w-xl overflow-hidden rounded-t-[2rem] border border-white/10 bg-slate-950 text-white shadow-2xl shadow-slate-950/60 md:rounded-[2rem]"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-amber-300/5" />
            <div className="pointer-events-none absolute -top-20 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-amber-300/20 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

            {notice.isDismissible && (
              <button
                type="button"
                onClick={handleClose}
                className="absolute left-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-white shadow-lg backdrop-blur-xl transition hover:bg-red-500 active:scale-95"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {notice.imageUrl && (
              <motion.div
                variants={itemMotion}
                className="relative h-44 w-full overflow-hidden rounded-t-[2rem] bg-slate-900 md:h-56 md:rounded-t-[2rem]"
              >
                <img
                  src={notice.imageUrl}
                  alt={notice.title}
                  className="h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              </motion.div>
            )}

            <div className="relative max-h-[90vh] overflow-y-auto p-5 md:max-h-[82vh] md:p-6">
              <motion.div
                variants={itemMotion}
                className="mb-3 inline-flex items-center justify-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-black text-amber-100 shadow-lg shadow-amber-950/10"
              >
                {getNoticeIcon(notice.type)}
                <span>{getMemberNoticeTypeLabel(notice.type)}</span>
              </motion.div>

              <motion.h2
                variants={itemMotion}
                className="text-2xl font-black leading-snug md:text-3xl"
              >
                {notice.title}
              </motion.h2>

              <motion.p
                variants={itemMotion}
                className="mt-3 text-sm font-medium leading-7 text-slate-200 md:text-base"
              >
                {notice.shortDescription}
              </motion.p>

              <motion.div
                variants={itemMotion}
                className="mt-4 whitespace-pre-line rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm leading-8 text-slate-100 shadow-inner md:text-base"
              >
                {notice.body}
              </motion.div>

              {(notice.primaryButtonText || notice.secondaryButtonText) && (
                <motion.div
                  variants={itemMotion}
                  className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2"
                >
                  {notice.primaryButtonText && notice.primaryButtonUrl && (
                    <button
                      type="button"
                      onClick={handlePrimaryClick}
                      className="group relative inline-flex min-h-[48px] items-center justify-center gap-2 overflow-hidden rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300 active:scale-95"
                    >
                      <span className="pointer-events-none absolute inset-0 translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition duration-700 group-hover:translate-x-[-120%]" />
                      <span className="relative">
                        {notice.primaryButtonText}
                      </span>
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
                </motion.div>
              )}

              {!notice.isDismissible && (
                <motion.div
                  variants={itemMotion}
                  className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-xs font-bold leading-6 text-red-100"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <BellRing className="h-4 w-4" />
                    <span>هذا الإشعار غير قابل للإغلاق من العضو.</span>
                  </span>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}