"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AdminPrediction,
  UserStatsAuditItem,
  auditUserStats,
  deleteAdminPredictionAndFixUserStats,
  getAdminPredictions,
  getPredictionMatchOptions,
} from "@/lib/adminPredictions";

type PredictionType = "normal" | "golden";

type AdminPredictionWithType = AdminPrediction & {
  predictionType?: PredictionType;
  editedAt?: string | null;
  editCount?: number;
};

type PredictionStatus =
  | "all"
  | "pending"
  | "exact"
  | "winner"
  | "wrong"
  | "edited"
  | "golden"
  | "goldenExact"
  | "goldenWinner";

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Asia/Riyadh",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function getActualResult(prediction: AdminPredictionWithType) {
  if (
    prediction.actualHomeScore === null ||
    prediction.actualHomeScore === undefined ||
    prediction.actualAwayScore === null ||
    prediction.actualAwayScore === undefined
  ) {
    return "—";
  }

  return `${prediction.actualHomeScore} - ${prediction.actualAwayScore}`;
}

function isGoldenPrediction(prediction: AdminPredictionWithType) {
  return prediction.predictionType === "golden";
}

function isExactPrediction(prediction: AdminPredictionWithType) {
  return (
    prediction.isCalculated &&
    (prediction.resultType === "exact" ||
      prediction.points === 3 ||
      prediction.points === 6)
  );
}

function isWinnerPrediction(prediction: AdminPredictionWithType) {
  return (
    prediction.isCalculated &&
    (prediction.resultType === "winner" ||
      prediction.points === 1 ||
      prediction.points === 2)
  );
}

function isWrongPrediction(prediction: AdminPredictionWithType) {
  return prediction.isCalculated && prediction.points === 0;
}

function isEditedPrediction(prediction: AdminPredictionWithType) {
  return Boolean(prediction.editedAt) || Number(prediction.editCount || 0) > 0;
}

function getPredictionResultLabel(prediction: AdminPredictionWithType) {
  const golden = isGoldenPrediction(prediction);

  if (!prediction.isCalculated) return "لم يُحتسب";
  if (isExactPrediction(prediction)) {
    return golden ? "ذهبي بالملي +6" : "بالملي +3";
  }
  if (isWinnerPrediction(prediction)) {
    return golden ? "فائز ذهبي +2" : "الفائز +1";
  }

  return "خطأ +0";
}

function getPredictionResultClass(prediction: AdminPredictionWithType) {
  const golden = isGoldenPrediction(prediction);

  if (!prediction.isCalculated) {
    return golden
      ? "border-amber-300/30 bg-amber-400/10 text-amber-100"
      : "border-slate-400/20 bg-slate-400/10 text-slate-200";
  }

  if (isExactPrediction(prediction)) {
    return golden
      ? "border-amber-300/40 bg-amber-400/15 text-amber-100"
      : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }

  if (isWinnerPrediction(prediction)) {
    return golden
      ? "border-amber-300/40 bg-amber-400/15 text-amber-100"
      : "border-amber-400/30 bg-amber-400/10 text-amber-100";
  }

  return "border-red-400/30 bg-red-400/10 text-red-100";
}

function matchesStatusFilter(
  prediction: AdminPredictionWithType,
  status: PredictionStatus
) {
  const golden = isGoldenPrediction(prediction);

  if (status === "all") return true;
  if (status === "pending") return !prediction.isCalculated;
  if (status === "exact") return isExactPrediction(prediction);
  if (status === "winner") return isWinnerPrediction(prediction);
  if (status === "wrong") return isWrongPrediction(prediction);
  if (status === "edited") return isEditedPrediction(prediction);
  if (status === "golden") return golden;
  if (status === "goldenExact") return golden && isExactPrediction(prediction);
  if (status === "goldenWinner") {
    return golden && isWinnerPrediction(prediction);
  }

  return true;
}

