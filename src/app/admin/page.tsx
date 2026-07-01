"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addMatch,
  getAllMatches,
  type Match,
  type MatchStage,
  type PredictionType,
} from "@/lib/matches";
import { getTeams, Team } from "@/lib/teams";
import { calculateMatchResult, undoMatchCalculation } from "@/lib/scoring";
import { listenAdminAccess, lockAdmin, unlockAdmin } from "@/lib/adminAuth";
import { addAdminLog } from "@/lib/adminLogs";
import AdminOverviewPanel from "@/components/AdminOverviewPanel";
import AdminMembersPanel from "@/components/AdminMembersPanel";
import AdminSettingsPanel from "@/components/AdminSettingsPanel";
import AdminMatchesPanel from "@/components/AdminMatchesPanel";
import AdminLogsPanel from "@/components/AdminLogsPanel";
import AdminPredictionsPanel from "@/components/AdminPredictionsPanel";
import AdminHomeBannerPanel from "@/components/AdminHomeBannerPanel";
import AdminWordGamePanel from "@/components/AdminWordGamePanel";
import AdminChallengeStudioPanel from "@/components/AdminChallengeStudioPanel";

type AdminTab =
  | "overview"
  | "add"
  | "calculate"
  | "settings"
  | "banner"
  | "members"
  | "predictions"
  | "matches"
 | "wordGame"
| "challengeStudio"
| "logs";

type CalculateFilter = "pending" | "calculated" | "all";

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

function formatCalculateMatchLabel(match: Match) {
  const statusText = match.resultCalculated ? "محتسبة" : "غير محتسبة";

  return `${match.homeTeamEmoji} ${match.homeTeamName} × ${match.awayTeamEmoji} ${match.awayTeamName} — ${getMatchStageLabel(
    match.matchStage
  )} — ${getPredictionTypeLabel(match.predictionType)} — ${statusText}`;
}

function getPredictionTypeLabel(type?: PredictionType) {
  return type === "golden" ? "توقع ذهبي" : "توقع عادي";
}

function getPredictionTypeHint(type?: PredictionType) {
  return type === "golden"
    ? "بالملي +6 | الفائز الصحيح +2 | الخطأ 0"
    : "حسب نظام النقاط العادي الحالي";
}

function getMatchStageLabel(stage?: MatchStage) {
  return stage === "knockout" ? "خروج مغلوب" : "دور المجموعات";
}

function getMatchStageHint(stage?: MatchStage) {
  return stage === "knockout"
    ? "خروج المغلوب: عند التعادل يظهر اختيار المتأهل وطريقة التأهل."
    : "دور المجموعات: توقع نتيجة المباراة فقط.";
}

