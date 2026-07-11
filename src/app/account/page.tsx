"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { Copyright, Medal, ShieldCheck, Swords, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  AccountPrediction,
  getAccountPredictions,
} from "@/lib/accountPredictions";
import { getTeams, Team } from "@/lib/teams";
import { updateUserPassword, updateUserProfile } from "@/lib/users";
import AchievementUnlockModal from "@/components/AchievementUnlockModal";
import NotificationsPreview from "@/components/NotificationsPreview";
import TeamFlag from "@/components/TeamFlag";
import { createUserNotification } from "@/lib/notifications";

const PREDICTIONS_PER_PAGE = 10;

const pageMotion: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.18, ease: "easeOut", staggerChildren: 0.025 },
  },
};

const revealMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: "easeOut" },
  },
};

const cardMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.16, ease: "easeOut" },
  },
};

const listMotion: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.018 },
  },
};

type AccountTab = "predictions" | "achievements" | "notifications" | "info";

type Achievement = {
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
};

function StatCard({
  label,
  value,
  colorClass = "text-white",
}: {
  label: string;
  value: string | number;
  colorClass?: string;
}) {
  return (
    <motion.div
      variants={cardMotion}
      whileTap={{ scale: 0.96 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-center shadow-lg shadow-slate-950/25"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
      <div className="relative">
      <div className={`text-2xl font-black ${colorClass}`}>{value}</div>
      <div className="mt-2 text-xs text-slate-300 md:text-sm">{label}</div>
      </div>
    </motion.div>
  );
}

function isGoldenPrediction(prediction: AccountPrediction) {
  return prediction.predictionType === "golden";
}

function getMatchRoundBadge(prediction: AccountPrediction) {
  if (prediction.matchStage !== "knockout") return null;

  if (prediction.knockoutRound === "semiFinal") {
    return {
      label: "نصف النهائي",
      Icon: Swords,
      className:
        "border-violet-300/30 bg-violet-400/10 text-violet-100",
    };
  }

  if (prediction.knockoutRound === "thirdPlace") {
    return {
      label: "المركز الثالث",
      Icon: Medal,
      className: "border-amber-300/30 bg-amber-400/10 text-amber-100",
    };
  }

  if (prediction.knockoutRound === "final") {
    return {
      label: "النهائي",
      Icon: Trophy,
      className:
        "border-fuchsia-300/30 bg-fuchsia-400/10 text-fuchsia-100",
    };
  }

  return {
    label: "خروج مغلوب",
    Icon: Swords,
    className: "border-blue-300/30 bg-blue-400/10 text-blue-100",
  };
}

function MatchRoundBadge({ prediction }: { prediction: AccountPrediction }) {
  const badge = getMatchRoundBadge(prediction);

  if (!badge) return null;

  const { Icon } = badge;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black ${badge.className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{badge.label}</span>
    </span>
  );
}

function getExactPoints(prediction: AccountPrediction) {
  return isGoldenPrediction(prediction) ? 10 : 3;
}

function getWinnerPoints(prediction: AccountPrediction) {
  return isGoldenPrediction(prediction) ? 4 : 1;
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
  prediction: AccountPrediction,
  qualifiedTeamCode?: string | null,
) {
  if (!qualifiedTeamCode) return "";

  const code = qualifiedTeamCode.trim().toUpperCase();

  const predictionWithCodes = prediction as AccountPrediction & {
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

function getPredictionTeamCode(
  prediction: AccountPrediction,
  side: "home" | "away",
) {
  const predictionWithCodes = prediction as AccountPrediction & {
    homeTeamCode?: string | null;
    awayTeamCode?: string | null;
  };

  const code =
    side === "home"
      ? predictionWithCodes.homeTeamCode
      : predictionWithCodes.awayTeamCode;

  return code || "";
}

function getQualifiedTeamEmoji(
  prediction: AccountPrediction,
  qualifiedTeamCode?: string | null,
) {
  if (!qualifiedTeamCode) return "";

  const code = qualifiedTeamCode.trim().toUpperCase();

  if (code === getPredictionTeamCode(prediction, "home").trim().toUpperCase()) {
    return prediction.homeTeamEmoji;
  }

  if (code === getPredictionTeamCode(prediction, "away").trim().toUpperCase()) {
    return prediction.awayTeamEmoji;
  }

  return "";
}

type AccountKnockoutPrediction = AccountPrediction & {
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

function getQualifiedTeamPoints(prediction: AccountPrediction) {
  return isGoldenPrediction(prediction) ? 6 : 2;
}

function getQualificationMethodPoints(prediction: AccountPrediction) {
  return isGoldenPrediction(prediction) ? 4 : 1;
}

function getKnockoutPointsBreakdown(prediction: AccountPrediction) {
  if (!prediction.isCalculated) return null;

  const knockoutPrediction = prediction as AccountKnockoutPrediction;

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

  const qualifiedTeamCode = normalizeTeamCode(
    knockoutPrediction.qualifiedTeamCode,
  );

  const actualQualifiedTeamCode = normalizeTeamCode(
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

  const homeTeamCode = normalizeTeamCode(getPredictionTeamCode(prediction, "home"));
  const awayTeamCode = normalizeTeamCode(getPredictionTeamCode(prediction, "away"));
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
    <motion.div
      variants={cardMotion}
      whileTap={{ scale: 0.96 }}
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
    </motion.div>
  );
}

function PointsBreakdown({ prediction }: { prediction: AccountPrediction }) {
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

function ResultBadge({ prediction }: { prediction: AccountPrediction }) {
  if (!prediction.isCalculated) {
    return (
      <span className="rounded-full bg-slate-400/15 px-3 py-1 text-[11px] font-black text-slate-300">
        بانتظار النتيجة
      </span>
    );
  }

  if (prediction.resultType === "exact") {
    return (
      <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-black text-emerald-300">
        {isGoldenPrediction(prediction)
          ? `سوبر ذهبي بالملي +${getExactPoints(prediction)}`
          : `النتيجة بالملي +${getExactPoints(prediction)}`}
      </span>
    );
  }

  if (prediction.resultType === "winner") {
    return (
      <span className="rounded-full bg-amber-400/15 px-3 py-1 text-[11px] font-black text-amber-300">
        {isGoldenPrediction(prediction)
          ? `الفائز صحيح سوبر ذهبي +${getWinnerPoints(prediction)}`
          : `الفائز صحيح +${getWinnerPoints(prediction)}`}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-red-400/15 px-3 py-1 text-[11px] font-black text-red-300">
      خطأ +0
    </span>
  );
}

function PredictionCard({ prediction }: { prediction: AccountPrediction }) {
  const isGolden = prediction.predictionType === "golden";

  const knockoutPrediction = prediction as AccountPrediction & {
    qualifiedTeamCode?: string | null;
    qualificationMethod?: string | null;
    actualQualifiedTeamCode?: string | null;
    actualQualificationMethod?: string | null;
  };

  return (
    <motion.div
      variants={cardMotion}
      whileTap={{ scale: 0.985 }}
      className={`relative overflow-hidden rounded-2xl border p-4 shadow-lg shadow-slate-950/25 ${
        isGolden
          ? "border-fuchsia-300/35 bg-gradient-to-br from-amber-400/15 via-fuchsia-500/10 to-slate-950/80 shadow-amber-500/10"
          : "border-white/10 bg-slate-950/70"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ResultBadge prediction={prediction} />
          <MatchRoundBadge prediction={prediction} />

          {isGolden && (
            <span className="rounded-full border border-amber-200/40 bg-gradient-to-r from-amber-300 via-fuchsia-300 to-violet-300 px-3 py-1 text-[11px] font-black text-slate-950 shadow-lg shadow-amber-500/20">
              🚀 توقع سوبر ذهبي
            </span>
          )}
        </div>

        <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-slate-950">
          {prediction.points} نقطة
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
        <div className="min-w-0">
          <div className="flex justify-center">
            <TeamFlag
              code={getPredictionTeamCode(prediction, "home")}
              emoji={prediction.homeTeamEmoji}
              name={prediction.homeTeamName}
              size="md"
            />
          </div>
          <div className="mt-1 truncate text-xs font-black md:text-sm">
            {prediction.homeTeamName}
          </div>
        </div>

        <div>
          <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-black text-amber-300">
            توقعك
          </div>

          <div className="mt-2 text-lg font-black text-white">
            {prediction.homeScore} - {prediction.awayScore}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex justify-center">
            <TeamFlag
              code={getPredictionTeamCode(prediction, "away")}
              emoji={prediction.awayTeamEmoji}
              name={prediction.awayTeamName}
              size="md"
            />
          </div>
          <div className="mt-1 truncate text-xs font-black md:text-sm">
            {prediction.awayTeamName}
          </div>
        </div>
      </div>

      {knockoutPrediction.qualifiedTeamCode && (
        <div className="mt-4 rounded-2xl border border-blue-400/30 bg-blue-400/10 p-3 text-center text-xs font-bold leading-6 text-blue-100 md:text-sm">
          المتأهل:{" "}
          <span className="inline-flex items-center justify-center gap-1.5 font-black text-white">
            <TeamFlag
              code={knockoutPrediction.qualifiedTeamCode}
              emoji={getQualifiedTeamEmoji(
                prediction,
                knockoutPrediction.qualifiedTeamCode,
              )}
              name={getQualifiedTeamName(
                prediction,
                knockoutPrediction.qualifiedTeamCode,
              )}
              size="sm"
            />
            <span>
              {getQualifiedTeamName(
                prediction,
                knockoutPrediction.qualifiedTeamCode,
              )}
            </span>
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
        <div className="mt-4 space-y-2">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-center text-sm text-slate-200">
            النتيجة الفعلية:{" "}
            <span className="font-black text-emerald-300">
              {prediction.actualHomeScore} - {prediction.actualAwayScore}
            </span>
          </div>

          {knockoutPrediction.actualQualifiedTeamCode &&
            knockoutPrediction.actualQualificationMethod && (
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-center text-xs font-bold leading-6 text-emerald-100 md:text-sm">
                المتأهل الفعلي:{" "}
                <span className="inline-flex items-center justify-center gap-1.5 font-black text-white">
                  <TeamFlag
                    code={knockoutPrediction.actualQualifiedTeamCode}
                    emoji={getQualifiedTeamEmoji(
                      prediction,
                      knockoutPrediction.actualQualifiedTeamCode,
                    )}
                    name={getQualifiedTeamName(
                      prediction,
                      knockoutPrediction.actualQualifiedTeamCode,
                    )}
                    size="sm"
                  />
                  <span>
                    {getQualifiedTeamName(
                      prediction,
                      knockoutPrediction.actualQualifiedTeamCode,
                    )}
                  </span>
                </span>{" "}
                • الطريقة:{" "}
                <span className="font-black text-white">
                  {getQualificationMethodLabel(
                    knockoutPrediction.actualQualificationMethod,
                  )}
                </span>
              </div>
            )}

          <PointsBreakdown prediction={prediction} />
        </div>
      )}
    </motion.div>
  );
}

function getAccountTitle({
  total,
  correct,
  currentRank,
}: {
  total: number;
  correct: number;
  currentRank: number;
}) {
  if (currentRank === 1 && total > 0) {
    return {
      icon: "🥇",
      title: "متصدر التحدي",
      className: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    };
  }

  if (currentRank > 1 && currentRank <= 3 && total > 0) {
    return {
      icon: "🏅",
      title: "منافس شرس",
      className: "border-orange-400/30 bg-orange-400/10 text-orange-100",
    };
  }

  if (currentRank > 3 && currentRank <= 10 && total > 0) {
    return {
      icon: "💪",
      title: "من النخبة",
      className: "border-sky-400/30 bg-sky-400/10 text-sky-100",
    };
  }

  if (correct >= 20) {
    return {
      icon: "⭐",
      title: "أسطورة التوقعات",
      className: "border-violet-400/30 bg-violet-400/10 text-violet-100",
    };
  }

  if (correct >= 12) {
    return {
      icon: "🏆",
      title: "محترف التوقعات",
      className: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    };
  }

  if (correct >= 7) {
    return {
      icon: "🧠",
      title: "خبير النتائج",
      className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    };
  }

  if (correct >= 3) {
    return {
      icon: "🎯",
      title: "صياد النقاط",
      className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    };
  }

  if (total >= 40) {
    return {
      icon: "⚽",
      title: "حاضر دائمًا",
      className: "border-blue-400/30 bg-blue-400/10 text-blue-100",
    };
  }

  if (total >= 20) {
    return {
      icon: "🔥",
      title: "نشيط التوقعات",
      className: "border-red-400/30 bg-red-400/10 text-red-100",
    };
  }

  if (total >= 8) {
    return {
      icon: "📊",
      title: "محلل واعد",
      className: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
    };
  }

  if (total >= 1) {
    return {
      icon: "🔮",
      title: "مبتدئ التوقعات",
      className: "border-slate-400/30 bg-slate-400/10 text-slate-100",
    };
  }

  return {
    icon: "👋",
    title: "مشجع جديد",
    className: "border-slate-400/30 bg-slate-400/10 text-slate-100",
  };
}

function getAccountTitleProgress({
  total,
  correct,
  currentRank,
}: {
  total: number;
  correct: number;
  currentRank: number;
}) {
  if (currentRank === 1 && total > 0) {
    return {
      currentTitle: "🥇 متصدر التحدي",
      nextTitle: "أنت وصلت لأعلى لقب حاليًا",
      remainingText: "حافظ على الصدارة يا بطل 🔥",
      progressPercent: 100,
    };
  }

  if (currentRank > 1 && currentRank <= 3 && total > 0) {
    return {
      currentTitle: "🏅 منافس شرس",
      nextTitle: "🥇 متصدر التحدي",
      remainingText: "اقترب من المركز الأول",
      progressPercent: 85,
    };
  }

  if (currentRank > 3 && currentRank <= 10 && total > 0) {
    return {
      currentTitle: "💪 من النخبة",
      nextTitle: "🏅 منافس شرس",
      remainingText: "ادخل أول 3 مراكز",
      progressPercent: 75,
    };
  }

  if (correct >= 20) {
    return {
      currentTitle: "⭐ أسطورة التوقعات",
      nextTitle: "💪 من النخبة",
      remainingText: "ادخل أول 10 مراكز",
      progressPercent: 70,
    };
  }

  if (correct >= 12) {
    return {
      currentTitle: "🏆 محترف التوقعات",
      nextTitle: "⭐ أسطورة التوقعات",
      remainingText: `باقي لك ${Math.max(0, 20 - correct)} توقع صحيح`,
      progressPercent: Math.min(100, Math.round((correct / 20) * 100)),
    };
  }

  if (correct >= 7) {
    return {
      currentTitle: "🧠 خبير النتائج",
      nextTitle: "🏆 محترف التوقعات",
      remainingText: `باقي لك ${Math.max(0, 12 - correct)} توقع صحيح`,
      progressPercent: Math.min(100, Math.round((correct / 12) * 100)),
    };
  }

  if (correct >= 3) {
    return {
      currentTitle: "🎯 صياد النقاط",
      nextTitle: "🧠 خبير النتائج",
      remainingText: `باقي لك ${Math.max(0, 7 - correct)} توقعات صحيحة`,
      progressPercent: Math.min(100, Math.round((correct / 7) * 100)),
    };
  }

  if (total >= 40) {
    return {
      currentTitle: "⚽ حاضر دائمًا",
      nextTitle: "🎯 صياد النقاط",
      remainingText: `باقي لك ${Math.max(0, 3 - correct)} توقعات صحيحة`,
      progressPercent: correct > 0 ? 45 : 25,
    };
  }

  if (total >= 20) {
    return {
      currentTitle: "🔥 نشيط التوقعات",
      nextTitle: "⚽ حاضر دائمًا",
      remainingText: `باقي لك ${Math.max(0, 40 - total)} توقع`,
      progressPercent: Math.min(100, Math.round((total / 40) * 100)),
    };
  }

  if (total >= 8) {
    return {
      currentTitle: "📊 محلل واعد",
      nextTitle: "🔥 نشيط التوقعات",
      remainingText: `باقي لك ${Math.max(0, 20 - total)} توقع`,
      progressPercent: Math.min(100, Math.round((total / 20) * 100)),
    };
  }

  if (total >= 1) {
    return {
      currentTitle: "🔮 مبتدئ التوقعات",
      nextTitle: "📊 محلل واعد",
      remainingText: `باقي لك ${Math.max(0, 8 - total)} توقعات`,
      progressPercent: Math.min(100, Math.round((total / 8) * 100)),
    };
  }

  return {
    currentTitle: "👋 مشجع جديد",
    nextTitle: "🔮 مبتدئ التوقعات",
    remainingText: "سجل أول توقع لك",
    progressPercent: 0,
  };
}

function getAccountAchievements({
  total,
  correct,
  currentRank,
  bestStreak,
  predictions,
}: {
  total: number;
  correct: number;
  currentRank: number;
  bestStreak: number;
  predictions: AccountPrediction[];
}): Achievement[] {
  const exactHits = predictions.filter((prediction) => {
    return prediction.isCalculated && prediction.resultType === "exact";
  }).length;

  const goldenExactHits = predictions.filter((prediction) => {
    return (
      prediction.isCalculated &&
      prediction.resultType === "exact" &&
      prediction.predictionType === "golden"
    );
  }).length;

  const pendingPredictions = predictions.filter(
    (prediction) => !prediction.isCalculated,
  ).length;

  const calculatedPredictions = predictions.filter(
    (prediction) => prediction.isCalculated,
  ).length;

  return [
    {
      icon: "🔮",
      title: "أول توقع",
      description: "سجل أول توقع لك في المنصة",
      unlocked: total >= 1,
    },
    {
      icon: "📊",
      title: "محلل واعد",
      description: "شارك في 8 توقعات أو أكثر",
      unlocked: total >= 8,
    },
    {
      icon: "🔥",
      title: "نشيط التوقعات",
      description: "شارك في 20 توقع أو أكثر",
      unlocked: total >= 20,
    },
    {
      icon: "⚽",
      title: "حاضر دائمًا",
      description: "شارك في 40 توقع أو أكثر",
      unlocked: total >= 40,
    },
    {
      icon: "🎯",
      title: "صياد النقاط",
      description: "حقق 3 توقعات صحيحة",
      unlocked: correct >= 3,
    },
    {
      icon: "🧠",
      title: "خبير النتائج",
      description: "حقق 7 توقعات صحيحة",
      unlocked: correct >= 7,
    },
    {
      icon: "🏆",
      title: "محترف التوقعات",
      description: "حقق 12 توقع صحيح",
      unlocked: correct >= 12,
    },
    {
      icon: "⭐",
      title: "أسطورة التوقعات",
      description: "حقق 20 توقع صحيح",
      unlocked: correct >= 20,
    },
    {
      icon: "💎",
      title: "جابها بالملي",
      description: `حقق ${exactHits} توقع مطابق للنتيجة`,
      unlocked: exactHits > 0,
    },
    {
      icon: "🟡",
      title: "سوبر ذهبي بالملي",
      description: `حقق ${goldenExactHits} توقع سوبر ذهبي مطابق للنتيجة`,
      unlocked: goldenExactHits > 0,
    },
    {
      icon: "⚡",
      title: "سلسلة نارية",
      description: "حقق 3 توقعات صحيحة متتالية",
      unlocked: bestStreak >= 3,
    },
    {
      icon: "🚀",
      title: "لا يوقف",
      description: "حقق 7 توقعات صحيحة متتالية",
      unlocked: bestStreak >= 7,
    },
    {
      icon: "💪",
      title: "من النخبة",
      description: "دخل قائمة أول 10 مراكز",
      unlocked: currentRank > 0 && currentRank <= 10 && total > 0,
    },
    {
      icon: "🏅",
      title: "منافس شرس",
      description: "وصل إلى أحد أول 3 مراكز",
      unlocked: currentRank > 0 && currentRank <= 3 && total > 0,
    },
    {
      icon: "🥇",
      title: "متصدر التحدي",
      description: "وصل إلى المركز الأول",
      unlocked: currentRank === 1 && total > 0,
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

function AchievementCard({ achievement }: { achievement: Achievement }) {
  return (
    <motion.div
      variants={cardMotion}
      whileTap={{ scale: 0.98 }}
      className={`rounded-2xl border p-3 ${
        achievement.unlocked
          ? "border-amber-400/25 bg-amber-400/10"
          : "border-white/10 bg-slate-950/40 opacity-60"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950/70 text-xl">
          {achievement.unlocked ? achievement.icon : "🔒"}
        </div>

        <div className="min-w-0">
          <div
            className={`text-sm font-black ${
              achievement.unlocked ? "text-white" : "text-slate-400"
            }`}
          >
            {achievement.title}
          </div>

          <div className="mt-1 text-[11px] leading-5 text-slate-300 md:text-xs">
            {achievement.description}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MyAchievementsSection({
  total,
  correct,
  currentRank,
  bestStreak,
  predictions,
}: {
  total: number;
  correct: number;
  currentRank: number;
  bestStreak: number;
  predictions: AccountPrediction[];
}) {
  const accountTitle = getAccountTitle({
    total,
    correct,
    currentRank,
  });

  const progress = getAccountTitleProgress({
    total,
    correct,
    currentRank,
  });

  const achievements = getAccountAchievements({
    total,
    correct,
    currentRank,
    bestStreak,
    predictions,
  });

  const unlockedAchievements = achievements.filter(
    (achievement) => achievement.unlocked,
  );

  return (
    <motion.section
      variants={revealMotion}
      initial="hidden"
      animate="show"
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/40 p-4 shadow-lg shadow-slate-950/25 md:p-5"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-amber-300/8" />
      <div className="relative">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black md:text-2xl">🏅 إنجازاتي</h2>

          <p className="mt-1 text-xs text-slate-300 md:text-sm">
            تابع لقبك الحالي والأوسمة اللي حققتها
          </p>
        </div>

        <div className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-[11px] font-bold text-slate-300 md:text-xs">
          {unlockedAchievements.length} مكتسبة
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-center md:text-right">
            <div
              className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-black ${accountTitle.className}`}
            >
              <span>{accountTitle.icon}</span>
              <span>{accountTitle.title}</span>
            </div>

            <div className="mt-3 text-xs font-bold text-slate-300 md:text-sm">
              لقبك الحالي داخل التحدي
            </div>
          </div>

          <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between gap-3 text-xs md:text-sm">
              <span className="font-bold text-slate-300">اللقب الحالي</span>
              <span className="font-black text-white">
                {progress.currentTitle}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 text-xs md:text-sm">
              <span className="font-bold text-slate-300">اللقب القادم</span>
              <span className="font-black text-amber-300">
                {progress.nextTitle}
              </span>
            </div>

            <div className="mt-3 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-amber-400"
                style={{ width: `${progress.progressPercent}%` }}
              />
            </div>

            <div className="mt-2 text-center text-[11px] font-bold text-slate-300 md:text-xs">
              {progress.remainingText}
            </div>
          </div>
        </div>
      </div>

      <motion.div variants={listMotion} className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
        {achievements.map((achievement) => (
          <AchievementCard key={achievement.title} achievement={achievement} />
        ))}
      </motion.div>
      </div>
    </motion.section>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, isLoggedIn, logout, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<AccountTab>("predictions");

  const [predictions, setPredictions] = useState<AccountPrediction[]>([]);
  const [predictionsLoading, setPredictionsLoading] = useState(true);
  const [currentPredictionsPage, setCurrentPredictionsPage] = useState(1);

  const [teams, setTeams] = useState<Team[]>([]);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editTeamCode, setEditTeamCode] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [unlockedAchievementModal, setUnlockedAchievementModal] =
    useState<Achievement | null>(null);

  const totalPredictionPages = Math.max(
    1,
    Math.ceil(predictions.length / PREDICTIONS_PER_PAGE),
  );

  const visiblePredictions = useMemo(() => {
    const startIndex = (currentPredictionsPage - 1) * PREDICTIONS_PER_PAGE;
    const endIndex = startIndex + PREDICTIONS_PER_PAGE;

    return predictions.slice(startIndex, endIndex);
  }, [predictions, currentPredictionsPage]);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login");
    }
  }, [loading, isLoggedIn, router]);
  useEffect(() => {
    if (!user || predictionsLoading) return;

    const achievements = getAccountAchievements({
      total: user.total || 0,
      correct: user.correct || 0,
      currentRank: user.currentRank || 0,
      bestStreak: user.bestStreak || 0,
      predictions,
    });

    const unlockedAchievements = achievements.filter(
      (achievement) => achievement.unlocked,
    );

    const storageKey = `worldcup_2026_seen_achievements_${user.id}`;
    const storedValue = localStorage.getItem(storageKey);

    if (!storedValue) {
      localStorage.setItem(
        storageKey,
        JSON.stringify(
          unlockedAchievements.map((achievement) => achievement.title),
        ),
      );
      return;
    }

    const seenTitles: string[] = JSON.parse(storedValue);

    const newAchievement = unlockedAchievements.find(
      (achievement) => !seenTitles.includes(achievement.title),
    );

    if (!newAchievement) return;

    setUnlockedAchievementModal(newAchievement);
    createUserNotification({
      userId: user.id,
      type: "achievement",
      title: `🏅 وسام جديد: ${newAchievement.title}`,
      message: newAchievement.description,
    }).catch((error) => {
      console.error("فشل إنشاء إشعار الوسام:", error);
    });

    localStorage.setItem(
      storageKey,
      JSON.stringify([...seenTitles, newAchievement.title]),
    );
  }, [user, predictions, predictionsLoading]);

  useEffect(() => {
    async function loadTeams() {
      try {
        const data = await getTeams();
        setTeams(data);
      } catch (error) {
        console.error("فشل تحميل المنتخبات:", error);
      }
    }

    loadTeams();
  }, []);

  useEffect(() => {
    if (!user) return;

    setEditFullName(user.fullName || "");
    setEditPhone(user.phone || "");

    const selectedTeam = teams.find(
      (team) => team.nameAr === user.favoriteTeam,
    );

    setEditTeamCode(selectedTeam?.code || "");
  }, [user?.id, teams]);

  useEffect(() => {
    async function loadAccountData() {
      if (!isLoggedIn || !user) return;

      try {
        setPredictionsLoading(true);
        await refreshUser();

        const data = await getAccountPredictions(user.id);
        setPredictions(data);

        const newTotalPages = Math.max(
          1,
          Math.ceil(data.length / PREDICTIONS_PER_PAGE),
        );

        setCurrentPredictionsPage((page) => Math.min(page, newTotalPages));
      } catch (error) {
        console.error("فشل تحميل توقعات الحساب:", error);
      } finally {
        setPredictionsLoading(false);
      }
    }

    loadAccountData();
  }, [isLoggedIn, user?.id]);

  function goToPreviousPredictionsPage() {
    setCurrentPredictionsPage((page) => Math.max(1, page - 1));
  }

  function goToNextPredictionsPage() {
    setCurrentPredictionsPage((page) =>
      Math.min(totalPredictionPages, page + 1),
    );
  }

  async function handleUpdateProfile(event: FormEvent) {
    event.preventDefault();

    if (!user) return;

    setProfileMessage("");
    setProfileError("");

    const selectedTeam = teams.find((team) => team.code === editTeamCode);

    if (!selectedTeam) {
      setProfileError("اختر المنتخب المرشح");
      return;
    }

    setSavingProfile(true);

    try {
      await updateUserProfile({
        userId: user.id,
        fullName: editFullName,
        phone: editPhone,
        favoriteTeam: selectedTeam.nameAr,
        teamEmoji: selectedTeam.emoji,
      });

      await refreshUser();

      setProfileMessage("تم تحديث معلومات حسابك بنجاح ✅");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "تعذر تحديث معلومات الحساب";
      setProfileError(errorMessage);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUpdatePassword(event: FormEvent) {
    event.preventDefault();

    if (!user) return;

    setPasswordMessage("");
    setPasswordError("");

    setSavingPassword(true);

    try {
      await updateUserPassword({
        userId: user.id,
        newPassword,
        confirmPassword,
      });

      await refreshUser();

      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("تم تغيير الرقم السري بنجاح ✅");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "تعذر تغيير الرقم السري";
      setPasswordError(errorMessage);
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading || !user) {
    return (
      <motion.main
        dir="rtl"
        variants={pageMotion}
        initial="hidden"
        animate="show"
        className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 text-white"
      >
        <motion.div variants={revealMotion} className="rounded-3xl border border-white/10 bg-white/10 p-6 text-center shadow-2xl">
          جاري تحميل حسابك...
        </motion.div>
      </motion.main>
    );
  }

  const accountTotal = user.total || 0;
  const accountCorrect = user.correct || 0;
  const accountRank = user.currentRank || 0;
  const accountBestStreak = user.bestStreak || 0;
  const accountFavoriteTeam = teams.find(
    (team) => team.nameAr === user.favoriteTeam,
  );

  return (
    <motion.main
      dir="rtl"
      variants={pageMotion}
      initial="hidden"
      animate="show"
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 text-white"
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.12),transparent_34%),radial-gradient(circle_at_10%_30%,rgba(56,189,248,0.10),transparent_32%),radial-gradient(circle_at_90%_70%,rgba(52,211,153,0.08),transparent_30%)]" />
      {unlockedAchievementModal && (
        <AchievementUnlockModal
          icon={unlockedAchievementModal.icon}
          title={unlockedAchievementModal.title}
          description={unlockedAchievementModal.description}
          onClose={() => setUnlockedAchievementModal(null)}
        />
      )}
      <div className="relative mx-auto max-w-5xl">
        <motion.header variants={revealMotion} className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15 active:scale-95"
          >
            العودة للرئيسية
          </button>

          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white hover:bg-red-400 active:scale-95"
          >
            خروج
          </button>
        </motion.header>

        <motion.section
          variants={revealMotion}
          initial="hidden"
          animate="show"
          whileTap={{ scale: 0.99 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-5 text-center shadow-2xl shadow-slate-950/30 backdrop-blur-xl md:p-8"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-amber-300/10" />
          <div className="relative">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10">
            <TeamFlag
              code={accountFavoriteTeam?.code || editTeamCode}
              emoji={user.teamEmoji || "🏆"}
              name={user.favoriteTeam || "المنتخب المرشح"}
              size="lg"
            />
          </div>

          <h1 className="text-3xl font-black md:text-4xl">{user.fullName}</h1>

          <p className="mt-2 text-sm text-slate-300 md:text-base">
            المنتخب المرشح:{" "}
            <span className="font-black text-amber-300">
              {user.favoriteTeam || "غير محدد"}
            </span>
          </p>

          <div className="mt-5 inline-flex rounded-full border border-white/10 bg-slate-950/60 px-5 py-2 text-sm text-slate-200">
            ترتيبك الحالي:{" "}
            <span className="mx-1 font-black text-amber-300">
              #{user.currentRank || "-"}
            </span>
          </div>
          </div>
        </motion.section>

        <motion.section
          variants={listMotion}
          initial="hidden"
          animate="show"
          className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4"
        >
          <StatCard
            label="النقاط"
            value={user.points || 0}
            colorClass="text-amber-300"
          />

          <StatCard label="عدد التوقعات" value={user.total || 0} />

          <StatCard
            label="الصحيح"
            value={user.correct || 0}
            colorClass="text-emerald-300"
          />

          <StatCard
            label="الخطأ"
            value={user.wrong || 0}
            colorClass="text-red-300"
          />
        </motion.section>

        <motion.section
          variants={listMotion}
          initial="hidden"
          animate="show"
          className="mt-4 grid grid-cols-2 gap-3"
        >
          <StatCard
            label="السلسلة الحالية"
            value={user.currentStreak || 0}
            colorClass="text-sky-300"
          />

          <StatCard
            label="أفضل سلسلة صحيحة"
            value={user.bestStreak || 0}
            colorClass="text-orange-300"
          />
        </motion.section>

        <motion.section
          variants={revealMotion}
          initial="hidden"
          animate="show"
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-3 shadow-2xl shadow-slate-950/30 backdrop-blur-xl md:p-5"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-cyan-300/8" />
          <div className="relative">
          <div className="grid grid-cols-4 gap-2 rounded-2xl bg-slate-950/60 p-2">
            <button
              type="button"
              onClick={() => setActiveTab("predictions")}
              className={`rounded-xl px-2 py-3 text-xs font-black transition md:px-4 md:text-sm ${
                activeTab === "predictions"
                  ? "bg-amber-400 text-slate-950"
                  : "text-slate-300 hover:bg-white/10 active:scale-95"
              }`}
            >
              توقعاتي
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("achievements")}
              className={`rounded-xl px-2 py-3 text-xs font-black transition md:px-4 md:text-sm ${
                activeTab === "achievements"
                  ? "bg-amber-400 text-slate-950"
                  : "text-slate-300 hover:bg-white/10 active:scale-95"
              }`}
            >
              إنجازاتي
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("notifications")}
              className={`rounded-xl px-2 py-3 text-xs font-black transition md:px-4 md:text-sm ${
                activeTab === "notifications"
                  ? "bg-amber-400 text-slate-950"
                  : "text-slate-300 hover:bg-white/10 active:scale-95"
              }`}
            >
              🔔 الإشعارات
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`rounded-xl px-2 py-3 text-xs font-black transition md:px-4 md:text-sm ${
                activeTab === "info"
                  ? "bg-amber-400 text-slate-950"
                  : "text-slate-300 hover:bg-white/10 active:scale-95"
              }`}
            >
              معلومات حسابي
            </button>
          </div>

          {activeTab === "notifications" && (
            <div className="mt-5">
              <NotificationsPreview />
            </div>
          )}

          {activeTab === "predictions" && (
            <div className="mt-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-black">توقعاتي</h2>

                <span className="rounded-full bg-slate-950/60 px-3 py-1 text-[11px] text-slate-300">
                  {predictions.length} توقع
                </span>
              </div>

              {predictionsLoading ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm text-slate-300">
                  جاري تحميل توقعاتك...
                </div>
              ) : predictions.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm text-slate-300">
                  ما عندك توقعات حتى الآن.
                </div>
              ) : (
                <>
                  <motion.div variants={listMotion} initial="hidden" animate="show" className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {visiblePredictions.map((prediction) => (
                      <PredictionCard
                        key={prediction.id}
                        prediction={prediction}
                      />
                    ))}
                  </motion.div>

                  {predictions.length > PREDICTIONS_PER_PAGE && (
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={goToPreviousPredictionsPage}
                        disabled={currentPredictionsPage === 1}
                        className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white transition hover:bg-white/15 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 md:text-sm"
                      >
                        السابق
                      </button>

                      <div className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-xs font-bold text-slate-200 md:text-sm">
                        صفحة {currentPredictionsPage} من {totalPredictionPages}
                      </div>

                      <button
                        type="button"
                        onClick={goToNextPredictionsPage}
                        disabled={
                          currentPredictionsPage === totalPredictionPages
                        }
                        className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white transition hover:bg-white/15 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 md:text-sm"
                      >
                        التالي
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "achievements" && (
            <div className="mt-5">
              <MyAchievementsSection
                total={accountTotal}
                correct={accountCorrect}
                currentRank={accountRank}
                bestStreak={accountBestStreak}
                predictions={predictions}
              />
            </div>
          )}

          {activeTab === "info" && (
            <div className="mt-5">
              <h2 className="mb-4 text-xl font-black">تعديل معلومات حسابي</h2>

              {(profileMessage || profileError) && (
                <div className="mb-4 space-y-2">
                  {profileMessage && (
                    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-center text-xs text-emerald-100 md:text-sm">
                      {profileMessage}
                    </div>
                  )}

                  {profileError && (
                    <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-center text-xs text-red-100 md:text-sm">
                      {profileError}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold">الاسم</label>
                  <input
                    type="text"
                    value={editFullName}
                    maxLength={20}
                    onChange={(event) => setEditFullName(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:border-amber-400"
                    required
                  />
                  <div className="mt-1 text-[11px] text-slate-400">
                    الحد الأقصى 20 حرف
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    رقم الجوال
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(event) => setEditPhone(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    المنتخب المرشح
                  </label>
                  <select
                    value={editTeamCode}
                    onChange={(event) => setEditTeamCode(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-amber-400"
                    required
                  >
                    <option value="">اختر المنتخب</option>
                    {teams.map((team) => (
                      <option key={team.code} value={team.code}>
                        {team.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProfile ? "جاري حفظ التعديل..." : "حفظ التعديل"}
                </button>
              </form>

              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs leading-6 text-slate-300">
                تعديل البيانات لا يؤثر على نقاطك أو توقعاتك السابقة.
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/50 p-4 md:p-5">
                <h3 className="mb-2 text-lg font-black">تغيير الرقم السري</h3>

                <p className="mb-4 text-xs leading-6 text-slate-300 md:text-sm">
                  يمكنك تغيير الرقم السري الخاص بحسابك من هنا. لن تتأثر نقاطك أو
                  توقعاتك السابقة.
                </p>

                {(passwordMessage || passwordError) && (
                  <div className="mb-4 space-y-2">
                    {passwordMessage && (
                      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-center text-xs text-emerald-100 md:text-sm">
                        {passwordMessage}
                      </div>
                    )}

                    {passwordError && (
                      <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-center text-xs text-red-100 md:text-sm">
                        {passwordError}
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-bold">
                      الرقم السري الجديد
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      minLength={4}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:border-amber-400"
                      required
                    />
                    <div className="mt-1 text-[11px] text-slate-400">
                      يجب ألا يقل عن 4 أرقام أو أحرف
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold">
                      تأكيد الرقم السري الجديد
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      minLength={4}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-slate-950 outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingPassword
                      ? "جاري تحديث الرقم السري..."
                      : "تحديث الرقم السري"}
                  </button>
                </form>
              </div>
            </div>
          )}
          </div>
        </motion.section>
      </div>

      <footer className="relative z-10 mt-6 border-t border-white/10 px-3 py-6 text-center text-xs text-slate-400">
        <motion.div
          variants={revealMotion}
          initial="hidden"
          animate="show"
          className="mx-auto flex max-w-xl transform-gpu flex-col items-center justify-center gap-3 rounded-[1.7rem] border border-white/10 bg-white/[0.06] px-4 py-4 shadow-lg shadow-slate-950/20 backdrop-blur-sm"
        >
          <div className="flex items-center justify-center gap-2 text-slate-300">
            <Copyright className="h-3.5 w-3.5" />
            <span>جميع الحقوق محفوظة</span>
            <span className="font-black text-white">2026</span>
          </div>

          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-[11px] font-black text-emerald-100 shadow-md shadow-emerald-950/10">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            <span>برمجة وتطوير</span>
            <span className="text-white">عبدالسلام العنزي</span>
          </div>
        </motion.div>
      </footer>
    </motion.main>
  );
}
