import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getLeaderboardUsers, type LeaderboardUser } from "@/lib/leaderboard";
import { getAllMatches, type Match } from "@/lib/matches";

export type ChallengeStudioEventType =
  | "final_spotlight"
  | "semi_final_spotlight"
  | "third_place_spotlight"
  | "golden_prediction_alert"
  | "strong_match_alert"
  | "dangerous_prediction"
  | "leader_under_pressure"
  | "top3_spotlight"
  | "top10_spotlight"
  | "chasing_pack"
  | "biggest_climb"
  | "biggest_drop"
  | "best_streak"
  | "highest_accuracy"
  | "most_exact_results"
  | "round_star"
  | "best_comeback"
  | "most_stable"
  | "studio_word"
  | "black_horse"
  | "worst_luck"
  | "forgot_prediction"
  | "exact_after_calculation"
  | "winner_after_calculation"
  | "missed_after_calculation"
  | "knockout_qualification_hit"
  | "flag_memory_champion"
  | "flag_memory_fastest"
  | "flag_memory_fewest_mistakes"
  | "word_game_champion"
  | "word_game_fastest"
  | "word_game_first_try"
  | "word_game_lost"
  | "ten_seconds_exact"
  | "ten_seconds_points_boost"
  | "ten_seconds_best_attempt";

export type ChallengeStudioEvent = {
  id: string;
  type: ChallengeStudioEventType;
  title: string;
  priority: number;
  members: string[];
  data: Record<string, string | number | boolean | null>;
};

type RawPrediction = {
  id: string;
  userId: string;
  userName: string;
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  points: number;
  resultType: string;
  predictionType: string;
  isCalculated: boolean;
  createdAt: string;
  calculatedAt: string;
  qualifiedTeamName: string;
  qualifiedTeamCode: string;
  qualificationMethod: string;
};

type RawFlagMemoryResult = {
  id: string;
  userId: string;
  userName: string;
  dateKey: string;
  timeSeconds: number;
  moves: number;
  mistakes: number;
  matchesCount: number;
  score: number;
  completed: boolean;
};

type RawWordGameResult = {
  id: string;
  userId: string;
  userName: string;
  dateKey: string;
  won: boolean;
  attemptsUsed: number;
  durationMs: number | null;
  finishedAt: number;
};

type RawTenSecondsResult = {
  id: string;
  userId: string;
  userName: string;
  dateKey: string;
  attemptsCount: number;
  bestElapsedMs: number | null;
  bestDiffMs: number | null;
  bestDisplayTime: string;
  won: boolean;
  pointsAwarded: boolean;
  awardedPoints: number;
};

function toText(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getTimeValue(value?: string) {
  const time = new Date(value || "").getTime();
  return Number.isFinite(time) ? time : 0;
}

function getMatchLabel(match: Match) {
  return `${match.homeTeamName} × ${match.awayTeamName}`;
}

function getPredictionMatchLabel(prediction: RawPrediction) {
  return `${prediction.homeTeamName} × ${prediction.awayTeamName}`;
}

function getKnockoutRoundValue(match: Match) {
  return match.matchStage === "knockout" ? match.knockoutRound || "general" : null;
}

function getHoursUntilMatch(match: Match, now = Date.now()) {
  const startTime = getTimeValue(match.startAt);
  if (!startTime || startTime <= now) return 0;
  return Math.max(1, Math.ceil((startTime - now) / (60 * 60 * 1000)));
}

function getEditorialVariant(match: Match, variants: string[]) {
  const source = `${match.id}-${match.homeTeamCode}-${match.awayTeamCode}`;
  const score = Array.from(source).reduce((total, char) => total + char.charCodeAt(0), 0);
  return variants[score % variants.length];
}

function getAccuracy(user: LeaderboardUser) {
  if (!user.total) return 0;
  return Math.round((user.correct / user.total) * 100);
}

function getMakkahDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

function getNullableNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function getTopUserIdSet(users: LeaderboardUser[], count = 25) {
  return new Set(users.slice(0, count).map((user) => user.id).filter(Boolean));
}

function getUserRankData(
  users: LeaderboardUser[],
  userId: string,
  userName: string
) {
  return users.find((user) => {
    return user.id === userId || user.fullName === userName;
  });
}

async function getTodayFlagMemoryResultsForEngine(): Promise<RawFlagMemoryResult[]> {
  const dateKey = getMakkahDateKey();
  const snapshot = await getDocs(
    query(collection(db, "flagMemoryResults"), where("dateKey", "==", dateKey))
  );

  const results = snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();

      return {
        id: toText(data.id) || docSnap.id,
        userId: toText(data.userId),
        userName: toText(data.userName),
        dateKey: toText(data.dateKey),
        timeSeconds: toNumber(data.timeSeconds),
        moves: toNumber(data.moves),
        mistakes: toNumber(data.mistakes),
        matchesCount: toNumber(data.matchesCount),
        score: toNumber(data.score),
        completed: Boolean(data.completed),
      };
    })
    .filter((result) => result.userId && result.userName && result.completed);

  const sorted = results.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.timeSeconds !== b.timeSeconds) return a.timeSeconds - b.timeSeconds;
    if (a.mistakes !== b.mistakes) return a.mistakes - b.mistakes;
    if (a.moves !== b.moves) return a.moves - b.moves;
    return a.userName.localeCompare(b.userName, "ar");
  });

  const seen = new Set<string>();
  const unique: RawFlagMemoryResult[] = [];

  sorted.forEach((result) => {
    const key = result.userId || result.userName;
    if (!key || seen.has(key)) return;
    seen.add(key);
    unique.push(result);
  });

  return unique;
}

async function getTodayWordGameResultsForEngine(): Promise<RawWordGameResult[]> {
  const dateKey = getMakkahDateKey();
  const snapshot = await getDocs(
    query(collection(db, "wordGameDailyResults"), where("dateKey", "==", dateKey))
  );

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();
      const durationMs = getNullableNumber(data.durationMs);

      return {
        id: toText(data.id) || docSnap.id,
        userId: toText(data.userId),
        userName: toText(data.userName),
        dateKey: toText(data.dateKey),
        won: Boolean(data.won),
        attemptsUsed: toNumber(data.attemptsUsed),
        durationMs,
        finishedAt: toNumber(data.finishedAt),
      };
    })
    .filter((result) => result.userId && result.userName)
    .sort((a, b) => {
      if (a.won !== b.won) return a.won ? -1 : 1;
      const aDuration = a.durationMs ?? Number.MAX_SAFE_INTEGER;
      const bDuration = b.durationMs ?? Number.MAX_SAFE_INTEGER;
      if (aDuration !== bDuration) return aDuration - bDuration;
      if (a.attemptsUsed !== b.attemptsUsed) return a.attemptsUsed - b.attemptsUsed;
      return a.finishedAt - b.finishedAt;
    });
}

