"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Match, getVisibleMatches } from "@/lib/matches";
import {
  getPredictionEditWindowRemainingMs,
  getUserPredictionForMatch,
  Prediction,
  submitPrediction,
  updatePrediction,
} from "@/lib/predictions";
import { useAuth } from "@/context/AuthContext";

type QualificationMethod = "extraTime" | "penalties";

type PredictionInputs = Record<
  string,
  {
    homeScore: string;
    awayScore: string;
    qualifiedTeamCode: string;
    qualificationMethod: string;
  }
>;

type SavedPredictions = Record<string, Prediction>;

type MatchWithKnockout = Match & {
  matchStage?: "group" | "knockout";
};

function formatDate(matchDate: string) {
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Riyadh",
    }).format(new Date(`${matchDate}T12:00:00+03:00`));
  } catch {
    return matchDate;
  }
}

function formatMatchTimeOnly(startAt: string) {
  try {
    const date = new Date(startAt);

    if (Number.isNaN(date.getTime())) return "";

    const formatted = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Riyadh",
    }).format(date);

    return formatted.replace(/\s/g, "");
  } catch {
    return "";
  }
}

function getCountdownText(startAt: string) {
  const startTime = new Date(startAt).getTime();

  if (!Number.isFinite(startTime)) {
    return "وقت المباراة غير محدد";
  }

  const diff = startTime - Date.now();

  if (diff <= 0) {
    return "انتهى وقت التوقع";
  }

  const totalSeconds = Math.floor(diff / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (days > 0) {
    return `${days} يوم ${hh}:${mm}:${ss}`;
  }

  return `${hh}:${mm}:${ss}`;
}

function formatShortCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function isPredictionClosed(startAt: string) {
  const startTime = new Date(startAt).getTime();

  if (!Number.isFinite(startTime)) return true;

  return Date.now() >= startTime;
}

function toNumber(value: string) {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) ? numberValue : null;
}

function isGoldenMatch(match: Match) {
  return match.predictionType === "golden";
}

function isGoldenPrediction(prediction: Prediction) {
  return prediction.predictionType === "golden";
}

function isKnockoutMatch(match: MatchWithKnockout) {
  return match.matchStage === "knockout";
}

function getQualificationMethodLabel(value?: string | null) {
  if (value === "extraTime") return "أشواط إضافية";
  if (value === "penalties") return "ركلات ترجيح";
  return "";
}

function getQualifiedTeamName(
  match: Match,
  qualifiedTeamCode?: string | null
) {
  if (!qualifiedTeamCode) return "";

  if (qualifiedTeamCode === match.homeTeamCode) {
    return match.homeTeamName;
  }

  if (qualifiedTeamCode === match.awayTeamCode) {
    return match.awayTeamName;
  }

  return qualifiedTeamCode;
}

function getQualifiedTeamEmoji(
  match: Match,
  qualifiedTeamCode?: string | null
) {
  if (!qualifiedTeamCode) return "";

  if (qualifiedTeamCode === match.homeTeamCode) {
    return match.homeTeamEmoji;
  }

  if (qualifiedTeamCode === match.awayTeamCode) {
    return match.awayTeamEmoji;
  }

  return "";
}

