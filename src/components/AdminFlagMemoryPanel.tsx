"use client";

import { useEffect, useMemo, useState } from "react";
import {
  adminDeleteTodayFlagMemoryResults,
  adminDeleteUserTodayFlagMemoryResult,
  formatFlagMemoryTime,
  getFlagMemorySettings,
  getSaudiDateKey,
  getTodayFlagMemoryAdminResults,
  saveFlagMemorySettings,
  type FlagMemoryResult,
  type FlagMemorySettings,
} from "@/lib/flagMemory";

function getRankLabel(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
}

export default function AdminFlagMemoryPanel() {
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [results, setResults] = useState<FlagMemoryResult[]>([]);

  const [settings, setSettings] = useState<FlagMemorySettings>({
    enabled: true,
    pairsCount: 12,
    oneAttemptPerDay: true,
    memberNotice:
      "24 بطاقة، 12 علمًا متطابقًا، ومحاولة رسمية واحدة يوميًا. ركّز جيدًا؛ لا توجد إعادة ترتيب أثناء التحدي.",
  });

  const todayKey = getSaudiDateKey();

  async function loadData() {
    try {
      setLoading(true);

      const [resultsData, settingsData] = await Promise.all([
        getTodayFlagMemoryAdminResults(),
        getFlagMemorySettings(),
      ]);

      setResults(resultsData);
      setSettings(settingsData);
    } catch (error) {
      console.error("Flag memory admin load error:", error);
      alert("تعذر تحميل بيانات تحدي الأعلام");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const bestPlayer = useMemo(() => {
    return results[0] ?? null;
  }, [results]);

  const averageScore = useMemo(() => {
    if (results.length === 0) return 0;

    const total = results.reduce((sum, item) => sum + item.score, 0);
    return Math.round(total / results.length);
  }, [results]);

  const fastestPlayer = useMemo(() => {
    const sorted = [...results].sort((a, b) => {
      if (a.timeSeconds !== b.timeSeconds) {
        return a.timeSeconds - b.timeSeconds;
      }

      return b.score - a.score;
    });

    return sorted[0] ?? null;
  }, [results]);

  async function handleSaveSettings() {
    try {
      setSavingSettings(true);

      const updatedSettings = await saveFlagMemorySettings({
        enabled: settings.enabled,
        pairsCount: settings.pairsCount,
        oneAttemptPerDay: settings.oneAttemptPerDay,
        memberNotice: settings.memberNotice,
      });

      setSettings(updatedSettings);
      alert("تم حفظ إعدادات تحدي الأعلام");
    } catch (error) {
      console.error("Save flag memory settings error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "تعذر حفظ إعدادات تحدي الأعلام"
      );
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleDeleteUserResult(item: FlagMemoryResult) {
    const confirmed = confirm(
      `هل تريد حذف نتيجة ${item.userName} من تحدي الأعلام اليوم؟`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);

      await adminDeleteUserTodayFlagMemoryResult(item.userId);

      alert("تم حذف نتيجة العضو");
      await loadData();
    } catch (error) {
      console.error("Delete flag memory user result error:", error);
      alert(error instanceof Error ? error.message : "تعذر حذف نتيجة العضو");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteTodayResults() {
    const confirmed = confirm(
      "هل تريد حذف جميع نتائج تحدي الأعلام لهذا اليوم؟"
    );

    if (!confirmed) return;

    const secondConfirm = confirm(
      "تأكيد أخير: سيتم حذف نتائج اليوم فقط، ولن تتأثر الأيام السابقة."
    );

    if (!secondConfirm) return;

    try {
      setDeleting(true);

      const result = await adminDeleteTodayFlagMemoryResults();

      alert(`تم حذف نتائج اليوم.\nنتائج محذوفة: ${result.deletedResults}`);

      await loadData();
    } catch (error) {
      console.error("Delete today flag memory results error:", error);
      alert(error instanceof Error ? error.message : "تعذر حذف نتائج اليوم");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="space-y-5" dir="rtl">
      <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black md:text-2xl">
              🎌 إدارة تحدي الأعلام
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-300">
              تحكم بتشغيل اللعبة، عدد البطاقات، المحاولات، وترتيب نتائج اليوم.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading || deleting || savingSettings}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              تحديث البيانات
            </button>

            <button
              type="button"
              onClick={handleDeleteTodayResults}
              disabled={loading || deleting || results.length === 0}
              className="rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              حذف نتائج اليوم
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
            جاري تحميل بيانات تحدي الأعلام...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="text-sm text-slate-300">تاريخ اليوم</div>
              <div className="mt-1 text-2xl font-black text-white" dir="ltr">
                {todayKey}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="text-sm text-slate-300">عدد المشاركين اليوم</div>
              <div className="mt-1 text-3xl font-black text-white">
                {results.length}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="text-sm text-slate-300">متوسط النقاط</div>
              <div className="mt-1 text-3xl font-black text-emerald-300">
                {averageScore}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="text-sm text-slate-300">أفضل نتيجة اليوم</div>
              <div className="mt-1 truncate text-lg font-black text-white">
                {bestPlayer ? bestPlayer.userName : "لا يوجد"}
              </div>
              <div className="mt-1 text-sm font-semibold text-amber-300">
                {bestPlayer ? `${bestPlayer.score} نقطة` : "-"}
              </div>
            </div>
          </div>
        )}
      </div>

      <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
        <div className="mb-4">
          <h3 className="text-xl font-black md:text-2xl">
            ⚙️ إعدادات تحدي الأعلام
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-300">
            هذه الإعدادات تتحكم في ظهور اللعبة وطريقة لعب الأعضاء.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
            جاري تحميل الإعدادات...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="mb-2 text-sm font-black text-white">
                  حالة اللعبة
                </div>

                <select
                  value={settings.enabled ? "enabled" : "disabled"}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      enabled: event.target.value === "enabled",
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm font-bold text-white outline-none focus:border-amber-400"
                >
                  <option value="enabled">مفعّلة</option>
                  <option value="disabled">متوقفة مؤقتًا</option>
                </select>
              </label>

              <label className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="mb-2 text-sm font-black text-white">
                  عدد الأزواج
                </div>

                <select
                  value={settings.pairsCount}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      pairsCount: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm font-bold text-white outline-none focus:border-amber-400"
                >
                  <option value={8}>8 أزواج — 16 بطاقة</option>
                  <option value={10}>10 أزواج — 20 بطاقة</option>
                  <option value={12}>12 زوجًا — 24 بطاقة</option>
                  <option value={15}>15 زوجًا — 30 بطاقة</option>
                  <option value={18}>18 زوجًا — 36 بطاقة</option>
                </select>
              </label>

              <label className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="mb-2 text-sm font-black text-white">
                  المحاولة الرسمية
                </div>

                <select
                  value={settings.oneAttemptPerDay ? "one" : "multiple"}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      oneAttemptPerDay: event.target.value === "one",
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm font-bold text-white outline-none focus:border-amber-400"
                >
                  <option value="one">مرة واحدة يوميًا</option>
                  <option value="multiple">السماح بإعادة المحاولة</option>
                </select>
              </label>
            </div>

            <label className="block rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="mb-2 text-sm font-black text-white">
                نص التنبيه الظاهر للعضو
              </div>

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
                className="w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm font-bold leading-7 text-white outline-none focus:border-amber-400"
                placeholder="اكتب وصفًا مختصرًا يظهر للعضو داخل صفحة التحدي"
              />

              <div className="mt-2 text-xs font-bold text-slate-400">
                {settings.memberNotice.length}/240 حرف
              </div>
            </label>

            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm font-bold leading-7 text-amber-100">
              ملاحظة: تغيير عدد الأزواج سيطبق على المحاولات الجديدة بعد حفظ
              الإعدادات. النتائج السابقة تبقى كما هي.
            </div>

            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="w-full rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            >
              {savingSettings ? "جاري حفظ الإعدادات..." : "حفظ إعدادات اللعبة"}
            </button>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
        <div className="mb-4">
          <h3 className="text-xl font-black md:text-2xl">
            🏆 ترتيب تحدي الأعلام داخل الأدمن
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-300">
            يتم ترتيب الأعضاء حسب الأعلى نقاطًا، ثم الأسرع وقتًا، ثم الأقل
            محاولات.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
            جاري تحميل الترتيب...
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
            لا توجد نتائج لتحدي الأعلام اليوم.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-[52px_1fr_96px_96px_96px_96px_96px] bg-white/10 text-[12px] font-black text-slate-300 md:text-sm">
                <div className="px-2 py-3 text-center">#</div>
                <div className="px-2 py-3 text-right">الاسم</div>
                <div className="px-2 py-3 text-center">النقاط</div>
                <div className="px-2 py-3 text-center">الوقت</div>
                <div className="px-2 py-3 text-center">المحاولات</div>
                <div className="px-2 py-3 text-center">الأخطاء</div>
                <div className="px-2 py-3 text-center">إجراء</div>
              </div>

              {results.map((item, index) => {
                const isFastest = fastestPlayer?.id === item.id;

                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[52px_1fr_96px_96px_96px_96px_96px] items-center border-t border-white/10 text-[12px] md:text-sm"
                  >
                    <div className="px-2 py-3 text-center font-bold text-white">
                      {getRankLabel(index + 1)}
                    </div>

                    <div className="truncate px-2 py-3 text-right font-semibold text-white">
                      {item.userName}
                      {isFastest && (
                        <span className="mr-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-black text-cyan-100">
                          الأسرع
                        </span>
                      )}
                    </div>

                    <div className="px-2 py-3 text-center text-base font-black text-amber-300">
                      {item.score}
                    </div>

                    <div
                      className="px-2 py-3 text-center font-semibold text-slate-200 tabular-nums"
                      dir="ltr"
                    >
                      {formatFlagMemoryTime(item.timeSeconds)}
                    </div>

                    <div className="px-2 py-3 text-center font-semibold text-slate-200 tabular-nums">
                      {item.moves}
                    </div>

                    <div className="px-2 py-3 text-center font-semibold text-slate-200 tabular-nums">
                      {item.mistakes}
                    </div>

                    <div className="px-2 py-3 text-center">
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() => handleDeleteUserResult(item)}
                        className="rounded-xl bg-red-500 px-3 py-2 text-[11px] font-black text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </section>
  );
}