async function getTodayTenSecondsResultsForEngine(): Promise<RawTenSecondsResult[]> {
  const dateKey = getMakkahDateKey();
  const snapshot = await getDocs(
    query(
      collection(db, "tenSecondsChallengeDaily"),
      where("dateKey", "==", dateKey)
    )
  );

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();

      return {
        id: toText(data.id) || docSnap.id,
        userId: toText(data.userId),
        userName: toText(data.userName),
        dateKey: toText(data.dateKey),
        attemptsCount: toNumber(data.attemptsCount),
        bestElapsedMs: getNullableNumber(data.bestElapsedMs),
        bestDiffMs: getNullableNumber(data.bestDiffMs),
        bestDisplayTime: toText(data.bestDisplayTime),
        won: Boolean(data.won),
        pointsAwarded: Boolean(data.pointsAwarded),
        awardedPoints: toNumber(data.awardedPoints),
      };
    })
    .filter((result) => result.userId && result.userName)
    .sort((a, b) => {
      if (a.won !== b.won) return a.won ? -1 : 1;
      const aDiff = a.bestDiffMs ?? Number.POSITIVE_INFINITY;
      const bDiff = b.bestDiffMs ?? Number.POSITIVE_INFINITY;
      if (aDiff !== bDiff) return aDiff - bDiff;
      return a.userName.localeCompare(b.userName, "ar");
    });
}

async function getAllPredictionsForEngine(): Promise<RawPrediction[]> {
  const snapshot = await getDocs(collection(db, "predictions"));

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();

      return {
        id: docSnap.id,
        userId: toText(data.userId),
        userName: toText(data.userName),
        matchId: toText(data.matchId),
        homeTeamName: toText(data.homeTeamName),
        awayTeamName: toText(data.awayTeamName),
        homeScore: toNumber(data.homeScore),
        awayScore: toNumber(data.awayScore),
        points: toNumber(data.points),
        resultType: toText(data.resultType),
        predictionType: toText(data.predictionType),
        isCalculated: Boolean(data.isCalculated),
        createdAt: toText(data.createdAt),
        calculatedAt: toText(data.calculatedAt),
        qualifiedTeamName:
          toText(data.qualifiedTeamName) ||
          toText(data.predictedQualifiedTeamName) ||
          toText(data.selectedQualifiedTeamName) ||
          toText(data.qualifiedTeam),
        qualifiedTeamCode:
          toText(data.qualifiedTeamCode) ||
          toText(data.predictedQualifiedTeamCode) ||
          toText(data.selectedQualifiedTeamCode),
        qualificationMethod:
          toText(data.qualificationMethod) ||
          toText(data.predictedQualificationMethod) ||
          toText(data.selectedQualificationMethod),
      };
    })
    .filter((prediction) => prediction.userId && prediction.matchId);
}

function buildKnockoutRoundSpotlightEvents(matches: Match[]) {
  const now = Date.now();

  const upcoming = [...matches]
    .filter((match) => {
      const startTime = getTimeValue(match.startAt);
      const round = getKnockoutRoundValue(match);

      return (
        match.isActive &&
        match.status === "scheduled" &&
        startTime > now &&
        (round === "semiFinal" || round === "thirdPlace" || round === "final")
      );
    })
    .sort((a, b) => getTimeValue(a.startAt) - getTimeValue(b.startAt));

  const semiFinals = upcoming
    .filter((match) => getKnockoutRoundValue(match) === "semiFinal")
    .slice(0, 2);

  const thirdPlace = upcoming.find(
    (match) => getKnockoutRoundValue(match) === "thirdPlace"
  );

  const finalMatch = upcoming.find(
    (match) => getKnockoutRoundValue(match) === "final"
  );

  const events: ChallengeStudioEvent[] = [];

  if (finalMatch) {
    events.push({
      id: `final_spotlight_${finalMatch.id}`,
      type: "final_spotlight",
      title: getEditorialVariant(finalMatch, [
        "ليلة الحسم الكبرى",
        "المشهد الأخير يقترب",
        "كل الطرق تقود إلى النهائي",
        "موعد البطولة وكتابة التاريخ",
      ]),
      priority: getHoursUntilMatch(finalMatch, now) <= 24 ? 165 : 158,
      members: [],
      data: {
        matchId: finalMatch.id,
        matchName: getMatchLabel(finalMatch),
        homeTeamName: finalMatch.homeTeamName,
        awayTeamName: finalMatch.awayTeamName,
        matchDate: finalMatch.matchDate,
        matchTime: finalMatch.matchTime,
        hoursUntilStart: getHoursUntilMatch(finalMatch, now),
        predictionType: finalMatch.predictionType,
        matchStage: finalMatch.matchStage,
        knockoutRound: "final",
        roundLabel: "النهائي",
        editorialWeight: "maximum",
        editorialAngle: getEditorialVariant(finalMatch, [
          "الحسم واللقب وضغط القرار الأخير",
          "المواجهة التي تختصر مشوار البطولة كاملًا",
          "اختبار التوقع الأكبر قبل رفع الكأس",
          "المشهد الختامي وتأثيره المباشر على صدارة الأعضاء",
        ]),
      },
    });
  }

  semiFinals.forEach((match, index) => {
    events.push({
      id: `semi_final_spotlight_${match.id}`,
      type: "semi_final_spotlight",
      title: getEditorialVariant(match, [
        "بوابة النهائي تفتح أبوابها",
        "ليلة العبور إلى المشهد الأخير",
        "نصف النهائي يرفع سقف التحدي",
        "خطوة واحدة تفصل عن النهائي",
        "صراع التأهل يدخل ساعاته الحاسمة",
      ]),
      priority: (getHoursUntilMatch(match, now) <= 24 ? 150 : 144) - index,
      members: [],
      data: {
        matchId: match.id,
        matchName: getMatchLabel(match),
        homeTeamName: match.homeTeamName,
        awayTeamName: match.awayTeamName,
        matchDate: match.matchDate,
        matchTime: match.matchTime,
        hoursUntilStart: getHoursUntilMatch(match, now),
        predictionType: match.predictionType,
        matchStage: match.matchStage,
        knockoutRound: "semiFinal",
        roundLabel: "نصف النهائي",
        semiFinalOrder: index + 1,
        editorialWeight: "very_high",
        editorialAngle: getEditorialVariant(match, [
          "سباق الوصول إلى النهائي",
          "ضغط الفرصة الأخيرة قبل موقعة اللقب",
          "قراءة المواجهة من زاوية العبور لا من زاوية مباراة عادية",
          "تأثير نتيجة المواجهة على سباق توقعات الأعضاء",
        ]),
      },
    });
  });

  if (thirdPlace) {
    events.push({
      id: `third_place_spotlight_${thirdPlace.id}`,
      type: "third_place_spotlight",
      title: getEditorialVariant(thirdPlace, [
        "موعد التعويض والميدالية",
        "المركز الثالث يبحث عن صاحبه",
        "ختام بطابع تنافسي خاص",
      ]),
      priority: getHoursUntilMatch(thirdPlace, now) <= 24 ? 122 : 116,
      members: [],
      data: {
        matchId: thirdPlace.id,
        matchName: getMatchLabel(thirdPlace),
        homeTeamName: thirdPlace.homeTeamName,
        awayTeamName: thirdPlace.awayTeamName,
        matchDate: thirdPlace.matchDate,
        matchTime: thirdPlace.matchTime,
        hoursUntilStart: getHoursUntilMatch(thirdPlace, now),
        predictionType: thirdPlace.predictionType,
        matchStage: thirdPlace.matchStage,
        knockoutRound: "thirdPlace",
        roundLabel: "المركز الثالث",
        editorialWeight: "high",
        editorialAngle: "مواجهة التعويض وإنهاء البطولة بصورة قوية",
      },
    });
  }

  return events;
}