export default function AdminPredictionsPanel() {
  const [predictions, setPredictions] = useState<AdminPredictionWithType[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [auditing, setAuditing] = useState(false);
  const [auditItems, setAuditItems] = useState<UserStatsAuditItem[]>([]);

  const [search, setSearch] = useState("");
  const [matchId, setMatchId] = useState("all");
  const [status, setStatus] = useState<PredictionStatus>("all");
  const [page, setPage] = useState(1);

  const pageSize = 20;

  async function loadPredictions() {
    try {
      setLoading(true);
      const data = await getAdminPredictions();
      setPredictions(data as AdminPredictionWithType[]);
    } catch (error) {
      console.error("Admin predictions error:", error);
      alert("تعذر تحميل توقعات الأعضاء");
    } finally {
      setLoading(false);
    }
  }

  async function handleAuditStats() {
    try {
      setAuditing(true);
      const items = await auditUserStats();
      setAuditItems(items);

      if (items.length === 0) {
        alert("فحص النقاط مكتمل: لا توجد فروقات ✅");
      } else {
        alert(`فحص النقاط مكتمل: يوجد ${items.length} عضو عنده فرق`);
      }
    } catch (error) {
      console.error("Audit stats error:", error);
      alert("تعذر فحص النقاط");
    } finally {
      setAuditing(false);
    }
  }

  async function handleDeletePrediction(prediction: AdminPredictionWithType) {
    const confirmMessage = prediction.isCalculated
      ? `تنبيه مهم:\nسيتم حذف توقع ${prediction.userName} وتصحيح نقاطه تلقائيًا.\n\nالمباراة: ${prediction.homeTeamName} × ${prediction.awayTeamName}\nالتوقع: ${prediction.homeScore} - ${prediction.awayScore}\nالنقاط المحسوبة: ${prediction.points}\n\nهل أنت متأكد؟`
      : `سيتم حذف توقع ${prediction.userName}.\n\nهل أنت متأكد؟`;

    const ok = window.confirm(confirmMessage);
    if (!ok) return;

    try {
      setDeletingId(prediction.id);
      await deleteAdminPredictionAndFixUserStats(prediction.id);
      await loadPredictions();
      setAuditItems([]);
      alert("تم حذف التوقع وتصحيح نقاط العضو");
    } catch (error) {
      console.error("Delete prediction error:", error);
      alert(error instanceof Error ? error.message : "تعذر حذف التوقع");
    } finally {
      setDeletingId("");
    }
  }

  useEffect(() => {
    loadPredictions();
  }, []);

  const matchOptions = useMemo(() => {
    return getPredictionMatchOptions(predictions);
  }, [predictions]);

  const duplicateKeys = useMemo(() => {
    const map = new Map<string, number>();

    predictions.forEach((prediction) => {
      if (!prediction.userId || !prediction.matchId) return;
      const key = `${prediction.userId}_${prediction.matchId}`;
      map.set(key, (map.get(key) || 0) + 1);
    });

    return map;
  }, [predictions]);

  function isDuplicatePrediction(prediction: AdminPredictionWithType) {
    if (!prediction.userId || !prediction.matchId) return false;
    const key = `${prediction.userId}_${prediction.matchId}`;
    return (duplicateKeys.get(key) || 0) > 1;
  }

  const filteredPredictions = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return predictions.filter((prediction) => {
      const predictionTypeText = isGoldenPrediction(prediction)
        ? "ذهبي توقع ذهبي"
        : "";

      const duplicateText = isDuplicatePrediction(prediction) ? "مكرر" : "";
      const editedText = isEditedPrediction(prediction)
        ? "معدل معدلة تم التعديل"
        : "";

      const matchesSearch =
        !searchValue ||
        prediction.userName.toLowerCase().includes(searchValue) ||
        prediction.homeTeamName.toLowerCase().includes(searchValue) ||
        prediction.awayTeamName.toLowerCase().includes(searchValue) ||
        prediction.id.toLowerCase().includes(searchValue) ||
        predictionTypeText.includes(searchValue) ||
        duplicateText.includes(searchValue) ||
        editedText.includes(searchValue);

      const matchesMatch = matchId === "all" || prediction.matchId === matchId;
      const matchesStatus = matchesStatusFilter(prediction, status);

      return matchesSearch && matchesMatch && matchesStatus;
    });
  }, [predictions, search, matchId, status, duplicateKeys]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPredictions.length / pageSize)
  );

  const visiblePredictions = filteredPredictions.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const totalPending = predictions.filter(
    (prediction) => !prediction.isCalculated
  ).length;

  const totalExact = predictions.filter((prediction) =>
    isExactPrediction(prediction)
  ).length;

  const totalWinner = predictions.filter((prediction) =>
    isWinnerPrediction(prediction)
  ).length;

  const totalWrong = predictions.filter((prediction) =>
    isWrongPrediction(prediction)
  ).length;

  const totalGolden = predictions.filter((prediction) =>
    isGoldenPrediction(prediction)
  ).length;

  const totalDuplicates = predictions.filter((prediction) =>
    isDuplicatePrediction(prediction)
  ).length;

  const totalEdited = predictions.filter((prediction) =>
    isEditedPrediction(prediction)
  ).length;

  const totalGoldenExact = predictions.filter((prediction) => {
    return isGoldenPrediction(prediction) && isExactPrediction(prediction);
  }).length;

  const totalGoldenWinner = predictions.filter((prediction) => {
    return isGoldenPrediction(prediction) && isWinnerPrediction(prediction);
  }).length;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black md:text-2xl">🔮 توقعات الأعضاء</h2>
          <p className="mt-1 text-sm text-slate-300">
            جدول مختصر لجميع توقعات الأعضاء حسب المباراة والحالة.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAuditStats}
            disabled={auditing}
            className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {auditing ? "جاري الفحص..." : "فحص النقاط"}
          </button>

          <button
            type="button"
            onClick={loadPredictions}
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-300"
          >
            تحديث البيانات
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-10">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-center">
          <div className="text-[11px] text-slate-400">الإجمالي</div>
          <div className="mt-1 text-2xl font-black">{predictions.length}</div>
        </div>

        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-center">
          <div className="text-[11px] text-red-100">مكرر</div>
          <div className="mt-1 text-2xl font-black text-red-200">
            {totalDuplicates}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-400/30 bg-blue-500/10 p-3 text-center">
          <div className="text-[11px] text-blue-100">معدلة</div>
          <div className="mt-1 text-2xl font-black text-blue-200">
            {totalEdited}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-400/20 bg-slate-400/10 p-3 text-center">
          <div className="text-[11px] text-slate-300">لم تُحتسب</div>
          <div className="mt-1 text-2xl font-black">{totalPending}</div>
        </div>

        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-center">
          <div className="text-[11px] text-emerald-100">بالملي</div>
          <div className="mt-1 text-2xl font-black text-emerald-200">
            {totalExact}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-center">
          <div className="text-[11px] text-amber-100">الفائز</div>
          <div className="mt-1 text-2xl font-black text-amber-200">
            {totalWinner}
          </div>
        </div>

        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-center">
          <div className="text-[11px] text-red-100">خطأ</div>
          <div className="mt-1 text-2xl font-black text-red-200">
            {totalWrong}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-300/30 bg-amber-400/15 p-3 text-center">
          <div className="text-[11px] text-amber-100">ذهبي</div>
          <div className="mt-1 text-2xl font-black text-amber-200">
            {totalGolden}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-300/30 bg-amber-400/15 p-3 text-center">
          <div className="text-[11px] text-amber-100">ذهبي بالملي</div>
          <div className="mt-1 text-2xl font-black text-amber-200">
            {totalGoldenExact}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-300/30 bg-amber-400/15 p-3 text-center">
          <div className="text-[11px] text-amber-100">فائز ذهبي</div>
          <div className="mt-1 text-2xl font-black text-amber-200">
            {totalGoldenWinner}
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="ابحث باسم العضو أو المنتخب أو اكتب مكرر..."
          className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-amber-400"
        />

        <select
          value={matchId}
          onChange={(event) => {
            setMatchId(event.target.value);
            setPage(1);
          }}
          className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-amber-400"
        >
          <option value="all">كل المباريات</option>
          {matchOptions.map((option) => (
            <option key={option.matchId} value={option.matchId}>
              {option.label} - {option.count} توقع
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as PredictionStatus);
            setPage(1);
          }}
          className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-amber-400"
        >
          <option value="all">كل الحالات</option>
          <option value="pending">لم يُحتسب</option>
          <option value="exact">بالملي</option>
          <option value="winner">الفائز</option>
          <option value="wrong">خطأ +0</option>
          <option value="edited">التوقعات المعدلة</option>
          <option value="golden">التوقعات الذهبية</option>
          <option value="goldenExact">ذهبي بالملي +6</option>
          <option value="goldenWinner">فائز ذهبي +2</option>
        </select>
      </div>

      {auditItems.length > 0 && (
        <div className="mb-4 rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-sky-100">
              تقرير فحص النقاط
            </h3>

            <button
              type="button"
              onClick={() => setAuditItems([])}
              className="rounded-lg border border-white/10 px-3 py-1 text-[11px] font-bold text-slate-200 hover:bg-white/10"
            >
              إخفاء التقرير
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[12px] text-slate-300">
                  <th className="px-3 py-2 text-right">العضو</th>
                  <th className="px-3 py-2 text-center">النقاط الحالية</th>
                  <th className="px-3 py-2 text-center">النقاط الصحيحة</th>
                  <th className="px-3 py-2 text-center">فرق النقاط</th>
                  <th className="px-3 py-2 text-center">التوقعات الحالية</th>
                  <th className="px-3 py-2 text-center">التوقعات الصحيحة</th>
                  <th className="px-3 py-2 text-center">الصح الحالي</th>
                  <th className="px-3 py-2 text-center">الصح الصحيح</th>
                  <th className="px-3 py-2 text-center">الخطأ الحالي</th>
                  <th className="px-3 py-2 text-center">الخطأ الصحيح</th>
                </tr>
              </thead>

              <tbody>
                {auditItems.map((item) => (
                  <tr key={item.userId} className="border-b border-white/10">
                    <td className="px-3 py-2 font-black text-amber-200">
                      {item.userName}
                    </td>

                    <td className="px-3 py-2 text-center">
                      {item.savedPoints}
                    </td>

                    <td className="px-3 py-2 text-center">
                      {item.realPoints}
                    </td>

                    <td
                      className={`px-3 py-2 text-center font-black ${
                        item.pointsDiff > 0
                          ? "text-red-300"
                          : item.pointsDiff < 0
                          ? "text-emerald-300"
                          : "text-slate-300"
                      }`}
                    >
                      {item.pointsDiff > 0 ? "+" : ""}
                      {item.pointsDiff}
                    </td>

                    <td className="px-3 py-2 text-center">
                      {item.savedTotal}
                    </td>

                    <td className="px-3 py-2 text-center">
                      {item.realTotal}
                    </td>

                    <td className="px-3 py-2 text-center">
                      {item.savedCorrect}
                    </td>

                    <td className="px-3 py-2 text-center">
                      {item.realCorrect}
                    </td>

                    <td className="px-3 py-2 text-center">
                      {item.savedWrong}
                    </td>

                    <td className="px-3 py-2 text-center">
                      {item.realWrong}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-slate-300">
            هذا التقرير للعرض فقط ولا يعدل أي بيانات.
          </p>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
          جاري تحميل توقعات الأعضاء...
        </div>
      ) : visiblePredictions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
          لا توجد توقعات مطابقة للبحث الحالي.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1240px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-slate-950/80 text-[12px] text-slate-300">
                  <th className="px-3 py-3 text-right font-black">#</th>
                  <th className="px-3 py-3 text-right font-black">العضو</th>
                  <th className="px-3 py-3 text-right font-black">المباراة</th>
                  <th className="px-3 py-3 text-center font-black">التوقع</th>
                  <th className="px-3 py-3 text-center font-black">النوع</th>
                  <th className="px-3 py-3 text-center font-black">
                    النتيجة الفعلية
                  </th>
                  <th className="px-3 py-3 text-center font-black">الحالة</th>
                  <th className="px-3 py-3 text-center font-black">النقاط</th>
                  <th className="px-3 py-3 text-center font-black">
                    وقت التوقع
                  </th>
                  <th className="px-3 py-3 text-center font-black">التعديل</th>
                  <th className="px-3 py-3 text-center font-black">
                    وقت الاحتساب
                  </th>
                  <th className="px-3 py-3 text-center font-black">إجراء</th>
                </tr>
              </thead>

              <tbody>
                {visiblePredictions.map((prediction, index) => {
                  const golden = isGoldenPrediction(prediction);
                  const duplicate = isDuplicatePrediction(prediction);
                  const deleting = deletingId === prediction.id;

                  return (
                    <tr
                      key={prediction.id}
                      className={`border-b border-white/10 transition hover:bg-white/5 ${
                        golden ? "bg-amber-400/5" : ""
                      } ${duplicate ? "bg-red-500/5" : ""}`}
                    >
                      <td className="px-3 py-3 text-slate-400">
                        {(page - 1) * pageSize + index + 1}
                      </td>

                      <td className="px-3 py-3">
                        <div
                          className={
                            golden
                              ? "font-black text-amber-200"
                              : "font-black text-amber-300"
                          }
                        >
                          {prediction.userName}
                        </div>

                        {duplicate && (
                          <div className="mt-1 inline-flex rounded-full border border-red-400/30 bg-red-500/10 px-2 py-1 text-[10px] font-black text-red-100">
                            مكرر
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold">
                            {prediction.homeTeamEmoji}{" "}
                            {prediction.homeTeamName}
                          </span>

                          <span className="text-slate-500">×</span>

                          <span className="font-bold">
                            {prediction.awayTeamName}{" "}
                            {prediction.awayTeamEmoji}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex rounded-lg px-3 py-1 font-black ${
                            golden
                              ? "bg-amber-400 text-slate-950"
                              : "bg-white/10 text-white"
                          }`}
                        >
                          {prediction.homeScore} - {prediction.awayScore}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-center">
                        {golden ? (
                          <span className="inline-flex rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black text-slate-950">
                            ⭐ ذهبي
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">—</span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex rounded-lg bg-slate-900 px-3 py-1 font-black text-slate-200">
                          {getActualResult(prediction)}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${getPredictionResultClass(
                            prediction
                          )}`}
                        >
                          {getPredictionResultLabel(prediction)}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 font-black ${
                            golden
                              ? "bg-amber-400 text-slate-950"
                              : "bg-white/10 text-white"
                          }`}
                        >
                          {prediction.points}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-center text-[11px] text-slate-400">
                        {formatDate(prediction.createdAt)}
                      </td>

                      <td className="px-3 py-3 text-center">
                        {isEditedPrediction(prediction) ? (
                          <div className="inline-flex flex-col items-center gap-1 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-[11px] font-black text-blue-100">
                            <span>
                              تم التعديل {prediction.editCount || 1} مرة
                            </span>
                            <span className="font-bold text-blue-200/80">
                              {formatDate(prediction.editedAt)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500">—</span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-center text-[11px] text-slate-400">
                        {formatDate(prediction.calculatedAt)}
                      </td>

                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          disabled={deleting}
                          onClick={() => handleDeletePrediction(prediction)}
                          className="rounded-lg bg-red-600 px-3 py-2 text-[11px] font-black text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deleting ? "جاري..." : "حذف"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
        >
          السابق
        </button>

        <div className="text-center text-sm text-slate-300">
          صفحة {page} من {totalPages} — عدد النتائج{" "}
          {filteredPredictions.length}
        </div>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
        >
          التالي
        </button>
      </div>
    </section>
  );
}
