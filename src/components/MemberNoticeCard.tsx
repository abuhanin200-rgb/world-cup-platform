"use client";

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

function openNoticeUrl(url: string) {
  const cleanUrl = url.trim();

  if (!cleanUrl) return;

  window.open(cleanUrl, "_blank", "noopener,noreferrer");
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
    <section className="mt-4 rounded-3xl border border-cyan-400/25 bg-cyan-400/10 p-4 shadow-2xl md:mt-5 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row">
        {notice.imageUrl && (
          <div className="h-40 w-full overflow-hidden rounded-2xl bg-slate-900 lg:h-auto lg:w-64 lg:shrink-0">
            <img
              src={notice.imageUrl}
              alt={notice.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-3 inline-flex rounded-full border border-cyan-300/40 bg-slate-950/40 px-3 py-1 text-[11px] font-black text-cyan-100">
            {getMemberNoticeTypeLabel(notice.type)}
          </div>

          <h2 className="text-xl font-black leading-snug text-white md:text-2xl">
            {notice.title}
          </h2>

          <p className="mt-3 text-sm leading-7 text-cyan-50 md:text-base">
            {notice.shortDescription}
          </p>

          <div className="mt-4 whitespace-pre-line rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm leading-8 text-slate-100">
            {notice.body}
          </div>

          {(notice.primaryButtonText ||
            notice.secondaryButtonText ||
            notice.isDismissible) && (
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              {notice.primaryButtonText && notice.primaryButtonUrl && (
                <button
                  type="button"
                  onClick={handlePrimaryClick}
                  className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-200"
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

              {notice.isDismissible && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100 hover:bg-red-500/20"
                >
                  إغلاق الإشعار
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}