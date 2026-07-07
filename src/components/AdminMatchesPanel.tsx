"use client";

import { FormEvent, useMemo, useState } from "react";
import type { Match, MatchStage, PredictionType } from "@/lib/matches";
import { deleteAdminMatch, updateAdminMatch } from "@/lib/adminMatches";
import { addAdminLog } from "@/lib/adminLogs";
import { deleteTestMatch } from "@/lib/deleteTestMatch";

type AdminMatchesPanelProps = {
  matches: Match[];
  loading: boolean;
  onChanged?: () => Promise<void> | void;
};

const MATCHES_PER_PAGE = 12;

type MatchFilter = "all" | "scheduled" | "hidden";

function normalizePredictionType(value?: PredictionType): PredictionType {
  return value === "golden" ? "golden" : "normal";
}

function normalizeMatchStage(value?: MatchStage): MatchStage {
  return value === "knockout" ? "knockout" : "group";
}

function getPredictionTypeLabel(type?: PredictionType) {
  return type === "golden" ? "توقع سوبر ذهبي" : "توقع عادي";
}

function getMatchStageLabel(stage?: MatchStage) {
  return stage === "knockout" ? "خروج مغلوب" : "دور المجموعات";
}

function getPredictionTypeHint(type?: PredictionType) {
  return type === "golden"
    ? "بالملي +10 | الفائز الصحيح +4 | المتأهل +6 | الطريقة +4 | الخطأ 0"
    : "بالملي +3 | الفائز الصحيح +1 | الخطأ 0";
}

function getMatchStageHint(stage?: MatchStage) {
  return stage === "knockout"
    ? "عند تعادل التوقع يظهر اختيار المتأهل وطريقة التأهل."
    : "توقع نتيجة المباراة فقط بدون اختيارات تأهل.";
}

function getPredictionTypeBadgeClass(type?: PredictionType) {
  return type === "golden"
    ? "rounded-full border border-fuchsia-300/40 bg-gradient-to-r from-amber-300 via-yellow-300 to-fuchsia-400 px-3 py-1 text-slate-950 shadow-lg shadow-fuchsia-950/20"
    : "rounded-full bg-white/10 px-3 py-1 text-slate-300";
}

function getMatchStageBadgeClass(stage?: MatchStage) {
  return stage === "knockout"
    ? "rounded-full bg-blue-400 px-3 py-1 text-slate-950"
    : "rounded-full bg-white/10 px-3 py-1 text-slate-300";
}

function isMatchCalculated(match: Match) {
  return Boolean(match.resultCalculated || match.status === "finished");
}

