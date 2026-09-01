"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  Award,
  BarChart3,
  Brain,
  CheckCircle2,
  CircleDot,
  Clock3,
  Crown,
  Dumbbell,
  Flame,
  Gem,
  Hand,
  Lock,
  Medal,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { getLeaderboardUsers, LeaderboardUser } from "@/lib/leaderboard";
import { getPredictionsByUserId, Prediction } from "@/lib/predictions";
import TeamFlag from "@/components/TeamFlag";
import { getFinalSquadPlayerName } from "@/data/finalSquads";

const USERS_PER_PAGE = 20;
const MEMBER_PREDICTIONS_PER_PAGE = 6;

const scrollOnceViewport = {
  once: true,
  amount: 0.18,
} as const;

const leaderboardSectionMotion: Variants = {
  hidden: { opacity: 1, y: 0, scale: 1 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0, ease: "linear" },
  },
};

const leaderboardRowMotion: Variants = {
  hidden: { opacity: 1, y: 0, scale: 1 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0, ease: "linear" },
  },
};

const modalCardMotion: Variants = {
  hidden: { opacity: 1, y: 0, scale: 1 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0, ease: "linear" },
  },
};

const modalOverlayMotion: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.16, ease: "easeOut" } },
};

const modalPanelMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 26,
    scale: 0.98,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.28,
      ease: "easeOut",
      staggerChildren: 0.035,
    },
  },
};

const modalItemMotion: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.99 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.24, ease: "easeOut" },
  },
};

const modalListMotion: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.025 } },
};

type MemberAchievement = {
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
};

function MemberIcon({
  icon,
  className = "h-5 w-5",
}: {
  icon: string;
  className?: string;
}) {
  const props = {
    className,
    strokeWidth: 2.4,
    "aria-hidden": true,
  } as const;

  if (icon === "🥇") return <Crown {...props} />;
  if (icon === "🥈" || icon === "🥉" || icon === "🏅") return <Medal {...props} />;
  if (icon === "⭐") return <Star {...props} />;
  if (icon === "🏆") return <Trophy {...props} />;
  if (icon === "🎯") return <Target {...props} />;
  if (icon === "⚽") return <CircleDot {...props} />;
  if (icon === "🔥") return <Flame {...props} />;
  if (icon === "📊") return <BarChart3 {...props} />;
  if (icon === "📈") return <TrendingUp {...props} />;
  if (icon === "🔮") return <Sparkles {...props} />;
  if (icon === "👋") return <Hand {...props} />;
  if (icon === "💪") return <Dumbbell {...props} />;
  if (icon === "🧠") return <Brain {...props} />;
  if (icon === "💎") return <Gem {...props} />;
  if (icon === "⚡") return <Zap {...props} />;
  if (icon === "🚀") return <Rocket {...props} />;
  if (icon === "✅") return <CheckCircle2 {...props} />;
  if (icon === "⏳") return <Clock3 {...props} />;
  if (icon === "🟡") return <Award {...props} />;
  if (icon === "🔒") return <Lock {...props} />;

  return <ShieldCheck {...props} />;
}

function getTitleIcon(title: string) {
  if (title.includes("متصدر")) return "🥇";
  if (title.includes("منافس شرس")) return "🏅";
  if (title.includes("النخبة")) return "💪";
  if (title.includes("أسطورة")) return "⭐";
  if (title.includes("محترف")) return "🏆";
  if (title.includes("خبير")) return "🧠";
  if (title.includes("صياد")) return "🎯";
  if (title.includes("حاضر")) return "⚽";
  if (title.includes("نشيط")) return "🔥";
  if (title.includes("محلل")) return "📊";
  if (title.includes("مبتدئ")) return "🔮";
  if (title.includes("مشجع")) return "👋";

  return "🏅";
}

function cleanTitleText(value: string) {
  return value
    .replace(/[🥇🥈🥉🏅⭐🏆🎯⚽🔥📊📈🔮👋💪🧠💎⚡🚀✅⏳🟡🔒]/gu, "")
    .trim();
}

function TitleProgressLabel({
  value,
  iconClassName = "h-4 w-4",
}: {
  value: string;
  iconClassName?: string;
}) {
  if (value === "أنت وصلت لأعلى لقب حاليًا") {
    return <span>{value}</span>;
  }

  const cleanValue = cleanTitleText(value);

  return (
    <span className="inline-flex items-center gap-1.5">
      <MemberIcon icon={getTitleIcon(cleanValue)} className={iconClassName} />
      <span>{cleanValue}</span>
    </span>
  );
}

function RankMovement({ user }: { user: LeaderboardUser }) {
  if (user.rankDirection === "up") {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 md:h-6 md:w-6">
        <svg
          viewBox="0 0 24 24"
          className="h-3 w-3 md:h-3.5 md:w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 19V5" />
          <path d="M6 11l6-6 6 6" />
        </svg>
      </span>
    );
  }

  if (user.rankDirection === "down") {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm shadow-red-500/20 md:h-6 md:w-6">
        <svg
          viewBox="0 0 24 24"
          className="h-3 w-3 md:h-3.5 md:w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14" />
          <path d="M18 13l-6 6-6-6" />
        </svg>
      </span>
    );
  }

  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 text-white shadow-sm shadow-slate-700/20 md:h-6 md:w-6">
      <span className="block h-[2.5px] w-3 rounded-full bg-white md:w-3.5" />
    </span>
  );
}

function getTopRankStyle(rank: number) {
  if (rank === 1) {
    return {
      rowClass:
        "bg-gradient-to-l from-amber-400/20 via-amber-300/10 to-transparent",
      badgeClass:
        "bg-gradient-to-br from-amber-300 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/30 ring-2 ring-amber-200/40",
      nameClass: "text-amber-100",
      icon: "",
      medal: "🥇",
    };
  }

  if (rank === 2) {
    return {
      rowClass:
        "bg-gradient-to-l from-slate-300/16 via-slate-200/8 to-transparent",
      badgeClass:
        "bg-gradient-to-br from-slate-100 to-slate-400 text-slate-950 shadow-lg shadow-slate-400/20 ring-2 ring-slate-100/30",
      nameClass: "text-slate-100",
      icon: "",
      medal: "🥈",
    };
  }

  if (rank === 3) {
    return {
      rowClass:
        "bg-gradient-to-l from-orange-500/16 via-orange-300/8 to-transparent",
      badgeClass:
        "bg-gradient-to-br from-orange-300 to-orange-600 text-slate-950 shadow-lg shadow-orange-500/20 ring-2 ring-orange-200/30",
      nameClass: "text-orange-100",
      icon: "",
      medal: "🥉",
    };
  }

  return {
    rowClass: "",
    badgeClass: "bg-amber-400 text-slate-950 shadow-lg",
    nameClass: "text-white",
    icon: "",
    medal: "",
  };
}

