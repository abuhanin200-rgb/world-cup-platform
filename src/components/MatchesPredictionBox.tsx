"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getVisibleMatches, Match } from "@/lib/matches";
import { useAuth } from "@/context/AuthContext";

type PredictionFormState = {
  homeScore: string;
  awayScore: string;
};

type SavedPrediction = {
  id: string;
  homeScore: number;
  awayScore: number;
};

function toNumber(value: string) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : NaN;
}

function validateScore(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 30;
}

function getMatchStartTime(match: Match) {
  const startAt = (match as Match & { startAt?: string }).startAt;

  if (startAt) {
    return new Date(startAt).getTime();
  }

  return new Date(`${match.matchDate}T${match.matchTime}:00+03:00`).getTime();
}

function getCountdownText(match: Match) {
  const startTime = getMatchStartTime(match);
  const now = Date.now();
  const diff = startTime - now;

  if (!Number.isFinite(startTime)) return "الوقت غير محدد";
  if (diff <= 0) return "بدأت المباراة";

  const totalMinutes = Math.floor(diff / 1000 / 60);
  const days = Math.floor(totalMinutes / 60 / 24);
  const hours = Math.floor((totalMinutes - days * 24 * 60) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days} يوم ${hours} ساعة`;
  }

  if (hours > 0) {
    return `${hours} ساعة ${minutes} دقيقة`;
  }

  return `${minutes} دقيقة`;
}

async function getSavedPrediction(
  userId: string,
  matchId: string
): Promise<SavedPrediction | null> {
  const predictionsRef = collection(db, "predictions");

  const q = query(
    predictionsRef,
    where("userId", "==", userId),
    where("matchId", "==", matchId),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const docSnap = snapshot.docs[0];
  const data = docSnap.data();

  return {
    id: docSnap.id,
    homeScore: Number(data.homeScore || 0),
    awayScore: Number(data.awayScore || 0),
  };
}

async function savePrediction({
  userId,
  userName,
  match,
  homeScore,
  awayScore,
}: {
  userId: string;
  userName: string;
  match: Match;
  homeScore: number;
  awayScore: number;
}) {
  const existingPrediction = await getSavedPrediction(userId, match.id);

  if (existingPrediction) {
    throw new Error("سبق وسجلت توقعك لهذه المباراة");
  }

  const now = new Date().toISOString();

  await addDoc(collection(db, "predictions"), {
    userId,
    userName,

    matchId: match.id,

    homeTeamCode: match.homeTeamCode,
    homeTeamName: match.homeTeamName,
    homeTeamEmoji: match.homeTeamEmoji,

    awayTeamCode: match.awayTeamCode,
    awayTeamName: match.awayTeamName,
    awayTeamEmoji: match.awayTeamEmoji,

    homeScore,
    awayScore,

    points: 0,
    resultType: "",
    isCalculated: false,

    createdAt: now,
    updatedAt: now,
  });
}

export default function MatchesPredictionBox() {
  const { user, isLoggedIn } = useAuth();

  const [matches, setMatches] = useState<Match[]>([]);
  const [forms, setForms] = useState<Record<string, PredictionFormState>>({});
  const [savedPredictions, setSavedPredictions] = useState<
    Record<string, SavedPrediction>
  >({});

  const [loading, setLoading] = useState(true);
  const [savingMatchId, setSavingMatchId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [, setTick] = useState(0);

  async function loadMatches() {
    try {
      setLoading(true);

      const data = await getVisibleMatches();
      setMatches(data);

      if (user) {
        const predictionsEntries = await Promise.all(
          data.map(async (match) => {
            const prediction = await getSavedPrediction(user.id, match.id);
            return [match.id, prediction] as const;
          })
        );

        const predictionsMap: Record<string, SavedPrediction> = {};

        predictionsEntries.forEach(([matchId, prediction]) => {
          if (prediction) {
            predictionsMap[matchId] = prediction;
          }
        });

        setSavedPredictions(predictionsMap);
      } else {
        setSavedPredictions({});
      }
    } catch (err) {
      console.error("فشل تحميل المباريات:", err);
      setError("تعذر تحميل المباريات المتاحة للتوقع");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();

    const interval = setInterval(() => {
      setTick((value) => value + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, [user?.id]);

  function updateForm(matchId: string, field: keyof PredictionFormState, value: string) {
    setForms((current) => ({
      ...current,
      [matchId]: {
        homeScore: current[matchId]?.homeScore || "",
        awayScore: current[matchId]?.awayScore || "",
        [field]: value,
      },
    }));
  }

  async function handleSubmitPrediction(event: FormEvent, match: Match) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!isLoggedIn || !user) {
      setError("سجّل دخولك أولًا عشان تقدر تشاركنا توقعك");
      return;
    }

    if (savedPredictions[match.id]) {
      setError("سبق وسجلت توقعك لهذه المباراة");
      return;
    }

    const form = forms[match.id] || {
      homeScore: "",
      awayScore: "",
    };

    const homeScore = toNumber(form.homeScore);
    const awayScore = toNumber(form.awayScore);

    if (!validateScore(homeScore) || !validateScore(awayScore)) {
      setError("أدخل نتيجة صحيحة من 0 إلى 30");
      return;
    }

    setSavingMatchId(match.id);

    try {
      await savePrediction({
        userId: user.id,
        userName: user.fullName,
        match,
        homeScore,
        awayScore,
      });

      setSavedPredictions((current) => ({
        ...current,
        [match.id]: {
          id: match.id,
          homeScore,
          awayScore,
        },
      }));

      setForms((current) => ({
        ...current,
        [match.id]: {
          homeScore: "",
          awayScore: "",
        },
      }));

      setMessage("تم تسجيل توقعك بنجاح 🎯 لا تنسى ترجع وتشوف نتيجتك");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء تسجيل التوقع";
      setError(errorMessage);
    } finally {
      setSavingMatchId("");
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/10 p-3 shadow-2xl md:p-5">
      <div className="mb-4 text-center">
        <h2 className="text-xl font-black md:text-2xl">🔥 شاركنا توقعك</h2>
        <p className="mt-1 text-xs leading-6 text-slate-300 md:text-sm">
          سجّل توقعك قبل بداية المباراة وتابع نقاطك في لوحة الصدارة.
        </p>
      </div>

      {(message || error) && (
        <div className="mb-4 space-y-2">
          {message && (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-center text-xs text-emerald-100 md:text-sm">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-center text-xs text-red-100 md:text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm text-slate-300">
          جاري تحميل المباريات...
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm text-slate-300">
          لا توجد مباريات متاحة للتوقع حاليًا.
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => {
            const savedPrediction = savedPredictions[match.id];
            const form = forms[match.id] || {
              homeScore: "",
              awayScore: "",
            };

            return (
              <form
                key={match.id}
                onSubmit={(event) => handleSubmitPrediction(event, match)}
                className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 md:p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3 text-[11px] text-slate-300 md:text-xs">
                  <span>
                    {match.matchDay} • {match.matchDate}
                  </span>

                  <span className="rounded-full bg-white/10 px-2 py-1 text-amber-200">
                    يبدأ بعد: {getCountdownText(match)}
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center md:gap-4">
                  <div className="min-w-0">
                    <div className="text-3xl md:text-4xl">
                      {match.homeTeamEmoji}
                    </div>
                    <div className="mt-1 truncate text-xs font-black md:text-base">
                      {match.homeTeamName}
                    </div>
                  </div>

                  <div className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-amber-300">
                    VS
                  </div>

                  <div className="min-w-0">
                    <div className="text-3xl md:text-4xl">
                      {match.awayTeamEmoji}
                    </div>
                    <div className="mt-1 truncate text-xs font-black md:text-base">
                      {match.awayTeamName}
                    </div>
                  </div>
                </div>

                {savedPrediction ? (
                  <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-center text-sm text-emerald-100">
                    توقعك المعتمد:{" "}
                    <span className="font-black">
                      {savedPrediction.homeScore} - {savedPrediction.awayScore}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={form.homeScore}
                        onChange={(event) =>
                          updateForm(match.id, "homeScore", event.target.value)
                        }
                        className="w-full rounded-xl border border-white/10 bg-white px-3 py-2 text-center text-lg font-black text-slate-950 outline-none focus:border-amber-400"
                        placeholder="0"
                        required
                      />

                      <span className="text-sm font-black text-slate-300">
                        -
                      </span>

                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={form.awayScore}
                        onChange={(event) =>
                          updateForm(match.id, "awayScore", event.target.value)
                        }
                        className="w-full rounded-xl border border-white/10 bg-white px-3 py-2 text-center text-lg font-black text-slate-950 outline-none focus:border-amber-400"
                        placeholder="0"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingMatchId === match.id}
                      className="mt-3 w-full rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingMatchId === match.id
                        ? "جاري تسجيل التوقع..."
                        : "اعتماد التوقع"}
                    </button>
                  </>
                )}
              </form>
            );
          })}
        </div>
      )}
    </section>
  );
}