function buildGoldenPredictionAlertEvent(matches: Match[]) {
  const now = Date.now();

  const nextGoldenMatch = [...matches]
    .filter((match) => {
      const startTime = getTimeValue(match.startAt);

      return (
        match.predictionType === "golden" &&
        match.isActive &&
        match.status === "scheduled" &&
        startTime > now
      );
    })
    .sort((a, b) => getTimeValue(a.startAt) - getTimeValue(b.startAt))[0];

  if (!nextGoldenMatch) return null;

  const startTime = getTimeValue(nextGoldenMatch.startAt);
  const hoursUntilStart = Math.max(
    0,
    Math.ceil((startTime - now) / (60 * 60 * 1000))
  );

  return {
    id: `golden_prediction_alert_${nextGoldenMatch.id}`,
    type: "golden_prediction_alert" as const,
    title: "السوبر ذهبي يشعل الجولة",
    priority: hoursUntilStart <= 24 ? 115 : 98,
    members: [],
    data: {
      matchName: getMatchLabel(nextGoldenMatch),
      hoursUntilStart,
      homeTeamName: nextGoldenMatch.homeTeamName,
      awayTeamName: nextGoldenMatch.awayTeamName,
      predictionType: nextGoldenMatch.predictionType,
      matchStage: nextGoldenMatch.matchStage,
      superGoldenExactPoints: 10,
      superGoldenWinnerPoints: 4,
      superGoldenQualifiedPoints: 6,
      superGoldenMethodPoints: 4,
      superGoldenMaxKnockoutPoints: 20,
    },
  };
}

function buildStrongMatchAlertEvent(matches: Match[]) {
  const now = Date.now();

  const nextMatch = [...matches]
    .filter((match) => {
      const startTime = getTimeValue(match.startAt);
      const knockoutRound = getKnockoutRoundValue(match);

      return (
        match.isActive &&
        match.status === "scheduled" &&
        startTime > now &&
        startTime - now <= 48 * 60 * 60 * 1000 &&
        knockoutRound !== "semiFinal" &&
        knockoutRound !== "thirdPlace" &&
        knockoutRound !== "final"
      );
    })
    .sort((a, b) => getTimeValue(a.startAt) - getTimeValue(b.startAt))[0];

  if (!nextMatch) return null;

  return {
    id: `strong_match_alert_${nextMatch.id}`,
    type: "strong_match_alert" as const,
    title: "مباراة قوية على الأبواب",
    priority: nextMatch.predictionType === "golden" ? 108 : 82,
    members: [],
    data: {
      matchName: getMatchLabel(nextMatch),
      homeTeamName: nextMatch.homeTeamName,
      awayTeamName: nextMatch.awayTeamName,
      predictionType: nextMatch.predictionType,
      matchStage: nextMatch.matchStage,
    },
  };
}

function buildDangerousPredictionEvent(predictions: RawPrediction[]) {
  const now = Date.now();

  const candidate = [...predictions]
    .filter((prediction) => {
      const createdTime = getTimeValue(prediction.createdAt);
      const totalGoals = prediction.homeScore + prediction.awayScore;

      return (
        !prediction.isCalculated &&
        createdTime > 0 &&
        now - createdTime <= 24 * 60 * 60 * 1000 &&
        (totalGoals >= 5 ||
          Math.abs(prediction.homeScore - prediction.awayScore) >= 3)
      );
    })
    .sort((a, b) => {
      const aRisk =
        a.homeScore + a.awayScore + Math.abs(a.homeScore - a.awayScore);
      const bRisk =
        b.homeScore + b.awayScore + Math.abs(b.homeScore - b.awayScore);
      return bRisk - aRisk;
    })[0];

  if (!candidate) return null;

  return {
    id: `dangerous_prediction_${candidate.id}`,
    type: "dangerous_prediction" as const,
    title: "توقع خطير دخل الرادار",
    priority: candidate.predictionType === "golden" ? 100 : 86,
    members: [candidate.userName],
    data: {
      memberName: candidate.userName,
      matchName: getPredictionMatchLabel(candidate),
      homeScore: candidate.homeScore,
      awayScore: candidate.awayScore,
      predictionType: candidate.predictionType,
    },
  };
}

function buildLeaderPressureEvent(users: LeaderboardUser[]) {
  const leader = users[0];
  const second = users[1];

  if (!leader || !second) return null;
  if (leader.total === 0 || second.total === 0) return null;

  const diff = leader.points - second.points;
  if (diff > 5) return null;

  return {
    id: `leader_under_pressure_${leader.id}_${second.id}`,
    type: "leader_under_pressure" as const,
    title: "كرسي الصدارة يهتز",
    priority: diff <= 1 ? 106 : diff <= 3 ? 100 : 92,
    members: [leader.fullName, second.fullName],
    data: {
      leaderName: leader.fullName,
      secondName: second.fullName,
      leaderPoints: leader.points,
      secondPoints: second.points,
      pointsDiff: diff,
    },
  };
}

