"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  getMatchCountdown,
  getVisibleMatches,
  isPredictionOpen,
  Match,
} from "@/lib/matches";
import {
  getUserPredictionForMatch,
  Prediction,
  submitPrediction,
} from "@/lib/predictions";
import { useAuth } from "@/context/AuthContext";

type MatchPredictionState = {
  homeScore: string;
  awayScore: string;
  existingPrediction: Prediction | null;
  message: string;
  error: string;
  loading: boolean;
};

export default function MatchesPredictionBox() {
  const { user, isLoggedIn } = useAuth();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [predictionStates, setPredictionStates] = useState<
    Record<string, MatchPredictionState>
  >({});

  useEffect(() => {
    async function loadMatches() {
      try {
        const data = await getVisibleMatches();
        setMatches(data);

        const initialStates: Record<string, MatchPredictionState> = {};

        for (const match of data) {
          let existingPrediction: Prediction | null = null;

          if (user?.id) {
            existingPrediction = await getUserPredictionForMatch(
              user.id,
              match.id
            );
          }

          initialStates[match.id] = {
            homeScore:
              existingPrediction?.homeScore !== undefined
                ? String(existingPrediction.homeScore)
                : "",
            awayScore:
              existingPrediction?.awayScore !== undefined
                ? String(existingPrediction.awayScore)
                : "",
            existingPrediction,
            message: "",
            error: "",
            loading: false,
          };
        }

        setPredictionStates(initialStates);
      } catch (error) {
        console.error("فشل تحميل المباريات:", error);
      } finally {
        setLoading(false);
      }
    }

    loadMatches();
  }, [user?.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((value) => value + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  function updateScore(matchId: string, field: "homeScore" | "awayScore", value: string) {
    const cleanValue = value.replace(/[^\d]/g, "").slice(0, 2);

    setPredictionStates((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: cleanValue,
        error: "",
        message: "",
      },
    }));
  }

  async function handleSubmit(event: FormEvent, match: Match) {
    event.preventDefault();

    if (!isLoggedIn || !user) {
      setPredictionStates((prev) => ({
        ...prev,
        [match.id]: {
          ...prev[match.id],
          error: "سجّل دخولك أولًا حتى تعتمد توقعك.",
          message: "",
        },
      }));
      return;
    }

    if (!isPredictionOpen(match)) {
      setPredictionStates((prev) => ({
        ...prev,
        [match.id]: {
          ...prev[match.id],
          error: "انتهى وقت التوقع لهذه المباراة.",
          message: "",
        },
      }));
      return;
    }

    const state = predictionStates[match.id];

    if (state?.existingPrediction) {
      setPredictionStates((prev) => ({
        ...prev,
        [match.id]: {
          ...prev[match.id],
          error: "تم اعتماد توقعك مسبقًا لهذه المباراة ولا يمكن تعديله.",
          message: "",
        },
      }));
      return;
    }

    const homeScore = Number(state?.homeScore);
    const awayScore = Number(state?.awayScore);

    if (
      state?.homeScore === "" ||
      state?.awayScore === "" ||
      Number.isNaN(homeScore) ||
      Number.isNaN(awayScore)
    ) {
      setPredictionStates((prev) => ({
        ...prev,
        [match.id]: {
          ...prev[match.id],
          error: "أدخل نتيجة التوقع كاملة.",
          message: "",
        },
      }));
      return;
    }

    setPredictionStates((prev) => ({
      ...prev,
      [match.id]: {
        ...prev[match.id],
        loading: true,
        error: "",
        message: "",
      },
    }));

    try {
      const savedPrediction = await submitPrediction({
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

      setPredictionStates((prev) => ({
        ...prev,
        [match.id]: {
          ...prev[match.id],
          existingPrediction: savedPrediction,
          homeScore: String(savedPrediction.homeScore),
          awayScore: String(savedPrediction.awayScore),
          loading: false,
          error: "",
          message: "توقعك وصل واعتمدناه، ارجع بعد المباراة وتابع نتيجتك.",
        },
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "حدث خطأ أثناء اعتماد التوقع";

      setPredictionStates((prev) => ({
        ...prev,
        [match.id]: {
          ...prev[match.id],
          loading: false,
          error: errorMessage,
          message: "",
        },
      }));
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-black md:text-3xl">
          مباريات اليوم والغد
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          جميع الأوقات حسب توقيت مكة المكرمة. يغلق التوقع مع بداية المباراة.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-slate-300">
          جاري تحميل المباريات...
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center">
          <div className="mb-2 text-3xl">📅</div>
          <h3 className="font-black">لا توجد مباريات اليوم أو الغد</h3>
          <p className="mt-2 text-sm text-slate-300">
            ستظهر هنا المباريات التي يضيفها الأدمن حسب توقيت مكة المكرمة.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => {
            const state = predictionStates[match.id];
            const predictionOpen = isPredictionOpen(match);
            const hasPrediction = Boolean(state?.existingPrediction);

            return (
              <form
                key={match.id}
                onSubmit={(event) => handleSubmit(event, match)}
                className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"
              >
                <div className="mb-4 flex flex-col gap-2 text-center md:flex-row md:items-center md:justify-between">
                  <div className="text-sm text-slate-300">
                    {match.matchDay} • {match.matchDate} • {match.matchTime} بتوقيت مكة
                  </div>

                  <div
                    className={`rounded-xl px-3 py-2 text-xs font-bold ${
                      predictionOpen
                        ? "bg-emerald-400/10 text-emerald-200 border border-emerald-400/30"
                        : "bg-red-500/10 text-red-200 border border-red-500/30"
                    }`}
                  >
                    {predictionOpen
                      ? `ينتهي التوقع بعد: ${getMatchCountdown(match)}`
                      : "تم إغلاق التوقع"}
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="text-center">
                    <div className="mb-2 text-3xl">{match.homeTeamEmoji}</div>
                    <div className="text-sm font-black md:text-base">
                      {match.homeTeamName}
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={state?.homeScore ?? ""}
                      onChange={(event) =>
                        updateScore(match.id, "homeScore", event.target.value)
                      }
                      disabled={!predictionOpen || hasPrediction}
                      className="mt-3 w-full rounded-xl border border-white/10 bg-white px-3 py-3 text-center text-xl font-black text-slate-950 outline-none focus:border-amber-400 disabled:cursor-not-allowed disabled:bg-slate-300"
                      placeholder="0"
                    />
                  </div>

                  <div className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm font-black text-amber-300">
                    VS
                  </div>

                  <div className="text-center">
                    <div className="mb-2 text-3xl">{match.awayTeamEmoji}</div>
                    <div className="text-sm font-black md:text-base">
                      {match.awayTeamName}
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={state?.awayScore ?? ""}
                      onChange={(event) =>
                        updateScore(match.id, "awayScore", event.target.value)
                      }
                      disabled={!predictionOpen || hasPrediction}
                      className="mt-3 w-full rounded-xl border border-white/10 bg-white px-3 py-3 text-center text-xl font-black text-slate-950 outline-none focus:border-amber-400 disabled:cursor-not-allowed disabled:bg-slate-300"
                      placeholder="0"
                    />
                  </div>
                </div>

                {state?.message && (
                  <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3 text-sm text-emerald-200">
                    {state.message}
                  </div>
                )}

                {state?.error && (
                  <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/15 p-3 text-sm text-red-200">
                    {state.error}
                  </div>
                )}

                {hasPrediction && (
                  <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-center text-sm text-amber-100">
                    توقعك المعتمد: {match.homeTeamEmoji} {match.homeTeamName}{" "}
                    <strong>
                      {state?.existingPrediction?.homeScore} -{" "}
                      {state?.existingPrediction?.awayScore}
                    </strong>{" "}
                    {match.awayTeamName} {match.awayTeamEmoji}
                  </div>
                )}

                {!hasPrediction && (
                  <button
                    type="submit"
                    disabled={state?.loading || !predictionOpen}
                    className="mt-4 w-full rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {state?.loading ? "جاري الاعتماد..." : "اعتماد التوقع"}
                  </button>
                )}
              </form>
            );
          })}
        </div>
      )}
    </section>
  );
}