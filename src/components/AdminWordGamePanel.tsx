"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  adminDeleteAllWordGameResults,
  adminDeleteTodayWordGameResults,
  adminDeleteUserWordGameResult,
  adminGetWordGameDashboard,
  adminRandomizeTodayWord,
  adminResetWordGameCompletely,
  adminSetTodayWord,
} from "@/lib/wordGameService";
import type {
  WordGameDailyWord,
  WordGameLeaderboardItem,
  WordGameMetaState,
} from "@/types/wordGame";

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

function getMedal(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
}

export default function AdminWordGamePanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [todayKey, setTodayKey] = useState("");
  const [dailyWord, setDailyWord] = useState<WordGameDailyWord | null>(null);
  const [meta, setMeta] = useState<WordGameMetaState | null>(null);
  const [leaderboard, setLeaderboard] = useState<WordGameLeaderboardItem[]>([]);

  const [newWord, setNewWord] = useState("");

  async function loadData() {
    try {
      setLoading(true);

      const data = await adminGetWordGameDashboard();

      setTodayKey(data.todayKey);
      setDailyWord(data.dailyWord);
      setMeta(data.meta);
      setLeaderboard(data.leaderboard);
      setNewWord(data.dailyWord?.word || "");
    } catch (error) {
      console.error("Word game admin load error:", error);
      alert("تعذر تحميل بيانات لعبة الكلمة");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleChangeTodayWord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanWord = newWord.trim();

    if ([...cleanWord].length !== 5) {
      alert("الكلمة لازم تكون 5 حروف بالضبط");
      return;
    }

    const confirmed = confirm(
      "هل أنت متأكد من تغيير كلمة اليوم؟ إذا فيه نتائج تجربة، احذف نتائج اليوم بعدها."
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      await adminSetTodayWord(cleanWord);

      alert("تم تغيير كلمة اليوم");
      await loadData();
    } catch (error) {
      console.error("Change word error:", error);
      alert(error instanceof Error ? error.message : "تعذر تغيير كلمة اليوم");
    } finally {
      setSaving(false);
    }
  }

  async function handleRandomWord() {
    const confirmed = confirm(
      "سيتم اختيار كلمة عشوائية جديدة لليوم. هل تريد المتابعة؟"
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      const selectedWord = await adminRandomizeTodayWord();

      alert(`تم اختيار كلمة جديدة: ${selectedWord}`);
      await loadData();
    } catch (error) {
      console.error("Random word error:", error);
      alert(error instanceof Error ? error.message : "تعذر اختيار كلمة عشوائية");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTodayResults() {
    const confirmed = confirm(
      "هل أنت متأكد من حذف كل نتائج اليوم؟ هذا مناسب لحذف تجارب الاختبار."
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      const count = await adminDeleteTodayWordGameResults();

      alert(`تم حذف ${count} نتيجة من نتائج اليوم`);
      await loadData();
    } catch (error) {
      console.error("Delete today results error:", error);
      alert("تعذر حذف نتائج اليوم");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAllResults() {
    const confirmed = confirm(
      "تحذير: سيتم حذف كل نتائج لعبة الكلمة لجميع الأيام. هل أنت متأكد؟"
    );

    if (!confirmed) return;

    const secondConfirm = confirm(
      "تأكيد أخير: هذا الإجراء يحذف كل نتائج اللعبة وليس نتائج اليوم فقط."
    );

    if (!secondConfirm) return;

    try {
      setSaving(true);

      const count = await adminDeleteAllWordGameResults();

      alert(`تم حذف ${count} نتيجة من كل نتائج اللعبة`);
      await loadData();
    } catch (error) {
      console.error("Delete all results error:", error);
      alert("تعذر حذف كل نتائج اللعبة");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteUserResult(item: WordGameLeaderboardItem) {
    const confirmed = confirm(
      `هل تريد حذف نتيجة ${item.fullName} من لعبة اليوم؟`
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      await adminDeleteUserWordGameResult({
        date: item.date,
        userId: item.userId,
      });

      alert("تم حذف نتيجة العضو");
      await loadData();
    } catch (error) {
      console.error("Delete user result error:", error);
      alert("تعذر حذف نتيجة العضو");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetGame() {
    const confirmed = confirm(
      "تحذير كبير: سيتم حذف نتائج اللعبة كلها، وحذف كلمات الأيام السابقة، وتصفير دورة الكلمات. هل أنت متأكد؟"
    );

    if (!confirmed) return;

    const secondConfirm = confirm(
      "تأكيد أخير جدًا: استخدم هذا فقط قبل الإطلاق أو إذا تبغى تبدأ من الصفر."
    );

    if (!secondConfirm) return;

    try {
      setSaving(true);

      const result = await adminResetWordGameCompletely();

      alert(
        `تمت إعادة ضبط اللعبة.\nنتائج محذوفة: ${result.deletedResults}\nكلمات أيام محذوفة: ${result.deletedDailyWords}`
      );

      await loadData();
    } catch (error) {
      console.error("Reset game error:", error);
      alert("تعذر إعادة ضبط اللعبة");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black md:text-2xl">
              🎮 إدارة خمن كلمة اليوم
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              تحكم كامل في كلمة اليوم، نتائج التجارب، وترتيب اللعبة.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading || saving}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            تحديث بيانات اللعبة
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
            جاري تحميل بيانات اللعبة...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="text-sm text-slate-300">تاريخ اليوم</div>
              <div className="mt-1 text-xl font-black">{todayKey}</div>
            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
              <div className="text-sm text-amber-100">كلمة اليوم</div>
              <div className="mt-1 text-3xl font-black text-amber-300">
                {dailyWord?.word || "غير محددة"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="text-sm text-slate-300">نتائج اليوم</div>
              <div className="mt-1 text-3xl font-black">
                {leaderboard.length}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="text-sm text-slate-300">دورة الكلمات</div>
              <div className="mt-1 text-3xl font-black">
                {meta?.cycle || 1}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
          <h3 className="mb-3 text-lg font-black">✏️ التحكم بكلمة اليوم</h3>

          <form onSubmit={handleChangeTodayWord} className="space-y-3">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">
                كلمة اليوم الجديدة
              </span>

              <input
                value={newWord}
                onChange={(event) =>
                  setNewWord(event.target.value.replace(/\s/g, "").slice(0, 5))
                }
                placeholder="مثال: سيارة"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-center text-2xl font-black outline-none focus:border-amber-400"
              />

              <div className="mt-2 text-xs text-slate-300">
                عدد الحروف: {[...newWord].length}/5
              </div>
            </label>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                type="submit"
                disabled={saving || [...newWord].length !== 5}
                className="rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                حفظ كلمة اليوم
              </button>

              <button
                type="button"
                onClick={handleRandomWord}
                disabled={saving}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                اختيار عشوائي
              </button>
            </div>
          </form>

          <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-7 text-amber-100">
            إذا غيرت كلمة اليوم بعد ما أحد لعب، الأفضل تستخدم زر حذف نتائج
            اليوم حتى يبدأ الترتيب من جديد.
          </div>
        </section>

        <section className="rounded-3xl border border-red-300/20 bg-red-500/10 p-4 shadow-2xl md:p-5">
          <h3 className="mb-3 text-lg font-black text-red-100">
            🧹 حذف التجارب وإعادة الضبط
          </h3>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleDeleteTodayResults}
              disabled={saving}
              className="w-full rounded-2xl bg-red-500 px-4 py-3 text-sm font-black text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              حذف نتائج اليوم فقط
            </button>

            <button
              type="button"
              onClick={handleDeleteAllResults}
              disabled={saving}
              className="w-full rounded-2xl border border-red-300/30 bg-red-500/30 px-4 py-3 text-sm font-black text-red-100 hover:bg-red-500/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              حذف كل نتائج اللعبة
            </button>

            <button
              type="button"
              onClick={handleResetGame}
              disabled={saving}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-black text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              تصفير اللعبة بالكامل
            </button>
          </div>

          <p className="mt-4 text-xs leading-6 text-red-100/80">
            استخدم تصفير اللعبة بالكامل فقط قبل الإطلاق أو إذا تبغى تبدأ من
            الصفر. هذا يحذف النتائج وكلمات الأيام السابقة ويصفر دورة الكلمات.
          </p>
        </section>
      </div>

      <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
        <div className="mb-4">
          <h3 className="text-lg font-black">🏆 ترتيب اليوم داخل الأدمن</h3>
          <p className="mt-1 text-sm text-slate-300">
            تقدر تحذف نتيجة عضو واحد إذا كانت تجربة أو خطأ.
          </p>
        </div>

        {leaderboard.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
            لا توجد نتائج اليوم.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-[50px_1fr_70px_80px_80px_80px] bg-white/10 text-xs font-black text-slate-300">
              <div className="p-3 text-center">#</div>
              <div className="p-3">الاسم</div>
              <div className="p-3 text-center">الحالة</div>
              <div className="p-3 text-center">محاولات</div>
              <div className="p-3 text-center">الوقت</div>
              <div className="p-3 text-center">إجراء</div>
            </div>

            {leaderboard.map((item) => (
              <div
                key={`${item.date}_${item.userId}`}
                className="grid grid-cols-[50px_1fr_70px_80px_80px_80px] items-center border-t border-white/10 text-sm"
              >
                <div className="p-3 text-center font-black">
                  {getMedal(item.rank)}
                </div>

                <div className="truncate p-3 font-black">
                  {item.fullName}
                </div>

                <div className="p-3 text-center">
                  <span
                    className={[
                      "rounded-full px-2 py-1 text-xs font-black",
                      item.won
                        ? "bg-emerald-400/10 text-emerald-200"
                        : "bg-red-400/10 text-red-200",
                    ].join(" ")}
                  >
                    {item.won ? "فاز" : "خسر"}
                  </span>
                </div>

                <div className="p-3 text-center font-bold">
                  {item.attempts}/6
                </div>

                <div className="p-3 text-center font-bold">
                  {formatDuration(item.durationSeconds)}
                </div>

                <div className="p-3 text-center">
                  <button
                    type="button"
                    onClick={() => handleDeleteUserResult(item)}
                    disabled={saving}
                    className="rounded-xl bg-red-500 px-3 py-2 text-xs font-black text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}