function buildTop3SpotlightEvent(users: LeaderboardUser[]) {
  const third = users[2];

  if (!third || third.total === 0) return null;

  return {
    id: `top3_spotlight_${third.id}`,
    type: "top3_spotlight" as const,
    title: "المركز الثالث تحت الضوء",
    priority: 87,
    members: [third.fullName],
    data: {
      memberName: third.fullName,
      currentRank: third.currentRank,
      points: third.points,
      correct: third.correct,
      exact: third.exact,
    },
  };
}

function buildTop10SpotlightEvent(users: LeaderboardUser[]) {
  const top10 = users
    .slice(3, 10)
    .filter((user) => user.total > 0)
    .sort((a, b) => {
      if (b.rankChange !== a.rankChange) return b.rankChange - a.rankChange;
      if (b.exact !== a.exact) return b.exact - a.exact;
      return b.points - a.points;
    })[0];

  if (!top10) return null;

  return {
    id: `top10_spotlight_${top10.id}`,
    type: "top10_spotlight" as const,
    title: "عين الاستوديو على التوب 10",
    priority: 82,
    members: [top10.fullName],
    data: {
      memberName: top10.fullName,
      currentRank: top10.currentRank,
      points: top10.points,
      rankDirection: top10.rankDirection,
      rankChange: top10.rankChange,
      exact: top10.exact,
    },
  };
}

function buildChasingPackEvent(users: LeaderboardUser[]) {
  const leader = users[0];
  if (!leader) return null;

  const chaser = users
    .slice(3, 15)
    .filter((user) => user.total > 0 && leader.points - user.points <= 20)
    .sort((a, b) => {
      if (b.rankChange !== a.rankChange) return b.rankChange - a.rankChange;
      return b.points - a.points;
    })[0];

  if (!chaser) return null;

  return {
    id: `chasing_pack_${chaser.id}`,
    type: "chasing_pack" as const,
    title: "حكاية الريمونتادا",
    priority: 84,
    members: [chaser.fullName],
    data: {
      memberName: chaser.fullName,
      currentRank: chaser.currentRank,
      points: chaser.points,
      leaderName: leader.fullName,
      leaderPoints: leader.points,
      pointsBehindLeader: leader.points - chaser.points,
      rankChange: chaser.rankChange,
    },
  };
}

function buildBiggestClimbEvent(users: LeaderboardUser[]) {
  const climber = [...users]
    .filter((user) => user.rankDirection === "up" && user.rankChange >= 3)
    .sort((a, b) => b.rankChange - a.rankChange)[0];

  if (!climber) return null;

  return {
    id: `biggest_climb_${climber.id}_${climber.rankChange}`,
    type: "biggest_climb" as const,
    title: "قفزة الترتيب",
    priority: climber.rankChange >= 10 ? 96 : climber.rankChange >= 6 ? 90 : 80,
    members: [climber.fullName],
    data: {
      memberName: climber.fullName,
      rankChange: climber.rankChange,
      currentRank: climber.currentRank,
      points: climber.points,
    },
  };
}

function buildBiggestDropEvent(users: LeaderboardUser[]) {
  const dropped = [...users]
    .filter((user) => user.rankDirection === "down" && user.rankChange >= 3)
    .sort((a, b) => b.rankChange - a.rankChange)[0];

  if (!dropped) return null;

  return {
    id: `biggest_drop_${dropped.id}_${dropped.rankChange}`,
    type: "biggest_drop" as const,
    title: "تراجع مفاجئ",
    priority: dropped.rankChange >= 10 ? 78 : dropped.rankChange >= 6 ? 72 : 64,
    members: [dropped.fullName],
    data: {
      memberName: dropped.fullName,
      rankChange: dropped.rankChange,
      currentRank: dropped.currentRank,
      points: dropped.points,
    },
  };
}

function buildBestStreakEvent(users: LeaderboardUser[]) {
  const user = [...users]
    .filter((item) => item.bestStreak >= 3)
    .sort((a, b) => b.bestStreak - a.bestStreak)[0];

  if (!user) return null;

  return {
    id: `best_streak_${user.id}_${user.bestStreak}`,
    type: "best_streak" as const,
    title: "سلسلة نارية",
    priority: user.bestStreak >= 7 ? 90 : 76,
    members: [user.fullName],
    data: {
      memberName: user.fullName,
      bestStreak: user.bestStreak,
      currentStreak: user.currentStreak,
      points: user.points,
    },
  };
}

function buildHighestAccuracyEvent(users: LeaderboardUser[]) {
  const user = [...users]
    .filter((item) => item.total >= 5)
    .map((item) => ({ ...item, accuracy: getAccuracy(item) }))
    .filter((item) => item.accuracy >= 50)
    .sort((a, b) => {
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      if (b.exact !== a.exact) return b.exact - a.exact;
      return b.total - a.total;
    })[0];

  if (!user) return null;

  return {
    id: `highest_accuracy_${user.id}_${user.accuracy}`,
    type: "highest_accuracy" as const,
    title: "ملك الدقة",
    priority: user.accuracy >= 75 ? 90 : 78,
    members: [user.fullName],
    data: {
      memberName: user.fullName,
      accuracy: user.accuracy,
      total: user.total,
      correct: user.correct,
      exact: user.exact,
      points: user.points,
    },
  };
}

function buildMostExactEvent(users: LeaderboardUser[]) {
  const user = [...users]
    .filter((item) => item.exact >= 2)
    .sort((a, b) => b.exact - a.exact)[0];

  if (!user) return null;

  return {
    id: `most_exact_results_${user.id}_${user.exact}`,
    type: "most_exact_results" as const,
    title: "قناص النتائج",
    priority: user.exact >= 5 ? 88 : 74,
    members: [user.fullName],
    data: {
      memberName: user.fullName,
      exact: user.exact,
      points: user.points,
      currentRank: user.currentRank,
    },
  };
}