export default function MatchesPredictionBox() {
  const router = useRouter();
  const { user, isLoggedIn, loading: authLoading } = useAuth();

  const [matches, setMatches] = useState<Match[]>([]);
  const [inputs, setInputs] = useState<PredictionInputs>({});
  const [savedPredictions, setSavedPredictions] = useState<SavedPredictions>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [savingMatchId, setSavingMatchId] = useState("");
  const [editingMatchId, setEditingMatchId] = useState("");
  const [, setTick] = useState(0);

  async function loadMatches() {
    try {
      setLoading(true);

      const data = await getVisibleMatches();

      setMatches(data);
    } catch (error) {
      console.error("Load matches error:", error);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadSavedPredictions(currentMatches: Match[]) {
    if (!user?.id) {
      setSavedPredictions({});
      return;
    }

    try {
      const entries = await Promise.all(
        currentMatches.map(async (match) => {
          const prediction = await getUserPredictionForMatch(user.id, match.id);
          return [match.id, prediction] as const;
        })
      );

      const nextSaved: SavedPredictions = {};

      entries.forEach(([matchId, prediction]) => {
        if (prediction) {
          nextSaved[matchId] = prediction;
        }
      });

      setSavedPredictions(nextSaved);
    } catch (error) {
      console.error("Load saved predictions error:", error);
    }
  }

  useEffect(() => {
    loadMatches();
  }, []);

  useEffect(() => {
    if (authLoading) return;

    loadSavedPredictions(matches);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, matches.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((current) => current + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    });
  }, [matches]);

  function updateInput(
    matchId: string,
    key:
      | "homeScore"
      | "awayScore"
      | "qualifiedTeamCode"
      | "qualificationMethod",
    value: string
  ) {
    if (
      (key === "homeScore" || key === "awayScore") &&
      value !== "" &&
      !/^\d{0,2}$/.test(value)
    ) {
      return;
    }

    setInputs((current) => ({
      ...current,
      [matchId]: {
        homeScore: current[matchId]?.homeScore || "",
        awayScore: current[matchId]?.awayScore || "",
        qualifiedTeamCode: current[matchId]?.qualifiedTeamCode || "",
        qualificationMethod: current[matchId]?.qualificationMethod || "",
        [key]: value,
      },
    }));
  }

  function getEditRemainingMs(prediction: Prediction, match: Match) {
    if (isPredictionClosed(match.startAt)) return 0;

    return getPredictionEditWindowRemainingMs(prediction, match.startAt);
  }

  function canEditPrediction(prediction: Prediction, match: Match) {
    return !prediction.isCalculated && getEditRemainingMs(prediction, match) > 0;
  }

  function isKnockoutDrawInput(match: MatchWithKnockout) {
    const homeScore = toNumber(inputs[match.id]?.homeScore || "");
    const awayScore = toNumber(inputs[match.id]?.awayScore || "");

    return (
      isKnockoutMatch(match) &&
      homeScore !== null &&
      awayScore !== null &&
      homeScore === awayScore
    );
  }

  function validateKnockoutInput(match: MatchWithKnockout) {
    if (!isKnockoutDrawInput(match)) return true;

    if (!inputs[match.id]?.qualifiedTeamCode) {
      alert("اختر المنتخب المتأهل");
      return false;
    }

    if (!inputs[match.id]?.qualificationMethod) {
      alert("اختر طريقة التأهل");
      return false;
    }

    return true;
  }

  function startEditingPrediction(match: Match, prediction: Prediction) {
    if (!canEditPrediction(prediction, match)) return;

    setEditingMatchId(match.id);
    setInputs((current) => ({
      ...current,
      [match.id]: {
        homeScore: String(prediction.homeScore),
        awayScore: String(prediction.awayScore),
        qualifiedTeamCode: prediction.qualifiedTeamCode || "",
        qualificationMethod: prediction.qualificationMethod || "",
      },
    }));
  }

  function cancelEditingPrediction(matchId: string) {
    setEditingMatchId("");
    setInputs((current) => ({
      ...current,
      [matchId]: {
        homeScore: "",
        awayScore: "",
        qualifiedTeamCode: "",
        qualificationMethod: "",
      },
    }));
  }

  async function handleSubmitPrediction(match: Match) {
    if (!isLoggedIn || !user) {
      router.push("/login");
      return;
    }

    if (isPredictionClosed(match.startAt)) {
      alert("انتهى وقت التوقع لهذه المباراة");
      return;
    }

    const homeScore = toNumber(inputs[match.id]?.homeScore || "");
    const awayScore = toNumber(inputs[match.id]?.awayScore || "");

    if (homeScore === null || awayScore === null) {
      alert("أدخل نتيجة التوقع كاملة");
      return;
    }

    if (homeScore < 0 || awayScore < 0 || homeScore > 30 || awayScore > 30) {
      alert("أدخل نتيجة صحيحة من 0 إلى 30");
      return;
    }

    if (!validateKnockoutInput(match as MatchWithKnockout)) {
      return;
    }

    try {
      setSavingMatchId(match.id);

      const prediction = await submitPrediction({
        userId: user.id,
        userName: user.fullName,

        matchId: match.id,

        homeTeamName: match.homeTeamName,
        homeTeamEmoji: match.homeTeamEmoji,
        awayTeamName: match.awayTeamName,
        awayTeamEmoji: match.awayTeamEmoji,

        homeScore,
        awayScore,
        qualifiedTeamCode: inputs[match.id]?.qualifiedTeamCode || undefined,
        qualificationMethod: (inputs[match.id]?.qualificationMethod ||
          undefined) as QualificationMethod | undefined,
      });

      setSavedPredictions((current) => ({
        ...current,
        [match.id]: prediction,
      }));

      setInputs((current) => ({
        ...current,
        [match.id]: {
          homeScore: "",
          awayScore: "",
          qualifiedTeamCode: "",
          qualificationMethod: "",
        },
      }));

      alert("وصل توقعك واعتمدناه ✅ لا تنسى ترجع وتشوف نتيجتك");
    } catch (error) {
      console.error("Submit prediction error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "تعذر تسجيل التوقع، حاول مرة أخرى"
      );
    } finally {
      setSavingMatchId("");
    }
  }

  async function handleUpdatePrediction(match: Match) {
    if (!isLoggedIn || !user) {
      router.push("/login");
      return;
    }

    const savedPrediction = savedPredictions[match.id];

    if (!savedPrediction || !canEditPrediction(savedPrediction, match)) {
      alert("انتهت مدة تعديل التوقع");
      return;
    }

    const homeScore = toNumber(inputs[match.id]?.homeScore || "");
    const awayScore = toNumber(inputs[match.id]?.awayScore || "");

    if (homeScore === null || awayScore === null) {
      alert("أدخل نتيجة التوقع كاملة");
      return;
    }

    if (homeScore < 0 || awayScore < 0 || homeScore > 30 || awayScore > 30) {
      alert("أدخل نتيجة صحيحة من 0 إلى 30");
      return;
    }

    if (!validateKnockoutInput(match as MatchWithKnockout)) {
      return;
    }

    try {
      setSavingMatchId(match.id);

      const prediction = await updatePrediction({
        userId: user.id,
        matchId: match.id,
        homeScore,
        awayScore,
        qualifiedTeamCode: inputs[match.id]?.qualifiedTeamCode || undefined,
        qualificationMethod: (inputs[match.id]?.qualificationMethod ||
          undefined) as QualificationMethod | undefined,
      });

      setSavedPredictions((current) => ({
        ...current,
        [match.id]: prediction,
      }));

      cancelEditingPrediction(match.id);
      alert("تم تعديل توقعك واعتماد التوقع الجديد");
    } catch (error) {
      console.error("Update prediction error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "تعذر تعديل التوقع، حاول مرة أخرى"
      );
    } finally {
      setSavingMatchId("");
    }
  }

  function renderScoreInputs(match: Match, golden: boolean) {
    return (
      <div className="grid grid-cols-[1fr_28px_1fr] items-center gap-2">
        <input
          inputMode="numeric"
          value={inputs[match.id]?.homeScore || ""}
          onChange={(event) =>
            updateInput(match.id, "homeScore", event.target.value)
          }
          placeholder="0"
          className={`h-14 w-full rounded-2xl border px-3 text-center text-2xl font-black text-white outline-none ${
            golden
              ? "border-amber-300/30 bg-slate-950/90 focus:border-amber-300"
              : "border-white/10 bg-slate-950/80 focus:border-amber-400"
          }`}
        />

        <div className="text-center text-xl font-black text-slate-400">-</div>

        <input
          inputMode="numeric"
          value={inputs[match.id]?.awayScore || ""}
          onChange={(event) =>
            updateInput(match.id, "awayScore", event.target.value)
          }
          placeholder="0"
          className={`h-14 w-full rounded-2xl border px-3 text-center text-2xl font-black text-white outline-none ${
            golden
              ? "border-amber-300/30 bg-slate-950/90 focus:border-amber-300"
              : "border-white/10 bg-slate-950/80 focus:border-amber-400"
          }`}
        />
      </div>
    );
  }

  function renderQualificationFields(match: Match, visible: boolean) {
    if (!visible) return null;

    return (
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <select
          value={inputs[match.id]?.qualifiedTeamCode || ""}
          onChange={(event) =>
            updateInput(match.id, "qualifiedTeamCode", event.target.value)
          }
          className="h-12 rounded-2xl border border-blue-300/30 bg-slate-950/90 px-3 text-sm font-bold text-white outline-none focus:border-blue-300"
        >
          <option value="">اختر المنتخب المتأهل</option>
          <option value={match.homeTeamCode}>
            {match.homeTeamEmoji} {match.homeTeamName}
          </option>
          <option value={match.awayTeamCode}>
            {match.awayTeamEmoji} {match.awayTeamName}
          </option>
        </select>

        <select
          value={inputs[match.id]?.qualificationMethod || ""}
          onChange={(event) =>
            updateInput(match.id, "qualificationMethod", event.target.value)
          }
          className="h-12 rounded-2xl border border-blue-300/30 bg-slate-950/90 px-3 text-sm font-bold text-white outline-none focus:border-blue-300"
        >
          <option value="">اختر طريقة التأهل</option>
          <option value="extraTime">أشواط إضافية</option>
          <option value="penalties">ركلات ترجيح</option>
        </select>
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
      <div className="mb-4 text-center">
        <h2 className="text-2xl font-black md:text-3xl">🔥 شاركنا توقعك</h2>

        <p className="mt-2 text-sm leading-7 text-slate-200 md:text-base">
          سجّل توقعك قبل بداية المباراة وتابع نقاطك في لوحة الصدارة.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
          جاري تحميل المباريات...
        </div>
      ) : sortedMatches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-6 text-center text-slate-300">
          لا توجد مباريات متاحة للتوقع حاليًا.
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMatches.map((match) => {
            const savedPrediction = savedPredictions[match.id];
            const closed = isPredictionClosed(match.startAt);
            const countdownText = getCountdownText(match.startAt);
            const matchTime = formatMatchTimeOnly(match.startAt);
            const golden = isGoldenMatch(match);
            const knockout = isKnockoutMatch(match as MatchWithKnockout);
            const knockoutDrawInput = isKnockoutDrawInput(
              match as MatchWithKnockout
            );
            const editRemainingMs = savedPrediction
              ? getEditRemainingMs(savedPrediction, match)
              : 0;
            const editable =
              savedPrediction && canEditPrediction(savedPrediction, match);
            const editing = editingMatchId === match.id && Boolean(editable);

            return (
              <article
                key={match.id}
                className={`rounded-3xl border p-4 shadow-xl transition ${
                  golden
                    ? "border-amber-300/40 bg-gradient-to-br from-amber-400/20 via-slate-950/80 to-yellow-500/10 shadow-amber-400/10"
                    : "border-white/10 bg-slate-950/60"
                }`}
              >
                {golden && (
                  <div className="mb-4 overflow-hidden rounded-2xl border border-amber-300/40 bg-slate-950/70">
                    <div className="bg-amber-400 px-4 py-2 text-center text-sm font-black text-slate-950 md:text-base">
                      ⭐ التوقع الذهبي
                    </div>

                    <div className="px-4 py-3 text-center text-xs font-bold leading-6 text-amber-100 md:text-sm">
                      فرصة مضاعفة للنقاط: إذا جبتها بالملي تحصل على{" "}
                      <span className="font-black text-amber-300">+6</span>،
                      وإذا توقعت الفائز الصحيح تحصل على{" "}
                      <span className="font-black text-amber-300">+2</span>،
                      والخطأ <span className="font-black">0</span>.
                    </div>
                  </div>
                )}

                {knockout && (
                  <div className="mb-4 rounded-2xl border border-blue-300/30 bg-blue-400/10 px-4 py-2 text-center text-xs font-black text-blue-100">
                    خروج المغلوب
                  </div>
                )}

                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div
                      className={`text-right text-sm font-black md:text-base ${
                        golden ? "text-amber-100" : "text-slate-200"
                      }`}
                    >
                      {formatDate(match.matchDate)}
                    </div>

                    <div
                      className={`text-left text-xs font-medium md:text-sm ${
                        golden ? "text-amber-200" : "text-slate-300"
                      }`}
                    >
                      {matchTime}
                    </div>
                  </div>

                  <div
                    className={`w-full rounded-full border px-3 py-1.5 text-center text-xs font-black ${
                      closed
                        ? "border-red-400/20 bg-red-500/10 text-red-100"
                        : golden
                        ? "border-amber-300/40 bg-amber-400/20 text-amber-100"
                        : "border-amber-400/20 bg-amber-400/10 text-amber-100"
                    }`}
                  >
                    {closed
                      ? "انتهى وقت التوقع"
                      : `ينتهي التوقع خلال: ${countdownText}`}
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_48px_1fr] items-center gap-2">
                  <div className="min-w-0 text-center">
                    <div className="text-3xl leading-none">
                      {match.homeTeamEmoji}
                    </div>

                    <div className="mt-2 text-lg font-black leading-none text-white md:text-xl">
                      {match.homeTeamCode}
                    </div>

                    <div className="mx-auto mt-2 max-w-[96px] text-center text-xs font-bold leading-5 text-slate-200 md:max-w-[130px] md:text-sm">
                      {match.homeTeamName}
                    </div>
                  </div>

                  <div
                    className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full border text-xs font-black ${
                      golden
                        ? "border-amber-300/40 bg-amber-400/20 text-amber-200"
                        : "border-white/10 bg-white/10 text-amber-300"
                    }`}
                  >
                    VS
                  </div>

                  <div className="min-w-0 text-center">
                    <div className="text-3xl leading-none">
                      {match.awayTeamEmoji}
                    </div>

                    <div className="mt-2 text-lg font-black leading-none text-white md:text-xl">
                      {match.awayTeamCode}
                    </div>

                    <div className="mx-auto mt-2 max-w-[96px] text-center text-xs font-bold leading-5 text-slate-200 md:max-w-[130px] md:text-sm">
                      {match.awayTeamName}
                    </div>
                  </div>
                </div>

                {editing ? (
                  <div className="mt-5">
                    <div className="mb-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-center text-xs font-black text-amber-100">
                      يمكنك تعديل التوقع خلال:{" "}
                      {formatShortCountdown(editRemainingMs)}
                    </div>

                    {renderScoreInputs(match, golden)}
                    {renderQualificationFields(match, knockoutDrawInput)}

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={savingMatchId === match.id}
                        onClick={() => handleUpdatePrediction(match)}
                        className={`rounded-2xl px-4 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 ${
                          golden
                            ? "bg-amber-300 shadow-lg shadow-amber-400/10 hover:bg-amber-200"
                            : "bg-amber-400 hover:bg-amber-300"
                        }`}
                      >
                        {savingMatchId === match.id
                          ? "جاري التعديل..."
                          : "حفظ التعديل"}
                      </button>

                      <button
                        type="button"
                        disabled={savingMatchId === match.id}
                        onClick={() => cancelEditingPrediction(match.id)}
                        className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : savedPrediction ? (
                  <div className="mt-5 space-y-2">
                    {isGoldenPrediction(savedPrediction) && (
                      <div className="rounded-2xl border border-amber-300/40 bg-amber-400 px-3 py-2 text-center text-xs font-black text-slate-950">
                        ⭐ تم اعتماد التوقع الذهبي
                      </div>
                    )}

                    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-center text-sm font-black text-emerald-100">
                      وصل توقعك واعتمدناه ✅
                    </div>

                    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-center text-base font-black text-emerald-100">
                      توقعك المعتمد: {savedPrediction.homeScore} -{" "}
                      {savedPrediction.awayScore}
                    </div>

                    {savedPrediction.qualifiedTeamCode && (
                      <div className="rounded-2xl border border-blue-400/30 bg-blue-400/10 p-3 text-center text-xs font-bold leading-6 text-blue-100 md:text-sm">
                        المتأهل:{" "}
                        <span className="font-black text-white">
                          {getQualifiedTeamEmoji(
                            match,
                            savedPrediction.qualifiedTeamCode
                          )}{" "}
                          {getQualifiedTeamName(
                            match,
                            savedPrediction.qualifiedTeamCode
                          )}
                        </span>
                        {savedPrediction.qualificationMethod && (
                          <>
                            {" "}
                            • طريقة التأهل:{" "}
                            <span className="font-black text-white">
                              {getQualificationMethodLabel(
                                savedPrediction.qualificationMethod
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {editable && (
                      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-center">
                        <div className="text-xs font-black text-amber-100 md:text-sm">
                          يمكنك تعديل التوقع خلال:{" "}
                          {formatShortCountdown(editRemainingMs)}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            startEditingPrediction(match, savedPrediction)
                          }
                          className="mt-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-amber-300"
                        >
                          تعديل التوقع
                        </button>
                      </div>
                    )}
                  </div>
                ) : closed ? (
                  <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-center text-sm font-bold text-red-100">
                    انتهى وقت استقبال التوقعات لهذه المباراة.
                  </div>
                ) : (
                  <div className="mt-5">
                    {renderScoreInputs(match, golden)}
                    {renderQualificationFields(match, knockoutDrawInput)}

                    <button
                      type="button"
                      disabled={savingMatchId === match.id}
                      onClick={() => handleSubmitPrediction(match)}
                      className={`mt-3 w-full rounded-2xl px-4 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 ${
                        golden
                          ? "bg-amber-300 shadow-lg shadow-amber-400/10 hover:bg-amber-200"
                          : "bg-amber-400 hover:bg-amber-300"
                      }`}
                    >
                      {savingMatchId === match.id
                        ? "جاري الاعتماد..."
                        : isLoggedIn
                        ? golden
                          ? "اعتماد التوقع الذهبي"
                          : "اعتماد التوقع"
                        : "سجّل الدخول لاعتماد التوقع"}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
