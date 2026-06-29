import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getLeaderboardUsers, type LeaderboardUser } from "@/lib/leaderboard";
import { getAllMatches, type Match } from "@/lib/matches";

export type ChallengeStudioEventType =
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
  | "black_horse"
  | "worst_luck"
  | "forgot_prediction"
  | "exact_after_calculation"
  | "winner_after_calculation"
  | "missed_after_calculation";

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

function getAccuracy(user: LeaderboardUser) {
  if (!user.total) return 0;
  return Math.round((user.correct / user.total) * 100);
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
      };
    })
    .filter((prediction) => prediction.userId && prediction.matchId);
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
    title: "التوقع الذهبي يشعل الجولة",
    priority: hoursUntilStart <= 24 ? 115 : 98,
    members: [],
    data: {
      matchName: getMatchLabel(nextGoldenMatch),
      hoursUntilStart,
      homeTeamName: nextGoldenMatch.homeTeamName,
      awayTeamName: nextGoldenMatch.awayTeamName,
      predictionType: nextGoldenMatch.predictionType,
      matchStage: nextGoldenMatch.matchStage,
    },
  };
}

function buildStrongMatchAlertEvent(matches: Match[]) {
  const now = Date.now();

  const nextMatch = [...matches]
    .filter((match) => {
      const startTime = getTimeValue(match.startAt);
      return (
        match.isActive &&
        match.status === "scheduled" &&
        startTime > now &&
        startTime - now <= 48 * 60 * 60 * 1000
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
    title: "جاي من الخلف",
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
    title: "صاروخ الجولة",
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
        (item.resultType === "exact" || item.points === 3 || item.points === 6) &&
        calculatedTime > 0 &&
        now - calculatedTime <= 24 * 60 * 60 * 1000
      );
    })
    .sort((a, b) => b.points - a.points)[0];

  if (!prediction) return null;

  return {
    id: `exact_after_calculation_${prediction.id}`,
    type: "exact_after_calculation" as const,
    title: "جابها بالملي بعد الاحتساب",
    priority: prediction.points >= 6 ? 112 : 94,
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
        (item.resultType === "winner" || item.points === 1 || item.points === 2) &&
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

export async function buildChallengeStudioEvents(): Promise<
  ChallengeStudioEvent[]
> {
  const [users, matches, predictions] = await Promise.all([
    getLeaderboardUsers(),
    getAllMatches(),
    getAllPredictionsForEngine(),
  ]);

  const activeUsers = users.filter((user) => user.total > 0);

  const events = [
    buildGoldenPredictionAlertEvent(matches),
    buildExactAfterCalculationEvent(predictions),
    buildLeaderPressureEvent(activeUsers),
    buildStrongMatchAlertEvent(matches),
    buildDangerousPredictionEvent(predictions),
    buildTop3SpotlightEvent(activeUsers),
    buildTop10SpotlightEvent(activeUsers),
    buildChasingPackEvent(activeUsers),
    buildBiggestClimbEvent(activeUsers),
    buildBiggestDropEvent(activeUsers),
    buildBestStreakEvent(activeUsers),
    buildHighestAccuracyEvent(activeUsers),
    buildMostExactEvent(activeUsers),
    buildBlackHorseEvent(activeUsers),
    buildWorstLuckEvent(activeUsers),
    buildWinnerAfterCalculationEvent(predictions),
    buildForgotPredictionEvent(activeUsers, matches, predictions),
    buildMissedAfterCalculationEvent(predictions),
  ].filter(Boolean) as ChallengeStudioEvent[];

  return events.sort((a, b) => b.priority - a.priority).slice(0, 24);
}