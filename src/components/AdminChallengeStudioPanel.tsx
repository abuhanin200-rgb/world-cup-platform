"use client";

import { useEffect, useState } from "react";
import {
  addChallengeStudioBulletin,
  deleteChallengeStudioBulletin,
  getChallengeStudioBulletins,
  publishChallengeStudioBulletin,
  unpublishChallengeStudioBulletin,
  updateChallengeStudioBulletin,
  type ChallengeStudioBulletin,
  type ChallengeStudioCard,
  type ChallengeStudioCardType,
} from "@/lib/challengeStudio";
import { generateChallengeStudioBulletinFromEvents } from "@/lib/challengeStudio/bulletinBuilder";
import AdminChallengeStudioViewersPanel from "@/components/AdminChallengeStudioViewersPanel";

type AiGenerateResponse = {
  date: string;
  summary: string;
  cards: ChallengeStudioCard[];
  mentionedMembers?: string[];
  events?: unknown[];
  error?: string;
};

const cardTypes: { value: ChallengeStudioCardType; label: string }[] = [
  { value: "main", label: "خبر رئيسي" },
  { value: "quote", label: "تصريح" },
  { value: "number", label: "رقم" },
  { value: "badge", label: "وسام" },
  { value: "funny", label: "لقطة" },
  { value: "watch", label: "تحت المجهر" },
];

