"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AdminPrediction,
  getAdminPredictions,
  getPredictionMatchOptions,
  getPredictionResultClass,
  getPredictionResultLabel,
} from "@/lib/adminPredictions";

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

function getActualResult(prediction: AdminPrediction) {
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

export default function AdminPredictionsPanel() {
  const [predictions, setPredictions] = useState<AdminPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [matchId, setMatchId] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const pageSize = 20;

  async function loadPredictions() {
    try {
      setLoading(true);
      const data = await getAdminPredictions();
      setPredictions(data);
    } catch (error) {
      console.error("Admin predictions error:", error);
      alert("تعذر تحميل توقعات الأعضاء");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPredictions();
  }, []);

  const matchOptions = useMemo(() => {
    return getPredictionMatchOptions(predictions);
  }, [predictions]);

  const filteredPredictions = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return predictions.filter((prediction) => {
      const matchesSearch =
        !searchValue ||
        prediction.userName.toLowerCase().includes(searchValue) ||
        prediction.homeTeamName.toLowerCase().includes(searchValue) ||
        prediction.awayTeamName.toLowerCase().includes(searchValue);

      const matchesMatch = matchId === "all" || prediction.matchId === matchId;

      const matchesStatus =
        status === "all" ||
        (status === "pending" && !prediction.isCalculated) ||
        (status === "exact" &&
          prediction.isCalculated &&
          (prediction.resultType === "exact" || prediction.points === 3)) ||
        (status === "winner" &&
          prediction.isCalculated &&
          (prediction.resultType === "winner" || prediction.points === 1)) ||
        (status === "wrong" &&
          prediction.isCalculated &&
          prediction.points === 0);

      return matchesSearch && matchesMatch && matchesStatus;
    });
  }, [predictions, search, matchId, status]);

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

  const totalExact = predictions.filter(
    (prediction) =>
      prediction.isCalculated &&
      (prediction.resultType === "exact" || prediction.points === 3)
  ).length;

  const totalWinner = predictions.filter(
    (prediction) =>
      prediction.isCalculated &&
      (prediction.resultType === "winner" || prediction.points === 1)
  ).length;

  const totalWrong = predictions.filter(
    (prediction) => prediction.isCalculated && prediction.points === 0
  ).length;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black md:text-2xl">🔮 توقعات الأعضاء</h2>
          <p className="mt-1 text-sm text-slate-300">
            جدول مختصر لجميع توقعات الأعضاء حسب المباراة والحالة.
          </p>
        </div>

        <button
          type="button"
          onClick={loadPredictions}
          className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-300"
        >
          تحديث البيانات
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-center">
          <div className="text-[11px] text-slate-400">الإجمالي</div>
          <div className="mt-1 text-2xl font-black">{predictions.length}</div>
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
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="ابحث باسم العضو أو المنتخب..."
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
            setStatus(event.target.value);
            setPage(1);
          }}
          className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-amber-400"
        >
          <option value="all">كل الحالات</option>
          <option value="pending">لم يُحتسب</option>
          <option value="exact">بالملي +3</option>
          <option value="winner">الفائز +1</option>
          <option value="wrong">خطأ +0</option>
        </select>
      </div>

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
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-slate-950/80 text-[12px] text-slate-300">
                  <th className="px-3 py-3 text-right font-black">#</th>
                  <th className="px-3 py-3 text-right font-black">العضو</th>
                  <th className="px-3 py-3 text-right font-black">المباراة</th>
                  <th className="px-3 py-3 text-center font-black">التوقع</th>
                  <th className="px-3 py-3 text-center font-black">
                    النتيجة الفعلية
                  </th>
                  <th className="px-3 py-3 text-center font-black">الحالة</th>
                  <th className="px-3 py-3 text-center font-black">النقاط</th>
                  <th className="px-3 py-3 text-center font-black">
                    وقت التوقع
                  </th>
                  <th className="px-3 py-3 text-center font-black">
                    وقت الاحتساب
                  </th>
                </tr>
              </thead>

              <tbody>
                {visiblePredictions.map((prediction, index) => (
                  <tr
                    key={prediction.id}
                    className="border-b border-white/10 transition hover:bg-white/5"
                  >
                    <td className="px-3 py-3 text-slate-400">
                      {(page - 1) * pageSize + index + 1}
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-black text-amber-300">
                        {prediction.userName}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">
                          {prediction.homeTeamEmoji} {prediction.homeTeamName}
                        </span>

                        <span className="text-slate-500">×</span>

                        <span className="font-bold">
                          {prediction.awayTeamName} {prediction.awayTeamEmoji}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex rounded-lg bg-white/10 px-3 py-1 font-black text-white">
                        {prediction.homeScore} - {prediction.awayScore}
                      </span>
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
                      <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-white/10 px-2 font-black">
                        {prediction.points}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-center text-[11px] text-slate-400">
                      {formatDate(prediction.createdAt)}
                    </td>

                    <td className="px-3 py-3 text-center text-[11px] text-slate-400">
                      {formatDate(prediction.calculatedAt)}
                    </td>
                  </tr>
                ))}
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