function buildRoundStarEvent(predictions: RawPrediction[]) {
  const now = Date.now();
  const roundStats = new Map<
    string,
    {
      userId: string;
      userName: string;
      roundPoints: number;
      exactCount: number;
      correctCount: number;
      calculatedCount: number;
      latestCalculatedAt: string;
      latestCalculatedTime: number;
    }
  >();

  predictions.forEach((prediction) => {
    const calculatedTime = getTimeValue(prediction.calculatedAt);

    if (
      !prediction.isCalculated ||
      calculatedTime <= 0 ||
      now - calculatedTime > 24 * 60 * 60 * 1000 ||
      !prediction.userId ||
      !prediction.userName
    ) {
      return;
    }

    const current = roundStats.get(prediction.userId) || {
      userId: prediction.userId,
      userName: prediction.userName,
      roundPoints: 0,
      exactCount: 0,
      correctCount: 0,
      calculatedCount: 0,
      latestCalculatedAt: prediction.calculatedAt,
      latestCalculatedTime: calculatedTime,
    };

    current.roundPoints += prediction.points;
    current.calculatedCount += 1;

    if (prediction.resultType === "exact") {
      current.exactCount += 1;
    }

    if (prediction.points > 0) {
      current.correctCount += 1;
    }

    if (calculatedTime > current.latestCalculatedTime) {
      current.latestCalculatedAt = prediction.calculatedAt;
      current.latestCalculatedTime = calculatedTime;
    }

    roundStats.set(prediction.userId, current);
  });

  const star = Array.from(roundStats.values())
    .filter((item) => item.roundPoints > 0)
    .sort((a, b) => {
      if (b.roundPoints !== a.roundPoints) return b.roundPoints - a.roundPoints;
      if (b.exactCount !== a.exactCount) return b.exactCount - a.exactCount;
      if (b.correctCount !== a.correctCount)
        return b.correctCount - a.correctCount;
      return b.latestCalculatedTime - a.latestCalculatedTime;
    })[0];

  if (!star) return null;

  return {
    id: `round_star_${star.userId}_${star.roundPoints}_${star.exactCount}`,
    type: "round_star" as const,
    title: "نجم الجولة",
    priority: star.exactCount > 0 ? 92 : 82,
    members: [star.userName],
    data: {
      memberName: star.userName,
      roundPoints: star.roundPoints,
      exactCount: star.exactCount,
      correctCount: star.correctCount,
      calculatedCount: star.calculatedCount,
      latestCalculatedAt: star.latestCalculatedAt,
    },
  };
}

function buildBestComebackEvent(users: LeaderboardUser[]) {
  const user = [...users]
    .filter((item) => {
      return (
        item.total >= 5 &&
        item.rankDirection === "up" &&
        item.rankChange >= 2 &&
        item.currentRank > 3 &&
        item.points > 0
      );
    })
    .sort((a, b) => {
      const aScore = a.rankChange * 3 + a.currentStreak + a.exact;
      const bScore = b.rankChange * 3 + b.currentStreak + b.exact;

      if (bScore !== aScore) return bScore - aScore;
      if (b.currentStreak !== a.currentStreak)
        return b.currentStreak - a.currentStreak;
      return b.points - a.points;
    })[0];

  if (!user) return null;

  return {
    id: `best_comeback_${user.id}_${user.rankChange}_${user.currentRank}`,
    type: "best_comeback" as const,
    title: "أفضل عودة",
    priority: user.rankChange >= 6 ? 86 : 77,
    members: [user.fullName],
    data: {
      memberName: user.fullName,
      rankChange: user.rankChange,
      currentRank: user.currentRank,
      points: user.points,
      currentStreak: user.currentStreak,
      exact: user.exact,
    },
  };
}

function buildMostStableEvent(users: LeaderboardUser[]) {
  const user = [...users]
    .filter((item) => {
      return (
        item.total >= 6 &&
        item.points > 0 &&
        (String(item.rankDirection) === "same" ||
          String(item.rankDirection) === "stable" ||
          item.rankChange === 0)
      );
    })
    .map((item) => ({ ...item, accuracy: getAccuracy(item) }))
    .sort((a, b) => {
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      if (b.exact !== a.exact) return b.exact - a.exact;
      if (a.currentRank !== b.currentRank) return a.currentRank - b.currentRank;
      return b.points - a.points;
    })[0];

  if (!user) return null;

  return {
    id: `most_stable_${user.id}_${user.currentRank}_${user.accuracy}`,
    type: "most_stable" as const,
    title: "الأكثر ثباتًا",
    priority: user.currentRank <= 10 ? 80 : 70,
    members: [user.fullName],
    data: {
      memberName: user.fullName,
      currentRank: user.currentRank,
      points: user.points,
      accuracy: user.accuracy,
      total: user.total,
      correct: user.correct,
      exact: user.exact,
    },
  };
}

function buildStudioWordEvent(users: LeaderboardUser[], matches: Match[]) {
  const activeUsers = users.filter((user) => user.total > 0);
  const leader = activeUsers[0];
  const second = activeUsers[1];

  const scheduledMatchesCount = matches.filter((match) => {
    const startTime = getTimeValue(match.startAt);
    return (
      match.isActive &&
      match.status === "scheduled" &&
      startTime > Date.now()
    );
  }).length;

  if (activeUsers.length === 0 && scheduledMatchesCount === 0) return null;

  return {
    id: `studio_word_${activeUsers.length}_${scheduledMatchesCount}`,
    type: "studio_word" as const,
    title: "كلمة الاستوديو",
    priority: 58,
    members: [],
    data: {
      activeMembersCount: activeUsers.length,
      scheduledMatchesCount,
      leaderPoints: leader ? leader.points : null,
      secondPoints: second ? second.points : null,
      pointsDiff: leader && second ? leader.points - second.points : null,
    },
  };
}

function buildBlackHorseEvent(users: LeaderboardUser[]) {
  const user = [...users]
    .filter((item) => item.total >= 5 && item.total <= 20 && item.points > 0)
    .map((item) => ({ ...item, accuracy: getAccuracy(item) }))
    .filter((item) => item.accuracy >= 45 && item.currentRank <= 20)
    .sort((a, b) => {
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      if (a.currentRank !== b.currentRank) return a.currentRank - b.currentRank;
      return b.points - a.points;
    })[0];

  if (!user) return null;

  return {
    id: `black_horse_${user.id}_${user.currentRank}`,
    type: "black_horse" as const,
    title: "الحصان الأسود",
    priority: 84,
    members: [user.fullName],
    data: {
      memberName: user.fullName,
      accuracy: user.accuracy,
      total: user.total,
      currentRank: user.currentRank,
      points: user.points,
    },
  };
}

