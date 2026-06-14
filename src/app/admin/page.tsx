"use client";

import { FormEvent, useEffect, useState } from "react";
import { getTeams, Team } from "@/lib/teams";
import { addMatch, getAllMatches, Match } from "@/lib/matches";
import { calculateMatchResult, undoMatchCalculation } from "@/lib/scoring";
import { isAdminUnlocked, lockAdmin, unlockAdmin } from "@/lib/adminAuth";
import AdminMembersPanel from "@/components/AdminMembersPanel";
import AdminSettingsPanel from "@/components/AdminSettingsPanel";
import AdminMatchesPanel from "@/components/AdminMatchesPanel";

export default function AdminPage() {
  const [adminReady, setAdminReady] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPasscode, setAdminPasscode] = useState("");
  const [adminError, setAdminError] = useState("");

  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  const [homeTeamCode, setHomeTeamCode] = useState("");
  const [awayTeamCode, setAwayTeamCode] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");

  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [actualHomeScore, setActualHomeScore] = useState("");
  const [actualAwayScore, setActualAwayScore] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [undoing, setUndoing] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unlocked = isAdminUnlocked();
    setAdminUnlocked(unlocked);
    setAdminReady(true);
  }, []);

  useEffect(() => {
    if (adminUnlocked) {
      loadData();
    }
  }, [adminUnlocked]);

  async function loadData() {
    try {
      setLoading(true);

      const [teamsData, matchesData] = await Promise.all([
        getTeams(),
        getAllMatches(),
      ]);

      setTeams(teamsData);
      setMatches(matchesData);
    } catch (err) {
      console.error(err);
      setError("تعذر تحميل بيانات لوحة التحكم");
    } finally {
      setLoading(false);
    }
  }

  function handleAdminLogin(event: FormEvent) {
    event.preventDefault();

    setAdminError("");

    try {
      unlockAdmin(adminUsername, adminPasscode);
      setAdminUnlocked(true);
      setAdminUsername("");
      setAdminPasscode("");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "تعذر تسجيل الدخول";
      setAdminError(errorMessage);
    }
  }

  function handleAdminLogout() {
    lockAdmin();
    setAdminUnlocked(false);
  }

  function getSelectedTeam(code: string) {
    return teams.find((team) => team.code === code);
  }

  function getSelectedMatch() {
    return matches.find((match) => match.id === selectedMatchId);
  }

  async function handleAddMatch(event: FormEvent) {
    event.preventDefault();

    setMessage("");
    setError("");

    const homeTeam = getSelectedTeam(homeTeamCode);
    const awayTeam = getSelectedTeam(awayTeamCode);

    if (!homeTeam || !awayTeam) {
      setError("اختر الفريقين بشكل صحيح");
      return;
    }

    if (homeTeam.code === awayTeam.code) {
      setError("لا يمكن اختيار نفس الفريق في المباراة");
      return;
    }

    setSaving(true);

    try {
      await addMatch({
        homeTeamCode: homeTeam.code,
        homeTeamName: homeTeam.nameAr,
        homeTeamEmoji: homeTeam.emoji,

        awayTeamCode: awayTeam.code,
        awayTeamName: awayTeam.nameAr,
        awayTeamEmoji: awayTeam.emoji,

        matchDate,
        matchTime,
      });

      setMessage("تمت إضافة المباراة بنجاح وستظهر في صفحة الجمهور حسب تاريخها.");
      setHomeTeamCode("");
      setAwayTeamCode("");
      setMatchDate("");
      setMatchTime("");

      await loadData();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء إضافة المباراة";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function handleCalculateMatch(event: FormEvent) {
    event.preventDefault();

    setMessage("");
    setError("");

    const homeScore = Number(actualHomeScore);
    const awayScore = Number(actualAwayScore);

    if (!selectedMatchId) {
      setError("اختر المباراة المراد احتسابها");
      return;
    }

    if (
      actualHomeScore === "" ||
      actualAwayScore === "" ||
      Number.isNaN(homeScore) ||
      Number.isNaN(awayScore)
    ) {
      setError("أدخل النتيجة الصحيحة كاملة");
      return;
    }

    const confirmed = window.confirm(
      "هل أنت متأكد من احتساب هذه المباراة؟ سيتم توزيع النقاط على جميع الأعضاء."
    );

    if (!confirmed) return;

    setCalculating(true);

    try {
      const result = await calculateMatchResult({
        matchId: selectedMatchId,
        actualHomeScore: homeScore,
        actualAwayScore: awayScore,
      });

      setMessage(
        `تم احتساب المباراة بنجاح. عدد التوقعات: ${result.totalPredictions}، بالملي: ${result.exactCount}، الفائز/التعادل الصحيح: ${result.winnerCount}، الخطأ: ${result.wrongCount}.`
      );

      setSelectedMatchId("");
      setActualHomeScore("");
      setActualAwayScore("");

      await loadData();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء احتساب المباراة";
      setError(errorMessage);
    } finally {
      setCalculating(false);
    }
  }

  async function handleUndoCalculation() {
    setMessage("");
    setError("");

    if (!selectedMatchId) {
      setError("اختر المباراة المراد التراجع عن احتسابها");
      return;
    }

    const selectedMatch = getSelectedMatch();

    const confirmed = window.confirm(
      `هل أنت متأكد من التراجع عن احتساب هذه المباراة؟\n\n${
        selectedMatch
          ? `${selectedMatch.homeTeamName} × ${selectedMatch.awayTeamName}`
          : ""
      }\n\nسيتم حذف نقاط هذه المباراة من جميع الأعضاء وإعادة ترتيب لوحة الصدارة.`
    );

    if (!confirmed) return;

    setUndoing(true);

    try {
      const result = await undoMatchCalculation(selectedMatchId);

      setMessage(
        `تم التراجع عن احتساب المباراة بنجاح. تم إرجاع ${result.undonePredictions} توقع إلى حالة غير محتسب.`
      );

      setSelectedMatchId("");
      setActualHomeScore("");
      setActualAwayScore("");

      await loadData();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء التراجع عن الحسبة";
      setError(errorMessage);
    } finally {
      setUndoing(false);
    }
  }

  const selectedMatch = getSelectedMatch();

  if (!adminReady) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 text-white"
      >
        <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-center shadow-2xl">
          جاري التحقق...
        </div>
      </main>
    );
  }

  if (!adminUnlocked) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 text-white"
      >
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mb-3 text-4xl">🔐</div>
            <h1 className="text-2xl font-black">دخول لوحة التحكم</h1>
            <p className="mt-2 text-sm text-slate-300">
              هذه الصفحة خاصة بإدارة المنصة.
            </p>
          </div>

          {adminError && (
            <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-center text-sm text-red-100">
              {adminError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold">
                اسم المستخدم
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(event) => setAdminUsername(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:border-amber-400"
                placeholder="admin"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">رمز الدخول</label>
              <input
                type="password"
                value={adminPasscode}
                onChange={(event) => setAdminPasscode(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:border-amber-400"
                placeholder="••••"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950 transition hover:bg-amber-300"
            >
              دخول
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 text-white"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-black">لوحة التحكم</h1>
              <p className="mt-2 text-sm text-slate-300">
                إدارة مباريات ونتائج وأعضاء وإعدادات منصة توقعات كأس العالم 2026.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAdminLogout}
              className="rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white hover:bg-red-400"
            >
              خروج من الأدمن
            </button>
          </div>
        </header>

        {(message || error) && (
          <div className="mb-6 space-y-3">
            {message && (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 p-4 text-sm text-emerald-200">
                {message}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/15 p-4 text-sm text-red-200">
                {error}
              </div>
            )}
          </div>
        )}

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-black">إضافة مباراة جديدة</h2>

            <form onSubmit={handleAddMatch} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold">
                  الفريق الأول
                </label>
                <select
                  value={homeTeamCode}
                  onChange={(event) => setHomeTeamCode(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-amber-400"
                  required
                >
                  <option value="">اختر الفريق الأول</option>
                  {teams.map((team) => (
                    <option key={team.code} value={team.code}>
                      {team.emoji} {team.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-center text-sm font-black text-amber-300">
                VS
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  الفريق الثاني
                </label>
                <select
                  value={awayTeamCode}
                  onChange={(event) => setAwayTeamCode(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-amber-400"
                  required
                >
                  <option value="">اختر الفريق الثاني</option>
                  {teams.map((team) => (
                    <option key={team.code} value={team.code}>
                      {team.emoji} {team.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  تاريخ المباراة
                </label>
                <input
                  type="date"
                  value={matchDate}
                  onChange={(event) => setMatchDate(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  وقت المباراة بتوقيت مكة
                </label>
                <input
                  type="time"
                  value={matchTime}
                  onChange={(event) => setMatchTime(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-amber-400"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving || loading}
                className="w-full rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
              >
                {saving ? "جاري الإضافة..." : "إضافة المباراة"}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-black">احتساب نتيجة مباراة</h2>

            <form onSubmit={handleCalculateMatch} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold">
                  اختر المباراة
                </label>

                <select
                  value={selectedMatchId}
                  onChange={(event) => setSelectedMatchId(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-amber-400"
                  required
                >
                  <option value="">اختر مباراة للاحتساب</option>

                  {matches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {match.homeTeamName} × {match.awayTeamName} -{" "}
                      {match.matchDate} {match.matchTime}
                    </option>
                  ))}
                </select>
              </div>

              {selectedMatch && (
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-center">
                  <div className="mb-2 text-xs text-slate-300">
                    {selectedMatch.matchDay} • {selectedMatch.matchDate} •{" "}
                    {selectedMatch.matchTime} بتوقيت مكة
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div>
                      <div className="text-3xl">
                        {selectedMatch.homeTeamEmoji}
                      </div>
                      <div className="font-black">
                        {selectedMatch.homeTeamName}
                      </div>
                    </div>

                    <div className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-amber-300">
                      VS
                    </div>

                    <div>
                      <div className="text-3xl">
                        {selectedMatch.awayTeamEmoji}
                      </div>
                      <div className="font-black">
                        {selectedMatch.awayTeamName}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-bold">
                    نتيجة الفريق الأول
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={actualHomeScore}
                    onChange={(event) => setActualHomeScore(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-center text-xl font-black text-slate-950 outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    نتيجة الفريق الثاني
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={actualAwayScore}
                    onChange={(event) => setActualAwayScore(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-center text-xl font-black text-slate-950 outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={calculating || undoing || loading}
                className="w-full rounded-xl bg-emerald-400 px-4 py-3 font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
              >
                {calculating ? "جاري الاحتساب..." : "احتساب لجميع الأعضاء"}
              </button>

              <button
                type="button"
                onClick={handleUndoCalculation}
                disabled={undoing || calculating || loading || !selectedMatchId}
                className="w-full rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-3 font-black text-red-200 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {undoing ? "جاري التراجع..." : "تراجع عن الحسبة"}
              </button>

              <p className="text-xs leading-6 text-slate-300">
                يتم توزيع النقاط تلقائيًا: النتيجة الصحيحة +3، توقع الفائز أو
                التعادل الصحيح +1، التوقع الخاطئ +0. وزر التراجع يعيد المباراة
                إلى حالة غير محتسبة ويحذف نقاطها من جميع الأعضاء.
              </p>
            </form>
          </div>
        </section>

        <div className="mt-6">
          <AdminSettingsPanel />
        </div>

        <div className="mt-6">
          <AdminMembersPanel />
        </div>

        <div className="mt-6">
          <AdminMatchesPanel matches={matches} loading={loading} />
        </div>
      </div>
    </main>
  );
}