function RankBadge({ rank }: { rank: number }) {
  const style = getTopRankStyle(rank);

  return (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black md:h-9 md:w-9 md:text-sm ${style.badgeClass}`}
    >
      {rank <= 3 ? style.medal : rank}
    </span>
  );
}

function isGoldenPrediction(prediction: Prediction) {
  return prediction.predictionType === "golden";
}

function KnockoutRoundBadge({ prediction }: { prediction: Prediction }) {
  if (prediction.matchStage !== "knockout") return null;

  if (prediction.knockoutRound === "semiFinal") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/30 bg-violet-400/10 px-3 py-1 text-[11px] font-black text-violet-100">
        <Target className="h-3.5 w-3.5" aria-hidden="true" />
        <span>نصف النهائي</span>
      </span>
    );
  }

  if (prediction.knockoutRound === "thirdPlace") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-300/30 bg-orange-400/10 px-3 py-1 text-[11px] font-black text-orange-100">
        <Medal className="h-3.5 w-3.5" aria-hidden="true" />
        <span>المركز الثالث</span>
      </span>
    );
  }

  if (prediction.knockoutRound === "final") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/35 bg-amber-400/10 px-3 py-1 text-[11px] font-black text-amber-100">
        <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
        <span>النهائي</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300/30 bg-blue-400/10 px-3 py-1 text-[11px] font-black text-blue-100">
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      <span>خروج مغلوب</span>
    </span>
  );
}

function getQualificationMethodLabel(value?: string | null) {
  if (value === "regularTime") return "الوقت الأصلي";
  if (value === "extraTime") return "أشواط إضافية";
  if (value === "penalties") return "ركلات ترجيح";
  return "";
}

const TEAM_CODE_ARABIC_NAMES: Record<string, string> = {
  ARG: "الأرجنتين",
  AUS: "أستراليا",
  AUT: "النمسا",
  BEL: "بلجيكا",
  BIH: "البوسنة والهرسك",
  BRA: "البرازيل",
  CAN: "كندا",
  CIV: "ساحل العاج",
  COD: "الكونغو الديمقراطية",
  COL: "كولومبيا",
  CPV: "الرأس الأخضر",
  CRO: "كرواتيا",
  CZE: "التشيك",
  DEN: "الدنمارك",
  ECU: "الإكوادور",
  EGY: "مصر",
  ENG: "إنجلترا",
  ESP: "إسبانيا",
  FRA: "فرنسا",
  GER: "ألمانيا",
  GHA: "غانا",
  HAI: "هايتي",
  IRN: "إيران",
  IRQ: "العراق",
  JOR: "الأردن",
  JPN: "اليابان",
  KOR: "كوريا الجنوبية",
  MAR: "المغرب",
  MEX: "المكسيك",
  NED: "هولندا",
  NOR: "النرويج",
  NZL: "نيوزيلندا",
  PAN: "بنما",
  PAR: "باراغواي",
  POR: "البرتغال",
  QAT: "قطر",
  RSA: "جنوب أفريقيا",
  KSA: "السعودية",
  SEN: "السنغال",
  SUI: "سويسرا",
  SWE: "السويد",
  TUN: "تونس",
  TUR: "تركيا",
  URU: "الأوروغواي",
  USA: "الولايات المتحدة",
  UZB: "أوزبكستان",
  DZA: "الجزائر",
};

function getQualifiedTeamName(
  prediction: Prediction,
  qualifiedTeamCode?: string | null,
) {
  if (!qualifiedTeamCode) return "";

  const code = qualifiedTeamCode.trim().toUpperCase();

  const predictionWithCodes = prediction as Prediction & {
    homeTeamCode?: string | null;
    awayTeamCode?: string | null;
  };

  if (
    predictionWithCodes.homeTeamCode &&
    code === predictionWithCodes.homeTeamCode.trim().toUpperCase()
  ) {
    return prediction.homeTeamName;
  }

  if (
    predictionWithCodes.awayTeamCode &&
    code === predictionWithCodes.awayTeamCode.trim().toUpperCase()
  ) {
    return prediction.awayTeamName;
  }

  return TEAM_CODE_ARABIC_NAMES[code] || qualifiedTeamCode;
}

type MemberKnockoutPrediction = Prediction & {
  qualifiedTeamCode?: string | null;
  qualificationMethod?: string | null;
  actualQualifiedTeamCode?: string | null;
  actualQualificationMethod?: string | null;
};

function normalizeNumberValue(value?: number | string | null) {
  if (value === undefined || value === null || value === "") return null;

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeTeamCode(value?: string | null) {
  return value ? value.trim().toUpperCase() : "";
}

function normalizeTeamName(value?: string | null) {
  return value ? value.trim() : "";
}

function getTeamCodeFromName(name?: string | null) {
  const normalizedName = normalizeTeamName(name);

  if (!normalizedName) return "";

  const match = Object.entries(TEAM_CODE_ARABIC_NAMES).find(
    ([, arabicName]) => arabicName === normalizedName,
  );

  return match?.[0] || "";
}

function getPredictionHomeTeamCode(prediction: Prediction) {
  const predictionWithCodes = prediction as Prediction & {
    homeTeamCode?: string | null;
  };

  return (
    normalizeTeamCode(predictionWithCodes.homeTeamCode) ||
    getTeamCodeFromName(prediction.homeTeamName)
  );
}

function getPredictionAwayTeamCode(prediction: Prediction) {
  const predictionWithCodes = prediction as Prediction & {
    awayTeamCode?: string | null;
  };

  return (
    normalizeTeamCode(predictionWithCodes.awayTeamCode) ||
    getTeamCodeFromName(prediction.awayTeamName)
  );
}

function getLeaderboardUserTeamCode(user: LeaderboardUser) {
  const userWithTeamCode = user as LeaderboardUser & {
    teamCode?: string | null;
    favoriteTeamCode?: string | null;
  };

  return (
    normalizeTeamCode(userWithTeamCode.teamCode) ||
    normalizeTeamCode(userWithTeamCode.favoriteTeamCode) ||
    getTeamCodeFromName(user.favoriteTeam)
  );
}

function getQualifiedTeamCode(
  prediction: Prediction,
  qualifiedTeamCode?: string | null,
) {
  const code = normalizeTeamCode(qualifiedTeamCode);

  if (!code) return "";

  const homeTeamCode = getPredictionHomeTeamCode(prediction);
  const awayTeamCode = getPredictionAwayTeamCode(prediction);

  if (homeTeamCode && code === homeTeamCode) return homeTeamCode;
  if (awayTeamCode && code === awayTeamCode) return awayTeamCode;

  return code;
}

function getQualifiedTeamEmoji(
  prediction: Prediction,
  qualifiedTeamCode?: string | null,
) {
  const code = normalizeTeamCode(qualifiedTeamCode);
  const homeTeamCode = getPredictionHomeTeamCode(prediction);
  const awayTeamCode = getPredictionAwayTeamCode(prediction);

  if (code && homeTeamCode && code === homeTeamCode) {
    return prediction.homeTeamEmoji || "";
  }

  if (code && awayTeamCode && code === awayTeamCode) {
    return prediction.awayTeamEmoji || "";
  }

  return "";
}

function getExactPoints(prediction: Prediction) {
  return isGoldenPrediction(prediction) ? 10 : 3;
}

function getWinnerPoints(prediction: Prediction) {
  return isGoldenPrediction(prediction) ? 4 : 1;
}

function getQualifiedTeamPoints(prediction: Prediction) {
  return isGoldenPrediction(prediction) ? 6 : 2;
}

function getQualificationMethodPoints(prediction: Prediction) {
  return isGoldenPrediction(prediction) ? 4 : 1;
}

function getKnockoutPointsBreakdown(prediction: Prediction) {
  if (!prediction.isCalculated) return null;

  const knockoutPrediction = prediction as MemberKnockoutPrediction;

  const homeScore = normalizeNumberValue(prediction.homeScore);
  const awayScore = normalizeNumberValue(prediction.awayScore);
  const actualHomeScore = normalizeNumberValue(prediction.actualHomeScore);
  const actualAwayScore = normalizeNumberValue(prediction.actualAwayScore);

  if (
    homeScore === null ||
    awayScore === null ||
    actualHomeScore === null ||
    actualAwayScore === null
  ) {
    return null;
  }

  const predictionWasDraw = homeScore === awayScore;
  const actualWasDraw = actualHomeScore === actualAwayScore;

  if (!predictionWasDraw) {
    return null;
  }

  const scoreCorrect =
    homeScore === actualHomeScore && awayScore === actualAwayScore;

  const qualifiedTeamCode = getQualifiedTeamCode(
    prediction,
    knockoutPrediction.qualifiedTeamCode,
  );

  const actualQualifiedTeamCode = getQualifiedTeamCode(
    prediction,
    knockoutPrediction.actualQualifiedTeamCode,
  );

  const qualifiedTeamCorrect =
    qualifiedTeamCode !== "" &&
    actualQualifiedTeamCode !== "" &&
    qualifiedTeamCode === actualQualifiedTeamCode;

  const qualificationMethodCorrect =
    Boolean(knockoutPrediction.qualificationMethod) &&
    knockoutPrediction.qualificationMethod ===
      knockoutPrediction.actualQualificationMethod;

  if (actualWasDraw) {
    if (
      !knockoutPrediction.actualQualifiedTeamCode ||
      !knockoutPrediction.actualQualificationMethod
    ) {
      return null;
    }

    return {
      scorePoints: scoreCorrect
        ? getExactPoints(prediction)
        : getWinnerPoints(prediction),
      qualifiedTeamLabel: "المتأهل",
      qualifiedTeamPoints: qualifiedTeamCorrect
        ? getQualifiedTeamPoints(prediction)
        : 0,
      qualificationMethodPoints: qualificationMethodCorrect
        ? getQualificationMethodPoints(prediction)
        : 0,
    };
  }

  const homeTeamCode = getPredictionHomeTeamCode(prediction);
  const awayTeamCode = getPredictionAwayTeamCode(prediction);
  const actualWinnerTeamCode =
    actualHomeScore > actualAwayScore ? homeTeamCode : awayTeamCode;

  const qualifiedTeamMatchesDirectWinner =
    qualifiedTeamCode !== "" &&
    actualWinnerTeamCode !== "" &&
    qualifiedTeamCode === actualWinnerTeamCode;

  if (!qualifiedTeamMatchesDirectWinner) {
    return null;
  }

  return {
    scorePoints: 0,
    qualifiedTeamLabel: "المتأهل في فوز مباشر",
    qualifiedTeamPoints: getWinnerPoints(prediction),
    qualificationMethodPoints: 0,
  };
}

function PointsBreakdownItem({
  label,
  points,
}: {
  label: string;
  points: number;
}) {
  const hasPoints = points > 0;

  return (
    <div
      className={`rounded-xl border px-2 py-2 text-center ${
        hasPoints
          ? "border-emerald-400/25 bg-emerald-400/10"
          : "border-slate-400/15 bg-slate-400/10"
      }`}
    >
      <div className="text-[10px] font-bold text-slate-300 md:text-[11px]">
        {label}
      </div>

      <div
        className={`mt-1 text-xs font-black md:text-sm ${
          hasPoints ? "text-emerald-300" : "text-slate-400"
        }`}
      >
        +{points}
      </div>
    </div>
  );
}

function PointsBreakdown({ prediction }: { prediction: Prediction }) {
  const breakdown = getKnockoutPointsBreakdown(prediction);

  if (!breakdown) return null;

  return (
    <div className="rounded-2xl border border-amber-400/20 bg-slate-950/50 p-3">
      <div className="mb-2 text-center text-[11px] font-black text-amber-200 md:text-xs">
        تفصيل النقاط
      </div>

      <div className="grid grid-cols-3 gap-1.5 md:gap-2">
        <PointsBreakdownItem label="النتيجة" points={breakdown.scorePoints} />

        <PointsBreakdownItem
          label={breakdown.qualifiedTeamLabel || "المتأهل"}
          points={breakdown.qualifiedTeamPoints}
        />

        <PointsBreakdownItem
          label="الطريقة"
          points={breakdown.qualificationMethodPoints}
        />
      </div>
    </div>
  );
}

type UnknownRecord = Record<string, unknown>;

type FinalPredictionDisplayData = {
  predictedChampionCode: string;
  actualChampionCode: string;
  predictedDecisionMethod: string;
  actualDecisionMethod: string;
  scoreExact: boolean;
  scoreOutcomeCorrect: boolean;
  scorePoints: number;
  championPoints: number;
  decisionMethodPoints: number;
  basePoints: number;
  predictedFirstScoringTeamCode: string;
  actualFirstScoringTeamCode: string;
  firstScoringTeamPoints: number;
  predictedSpainScorer: string;
  actualSpainScorer: string;
  firstSpainScorerPoints: number;
  predictedArgentinaScorer: string;
  actualArgentinaScorer: string;
  firstArgentinaScorerPoints: number;
  bonusPoints: number;
  totalPoints: number;
};

function isFinalPrediction(prediction: Prediction) {
  return (
    prediction.matchStage === "knockout" &&
    prediction.knockoutRound === "final"
  );
}

function asUnknownRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as UnknownRecord;
}

function getFirstTextValue(sources: UnknownRecord[], keys: string[]) {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  return "";
}

function getFirstNumberValue(sources: UnknownRecord[], keys: string[]) {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];

      if (value === undefined || value === null || value === "") continue;

      const numberValue = Number(value);

      if (Number.isFinite(numberValue)) {
        return numberValue;
      }
    }
  }

  return null;
}

function normalizeComparableText(value?: string | null) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("ar")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

function isSameText(first?: string | null, second?: string | null) {
  const normalizedFirst = normalizeComparableText(first);
  const normalizedSecond = normalizeComparableText(second);

  return (
    normalizedFirst !== "" &&
    normalizedSecond !== "" &&
    normalizedFirst === normalizedSecond
  );
}

function getScoreOutcome(homeScore: number, awayScore: number) {
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
}

function getWinnerCodeFromScore(
  prediction: Prediction,
  homeScore: number,
  awayScore: number,
) {
  if (homeScore === awayScore) return "";

  return homeScore > awayScore
    ? getPredictionHomeTeamCode(prediction)
    : getPredictionAwayTeamCode(prediction);
}

function normalizeFinalTeamSelection(
  prediction: Prediction,
  value?: string | null,
) {
  const normalizedValue = normalizeTeamCode(value);

  if (!normalizedValue) return "";

  if (
    normalizedValue === "HOME" ||
    normalizedValue === "HOMETEAM" ||
    normalizedValue === "HOME_TEAM"
  ) {
    return getPredictionHomeTeamCode(prediction);
  }

  if (
    normalizedValue === "AWAY" ||
    normalizedValue === "AWAYTEAM" ||
    normalizedValue === "AWAY_TEAM"
  ) {
    return getPredictionAwayTeamCode(prediction);
  }

  return getQualifiedTeamCode(
    prediction,
    getTeamCodeFromName(value) || normalizedValue,
  );
}

function getFinalSelectionLabel(value?: string | null) {
  const cleanValue = String(value || "").trim();
  const normalizedValue = cleanValue.toLowerCase();

  if (!cleanValue) return "لم يُحدد";

  if (
    normalizedValue === "none" ||
    normalizedValue === "no_goal" ||
    normalizedValue === "nogoal"
  ) {
    return "لا يوجد أهداف";
  }

  return cleanValue;
}

function getFinalScorerLabel(
  teamCode: "ESP" | "ARG",
  value?: string | null,
) {
  const cleanValue = String(value || "").trim();
  const normalizedValue = cleanValue.toLowerCase();

  if (!cleanValue) return "لم يُحدد";

  if (
    normalizedValue === "none" ||
    normalizedValue === "no_goal" ||
    normalizedValue === "nogoal"
  ) {
    return "لا يسجل أي لاعب";
  }

  return getFinalSquadPlayerName(teamCode, cleanValue) || cleanValue;
}

function getFinalTeamLabel(prediction: Prediction, value?: string | null) {
  const code = normalizeFinalTeamSelection(prediction, value);

  if (!code) return getFinalSelectionLabel(value);

  return getQualifiedTeamName(prediction, code) || getFinalSelectionLabel(value);
}

function getFinalPredictionDisplayData(
  prediction: Prediction,
): FinalPredictionDisplayData {
  const root = prediction as unknown as UnknownRecord;
  const bonusPrediction = asUnknownRecord(
    root.finalBonusPrediction ||
      root.finalPredictionExtras ||
      root.finalExtrasPrediction,
  );
  const bonusResult = asUnknownRecord(
    root.finalBonusResult || root.finalResultExtras || root.finalExtrasResult,
  );
  const bonusPointsRecord = asUnknownRecord(
    root.finalBonusPoints || root.finalExtrasPoints || root.finalPointsBreakdown,
  );
  const basePointsRecord = asUnknownRecord(
    root.finalBasePoints || root.basePointsBreakdown || root.finalBasicPoints,
  );

  const predictedHomeScore = normalizeNumberValue(prediction.homeScore) ?? 0;
  const predictedAwayScore = normalizeNumberValue(prediction.awayScore) ?? 0;
  const actualHomeScore = normalizeNumberValue(prediction.actualHomeScore) ?? 0;
  const actualAwayScore = normalizeNumberValue(prediction.actualAwayScore) ?? 0;

  const scoreExact =
    predictedHomeScore === actualHomeScore &&
    predictedAwayScore === actualAwayScore;

  const scoreOutcomeCorrect =
    getScoreOutcome(predictedHomeScore, predictedAwayScore) ===
    getScoreOutcome(actualHomeScore, actualAwayScore);

  const predictedChampionRaw = getFirstTextValue(
    [root, bonusPrediction],
    [
      "qualifiedTeamCode",
      "championTeamCode",
      "predictedChampionTeamCode",
      "selectedChampionTeamCode",
    ],
  );

  const actualChampionRaw = getFirstTextValue(
    [root, bonusResult],
    [
      "actualQualifiedTeamCode",
      "championTeamCode",
      "actualChampionTeamCode",
      "winnerTeamCode",
    ],
  );

  const predictedChampionCode =
    normalizeFinalTeamSelection(prediction, predictedChampionRaw) ||
    getWinnerCodeFromScore(
      prediction,
      predictedHomeScore,
      predictedAwayScore,
    );

  const actualChampionCode =
    normalizeFinalTeamSelection(prediction, actualChampionRaw) ||
    getWinnerCodeFromScore(prediction, actualHomeScore, actualAwayScore);

  const predictedDecisionMethod =
    getFirstTextValue(
      [root, bonusPrediction],
      [
        "finalDecisionMethod",
        "qualificationMethod",
        "decisionMethod",
        "championshipDecisionMethod",
      ],
    ) ||
    (predictedHomeScore !== predictedAwayScore ? "regularTime" : "");

  const actualDecisionMethod =
    getFirstTextValue(
      [root, bonusResult],
      [
        "actualFinalDecisionMethod",
        "actualQualificationMethod",
        "finalDecisionMethod",
        "decisionMethod",
        "championshipDecisionMethod",
      ],
    ) || (actualHomeScore !== actualAwayScore ? "regularTime" : "");

  const scorePoints =
    getFirstNumberValue([basePointsRecord, root], [
      "scorePoints",
      "resultPoints",
      "baseScorePoints",
      "finalScorePoints",
    ]) ??
    (scoreExact ? 10 : scoreOutcomeCorrect ? 4 : 0);

  const championCorrect =
    predictedChampionCode !== "" &&
    actualChampionCode !== "" &&
    predictedChampionCode === actualChampionCode;

  const championPoints =
    getFirstNumberValue([basePointsRecord, root], [
      "championPoints",
      "qualifiedTeamPoints",
      "winnerTeamPoints",
      "finalChampionPoints",
    ]) ?? (championCorrect ? 6 : 0);

  const decisionMethodCorrect =
    predictedDecisionMethod !== "" &&
    actualDecisionMethod !== "" &&
    predictedDecisionMethod === actualDecisionMethod;

  const decisionMethodPoints =
    getFirstNumberValue([basePointsRecord, root], [
      "decisionMethodPoints",
      "qualificationMethodPoints",
      "finalDecisionMethodPoints",
      "methodPoints",
    ]) ?? (decisionMethodCorrect ? 4 : 0);

  const predictedFirstScoringTeamRaw = getFirstTextValue(
    [bonusPrediction, root],
    [
      "firstScoringTeamCode",
      "predictedFirstScoringTeamCode",
      "selectedFirstScoringTeamCode",
      "startsScoringTeamCode",
    ],
  );

  const actualFirstScoringTeamRaw = getFirstTextValue(
    [bonusResult, root],
    [
      "firstScoringTeamCode",
      "actualFirstScoringTeamCode",
      "startsScoringTeamCode",
      "actualStartsScoringTeamCode",
    ],
  );

  const predictedFirstScoringTeamCode = normalizeFinalTeamSelection(
    prediction,
    predictedFirstScoringTeamRaw,
  );
  const actualFirstScoringTeamCode = normalizeFinalTeamSelection(
    prediction,
    actualFirstScoringTeamRaw,
  );

  const firstScoringTeamCorrect =
    predictedFirstScoringTeamCode !== "" &&
    actualFirstScoringTeamCode !== "" &&
    predictedFirstScoringTeamCode === actualFirstScoringTeamCode;

  const firstScoringTeamPoints =
    getFirstNumberValue([bonusPointsRecord, root], [
      "firstScoringTeamPoints",
      "firstScoringTeam",
      "startsScoringPoints",
      "startsScoringTeamPoints",
    ]) ?? (firstScoringTeamCorrect ? 6 : 0);

  const predictedSpainScorer = getFirstTextValue(
    [bonusPrediction, root],
    [
      "firstSpainScorer",
      "predictedFirstSpainScorer",
      "selectedFirstSpainScorer",
      "spainFirstScorer",
    ],
  );
  const actualSpainScorer = getFirstTextValue(
    [bonusResult, root],
    [
      "firstSpainScorer",
      "actualFirstSpainScorer",
      "spainFirstScorer",
      "actualSpainFirstScorer",
    ],
  );

  const firstSpainScorerPoints =
    getFirstNumberValue([bonusPointsRecord, root], [
      "firstSpainScorerPoints",
      "firstSpainScorer",
      "spainFirstScorerPoints",
      "spainScorerPoints",
    ]) ?? (isSameText(predictedSpainScorer, actualSpainScorer) ? 7 : 0);

  const predictedArgentinaScorer = getFirstTextValue(
    [bonusPrediction, root],
    [
      "firstArgentinaScorer",
      "predictedFirstArgentinaScorer",
      "selectedFirstArgentinaScorer",
      "argentinaFirstScorer",
    ],
  );
  const actualArgentinaScorer = getFirstTextValue(
    [bonusResult, root],
    [
      "firstArgentinaScorer",
      "actualFirstArgentinaScorer",
      "argentinaFirstScorer",
      "actualArgentinaFirstScorer",
    ],
  );

  const firstArgentinaScorerPoints =
    getFirstNumberValue([bonusPointsRecord, root], [
      "firstArgentinaScorerPoints",
      "firstArgentinaScorer",
      "argentinaFirstScorerPoints",
      "argentinaScorerPoints",
    ]) ??
    (isSameText(predictedArgentinaScorer, actualArgentinaScorer) ? 7 : 0);

  const calculatedBonusPoints =
    firstScoringTeamPoints +
    firstSpainScorerPoints +
    firstArgentinaScorerPoints;

  const bonusPoints =
    getFirstNumberValue([bonusPointsRecord, root], [
      "total",
      "totalPoints",
      "bonusTotal",
      "finalBonusTotal",
      "finalExtrasTotal",
    ]) ?? calculatedBonusPoints;

  const explicitTotalPoints = getFirstNumberValue([root], [
    "finalTotalPoints",
    "totalFinalPoints",
    "grandTotalPoints",
    "fullFinalPoints",
  ]);

  const predictionPoints = normalizeNumberValue(prediction.points) ?? 0;
  const totalPoints =
    explicitTotalPoints ??
    (predictionPoints > 0
      ? predictionPoints
      : scorePoints + championPoints + decisionMethodPoints + bonusPoints);

  const calculatedBasePoints =
    scorePoints + championPoints + decisionMethodPoints;

  const basePoints =
    getFirstNumberValue([basePointsRecord, root], [
      "total",
      "totalPoints",
      "baseTotal",
      "finalBaseTotal",
      "basicPoints",
      "basePoints",
    ]) ??
    (totalPoints >= bonusPoints ? totalPoints - bonusPoints : calculatedBasePoints);

  return {
    predictedChampionCode,
    actualChampionCode,
    predictedDecisionMethod,
    actualDecisionMethod,
    scoreExact,
    scoreOutcomeCorrect,
    scorePoints,
    championPoints,
    decisionMethodPoints,
    basePoints,
    predictedFirstScoringTeamCode,
    actualFirstScoringTeamCode,
    firstScoringTeamPoints,
    predictedSpainScorer,
    actualSpainScorer,
    firstSpainScorerPoints,
    predictedArgentinaScorer,
    actualArgentinaScorer,
    firstArgentinaScorerPoints,
    bonusPoints,
    totalPoints,
  };
}

function FinalBonusResultRow({
  label,
  predictedValue,
  actualValue,
  points,
}: {
  label: string;
  predictedValue: string;
  actualValue: string;
  points: number;
}) {
  const correct = points > 0;

  return (
    <div
      className={`rounded-2xl border p-3 ${
        correct
          ? "border-emerald-400/25 bg-emerald-400/10"
          : "border-red-400/20 bg-red-400/[0.07]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-black text-white md:text-sm">{label}</div>

        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-black md:text-xs ${
            correct
              ? "bg-emerald-400 text-slate-950"
              : "bg-red-400/15 text-red-200"
          }`}
        >
          {correct ? `صحيح +${points}` : "خاطئ +0"}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-1.5 text-[11px] leading-5 md:grid-cols-2 md:text-xs">
        <div className="rounded-xl bg-slate-950/45 px-2.5 py-2 text-slate-300">
          اختيار العضو: <span className="font-black text-white">{predictedValue}</span>
        </div>

        <div className="rounded-xl bg-slate-950/45 px-2.5 py-2 text-slate-300">
          النتيجة الفعلية: <span className="font-black text-white">{actualValue}</span>
        </div>
      </div>
    </div>
  );
}

function LockedFinalPredictionCard({ prediction }: { prediction: Prediction }) {
  return (
    <motion.div
      variants={modalItemMotion}
      className="relative overflow-hidden rounded-3xl border border-amber-300/25 bg-gradient-to-br from-amber-400/10 via-slate-950/90 to-fuchsia-500/10 p-4 shadow-lg shadow-amber-950/15"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.14),transparent_42%)]" />

      <div className="relative text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-400/10 text-amber-200">
          <Lock className="h-6 w-6" aria-hidden="true" />
        </div>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-[11px] font-black text-amber-100">
          <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
          <span>النهائي الكبير</span>
        </div>

        <h4 className="mt-3 text-base font-black text-white md:text-lg">
          اعتمد توقعه للنهائي الكبير 🏆
        </h4>

        <p className="mx-auto mt-2 max-w-md text-xs font-bold leading-6 text-slate-300">
          تفاصيل النتيجة والبطل وإضافات النهائي مخفية حتى يتم احتساب النهائي.
        </p>
      </div>
    </motion.div>
  );
}

function CalculatedFinalPredictionCard({
  prediction,
}: {
  prediction: Prediction;
}) {
  const finalData = getFinalPredictionDisplayData(prediction);
  const predictedChampionName = getFinalTeamLabel(
    prediction,
    finalData.predictedChampionCode,
  );
  const actualChampionName = getFinalTeamLabel(
    prediction,
    finalData.actualChampionCode,
  );
  const predictedMethodLabel =
    getQualificationMethodLabel(finalData.predictedDecisionMethod) ||
    getFinalSelectionLabel(finalData.predictedDecisionMethod);
  const actualMethodLabel =
    getQualificationMethodLabel(finalData.actualDecisionMethod) ||
    getFinalSelectionLabel(finalData.actualDecisionMethod);
  const scoreLabel = finalData.scoreExact
    ? "الملي"
    : finalData.scoreOutcomeCorrect
      ? "الفائز صحيح"
      : "النتيجة";
  const hasDecisionMethod =
    finalData.predictedDecisionMethod !== "" ||
    finalData.actualDecisionMethod !== "";

  return (
    <motion.div
      variants={modalItemMotion}
      whileTap={{ scale: 0.995 }}
      className="relative overflow-hidden rounded-3xl border border-amber-300/30 bg-gradient-to-br from-amber-400/12 via-slate-950/95 to-fuchsia-500/12 p-4 shadow-xl shadow-amber-950/20"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.17),transparent_38%),radial-gradient(circle_at_100%_100%,rgba(217,70,239,0.10),transparent_34%)]" />

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-[11px] font-black text-amber-100">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              <span>توقع النهائي الكبير</span>
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 via-amber-300 to-yellow-300 px-3 py-1 text-[11px] font-black text-slate-950 shadow-lg shadow-fuchsia-500/20 ring-1 ring-amber-100/50">
              <Rocket className="h-3.5 w-3.5" aria-hidden="true" />
              <span>السوبر ذهبي</span>
            </span>
          </div>

          <span className="rounded-full bg-gradient-to-r from-amber-300 to-yellow-400 px-3 py-1 text-[11px] font-black text-slate-950 shadow-md shadow-amber-500/20">
            {finalData.totalPoints} نقطة
          </span>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/55 p-3">
          <div className="mb-3 text-center text-sm font-black text-amber-100">
            التوقع الأساسي
          </div>

          <div className="grid grid-cols-[1fr_58px_1fr] items-center gap-2 text-center">
            <div className="min-w-0">
              <div className="flex justify-center">
                <TeamFlag
                  code={getPredictionHomeTeamCode(prediction)}
                  emoji={prediction.homeTeamEmoji}
                  name={prediction.homeTeamName}
                  size="md"
                />
              </div>
              <div className="mt-1 text-xs font-bold leading-5 text-slate-200">
                {prediction.homeTeamName}
              </div>
            </div>

            <div
              dir="ltr"
              className="rounded-xl border border-amber-300/25 bg-slate-950/90 px-2 py-2 text-sm font-black text-amber-100"
            >
              {prediction.homeScore} - {prediction.awayScore}
            </div>

            <div className="min-w-0">
              <div className="flex justify-center">
                <TeamFlag
                  code={getPredictionAwayTeamCode(prediction)}
                  emoji={prediction.awayTeamEmoji}
                  name={prediction.awayTeamName}
                  size="md"
                />
              </div>
              <div className="mt-1 text-xs font-bold leading-5 text-slate-200">
                {prediction.awayTeamName}
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-2 text-xs font-bold leading-6">
            <div className="rounded-xl border border-blue-400/20 bg-blue-400/10 px-3 py-2 text-blue-100">
              🏆 بطل كأس العالم: <span className="font-black text-white">{predictedChampionName}</span>
            </div>

            {hasDecisionMethod && (
              <div className="rounded-xl border border-violet-400/20 bg-violet-400/10 px-3 py-2 text-violet-100">
                طريقة حسم اللقب: <span className="font-black text-white">{predictedMethodLabel}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.08] p-3">
          <div className="mb-2 text-center text-sm font-black text-emerald-100">
            النتيجة الفعلية
          </div>

          <div className="text-center text-xs font-bold leading-6 text-slate-300">
            <div>
              {prediction.homeTeamName} {prediction.actualHomeScore} - {prediction.actualAwayScore} {prediction.awayTeamName}
            </div>
            <div className="mt-1 font-black text-white">
              {actualChampionName} بطل كأس العالم
              {hasDecisionMethod ? ` — ${actualMethodLabel}` : ""}
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-amber-400/20 bg-slate-950/55 p-3">
          <div className="mb-2 text-center text-sm font-black text-amber-100">
            نقاط السوبر ذهبي
          </div>

          <div className={`grid gap-2 ${hasDecisionMethod ? "grid-cols-3" : "grid-cols-2"}`}>
            <PointsBreakdownItem label={scoreLabel} points={finalData.scorePoints} />
            <PointsBreakdownItem label="بطل كأس العالم" points={finalData.championPoints} />
            {hasDecisionMethod && (
              <PointsBreakdownItem label="طريقة الحسم" points={finalData.decisionMethodPoints} />
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-center">
              <div className="text-[10px] font-bold text-amber-100/80">
                المجموع الأساسي
              </div>
              <div className="mt-1 text-sm font-black text-amber-100">
                {finalData.basePoints} / 20
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
              <div className="text-[10px] font-bold text-slate-400">
                الحد الأعلى
              </div>
              <div className="mt-1 text-sm font-black text-white">
                20 نقطة
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-3">
          <div className="mb-3 text-center text-sm font-black text-cyan-100">
            إضافات النهائي
          </div>

          <div className="space-y-2">
            <FinalBonusResultRow
              label="من يبدأ التسجيل؟"
              predictedValue={getFinalTeamLabel(
                prediction,
                finalData.predictedFirstScoringTeamCode,
              )}
              actualValue={getFinalTeamLabel(
                prediction,
                finalData.actualFirstScoringTeamCode,
              )}
              points={finalData.firstScoringTeamPoints}
            />

            <FinalBonusResultRow
              label="أول مسجل من إسبانيا"
              predictedValue={getFinalScorerLabel(
                "ESP",
                finalData.predictedSpainScorer,
              )}
              actualValue={getFinalScorerLabel(
                "ESP",
                finalData.actualSpainScorer,
              )}
              points={finalData.firstSpainScorerPoints}
            />

            <FinalBonusResultRow
              label="أول مسجل من الأرجنتين"
              predictedValue={getFinalScorerLabel(
                "ARG",
                finalData.predictedArgentinaScorer,
              )}
              actualValue={getFinalScorerLabel(
                "ARG",
                finalData.actualArgentinaScorer,
              )}
              points={finalData.firstArgentinaScorerPoints}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-center">
              <div className="text-[10px] font-bold text-cyan-100/80">
                مجموع إضافات النهائي
              </div>
              <div className="mt-1 text-sm font-black text-cyan-100">
                {finalData.bonusPoints} / 20
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
              <div className="text-[10px] font-bold text-slate-400">
                الحد الأعلى
              </div>
              <div className="mt-1 text-sm font-black text-white">
                20 نقطة
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-amber-300/35 bg-gradient-to-r from-amber-400/15 via-fuchsia-400/10 to-amber-400/15 shadow-lg shadow-amber-950/10">
          <div className="grid grid-cols-3 divide-x divide-x-reverse divide-white/10">
            <div className="px-2 py-3 text-center">
              <div className="text-[10px] font-bold text-amber-100/75">
                الأساسي
              </div>
              <div className="mt-1 text-lg font-black text-amber-100">
                {finalData.basePoints}
              </div>
            </div>

            <div className="px-2 py-3 text-center">
              <div className="text-[10px] font-bold text-cyan-100/75">
                الإضافات
              </div>
              <div className="mt-1 text-lg font-black text-cyan-100">
                {finalData.bonusPoints}
              </div>
            </div>

            <div className="px-2 py-3 text-center">
              <div className="text-[10px] font-bold text-white/75">
                الإجمالي
              </div>
              <div className="mt-1 text-lg font-black text-white">
                {finalData.totalPoints} / 40
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function getPredictionStatus(prediction: Prediction) {
  const golden = isGoldenPrediction(prediction);

  if (!prediction.isCalculated) {
    return {
      text: "لم تُحتسب",
      className: golden
        ? "border-amber-300/30 bg-amber-400/10 text-amber-100"
        : "border-slate-400/20 bg-slate-400/10 text-slate-200",
    };
  }

  if (prediction.resultType === "exact") {
    return {
      text: golden ? `سوبر ذهبي بالملي +${getExactPoints(prediction)}` : "النتيجة بالملي",
      className: golden
        ? "border-fuchsia-300/35 bg-gradient-to-r from-fuchsia-500/15 via-amber-400/15 to-yellow-300/10 text-amber-100"
        : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    };
  }

  if (prediction.resultType === "winner") {
    return {
      text: golden ? `فائز سوبر ذهبي +${getWinnerPoints(prediction)}` : "الفائز صحيح",
      className: golden
        ? "border-fuchsia-300/35 bg-gradient-to-r from-fuchsia-500/15 via-amber-400/15 to-yellow-300/10 text-amber-100"
        : "border-amber-400/30 bg-amber-400/10 text-amber-100",
    };
  }

  return {
    text: "خطأ +0",
    className: "border-red-400/30 bg-red-400/10 text-red-100",
  };
}

function getMemberTitle(user: LeaderboardUser) {
  if (user.currentRank === 1 && user.total > 0) {
    return {
      title: "متصدر التحدي",
      icon: "🥇",
      className: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    };
  }

  if (user.currentRank > 1 && user.currentRank <= 3 && user.total > 0) {
    return {
      title: "منافس شرس",
      icon: "🏅",
      className: "border-orange-400/30 bg-orange-400/10 text-orange-100",
    };
  }

  if (user.currentRank > 3 && user.currentRank <= 10 && user.total > 0) {
    return {
      title: "من النخبة",
      icon: "💪",
      className: "border-sky-400/30 bg-sky-400/10 text-sky-100",
    };
  }

  if (user.correct >= 20) {
    return {
      title: "أسطورة التوقعات",
      icon: "⭐",
      className: "border-violet-400/30 bg-violet-400/10 text-violet-100",
    };
  }

  if (user.correct >= 12) {
    return {
      title: "محترف التوقعات",
      icon: "🏆",
      className: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    };
  }

  if (user.correct >= 7) {
    return {
      title: "خبير النتائج",
      icon: "🧠",
      className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    };
  }

  if (user.correct >= 3) {
    return {
      title: "صياد النقاط",
      icon: "🎯",
      className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    };
  }

  if (user.total >= 40) {
    return {
      title: "حاضر دائمًا",
      icon: "⚽",
      className: "border-blue-400/30 bg-blue-400/10 text-blue-100",
    };
  }

  if (user.total >= 20) {
    return {
      title: "نشيط التوقعات",
      icon: "🔥",
      className: "border-red-400/30 bg-red-400/10 text-red-100",
    };
  }

  if (user.total >= 8) {
    return {
      title: "محلل واعد",
      icon: "📊",
      className: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
    };
  }

  if (user.total >= 1) {
    return {
      title: "مبتدئ التوقعات",
      icon: "🔮",
      className: "border-slate-400/30 bg-slate-400/10 text-slate-100",
    };
  }

  return {
    title: "مشجع جديد",
    icon: "👋",
    className: "border-slate-400/30 bg-slate-400/10 text-slate-100",
  };
}

function getTitleProgress(user: LeaderboardUser) {
  if (user.currentRank === 1 && user.total > 0) {
    return {
      currentTitle: "🥇 متصدر التحدي",
      nextTitle: "أنت وصلت لأعلى لقب حاليًا",
      remainingText: "حافظ على الصدارة يا بطل",
      progressPercent: 100,
    };
  }

  if (user.currentRank > 1 && user.currentRank <= 3 && user.total > 0) {
    return {
      currentTitle: "🏅 منافس شرس",
      nextTitle: "🥇 متصدر التحدي",
      remainingText: "اقترب من المركز الأول",
      progressPercent: 85,
    };
  }

  if (user.currentRank > 3 && user.currentRank <= 10 && user.total > 0) {
    return {
      currentTitle: "💪 من النخبة",
      nextTitle: "🏅 منافس شرس",
      remainingText: "ادخل أول 3 مراكز",
      progressPercent: 75,
    };
  }

  if (user.correct >= 20) {
    return {
      currentTitle: "⭐ أسطورة التوقعات",
      nextTitle: "💪 من النخبة",
      remainingText: "ادخل أول 10 مراكز",
      progressPercent: 70,
    };
  }

  if (user.correct >= 12) {
    return {
      currentTitle: "🏆 محترف التوقعات",
      nextTitle: "⭐ أسطورة التوقعات",
      remainingText: `باقي لك ${Math.max(0, 20 - user.correct)} توقع صحيح`,
      progressPercent: Math.min(100, Math.round((user.correct / 20) * 100)),
    };
  }

  if (user.correct >= 7) {
    return {
      currentTitle: "🧠 خبير النتائج",
      nextTitle: "🏆 محترف التوقعات",
      remainingText: `باقي لك ${Math.max(0, 12 - user.correct)} توقع صحيح`,
      progressPercent: Math.min(100, Math.round((user.correct / 12) * 100)),
    };
  }

  if (user.correct >= 3) {
    return {
      currentTitle: "🎯 صياد النقاط",
      nextTitle: "🧠 خبير النتائج",
      remainingText: `باقي لك ${Math.max(0, 7 - user.correct)} توقعات صحيحة`,
      progressPercent: Math.min(100, Math.round((user.correct / 7) * 100)),
    };
  }

  if (user.total >= 40) {
    return {
      currentTitle: "⚽ حاضر دائمًا",
      nextTitle: "🎯 صياد النقاط",
      remainingText: `باقي لك ${Math.max(0, 3 - user.correct)} توقعات صحيحة`,
      progressPercent: user.correct > 0 ? 45 : 25,
    };
  }

  if (user.total >= 20) {
    return {
      currentTitle: "🔥 نشيط التوقعات",
      nextTitle: "⚽ حاضر دائمًا",
      remainingText: `باقي لك ${Math.max(0, 40 - user.total)} توقع`,
      progressPercent: Math.min(100, Math.round((user.total / 40) * 100)),
    };
  }

  if (user.total >= 8) {
    return {
      currentTitle: "📊 محلل واعد",
      nextTitle: "🔥 نشيط التوقعات",
      remainingText: `باقي لك ${Math.max(0, 20 - user.total)} توقع`,
      progressPercent: Math.min(100, Math.round((user.total / 20) * 100)),
    };
  }

  if (user.total >= 1) {
    return {
      currentTitle: "🔮 مبتدئ التوقعات",
      nextTitle: "📊 محلل واعد",
      remainingText: `باقي لك ${Math.max(0, 8 - user.total)} توقعات`,
      progressPercent: Math.min(100, Math.round((user.total / 8) * 100)),
    };
  }

  return {
    currentTitle: "👋 مشجع جديد",
    nextTitle: "🔮 مبتدئ التوقعات",
    remainingText: "سجل أول توقع لك",
    progressPercent: 0,
  };
}

function TitlesGuideModal({ onClose }: { onClose: () => void }) {
  const titles = [
    {
      icon: "👋",
      title: "مشجع جديد",
      condition: "التسجيل في المنصة قبل أول توقع",
    },
    {
      icon: "🔮",
      title: "مبتدئ التوقعات",
      condition: "شارك في توقع واحد أو أكثر",
    },
    { icon: "📊", title: "محلل واعد", condition: "شارك في 8 توقعات أو أكثر" },
    {
      icon: "🔥",
      title: "نشيط التوقعات",
      condition: "شارك في 20 توقع أو أكثر",
    },
    { icon: "⚽", title: "حاضر دائمًا", condition: "شارك في 40 توقع أو أكثر" },
    { icon: "🎯", title: "صياد النقاط", condition: "حقق 3 توقعات صحيحة" },
    { icon: "🧠", title: "خبير النتائج", condition: "حقق 7 توقعات صحيحة" },
    { icon: "🏆", title: "محترف التوقعات", condition: "حقق 12 توقع صحيح" },
    { icon: "⭐", title: "أسطورة التوقعات", condition: "حقق 20 توقع صحيح" },
    { icon: "💪", title: "من النخبة", condition: "ادخل أول 10 مراكز" },
    { icon: "🏅", title: "منافس شرس", condition: "ادخل أول 3 مراكز" },
    { icon: "🥇", title: "متصدر التحدي", condition: "وصل إلى المركز الأول" },
  ];

  const achievements = [
    {
      icon: "💎",
      title: "جابها بالملي",
      condition: "حقق توقع مطابق للنتيجة",
    },
    {
      icon: "⭐",
      title: "سوبر ذهبي بالملي",
      condition: "حقق توقع سوبر ذهبي مطابق للنتيجة ويحصل على +10",
    },
    {
      icon: "🟡",
      title: "فائز سوبر ذهبي",
      condition: "توقع الفائز الصحيح في توقع سوبر ذهبي ويحصل على +4",
    },
    {
      icon: "⚡",
      title: "سلسلة نارية",
      condition: "حقق 3 توقعات صحيحة متتالية",
    },
    {
      icon: "🚀",
      title: "لا يوقف",
      condition: "حقق 7 توقعات صحيحة متتالية",
    },
    {
      icon: "📈",
      title: "صاعد بقوة",
      condition: "تحسن ترتيبه في لوحة الصدارة",
    },
  ];

  return (
    <motion.div
      variants={modalOverlayMotion}
      initial="hidden"
      animate="show"
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-slate-950/80 p-3 backdrop-blur-sm"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(251,191,36,0.16),transparent_35%),radial-gradient(circle_at_15%_80%,rgba(34,211,238,0.10),transparent_32%)]" />
      <motion.div
        variants={modalPanelMotion}
        className="relative max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-white shadow-xl shadow-slate-950/35"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-amber-300/8" />
        <div className="relative flex items-center justify-between gap-3 border-b border-white/10 bg-white/10 p-4">
          <div>
            <h3 className="text-[18px] font-black md:text-xl">
              🏅 دليل الألقاب والإنجازات
            </h3>

            <p className="mt-1 text-xs text-slate-300">
              اعرف وش تحتاج عشان تطور لقبك وتفتح الأوسمة
            </p>
          </div>

          <motion.button
            type="button"
            onClick={onClose}
            whileTap={{ scale: 0.98 }}
            className="rounded-xl bg-red-500 px-3 py-2 text-xs font-black text-white transition hover:bg-red-400"
          >
            إغلاق
          </motion.button>
        </div>

        <div className="relative max-h-[70vh] overflow-y-auto p-4">
          <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-center text-xs font-bold leading-6 text-amber-100 md:text-sm">
            ارفع عدد توقعاتك، حقق نتائج صحيحة، واستغل السوبر ذهبي عشان تجمع
            نقاط أكثر
          </div>

          <h4 className="mb-2 text-[14px] font-black text-white">الألقاب</h4>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {titles.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950/70 text-amber-200">
                    <MemberIcon icon={item.icon} className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="text-[14px] font-black text-white">
                      {item.title}
                    </div>

                    <div className="mt-1 text-[11px] leading-5 text-slate-300 md:text-xs">
                      {item.condition}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h4 className="mb-2 mt-5 text-[14px] font-black text-white">
            الأوسمة والإنجازات
          </h4>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {achievements.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950/70 text-amber-200">
                    <MemberIcon icon={item.icon} className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="text-[14px] font-black text-white">
                      {item.title}
                    </div>

                    <div className="mt-1 text-[11px] leading-5 text-slate-300 md:text-xs">
                      {item.condition}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function getMemberAchievements(
  user: LeaderboardUser,
  predictions: Prediction[],
): MemberAchievement[] {
 const exactHits = predictions.filter((prediction) => {
  return prediction.isCalculated && prediction.resultType === "exact";
}).length;

const goldenExactHits = predictions.filter((prediction) => {
  return (
    prediction.isCalculated &&
    prediction.predictionType === "golden" &&
    prediction.resultType === "exact"
  );
}).length;

  const goldenWinnerHits = predictions.filter((prediction) => {
    return (
      prediction.isCalculated &&
      prediction.predictionType === "golden" &&
      prediction.resultType === "winner"
    );
  }).length;

  const goldenPredictions = predictions.filter((prediction) => {
    return prediction.predictionType === "golden";
  }).length;

  const calculatedPredictions = predictions.filter(
    (prediction) => prediction.isCalculated,
  ).length;

  const pendingPredictions = predictions.filter(
    (prediction) => !prediction.isCalculated,
  ).length;

  return [
    {
      icon: "💎",
      title: "جابها بالملي",
      description: `حقق ${exactHits} توقع مطابق للنتيجة`,
      unlocked: exactHits > 0,
    },
    {
      icon: "⭐",
      title: "سوبر ذهبي بالملي",
      description: `حقق ${goldenExactHits} توقع سوبر ذهبي مطابق للنتيجة`,
      unlocked: goldenExactHits > 0,
    },
    {
      icon: "🟡",
      title: "فائز سوبر ذهبي",
      description: `حقق ${goldenWinnerHits} توقع سوبر ذهبي بالفائز الصحيح`,
      unlocked: goldenWinnerHits > 0,
    },
    {
      icon: "🏆",
      title: "دخل الذهب",
      description: `شارك في ${goldenPredictions} توقع سوبر ذهبي`,
      unlocked: goldenPredictions > 0,
    },
    {
      icon: "🔥",
      title: "نشيط التوقعات",
      description: "شارك في 20 توقع أو أكثر",
      unlocked: user.total >= 20,
    },
    {
      icon: "⚽",
      title: "حاضر دائمًا",
      description: "شارك في 40 توقع أو أكثر",
      unlocked: user.total >= 40,
    },
    {
      icon: "⚡",
      title: "سلسلة نارية",
      description: "حقق 3 توقعات صحيحة متتالية",
      unlocked: user.bestStreak >= 3,
    },
    {
      icon: "🚀",
      title: "لا يوقف",
      description: "حقق 7 توقعات صحيحة متتالية",
      unlocked: user.bestStreak >= 7,
    },
    {
      icon: "📈",
      title: "صاعد بقوة",
      description: "تحسن ترتيبه في لوحة الصدارة",
      unlocked: user.rankDirection === "up" && user.rankChange > 0,
    },
    {
      icon: "💪",
      title: "من النخبة",
      description: "دخل قائمة أول 10 مراكز",
      unlocked:
        user.currentRank > 0 && user.currentRank <= 10 && user.total > 0,
    },
    {
      icon: "🏅",
      title: "منافس شرس",
      description: "وصل إلى أحد أول 3 مراكز",
      unlocked: user.currentRank > 0 && user.currentRank <= 3 && user.total > 0,
    },
    {
      icon: "🥇",
      title: "متصدر التحدي",
      description: "وصل إلى المركز الأول",
      unlocked: user.currentRank === 1 && user.total > 0,
    },
    {
      icon: "⏳",
      title: "بانتظار الحسم",
      description: `${pendingPredictions} توقع لم يُحتسب بعد`,
      unlocked: pendingPredictions > 0,
    },
    {
      icon: "✅",
      title: "سجل محسوب",
      description: `${calculatedPredictions} توقع تم احتسابه`,
      unlocked: calculatedPredictions > 0,
    },
  ];
}

function MemberStatCard({
  label,
  value,
  className = "text-white",
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <motion.div
      variants={modalItemMotion}
      whileTap={{ scale: 0.98 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-center shadow-md shadow-slate-950/15"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent" />
      <div className="relative">
        <div className="text-[10px] font-bold text-slate-400 md:text-xs">
          {label}
        </div>

        <div
          className={`mt-1 text-[18px] font-black tabular-nums md:text-xl ${className}`}
        >
          {value}
        </div>
      </div>
    </motion.div>
  );
}

function AchievementCard({ achievement }: { achievement: MemberAchievement }) {
  return (
    <motion.div
      variants={modalItemMotion}
      whileTap={{ scale: 0.98 }}
      className={`relative overflow-hidden rounded-2xl border p-3 shadow-md shadow-slate-950/15 ${
        achievement.unlocked
          ? "border-amber-400/25 bg-amber-400/10"
          : "border-white/10 bg-white/5 opacity-55"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent" />

      <div className="relative flex items-center gap-2">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            achievement.unlocked
              ? "bg-amber-400/15 text-amber-200"
              : "bg-slate-500/15 text-slate-400"
          }`}
        >
          <MemberIcon
            icon={achievement.unlocked ? achievement.icon : "🔒"}
            className="h-[18px] w-[18px]"
          />
        </span>

        <div className="min-w-0">
          <div
            className={`text-xs font-black md:text-sm ${
              achievement.unlocked ? "text-white" : "text-slate-400"
            }`}
          >
            {achievement.title}
          </div>

          <div className="mt-1 text-[10px] leading-5 text-slate-300 md:text-xs">
            {achievement.description}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function PredictionDetailsModal({
  user,
  predictions,
  loading,
  onClose,
}: {
  user: LeaderboardUser;
  predictions: Prediction[];
  loading: boolean;
  onClose: () => void;
}) {
  const [currentPredictionPage, setCurrentPredictionPage] = useState(1);

  const memberTitle = getMemberTitle(user);
  const titleProgress = getTitleProgress(user);
  const achievements = getMemberAchievements(user, predictions);
  const unlockedAchievements = achievements.filter(
    (achievement) => achievement.unlocked,
  );

  const totalPredictionPages = Math.max(
    1,
    Math.ceil(predictions.length / MEMBER_PREDICTIONS_PER_PAGE),
  );

  const visiblePredictions = useMemo(() => {
    const safePage = Math.min(currentPredictionPage, totalPredictionPages);
    const startIndex = (safePage - 1) * MEMBER_PREDICTIONS_PER_PAGE;
    const endIndex = startIndex + MEMBER_PREDICTIONS_PER_PAGE;

    return predictions.slice(startIndex, endIndex);
  }, [predictions, currentPredictionPage, totalPredictionPages]);

  useEffect(() => {
    setCurrentPredictionPage(1);
  }, [user.id, predictions.length]);

  function goToPreviousPredictionPage() {
    setCurrentPredictionPage((page) => Math.max(1, page - 1));
  }

  function goToNextPredictionPage() {
    setCurrentPredictionPage((page) =>
      Math.min(totalPredictionPages, page + 1),
    );
  }

  return (
    <motion.div
      variants={modalOverlayMotion}
      initial="hidden"
      animate="show"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/80 p-3 backdrop-blur-sm"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(251,191,36,0.14),transparent_35%),radial-gradient(circle_at_15%_80%,rgba(34,211,238,0.10),transparent_32%),radial-gradient(circle_at_90%_75%,rgba(52,211,153,0.08),transparent_28%)]" />
      <motion.div
        variants={modalPanelMotion}
        className="relative max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-white shadow-xl shadow-slate-950/35"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-amber-300/8" />
        <div className="relative flex items-center justify-between gap-3 border-b border-white/10 bg-white/10 p-4">
          <div>
            <h3 className="text-[18px] font-black md:text-xl">ملف العضو</h3>

            <p className="mt-1 text-xs text-slate-300">
              الإحصائيات، الإنجازات، وسجل التوقعات
            </p>
          </div>

          <motion.button
            type="button"
            onClick={onClose}
            whileTap={{ scale: 0.98 }}
            className="rounded-xl bg-red-500 px-3 py-2 text-xs font-black text-white transition hover:bg-red-400"
          >
            إغلاق
          </motion.button>
        </div>

        <div className="relative max-h-[70vh] overflow-y-auto p-4">
          <motion.div variants={modalItemMotion} className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-4 text-center shadow-md shadow-slate-950/15">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-slate-950/60">
              <TeamFlag
                code={getLeaderboardUserTeamCode(user)}
                emoji={user.teamEmoji}
                name={user.favoriteTeam}
                size="lg"
                className="h-12 w-12 rounded-2xl"
              />
            </div>

            <h2 className="text-xl font-black leading-8 md:text-2xl">
              {user.fullName}
            </h2>

            <div
              className={`mx-auto mt-3 inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-black ${memberTitle.className}`}
            >
              <MemberIcon icon={memberTitle.icon} className="h-4 w-4" />
              <span>{memberTitle.title}</span>
            </div>

            <div className="mt-3 text-xs text-slate-300">
              {user.favoriteTeam || "بدون منتخب مرشح"}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-right">
              <div className="flex items-center justify-between gap-3 text-xs md:text-sm">
                <span className="font-bold text-slate-300">اللقب الحالي</span>

                <span className="font-black text-white">
                  <TitleProgressLabel value={titleProgress.currentTitle} />
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3 text-xs md:text-sm">
                <span className="font-bold text-slate-300">اللقب القادم</span>

                <span className="font-black text-amber-300">
                  <TitleProgressLabel value={titleProgress.nextTitle} />
                </span>
              </div>

              <div className="mt-3 overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  className="h-2 rounded-full bg-amber-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${titleProgress.progressPercent}%` }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                />
              </div>

              <div className="mt-2 text-center text-[11px] font-bold text-slate-300 md:text-xs">
                {titleProgress.remainingText}
              </div>
            </div>
          </motion.div>

          <motion.div variants={modalListMotion} initial="hidden" animate="show" className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <MemberStatCard
              label="المركز"
              value={user.currentRank || "-"}
              className="text-amber-300"
            />

            <MemberStatCard
              label="النقاط"
              value={user.points}
              className="text-amber-300"
            />

            <MemberStatCard
              label="التوقعات"
              value={user.total}
              className="text-sky-300"
            />

            <MemberStatCard
              label="أفضل سلسلة"
              value={user.bestStreak}
              className="text-emerald-300"
            />

            <MemberStatCard
              label="ص بالملي"
              value={user.exact}
              className="text-emerald-300"
            />

            <MemberStatCard
              label="الفائز"
              value={user.winner}
              className="text-amber-200"
            />

            <MemberStatCard
              label="الخطأ"
              value={user.wrong}
              className="text-red-300"
            />

            <MemberStatCard
              label="حركة الترتيب"
              value={
                user.rankDirection === "up"
                  ? `صعد ${user.rankChange}`
                  : user.rankDirection === "down"
                    ? `نزل ${user.rankChange}`
                    : "ثابت"
              }
              className={
                user.rankDirection === "up"
                  ? "text-emerald-300"
                  : user.rankDirection === "down"
                    ? "text-red-300"
                    : "text-slate-300"
              }
            />

            <MemberStatCard
              label="الأوسمة"
              value={unlockedAchievements.length}
              className="text-violet-300"
            />
          </motion.div>

          <motion.div variants={modalItemMotion} initial="hidden" animate="show" className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-black md:text-lg">
                🏅 الأوسمة والإنجازات
              </h3>

              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold text-slate-300 md:text-xs">
                {unlockedAchievements.length} مكتسبة
              </span>
            </div>

            <motion.div variants={modalListMotion} initial="hidden" animate="show" className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {achievements.map((achievement) => (
                <AchievementCard
                  key={achievement.title}
                  achievement={achievement}
                />
              ))}
            </motion.div>
          </motion.div>

          <motion.div variants={modalItemMotion} initial="hidden" animate="show" className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="inline-flex items-center gap-2 text-base font-black md:text-lg">
                <Sparkles className="h-4 w-4 text-amber-200" aria-hidden="true" />
                <span>توقعات العضو</span>
              </h3>

              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold text-slate-300 md:text-xs">
                {predictions.length} توقع
              </span>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-[14px] text-slate-300">
                جاري تحميل التوقعات...
              </div>
            ) : predictions.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-[14px] text-slate-300">
                لا توجد توقعات لهذا العضو حتى الآن.
              </div>
            ) : (
              <>
                <motion.div variants={modalListMotion} initial="hidden" animate="show" className="space-y-3">
                  {visiblePredictions.map((prediction) => {
                    if (isFinalPrediction(prediction)) {
                      if (!prediction.isCalculated) {
                        return (
                          <LockedFinalPredictionCard
                            key={prediction.id}
                            prediction={prediction}
                          />
                        );
                      }

                      return (
                        <CalculatedFinalPredictionCard
                          key={prediction.id}
                          prediction={prediction}
                        />
                      );
                    }

                    const status = getPredictionStatus(prediction);
                    const golden = isGoldenPrediction(prediction);
                    const knockoutPrediction = prediction as Prediction & {
                      qualifiedTeamCode?: string | null;
                      qualificationMethod?: string | null;
                    };

                    return (
                      <motion.div
                        key={prediction.id}
                        variants={modalItemMotion}
                        whileTap={{ scale: 0.99 }}
                        className={`rounded-2xl border p-3 shadow-md shadow-slate-950/15 ${
                          golden
                            ? "border-fuchsia-300/35 bg-gradient-to-br from-fuchsia-500/15 via-amber-400/10 to-slate-950/70 shadow-lg shadow-fuchsia-950/20"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-[11px] font-black ${status.className}`}
                            >
                              {status.text}
                            </span>

                            {golden && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 via-amber-300 to-yellow-300 px-3 py-1 text-[11px] font-black text-slate-950 shadow-lg shadow-fuchsia-500/20 ring-1 ring-amber-100/50">
                                <Rocket className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>توقع سوبر ذهبي</span>
                              </span>
                            )}

                            <KnockoutRoundBadge prediction={prediction} />
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-black ${
                              golden
                                ? "bg-gradient-to-r from-fuchsia-500 via-amber-300 to-yellow-300 text-slate-950 shadow-md shadow-fuchsia-500/20"
                                : "bg-amber-400 text-slate-950"
                            }`}
                          >
                            {prediction.points} نقطة
                          </span>
                        </div>

                        <div className="grid grid-cols-[1fr_52px_1fr] items-center gap-2 text-center">
                          <div className="min-w-0">
                            <div className="flex justify-center">
                              <TeamFlag
                                code={getPredictionHomeTeamCode(prediction)}
                                emoji={prediction.homeTeamEmoji}
                                name={prediction.homeTeamName}
                                size="md"
                              />
                            </div>

                            <div className="mt-1 text-xs font-bold leading-5 text-slate-200">
                              {prediction.homeTeamName}
                            </div>
                          </div>

                          <div
                            dir="ltr"
                            className={`rounded-xl border px-2 py-2 text-sm font-black ${
                              golden
                                ? "border-fuchsia-300/30 bg-slate-950/85 text-amber-100 shadow-inner shadow-fuchsia-950/20"
                                : "border-white/10 bg-slate-950/70 text-white"
                            }`}
                          >
                            {prediction.homeScore} - {prediction.awayScore}
                          </div>

                          <div className="min-w-0">
                            <div className="flex justify-center">
                              <TeamFlag
                                code={getPredictionAwayTeamCode(prediction)}
                                emoji={prediction.awayTeamEmoji}
                                name={prediction.awayTeamName}
                                size="md"
                              />
                            </div>

                            <div className="mt-1 text-xs font-bold leading-5 text-slate-200">
                              {prediction.awayTeamName}
                            </div>
                          </div>
                        </div>

                        {knockoutPrediction.qualifiedTeamCode && (
                          <div className="mt-3 rounded-xl border border-blue-400/30 bg-blue-400/10 p-2 text-center text-xs font-bold leading-6 text-blue-100">
                            المتأهل:{" "}
                            <span className="inline-flex items-center justify-center gap-1.5 font-black text-white">
                              <TeamFlag
                                code={getQualifiedTeamCode(
                                  prediction,
                                  knockoutPrediction.qualifiedTeamCode,
                                )}
                                emoji={getQualifiedTeamEmoji(
                                  prediction,
                                  knockoutPrediction.qualifiedTeamCode,
                                )}
                                name={getQualifiedTeamName(
                                  prediction,
                                  knockoutPrediction.qualifiedTeamCode,
                                )}
                                size="xs"
                              />
                              {getQualifiedTeamName(
                                prediction,
                                knockoutPrediction.qualifiedTeamCode,
                              )}
                            </span>
                            {knockoutPrediction.qualificationMethod && (
                              <>
                                {" "}
                                • الطريقة:{" "}
                                <span className="font-black text-white">
                                  {getQualificationMethodLabel(
                                    knockoutPrediction.qualificationMethod,
                                  )}
                                </span>
                              </>
                            )}
                          </div>
                        )}

                        {prediction.isCalculated && (
                          <div className="mt-3 space-y-2">
                            <div className="rounded-xl border border-white/10 bg-slate-950/50 p-2 text-center text-xs font-bold text-slate-300">
                              النتيجة الفعلية:{" "}
                              <span className="text-white">
                                {prediction.actualHomeScore} -{" "}
                                {prediction.actualAwayScore}
                              </span>
                            </div>

                            {prediction.actualQualifiedTeamCode &&
                              prediction.actualQualificationMethod && (
                                <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-2 text-center text-xs font-bold leading-6 text-emerald-100">
                                  المتأهل الفعلي:{" "}
                                  <span className="inline-flex items-center justify-center gap-1.5 font-black text-white">
                                    <TeamFlag
                                      code={getQualifiedTeamCode(
                                        prediction,
                                        prediction.actualQualifiedTeamCode,
                                      )}
                                      emoji={getQualifiedTeamEmoji(
                                        prediction,
                                        prediction.actualQualifiedTeamCode,
                                      )}
                                      name={getQualifiedTeamName(
                                        prediction,
                                        prediction.actualQualifiedTeamCode,
                                      )}
                                      size="xs"
                                    />
                                    {getQualifiedTeamName(
                                      prediction,
                                      prediction.actualQualifiedTeamCode,
                                    )}
                                  </span>{" "}
                                  • الطريقة:{" "}
                                  <span className="font-black text-white">
                                    {getQualificationMethodLabel(
                                      prediction.actualQualificationMethod,
                                    )}
                                  </span>
                                </div>
                              )}

                            <PointsBreakdown prediction={prediction} />
                          </div>
                        )}

                        {!prediction.isCalculated && (
                          <div className="mt-3 rounded-xl border border-slate-400/20 bg-slate-400/10 p-2 text-center text-xs font-bold text-slate-300">
                            هذا التوقع بانتظار احتساب نتيجة المباراة.
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>

                {predictions.length > MEMBER_PREDICTIONS_PER_PAGE && (
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={goToPreviousPredictionPage}
                      disabled={currentPredictionPage === 1}
                      className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      السابق
                    </button>

                    <div className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-xs font-bold text-slate-200">
                      صفحة{" "}
                      {Math.min(currentPredictionPage, totalPredictionPages)} من{" "}
                      {totalPredictionPages}
                    </div>

                    <button
                      type="button"
                      onClick={goToNextPredictionPage}
                      disabled={currentPredictionPage === totalPredictionPages}
                      className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      التالي
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function LeaderboardTable() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showTitlesGuide, setShowTitlesGuide] = useState(false);

  const [selectedUser, setSelectedUser] = useState<LeaderboardUser | null>(
    null,
  );
  const [selectedPredictions, setSelectedPredictions] = useState<Prediction[]>(
    [],
  );
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  const totalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));

  const visibleUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * USERS_PER_PAGE;
    const endIndex = startIndex + USERS_PER_PAGE;

    return users.slice(startIndex, endIndex);
  }, [users, currentPage]);

  useEffect(() => {
    let isMounted = true;

    async function loadLeaderboard() {
      if (document.visibilityState === "hidden") return;

      try {
        const data = await getLeaderboardUsers();

        if (!isMounted) return;

        setUsers(data);

        const newTotalPages = Math.max(
          1,
          Math.ceil(data.length / USERS_PER_PAGE),
        );

        setCurrentPage((page) => Math.min(page, newTotalPages));
      } catch (error) {
        console.error("فشل تحميل لوحة الصدارة:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadLeaderboard();
      }
    }

    loadLeaderboard();

    const interval = setInterval(loadLeaderboard, 30000);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  async function openUserPredictions(user: LeaderboardUser) {
    try {
      setSelectedUser(user);
      setSelectedPredictions([]);
      setLoadingPredictions(true);

      const predictions = await getPredictionsByUserId(user.id);

      setSelectedPredictions(predictions);
    } catch (error) {
      console.error("فشل تحميل توقعات العضو:", error);
      alert("تعذر تحميل توقعات العضو");
    } finally {
      setLoadingPredictions(false);
    }
  }

  function closeUserPredictions() {
    setSelectedUser(null);
    setSelectedPredictions([]);
    setLoadingPredictions(false);
  }

  function goToPreviousPage() {
    setCurrentPage((page) => Math.max(1, page - 1));
  }

  function goToNextPage() {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  }

  return (
    <>
      <motion.section
        variants={leaderboardSectionMotion}
        initial="hidden"
        whileInView="show"
        viewport={scrollOnceViewport}
        className="relative mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.08] p-3 text-white shadow-lg shadow-slate-950/25 backdrop-blur-sm md:mt-8 md:p-6"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-cyan-400/5" />
        <div className="pointer-events-none absolute -right-24 top-14 h-56 w-56 rounded-full bg-amber-300/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-24 bottom-14 h-56 w-56 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="relative">
        <div className="mb-4 text-center md:mb-6">
          <h2 className="text-[24px] font-black md:text-3xl">لوحة الصدارة</h2>

          <p className="mt-2 text-xs leading-6 text-slate-300 md:text-sm">
            ترتيب جميع الأعضاء حسب النقاط ثم عدد التوقعات الصحيحة
          </p>

          <button
            type="button"
            onClick={() => setShowTitlesGuide(true)}
            className="mt-3 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-black text-amber-100 shadow-md shadow-amber-950/10 transition hover:bg-amber-400/20 active:scale-95 md:text-sm"
          >
            <span className="inline-flex items-center gap-2">
              <Medal className="h-4 w-4" aria-hidden="true" />
              <span>كيف أحصل على الألقاب؟</span>
            </span>
          </button>

          <div className="mx-auto mt-3 hidden max-w-md rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-[11px] font-bold leading-6 text-slate-300 md:block md:text-xs">
            <span className="text-emerald-300">ص</span> = النتيجة بالملي،{" "}
            <span className="text-amber-200">ف</span> = الفائز الصحيح،{" "}
            <span className="text-red-300">خ</span> = الخطأ
          </div>
        </div>

        {loading ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-[14px] text-slate-300"
          >
            جاري تحميل لوحة الصدارة...
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-[14px] text-slate-300">
            <div className="mb-2 flex justify-center text-amber-200">
              <Trophy className="h-8 w-8" aria-hidden="true" />
            </div>

            <div className="font-black">لا يوجد أعضاء حتى الآن</div>

            <p className="mt-2 text-xs leading-6 text-slate-300">
              ستظهر أسماء الأعضاء هنا بعد التسجيل.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {visibleUsers.map((user) => {
                const style = getTopRankStyle(user.currentRank);

                return (
                  <motion.article
                    key={user.id}
                    variants={leaderboardRowMotion}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.35 }}
                    className={`relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 p-3 shadow-inner ${style.rowClass}`}
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/40 to-transparent"
                    />

                    <div className="relative flex items-center gap-2.5">
                      <div className="flex shrink-0 items-center gap-1.5">
                        <RankBadge rank={user.currentRank} />
                        <RankMovement user={user} />
                      </div>

                      <Link
                        href={`/members/${encodeURIComponent(user.id)}`}
                        className={`min-w-0 flex-1 rounded-xl px-2 py-2 text-right text-sm font-black leading-6 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--brand-yellow)]/45 ${style.nameClass}`}
                        title="فتح ملف العضو"
                        aria-label={`فتح ملف ${user.fullName}`}
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          {style.icon && (
                            <span className="shrink-0" aria-hidden="true">
                              {style.icon}
                            </span>
                          )}
                          <span className="min-w-0 break-words">{user.fullName}</span>
                        </span>
                      </Link>

                      <div
                        className={`flex min-w-[64px] shrink-0 flex-col items-center justify-center rounded-xl px-2 py-1.5 ${
                          user.currentRank <= 3
                            ? style.badgeClass
                            : "bg-amber-400 text-slate-950"
                        }`}
                      >
                        <span className="text-[10px] font-black opacity-75">النقاط</span>
                        <span dir="ltr" className="text-sm font-black tabular-nums">
                          {user.points}
                        </span>
                      </div>
                    </div>

                    <dl className="relative mt-2 grid grid-cols-4 gap-1.5 text-center">
                      <div className="rounded-xl border border-white/10 bg-white/5 px-1.5 py-2">
                        <dt className="text-[10px] font-bold text-slate-400">التوقعات</dt>
                        <dd dir="ltr" className="mt-1 text-sm font-black tabular-nums text-slate-100">
                          {user.total}
                        </dd>
                      </div>

                      <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-1.5 py-2">
                        <dt className="text-[10px] font-bold text-emerald-200">صحيحة</dt>
                        <dd dir="ltr" className="mt-1 text-sm font-black tabular-nums text-emerald-300">
                          {user.exact}
                        </dd>
                      </div>

                      <div className="rounded-xl border border-amber-300/15 bg-amber-300/10 px-1.5 py-2">
                        <dt className="text-[10px] font-bold text-amber-100">فائز</dt>
                        <dd dir="ltr" className="mt-1 text-sm font-black tabular-nums text-amber-200">
                          {user.winner}
                        </dd>
                      </div>

                      <div className="rounded-xl border border-red-400/15 bg-red-400/10 px-1.5 py-2">
                        <dt className="text-[10px] font-bold text-red-200">خطأ</dt>
                        <dd dir="ltr" className="mt-1 text-sm font-black tabular-nums text-red-300">
                          {user.wrong}
                        </dd>
                      </div>
                    </dl>
                  </motion.article>
                );
              })}
            </div>

            <div className="relative hidden overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-inner md:block">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-amber-200/45 to-transparent"
              />
              <table className="w-full table-fixed text-center">
                <caption className="sr-only">
                  ترتيب الأعضاء حسب النقاط والتوقعات الصحيحة
                </caption>
                <thead className="bg-slate-950">
                  <tr className="text-[10px] md:text-sm">
                    <th scope="col" className="w-[18%] px-1 py-3 font-black md:px-4 md:py-4">
                      المركز
                    </th>

                    <th scope="col" className="w-[27%] px-1 py-3 font-black md:px-4 md:py-4">
                      الاسم
                    </th>

                    <th scope="col" className="w-[13%] px-1 py-3 font-black md:px-4 md:py-4">
                      التوقعات
                    </th>

                    <th scope="col" className="w-[8%] px-1 py-3 font-black text-emerald-300 md:px-4 md:py-4">
                      ص
                    </th>

                    <th scope="col" className="w-[8%] px-1 py-3 font-black text-amber-200 md:px-4 md:py-4">
                      ف
                    </th>

                    <th scope="col" className="w-[8%] px-1 py-3 font-black text-red-300 md:px-4 md:py-4">
                      خ
                    </th>

                    <th scope="col" className="w-[18%] px-1 py-3 font-black md:px-4 md:py-4">
                      النقاط
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleUsers.map((user) => {
                    const style = getTopRankStyle(user.currentRank);

                    return (
                      <motion.tr
                        key={user.id}
                        variants={leaderboardRowMotion}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0.35 }}
                        whileTap={{ scale: 0.998 }}
                        className={`border-t border-white/10 text-[11px] transition md:text-sm ${style.rowClass}`}
                      >
                        <td className="px-1 py-3 md:px-4 md:py-4">
                          <div className="flex items-center justify-center gap-1 md:gap-2">
                            <RankBadge rank={user.currentRank} />
                            <RankMovement user={user} />
                          </div>
                        </td>

                        <td className="px-1 py-3 font-black md:px-4 md:py-4">
                          <Link
                            href={`/members/${encodeURIComponent(user.id)}`}
                            className={`mx-auto flex w-full min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-1 text-center leading-5 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--brand-yellow)]/45 ${style.nameClass}`}
                            title="فتح ملف العضو"
                          >
                            {style.icon && (
                              <span className="shrink-0 text-sm md:text-base">
                                {style.icon}
                              </span>
                            )}
                            <span className="whitespace-normal break-words leading-5">{user.fullName}</span>
                          </Link>
                        </td>

                        <td dir="ltr" className="px-1 py-3 font-black text-slate-200 md:px-4 md:py-4">
                          {user.total}
                        </td>

                        <td dir="ltr" className="px-1 py-3 font-black text-emerald-300 md:px-4 md:py-4">
                          {user.exact}
                        </td>

                        <td dir="ltr" className="px-1 py-3 font-black text-amber-200 md:px-4 md:py-4">
                          {user.winner}
                        </td>

                        <td dir="ltr" className="px-1 py-3 font-black text-red-300 md:px-4 md:py-4">
                          {user.wrong}
                        </td>

                        <td className="px-1 py-3 md:px-4 md:py-4">
                          <span
                            dir="ltr"
                            className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[11px] font-black md:h-8 md:min-w-8 md:px-3 md:text-sm ${
                              user.currentRank <= 3
                                ? style.badgeClass
                                : "bg-amber-400 text-slate-950"
                            }`}
                          >
                            {user.points}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40 md:text-sm"
              >
                السابق
              </button>

              <div className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-xs font-bold text-slate-200 md:text-sm">
                صفحة <bdi dir="ltr">{currentPage}</bdi> من{" "}
                <bdi dir="ltr">{totalPages}</bdi>
              </div>

              <button
                type="button"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40 md:text-sm"
              >
                التالي
              </button>
            </div>
          </>
        )}
        </div>
      </motion.section>

      {showTitlesGuide && (
        <TitlesGuideModal onClose={() => setShowTitlesGuide(false)} />
      )}

      {selectedUser && (
        <PredictionDetailsModal
          user={selectedUser}
          predictions={selectedPredictions}
          loading={loadingPredictions}
          onClose={closeUserPredictions}
        />
      )}
    </>
  );
}
