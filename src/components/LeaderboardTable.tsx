"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { getLeaderboardUsers, LeaderboardUser } from "@/lib/leaderboard";
import { getPredictionsByUserId, Prediction } from "@/lib/predictions";
import TeamFlag from "@/components/TeamFlag";

const USERS_PER_PAGE = 20;
const MEMBER_PREDICTIONS_PER_PAGE = 6;

const leaderboardSectionMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 22,
    scale: 0.98,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.42,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const leaderboardRowMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
    scale: 0.97,
    filter: "blur(6px)",
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.42,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const modalCardMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 28,
    scale: 0.97,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.28,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const modalOverlayMotion: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.24, ease: "easeOut" } },
};

const modalPanelMotion: Variants = {
  hidden: { opacity: 0, y: 34, scale: 0.94, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.42,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.06,
    },
  },
};

const modalItemMotion: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

const modalListMotion: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

type MemberAchievement = {
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
};

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

function getQualificationMethodLabel(value?: string | null) {
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
  return isGoldenPrediction(prediction) ? 6 : 3;
}

function getWinnerPoints(prediction: Prediction) {
  return isGoldenPrediction(prediction) ? 2 : 1;
}

function getQualifiedTeamPoints(prediction: Prediction) {
  return isGoldenPrediction(prediction) ? 4 : 2;
}

function getQualificationMethodPoints(prediction: Prediction) {
  return isGoldenPrediction(prediction) ? 2 : 1;
}

