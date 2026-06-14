"use client";

import { FormEvent, useMemo, useState } from "react";
import { Match } from "@/lib/matches";
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

  const [savingMatchId, setSavingMatchId] = useState("");
  const [deletingMatchId, setDeletingMatchId] = useState("");
  const [deletingTestMatchId, setDeletingTestMatchId] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredMatches = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return matches.filter((match) => {
      const matchesSearch =
        !search ||
        match.homeTeamName.toLowerCase().includes(search) ||
        match.awayTeamName.toLowerCase().includes(search) ||
        match.matchDate.toLowerCase().includes(search) ||
        match.matchTime.toLowerCase().includes(search);

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
  }

  function cancelEdit() {
    setEditingMatchId("");
    setEditDate("");
    setEditTime("");
    setEditIsActive(true);
  }

  async function handleSaveMatch(event: FormEvent, match: Match) {
    event.preventDefault();

    setMessage("");
    setError("");
    setSavingMatchId(match.id);

    try {
      await updateAdminMatch({
        matchId: match.id,
        matchDate: editDate,
        matchTime: editTime,
        isActive: editIsActive,
      });

      await addAdminLog({
        action: "other",
        title: "تعديل مباراة",
        description: `تم تعديل مباراة ${match.homeTeamName} ضد ${
          match.awayTeamName
        }. التاريخ الجديد: ${editDate}، الوقت الجديد: ${editTime}، الحالة: ${
          editIsActive ? "مفعلة" : "مخفية"
        }.`,
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
            placeholder="ابحث باسم المنتخب أو التاريخ أو الوقت"
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
              const isCalculated =
                match.resultCalculated || match.status === "finished";
              const isDeletingTest = deletingTestMatchId === match.id;

              return (
                <div
                  key={match.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-2 text-xs">
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
                        تعديل التاريخ والوقت
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