export default function AdminMatchesPanel({
  matches,
  loading,
  onChanged,
}: AdminMatchesPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<MatchFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [editingMatchId, setEditingMatchId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPredictionType, setEditPredictionType] =
    useState<PredictionType>("normal");
  const [editMatchStage, setEditMatchStage] = useState<MatchStage>("group");

  const [savingMatchId, setSavingMatchId] = useState("");
  const [deletingMatchId, setDeletingMatchId] = useState("");
  const [deletingTestMatchId, setDeletingTestMatchId] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredMatches = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return matches.filter((match) => {
      const predictionTypeLabel = getPredictionTypeLabel(
        match.predictionType
      ).toLowerCase();

      const matchStageLabel = getMatchStageLabel(match.matchStage).toLowerCase();

      const matchesSearch =
        !search ||
        match.homeTeamName.toLowerCase().includes(search) ||
        match.awayTeamName.toLowerCase().includes(search) ||
        match.matchDate.toLowerCase().includes(search) ||
        match.matchTime.toLowerCase().includes(search) ||
        predictionTypeLabel.includes(search) ||
        matchStageLabel.includes(search);

      const matchesFilter =
        filter === "all" ||
        (filter === "scheduled" &&
          match.status !== "finished" &&
          match.isActive) ||
        (filter === "hidden" && !match.isActive);

      return matchesSearch && matchesFilter;
    });
  }, [matches, searchTerm, filter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMatches.length / MATCHES_PER_PAGE)
  );

  const visibleMatches = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * MATCHES_PER_PAGE;
    const endIndex = startIndex + MATCHES_PER_PAGE;

    return filteredMatches.slice(startIndex, endIndex);
  }, [filteredMatches, currentPage, totalPages]);

  function changeFilter(nextFilter: MatchFilter) {
    setFilter(nextFilter);
    setCurrentPage(1);
  }

  function handleSearch(value: string) {
    setSearchTerm(value);
    setCurrentPage(1);
  }

  function goPrevious() {
    setCurrentPage((page) => Math.max(1, page - 1));
  }

  function goNext() {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  }

  function startEdit(match: Match) {
    setMessage("");
    setError("");

    setEditingMatchId(match.id);
    setEditDate(match.matchDate);
    setEditTime(match.matchTime);
    setEditIsActive(Boolean(match.isActive));
    setEditPredictionType(normalizePredictionType(match.predictionType));
    setEditMatchStage(normalizeMatchStage(match.matchStage));
  }

  function cancelEdit() {
    setEditingMatchId("");
    setEditDate("");
    setEditTime("");
    setEditIsActive(true);
    setEditPredictionType("normal");
    setEditMatchStage("group");
  }

  async function handleSaveMatch(event: FormEvent, match: Match) {
    event.preventDefault();

    setMessage("");
    setError("");
    setSavingMatchId(match.id);

    const calculated = isMatchCalculated(match);

    try {
      await updateAdminMatch({
        matchId: match.id,
        matchDate: editDate,
        matchTime: editTime,
        isActive: editIsActive,
        predictionType: calculated ? undefined : editPredictionType,
        matchStage: calculated ? undefined : editMatchStage,
      });

      const predictionTypeText = calculated
        ? getPredictionTypeLabel(match.predictionType)
        : getPredictionTypeLabel(editPredictionType);

      const matchStageText = calculated
        ? getMatchStageLabel(match.matchStage)
        : getMatchStageLabel(editMatchStage);

      await addAdminLog({
        action: "other",
        title: "تعديل مباراة",
        description: `تم تعديل مباراة ${match.homeTeamName} ضد ${
          match.awayTeamName
        }. التاريخ الجديد: ${editDate}، الوقت الجديد: ${editTime}، الحالة: ${
          editIsActive ? "مفعلة" : "مخفية"
        }، نوع التوقع: ${predictionTypeText}، نوع المرحلة: ${matchStageText}.`,
      });

      setMessage("تم تعديل المباراة بنجاح ✅");
      cancelEdit();

      if (onChanged) {
        await onChanged();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "تعذر تعديل المباراة";
      setError(errorMessage);
    } finally {
      setSavingMatchId("");
    }
  }

  async function handleToggleMatch(match: Match) {
    setMessage("");
    setError("");
    setSavingMatchId(match.id);

    const nextIsActive = !match.isActive;

    try {
      await updateAdminMatch({
        matchId: match.id,
        matchDate: match.matchDate,
        matchTime: match.matchTime,
        isActive: nextIsActive,
      });

      await addAdminLog({
        action: "other",
        title: nextIsActive ? "تفعيل مباراة" : "إخفاء مباراة",
        description: `تم ${nextIsActive ? "تفعيل" : "إخفاء"} مباراة ${
          match.homeTeamName
        } ضد ${match.awayTeamName}.`,
      });

      setMessage(nextIsActive ? "تم تفعيل المباراة ✅" : "تم إخفاء المباراة ✅");

      if (onChanged) {
        await onChanged();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "تعذر تحديث حالة المباراة";
      setError(errorMessage);
    } finally {
      setSavingMatchId("");
    }
  }

  async function handleDeleteMatch(match: Match) {
    setMessage("");
    setError("");

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف مباراة ${match.homeTeamName} ضد ${match.awayTeamName}؟\n\nملاحظة: لا يمكن حذف مباراة محتسبة أو عليها توقعات.`
    );

    if (!confirmed) return;

    setDeletingMatchId(match.id);

    try {
      await deleteAdminMatch(match);

      await addAdminLog({
        action: "other",
        title: "حذف مباراة",
        description: `تم حذف مباراة ${match.homeTeamName} ضد ${match.awayTeamName} بتاريخ ${match.matchDate} الساعة ${match.matchTime}.`,
      });

      setMessage("تم حذف المباراة بنجاح ✅");

      if (onChanged) {
        await onChanged();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "تعذر حذف المباراة";
      setError(errorMessage);
    } finally {
      setDeletingMatchId("");
    }
  }

  async function handleDeleteTestMatch(match: Match) {
    setMessage("");
    setError("");

    if (match.isActive) {
      setError("لا يمكن حذف مباراة اختبار إلا بعد إخفائها أولًا.");
      return;
    }

    const confirmed = window.confirm(
      `تنبيه مهم جدًا:\n\nسيتم حذف مباراة ${match.homeTeamName} ضد ${match.awayTeamName} وكل التوقعات المرتبطة بها، ثم إعادة بناء نقاط الأعضاء ولوحة الصدارة.\n\nاستخدم هذا الخيار لمباريات الاختبار فقط.\n\nهل تريد المتابعة؟`
    );

    if (!confirmed) return;

    const typedConfirm = window.prompt(
      "للتأكيد اكتب بالضبط:\nحذف مباراة اختبار"
    );

    if (typedConfirm !== "حذف مباراة اختبار") {
      setError("تم إلغاء العملية لأن عبارة التأكيد غير صحيحة.");
      return;
    }

    setDeletingTestMatchId(match.id);

    try {
      const result = await deleteTestMatch(match.id);

      await addAdminLog({
        action: "other",
        title: "حذف مباراة اختبار",
        description: `تم حذف مباراة اختبار ${match.homeTeamName} ضد ${match.awayTeamName} وتنظيف الإحصائيات. التوقعات المحذوفة: ${result.deletedPredictionsCount}.`,
      });

      setMessage(
        `تم حذف مباراة الاختبار بنجاح ✅ التوقعات المحذوفة: ${result.deletedPredictionsCount} — الأعضاء المعاد حسابهم: ${result.rebuiltUsersCount}`
      );

      if (onChanged) {
        await onChanged();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "تعذر حذف مباراة الاختبار";
      setError(errorMessage);
    } finally {
      setDeletingTestMatchId("");
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-6">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black">المباريات المضافة</h2>
          <p className="mt-2 text-sm text-slate-300">
            عرض وتعديل وإخفاء المباريات مع البحث والفلترة.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
          العدد:{" "}
          <span className="font-black text-amber-300">
            {filteredMatches.length}
          </span>
        </div>
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

      <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
        <div>
          <label className="mb-2 block text-sm font-bold">
            بحث في المباريات
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => handleSearch(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:border-amber-400"
            placeholder="ابحث باسم المنتخب أو التاريخ أو الوقت أو نوع التوقع أو المرحلة"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold">فلترة</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => changeFilter("all")}
              className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                filter === "all"
                  ? "bg-amber-400 text-slate-950"
                  : "border border-white/10 bg-slate-950/60 text-white hover:bg-white/10"
              }`}
            >
              الكل
            </button>

            <button
              type="button"
              onClick={() => changeFilter("scheduled")}
              className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                filter === "scheduled"
                  ? "bg-blue-400 text-slate-950"
                  : "border border-white/10 bg-slate-950/60 text-white hover:bg-white/10"
              }`}
            >
              القادمة
            </button>

            <button
              type="button"
              onClick={() => changeFilter("hidden")}
              className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                filter === "hidden"
                  ? "bg-red-400 text-slate-950"
                  : "border border-white/10 bg-slate-950/60 text-white hover:bg-white/10"
              }`}
            >
              المخفية
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-slate-300">
          جاري تحميل المباريات...
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-slate-300">
          لا توجد مباريات مطابقة للبحث أو الفلترة.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleMatches.map((match) => {
              const isEditing = editingMatchId === match.id;
              const isCalculated = isMatchCalculated(match);
              const isDeletingTest = deletingTestMatchId === match.id;
              const predictionType = normalizePredictionType(
                match.predictionType
              );
              const matchStage = normalizeMatchStage(match.matchStage);

              return (
                <div
                  key={match.id}
                  className={`relative overflow-hidden rounded-2xl border p-4 ${
                    predictionType === "golden"
                      ? "border-fuchsia-300/35 bg-gradient-to-br from-slate-950 via-amber-950/45 to-fuchsia-950/35 shadow-lg shadow-fuchsia-950/20"
                      : "border-white/10 bg-slate-950/70"
                  }`}
                >
                  {predictionType === "golden" && (
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(217,70,239,0.14),transparent_30%)]" />
                  )}

                  <div className="relative mb-3 flex items-center justify-between gap-2 text-xs">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-slate-300">
                      {match.matchDay}
                    </span>

                    <span className="rounded-full bg-white/10 px-3 py-1 text-slate-300">
                      {match.matchDate} • {match.matchTime}
                    </span>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
                    <div className="min-w-0">
                      <div className="text-2xl">{match.homeTeamEmoji}</div>
                      <div className="truncate text-sm font-black">
                        {match.homeTeamName}
                      </div>
                    </div>

                    <div className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-[10px] font-black text-amber-300">
                      VS
                    </div>

                    <div className="min-w-0">
                      <div className="text-2xl">{match.awayTeamEmoji}</div>
                      <div className="truncate text-sm font-black">
                        {match.awayTeamName}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span
                      className={getPredictionTypeBadgeClass(predictionType)}
                    >
                      {getPredictionTypeLabel(predictionType)}
                    </span>

                    <span className={getMatchStageBadgeClass(matchStage)}>
                      {getMatchStageLabel(matchStage)}
                    </span>

                    {match.status === "finished" ? (
                      <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-emerald-300">
                        تم الاحتساب
                      </span>
                    ) : (
                      <span className="rounded-full bg-blue-400/10 px-3 py-1 text-blue-300">
                        قادمة
                      </span>
                    )}

                    {match.resultCalculated && (
                      <span className="rounded-full bg-amber-400/10 px-3 py-1 text-amber-300">
                        النتيجة: {match.actualHomeScore} -{" "}
                        {match.actualAwayScore}
                      </span>
                    )}

                    {!match.isActive && (
                      <span className="rounded-full bg-red-400/10 px-3 py-1 text-red-300">
                        مخفية
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-2">
                    <div
                      className={`rounded-xl border p-3 text-[11px] leading-5 ${
                        predictionType === "golden"
                          ? "border-fuchsia-300/25 bg-fuchsia-400/10 text-amber-100"
                          : "border-white/10 bg-white/5 text-slate-300"
                      }`}
                    >
                      {getPredictionTypeHint(predictionType)}
                    </div>

                    <div className="rounded-xl border border-blue-400/20 bg-blue-400/10 p-3 text-[11px] leading-5 text-blue-100">
                      {getMatchStageHint(matchStage)}
                    </div>
                  </div>

                  {isEditing ? (
                    <form
                      onSubmit={(event) => handleSaveMatch(event, match)}
                      className="mt-4 space-y-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3"
                    >
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-xs font-bold">
                            التاريخ
                          </label>
                          <input
                            type="date"
                            value={editDate}
                            onChange={(event) => setEditDate(event.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white px-3 py-2 text-slate-950 outline-none focus:border-amber-400"
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-bold">
                            الوقت
                          </label>
                          <input
                            type="time"
                            value={editTime}
                            onChange={(event) => setEditTime(event.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white px-3 py-2 text-slate-950 outline-none focus:border-amber-400"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-bold">
                          نوع التوقع
                        </label>
                        <select
                          value={editPredictionType}
                          onChange={(event) =>
                            setEditPredictionType(
                              event.target.value as PredictionType
                            )
                          }
                          disabled={isCalculated}
                          className="w-full rounded-xl border border-white/10 bg-white px-3 py-2 text-slate-950 outline-none focus:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option value="normal">توقع عادي</option>
                          <option value="golden">🚀 توقع سوبر ذهبي</option>
                        </select>

                        <div className="mt-2 rounded-xl border border-white/10 bg-slate-950/60 p-3 text-[11px] leading-5 text-slate-200">
                          {getPredictionTypeHint(editPredictionType)}
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-bold">
                          نوع المرحلة
                        </label>
                        <select
                          value={editMatchStage}
                          onChange={(event) =>
                            setEditMatchStage(
                              event.target.value as MatchStage
                            )
                          }
                          disabled={isCalculated}
                          className="w-full rounded-xl border border-white/10 bg-white px-3 py-2 text-slate-950 outline-none focus:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option value="group">دور المجموعات</option>
                          <option value="knockout">خروج مغلوب</option>
                        </select>

                        <div className="mt-2 rounded-xl border border-blue-400/20 bg-blue-400/10 p-3 text-[11px] leading-5 text-blue-100">
                          {getMatchStageHint(editMatchStage)}
                        </div>

                        {isCalculated && (
                          <div className="mt-2 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-[11px] leading-5 text-red-100">
                            لا يمكن تغيير نوع التوقع أو نوع المرحلة بعد احتساب
                            المباراة.
                          </div>
                        )}
                      </div>

                      <label className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm">
                        <span className="font-bold">
                          تفعيل المباراة للجمهور
                        </span>

                        <input
                          type="checkbox"
                          checked={editIsActive}
                          onChange={(event) =>
                            setEditIsActive(event.target.checked)
                          }
                          className="h-5 w-5"
                        />
                      </label>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="submit"
                          disabled={savingMatchId === match.id}
                          className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950 hover:bg-amber-300 disabled:opacity-50"
                        >
                          {savingMatchId === match.id
                            ? "جاري الحفظ..."
                            : "حفظ"}
                        </button>

                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/15"
                        >
                          إلغاء
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleMatch(match)}
                        disabled={savingMatchId === match.id}
                        className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-black text-amber-200 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingMatchId === match.id
                          ? "جاري التحديث..."
                          : match.isActive
                          ? "تعطيل"
                          : "تفعيل"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteMatch(match)}
                        disabled={isCalculated || deletingMatchId === match.id}
                        className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {deletingMatchId === match.id ? "جاري الحذف..." : "حذف"}
                      </button>

                      <button
                        type="button"
                        onClick={() => startEdit(match)}
                        className="col-span-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/15"
                      >
                        تعديل المباراة
                      </button>

                      {!match.isActive && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTestMatch(match)}
                          disabled={isDeletingTest}
                          className="col-span-2 rounded-xl border border-red-400/50 bg-red-500/20 px-3 py-2 text-xs font-black text-red-100 hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDeletingTest
                            ? "جاري حذف مباراة الاختبار..."
                            : "🧹 حذف اختبار وتنظيف الإحصائيات"}
                        </button>
                      )}
                    </div>
                  )}

                  {isCalculated && (
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] leading-5 text-slate-300">
                      لا يمكن حذف مباراة محتسبة. للتعديل الجذري استخدم تراجع عن
                      الحسبة أولًا.
                    </div>
                  )}

                  {!match.isActive && (
                    <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-[11px] leading-5 text-red-100">
                      هذه المباراة مخفية. زر حذف الاختبار يحذف المباراة وكل
                      توقعاتها ويعيد بناء الإحصائيات. استخدمه فقط لمباريات
                      التجربة.
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goPrevious}
              disabled={currentPage === 1}
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              السابق
            </button>

            <div className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-xs text-slate-200">
              صفحة {Math.min(currentPage, totalPages)} من {totalPages}
            </div>

            <button
              type="button"
              onClick={goNext}
              disabled={currentPage === totalPages}
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              التالي
            </button>
          </div>
        </>
      )}
    </section>
  );
}