export default function AdminChallengeStudioPanel() {
  const [bulletins, setBulletins] = useState<ChallengeStudioBulletin[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);

  const [editingId, setEditingId] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editCards, setEditCards] = useState<ChallengeStudioCard[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  async function loadBulletins() {
    try {
      setLoading(true);
      const data = await getChallengeStudioBulletins(30);
      setBulletins(data);
    } catch (error) {
      console.error("Load challenge studio bulletins error:", error);
      alert("تعذر تحميل نشرات استوديو التحدي");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBulletins();
  }, []);

  function startEdit(bulletin: ChallengeStudioBulletin) {
    setEditingId(bulletin.id);
    setEditSummary(bulletin.summary);
    setEditCards(
      bulletin.cards.map((card) => ({
        type: card.type,
        icon: card.icon,
        title: card.title,
        content: card.content,
        priority: card.priority,
      }))
    );
  }

  function cancelEdit() {
    setEditingId("");
    setEditSummary("");
    setEditCards([]);
  }

  function updateEditCard(
    index: number,
    field: keyof ChallengeStudioCard,
    value: string
  ) {
    setEditCards((cards) =>
      cards.map((card, cardIndex) => {
        if (cardIndex !== index) return card;

        if (field === "priority") {
          const numberValue = Number(value);
          return {
            ...card,
            priority: Number.isFinite(numberValue) ? numberValue : 0,
          };
        }

        return {
          ...card,
          [field]: value,
        };
      })
    );
  }

  function addEditCard() {
    setEditCards((cards) => [
      ...cards,
      {
        type: "watch",
        icon: "🎙️",
        title: "بطاقة جديدة",
        content: "اكتب نص البطاقة هنا.",
        priority: 40,
      },
    ]);
  }

  function deleteEditCard(index: number) {
    const confirmed = confirm("حذف هذه البطاقة من النشرة؟");
    if (!confirmed) return;

    setEditCards((cards) => cards.filter((_, cardIndex) => cardIndex !== index));
  }

  async function saveEdit() {
    if (!editingId) return;

    if (!editSummary.trim()) {
      alert("اكتب ملخص النشرة");
      return;
    }

    const cleanCards = editCards
      .map((card) => ({
        type: card.type,
        icon: card.icon.trim() || "🎙️",
        title: card.title.trim(),
        content: card.content.trim(),
        priority: Number(card.priority) || 0,
      }))
      .filter((card) => card.title && card.content);

    if (cleanCards.length === 0) {
      alert("لازم تكون فيه بطاقة واحدة على الأقل");
      return;
    }

    try {
      setSavingEdit(true);

      await updateChallengeStudioBulletin(editingId, {
        summary: editSummary.trim(),
        cards: cleanCards,
      });

      alert("تم حفظ تعديلات النشرة");
      cancelEdit();
      await loadBulletins();
    } catch (error) {
      console.error("Save bulletin edit error:", error);
      alert("تعذر حفظ التعديلات");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleGenerateAiBulletin() {
    try {
      setGeneratingAi(true);

      const response = await fetch("/api/challenge-studio/generate", {
        method: "POST",
      });

      const data = (await response.json()) as AiGenerateResponse;

      if (!response.ok) {
        throw new Error(data.error || "تعذر توليد النشرة بالذكاء الاصطناعي");
      }

      await addChallengeStudioBulletin({
        date: data.date,
        summary: data.summary,
        cards: data.cards,
        mentionedMembers: data.mentionedMembers || [],
        published: false,
        generatedByAI: true,
      });

      alert(
        `تم توليد نشرة بالذكاء الاصطناعي ✅\nعدد البطاقات: ${data.cards.length}`
      );

      await loadBulletins();
    } catch (error) {
      console.error("AI generate challenge studio bulletin error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "تعذر توليد النشرة بالذكاء الاصطناعي"
      );
    } finally {
      setGeneratingAi(false);
    }
  }

  async function handleGenerateBulletin() {
    try {
      setGenerating(true);

      const result = await generateChallengeStudioBulletinFromEvents();

      alert(
        `تم توليد النشرة من محرك الأحداث ✅\nعدد الأحداث المكتشفة: ${result.events.length}`
      );

      await loadBulletins();
    } catch (error) {
      console.error("Generate challenge studio bulletin error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "تعذر توليد النشرة من بيانات البطولة"
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handlePublish(id: string) {
    try {
      await publishChallengeStudioBulletin(id);
      await loadBulletins();
    } catch (error) {
      console.error("Publish bulletin error:", error);
      alert("تعذر نشر النشرة");
    }
  }

  async function handleUnpublish(id: string) {
    try {
      await unpublishChallengeStudioBulletin(id);
      await loadBulletins();
    } catch (error) {
      console.error("Unpublish bulletin error:", error);
      alert("تعذر إلغاء نشر النشرة");
    }
  }

  async function handleDelete(id: string) {
    const confirmed = confirm("هل أنت متأكد من حذف هذه النشرة؟");
    if (!confirmed) return;

    try {
      await deleteChallengeStudioBulletin(id);
      await loadBulletins();
    } catch (error) {
      console.error("Delete bulletin error:", error);
      alert("تعذر حذف النشرة");
    }
  }

  return (
    <div className="space-y-5">
      <AdminChallengeStudioViewersPanel />

      <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black md:text-2xl">
              🎙️ استوديو التحدي
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              توليد نشرات مبنية على بيانات البطولة الحقيقية، ثم تعديلها
              ومعاينتها ونشرها.
            </p>
          </div>

          <div className="flex flex-col gap-2 md:flex-row">
            <button
              type="button"
              onClick={handleGenerateAiBulletin}
              disabled={generatingAi || generating || Boolean(editingId)}
              className="rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generatingAi
                ? "جاري كتابة النشرة..."
                : "🤖 توليد بالذكاء الاصطناعي"}
            </button>

            <button
              type="button"
              onClick={handleGenerateBulletin}
              disabled={generating || generatingAi || Boolean(editingId)}
              className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? "جاري تحليل البطولة..." : "⚙️ توليد احتياطي"}
            </button>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-xs font-bold leading-6 text-cyan-100 md:text-sm">
          الآن تقدر تولّد النشرة، تعدّل النصوص والبطاقات قبل النشر، ثم تنشرها
          للأعضاء.
        </div>

        {editingId && (
          <div className="mb-5 rounded-3xl border border-amber-400/30 bg-slate-950/70 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-black">✏️ تعديل النشرة</h3>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-black text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
                >
                  {savingEdit ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>

                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold hover:bg-white/10"
                >
                  إلغاء
                </button>
              </div>
            </div>

            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-bold">ملخص النشرة</span>
              <input
                value={editSummary}
                onChange={(event) => setEditSummary(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-amber-400"
              />
            </label>

            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-black">البطاقات</h4>

              <button
                type="button"
                onClick={addEditCard}
                className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-black text-amber-100 hover:bg-amber-400/20"
              >
                + إضافة بطاقة
              </button>
            </div>

            <div className="space-y-4">
              {editCards.map((card, index) => (
                <div
                  key={`${editingId}-${index}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-300">
                      بطاقة رقم {index + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => deleteEditCard(index)}
                      className="rounded-lg bg-red-500 px-2 py-1 text-[11px] font-black text-white hover:bg-red-400"
                    >
                      حذف
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <label>
                      <span className="mb-1 block text-xs font-bold">
                        النوع
                      </span>
                      <select
                        value={card.type}
                        onChange={(event) =>
                          updateEditCard(
                            index,
                            "type",
                            event.target.value as ChallengeStudioCardType
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs outline-none"
                      >
                        {cardTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span className="mb-1 block text-xs font-bold">
                        الأيقونة
                      </span>
                      <input
                        value={card.icon}
                        onChange={(event) =>
                          updateEditCard(index, "icon", event.target.value)
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs outline-none"
                      />
                    </label>

                    <label>
                      <span className="mb-1 block text-xs font-bold">
                        الأولوية
                      </span>
                      <input
                        type="number"
                        value={card.priority}
                        onChange={(event) =>
                          updateEditCard(index, "priority", event.target.value)
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs outline-none"
                      />
                    </label>

                    <label>
                      <span className="mb-1 block text-xs font-bold">
                        العنوان
                      </span>
                      <input
                        value={card.title}
                        onChange={(event) =>
                          updateEditCard(index, "title", event.target.value)
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs outline-none"
                      />
                    </label>
                  </div>

                  <label className="mt-3 block">
                    <span className="mb-1 block text-xs font-bold">النص</span>
                    <textarea
                      value={card.content}
                      onChange={(event) =>
                        updateEditCard(index, "content", event.target.value)
                      }
                      rows={5}
                      className="w-full resize-y rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs leading-6 outline-none focus:border-amber-400"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
            جاري تحميل النشرات...
          </div>
        ) : bulletins.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
            لا توجد نشرات حتى الآن.
          </div>
        ) : (
          <div className="space-y-4">
            {bulletins.map((bulletin) => (
              <div
                key={bulletin.id}
                className="rounded-3xl border border-white/10 bg-slate-950/50 p-4"
              >
                <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black">
                        {bulletin.summary || "نشرة استوديو التحدي"}
                      </h3>

                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-black ${
                          bulletin.published
                            ? "bg-emerald-400 text-slate-950"
                            : "bg-slate-700 text-slate-200"
                        }`}
                      >
                        {bulletin.published ? "منشورة" : "مسودة"}
                      </span>

                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-slate-300">
                        {bulletin.generatedByAI ? "AI" : "محرك الأحداث"}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-400">
                      {bulletin.date}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(bulletin)}
                      disabled={Boolean(editingId)}
                      className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-black text-amber-100 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      ✏️ تعديل
                    </button>

                    {bulletin.published ? (
                      <button
                        type="button"
                        onClick={() => handleUnpublish(bulletin.id)}
                        disabled={Boolean(editingId)}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold hover:bg-white/10 disabled:opacity-60"
                      >
                        إلغاء النشر
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePublish(bulletin.id)}
                        disabled={Boolean(editingId)}
                        className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-black text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
                      >
                        نشر
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(bulletin.id)}
                      disabled={Boolean(editingId)}
                      className="rounded-xl bg-red-500 px-3 py-2 text-xs font-black text-white hover:bg-red-400 disabled:opacity-60"
                    >
                      حذف
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {bulletin.cards.map((card, index) => (
                    <div
                      key={`${bulletin.id}-${index}`}
                      className={`rounded-2xl border border-white/10 bg-white/5 p-3 ${
                        card.type === "main" ? "md:col-span-2" : ""
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-xl">{card.icon}</span>
                        <span className="text-sm font-black">
                          {card.title}
                        </span>
                      </div>

                      <p className="whitespace-pre-line text-xs leading-6 text-slate-300">
                        {card.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}