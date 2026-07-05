"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  getVisibleMemberNoticesForUser,
  markMemberNoticeShown,
  type MemberNotice,
} from "@/lib/memberNotices";
import MemberNoticeModal from "@/components/MemberNoticeModal";
import MemberNoticeBanner from "@/components/MemberNoticeBanner";
import MemberNoticeCard from "@/components/MemberNoticeCard";

type MemberNoticeRendererProps = {
  userId?: string;
};

const bannerMotion: Variants = {
  hidden: {
    opacity: 0,
    y: -16,
    scale: 0.98,
    filter: "blur(6px)",
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.38,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.98,
    filter: "blur(6px)",
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

const cardMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
    scale: 0.96,
    filter: "blur(8px)",
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.42,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: 18,
    scale: 0.97,
    filter: "blur(8px)",
    transition: {
      duration: 0.22,
      ease: "easeIn",
    },
  },
};

const modalMotion: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.94,
    filter: "blur(8px)",
  },
  show: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    filter: "blur(8px)",
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

export default function MemberNoticeRenderer({
  userId,
}: MemberNoticeRendererProps) {
  const [notices, setNotices] = useState<MemberNotice[]>([]);
  const [hiddenNoticeIds, setHiddenNoticeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const visibleNotices = useMemo(() => {
    return notices.filter((notice) => !hiddenNoticeIds.includes(notice.id));
  }, [notices, hiddenNoticeIds]);

  const modalNotice = useMemo(() => {
    return (
      visibleNotices.find((notice) => notice.displayMode === "modal") || null
    );
  }, [visibleNotices]);

  const bannerNotices = useMemo(() => {
    return visibleNotices.filter((notice) => notice.displayMode === "banner");
  }, [visibleNotices]);

  const cardNotices = useMemo(() => {
    return visibleNotices.filter((notice) => notice.displayMode === "card");
  }, [visibleNotices]);

  useEffect(() => {
    let isMounted = true;

    async function loadNotices() {
      if (!userId) {
        setNotices([]);
        return;
      }

      try {
        setLoading(true);

        const data = await getVisibleMemberNoticesForUser(userId);

        if (!isMounted) return;

        setNotices(data);

        await Promise.all(
          data.map((notice) => markMemberNoticeShown(notice.id, userId))
        );
      } catch (error) {
        console.error("Load member notices error:", error);

        if (isMounted) {
          setNotices([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadNotices();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  function hideNotice(noticeId: string) {
    setHiddenNoticeIds((current) => {
      if (current.includes(noticeId)) return current;
      return [...current, noticeId];
    });
  }

  if (!userId || loading || visibleNotices.length === 0) {
    return null;
  }

  return (
    <>
      <AnimatePresence mode="popLayout">
        {modalNotice && (
          <motion.div
            key={modalNotice.id}
            variants={modalMotion}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <MemberNoticeModal
              notice={modalNotice}
              userId={userId}
              onClose={() => hideNotice(modalNotice.id)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {bannerNotices.map((notice) => (
          <motion.div
            key={notice.id}
            variants={bannerMotion}
            initial="hidden"
            animate="show"
            exit="exit"
            layout
          >
            <MemberNoticeBanner
              notice={notice}
              userId={userId}
              onClose={() => hideNotice(notice.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {cardNotices.map((notice) => (
          <motion.div
            key={notice.id}
            variants={cardMotion}
            initial="hidden"
            whileInView="show"
            exit="exit"
            viewport={{ once: false, amount: 0.25 }}
            whileTap={{ scale: 0.985 }}
            layout
          >
            <MemberNoticeCard
              notice={notice}
              userId={userId}
              onClose={() => hideNotice(notice.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </>
  );
}