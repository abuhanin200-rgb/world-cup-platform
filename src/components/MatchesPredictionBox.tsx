"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Rocket,
  Edit3,
  Lock,
  LogIn,
  PencilLine,
  Save,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  Timer,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Match,
  getAllMatches,
  isWorldCupFinalMatch,
  type FinalBonusPrediction,
} from "@/lib/matches";
import {
  getLatestPredictions,
  getPredictionEditWindowRemainingMs,
  getUserPredictionForMatch,
  Prediction,
  submitPrediction,
  updatePrediction,
} from "@/lib/predictions";
import { useAuth } from "@/context/AuthContext";
import TeamFlag from "@/components/TeamFlag";
import {
  getFinalSquadByTeamCode,
  getFinalSquadPlayerName,
  type FinalSquadPlayer,
} from "@/data/finalSquads";

type QualificationMethod = "extraTime" | "penalties";

type PredictionInputs = Record<
  string,
  {
    homeScore: string;
    awayScore: string;
    qualifiedTeamCode: string;
    qualificationMethod: string;
    finalFirstScoringTeamCode: string;
    finalFirstSpainScorer: string;
    finalFirstArgentinaScorer: string;
  }
>;

type SavedPredictions = Record<string, Prediction>;

type MatchWithKnockout = Match & {
  matchStage?: "group" | "knockout";
};

const NO_FINAL_SCORER = "none";

type FinalPredictionStats = {
  homeVotes: number;
  awayVotes: number;
  totalVotes: number;
};

type FinalPredictionStatsByMatch = Record<string, FinalPredictionStats>;

function createEmptyPredictionInput() {
  return {
    homeScore: "",
    awayScore: "",
    qualifiedTeamCode: "",
    qualificationMethod: "",
    finalFirstScoringTeamCode: "",
    finalFirstSpainScorer: "",
    finalFirstArgentinaScorer: "",
  };
}

function isFinalMatch(match: Match) {
  return isWorldCupFinalMatch(match);
}

function getPlayerPositionLabel(position: FinalSquadPlayer["position"]) {
  if (position === "goalkeeper") return "حراس المرمى";
  if (position === "defender") return "الدفاع";
  if (position === "midfielder") return "الوسط";
  return "الهجوم";
}

function getPlayersByPosition(players: FinalSquadPlayer[]) {
  const positions: FinalSquadPlayer["position"][] = [
    "goalkeeper",
    "defender",
    "midfielder",
    "forward",
  ];

  return positions
    .map((position) => ({
      position,
      players: players.filter((player) => player.position === position),
    }))
    .filter((group) => group.players.length > 0);
}

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

function isGoldenMatch(match: Match) {
  return match.predictionType === "golden";
}

function isGoldenPrediction(prediction: Prediction) {
  return prediction.predictionType === "golden";
}

function isKnockoutMatch(match: MatchWithKnockout) {
  return match.matchStage === "knockout";
}

function getKnockoutRoundLabel(round?: Match["knockoutRound"]) {
  if (round === "semiFinal") return "نصف النهائي";
  if (round === "thirdPlace") return "المركز الثالث";
  if (round === "final") return "النهائي";
  return "خروج المغلوب";
}

function getKnockoutRoundBadgeClasses(round?: Match["knockoutRound"]) {
  if (round === "final") {
    return "border-amber-300/40 bg-amber-300/15 text-amber-100 shadow-amber-950/15";
  }

  if (round === "thirdPlace") {
    return "border-orange-300/35 bg-orange-300/10 text-orange-100 shadow-orange-950/15";
  }

  if (round === "semiFinal") {
    return "border-cyan-300/35 bg-cyan-300/10 text-cyan-100 shadow-cyan-950/15";
  }

  return "border-blue-300/30 bg-blue-400/10 text-blue-100 shadow-blue-950/10";
}

function getQualificationMethodLabel(value?: string | null) {
  if (value === "extraTime") return "أشواط إضافية";
  if (value === "penalties") return "ركلات ترجيح";
  return "";
}

function getQualifiedTeamName(match: Match, qualifiedTeamCode?: string | null) {
  if (!qualifiedTeamCode) return "";

  if (qualifiedTeamCode === match.homeTeamCode) {
    return match.homeTeamName;
  }

  if (qualifiedTeamCode === match.awayTeamCode) {
    return match.awayTeamName;
  }

  return qualifiedTeamCode;
}

function getQualifiedTeamFlagData(
  match: Match,
  qualifiedTeamCode?: string | null
) {
  if (!qualifiedTeamCode) return null;

  if (qualifiedTeamCode === match.homeTeamCode) {
    return {
      code: match.homeTeamCode,
      emoji: match.homeTeamEmoji,
      name: match.homeTeamName,
    };
  }

  if (qualifiedTeamCode === match.awayTeamCode) {
    return {
      code: match.awayTeamCode,
      emoji: match.awayTeamEmoji,
      name: match.awayTeamName,
    };
  }

  return {
    code: qualifiedTeamCode,
    emoji: "",
    name: qualifiedTeamCode,
  };
}

