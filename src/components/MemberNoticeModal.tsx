"use client";

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

function openNoticeUrl(url: string) {
  const cleanUrl = url.trim();

  if (!cleanUrl) return;

  window.open(cleanUrl, "_blank", "noopener,noreferrer");
}

export default function MemberNoticeModal({
  notice,
  userId,
  onClose,
}: MemberNoticeModalProps) {
  async function handleClose() {
    try {
      await markMemberNoticeClosed(notice.id, userId);
    } catch (error) {
      console.error("Close member notice modal error:", error);
    } finally {
      onClose();
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 px-3 py-6 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-950 text-white shadow-2xl">
        {notice.isDismissible && (
          <button
            type="button"
            onClick={handleClose}
            className="absolute left-3 top-3 z-10 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-black text-white hover:bg-white/20"
          >
            إغلاق
          </button>
        )}

        {notice.imageUrl && (
          <div className="h-44 w-full overflow-hidden rounded-t-3xl bg-slate-900 md:h-56">
            <img
              src={notice.imageUrl}
              alt={notice.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="p-5 md:p-6">
          <div className="mb-3 inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-100">
            {getMemberNoticeTypeLabel(notice.type)}
          </div>

          <h2 className="text-2xl font-black leading-snug md:text-3xl">
            {notice.title}
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-200 md:text-base">
            {notice.shortDescription}
          </p>

          <div className="mt-4 whitespace-pre-line rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-8 text-slate-100 md:text-base">
            {notice.body}
          </div>

          {(notice.primaryButtonText || notice.secondaryButtonText) && (
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {notice.primaryButtonText && notice.primaryButtonUrl && (
                <button
                  type="button"
                  onClick={handlePrimaryClick}
                  className="rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300"
                >
                  {notice.primaryButtonText}
                </button>
              )}

              {notice.secondaryButtonText && notice.secondaryButtonUrl && (
                <button
                  type="button"
                  onClick={handleSecondaryClick}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white hover:bg-white/10"
                >
                  {notice.secondaryButtonText}
                </button>
              )}
            </div>
          )}

          {!notice.isDismissible && (
            <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-xs leading-6 text-red-100">
              هذا الإشعار غير قابل للإغلاق من العضو.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}