function buildWorstLuckEvent(users: LeaderboardUser[]) {
  const user = [...users]
    .filter((item) => item.total >= 10 && item.wrong >= 5)
    .sort((a, b) => {
      if (b.wrong !== a.wrong) return b.wrong - a.wrong;
      return b.total - a.total;
    })[0];

  if (!user) return null;

  return {
    id: `worst_luck_${user.id}_${user.wrong}`,
    type: "worst_luck" as const,
    title: "الأكثر حظًا سيئًا",
    priority: 66,
    members: [user.fullName],
    data: {
      memberName: user.fullName,
      wrong: user.wrong,
      total: user.total,
      correct: user.correct,
      currentRank: user.currentRank,
    },
  };
}

function buildForgotPredictionEvent(
  users: LeaderboardUser[],
  matches: Match[],
  predictions: RawPrediction[]
) {
  const now = Date.now();

  const lastStartedMatch = [...matches]
    .filter((match) => {
      const startTime = getTimeValue(match.startAt);
      return (
        startTime > 0 &&
        startTime < now &&
        now - startTime <= 24 * 60 * 60 * 1000
      );
    })
    .sort((a, b) => getTimeValue(b.startAt) - getTimeValue(a.startAt))[0];

  if (!lastStartedMatch) return null;

  const predictedUserIds = new Set(
    predictions
      .filter((prediction) => prediction.matchId === lastStartedMatch.id)
      .map((prediction) => prediction.userId)
  );

  const candidate = users.find((user) => {
    return user.total >= 5 && !predictedUserIds.has(user.id);
  });

  if (!candidate) return null;

  return {
    id: `forgot_prediction_${candidate.id}_${lastStartedMatch.id}`,
    type: "forgot_prediction" as const,
    title: "صح النوم",
    priority: 70,
    members: [candidate.fullName],
    data: {
      memberName: candidate.fullName,
      matchName: getMatchLabel(lastStartedMatch),
      currentRank: candidate.currentRank,
      points: candidate.points,
    },
  };
}

function buildExactAfterCalculationEvent(predictions: RawPrediction[]) {
  const now = Date.now();

  const prediction = [...predictions]
    .filter((item) => {
      const calculatedTime = getTimeValue(item.calculatedAt);

      return (
        item.isCalculated &&
        item.resultType === "exact" &&
        calculatedTime > 0 &&
        now - calculatedTime <= 24 * 60 * 60 * 1000
      );
    })
    .sort((a, b) => b.points - a.points)[0];

  if (!prediction) return null;

  return {
    id: `exact_after_calculation_${prediction.id}`,
    type: "exact_after_calculation" as const,
    title: "ضربة بالملي بعد الاحتساب",
    priority: prediction.points >= 10 ? 112 : 94,
    members: [prediction.userName],
    data: {
      memberName: prediction.userName,
      matchName: getPredictionMatchLabel(prediction),
      points: prediction.points,
      homeScore: prediction.homeScore,
      awayScore: prediction.awayScore,
      predictionType: prediction.predictionType,
    },
  };
}

function buildWinnerAfterCalculationEvent(predictions: RawPrediction[]) {
  const now = Date.now();

  const prediction = [...predictions]
    .filter((item) => {
      const calculatedTime = getTimeValue(item.calculatedAt);

      return (
        item.isCalculated &&
        item.resultType === "winner" &&
        calculatedTime > 0 &&
        now - calculatedTime <= 24 * 60 * 60 * 1000
      );
    })
    .sort((a, b) => b.points - a.points)[0];

  if (!prediction) return null;

  return {
    id: `winner_after_calculation_${prediction.id}`,
    type: "winner_after_calculation" as const,
    title: "الفائز كان في الجيب",
    priority: 76,
    members: [prediction.userName],
    data: {
      memberName: prediction.userName,
      matchName: getPredictionMatchLabel(prediction),
      points: prediction.points,
      homeScore: prediction.homeScore,
      awayScore: prediction.awayScore,
      predictionType: prediction.predictionType,
    },
  };
}

function buildMissedAfterCalculationEvent(predictions: RawPrediction[]) {
  const now = Date.now();

  const prediction = [...predictions]
    .filter((item) => {
      const calculatedTime = getTimeValue(item.calculatedAt);

      return (
        item.isCalculated &&
        item.points === 0 &&
        calculatedTime > 0 &&
        now - calculatedTime <= 24 * 60 * 60 * 1000
      );
    })
    .sort(
      (a, b) => getTimeValue(b.calculatedAt) - getTimeValue(a.calculatedAt)
    )[0];

  if (!prediction) return null;

  return {
    id: `missed_after_calculation_${prediction.id}`,
    type: "missed_after_calculation" as const,
    title: "فرصة راحت بعد الاحتساب",
    priority: 60,
    members: [prediction.userName],
    data: {
      memberName: prediction.userName,
      matchName: getPredictionMatchLabel(prediction),
      homeScore: prediction.homeScore,
      awayScore: prediction.awayScore,
      points: prediction.points,
    },
  };
}


function buildKnockoutQualificationHitEvent(predictions: RawPrediction[]) {
  const now = Date.now();

  const prediction = [...predictions]
    .filter((item) => {
      const calculatedTime = getTimeValue(item.calculatedAt);
      const hasQualificationSignal =
        Boolean(item.qualifiedTeamName || item.qualifiedTeamCode || item.qualificationMethod) ||
        item.points >= 6;

      return (
        item.isCalculated &&
        item.points > 0 &&
        hasQualificationSignal &&
        calculatedTime > 0 &&
        now - calculatedTime <= 24 * 60 * 60 * 1000
      );
    })
    .sort((a, b) => b.points - a.points)[0];

  if (!prediction) return null;

  return {
    id: `knockout_qualification_hit_${prediction.id}`,
    type: "knockout_qualification_hit" as const,
    title: "قراءة خروج المغلوب",
    priority: prediction.points >= 10 ? 104 : 88,
    members: [prediction.userName],
    data: {
      memberName: prediction.userName,
      matchName: getPredictionMatchLabel(prediction),
      homeScore: prediction.homeScore,
      awayScore: prediction.awayScore,
      points: prediction.points,
      qualifiedTeamName: prediction.qualifiedTeamName,
      qualificationMethod: prediction.qualificationMethod,
      predictionType: prediction.predictionType,
    },
  };
}

