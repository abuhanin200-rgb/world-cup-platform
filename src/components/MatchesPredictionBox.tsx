"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Match, getVisibleMatches } from "@/lib/matches";
import {
  getUserPredictionForMatch,
  Prediction,
  submitPrediction,
} from "@/lib/predictions";
import { useAuth } from "@/context/AuthContext";

type PredictionInputs = Record<
  string,
  {
    homeScore: string;
    awayScore: string;
  }
>;

type SavedPredictions = Record<string, Prediction>;

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

function isPredictionClosed(startAt: string) {
  const startTime = new Date(startAt).getTime();

  if (!Number.isFinite(startTime)) return true;

  return Date.now() >= startTime;
}

function toNumber(value: string) {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) ? numberValue : null;
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
    key: "homeScore" | "awayScore",
    value: string
  ) {
    if (value !== "" && !/^\d{0,2}$/.test(value)) return;

    setInputs((current) => ({
      ...current,
      [matchId]: {
        homeScore: current[matchId]?.homeScore || "",
        awayScore: current[matchId]?.awayScore || "",
        [key]: value,
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

            return (
              <article
                key={match.id}
                className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 shadow-xl"
              >
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-right text-sm font-black text-slate-200 md:text-base">
                      {formatDate(match.matchDate)}
                    </div>

                    <div className="text-left text-xs font-medium text-slate-300 md:text-sm">
                      {matchTime}
                    </div>
                  </div>

                  <div
                    className={`w-full rounded-full border px-3 py-1.5 text-center text-xs font-black ${
                      closed
                        ? "border-red-400/20 bg-red-500/10 text-red-100"
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

                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs font-black text-amber-300">
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

                {savedPrediction ? (
                  <div className="mt-5 space-y-2">
                    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-center text-sm font-black text-emerald-100">
                      وصل توقعك واعتمدناه ✅
                    </div>

                    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-center text-base font-black text-emerald-100">
                      توقعك المعتمد: {savedPrediction.homeScore} -{" "}
                      {savedPrediction.awayScore}
                    </div>
                  </div>
                ) : closed ? (
                  <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-center text-sm font-bold text-red-100">
                    انتهى وقت استقبال التوقعات لهذه المباراة.
                  </div>
                ) : (
                  <div className="mt-5">
                    <div className="grid grid-cols-[1fr_28px_1fr] items-center gap-2">
                      <input
                        inputMode="numeric"
                        value={inputs[match.id]?.homeScore || ""}
                        onChange={(event) =>
                          updateInput(
                            match.id,
                            "homeScore",
                            event.target.value
                          )
                        }
                        placeholder="0"
                        className="h-14 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 text-center text-2xl font-black text-white outline-none focus:border-amber-400"
                      />

                      <div className="text-center text-xl font-black text-slate-400">
                        -
                      </div>

                      <input
                        inputMode="numeric"
                        value={inputs[match.id]?.awayScore || ""}
                        onChange={(event) =>
                          updateInput(
                            match.id,
                            "awayScore",
                            event.target.value
                          )
                        }
                        placeholder="0"
                        className="h-14 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 text-center text-2xl font-black text-white outline-none focus:border-amber-400"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={savingMatchId === match.id}
                      onClick={() => handleSubmitPrediction(match)}
                      className="mt-3 w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingMatchId === match.id
                        ? "جاري الاعتماد..."
                        : isLoggedIn
                          ? "اعتماد التوقع"
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