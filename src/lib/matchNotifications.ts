import { createUserNotification } from "./notifications";

type PredictionForNotification = {
  id: string;
  userId: string;
  userName: string;
  matchId: string;
  homeTeamName?: string;
  awayTeamName?: string;
  homeTeamEmoji?: string;
  awayTeamEmoji?: string;
  homeScore: number;
  awayScore: number;
  points?: number;
  resultType?: "exact" | "winner" | "wrong" | "";
};

type RankedUserForNotification = {
  id: string;
  fullName: string;
  points: number;
  total: number;
  correct: number;
  wrong: number;
  currentStreak: number;
  bestStreak: number;
  currentRank?: number;
};

export async function sendMatchCalculationNotifications({
  predictions,
  rankedUsers,
}: {
  predictions: PredictionForNotification[];
  rankedUsers: RankedUserForNotification[];
}) {
  const tasks: Promise<unknown>[] = [];

  predictions.forEach((prediction) => {
    if (!prediction.userId) return;

    const matchName = `${prediction.homeTeamEmoji || ""} ${
      prediction.homeTeamName || "الفريق الأول"
    } × ${prediction.awayTeamName || "الفريق الثاني"} ${
      prediction.awayTeamEmoji || ""
    }`;

    if (prediction.resultType === "exact") {
      tasks.push(
        createUserNotification({
          userId: prediction.userId,
          type: "exact_hit",
          title: "🎯 جبتها بالملي",
          message: `توقعك في مباراة ${matchName} أصاب النتيجة كاملة (+${prediction.points || 0}).`,
        })
      );
    }

    if (prediction.resultType === "winner") {
      tasks.push(
        createUserNotification({
          userId: prediction.userId,
          type: "winner_hit",
          title: "🏆 الفائز الصحيح",
          message: `توقعك في مباراة ${matchName} أصاب الفائز الصحيح (+${prediction.points || 0}).`,
        })
      );
    }
  });

  rankedUsers.forEach((user) => {
    const rank = user.currentRank || 0;

    if (rank === 1 && user.total > 0) {
      tasks.push(
        createUserNotification({
          userId: user.id,
          type: "leader",
          title: "👑 أصبحت المتصدر",
          message: "مبروك! وصلت للمركز الأول في لوحة الصدارة.",
        })
      );
    } else if (rank > 0 && rank <= 3 && user.total > 0) {
      tasks.push(
        createUserNotification({
          userId: user.id,
          type: "rank_up",
          title: "🥉 دخلت التوب 3",
          message: `مبروك! وصلت للمركز ${rank} في لوحة الصدارة.`,
        })
      );
    } else if (rank > 0 && rank <= 5 && user.total > 0) {
      tasks.push(
        createUserNotification({
          userId: user.id,
          type: "rank_up",
          title: "🏅 دخلت التوب 5",
          message: `مبروك! وصلت للمركز ${rank} في لوحة الصدارة.`,
        })
      );
    } else if (rank > 0 && rank <= 10 && user.total > 0) {
      tasks.push(
        createUserNotification({
          userId: user.id,
          type: "rank_up",
          title: "🏆 دخلت التوب 10",
          message: `مبروك! أصبحت ضمن أفضل 10 أعضاء في لوحة الصدارة.`,
        })
      );
    }

    if (user.currentStreak >= 3) {
      tasks.push(
        createUserNotification({
          userId: user.id,
          type: "streak",
          title: "🔥 سلسلة صحيحة",
          message: `حققت سلسلة ${user.currentStreak} توقعات صحيحة متتالية.`,
        })
      );
    }
  });

  await Promise.allSettled(tasks);
}