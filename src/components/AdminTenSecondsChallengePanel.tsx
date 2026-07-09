"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, Save, Trash2, TimerReset, Trophy } from "lucide-react";
import {
  DEFAULT_TEN_SECONDS_SETTINGS,
  adminDeleteTenSecondsResult,
  adminDeleteTodayTenSecondsResults,
  formatTenSecondsTime,
  getTodayTenSecondsAdminResults,
  getTenSecondsSettings,
  saveTenSecondsSettings,
  type TenSecondsDailyResult,
  type TenSecondsSettings,
} from "@/lib/tenSecondsChallenge";

function AdminResultStat({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className: string;
}) {
  return (
    <div className={`rounded-xl border p-2 text-center ${className}`}>
      <div className="text-[10px] font-bold opacity-80">{label}</div>
      <div className="mt-1 text-sm font-black tabular-nums">{value}</div>
    </div>
  );
}

export default function AdminTenSecondsChallengePanel() {
  const [settings, setSettings] = useState<TenSecondsSettings>(
    DEFAULT_TEN_SECONDS_SETTINGS
  );
  const [results, setResults] = useState<TenSecondsDailyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const winnersCount = useMemo(
    () => results.filter((result) => result.won).length,
    [results]
  );

  async function loadData() {
    try {
      setLoading(true);

      const [settingsData, resultsData] = await Promise.all([
        getTenSecondsSettings(),
        getTodayTenSecondsAdminResults(),
      ]);

      setSettings(settingsData);
      setResults(resultsData);
    } catch (error) {
      console.error("Load ten seconds admin data error:", error);
      alert("تعذر تحميل إعدادات ونتائج تحدي العشر ثواني");
    } finally {
      setLoading(false);
    }
  }

  async function loadResults() {
    try {
      setLoadingResults(true);

      const resultsData = await getTodayTenSecondsAdminResults();
      setResults(resultsData);
    } catch (error) {
      console.error("Load ten seconds results error:", error);
      alert("تعذر تحميل نتائج تحدي العشر ثواني");
    } finally {
      setLoadingResults(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);

      const updatedSettings = await saveTenSecondsSettings(settings);
      setSettings(updatedSettings);

      alert("تم حفظ إعدادات تحدي العشر ثواني");
    } catch (error) {
      console.error("Save ten seconds settings error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "تعذر حفظ إعدادات تحدي العشر ثواني"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteResult(result: TenSecondsDailyResult) {
    const confirmed = confirm(
      result.pointsAwarded
        ? `حذف نتيجة ${result.userName}؟ سيتم خصم ${result.awardedPoints} نقاط من رصيده.`
        : `حذف نتيجة ${result.userName}؟`
    );

    if (!confirmed) return;

    try {
      setDeletingId(result.id);

      await adminDeleteTenSecondsResult(result.id);
      await loadResults();

      alert("تم حذف النتيجة بنجاح");
    } catch (error) {
      console.error("Delete ten seconds result error:", error);
      alert(error instanceof Error ? error.message : "تعذر حذف النتيجة");
    } finally {
      setDeletingId("");
    }
  }

  async function handleDeleteAllToday() {
    if (results.length === 0) return;

    const confirmed = confirm(
      "هل تريد حذف كل نتائج اليوم؟ سيتم خصم نقاط الفائزين الذين أخذوا نقاطًا."
    );

    if (!confirmed) return;

    try {
      setDeletingId("all");

      const data = await adminDeleteTodayTenSecondsResults();
      await loadResults();

      alert(`تم حذف ${data.deletedResults} نتيجة`);
    } catch (error) {
      console.error("Delete all ten seconds results error:", error);
      alert(error instanceof Error ? error.message : "تعذر حذف نتائج اليوم");
    } finally {
      setDeletingId("");
    }
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/10 p-5 text-center text-slate-300 shadow-2xl">
        <span className="inline-flex items-center justify-center gap-2 font-black">
          <Loader2 className="h-5 w-5 animate-spin text-amber-300" />
          جاري تحميل إعدادات تحدي العشر ثواني...
        </span>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
        <div className="mb-5">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/10 text-amber-100">
            <TimerReset className="h-6 w-6" />
          </div>

          <h2 className="text-xl font-black md:text-2xl">
            ⏱️ إعدادات تحدي العشر ثواني
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-300">
            تحكم بتشغيل التحدي والمحاولات والسماحية والنقاط. التعديل هنا لا يمس
            نظام التوقعات ولا إحصائياتها.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <div>
              <div className="text-sm font-black text-white">تشغيل التحدي</div>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                إذا تم إيقافه، لن يستطيع الأعضاء بدء محاولات جديدة.
              </p>
            </div>

            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  enabled: event.target.checked,
                }))
              }
              className="h-5 w-5 accent-amber-400"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <span className="mb-2 block text-sm font-black">
                عدد المحاولات اليومية
              </span>

              <input
                type="number"
                min={1}
                max={10}
                value={settings.dailyAttempts}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    dailyAttempts: Number(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-center text-lg font-black outline-none focus:border-amber-400"
              />

              <p className="mt-2 text-xs leading-5 text-slate-400">
                الافتراضي: 3 محاولات.
              </p>
            </label>

            <label className="block rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <span className="mb-2 block text-sm font-black">
                السماحية الداخلية بالمللي ثانية
              </span>

              <input
                type="number"
                min={0}
                max={200}
                value={settings.toleranceMs}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    toleranceMs: Number(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-center text-lg font-black outline-none focus:border-amber-400"
              />

              <p className="mt-2 text-xs leading-5 text-slate-400">
                لا تظهر للعضو. الافتراضي: ±20ms.
              </p>
            </label>

            <label className="block rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <span className="mb-2 block text-sm font-black">
                نقاط الفوز الرسمية
              </span>

              <input
                type="number"
                min={0}
                max={50}
                value={settings.awardedPoints}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    awardedPoints: Number(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-center text-lg font-black outline-none focus:border-amber-400"
              />

              <p className="mt-2 text-xs leading-5 text-slate-400">
                تضاف إلى users.points فقط.
              </p>
            </label>
          </div>

          <label className="block rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <span className="mb-2 block text-sm font-black">
              تنبيه يظهر داخل اللعبة
            </span>

            <textarea
              value={settings.memberNotice}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  memberNotice: event.target.value,
                }))
              }
              maxLength={240}
              rows={3}
              className="w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-6 outline-none focus:border-amber-400"
            />

            <p className="mt-2 text-xs text-slate-400">الحد الأقصى 240 حرف.</p>
          </label>

          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-7 text-amber-100">
            <strong>تنبيه مهم:</strong> نقاط هذا التحدي مستقلة عن التوقعات. لا
            تزيد عدد التوقعات، ولا الفائز الصحيح، ولا بالملي، ولا الخطأ.
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}

            <span>{saving ? "جاري الحفظ..." : "حفظ إعدادات التحدي"}</span>
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="inline-flex items-center gap-2 text-xl font-black md:text-2xl">
              <Trophy className="h-5 w-5 text-amber-300" />
              نتائج تحدي العشر ثواني اليوم
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-300">
              حذف النتيجة من هنا يخصم نقاط الفوز تلقائيًا إذا كانت النتيجة فائزة.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadResults}
              disabled={loadingResults}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingResults ? "جاري التحديث..." : "تحديث النتائج"}
            </button>

            <button
              type="button"
              onClick={handleDeleteAllToday}
              disabled={results.length === 0 || deletingId === "all"}
              className="rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              حذف نتائج اليوم
            </button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <AdminResultStat
            label="عدد المشاركين"
            value={results.length}
            className="border-white/10 bg-slate-950/50 text-white"
          />

          <AdminResultStat
            label="الفائزون"
            value={winnersCount}
            className="border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
          />

          <AdminResultStat
            label="غير الفائزين"
            value={Math.max(0, results.length - winnersCount)}
            className="border-red-400/20 bg-red-400/10 text-red-200"
          />
        </div>

        {results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 p-6 text-center text-sm font-bold text-slate-300">
            لا توجد نتائج محفوظة اليوم حتى الآن.
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((result, index) => {
              const rank = index + 1;
              const bestTime = result.won
                ? "00:10.000"
                : result.bestDisplayTime || "-";
              const bestDiff =
                result.bestDiffMs === null || result.bestDiffMs === undefined
                  ? "-"
                  : `${result.bestDiffMs}ms`;

              return (
                <article
                  key={result.id}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55 p-3 shadow-md shadow-slate-950/20"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent" />

                  <div className="relative mb-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-9 min-w-9 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-sm font-black text-amber-200">
                        {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : rank}
                      </div>

                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-slate-400">
                          العضو
                        </div>
                        <div className="truncate text-sm font-black text-white">
                          {result.userName}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteResult(result)}
                      disabled={Boolean(deletingId)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-red-500 px-3 py-2 text-xs font-black text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === result.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      حذف
                    </button>
                  </div>

                  <div className="relative grid grid-cols-2 gap-1.5 md:grid-cols-5">
                    <AdminResultStat
                      label="الحالة"
                      value={result.won ? "فاز" : "لم يفز"}
                      className={
                        result.won
                          ? "border-emerald-400/15 bg-emerald-400/10 text-emerald-300"
                          : "border-red-400/15 bg-red-400/10 text-red-200"
                      }
                    />

                    <AdminResultStat
                      label="أفضل وقت"
                      value={bestTime}
                      className="border-white/10 bg-white/5 text-white"
                    />

                    <AdminResultStat
                      label="الفرق"
                      value={bestDiff}
                      className="border-cyan-400/15 bg-cyan-400/10 text-cyan-100"
                    />

                    <AdminResultStat
                      label="المحاولات"
                      value={result.attemptsCount}
                      className="border-amber-400/15 bg-amber-400/10 text-amber-300"
                    />

                    <AdminResultStat
                      label="النقاط"
                      value={result.pointsAwarded ? `+${result.awardedPoints}` : "+0"}
                      className="border-emerald-400/15 bg-emerald-400/10 text-emerald-200"
                    />
                  </div>

                  {result.attempts.length > 0 && (
                    <div className="relative mt-3 rounded-xl border border-white/10 bg-slate-950/50 p-2 text-xs leading-6 text-slate-300">
                      {result.attempts.map((attempt) => (
                        <div key={`${result.id}-${attempt.attemptNumber}`}>
                          محاولة {attempt.attemptNumber}:{" "}
                          <span className="font-black text-white">
                            {attempt.won
                              ? "00:10.000"
                              : formatTenSecondsTime(attempt.elapsedMs)}
                          </span>{" "}
                          — الفرق {attempt.diffMs}ms {attempt.won ? "✅" : "❌"}
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
