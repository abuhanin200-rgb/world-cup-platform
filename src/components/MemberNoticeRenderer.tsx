"use client";

import { useEffect, useMemo, useState } from "react";
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
    return visibleNotices.find((notice) => notice.displayMode === "modal") || null;
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
      {modalNotice && (
        <MemberNoticeModal
          notice={modalNotice}
          userId={userId}
          onClose={() => hideNotice(modalNotice.id)}
        />
      )}

      {bannerNotices.map((notice) => (
        <MemberNoticeBanner
          key={notice.id}
          notice={notice}
          userId={userId}
          onClose={() => hideNotice(notice.id)}
        />
      ))}

      {cardNotices.map((notice) => (
        <MemberNoticeCard
          key={notice.id}
          notice={notice}
          userId={userId}
          onClose={() => hideNotice(notice.id)}
        />
      ))}
    </>
  );
}