function buildFlagMemoryChampionEvent(
  results: RawFlagMemoryResult[],
  users: LeaderboardUser[]
) {
  const champion = results[0];
  if (!champion) return null;

  const rankData = getUserRankData(users, champion.userId, champion.userName);

  return {
    id: `flag_memory_champion_${champion.id}`,
    type: "flag_memory_champion" as const,
    title: "بطل تحدي الأعلام",
    priority: 90,
    members: [champion.userName],
    data: {
      memberName: champion.userName,
      score: champion.score,
      timeSeconds: champion.timeSeconds,
      moves: champion.moves,
      mistakes: champion.mistakes,
      currentRank: rankData?.currentRank ?? null,
      points: rankData?.points ?? null,
    },
  };
}

function buildFlagMemoryFastestEvent(
  results: RawFlagMemoryResult[],
  users: LeaderboardUser[]
) {
  const fastest = [...results].sort((a, b) => {
    if (a.timeSeconds !== b.timeSeconds) return a.timeSeconds - b.timeSeconds;
    return b.score - a.score;
  })[0];

  if (!fastest) return null;

  const rankData = getUserRankData(users, fastest.userId, fastest.userName);

  return {
    id: `flag_memory_fastest_${fastest.id}`,
    type: "flag_memory_fastest" as const,
    title: "أسرع عين في الأعلام",
    priority: 84,
    members: [fastest.userName],
    data: {
      memberName: fastest.userName,
      score: fastest.score,
      timeSeconds: fastest.timeSeconds,
      moves: fastest.moves,
      mistakes: fastest.mistakes,
      currentRank: rankData?.currentRank ?? null,
      points: rankData?.points ?? null,
    },
  };
}

function buildFlagMemoryFewestMistakesEvent(
  results: RawFlagMemoryResult[],
  users: LeaderboardUser[]
) {
  const cleanPlayer = [...results].sort((a, b) => {
    if (a.mistakes !== b.mistakes) return a.mistakes - b.mistakes;
    if (b.score !== a.score) return b.score - a.score;
    return a.timeSeconds - b.timeSeconds;
  })[0];

  if (!cleanPlayer) return null;

  const rankData = getUserRankData(users, cleanPlayer.userId, cleanPlayer.userName);

  return {
    id: `flag_memory_fewest_mistakes_${cleanPlayer.id}`,
    type: "flag_memory_fewest_mistakes" as const,
    title: "أقل أخطاء في الأعلام",
    priority: 78,
    members: [cleanPlayer.userName],
    data: {
      memberName: cleanPlayer.userName,
      score: cleanPlayer.score,
      timeSeconds: cleanPlayer.timeSeconds,
      moves: cleanPlayer.moves,
      mistakes: cleanPlayer.mistakes,
      currentRank: rankData?.currentRank ?? null,
      points: rankData?.points ?? null,
    },
  };
}

function buildWordGameChampionEvent(
  results: RawWordGameResult[],
  users: LeaderboardUser[]
) {
  const champion = results.find((result) => result.won);
  if (!champion) return null;

  const rankData = getUserRankData(users, champion.userId, champion.userName);

  return {
    id: `word_game_champion_${champion.id}`,
    type: "word_game_champion" as const,
    title: "بطل خمن كلمة اليوم",
    priority: 88,
    members: [champion.userName],
    data: {
      memberName: champion.userName,
      attemptsUsed: champion.attemptsUsed,
      durationMs: champion.durationMs,
      currentRank: rankData?.currentRank ?? null,
      points: rankData?.points ?? null,
    },
  };
}

function buildWordGameFastestEvent(
  results: RawWordGameResult[],
  users: LeaderboardUser[]
) {
  const fastest = [...results]
    .filter((result) => result.won)
    .sort((a, b) => {
      const aDuration = a.durationMs ?? Number.MAX_SAFE_INTEGER;
      const bDuration = b.durationMs ?? Number.MAX_SAFE_INTEGER;
      if (aDuration !== bDuration) return aDuration - bDuration;
      return a.attemptsUsed - b.attemptsUsed;
    })[0];

  if (!fastest) return null;

  const rankData = getUserRankData(users, fastest.userId, fastest.userName);

  return {
    id: `word_game_fastest_${fastest.id}`,
    type: "word_game_fastest" as const,
    title: "أسرع فوز في خمن كلمة",
    priority: 82,
    members: [fastest.userName],
    data: {
      memberName: fastest.userName,
      attemptsUsed: fastest.attemptsUsed,
      durationMs: fastest.durationMs,
      currentRank: rankData?.currentRank ?? null,
      points: rankData?.points ?? null,
    },
  };
}

function buildWordGameFirstTryEvent(
  results: RawWordGameResult[],
  users: LeaderboardUser[]
) {
  const sharpPlayer = [...results]
    .filter((result) => result.won && result.attemptsUsed <= 2)
    .sort((a, b) => {
      if (a.attemptsUsed !== b.attemptsUsed) return a.attemptsUsed - b.attemptsUsed;
      const aDuration = a.durationMs ?? Number.MAX_SAFE_INTEGER;
      const bDuration = b.durationMs ?? Number.MAX_SAFE_INTEGER;
      return aDuration - bDuration;
    })[0];

  if (!sharpPlayer) return null;

  const rankData = getUserRankData(users, sharpPlayer.userId, sharpPlayer.userName);

  return {
    id: `word_game_first_try_${sharpPlayer.id}`,
    type: "word_game_first_try" as const,
    title: sharpPlayer.attemptsUsed === 1 ? "من أول محاولة" : "من ثاني محاولة",
    priority: sharpPlayer.attemptsUsed === 1 ? 86 : 80,
    members: [sharpPlayer.userName],
    data: {
      memberName: sharpPlayer.userName,
      attemptsUsed: sharpPlayer.attemptsUsed,
      durationMs: sharpPlayer.durationMs,
      currentRank: rankData?.currentRank ?? null,
      points: rankData?.points ?? null,
    },
  };
}

function buildWordGameLostEvent(
  results: RawWordGameResult[],
  users: LeaderboardUser[]
) {
  const topUserIds = getTopUserIdSet(users, 25);
  const lostPlayer = results.find(
    (result) => !result.won && topUserIds.has(result.userId)
  );

  if (!lostPlayer) return null;

  const rankData = getUserRankData(users, lostPlayer.userId, lostPlayer.userName);

  return {
    id: `word_game_lost_${lostPlayer.id}`,
    type: "word_game_lost" as const,
    title: "كلمة استعصت اليوم",
    priority: 58,
    members: [lostPlayer.userName],
    data: {
      memberName: lostPlayer.userName,
      attemptsUsed: lostPlayer.attemptsUsed,
      currentRank: rankData?.currentRank ?? null,
      points: rankData?.points ?? null,
    },
  };
}

