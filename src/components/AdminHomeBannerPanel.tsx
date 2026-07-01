"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { addAdminLog } from "@/lib/adminLogs";
import {
  archiveMemberNotice,
  createMemberNotice,
  deleteMemberNotice,
  getAllMemberNotices,
  getMemberNoticeDisplayModeLabel,
  getMemberNoticeRepeatModeLabel,
  getMemberNoticeTypeLabel,
  type MemberNotice,
  type MemberNoticeDisplayMode,
  type MemberNoticeRepeatMode,
  type MemberNoticeType,
  updateMemberNotice,
} from "@/lib/memberNotices";

type NoticeFormState = {
  title: string;
  shortDescription: string;
  body: string;

  type: MemberNoticeType;
  displayMode: MemberNoticeDisplayMode;

  imageUrl: string;

  primaryButtonText: string;
  primaryButtonUrl: string;

  secondaryButtonText: string;
  secondaryButtonUrl: string;

  isActive: boolean;
  isArchived: boolean;
  isDismissible: boolean;

  priority: number;

  startAt: string;
  endAt: string;

  repeatMode: MemberNoticeRepeatMode;
};

const emptyForm: NoticeFormState = {
  title: "",
  shortDescription: "",
  body: "",

  type: "general",
  displayMode: "modal",

  imageUrl: "",

  primaryButtonText: "",
  primaryButtonUrl: "",

  secondaryButtonText: "",
  secondaryButtonUrl: "",

  isActive: true,
  isArchived: false,
  isDismissible: true,

  priority: 100,

  startAt: getDefaultStartAt(),
  endAt: getDefaultEndAt(),

  repeatMode: "once",
};

function getDefaultStartAt() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 5);
  return toDateTimeLocalInput(date);
}

function getDefaultEndAt() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return toDateTimeLocalInput(date);
}

function toDateTimeLocalInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toFormDateTime(value: string) {
  if (!value) return "";

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return toDateTimeLocalInput(date);
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ar-SA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNoticeStatusLabel(notice: MemberNotice) {
  const now = Date.now();
  const startTime = new Date(notice.startAt).getTime();
  const endTime = new Date(notice.endAt).getTime();

  if (notice.isArchived) return "مؤرشف";
  if (!notice.isActive) return "غير مفعل";
  if (Number.isFinite(startTime) && now < startTime) return "مجدول";
  if (Number.isFinite(endTime) && now > endTime) return "منتهي";

  return "نشط";
}

function getNoticeStatusClass(notice: MemberNotice) {
  const status = getNoticeStatusLabel(notice);

  if (status === "نشط") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  }

  if (status === "مجدول") {
    return "border-blue-400/30 bg-blue-400/10 text-blue-100";
  }

  if (status === "منتهي") {
    return "border-red-400/30 bg-red-500/10 text-red-100";
  }

  if (status === "مؤرشف") {
    return "border-slate-400/30 bg-slate-500/10 text-slate-200";
  }

  return "border-amber-400/30 bg-amber-400/10 text-amber-100";
}

