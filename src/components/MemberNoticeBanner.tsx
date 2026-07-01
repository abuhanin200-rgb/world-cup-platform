"use client";

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

function openNoticeUrl(url: string) {
  const cleanUrl = url.trim();

  if (!cleanUrl) return;

  window.open(cleanUrl, "_blank", "noopener,noreferrer");
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
    <section className="mt-4 rounded-3xl border border-amber-400/30 bg-amber-400/10 p-4 shadow-2xl md:mt-5 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {notice.imageUrl && (
          <div className="h-28 w-full overflow-hidden rounded-2xl bg-slate-900 md:h-24 md:w-44 md:shrink-0">
            <img
              src={notice.imageUrl}
              alt={notice.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-2 inline-flex rounded-full border border-amber-300/40 bg-slate-950/40 px-3 py-1 text-[11px] font-black text-amber-100">
            {getMemberNoticeTypeLabel(notice.type)}
          </div>

          <h2 className="text-lg font-black leading-snug text-white md:text-xl">
            {notice.title}
          </h2>

          <p className="mt-2 text-sm leading-7 text-amber-50">
            {notice.shortDescription}
          </p>

          {notice.body && (
            <p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-200 md:text-sm">
              {notice.body}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 md:w-44 md:shrink-0">
          {notice.primaryButtonText && notice.primaryButtonUrl && (
            <button
              type="button"
              onClick={handlePrimaryClick}
              className="rounded-2xl bg-amber-400 px-4 py-3 text-xs font-black text-slate-950 hover:bg-amber-300 md:text-sm"
            >
              {notice.primaryButtonText}
            </button>
          )}

          {notice.secondaryButtonText && notice.secondaryButtonUrl && (
            <button
              type="button"
              onClick={handleSecondaryClick}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black text-white hover:bg-white/10 md:text-sm"
            >
              {notice.secondaryButtonText}
            </button>
          )}

          {notice.isDismissible && (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-xs font-black text-red-100 hover:bg-red-500/20"
            >
              إغلاق
            </button>
          )}
        </div>
      </div>
    </section>
  );
}