function buildTenSecondsExactEvent(
  results: RawTenSecondsResult[],
  users: LeaderboardUser[]
) {
  const exact = [...results]
    .filter((result) => result.won && result.bestDiffMs === 0)
    .sort((a, b) => (b.awardedPoints || 0) - (a.awardedPoints || 0))[0];

  if (!exact) return null;

  const rankData = getUserRankData(users, exact.userId, exact.userName);

  return {
    id: `ten_seconds_exact_${exact.id}`,
    type: "ten_seconds_exact" as const,
    title: "العشر ثواني بالملي",
    priority: 94,
    members: [exact.userName],
    data: {
      memberName: exact.userName,
      bestDisplayTime: exact.bestDisplayTime || "00:10.000",
      bestDiffMs: exact.bestDiffMs,
      attemptsCount: exact.attemptsCount,
      awardedPoints: exact.awardedPoints,
      currentRank: rankData?.currentRank ?? null,
      points: rankData?.points ?? null,
    },
  };
}

function buildTenSecondsPointsBoostEvent(
  results: RawTenSecondsResult[],
  users: LeaderboardUser[]
) {
  const winner = [...results]
    .filter((result) => result.won && result.pointsAwarded && result.awardedPoints > 0)
    .sort((a, b) => {
      const aDiff = a.bestDiffMs ?? Number.POSITIVE_INFINITY;
      const bDiff = b.bestDiffMs ?? Number.POSITIVE_INFINITY;
      if (aDiff !== bDiff) return aDiff - bDiff;
      return b.awardedPoints - a.awardedPoints;
    })[0];

  if (!winner) return null;

  const rankData = getUserRankData(users, winner.userId, winner.userName);

  return {
    id: `ten_seconds_points_boost_${winner.id}`,
    type: "ten_seconds_points_boost" as const,
    title: "خمس نقاط في الوقت القاتل",
    priority: 89,
    members: [winner.userName],
    data: {
      memberName: winner.userName,
      bestDisplayTime: winner.bestDisplayTime,
      bestDiffMs: winner.bestDiffMs,
      attemptsCount: winner.attemptsCount,
      awardedPoints: winner.awardedPoints,
      currentRank: rankData?.currentRank ?? null,
      points: rankData?.points ?? null,
    },
  };
}

function buildTenSecondsBestAttemptEvent(
  results: RawTenSecondsResult[],
  users: LeaderboardUser[]
) {
  const closest = [...results]
    .filter((result) => !result.won && result.bestDiffMs !== null)
    .sort((a, b) => {
      const aDiff = a.bestDiffMs ?? Number.POSITIVE_INFINITY;
      const bDiff = b.bestDiffMs ?? Number.POSITIVE_INFINITY;
      return aDiff - bDiff;
    })[0];

  if (!closest) return null;

  const rankData = getUserRankData(users, closest.userId, closest.userName);

  return {
    id: `ten_seconds_best_attempt_${closest.id}`,
    type: "ten_seconds_best_attempt" as const,
    title: "قريب من العشرة",
    priority: 62,
    members: [closest.userName],
    data: {
      memberName: closest.userName,
      bestDisplayTime: closest.bestDisplayTime,
      bestDiffMs: closest.bestDiffMs,
      attemptsCount: closest.attemptsCount,
      currentRank: rankData?.currentRank ?? null,
      points: rankData?.points ?? null,
    },
  };
}

export async function buildChallengeStudioEvents(): Promise<
  ChallengeStudioEvent[]
> {
  const [
    users,
    matches,
    predictions,
    flagMemoryResults,
    wordGameResults,
    tenSecondsResults,
  ] = await Promise.all([
    getLeaderboardUsers(),
    getAllMatches(),
    getAllPredictionsForEngine(),
    getTodayFlagMemoryResultsForEngine(),
    getTodayWordGameResultsForEngine(),
    getTodayTenSecondsResultsForEngine(),
  ]);

  const activeUsers = users.filter((user) => user.total > 0);
  const focusUsers = activeUsers.slice(0, 25);

  const knockoutRoundEvents = buildKnockoutRoundSpotlightEvents(matches);

  const events = [
    ...knockoutRoundEvents,
    buildGoldenPredictionAlertEvent(matches),
    buildExactAfterCalculationEvent(predictions),
    buildKnockoutQualificationHitEvent(predictions),
    buildTenSecondsExactEvent(tenSecondsResults, activeUsers),
    buildRoundStarEvent(predictions),
    buildLeaderPressureEvent(focusUsers),
    buildFlagMemoryChampionEvent(flagMemoryResults, activeUsers),
    buildWordGameChampionEvent(wordGameResults, activeUsers),
    buildTenSecondsPointsBoostEvent(tenSecondsResults, activeUsers),
    buildStrongMatchAlertEvent(matches),
    buildDangerousPredictionEvent(predictions),
    buildTop3SpotlightEvent(focusUsers),
    buildTop10SpotlightEvent(focusUsers),
    buildChasingPackEvent(focusUsers),
    buildBiggestClimbEvent(focusUsers),
    buildBiggestDropEvent(focusUsers),
    buildBestStreakEvent(focusUsers),
    buildHighestAccuracyEvent(focusUsers),
    buildMostExactEvent(focusUsers),
    buildBestComebackEvent(focusUsers),
    buildMostStableEvent(focusUsers),
    buildBlackHorseEvent(focusUsers),
    buildFlagMemoryFastestEvent(flagMemoryResults, activeUsers),
    buildFlagMemoryFewestMistakesEvent(flagMemoryResults, activeUsers),
    buildWordGameFastestEvent(wordGameResults, activeUsers),
    buildWordGameFirstTryEvent(wordGameResults, activeUsers),
    buildTenSecondsBestAttemptEvent(tenSecondsResults, activeUsers),
    buildWorstLuckEvent(focusUsers),
    buildWordGameLostEvent(wordGameResults, activeUsers),
    buildWinnerAfterCalculationEvent(predictions),
    buildForgotPredictionEvent(focusUsers, matches, predictions),
    buildMissedAfterCalculationEvent(predictions),
    buildStudioWordEvent(activeUsers, matches),
  ].filter(Boolean) as ChallengeStudioEvent[];

  return events.sort((a, b) => b.priority - a.priority).slice(0, 40);
}