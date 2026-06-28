"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { markUserNoticeSeen } from "@/lib/users";

export default function PredictionEditNotice() {
  const { user, loading, refreshUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading || !user) {
      setOpen(false);
      return;
    }

    setOpen(!user.seenNotices?.predictionEditWindowV1);
  }, [loading, user]);

  async function handleClose() {
    if (!user?.id) return;

    try {
      setSaving(true);
      await markUserNoticeSeen(user.id, "predictionEditWindowV1");
      await refreshUser();
      setOpen(false);
    } catch (error) {
      console.error("Prediction edit notice error:", error);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-amber-300/30 bg-slate-950 p-5 text-white shadow-2xl">
        <div className="mb-4 rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-center">
          <h2 className="text-xl font-black text-amber-100">
            تحديث جديد في نظام التوقعات
          </h2>
        </div>

        <div className="space-y-4 text-sm font-bold leading-7 text-slate-200 md:text-base">
          <p>تمت إضافة خاصية تعديل التوقع بعد الحفظ.</p>

          <p>
            يمكنك الآن تعديل توقعك خلال أول 5 دقائق فقط من وقت اعتماده.
          </p>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 font-black text-amber-100">الشروط:</div>
            <ul className="space-y-2">
              <li>- التعديل متاح لمدة 5 دقائق من وقت حفظ التوقع.</li>
              <li>
                - إذا بدأت المباراة قبل انتهاء الخمس دقائق، يتم إغلاق التعديل
                مباشرة.
              </li>
              <li>- بعد انتهاء المدة لا يمكن تعديل التوقع.</li>
              <li>
                - تعديل التوقع يستبدل التوقع السابق ولا يضيف توقعًا جديدًا.
              </li>
            </ul>
          </div>

          <p>
            الهدف من الخاصية هو تصحيح أخطاء التوقع السريعة فقط، مع الحفاظ على عدالة
            التحدي للجميع.
          </p>

          <p className="font-black text-emerald-200">منافسة ممتعة للجميع</p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleClose}
          className="mt-5 w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "جاري الحفظ..." : "تم، فهمت"}
        </button>
      </div>
    </div>
  );
}