export default function AdminHomeBannerPanel() {
  const [notices, setNotices] = useState<MemberNotice[]>([]);
  const [form, setForm] = useState<NoticeFormState>(emptyForm);
  const [editingNoticeId, setEditingNoticeId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const editingNotice = useMemo(() => {
    return notices.find((notice) => notice.id === editingNoticeId) || null;
  }, [notices, editingNoticeId]);

  async function loadNotices() {
    try {
      setLoading(true);
      setError("");

      const data = await getAllMemberNotices();
      setNotices(data);
    } catch (err) {
      console.error("Load member notices error:", err);
      setError("تعذر تحميل إشعارات الأعضاء");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotices();
  }, []);

  function resetForm() {
    setEditingNoticeId("");
    setForm({
      ...emptyForm,
      startAt: getDefaultStartAt(),
      endAt: getDefaultEndAt(),
    });
    setMessage("");
    setError("");
  }

  function fillFormForEdit(notice: MemberNotice) {
    setEditingNoticeId(notice.id);
    setForm({
      title: notice.title,
      shortDescription: notice.shortDescription,
      body: notice.body,

      type: notice.type,
      displayMode: notice.displayMode,

      imageUrl: notice.imageUrl,

      primaryButtonText: notice.primaryButtonText,
      primaryButtonUrl: notice.primaryButtonUrl,

      secondaryButtonText: notice.secondaryButtonText,
      secondaryButtonUrl: notice.secondaryButtonUrl,

      isActive: notice.isActive,
      isArchived: notice.isArchived,
      isDismissible: notice.isDismissible,

      priority: notice.priority,

      startAt: toFormDateTime(notice.startAt),
      endAt: toFormDateTime(notice.endAt),

      repeatMode: notice.repeatMode,
    });

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    try {
      setSaving(true);

      if (editingNoticeId) {
        const updated = await updateMemberNotice({
          id: editingNoticeId,
          ...form,
        });

        await addAdminLog({
          action: "other",
          title: "تعديل إشعار عضو",
          description: `تم تعديل الإشعار: ${updated.title}`,
          metadata: {
            noticeId: updated.id,
            type: updated.type,
            displayMode: updated.displayMode,
            repeatMode: updated.repeatMode,
          },
        });

        setMessage("تم تعديل الإشعار بنجاح ✅");
      } else {
        const created = await createMemberNotice(form);

        await addAdminLog({
          action: "other",
          title: "إنشاء إشعار عضو",
          description: `تم إنشاء الإشعار: ${created.title}`,
          metadata: {
            noticeId: created.id,
            type: created.type,
            displayMode: created.displayMode,
            repeatMode: created.repeatMode,
          },
        });

        setMessage("تم إنشاء الإشعار بنجاح ✅");
      }

      resetForm();
      await loadNotices();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "تعذر حفظ الإشعار";

      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(notice: MemberNotice) {
    setMessage("");
    setError("");

    try {
      await archiveMemberNotice(notice.id, !notice.isArchived);

      await addAdminLog({
        action: "other",
        title: notice.isArchived ? "إلغاء أرشفة إشعار" : "أرشفة إشعار",
        description: notice.isArchived
          ? `تم إلغاء أرشفة الإشعار: ${notice.title}`
          : `تم أرشفة الإشعار: ${notice.title}`,
        metadata: {
          noticeId: notice.id,
          isArchived: !notice.isArchived,
        },
      });

      setMessage(
        notice.isArchived
          ? "تم إلغاء أرشفة الإشعار ✅"
          : "تم أرشفة الإشعار ✅"
      );

      await loadNotices();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "تعذر تحديث حالة الأرشفة";

      setError(errorMessage);
    }
  }

  async function handleDelete(notice: MemberNotice) {
    setMessage("");
    setError("");

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الإشعار؟\n\n${notice.title}\n\nالحذف نهائي ولا يمكن التراجع عنه.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(notice.id);

      await deleteMemberNotice(notice.id);

      await addAdminLog({
        action: "other",
        title: "حذف إشعار عضو",
        description: `تم حذف الإشعار: ${notice.title}`,
        metadata: {
          noticeId: notice.id,
        },
      });

      if (editingNoticeId === notice.id) {
        resetForm();
      }

      setMessage("تم حذف الإشعار بنجاح ✅");

      await loadNotices();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "تعذر حذف الإشعار";

      setError(errorMessage);
    } finally {
      setDeletingId("");
    }
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/10 p-5 text-center text-slate-300 shadow-2xl">
        جاري تحميل إشعارات الأعضاء...
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-black">🔔 إشعارات الأعضاء</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            أنشئ إشعارات احترافية تظهر للأعضاء داخل الصفحة الرئيسية حسب النوع،
            الأولوية، الفترة الزمنية، وطريقة التكرار.
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
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
                {error}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {editingNotice && (
            <div className="rounded-2xl border border-blue-400/30 bg-blue-400/10 p-3 text-sm leading-6 text-blue-100">
              أنت الآن تعدل الإشعار:{" "}
              <strong>{editingNotice.title}</strong>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">
                عنوان الإشعار
              </span>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                maxLength={80}
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-amber-400"
                placeholder="مثال: تحديث مهم في نظام التوقعات"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold">الأولوية</span>
              <input
                type="number"
                min={0}
                max={999}
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: Number(event.target.value),
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-amber-400"
              />
              <p className="mt-1 text-xs text-slate-300">
                الرقم الأعلى يظهر أولًا.
              </p>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold">
              الوصف المختصر
            </span>
            <textarea
              value={form.shortDescription}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  shortDescription: event.target.value,
                }))
              }
              maxLength={180}
              rows={2}
              className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm leading-7 text-slate-950 outline-none focus:border-amber-400"
              placeholder="وصف قصير يظهر في البانر أو بداية الإشعار"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold">النص الكامل</span>
            <textarea
              value={form.body}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  body: event.target.value,
                }))
              }
              maxLength={1500}
              rows={6}
              className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm leading-7 text-slate-950 outline-none focus:border-amber-400"
              placeholder="اكتب نص الإشعار الكامل هنا..."
            />
          </label>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">
                نوع الإشعار
              </span>
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value as MemberNoticeType,
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-amber-400"
              >
                <option value="update">تحديث</option>
                <option value="alert">تنبيه</option>
                <option value="announcement">إعلان</option>
                <option value="contest">مسابقة</option>
                <option value="congrats">تهنئة</option>
                <option value="general">عام</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold">
                طريقة العرض
              </span>
              <select
                value={form.displayMode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    displayMode: event.target.value as MemberNoticeDisplayMode,
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-amber-400"
              >
                <option value="modal">نافذة منبثقة</option>
                <option value="banner">بانر أعلى الصفحة</option>
                <option value="card">بطاقة داخل الصفحة</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold">
                طريقة التكرار
              </span>
              <select
                value={form.repeatMode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    repeatMode: event.target.value as MemberNoticeRepeatMode,
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-amber-400"
              >
                <option value="once">مرة واحدة فقط</option>
                <option value="everyLogin">كل دخول</option>
                <option value="daily">مرة يوميًا</option>
                <option value="every6Hours">كل 6 ساعات</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold">
              رابط صورة اختياري
            </span>
            <input
              type="url"
              value={form.imageUrl}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  imageUrl: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-amber-400"
              placeholder="https://example.com/image.jpg"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">
                نص الزر الرئيسي — اختياري
              </span>
              <input
                value={form.primaryButtonText}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    primaryButtonText: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-amber-400"
                placeholder="مثال: شاهد التفاصيل"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold">
                رابط الزر الرئيسي
              </span>
              <input
                type="url"
                value={form.primaryButtonUrl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    primaryButtonUrl: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-amber-400"
                placeholder="https://example.com"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">
                نص الزر الثانوي — اختياري
              </span>
              <input
                value={form.secondaryButtonText}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    secondaryButtonText: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-amber-400"
                placeholder="مثال: لاحقًا"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold">
                رابط الزر الثانوي
              </span>
              <input
                type="url"
                value={form.secondaryButtonUrl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    secondaryButtonUrl: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-amber-400"
                placeholder="https://example.com"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">
                تاريخ ووقت البداية
              </span>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startAt: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-amber-400"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold">
                تاريخ ووقت النهاية
              </span>
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    endAt: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-amber-400"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
              <span className="font-black">تفعيل الإشعار</span>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
                className="h-5 w-5"
              />
            </label>

            <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
              <span className="font-black">قابل للإغلاق</span>
              <input
                type="checkbox"
                checked={form.isDismissible}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isDismissible: event.target.checked,
                  }))
                }
                className="h-5 w-5"
              />
            </label>

            <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
              <span className="font-black">مؤرشف</span>
              <input
                type="checkbox"
                checked={form.isArchived}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isArchived: event.target.checked,
                  }))
                }
                className="h-5 w-5"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "جاري الحفظ..."
                : editingNoticeId
                ? "حفظ تعديل الإشعار"
                : "إنشاء الإشعار"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              تفريغ النموذج
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-black md:text-2xl">
              قائمة الإشعارات
            </h3>
            <p className="mt-1 text-sm text-slate-300">
              إجمالي الإشعارات: {notices.length}
            </p>
          </div>

          <button
            type="button"
            onClick={loadNotices}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10"
          >
            تحديث القائمة
          </button>
        </div>

        {notices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-6 text-center text-sm text-slate-300">
            لا توجد إشعارات حتى الآن.
          </div>
        ) : (
          <div className="space-y-3">
            {notices.map((notice) => (
              <article
                key={notice.id}
                className="rounded-3xl border border-white/10 bg-slate-950/60 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-black ${getNoticeStatusClass(
                          notice
                        )}`}
                      >
                        {getNoticeStatusLabel(notice)}
                      </span>

                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black text-slate-200">
                        {getMemberNoticeTypeLabel(notice.type)}
                      </span>

                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black text-slate-200">
                        {getMemberNoticeDisplayModeLabel(notice.displayMode)}
                      </span>

                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black text-slate-200">
                        {getMemberNoticeRepeatModeLabel(notice.repeatMode)}
                      </span>

                      <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] font-black text-amber-100">
                        أولوية {notice.priority}
                      </span>
                    </div>

                    <h4 className="text-lg font-black text-white">
                      {notice.title}
                    </h4>

                    <p className="mt-2 text-sm leading-7 text-slate-300">
                      {notice.shortDescription}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300 md:grid-cols-4">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <div className="font-black text-white">
                          {notice.stats.views}
                        </div>
                        <div className="mt-1">مشاهدة</div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <div className="font-black text-white">
                          {notice.stats.closes}
                        </div>
                        <div className="mt-1">إغلاق</div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <div className="font-black text-white">
                          {notice.stats.primaryClicks}
                        </div>
                        <div className="mt-1">زر رئيسي</div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <div className="font-black text-white">
                          {notice.stats.secondaryClicks}
                        </div>
                        <div className="mt-1">زر ثانوي</div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs leading-6 text-slate-300 md:grid-cols-2">
                      <div>البداية: {formatDate(notice.startAt)}</div>
                      <div>النهاية: {formatDate(notice.endAt)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:w-60 lg:grid-cols-1">
                    <button
                      type="button"
                      onClick={() => fillFormForEdit(notice)}
                      className="rounded-2xl bg-blue-500 px-4 py-2 text-sm font-black text-white hover:bg-blue-400"
                    >
                      تعديل
                    </button>

                    <button
                      type="button"
                      onClick={() => handleArchive(notice)}
                      className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-black text-amber-100 hover:bg-amber-400/20"
                    >
                      {notice.isArchived ? "إلغاء الأرشفة" : "أرشفة"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(notice)}
                      disabled={deletingId === notice.id}
                      className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-100 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === notice.id ? "جاري الحذف..." : "حذف"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}