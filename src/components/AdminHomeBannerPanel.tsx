"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  clearHomeBanner,
  getHomeBanner,
  HomeBannerSettings,
  updateHomeBanner,
} from "@/lib/homeBanner";
import { addAdminLog } from "@/lib/adminLogs";

export default function AdminHomeBannerPanel() {
  const [banner, setBanner] = useState<HomeBannerSettings>({
    isActive: false,
    imageUrl: "",
    externalUrl: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadBanner() {
    try {
      setLoading(true);
      setError("");

      const data = await getHomeBanner();
      setBanner(data);
    } catch (err) {
      console.error("Load home banner error:", err);
      setError("تعذر تحميل إعدادات البانر");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBanner();
  }, []);

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (banner.isActive && !banner.imageUrl.trim()) {
      setError("لا يمكن تفعيل البانر بدون رابط صورة");
      return;
    }

    try {
      setSaving(true);

      const updated = await updateHomeBanner({
        isActive: banner.isActive,
        imageUrl: banner.imageUrl,
        externalUrl: banner.externalUrl,
      });

      setBanner(updated);

      await addAdminLog({
        action: "other",
        title: "تحديث بانر الصفحة الرئيسية",
        description: updated.isActive
          ? "تم تحديث وتفعيل بانر الصفحة الرئيسية."
          : "تم تحديث بانر الصفحة الرئيسية مع تعطيله.",
        metadata: {
          isActive: updated.isActive,
          imageUrl: updated.imageUrl,
          externalUrl: updated.externalUrl,
        },
      });

      setMessage("تم حفظ إعدادات البانر بنجاح ✅");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "تعذر حفظ إعدادات البانر";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function handleClearBanner() {
    setMessage("");
    setError("");

    const confirmed = window.confirm(
      "هل أنت متأكد من حذف البانر؟ سيتم تعطيله ومسح رابط الصورة والرابط الخارجي."
    );

    if (!confirmed) return;

    try {
      setDeleting(true);

      const cleared = await clearHomeBanner();
      setBanner(cleared);

      await addAdminLog({
        action: "other",
        title: "حذف بانر الصفحة الرئيسية",
        description: "تم حذف وتعطيل بانر الصفحة الرئيسية.",
      });

      setMessage("تم حذف البانر بنجاح ✅");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "تعذر حذف البانر";
      setError(errorMessage);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/10 p-5 text-center text-slate-300 shadow-2xl">
        جاري تحميل إعدادات البانر...
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-6">
      <div className="mb-5">
        <h2 className="text-2xl font-black">🖼️ بانر الصفحة الرئيسية</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          أضف بانر يظهر فوق أفضل 3 منتخبات مرشحة. رابط الصورة مطلوب عند
          التفعيل، والرابط الخارجي اختياري.
        </p>
      </div>

      {(message || error) && (
        <div className="mb-5 space-y-2">
          {message && (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
              {error}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
          <div>
            <div className="font-black">تفعيل البانر</div>
            <div className="mt-1 text-xs text-slate-300">
              إذا كان غير مفعل، لن يظهر أي شيء في الصفحة الرئيسية.
            </div>
          </div>

          <input
            type="checkbox"
            checked={banner.isActive}
            onChange={(event) =>
              setBanner((current) => ({
                ...current,
                isActive: event.target.checked,
              }))
            }
            className="h-5 w-5"
          />
        </label>

        <div>
          <label className="mb-2 block text-sm font-bold">
            رابط صورة البانر
          </label>

          <input
            type="url"
            value={banner.imageUrl}
            onChange={(event) =>
              setBanner((current) => ({
                ...current,
                imageUrl: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:border-amber-400"
            placeholder="https://example.com/banner.jpg"
          />

          <p className="mt-2 text-xs leading-5 text-slate-300">
            المقاس المقترح: 1200×300 أو 1200×350، ويفضل أن يكون حجم الصورة أقل
            من 500KB.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold">
            رابط خارجي عند الضغط على البانر — اختياري
          </label>

          <input
            type="url"
            value={banner.externalUrl}
            onChange={(event) =>
              setBanner((current) => ({
                ...current,
                externalUrl: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:border-amber-400"
            placeholder="https://example.com"
          />
        </div>

        {banner.imageUrl.trim() && (
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-3">
            <div className="mb-2 text-sm font-black">معاينة البانر</div>

            <div className="relative aspect-[4/1] w-full overflow-hidden rounded-2xl bg-slate-900">
              <img
                src={banner.imageUrl}
                alt="معاينة البانر"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            type="submit"
            disabled={saving || deleting}
            className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "جاري الحفظ..." : "حفظ البانر"}
          </button>

          <button
            type="button"
            onClick={handleClearBanner}
            disabled={saving || deleting}
            className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? "جاري الحذف..." : "حذف البانر"}
          </button>
        </div>
      </form>
    </section>
  );
}