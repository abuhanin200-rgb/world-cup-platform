"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
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
  Swords,
  Timer,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Match, getAllMatches } from "@/lib/matches";
import {
  getPredictionEditWindowRemainingMs,
  getUserPredictionForMatch,
  Prediction,
  submitPrediction,
  updatePrediction,
} from "@/lib/predictions";
import { useAuth } from "@/context/AuthContext";
import TeamFlag from "@/components/TeamFlag";

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

const scrollOnceViewport = {
  once: true,
  amount: 0.18,
} as const;

const sectionMotion: Variants = {
  hidden: { opacity: 1, y: 0, scale: 1 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0, ease: "linear" },
  },
};

const cardMotion: Variants = {
  hidden: { opacity: 1, y: 0, scale: 1 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0, ease: "linear" },
  },
};

const matchCardMotion: Variants = {
  hidden: { opacity: 1, y: 0, scale: 1 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0, ease: "linear" },
  },
};

const slideDownMotion: Variants = {
  hidden: { opacity: 1, y: 0, scale: 1 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0, ease: "linear" },
  },
  exit: { opacity: 1, y: 0, scale: 1, transition: { duration: 0 } },
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
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="flex justify-center transition-transform duration-200"
      style={{ transitionDelay: `${Math.round(delay * 100)}ms` }}
    >
      {children}
    </div>
  );
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

      const data = await getAllMatches();

      const availableMatches = data.filter((match) => {
        const matchStatus = match as Match & {
          isActive?: boolean;
          resultCalculated?: boolean;
        };

        return matchStatus.isActive !== false && !matchStatus.resultCalculated;
      });

      setMatches(availableMatches);
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
        homeTeamCode: match.homeTeamCode,
        awayTeamCode: match.awayTeamCode,

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
      <motion.div
        variants={cardMotion}
        className="grid grid-cols-[1fr_28px_1fr] items-center gap-2"
      >
        <input
          inputMode="numeric"
          value={inputs[match.id]?.homeScore || ""}
          onChange={(event) =>
            updateInput(match.id, "homeScore", event.target.value)
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
          inputMode="numeric"
          value={inputs[match.id]?.awayScore || ""}
          onChange={(event) =>
            updateInput(match.id, "awayScore", event.target.value)
          }
          placeholder="0"
          className={`h-14 w-full rounded-2xl border px-3 text-center text-[24px] font-black text-white shadow-inner outline-none transition duration-200 focus:scale-[1.02] focus:ring-2 ${
            golden
              ? "border-amber-300/30 bg-slate-950/90 focus:border-amber-300 focus:ring-amber-300/25"
              : "border-white/10 bg-slate-950/80 focus:border-amber-400 focus:ring-amber-400/25"
          }`}
        />
      </motion.div>
    );
  }

  function renderQualificationFields(match: Match, visible: boolean) {
    return (
      <AnimatePresence>
        {visible && (
          <motion.div
            variants={slideDownMotion}
            initial="hidden"
            animate="show"
            exit="exit"
            className="mt-3 grid gap-2 md:grid-cols-2"
          >
            <select
              value={inputs[match.id]?.qualifiedTeamCode || ""}
              onChange={(event) =>
                updateInput(match.id, "qualifiedTeamCode", event.target.value)
              }
              className="h-12 rounded-2xl border border-blue-300/30 bg-slate-950/90 px-3 text-[14px] font-bold text-white outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-300/20"
            >
              <option value="">اختر المنتخب المتأهل</option>
              <option value={match.homeTeamCode}>{match.homeTeamName}</option>
              <option value={match.awayTeamCode}>{match.awayTeamName}</option>
            </select>

            <select
              value={inputs[match.id]?.qualificationMethod || ""}
              onChange={(event) =>
                updateInput(match.id, "qualificationMethod", event.target.value)
              }
              className="h-12 rounded-2xl border border-blue-300/30 bg-slate-950/90 px-3 text-[14px] font-bold text-white outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-300/20"
            >
              <option value="">اختر طريقة التأهل</option>
              <option value="extraTime">أشواط إضافية</option>
              <option value="penalties">ركلات ترجيح</option>
            </select>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <motion.section
      variants={sectionMotion}
      initial="hidden"
      whileInView="show"
      viewport={scrollOnceViewport}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.08] p-4 text-white shadow-lg shadow-slate-950/25 backdrop-blur-sm md:p-5"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-cyan-400/5" />
      <div className="pointer-events-none absolute -right-20 top-16 h-44 w-44 rounded-full bg-amber-300/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-20 bottom-20 h-44 w-44 rounded-full bg-cyan-300/10 blur-2xl" />

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
        <motion.div
          variants={cardMotion}
          className="relative rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-slate-300 shadow-inner"
        >
          <div className="inline-flex items-center gap-2 text-[14px] font-bold">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span>جاري تحميل المباريات...</span>
          </div>
        </motion.div>
      ) : sortedMatches.length === 0 ? (
        <motion.div
          variants={cardMotion}
          className="relative rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-6 text-center text-slate-300 shadow-inner"
        >
          <div className="inline-flex items-center justify-center gap-2 text-[14px] font-bold">
            <CalendarDays className="h-4 w-4 text-slate-300" />
            <span>لا توجد مباريات غير محتسبة حاليًا.</span>
          </div>
        </motion.div>
      ) : (
        <motion.div variants={sectionMotion} className="relative space-y-4">
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

            const editable =
              savedPrediction && canEditPrediction(savedPrediction, match);
            const editing = editingMatchId === match.id && Boolean(editable);

            return (
              <motion.article
                key={match.id}
                variants={matchCardMotion}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.24 }}
                whileTap={{ scale: 0.997 }}
                className={`relative transform-gpu overflow-hidden rounded-3xl border p-4 shadow-lg transition duration-200 ${
                  golden
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

                {golden && (
                  <motion.div
                    variants={cardMotion}
                    className="relative mb-4 overflow-hidden rounded-2xl border border-fuchsia-300/40 bg-slate-950/75 shadow-md shadow-fuchsia-950/20"
                  >
                    <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-400 via-amber-300 to-orange-300 px-4 py-2 text-center text-[14px] font-black text-slate-950 md:text-base">
                      <Rocket className="h-4 w-4" />
                      <span>السوبر ذهبي</span>
                    </div>

                    <div className="space-y-2 px-4 py-3 text-center text-xs font-bold leading-6 text-amber-100 md:text-sm">
                      <div>فرصة الريمونتادا الكبرى في المراحل الحاسمة</div>
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <span className="rounded-full bg-amber-300 px-2 py-0.5 font-black text-slate-950">الملي +10</span>
                        <span className="rounded-full bg-fuchsia-300 px-2 py-0.5 font-black text-slate-950">الفائز +4</span>
                        <span className="rounded-full bg-blue-300 px-2 py-0.5 font-black text-slate-950">المتأهل +6</span>
                        <span className="rounded-full bg-emerald-300 px-2 py-0.5 font-black text-slate-950">الطريقة +4</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {knockout && (
                  <div className="relative mb-4 flex items-center justify-center gap-1.5 rounded-2xl border border-blue-300/30 bg-blue-400/10 px-4 py-2 text-center text-xs font-black text-blue-100">
                    <Swords className="h-4 w-4" />
                    <span>خروج المغلوب</span>
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
                      <span>{matchTime}</span>
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
                        {closed
                          ? "انتهى وقت التوقع"
                          : `ينتهي التوقع خلال: ${countdownText}`}
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
                    VS
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
                  <motion.div
                    variants={sectionMotion}
                    initial="hidden"
                    animate="show"
                    className="relative mt-5"
                  >
                    <div className="mb-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-center text-xs font-black text-amber-100 shadow-md shadow-amber-950/10">
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <Edit3 className="h-4 w-4" />
                        <span>تعديل التوقع متاح حتى بداية المباراة</span>
                      </span>
                    </div>

                    {renderScoreInputs(match, golden)}
                    {renderQualificationFields(match, knockoutDrawInput)}

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
                  </motion.div>
                ) : savedPrediction ? (
                  <motion.div
                    variants={sectionMotion}
                    initial="hidden"
                    animate="show"
                    className="relative mt-5 space-y-2"
                  >
                    {isGoldenPrediction(savedPrediction) && (
                      <div className="rounded-2xl border border-amber-300/40 bg-amber-400 px-3 py-2 text-center text-xs font-black text-slate-950 shadow-md shadow-amber-950/10">
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <Rocket className="h-4 w-4" />
                          <span>تم اعتماد السوبر ذهبي</span>
                        </span>
                      </div>
                    )}

                    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-center text-[14px] font-black text-emerald-100 shadow-md shadow-emerald-950/10">
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>وصل توقعك واعتمدناه</span>
                      </span>
                    </div>

                    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-center text-[16px] font-black text-emerald-100 shadow-md shadow-emerald-950/10">
                      توقعك المعتمد: {savedPrediction.homeScore} -{" "}
                      {savedPrediction.awayScore}
                    </div>

                    {savedPrediction.qualifiedTeamCode &&
                      (() => {
                        const qualifiedTeam = getQualifiedTeamFlagData(
                          match,
                          savedPrediction.qualifiedTeamCode
                        );

                        return (
                          <div className="rounded-2xl border border-blue-400/30 bg-blue-400/10 p-3 text-center text-xs font-bold leading-6 text-blue-100 shadow-md shadow-blue-950/10 md:text-sm">
                            المتأهل:{" "}
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
                                • طريقة التأهل:{" "}
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

                    {editable && (
                      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-center shadow-md shadow-amber-950/10">
                        <div className="text-xs font-black text-amber-100 md:text-sm">
                          <span className="inline-flex items-center justify-center gap-1.5">
                            <Edit3 className="h-4 w-4" />
                            <span>تعديل التوقع متاح حتى بداية المباراة</span>
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
                  </motion.div>
                ) : closed ? (
                  <div className="relative mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-center text-[14px] font-bold text-red-100 shadow-md shadow-red-950/10">
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <Lock className="h-4 w-4" />
                      <span>انتهى وقت استقبال التوقعات لهذه المباراة.</span>
                    </span>
                  </div>
                ) : (
                  <motion.div
                    variants={sectionMotion}
                    initial="hidden"
                    animate="show"
                    className="relative mt-5"
                  >
                    {renderScoreInputs(match, golden)}
                    {renderQualificationFields(match, knockoutDrawInput)}

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
                        golden ? (
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
                  </motion.div>
                )}
              </motion.article>
            );
          })}
        </motion.div>
      )}
    </motion.section>
  );
}