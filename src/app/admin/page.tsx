"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { addMatch, getAllMatches, Match } from "@/lib/matches";
import { getTeams, Team } from "@/lib/teams";
import { calculateMatchResult, undoMatchCalculation } from "@/lib/scoring";
import { isAdminUnlocked, lockAdmin, unlockAdmin } from "@/lib/adminAuth";
import { addAdminLog } from "@/lib/adminLogs";
import AdminOverviewPanel from "@/components/AdminOverviewPanel";
import AdminMembersPanel from "@/components/AdminMembersPanel";
import AdminSettingsPanel from "@/components/AdminSettingsPanel";
import AdminMatchesPanel from "@/components/AdminMatchesPanel";
import AdminLogsPanel from "@/components/AdminLogsPanel";
import AdminPredictionsPanel from "@/components/AdminPredictionsPanel";
import AdminHomeBannerPanel from "@/components/AdminHomeBannerPanel";

type AdminTab =
  | "overview"
  | "add"
  | "calculate"
  | "settings"
  | "banner"
  | "members"
  | "predictions"
  | "matches"
  | "logs";

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDefaultTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 30);

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function formatMatchLabel(match: Match) {
  return `${match.homeTeamEmoji} ${match.homeTeamName} × ${match.awayTeamName} ${match.awayTeamEmoji}`;
}

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const [username, setUsername] = useState("");
  const [passcode, setPasscode] = useState("");

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const [homeTeamCode, setHomeTeamCode] = useState("");
  const [awayTeamCode, setAwayTeamCode] = useState("");
  const [matchDate, setMatchDate] = useState(toDateInputValue(new Date()));
  const [matchTime, setMatchTime] = useState(getDefaultTime());
  const [addingMatch, setAddingMatch] = useState(false);

  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [actualHomeScore, setActualHomeScore] = useState("");
  const [actualAwayScore, setActualAwayScore] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [undoing, setUndoing] = useState(false);

  const selectedMatch = useMemo(() => {
    return matches.find((match) => match.id === selectedMatchId) || null;
  }, [matches, selectedMatchId]);

  const scheduledMatches = useMemo(() => {
    return matches.filter((match) => !match.resultCalculated);
  }, [matches]);

  const calculatedMatches = useMemo(() => {
    return matches.filter((match) => match.resultCalculated);
  }, [matches]);

  async function loadData() {
    try {
      setLoading(true);

      const [teamsData, matchesData] = await Promise.all([
        getTeams(),
        getAllMatches(),
      ]);

      setTeams(teamsData);
      setMatches(matchesData);

      if (!homeTeamCode && teamsData[0]) {
        setHomeTeamCode(teamsData[0].code);
      }

      if (!awayTeamCode && teamsData[1]) {
        setAwayTeamCode(teamsData[1].code);
      }

      if (!selectedMatchId && matchesData[0]) {
        setSelectedMatchId(matchesData[0].id);
      }
    } catch (error) {
      console.error("Admin load data error:", error);
      alert("تعذر تحميل بيانات الأدمن");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setUnlocked(isAdminUnlocked());
    setCheckingAccess(false);
  }, []);

  useEffect(() => {
    if (unlocked) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      unlockAdmin(username, passcode);
      setUnlocked(true);
      setUsername("");
      setPasscode("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "تعذر دخول الأدمن");
    }
  }

  function handleLogout() {
    lockAdmin();
    setUnlocked(false);
  }

  async function handleAddMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!homeTeamCode || !awayTeamCode) {
      alert("اختر المنتخبين");
      return;
    }

    if (homeTeamCode === awayTeamCode) {
      alert("لا يمكن اختيار نفس المنتخبين");
      return;
    }

    if (!matchDate || !matchTime) {
      alert("أدخل التاريخ والوقت");
      return;
    }

    const homeTeam = teams.find((team) => team.code === homeTeamCode);
    const awayTeam = teams.find((team) => team.code === awayTeamCode);

    if (!homeTeam || !awayTeam) {
      alert("بيانات المنتخب غير صحيحة");
      return;
    }

    try {
      setAddingMatch(true);

      const newMatch = await addMatch({
        homeTeam,
        awayTeam,
        matchDate,
        matchTime,
      });

      await addAdminLog({
        action: "add_match",
        title: "إضافة مباراة",
        description: `${homeTeam.emoji} ${homeTeam.nameAr} × ${awayTeam.nameAr} ${awayTeam.emoji}`,
        metadata: {
          matchId: newMatch.id,
          matchDate,
          matchTime,
        },
      });

      alert("تمت إضافة المباراة بنجاح");

      setSelectedMatchId(newMatch.id);
      setActiveTab("matches");

      await loadData();
    } catch (error) {
      console.error("Add match error:", error);
      alert(error instanceof Error ? error.message : "تعذر إضافة المباراة");
    } finally {
      setAddingMatch(false);
    }
  }

  async function handleCalculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedMatchId) {
      alert("اختر المباراة");
      return;
    }

    const homeScore = Number(actualHomeScore);
    const awayScore = Number(actualAwayScore);

    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      alert("أدخل نتيجة صحيحة");
      return;
    }

    try {
      setCalculating(true);

      await calculateMatchResult({
        matchId: selectedMatchId,
        actualHomeScore: homeScore,
        actualAwayScore: awayScore,
      });

      const match = matches.find((item) => item.id === selectedMatchId);

      await addAdminLog({
        action: "calculate_match",
        title: "احتساب نتيجة مباراة",
        description: match
          ? `${formatMatchLabel(match)} — النتيجة ${homeScore} - ${awayScore}`
          : `احتساب مباراة — النتيجة ${homeScore} - ${awayScore}`,
        metadata: {
          matchId: selectedMatchId,
          actualHomeScore: homeScore,
          actualAwayScore: awayScore,
        },
      });

      alert("تم احتساب النتيجة وتحديث النقاط");

      setActualHomeScore("");
      setActualAwayScore("");
      setActiveTab("matches");

      await loadData();
    } catch (error) {
      console.error("Calculate match error:", error);
      alert(error instanceof Error ? error.message : "تعذر احتساب النتيجة");
    } finally {
      setCalculating(false);
    }
  }

  async function handleUndoCalculation() {
    if (!selectedMatchId) {
      alert("اختر المباراة");
      return;
    }

    const match = matches.find((item) => item.id === selectedMatchId);

    const confirmed = confirm(
      "هل أنت متأكد من التراجع عن احتساب هذه المباراة؟ سيتم تحديث نقاط الأعضاء من جديد."
    );

    if (!confirmed) return;

    try {
      setUndoing(true);

      await undoMatchCalculation(selectedMatchId);

      await addAdminLog({
        action: "undo_match_calculation",
        title: "تراجع عن احتساب مباراة",
        description: match
          ? `تم التراجع عن احتساب ${formatMatchLabel(match)}`
          : "تم التراجع عن احتساب مباراة",
        metadata: {
          matchId: selectedMatchId,
        },
      });

      alert("تم التراجع عن الاحتساب");

      setActualHomeScore("");
      setActualAwayScore("");

      await loadData();
    } catch (error) {
      console.error("Undo calculation error:", error);
      alert(error instanceof Error ? error.message : "تعذر التراجع عن الاحتساب");
    } finally {
      setUndoing(false);
    }
  }

  if (checkingAccess) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white"
      >
        <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-center">
          جاري التحقق...
        </div>
      </main>
    );
  }

  if (!unlocked) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 text-white"
      >
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl"
        >
          <div className="mb-5 text-center">
            <div className="mx-auto mb-3 h-16 w-16 overflow-hidden rounded-3xl border border-white/20 bg-white/10">
              <img
                src="/wc2026-logo.png"
                alt="شعار منصة توقعات كأس العالم 2026"
                className="h-full w-full object-contain p-2"
              />
            </div>

            <h1 className="text-2xl font-black">دخول الأدمن</h1>
            <p className="mt-2 text-sm text-slate-300">
              لوحة تحكم منصة توقعات كأس العالم 2026
            </p>
          </div>

          <div className="space-y-3">
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="اسم المستخدم"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-amber-400"
            />

            <input
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              placeholder="كلمة المرور"
              type="password"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-amber-400"
            />

            <button
              type="submit"
              className="w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300"
            >
              دخول
            </button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-3 text-white md:p-5"
    >
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-black md:text-3xl">
                لوحة تحكم الأدمن
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                إدارة المباريات، النتائج، الأعضاء، التوقعات، والإعدادات.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadData}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10"
              >
                تحديث البيانات
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white hover:bg-red-400"
              >
                خروج الأدمن
              </button>
            </div>
          </div>
        </header>

        <nav className="mb-5 flex flex-wrap gap-2 rounded-3xl border border-white/10 bg-white/10 p-3 shadow-2xl">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`rounded-xl px-3 py-2 text-sm font-bold ${
              activeTab === "overview"
                ? "bg-amber-400 text-slate-950"
                : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            📊 نظرة عامة
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("add")}
            className={`rounded-xl px-3 py-2 text-sm font-bold ${
              activeTab === "add"
                ? "bg-amber-400 text-slate-950"
                : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            ➕ إضافة مباراة
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("calculate")}
            className={`rounded-xl px-3 py-2 text-sm font-bold ${
              activeTab === "calculate"
                ? "bg-amber-400 text-slate-950"
                : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            🧮 احتساب النتائج
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`rounded-xl px-3 py-2 text-sm font-bold ${
              activeTab === "settings"
                ? "bg-amber-400 text-slate-950"
                : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            ⚙️ إعدادات الشرائط
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("banner")}
            className={`rounded-xl px-3 py-2 text-sm font-bold ${
              activeTab === "banner"
                ? "bg-amber-400 text-slate-950"
                : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            🖼️ البانر
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("members")}
            className={`rounded-xl px-3 py-2 text-sm font-bold ${
              activeTab === "members"
                ? "bg-amber-400 text-slate-950"
                : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            👥 إدارة الأعضاء
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("predictions")}
            className={`rounded-xl px-3 py-2 text-sm font-bold ${
              activeTab === "predictions"
                ? "bg-amber-400 text-slate-950"
                : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            🔮 توقعات الأعضاء
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("matches")}
            className={`rounded-xl px-3 py-2 text-sm font-bold ${
              activeTab === "matches"
                ? "bg-amber-400 text-slate-950"
                : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            📅 المباريات
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`rounded-xl px-3 py-2 text-sm font-bold ${
              activeTab === "logs"
                ? "bg-amber-400 text-slate-950"
                : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            📝 السجل
          </button>
        </nav>

        {activeTab === "overview" && <AdminOverviewPanel />}

        {activeTab === "add" && (
          <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
            <div className="mb-4">
              <h2 className="text-xl font-black md:text-2xl">
                ➕ إضافة مباراة
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                أضف مباراة جديدة لتظهر في صندوق التوقعات حسب وقتها.
              </p>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
                جاري تحميل المنتخبات...
              </div>
            ) : (
              <form onSubmit={handleAddMatch} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold">
                      المنتخب الأول
                    </span>
                    <select
                      value={homeTeamCode}
                      onChange={(event) => setHomeTeamCode(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-amber-400"
                    >
                      {teams.map((team) => (
                        <option key={team.code} value={team.code}>
                          {team.emoji} {team.nameAr}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold">
                      المنتخب الثاني
                    </span>
                    <select
                      value={awayTeamCode}
                      onChange={(event) => setAwayTeamCode(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-amber-400"
                    >
                      {teams.map((team) => (
                        <option key={team.code} value={team.code}>
                          {team.emoji} {team.nameAr}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold">
                      تاريخ المباراة
                    </span>
                    <input
                      type="date"
                      value={matchDate}
                      onChange={(event) => setMatchDate(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-amber-400"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold">
                      وقت المباراة
                    </span>
                    <input
                      type="time"
                      value={matchTime}
                      onChange={(event) => setMatchTime(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-amber-400"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={addingMatch}
                  className="w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {addingMatch ? "جاري الإضافة..." : "إضافة المباراة"}
                </button>
              </form>
            )}
          </section>
        )}

        {activeTab === "calculate" && (
          <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
            <div className="mb-4">
              <h2 className="text-xl font-black md:text-2xl">
                🧮 احتساب النتائج
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                اختر مباراة وأدخل النتيجة الفعلية لتحديث نقاط جميع الأعضاء.
              </p>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
                جاري تحميل المباريات...
              </div>
            ) : matches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
                لا توجد مباريات حتى الآن.
              </div>
            ) : (
              <form onSubmit={handleCalculate} className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold">
                    اختر المباراة
                  </span>
                  <select
                    value={selectedMatchId}
                    onChange={(event) => {
                      setSelectedMatchId(event.target.value);
                      setActualHomeScore("");
                      setActualAwayScore("");
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-amber-400"
                  >
                    {matches.map((match) => (
                      <option key={match.id} value={match.id}>
                        {formatMatchLabel(match)}{" "}
                        {match.resultCalculated ? "— محتسبة" : "— غير محتسبة"}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedMatch && (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="text-center text-lg font-black">
                      {formatMatchLabel(selectedMatch)}
                    </div>

                    <div className="mt-2 text-center text-sm text-slate-300">
                      الحالة:{" "}
                      {selectedMatch.resultCalculated
                        ? "محتسبة"
                        : "لم تُحتسب"}
                    </div>

                    {selectedMatch.resultCalculated && (
                      <div className="mt-2 text-center text-sm text-emerald-200">
                        النتيجة الحالية:{" "}
                        <strong>
                          {selectedMatch.actualHomeScore} -{" "}
                          {selectedMatch.actualAwayScore}
                        </strong>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold">
                      نتيجة المنتخب الأول
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={actualHomeScore}
                      onChange={(event) =>
                        setActualHomeScore(event.target.value)
                      }
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-center text-lg font-black outline-none focus:border-amber-400"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold">
                      نتيجة المنتخب الثاني
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={actualAwayScore}
                      onChange={(event) =>
                        setActualAwayScore(event.target.value)
                      }
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-center text-lg font-black outline-none focus:border-amber-400"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <button
                    type="submit"
                    disabled={calculating}
                    className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {calculating ? "جاري الاحتساب..." : "احتساب النتيجة"}
                  </button>

                  <button
                    type="button"
                    disabled={undoing || !selectedMatch?.resultCalculated}
                    onClick={handleUndoCalculation}
                    className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-black text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {undoing ? "جاري التراجع..." : "تراجع عن الاحتساب"}
                  </button>
                </div>

                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-7 text-amber-100">
                  <strong>تنبيه:</strong> عند احتساب النتيجة سيتم تحديث كل
                  التوقعات المرتبطة بالمباراة، ثم إعادة بناء إحصائيات جميع
                  الأعضاء ولوحة الصدارة.
                </div>
              </form>
            )}

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="text-sm text-slate-300">مباريات غير محتسبة</div>
                <div className="mt-1 text-3xl font-black">
                  {scheduledMatches.length}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="text-sm text-slate-300">مباريات محتسبة</div>
                <div className="mt-1 text-3xl font-black">
                  {calculatedMatches.length}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "settings" && <AdminSettingsPanel />}

        {activeTab === "banner" && <AdminHomeBannerPanel />}

        {activeTab === "members" && <AdminMembersPanel />}

        {activeTab === "predictions" && <AdminPredictionsPanel />}

        {activeTab === "matches" && (
          <AdminMatchesPanel
            matches={matches}
            loading={loading}
            onChanged={loadData}
          />
        )}

        {activeTab === "logs" && <AdminLogsPanel />}
      </div>
    </main>
  );
}