function getKnockoutPointsBreakdown(prediction: Prediction) {
  if (!prediction.isCalculated) return null;

  const knockoutPrediction = prediction as MemberKnockoutPrediction;

  const homeScore = normalizeNumberValue(prediction.homeScore);
  const awayScore = normalizeNumberValue(prediction.awayScore);
  const actualHomeScore = normalizeNumberValue(prediction.actualHomeScore);
  const actualAwayScore = normalizeNumberValue(prediction.actualAwayScore);

  const predictionWasDraw =
    homeScore !== null && awayScore !== null && homeScore === awayScore;

  const actualWasDraw =
    actualHomeScore !== null &&
    actualAwayScore !== null &&
    actualHomeScore === actualAwayScore;

  if (
    !predictionWasDraw ||
    !actualWasDraw ||
    !knockoutPrediction.actualQualifiedTeamCode ||
    !knockoutPrediction.actualQualificationMethod
  ) {
    return null;
  }

  const scoreCorrect =
    homeScore === actualHomeScore && awayScore === actualAwayScore;

  const qualifiedTeamCorrect =
    normalizeTeamCode(knockoutPrediction.qualifiedTeamCode) !== "" &&
    normalizeTeamCode(knockoutPrediction.qualifiedTeamCode) ===
      normalizeTeamCode(knockoutPrediction.actualQualifiedTeamCode);

  const qualificationMethodCorrect =
    Boolean(knockoutPrediction.qualificationMethod) &&
    knockoutPrediction.qualificationMethod ===
      knockoutPrediction.actualQualificationMethod;

  return {
  scorePoints: scoreCorrect
    ? getExactPoints(prediction)
    : getWinnerPoints(prediction),
  qualifiedTeamPoints: qualifiedTeamCorrect
    ? getQualifiedTeamPoints(prediction)
    : 0,
  qualificationMethodPoints: qualificationMethodCorrect
    ? getQualificationMethodPoints(prediction)
    : 0,
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
          label="المتأهل"
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
    text: "النتيجة بالملي",
    className: golden
      ? "border-amber-300/40 bg-amber-400/15 text-amber-100"
      : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  };
}

  if (
    prediction.resultType === "winner" ||
    prediction.points === 1 ||
    prediction.points === 2
  ) {
    return {
      text: golden ? "فائز ذهبي " : "الفائز صحيح",
      className: golden
        ? "border-amber-300/40 bg-amber-400/15 text-amber-100"
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
      remainingText: "حافظ على الصدارة يا بطل 🔥",
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
      title: "ذهبي بالملي",
      condition: "حقق توقع ذهبي مطابق للنتيجة ويحصل على +6",
    },
    {
      icon: "🟡",
      title: "فائز ذهبي",
      condition: "توقع الفائز الصحيح في توقع ذهبي ويحصل على +2",
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
        className="relative max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-white shadow-2xl shadow-slate-950/40"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-amber-300/8" />
        <div className="relative flex items-center justify-between gap-3 border-b border-white/10 bg-white/10 p-4">
          <div>
            <h3 className="text-lg font-black md:text-xl">
              🏅 دليل الألقاب والإنجازات
            </h3>

            <p className="mt-1 text-xs text-slate-300">
              اعرف وش تحتاج عشان تطور لقبك وتفتح الأوسمة
            </p>
          </div>

          <motion.button
            type="button"
            onClick={onClose}
            whileTap={{ scale: 0.94 }}
            className="rounded-xl bg-red-500 px-3 py-2 text-xs font-black text-white transition hover:bg-red-400"
          >
            إغلاق
          </motion.button>
        </div>

        <div className="relative max-h-[70vh] overflow-y-auto p-4">
          <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-center text-xs font-bold leading-6 text-amber-100 md:text-sm">
            ارفع عدد توقعاتك، حقق نتائج صحيحة، واستغل التوقع الذهبي عشان تجمع
            نقاط أكثر 🔥
          </div>

          <h4 className="mb-2 text-sm font-black text-white">الألقاب</h4>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {titles.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950/70 text-xl">
                    {item.icon}
                  </div>

                  <div>
                    <div className="text-sm font-black text-white">
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

          <h4 className="mb-2 mt-5 text-sm font-black text-white">
            الأوسمة والإنجازات
          </h4>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {achievements.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950/70 text-xl">
                    {item.icon}
                  </div>

                  <div>
                    <div className="text-sm font-black text-white">
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
      (prediction.resultType === "winner" || prediction.points === 2)
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
      title: "ذهبي بالملي",
      description: `حقق ${goldenExactHits} توقع ذهبي مطابق للنتيجة`,
      unlocked: goldenExactHits > 0,
    },
    {
      icon: "🟡",
      title: "فائز ذهبي",
      description: `حقق ${goldenWinnerHits} توقع ذهبي بالفائز الصحيح`,
      unlocked: goldenWinnerHits > 0,
    },
    {
      icon: "🏆",
      title: "دخل الذهب",
      description: `شارك في ${goldenPredictions} توقع ذهبي`,
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
      whileTap={{ scale: 0.96 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-center shadow-lg shadow-slate-950/20"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent" />
      <div className="relative">
        <div className="text-[10px] font-bold text-slate-400 md:text-xs">
          {label}
        </div>

        <motion.div
          key={String(value)}
          initial={{ opacity: 0, y: 6, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className={`mt-1 text-lg font-black tabular-nums md:text-xl ${className}`}
        >
          {value}
        </motion.div>
      </div>
    </motion.div>
  );
}

function AchievementCard({ achievement }: { achievement: MemberAchievement }) {
  return (
    <motion.div
      variants={modalItemMotion}
      whileTap={{ scale: 0.98 }}
      className={`relative overflow-hidden rounded-2xl border p-3 shadow-lg shadow-slate-950/15 ${
        achievement.unlocked
          ? "border-amber-400/25 bg-amber-400/10"
          : "border-white/10 bg-white/5 opacity-55"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent" />

      <div className="relative flex items-center gap-2">
        <motion.span
          animate={
            achievement.unlocked
              ? { y: [0, -2, 0], scale: [1, 1.06, 1] }
              : undefined
          }
          transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
          className="text-xl"
        >
          {achievement.unlocked ? achievement.icon : "🔒"}
        </motion.span>

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
        className="relative max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-white shadow-2xl shadow-slate-950/40"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-amber-300/8" />
        <div className="relative flex items-center justify-between gap-3 border-b border-white/10 bg-white/10 p-4">
          <div>
            <h3 className="text-lg font-black md:text-xl">ملف العضو</h3>

            <p className="mt-1 text-xs text-slate-300">
              الإحصائيات، الإنجازات، وسجل التوقعات
            </p>
          </div>

          <motion.button
            type="button"
            onClick={onClose}
            whileTap={{ scale: 0.94 }}
            className="rounded-xl bg-red-500 px-3 py-2 text-xs font-black text-white transition hover:bg-red-400"
          >
            إغلاق
          </motion.button>
        </div>

        <div className="relative max-h-[70vh] overflow-y-auto p-4">
          <motion.div variants={modalItemMotion} className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-4 text-center shadow-lg shadow-slate-950/20">
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
              <span>{memberTitle.icon}</span>
              <span>{memberTitle.title}</span>
            </div>

            <div className="mt-3 text-xs text-slate-300">
              {user.favoriteTeam || "بدون منتخب مرشح"}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-right">
              <div className="flex items-center justify-between gap-3 text-xs md:text-sm">
                <span className="font-bold text-slate-300">اللقب الحالي</span>

                <span className="font-black text-white">
                  {titleProgress.currentTitle}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3 text-xs md:text-sm">
                <span className="font-bold text-slate-300">اللقب القادم</span>

                <span className="font-black text-amber-300">
                  {titleProgress.nextTitle}
                </span>
              </div>

              <div className="mt-3 overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  className="h-2 rounded-full bg-amber-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${titleProgress.progressPercent}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
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
              <h3 className="text-base font-black md:text-lg">
                🔮 توقعات العضو
              </h3>

              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold text-slate-300 md:text-xs">
                {predictions.length} توقع
              </span>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm text-slate-300">
                جاري تحميل التوقعات...
              </div>
            ) : predictions.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm text-slate-300">
                لا توجد توقعات لهذا العضو حتى الآن.
              </div>
            ) : (
              <>
                <motion.div variants={modalListMotion} initial="hidden" animate="show" className="space-y-3">
                  {visiblePredictions.map((prediction) => {
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
                        whileTap={{ scale: 0.985 }}
                        className={`rounded-2xl border p-3 shadow-lg shadow-slate-950/15 ${
                          golden
                            ? "border-amber-300/30 bg-amber-400/10"
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
                              <span className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black text-slate-950">
                                ⭐ توقع ذهبي
                              </span>
                            )}
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-black ${
                              golden
                                ? "bg-amber-300 text-slate-950"
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
                            className={`rounded-xl border px-2 py-2 text-sm font-black ${
                              golden
                                ? "border-amber-300/30 bg-slate-950/80 text-amber-200"
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
    async function loadLeaderboard() {
      try {
        const data = await getLeaderboardUsers();

        setUsers(data);

        const newTotalPages = Math.max(
          1,
          Math.ceil(data.length / USERS_PER_PAGE),
        );

        setCurrentPage((page) => Math.min(page, newTotalPages));
      } catch (error) {
        console.error("فشل تحميل لوحة الصدارة:", error);
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();

    const interval = setInterval(loadLeaderboard, 30000);

    return () => clearInterval(interval);
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
        viewport={{ once: false, amount: 0.18 }}
        className="relative mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.08] p-3 shadow-2xl shadow-slate-950/35 backdrop-blur-xl md:mt-8 md:p-6"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-cyan-400/5" />
        <div className="pointer-events-none absolute -right-24 top-14 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-14 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative">
        <div className="mb-4 text-center md:mb-6">
          <h2 className="text-2xl font-black md:text-3xl">لوحة الصدارة</h2>

          <p className="mt-2 text-xs leading-6 text-slate-300 md:text-sm">
            ترتيب جميع الأعضاء حسب النقاط ثم عدد التوقعات الصحيحة.
          </p>

          <button
            type="button"
            onClick={() => setShowTitlesGuide(true)}
            className="mt-3 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-black text-amber-100 shadow-lg shadow-amber-950/10 transition hover:bg-amber-400/20 active:scale-95 md:text-sm"
          >
            🏅 كيف أحصل على الألقاب؟
          </button>

          <div className="mx-auto mt-3 max-w-md rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-[11px] font-bold leading-6 text-slate-300 md:text-xs">
            <span className="text-emerald-300">ص</span> = النتيجة بالملي،{" "}
            <span className="text-amber-200">ف</span> = الفائز الصحيح،{" "}
            <span className="text-red-300">خ</span> = الخطأ
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm text-slate-300">
            جاري تحميل لوحة الصدارة...
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm text-slate-300">
            <div className="mb-2 text-3xl">🏆</div>

            <div className="font-black">لا يوجد أعضاء حتى الآن</div>

            <p className="mt-2 text-xs leading-6 text-slate-300">
              ستظهر أسماء الأعضاء هنا بعد التسجيل.
            </p>
          </div>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-inner">
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-amber-200/50 to-transparent"
                animate={{ opacity: [0.25, 0.9, 0.25] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              />
              <table className="w-full table-fixed text-center">
                <thead className="bg-slate-950">
                  <tr className="text-[10px] md:text-sm">
                    <th className="w-[18%] px-1 py-3 font-black md:px-4 md:py-4">
                      المركز
                    </th>

                    <th className="w-[27%] px-1 py-3 font-black md:px-4 md:py-4">
                      الاسم
                    </th>

                    <th className="w-[13%] px-1 py-3 font-black md:px-4 md:py-4">
                      التوقعات
                    </th>

                    <th className="w-[8%] px-1 py-3 font-black text-emerald-300 md:px-4 md:py-4">
                      ص
                    </th>

                    <th className="w-[8%] px-1 py-3 font-black text-amber-200 md:px-4 md:py-4">
                      ف
                    </th>

                    <th className="w-[8%] px-1 py-3 font-black text-red-300 md:px-4 md:py-4">
                      خ
                    </th>

                    <th className="w-[18%] px-1 py-3 font-black md:px-4 md:py-4">
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
                        viewport={{ once: false, amount: 0.45 }}
                        whileTap={{ scale: 0.995 }}
                        className={`border-t border-white/10 text-[11px] transition md:text-sm ${style.rowClass}`}
                      >
                        <td className="px-1 py-3 md:px-4 md:py-4">
                          <div className="flex items-center justify-center gap-1 md:gap-2">
                            <RankBadge rank={user.currentRank} />
                            <RankMovement user={user} />
                          </div>
                        </td>

                        <td className="px-1 py-3 font-black md:px-4 md:py-4">
                          <button
                            type="button"
                            onClick={() => openUserPredictions(user)}
                            className={`mx-auto flex w-full min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-1 text-center leading-5 underline-offset-4 hover:underline ${style.nameClass}`}
                            title="اضغط لعرض توقعات العضو"
                          >
                            {style.icon && (
                              <span className="shrink-0 text-sm md:text-base">
                                {style.icon}
                              </span>
                            )}

                            <span className="whitespace-normal break-words leading-5">
                              {user.fullName}
                            </span>
                          </button>
                        </td>

                        <td className="px-1 py-3 font-black text-slate-200 md:px-4 md:py-4">
                          {user.total}
                        </td>

                        <td className="px-1 py-3 font-black text-emerald-300 md:px-4 md:py-4">
                          {user.exact}
                        </td>

                        <td className="px-1 py-3 font-black text-amber-200 md:px-4 md:py-4">
                          {user.winner}
                        </td>

                        <td className="px-1 py-3 font-black text-red-300 md:px-4 md:py-4">
                          {user.wrong}
                        </td>

                        <td className="px-1 py-3 md:px-4 md:py-4">
                          <span
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
                صفحة {currentPage} من {totalPages}
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
