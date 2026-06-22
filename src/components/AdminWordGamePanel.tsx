"use client";

import { useEffect, useMemo, useState } from "react";
import {
  adminDeleteTodayWordGameResults,
  adminDeleteUserTodayWordGameResult,
  getTodayWordGameAdminGames,
  getTodayWordGameLeaderboard,
  type WordGameAdminGameItem,
} from "@/lib/wordGameService";
import type { WordGameLeaderboardItem } from "@/types/wordGame";
import { formatDurationMs, getMakkahDateKey } from "@/lib/wordGameLogic";
import {
  getWordGameCategoryLabel,
  getWordGameWordCategory,
} from "@/lib/wordGameWords";

function getRankLabel(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
}

export default function AdminWordGamePanel() {
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [leaderboard, setLeaderboard] = useState<WordGameLeaderboardItem[]>([]);
  const [games, setGames] = useState<WordGameAdminGameItem[]>([]);

  const todayKey = getMakkahDateKey();

  async function loadData() {
    try {
      setLoading(true);

      const [leaderboardData, gamesData] = await Promise.all([
        getTodayWordGameLeaderboard(),
        getTodayWordGameAdminGames(),
      ]);

      setLeaderboard(leaderboardData);
      setGames(gamesData);
    } catch (error) {
      console.error("Word game admin load error:", error);
      alert("تعذر تحميل بيانات لعبة خمن كلمة اليوم");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const winnersCount = useMemo(
    () => leaderboard.filter((item) => item.won).length,
    [leaderboard]
  );

  const fastestPlayer = useMemo(
    () => leaderboard.find((item) => item.won) ?? null,
    [leaderboard]
  );

  function getGameByUserId(userId: string) {
    return games.find((game) => game.userId === userId) ?? null;
  }

  function getCategoryLabel(word?: string) {
    if (!word) return "-";
    return getWordGameCategoryLabel(getWordGameWordCategory(word));
  }

  async function handleDeleteUserResult(item: WordGameLeaderboardItem) {
    const confirmed = confirm(
      `هل تريد حذف نتيجة ${item.userName} من لعبة اليوم؟`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      await adminDeleteUserTodayWordGameResult(item.userId);
      alert("تم حذف نتيجة العضو");
      await loadData();
    } catch (error) {
      console.error("Delete word game user result error:", error);
      alert(error instanceof Error ? error.message : "تعذر حذف نتيجة العضو");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteTodayResults() {
    const confirmed = confirm(
      "هل تريد حذف جميع نتائج لعبة خمن كلمة اليوم؟ سيتم حذف محاولات ونتائج كل أعضاء اليوم فقط."
    );

    if (!confirmed) return;

    const secondConfirm = confirm(
      "تأكيد أخير: هذا الإجراء يحذف نتائج اليوم فقط ولا يؤثر على الأيام السابقة."
    );

    if (!secondConfirm) return;

    try {
      setDeleting(true);

      const result = await adminDeleteTodayWordGameResults();

      alert(
        `تم حذف نتائج اليوم.\nمحاولات محذوفة: ${result.deletedGames}\nنتائج محذوفة: ${result.deletedResults}`
      );

      await loadData();
    } catch (error) {
      console.error("Delete today word game results error:", error);
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
              🎮 إدارة خمن كلمة اليوم
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-300">
              عرض إحصائيات وترتيب لعبة اليوم مع إظهار كلمة العضو داخل الأدمن فقط.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading || deleting}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              تحديث البيانات
            </button>

            <button
              type="button"
              onClick={handleDeleteTodayResults}
              disabled={loading || deleting || leaderboard.length === 0}
              className="rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              حذف نتائج اليوم
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
            جاري تحميل بيانات اللعبة...
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
                {leaderboard.length}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="text-sm text-slate-300">عدد الفائزين اليوم</div>
              <div className="mt-1 text-3xl font-black text-emerald-300">
                {winnersCount}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="text-sm text-slate-300">أسرع عضو اليوم</div>
              <div className="mt-1 truncate text-lg font-black text-white">
                {fastestPlayer ? fastestPlayer.userName : "لا يوجد"}
              </div>
              <div
                className="mt-1 text-sm font-semibold text-amber-300"
                dir="ltr"
              >
                {fastestPlayer
                  ? formatDurationMs(fastestPlayer.durationMs)
                  : "-"}
              </div>
            </div>
          </div>
        )}
      </div>

      <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
        <div className="mb-4">
          <h3 className="text-xl font-black md:text-2xl">
            🏆 ترتيب اليوم داخل الأدمن
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-300">
            عمود الكلمة والتصنيف يظهران هنا فقط للأدمن ولا يظهران للعضو في صفحة اللعبة.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
            جاري تحميل الترتيب...
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
            لا توجد نتائج مكتملة اليوم.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[44px_1fr_92px_100px_76px_76px_76px_86px] bg-white/10 text-[12px] font-black text-slate-300 md:text-sm">
                <div className="px-2 py-3 text-center">#</div>
                <div className="px-2 py-3 text-right">الاسم</div>
                <div className="px-2 py-3 text-center">الكلمة</div>
                <div className="px-2 py-3 text-center">التصنيف</div>
                <div className="px-2 py-3 text-center">الحالة</div>
                <div className="px-2 py-3 text-center">محاولات</div>
                <div className="px-2 py-3 text-center">الوقت</div>
                <div className="px-2 py-3 text-center">إجراء</div>
              </div>

              {leaderboard.map((item) => {
                const game = getGameByUserId(item.userId);
                const categoryLabel = getCategoryLabel(game?.targetWord);

                return (
                  <div
                    key={item.userId}
                    className="grid grid-cols-[44px_1fr_92px_100px_76px_76px_76px_86px] items-center border-t border-white/10 text-[12px] md:text-sm"
                  >
                    <div className="px-2 py-3 text-center font-bold text-white">
                      {getRankLabel(item.rank)}
                    </div>

                    <div className="truncate px-2 py-3 text-right font-semibold text-white">
                      {item.userName}
                    </div>

                    <div className="px-2 py-3 text-center text-base font-black text-amber-300">
                      {game?.targetWord ?? "-"}
                    </div>

                    <div className="px-2 py-3 text-center">
                      <span className="inline-flex items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[11px] font-bold text-amber-100">
                        {categoryLabel}
                      </span>
                    </div>

                    <div className="px-2 py-3 text-center">
                      <span
                        className={[
                          "inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-bold",
                          item.won
                            ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                            : "border border-red-400/20 bg-red-500/10 text-red-200",
                        ].join(" ")}
                      >
                        {item.won ? "فاز" : "خسر"}
                      </span>
                    </div>

                    <div className="px-2 py-3 text-center font-semibold text-slate-200 tabular-nums">
                      {item.attemptsUsed}/6
                    </div>

                    <div
                      className="px-2 py-3 text-center font-semibold text-slate-200 tabular-nums"
                      dir="ltr"
                    >
                      {formatDurationMs(item.durationMs)}
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