function getMatchTimeValue(match: Match) {
  const time = new Date(match.startAt).getTime();
  return Number.isFinite(time) ? time : 0;
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
  const [predictionType, setPredictionType] =
    useState<PredictionType>("normal");
  const [matchStage, setMatchStage] = useState<MatchStage>("group");
  const [addingMatch, setAddingMatch] = useState(false);

  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [actualHomeScore, setActualHomeScore] = useState("");
  const [actualAwayScore, setActualAwayScore] = useState("");
  const [actualQualifiedTeamCode, setActualQualifiedTeamCode] = useState("");
  const [actualQualificationMethod, setActualQualificationMethod] =
    useState("");
  const [calculateFilter, setCalculateFilter] =
    useState<CalculateFilter>("pending");
  const [calculateSearchTerm, setCalculateSearchTerm] = useState("");
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

  const calculateMatches = useMemo(() => {
    const search = calculateSearchTerm.trim().toLowerCase();

    return [...matches]
      .filter((match) => {
        if (calculateFilter === "pending" && match.resultCalculated) {
          return false;
        }

        if (calculateFilter === "calculated" && !match.resultCalculated) {
          return false;
        }

        if (!search) return true;

        const searchableText = [
          match.homeTeamName,
          match.homeTeamCode,
          match.awayTeamName,
          match.awayTeamCode,
          getPredictionTypeLabel(match.predictionType),
          getMatchStageLabel(match.matchStage),
          match.resultCalculated ? "محتسبة" : "غير محتسبة",
          match.matchDate,
          match.matchTime,
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(search);
      })
      .sort((a, b) => {
        if (a.resultCalculated !== b.resultCalculated) {
          return a.resultCalculated ? 1 : -1;
        }

        return getMatchTimeValue(a) - getMatchTimeValue(b);
      });
  }, [matches, calculateFilter, calculateSearchTerm]);

  const isSelectedKnockoutDraw = useMemo(() => {
    if (!selectedMatch) return false;

    const homeScore = Number(actualHomeScore);
    const awayScore = Number(actualAwayScore);

    return (
      selectedMatch.matchStage === "knockout" &&
      Number.isInteger(homeScore) &&
      Number.isInteger(awayScore) &&
      actualHomeScore !== "" &&
      actualAwayScore !== "" &&
      homeScore === awayScore
    );
  }, [selectedMatch, actualHomeScore, actualAwayScore]);

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

      if (!selectedMatchId) {
        const firstPendingMatch =
          matchesData.find((match) => !match.resultCalculated) ||
          matchesData[0];

        if (firstPendingMatch) {
          setSelectedMatchId(firstPendingMatch.id);
        }
      }
    } catch (error) {
      console.error("Admin load data error:", error);
      alert("تعذر تحميل بيانات الأدمن");
    } finally {
      setLoading(false);
    }
  }

 useEffect(() => {
  const unsubscribe = listenAdminAccess((result) => {
    setUnlocked(result.unlocked);
    setCheckingAccess(result.loading);
  });

  return () => unsubscribe();
}, []);

  useEffect(() => {
    if (unlocked) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  useEffect(() => {
    if (activeTab !== "calculate") return;
    if (calculateMatches.length === 0) return;

    const selectedExists = calculateMatches.some(
      (match) => match.id === selectedMatchId
    );

    if (!selectedExists) {
      setSelectedMatchId(calculateMatches[0].id);
      setActualHomeScore("");
      setActualAwayScore("");
      setActualQualifiedTeamCode("");
      setActualQualificationMethod("");
    }
  }, [activeTab, calculateMatches, selectedMatchId]);

 async function handleLogin(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  try {
    setCheckingAccess(true);

    await unlockAdmin(username, passcode);

    setUsername("");
    setPasscode("");
  } catch (error) {
    setCheckingAccess(false);
    alert(error instanceof Error ? error.message : "تعذر دخول الأدمن");
  }
}

 async function handleLogout() {
  try {
    await lockAdmin();
    setUnlocked(false);
  } catch (error) {
    console.error("Admin logout error:", error);
    alert("تعذر تسجيل خروج الأدمن");
  }
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
        predictionType,
        matchStage,
      });

      await addAdminLog({
        action: "add_match",
        title: "إضافة مباراة",
        description: `${homeTeam.emoji} ${homeTeam.nameAr} × ${awayTeam.nameAr} ${awayTeam.emoji}`,
        metadata: {
          matchId: newMatch.id,
          matchDate,
          matchTime,
          predictionType,
          matchStage,
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

    const knockoutDraw =
      selectedMatch?.matchStage === "knockout" && homeScore === awayScore;

    if (knockoutDraw && !actualQualifiedTeamCode) {
      alert("اختر المنتخب المتأهل");
      return;
    }

    if (knockoutDraw && !actualQualificationMethod) {
      alert("اختر طريقة التأهل");
      return;
    }

    try {
      setCalculating(true);

      await calculateMatchResult({
        matchId: selectedMatchId,
        actualHomeScore: homeScore,
        actualAwayScore: awayScore,
        actualQualifiedTeamCode: knockoutDraw
          ? actualQualifiedTeamCode
          : undefined,
        actualQualificationMethod: knockoutDraw
          ? (actualQualificationMethod as "extraTime" | "penalties")
          : undefined,
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
          actualQualifiedTeamCode: knockoutDraw
            ? actualQualifiedTeamCode
            : null,
          actualQualificationMethod: knockoutDraw
            ? actualQualificationMethod
            : null,
        },
      });

      alert("تم احتساب النتيجة وتحديث النقاط");

      setActualHomeScore("");
      setActualAwayScore("");
      setActualQualifiedTeamCode("");
      setActualQualificationMethod("");
      setCalculateFilter("pending");
      setCalculateSearchTerm("");
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
      setActualQualifiedTeamCode("");
      setActualQualificationMethod("");

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
              placeholder="إيميل الأدمن"
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
          {[
            ["overview", "📊 نظرة عامة"],
            ["add", "➕ إضافة مباراة"],
            ["calculate", "🧮 احتساب النتائج"],
            ["settings", "⚙️ إعدادات الشرائط"],
            ["banner", "🖼️ البانر"],
            ["members", "👥 إدارة الأعضاء"],
            ["predictions", "🔮 توقعات الأعضاء"],
            ["matches", "📅 المباريات"],
            ["wordGame", "🎮 لعبة الكلمة"],
            ["challengeStudio", "🎙️ استوديو التحدي"],
            ["logs", "📝 السجل"],
          ].map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab as AdminTab)}
              className={`rounded-xl px-3 py-2 text-sm font-bold ${
                activeTab === tab
                  ? "bg-amber-400 text-slate-950"
                  : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
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

                <label className="block">
                  <span className="mb-2 block text-sm font-bold">
                    نوع التوقع
                  </span>

                  <select
                    value={predictionType}
                    onChange={(event) =>
                      setPredictionType(event.target.value as PredictionType)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-amber-400"
                  >
                    <option value="normal">توقع عادي</option>
                    <option value="golden">توقع ذهبي</option>
                  </select>

                  <div className="mt-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-6 text-amber-100">
                    {predictionType === "golden"
                      ? "التوقع الذهبي: بالملي +6، الفائز الصحيح +2، الخطأ 0"
                      : "التوقع العادي: يبقى على نظام النقاط الحالي بدون تغيير"}
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold">
                    نوع المرحلة
                  </span>

                  <select
                    value={matchStage}
                    onChange={(event) =>
                      setMatchStage(event.target.value as MatchStage)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-amber-400"
                  >
                    <option value="group">دور المجموعات</option>
                    <option value="knockout">خروج مغلوب</option>
                  </select>

                  <div className="mt-2 rounded-2xl border border-blue-400/20 bg-blue-400/10 p-3 text-xs leading-6 text-blue-100">
                    {getMatchStageHint(matchStage)}
                  </div>
                </label>

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
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold">
                      بحث سريع
                    </span>
                    <input
                      type="text"
                      value={calculateSearchTerm}
                      onChange={(event) =>
                        setCalculateSearchTerm(event.target.value)
                      }
                      placeholder="ابحث باسم المنتخب أو الكود أو نوع المباراة"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-amber-400"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold">
                      عرض المباريات
                    </span>
                    <select
                      value={calculateFilter}
                      onChange={(event) =>
                        setCalculateFilter(event.target.value as CalculateFilter)
                      }
                      className="w-full min-w-[220px] rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-amber-400"
                    >
                      <option value="pending">غير المحتسبة فقط</option>
                      <option value="calculated">المحتسبة فقط</option>
                      <option value="all">كل المباريات</option>
                    </select>
                  </label>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-xs leading-6 text-slate-200">
                  المعروض الآن:{" "}
                  <span className="font-black text-amber-300">
                    {calculateMatches.length}
                  </span>{" "}
                  مباراة
                  {calculateFilter === "pending" &&
                    " — يتم عرض غير المحتسبة أولًا لتسريع الاحتساب."}
                </div>

                {calculateMatches.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-6 text-center text-sm text-slate-300">
                    لا توجد مباريات مطابقة للبحث أو الفلتر الحالي.
                  </div>
                ) : (
                  <>
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
                          setActualQualifiedTeamCode("");
                          setActualQualificationMethod("");
                        }}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-amber-400"
                      >
                        {calculateMatches.map((match) => (
                          <option key={match.id} value={match.id}>
                            {formatCalculateMatchLabel(match)}
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

                        <div className="mt-2 text-center text-sm text-amber-200">
                          نوع التوقع:{" "}
                          <strong>
                            {getPredictionTypeLabel(
                              selectedMatch.predictionType
                            )}
                          </strong>
                        </div>

                        <div className="mt-2 text-center text-sm text-blue-200">
                          نوع المرحلة:{" "}
                          <strong>
                            {getMatchStageLabel(selectedMatch.matchStage)}
                          </strong>
                        </div>

                        <div className="mt-1 text-center text-xs text-slate-300">
                          {getPredictionTypeHint(selectedMatch.predictionType)}
                        </div>

                        <div className="mt-1 text-center text-xs text-slate-300">
                          {getMatchStageHint(selectedMatch.matchStage)}
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

                    {isSelectedKnockoutDraw && selectedMatch && (
                      <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4">
                        <div className="mb-3 text-sm font-black text-blue-100">
                          نتيجة تعادل في خروج المغلوب: اختر المتأهل وطريقة
                          التأهل
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <label className="block">
                            <span className="mb-2 block text-sm font-bold">
                              المنتخب المتأهل
                            </span>

                            <select
                              value={actualQualifiedTeamCode}
                              onChange={(event) =>
                                setActualQualifiedTeamCode(event.target.value)
                              }
                              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-blue-400"
                            >
                              <option value="">اختر المتأهل</option>
                              <option value={selectedMatch.homeTeamCode}>
                                {selectedMatch.homeTeamEmoji}{" "}
                                {selectedMatch.homeTeamName}
                              </option>
                              <option value={selectedMatch.awayTeamCode}>
                                {selectedMatch.awayTeamEmoji}{" "}
                                {selectedMatch.awayTeamName}
                              </option>
                            </select>
                          </label>

                          <label className="block">
                            <span className="mb-2 block text-sm font-bold">
                              طريقة التأهل
                            </span>

                            <select
                              value={actualQualificationMethod}
                              onChange={(event) =>
                                setActualQualificationMethod(event.target.value)
                              }
                              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-blue-400"
                            >
                              <option value="">اختر الطريقة</option>
                              <option value="extraTime">أشواط إضافية</option>
                              <option value="penalties">ركلات ترجيح</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    )}

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
                  </>
                )}

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
        {activeTab === "wordGame" && <AdminWordGamePanel />}
        {activeTab === "challengeStudio" && <AdminChallengeStudioPanel />}
        {activeTab === "logs" && <AdminLogsPanel />}
      </div>
    </main>
  );
}