function FloatingTeamFlag({
  children,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return <div className="flex justify-center">{children}</div>;
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
  const [finalPredictionStats, setFinalPredictionStats] =
    useState<FinalPredictionStatsByMatch>({});
  const [, setTick] = useState(0);

  async function loadMatches() {
    try {
      setLoading(true);

      const data = await getAllMatches();

      const availableMatches = data.filter((match) => {
        const matchStatus = match as Match & {
          isActive?: boolean;
          resultCalculated?: boolean;
        };

        return matchStatus.isActive !== false && !matchStatus.resultCalculated;
      });

      setMatches(availableMatches);
      await loadFinalPredictionStats(availableMatches);
    } catch (error) {
      console.error("Load matches error:", error);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadFinalPredictionStats(currentMatches: Match[]) {
    const finalMatches = currentMatches.filter(isFinalMatch);

    if (finalMatches.length === 0) {
      setFinalPredictionStats({});
      return;
    }

    try {
      const latestPredictions = await getLatestPredictions(2000);
      const nextStats: FinalPredictionStatsByMatch = {};

      finalMatches.forEach((match) => {
        const matchPredictions = latestPredictions.filter(
          (prediction) => prediction.matchId === match.id
        );

        let homeVotes = 0;
        let awayVotes = 0;

        matchPredictions.forEach((prediction) => {
          let selectedChampionCode = "";

          if (prediction.homeScore > prediction.awayScore) {
            selectedChampionCode = match.homeTeamCode;
          } else if (prediction.awayScore > prediction.homeScore) {
            selectedChampionCode = match.awayTeamCode;
          } else {
            selectedChampionCode = prediction.qualifiedTeamCode || "";
          }

          if (selectedChampionCode === match.homeTeamCode) {
            homeVotes += 1;
          } else if (selectedChampionCode === match.awayTeamCode) {
            awayVotes += 1;
          }
        });

        nextStats[match.id] = {
          homeVotes,
          awayVotes,
          totalVotes: homeVotes + awayVotes,
        };
      });

      setFinalPredictionStats(nextStats);
    } catch (error) {
      console.error("Load final prediction stats error:", error);
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
    if (!matches.some(isFinalMatch)) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadFinalPredictionStats(matches);
      }
    }, 30000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  useEffect(() => {
    if (authLoading) return;

    loadSavedPredictions(matches);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, matches.length]);

  useEffect(() => {
    if (matches.length === 0) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setTick((current) => current + 1);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [matches.length]);

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      const firstTime = new Date(a.startAt).getTime();
      const secondTime = new Date(b.startAt).getTime();

      if (!Number.isFinite(firstTime) && !Number.isFinite(secondTime)) return 0;
      if (!Number.isFinite(firstTime)) return 1;
      if (!Number.isFinite(secondTime)) return -1;

      return firstTime - secondTime;
    });
  }, [matches]);

  function updateInput(
    matchId: string,
    key:
      | "homeScore"
      | "awayScore"
      | "qualifiedTeamCode"
      | "qualificationMethod"
      | "finalFirstScoringTeamCode"
      | "finalFirstSpainScorer"
      | "finalFirstArgentinaScorer",
    value: string
  ) {
    if (
      (key === "homeScore" || key === "awayScore") &&
      value !== "" &&
      !/^\d{0,2}$/.test(value)
    ) {
      return;
    }

    setInputs((current) => {
      const currentInput = {
        ...createEmptyPredictionInput(),
        ...current[matchId],
      };

      if (key === "finalFirstScoringTeamCode") {
        const noGoalsSelected = value === "none";

        return {
          ...current,
          [matchId]: {
            ...currentInput,
            finalFirstScoringTeamCode: value,
            finalFirstSpainScorer: noGoalsSelected
              ? NO_FINAL_SCORER
              : currentInput.finalFirstSpainScorer === NO_FINAL_SCORER
                ? ""
                : currentInput.finalFirstSpainScorer,
            finalFirstArgentinaScorer: noGoalsSelected
              ? NO_FINAL_SCORER
              : currentInput.finalFirstArgentinaScorer === NO_FINAL_SCORER
                ? ""
                : currentInput.finalFirstArgentinaScorer,
          },
        };
      }

      return {
        ...current,
        [matchId]: {
          ...currentInput,
          [key]: value,
        },
      };
    });
  }


  function updateScoreInput(
    match: Match,
    key: "homeScore" | "awayScore",
    value: string
  ) {
    if (value !== "" && !/^\d{0,2}$/.test(value)) return;

    setInputs((current) => {
      const currentInput = {
        ...createEmptyPredictionInput(),
        ...current[match.id],
      };

      const nextInput = {
        ...currentInput,
        [key]: value,
      };

      if (!isFinalMatch(match)) {
        return {
          ...current,
          [match.id]: nextInput,
        };
      }

      const homeScore = toNumber(nextInput.homeScore);
      const awayScore = toNumber(nextInput.awayScore);

      const spainScore =
        match.homeTeamCode === "ESP"
          ? homeScore
          : match.awayTeamCode === "ESP"
            ? awayScore
            : null;

      const argentinaScore =
        match.homeTeamCode === "ARG"
          ? homeScore
          : match.awayTeamCode === "ARG"
            ? awayScore
            : null;

      if (spainScore === 0) {
        nextInput.finalFirstSpainScorer = NO_FINAL_SCORER;
      } else if (spainScore !== null && nextInput.finalFirstSpainScorer === NO_FINAL_SCORER) {
        nextInput.finalFirstSpainScorer = "";
      }

      if (argentinaScore === 0) {
        nextInput.finalFirstArgentinaScorer = NO_FINAL_SCORER;
      } else if (
        argentinaScore !== null &&
        nextInput.finalFirstArgentinaScorer === NO_FINAL_SCORER
      ) {
        nextInput.finalFirstArgentinaScorer = "";
      }

      if (homeScore === 0 && awayScore === 0) {
        nextInput.finalFirstScoringTeamCode = "none";
      } else if (
        homeScore !== null &&
        awayScore !== null &&
        homeScore + awayScore > 0 &&
        nextInput.finalFirstScoringTeamCode === "none"
      ) {
        nextInput.finalFirstScoringTeamCode = "";
      }

      return {
        ...current,
        [match.id]: nextInput,
      };
    });
  }

  function getEditRemainingMs(prediction: Prediction, match: Match) {
    if (isPredictionClosed(match.startAt)) return 0;

    return getPredictionEditWindowRemainingMs(prediction, match.startAt);
  }

  function canEditPrediction(prediction: Prediction, match: Match) {
    return (
      !prediction.isCalculated && getEditRemainingMs(prediction, match) > 0
    );
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
      alert(
        isFinalMatch(match as Match)
          ? "اختر بطل كأس العالم"
          : "اختر المنتخب المتأهل"
      );
      return false;
    }

    if (!inputs[match.id]?.qualificationMethod) {
      alert(
        isFinalMatch(match as Match)
          ? "اختر طريقة حسم اللقب"
          : "اختر طريقة التأهل"
      );
      return false;
    }

    return true;
  }

  function validateFinalBonusInput(match: Match) {
    if (!isFinalMatch(match)) return true;

    const matchInput = inputs[match.id];

    if (!matchInput?.finalFirstScoringTeamCode) {
      alert("اختر من يبدأ التسجيل في النهائي");
      return false;
    }

    if (!matchInput.finalFirstSpainScorer) {
      alert("اختر أول مسجل من إسبانيا");
      return false;
    }

    if (!matchInput.finalFirstArgentinaScorer) {
      alert("اختر أول مسجل من الأرجنتين");
      return false;
    }

    return true;
  }

  function getFinalBonusPredictionInput(
    match: Match
  ): FinalBonusPrediction | undefined {
    if (!isFinalMatch(match)) return undefined;

    const matchInput = inputs[match.id];

    return {
      firstScoringTeamCode: matchInput?.finalFirstScoringTeamCode || "",
      firstSpainScorer: matchInput?.finalFirstSpainScorer || "",
      firstArgentinaScorer:
        matchInput?.finalFirstArgentinaScorer || "",
    };
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
        finalFirstScoringTeamCode:
          prediction.finalBonusPrediction?.firstScoringTeamCode || "",
        finalFirstSpainScorer:
          prediction.finalBonusPrediction?.firstSpainScorer || "",
        finalFirstArgentinaScorer:
          prediction.finalBonusPrediction?.firstArgentinaScorer || "",
      },
    }));
  }

  function cancelEditingPrediction(matchId: string) {
    setEditingMatchId("");
    setInputs((current) => ({
      ...current,
      [matchId]: createEmptyPredictionInput(),
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

    if (!validateFinalBonusInput(match)) {
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
        homeTeamCode: match.homeTeamCode,
        awayTeamCode: match.awayTeamCode,

        homeScore,
        awayScore,
        qualifiedTeamCode: inputs[match.id]?.qualifiedTeamCode || undefined,
        qualificationMethod: (inputs[match.id]?.qualificationMethod ||
          undefined) as QualificationMethod | undefined,
        finalBonusPrediction: getFinalBonusPredictionInput(match),
      });

      setSavedPredictions((current) => ({
        ...current,
        [match.id]: prediction,
      }));

      await loadFinalPredictionStats(matches);

      setInputs((current) => ({
        ...current,
        [match.id]: createEmptyPredictionInput(),
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
      alert("انتهى وقت تعديل التوقع");
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

    if (!validateFinalBonusInput(match)) {
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
        finalBonusPrediction: getFinalBonusPredictionInput(match),
      });

      setSavedPredictions((current) => ({
        ...current,
        [match.id]: prediction,
      }));

      await loadFinalPredictionStats(matches);

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
    const finalMatch = isFinalMatch(match);

    return (
      <div>
        {finalMatch && (
          <div className="mb-3 flex items-center justify-center gap-2 text-sm font-black text-white md:text-base">
            <Trophy className="h-4 w-4 text-amber-200" aria-hidden="true" />
            <span>التوقع الأساسي</span>
          </div>
        )}

        <div className="grid grid-cols-[1fr_28px_1fr] items-center gap-2">
        <input
          id={`prediction-${match.id}-home-score`}
          inputMode="numeric"
          aria-label={`توقع أهداف ${match.homeTeamName}`}
          dir="ltr"
          value={inputs[match.id]?.homeScore || ""}
          onChange={(event) =>
            updateScoreInput(match, "homeScore", event.target.value)
          }
          placeholder="0"
          className={`h-14 w-full rounded-2xl border px-3 text-center text-[24px] font-black text-white shadow-inner outline-none transition duration-200 focus:scale-[1.02] focus:ring-2 ${
            golden
              ? "border-amber-300/30 bg-slate-950/90 focus:border-amber-300 focus:ring-amber-300/25"
              : "border-white/10 bg-slate-950/80 focus:border-amber-400 focus:ring-amber-400/25"
          }`}
        />

        <div className="text-center text-[20px] font-black text-slate-400">
          -
        </div>

        <input
          id={`prediction-${match.id}-away-score`}
          inputMode="numeric"
          aria-label={`توقع أهداف ${match.awayTeamName}`}
          dir="ltr"
          value={inputs[match.id]?.awayScore || ""}
          onChange={(event) =>
            updateScoreInput(match, "awayScore", event.target.value)
          }
          placeholder="0"
          className={`h-14 w-full rounded-2xl border px-3 text-center text-[24px] font-black text-white shadow-inner outline-none transition duration-200 focus:scale-[1.02] focus:ring-2 ${
            golden
              ? "border-amber-300/30 bg-slate-950/90 focus:border-amber-300 focus:ring-amber-300/25"
              : "border-white/10 bg-slate-950/80 focus:border-amber-400 focus:ring-amber-400/25"
          }`}
        />
        </div>
      </div>
    );
  }

  function renderQualificationFields(match: Match, visible: boolean) {
    const finalMatch = isFinalMatch(match);

    return (
      <>
        {visible && (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <select
              aria-label={
                finalMatch ? "اختيار بطل كأس العالم" : "اختيار المنتخب المتأهل"
              }
              value={inputs[match.id]?.qualifiedTeamCode || ""}
              onChange={(event) =>
                updateInput(match.id, "qualifiedTeamCode", event.target.value)
              }
              className="h-12 rounded-2xl border border-blue-300/30 bg-slate-950/90 px-3 text-[14px] font-bold text-white outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-300/20"
            >
              <option value="">
                {finalMatch ? "اختر بطل كأس العالم" : "اختر المنتخب المتأهل"}
              </option>
              <option value={match.homeTeamCode}>{match.homeTeamName}</option>
              <option value={match.awayTeamCode}>{match.awayTeamName}</option>
            </select>

            <select
              aria-label={
                finalMatch ? "اختيار طريقة حسم اللقب" : "اختيار طريقة التأهل"
              }
              value={inputs[match.id]?.qualificationMethod || ""}
              onChange={(event) =>
                updateInput(match.id, "qualificationMethod", event.target.value)
              }
              className="h-12 rounded-2xl border border-blue-300/30 bg-slate-950/90 px-3 text-[14px] font-bold text-white outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-300/20"
            >
              <option value="">
                {finalMatch ? "اختر طريقة حسم اللقب" : "اختر طريقة التأهل"}
              </option>
              <option value="extraTime">أشواط إضافية</option>
              <option value="penalties">ركلات ترجيح</option>
            </select>
          </div>
        )}
      </>
    );
  }

  function renderPlayerOptions(players: FinalSquadPlayer[]) {
    return getPlayersByPosition(players).map((group) => (
      <optgroup
        key={group.position}
        label={getPlayerPositionLabel(group.position)}
      >
        {group.players.map((player) => (
          <option key={player.id} value={player.id}>
            {player.nameAr}
          </option>
        ))}
      </optgroup>
    ));
  }

  function renderFinalBonusFields(match: Match) {
    if (!isFinalMatch(match)) return null;

    const spainPlayers = getFinalSquadByTeamCode("ESP");
    const argentinaPlayers = getFinalSquadByTeamCode("ARG");

    const predictedHomeScore = toNumber(inputs[match.id]?.homeScore || "");
    const predictedAwayScore = toNumber(inputs[match.id]?.awayScore || "");

    const predictedSpainScore =
      match.homeTeamCode === "ESP"
        ? predictedHomeScore
        : match.awayTeamCode === "ESP"
          ? predictedAwayScore
          : null;

    const predictedArgentinaScore =
      match.homeTeamCode === "ARG"
        ? predictedHomeScore
        : match.awayTeamCode === "ARG"
          ? predictedAwayScore
          : null;

    const showSpainScorer = predictedSpainScore !== 0;
    const showArgentinaScorer = predictedArgentinaScore !== 0;

    return (
      <div className="mt-4 overflow-hidden rounded-3xl border border-fuchsia-300/30 bg-gradient-to-br from-fuchsia-500/10 via-slate-950/85 to-amber-300/10">
        <div className="border-b border-white/10 px-4 py-3 text-center">
          <div className="inline-flex items-center gap-2 text-sm font-black text-amber-100 md:text-base">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>إضافات النهائي 20 نقطة</span>
          </div>
          <p className="mt-1 text-[11px] font-bold leading-5 text-slate-300 md:text-xs">
            ثلاث اختيارات حاسمة تضاف إلى نقاط السوبر ذهبي
          </p>
        </div>

        <div className="space-y-3 p-3 md:p-4">
          <label className="block">
            <span className="mb-2 flex items-center justify-between gap-2 text-xs font-black text-white md:text-sm">
              <span>من يبدأ التسجيل؟</span>
              <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[10px] text-slate-950">
                +6
              </span>
            </span>
            <select
              aria-label="اختيار المنتخب الذي يبدأ التسجيل"
              value={inputs[match.id]?.finalFirstScoringTeamCode || ""}
              onChange={(event) =>
                updateInput(
                  match.id,
                  "finalFirstScoringTeamCode",
                  event.target.value
                )
              }
              className="h-12 w-full rounded-2xl border border-amber-300/30 bg-slate-950/90 px-3 text-sm font-bold text-white outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
            >
              <option value="">اختر من يبدأ التسجيل</option>
              <option value={match.homeTeamCode}>{match.homeTeamName}</option>
              <option value={match.awayTeamCode}>{match.awayTeamName}</option>
              <option value="none">لا يوجد أهداف</option>
            </select>
          </label>

          {inputs[match.id]?.finalFirstScoringTeamCode === "none" ? (
            <div className="rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-center text-xs font-black leading-6 text-emerald-100 md:text-sm">
              <span className="inline-flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>لا توجد أهداف — لا يسجل أي لاعب من المنتخبين</span>
              </span>
            </div>
          ) : (
            <>
              {showSpainScorer ? (
                <label className="block">
                  <span className="mb-2 flex items-center justify-between gap-2 text-xs font-black text-white md:text-sm">
                    <span>أول مسجل من إسبانيا</span>
                    <span className="rounded-full bg-fuchsia-300 px-2 py-0.5 text-[10px] text-slate-950">
                      +7
                    </span>
                  </span>
                  <select
                    aria-label="اختيار أول مسجل من إسبانيا"
                    value={inputs[match.id]?.finalFirstSpainScorer || ""}
                    onChange={(event) =>
                      updateInput(
                        match.id,
                        "finalFirstSpainScorer",
                        event.target.value
                      )
                    }
                    className="h-12 w-full rounded-2xl border border-fuchsia-300/30 bg-slate-950/90 px-3 text-sm font-bold text-white outline-none transition focus:border-fuchsia-300 focus:ring-2 focus:ring-fuchsia-300/20"
                  >
                    <option value="">اختر لاعب إسبانيا</option>
                    {renderPlayerOptions(spainPlayers)}
                    <option value={NO_FINAL_SCORER}>
                      لا يسجل أي لاعب من إسبانيا
                    </option>
                  </select>
                </label>
              ) : (
                <div className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-400/10 px-4 py-3 text-center text-xs font-black text-fuchsia-100">
                  حسب توقعك، إسبانيا لا تسجل أهدافًا
                </div>
              )}

              {showArgentinaScorer ? (
                <label className="block">
                  <span className="mb-2 flex items-center justify-between gap-2 text-xs font-black text-white md:text-sm">
                    <span>أول مسجل من الأرجنتين</span>
                    <span className="rounded-full bg-sky-300 px-2 py-0.5 text-[10px] text-slate-950">
                      +7
                    </span>
                  </span>
                  <select
                    aria-label="اختيار أول مسجل من الأرجنتين"
                    value={inputs[match.id]?.finalFirstArgentinaScorer || ""}
                    onChange={(event) =>
                      updateInput(
                        match.id,
                        "finalFirstArgentinaScorer",
                        event.target.value
                      )
                    }
                    className="h-12 w-full rounded-2xl border border-sky-300/30 bg-slate-950/90 px-3 text-sm font-bold text-white outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-300/20"
                  >
                    <option value="">اختر لاعب الأرجنتين</option>
                    {renderPlayerOptions(argentinaPlayers)}
                    <option value={NO_FINAL_SCORER}>
                      لا يسجل أي لاعب من الأرجنتين
                    </option>
                  </select>
                </label>
              ) : (
                <div className="rounded-2xl border border-sky-300/20 bg-sky-400/10 px-4 py-3 text-center text-xs font-black text-sky-100">
                  حسب توقعك، الأرجنتين لا تسجل أهدافًا
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  function renderSavedFinalBonusPrediction(
    match: Match,
    prediction: Prediction
  ) {
    if (!isFinalMatch(match) || !prediction.finalBonusPrediction) {
      return null;
    }

    const bonus = prediction.finalBonusPrediction;
    const firstScoringTeamLabel =
      bonus.firstScoringTeamCode === "none"
        ? "لا يوجد أهداف"
        : bonus.firstScoringTeamCode === match.homeTeamCode
          ? match.homeTeamName
          : match.awayTeamName;

    return (
      <div className="rounded-2xl border border-fuchsia-300/25 bg-fuchsia-400/10 p-3 text-xs font-bold leading-6 text-slate-200 shadow-md shadow-fuchsia-950/10 md:text-sm">
        <div className="mb-2 inline-flex items-center gap-1.5 font-black text-amber-100">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span>اختيارات إضافات النهائي</span>
        </div>
        <div>من يبدأ التسجيل: <span className="font-black text-white">{firstScoringTeamLabel}</span></div>
        <div>أول مسجل من إسبانيا: <span className="font-black text-white">{bonus.firstSpainScorer === NO_FINAL_SCORER ? "لا يسجل أي لاعب" : getFinalSquadPlayerName("ESP", bonus.firstSpainScorer)}</span></div>
        <div>أول مسجل من الأرجنتين: <span className="font-black text-white">{bonus.firstArgentinaScorer === NO_FINAL_SCORER ? "لا يسجل أي لاعب" : getFinalSquadPlayerName("ARG", bonus.firstArgentinaScorer)}</span></div>
      </div>
    );
  }

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/85 p-4 text-white shadow-lg shadow-slate-950/25 md:p-5 [contain:layout_paint] [isolation:isolate]"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-cyan-400/5" />
      <div className="pointer-events-none absolute -right-20 top-16 h-44 w-44 rounded-full" style={{ background: "radial-gradient(circle at center, rgba(252,211,77,0.16) 0%, rgba(252,211,77,0.075) 38%, rgba(252,211,77,0.02) 62%, transparent 82%)" }} />
      <div className="pointer-events-none absolute -left-20 bottom-20 h-44 w-44 rounded-full" style={{ background: "radial-gradient(circle at center, rgba(103,232,249,0.16) 0%, rgba(103,232,249,0.075) 38%, rgba(103,232,249,0.02) 62%, transparent 82%)" }} />

      <div className="relative mb-4 text-center">
        <div className="mx-auto mb-2 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-100 shadow-md shadow-amber-950/15">
          <PencilLine className="h-5 w-5" />
        </div>

        <h2 className="text-[24px] font-black tracking-tight md:text-3xl">
          شاركنا توقعك
        </h2>

        <p className="mx-auto mt-2 max-w-2xl text-[14px] font-medium leading-7 text-slate-200 md:text-base">
          كل المباريات المضافة تظهر هنا حتى يتم احتسابها من لوحة التحكم
        </p>
      </div>

      {loading ? (
        <div
          role="status"
          aria-live="polite"
          className="relative rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300 shadow-inner"
        >
          <div className="inline-flex items-center gap-2 text-[14px] font-bold">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span>جاري تحميل المباريات...</span>
          </div>
        </div>
      ) : sortedMatches.length === 0 ? (
        <div
          className="relative rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-6 text-center text-slate-300 shadow-inner"
        >
          <div className="inline-flex items-center justify-center gap-2 text-[14px] font-bold">
            <CalendarDays className="h-4 w-4 text-slate-300" />
            <span>لا توجد مباريات غير محتسبة حاليًا.</span>
          </div>
        </div>
      ) : (
        <div className="relative space-y-4">
          {sortedMatches.map((match) => {
            const savedPrediction = savedPredictions[match.id];
            const closed = isPredictionClosed(match.startAt);
            const countdownText = getCountdownText(match.startAt);
            const matchTime = formatMatchTimeOnly(match.startAt);
            const golden = isGoldenMatch(match);
            const finalMatch = isFinalMatch(match);
            const finalStats = finalPredictionStats[match.id] || {
              homeVotes: 0,
              awayVotes: 0,
              totalVotes: 0,
            };
            const homeVotePercent = finalStats.totalVotes
              ? Math.round((finalStats.homeVotes / finalStats.totalVotes) * 100)
              : 0;
            const awayVotePercent = finalStats.totalVotes
              ? 100 - homeVotePercent
              : 0;
            const knockout = isKnockoutMatch(match as MatchWithKnockout);
            const knockoutRoundLabel = knockout
              ? getKnockoutRoundLabel(match.knockoutRound)
              : "";
            const knockoutRoundBadgeClasses = knockout
              ? getKnockoutRoundBadgeClasses(match.knockoutRound)
              : "";
            const knockoutDrawInput = isKnockoutDrawInput(
              match as MatchWithKnockout
            );

            const editable =
              savedPrediction && canEditPrediction(savedPrediction, match);
            const editing = editingMatchId === match.id && Boolean(editable);

            return (
              <article
                key={match.id}
                className={`relative overflow-hidden rounded-3xl border p-4 shadow-lg transition duration-200 [backface-visibility:hidden] ${
                  finalMatch
                    ? "border-amber-300/45 bg-gradient-to-br from-amber-300/20 via-fuchsia-950/70 to-blue-950/90 shadow-amber-500/15"
                    : golden
                      ? "border-fuchsia-300/40 bg-gradient-to-br from-fuchsia-500/20 via-slate-950/85 to-amber-400/20 shadow-fuchsia-500/10"
                      : "border-white/10 bg-slate-950/60 shadow-slate-950/20"
                }`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 ${
                    golden
                      ? "bg-gradient-to-br from-fuchsia-300/12 via-transparent to-amber-300/10"
                      : "bg-gradient-to-br from-white/7 via-transparent to-cyan-300/5"
                  }`}
                />

                <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

                {finalMatch && (
                  <div className="relative mb-4 overflow-hidden rounded-3xl border border-amber-300/35 bg-slate-950/75 shadow-lg shadow-amber-950/20">
                    <div className="bg-gradient-to-r from-amber-300 via-fuchsia-300 to-sky-300 px-4 py-3 text-center text-slate-950">
                      <div className="inline-flex items-center gap-2 text-base font-black md:text-lg">
                        <Trophy className="h-5 w-5" aria-hidden="true" />
                        <span>ليلة النهائي الكبير</span>
                      </div>
                      <div className="mt-1 text-xs font-black md:text-sm">
                        {match.homeTeamName} × {match.awayTeamName}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-3 text-center text-[10px] font-black md:text-xs">
                      <span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1.5 text-amber-100">
                        <Trophy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>النهائي</span>
                      </span>
                      <span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-fuchsia-300/25 bg-fuchsia-300/10 px-2 py-1.5 text-fuchsia-100">
                        <Rocket className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>سوبر ذهبي</span>
                      </span>
                      <span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-1.5 text-emerald-100">
                        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>التوقعات مخفية</span>
                      </span>
                    </div>

                    <div className="mx-3 mb-3 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 text-center text-[10px] font-black leading-5 md:text-xs">
                      <div className="rounded-xl bg-amber-300/10 px-2 py-2 text-amber-100">الأساسي حتى 20</div>
                      <div className="rounded-xl bg-fuchsia-300/10 px-2 py-2 text-fuchsia-100">الإضافات حتى 20</div>
                      <div className="rounded-xl bg-emerald-300/10 px-2 py-2 text-emerald-100">المجموع 40 نقطة</div>
                    </div>
                  </div>
                )}

                {golden && (
                  <div
                    className="relative mb-4 overflow-hidden rounded-2xl border border-fuchsia-300/40 bg-slate-950/75 shadow-md shadow-fuchsia-950/20"
                  >
                    <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-400 via-amber-300 to-orange-300 px-4 py-2 text-center text-[14px] font-black text-slate-950 md:text-base">
                      <Rocket className="h-4 w-4" />
                      <span>السوبر ذهبي</span>
                    </div>

                    <div className="space-y-2 px-4 py-3 text-center text-xs font-bold leading-6 text-amber-100 md:text-sm">
                      <div>
                        {finalMatch
                          ? "السوبر ذهبي — نهائي كأس العالم"
                          : "فرصة الريمونتادا الكبرى في المراحل الحاسمة"}
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <span className="rounded-full bg-amber-300 px-2 py-0.5 font-black text-slate-950">الملي +10</span>
                        <span className="rounded-full bg-fuchsia-300 px-2 py-0.5 font-black text-slate-950">الفائز +4</span>
                        <span className="rounded-full bg-blue-300 px-2 py-0.5 font-black text-slate-950">
                          {finalMatch ? "بطل كأس العالم +6" : "المتأهل +6"}
                        </span>
                        <span className="rounded-full bg-emerald-300 px-2 py-0.5 font-black text-slate-950">
                          {finalMatch ? "حسم اللقب +4" : "الطريقة +4"}
                        </span>
                      </div>

                      <div className="mx-auto mt-2 max-w-md rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2 text-[10px] font-bold leading-5 text-amber-100/85 md:text-xs">
                        حالة خاصة: إذا توقعت تعادلًا واخترت {finalMatch ? "البطل" : "المتأهل"} الصحيح، والمباراة انتهت فوزًا مباشرًا، تُحسب +4 فقط
                      </div>
                    </div>
                  </div>
                )}

                {knockout && (
                  <div className="relative mb-3 flex justify-center">
                    <div
                      className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black shadow-md md:text-xs ${knockoutRoundBadgeClasses}`}
                    >
                      <Swords className="h-3.5 w-3.5" />
                      <span>{knockoutRoundLabel}</span>
                    </div>
                  </div>
                )}

                {finalMatch && (
                  <div className="relative mb-4 rounded-3xl border border-sky-300/20 bg-slate-950/55 p-3 shadow-md shadow-sky-950/10">
                    <div className="mb-3 flex items-center justify-center gap-2 text-sm font-black text-white md:text-base">
                      <BarChart3 className="h-4 w-4 text-sky-200" aria-hidden="true" />
                      <span>توقعات الأعضاء</span>
                    </div>

                    {finalStats.totalVotes === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center text-xs font-bold text-slate-300">
                        تظهر النسب بعد اعتماد أول توقع للنهائي.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-black md:text-sm">
                            <span>{match.homeTeamName}</span>
                            <span className="text-amber-200">
                              <bdi dir="ltr">{homeVotePercent}%</bdi> —{" "}
                              <bdi dir="ltr">{finalStats.homeVotes}</bdi> عضو
                            </span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full rounded-full bg-amber-300" style={{ width: `${homeVotePercent}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-black md:text-sm">
                            <span>{match.awayTeamName}</span>
                            <span className="text-sky-200">
                              <bdi dir="ltr">{awayVotePercent}%</bdi> —{" "}
                              <bdi dir="ltr">{finalStats.awayVotes}</bdi> عضو
                            </span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full rounded-full bg-sky-300" style={{ width: `${awayVotePercent}%` }} />
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                <div className="relative mb-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div
                      className={`inline-flex items-center gap-1.5 text-right text-[14px] font-black md:text-base ${
                        golden ? "text-amber-100" : "text-slate-200"
                      }`}
                    >
                      <CalendarDays className="h-4 w-4 opacity-80" />
                      <span>{formatDate(match.matchDate)}</span>
                    </div>

                    <div
                      className={`inline-flex items-center gap-1.5 text-left text-xs font-bold md:text-sm ${
                        golden ? "text-amber-200" : "text-slate-300"
                      }`}
                    >
                      <Clock3 className="h-4 w-4 opacity-80" />
                      <bdi dir="ltr">{matchTime}</bdi>
                    </div>
                  </div>

                  <div
                    className={`relative w-full overflow-hidden rounded-full border px-3 py-1.5 text-center text-xs font-black shadow-md ${
                      closed
                        ? "border-red-400/20 bg-red-500/10 text-red-100 shadow-red-950/10"
                        : golden
                          ? "border-amber-300/40 bg-amber-400/20 text-amber-100 shadow-amber-950/10"
                          : "border-amber-400/20 bg-amber-400/10 text-amber-100 shadow-amber-950/10"
                    }`}
                  >
                    <span className="relative inline-flex items-center justify-center gap-1.5">
                      {closed ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        <Timer className="h-3.5 w-3.5" />
                      )}

                      <span>
                        {closed ? (
                          "انتهى وقت التوقع"
                        ) : (
                          <>
                            ينتهي التوقع خلال: <bdi>{countdownText}</bdi>
                          </>
                        )}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="relative grid grid-cols-[1fr_48px_1fr] items-center gap-2">
                  <div className="min-w-0 text-center">
                    <FloatingTeamFlag>
                      <TeamFlag
                        code={match.homeTeamCode}
                        emoji={match.homeTeamEmoji}
                        name={match.homeTeamName}
                        size="lg"
                      />
                    </FloatingTeamFlag>

                    <div className="mt-2 text-[18px] font-black leading-none text-white md:text-xl">
                      {match.homeTeamCode}
                    </div>

                    <div className="mx-auto mt-2 max-w-[96px] text-center text-xs font-bold leading-5 text-slate-200 md:max-w-[130px] md:text-sm">
                      {match.homeTeamName}
                    </div>
                  </div>

                  <div
                    className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full border text-xs font-black shadow-md ${
                      golden
                        ? "border-amber-300/40 bg-amber-400/20 text-amber-200 shadow-amber-950/15"
                        : "border-white/10 bg-white/10 text-amber-300 shadow-slate-950/15"
                    }`}
                  >
                    <span dir="ltr" aria-hidden="true">VS</span>
                    <span className="sr-only">ضد</span>
                  </div>

                  <div className="min-w-0 text-center">
                    <FloatingTeamFlag delay={0.35}>
                      <TeamFlag
                        code={match.awayTeamCode}
                        emoji={match.awayTeamEmoji}
                        name={match.awayTeamName}
                        size="lg"
                      />
                    </FloatingTeamFlag>

                    <div className="mt-2 text-[18px] font-black leading-none text-white md:text-xl">
                      {match.awayTeamCode}
                    </div>

                    <div className="mx-auto mt-2 max-w-[96px] text-center text-xs font-bold leading-5 text-slate-200 md:max-w-[130px] md:text-sm">
                      {match.awayTeamName}
                    </div>
                  </div>
                </div>

                {editing ? (
                  <div
                    className="relative mt-5"
                  >
                    <div className="mb-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-center text-xs font-black text-amber-100 shadow-md shadow-amber-950/10">
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <Edit3 className="h-4 w-4" />
                        <span>تعديل التوقع متاح لمدة 5 دقائق بعد الاعتماد</span>
                      </span>
                    </div>

                    {renderScoreInputs(match, golden)}
                    {renderQualificationFields(match, knockoutDrawInput)}
                    {renderFinalBonusFields(match)}

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={savingMatchId === match.id}
                        onClick={() => handleUpdatePrediction(match)}
                        className={`inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[14px] font-black text-slate-950 shadow-md transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                          golden
                            ? "bg-amber-300 shadow-amber-400/10 hover:bg-amber-200"
                            : "bg-amber-400 shadow-amber-950/10 hover:bg-amber-300"
                        }`}
                      >
                        <Save className="h-4 w-4" />
                        <span>
                          {savingMatchId === match.id
                            ? "جاري التعديل..."
                            : "حفظ التعديل"}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={savingMatchId === match.id}
                        onClick={() => cancelEditingPrediction(match.id)}
                        className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-[14px] font-black text-slate-200 shadow-md shadow-slate-950/10 transition hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <X className="h-4 w-4" />
                        <span>إلغاء</span>
                      </button>
                    </div>
                  </div>
                ) : savedPrediction ? (
                  <div
                    className="relative mt-5 space-y-2"
                  >
                    {isGoldenPrediction(savedPrediction) && (
                      <div className="rounded-2xl border border-amber-300/40 bg-amber-400 px-3 py-2 text-center text-xs font-black text-slate-950 shadow-md shadow-amber-950/10">
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <Rocket className="h-4 w-4" />
                          <span>
                            {finalMatch
                              ? "تم اعتماد توقع النهائي"
                              : "تم اعتماد السوبر ذهبي"}
                          </span>
                        </span>
                      </div>
                    )}

                    <div
                      role="status"
                      aria-live="polite"
                      aria-atomic="true"
                      className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-center text-[14px] font-black text-emerald-100 shadow-md shadow-emerald-950/10"
                    >
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>وصل توقعك واعتمدناه</span>
                      </span>
                    </div>

                    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-center text-[16px] font-black text-emerald-100 shadow-md shadow-emerald-950/10">
                      توقعك المعتمد:{" "}
                      <bdi dir="ltr" className="inline-block tabular-nums">
                        {savedPrediction.homeScore} - {savedPrediction.awayScore}
                      </bdi>
                    </div>

                    {savedPrediction.qualifiedTeamCode &&
                      (() => {
                        const qualifiedTeam = getQualifiedTeamFlagData(
                          match,
                          savedPrediction.qualifiedTeamCode
                        );

                        return (
                          <div className="rounded-2xl border border-blue-400/30 bg-blue-400/10 p-3 text-center text-xs font-bold leading-6 text-blue-100 shadow-md shadow-blue-950/10 md:text-sm">
                            {finalMatch ? "بطل كأس العالم" : "المتأهل"}:{" "}
                            <span className="inline-flex items-center justify-center gap-1.5 font-black text-white">
                              {qualifiedTeam && (
                                <TeamFlag
                                  code={qualifiedTeam.code}
                                  emoji={qualifiedTeam.emoji}
                                  name={qualifiedTeam.name}
                                  size="sm"
                                />
                              )}
                              {getQualifiedTeamName(
                                match,
                                savedPrediction.qualifiedTeamCode
                              )}
                            </span>
                            {savedPrediction.qualificationMethod && (
                              <>
                                {" "}
                                • {finalMatch ? "طريقة حسم اللقب" : "طريقة التأهل"}:{" "}
                                <span className="font-black text-white">
                                  {getQualificationMethodLabel(
                                    savedPrediction.qualificationMethod
                                  )}
                                </span>
                              </>
                            )}
                          </div>
                        );
                      })()}

                    {renderSavedFinalBonusPrediction(match, savedPrediction)}

                    {editable && (
                      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-center shadow-md shadow-amber-950/10">
                        <div className="text-xs font-black text-amber-100 md:text-sm">
                          <span className="inline-flex items-center justify-center gap-1.5">
                            <Edit3 className="h-4 w-4" />
                            <span>تعديل التوقع متاح لمدة 5 دقائق بعد الاعتماد</span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            startEditingPrediction(match, savedPrediction)
                          }
                          className="mt-2 inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 shadow-md shadow-amber-950/10 transition hover:bg-amber-300 active:scale-95"
                        >
                          <PencilLine className="h-4 w-4" />
                          <span>تعديل التوقع</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : closed ? (
                  <div className="relative mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-center text-[14px] font-bold text-red-100 shadow-md shadow-red-950/10">
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <Lock className="h-4 w-4" />
                      <span>انتهى وقت استقبال التوقعات لهذه المباراة.</span>
                    </span>
                  </div>
                ) : (
                  <div
                    className="relative mt-5"
                  >
                    {renderScoreInputs(match, golden)}
                    {renderQualificationFields(match, knockoutDrawInput)}
                    {renderFinalBonusFields(match)}

                    <button
                      type="button"
                      disabled={savingMatchId === match.id}
                      onClick={() => handleSubmitPrediction(match)}
                      className={`group relative mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-4 py-3 text-[14px] font-black text-slate-950 shadow-md transition hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                        golden
                          ? "bg-amber-300 shadow-amber-400/10 hover:bg-amber-200"
                          : "bg-amber-400 shadow-amber-950/10 hover:bg-amber-300"
                      }`}
                    >
                      <span className="pointer-events-none absolute inset-0 translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition duration-700 group-hover:translate-x-[-120%]" />

                      {savingMatchId === match.id ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                          <span>جاري الاعتماد...</span>
                        </>
                      ) : isLoggedIn ? (
                        finalMatch ? (
                          <>
                            <Trophy className="h-4 w-4" />
                            <span>اعتماد توقع النهائي</span>
                          </>
                        ) : golden ? (
                          <>
                            <Rocket className="h-4 w-4" />
                            <span>اعتماد السوبر ذهبي</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4" />
                            <span>اعتماد التوقع</span>
                          </>
                        )
                      ) : (
                        <>
                          <LogIn className="h-4 w-4" />
                          <span>سجّل الدخول لاعتماد التوقع</span>
                        </>
                      )}
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
