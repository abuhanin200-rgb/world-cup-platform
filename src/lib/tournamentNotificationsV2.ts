import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { NotificationType } from "./notifications";

const NOTIFICATIONS_COLLECTION = "notifications";
const USERS_COLLECTION = "users";
const PREDICTIONS_COLLECTION = "tournamentPredictions";
const BATCH_SIZE = 400;

export type TournamentNotificationRecipient = {
  userId: string;
  fullName: string;
};

export type TournamentMatchNotificationMode =
  | "prediction_open"
  | "one_hour"
  | "thirty_minutes"
  | "missing_prediction";

export type TournamentScoredPredictionNotification = {
  userId: string;
  points: number;
  resultType: "exact" | "outcome" | "wrong";
};

export type TournamentLeaderboardNotificationRow = {
  userId: string;
  rank: number | null;
  points: number;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 240);
}

function notificationDocId(parts: string[]) {
  return safeId(parts.filter(Boolean).join("__"));
}

async function getPlatformMembers(): Promise<TournamentNotificationRecipient[]> {
  const snapshot = await getDocs(collection(db, USERS_COLLECTION));
  return snapshot.docs
    .map((item) => {
      const data = item.data();
      return {
        userId: clean(data.id) || item.id,
        fullName: clean(data.fullName) || "عضو",
      };
    })
    .filter((item) => Boolean(item.userId));
}

async function writeNotifications(
  rows: Array<{
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    tournamentId: string;
    matchId?: string | null;
    route?: string | null;
    dedupeKey: string;
  }>,
) {
  const now = new Date().toISOString();

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = writeBatch(db);
    rows.slice(index, index + BATCH_SIZE).forEach((row) => {
      const ref = doc(db, NOTIFICATIONS_COLLECTION, row.id);
      batch.set(
        ref,
        {
          userId: row.userId,
          type: row.type,
          title: row.title.slice(0, 100),
          message: row.message.slice(0, 300),
          isRead: false,
          createdAt: now,
          readAt: null,
          tournamentId: row.tournamentId,
          matchId: row.matchId ?? null,
          route: row.route ?? null,
          dedupeKey: row.dedupeKey,
        },
        { merge: true },
      );
    });
    await batch.commit();
  }

  return rows.length;
}

export async function sendTournamentAnnouncementV2(input: {
  tournamentId: string;
  title: string;
  message: string;
  route?: string | null;
}) {
  const tournamentId = clean(input.tournamentId);
  const title = clean(input.title);
  const message = clean(input.message);

  if (!tournamentId || !title || !message) {
    throw new Error("عنوان الإشعار ونصه مطلوبان");
  }

  const members = await getPlatformMembers();
  const broadcastId = Date.now().toString(36);
  const dedupeKey = `announcement:${tournamentId}:${broadcastId}`;

  const count = await writeNotifications(
    members.map((member) => ({
      id: notificationDocId([
        "tn",
        tournamentId,
        broadcastId,
        member.userId,
      ]),
      userId: member.userId,
      type: "tournament_announcement" as const,
      title,
      message,
      tournamentId,
      route: input.route ?? null,
      dedupeKey,
    })),
  );

  return { recipients: count, broadcastId };
}

async function getMatchPredictorIds(tournamentId: string, matchId: string) {
  const snapshot = await getDocs(
    query(
      collection(db, PREDICTIONS_COLLECTION),
      where("matchId", "==", matchId),
    ),
  );

  return new Set(
    snapshot.docs
      .filter((item) => clean(item.data().tournamentId) === tournamentId)
      .map((item) => clean(item.data().userId))
      .filter(Boolean),
  );
}

function modeCopy(mode: TournamentMatchNotificationMode) {
  if (mode === "prediction_open") {
    return {
      type: "prediction_open" as const,
      title: "التوقعات مفتوحة الآن",
      prefix: "تم فتح التوقع لمباراة",
    };
  }
  if (mode === "one_hour") {
    return {
      type: "prediction_reminder" as const,
      title: "باقي ساعة على إغلاق التوقع",
      prefix: "باقي تقريبًا ساعة على مباراة",
    };
  }
  if (mode === "thirty_minutes") {
    return {
      type: "prediction_reminder" as const,
      title: "باقي 30 دقيقة",
      prefix: "باقي تقريبًا 30 دقيقة على مباراة",
    };
  }
  return {
    type: "prediction_reminder" as const,
    title: "ما توقعت للحين",
    prefix: "توقعك ما زال ناقصًا لمباراة",
  };
}

export async function sendTournamentMatchReminderV2(input: {
  tournamentId: string;
  matchId: string;
  matchLabel: string;
  mode: TournamentMatchNotificationMode;
  route: string;
}) {
  const tournamentId = clean(input.tournamentId);
  const matchId = clean(input.matchId);
  const matchLabel = clean(input.matchLabel);
  const route = clean(input.route);

  if (!tournamentId || !matchId || !matchLabel || !route) {
    throw new Error("بيانات المباراة غير مكتملة");
  }

  const [members, predictorIds] = await Promise.all([
    getPlatformMembers(),
    getMatchPredictorIds(tournamentId, matchId),
  ]);

  const reminderOnly = input.mode !== "prediction_open";
  const recipients = reminderOnly
    ? members.filter((member) => !predictorIds.has(member.userId))
    : members;
  const copy = modeCopy(input.mode);
  const dedupeKey = `${input.mode}:${tournamentId}:${matchId}`;

  const count = await writeNotifications(
    recipients.map((member) => ({
      id: notificationDocId([
        "tn",
        tournamentId,
        matchId,
        input.mode,
        member.userId,
      ]),
      userId: member.userId,
      type: copy.type,
      title: copy.title,
      message: `${copy.prefix} ${matchLabel}. افتح البطولة وسجّل توقعك قبل الإغلاق.`,
      tournamentId,
      matchId,
      route,
      dedupeKey,
    })),
  );

  return {
    recipients: count,
    skippedBecausePredicted: members.length - recipients.length,
  };
}

export async function sendTournamentCalculationNotificationsV2(input: {
  tournamentId: string;
  matchId: string;
  matchLabel: string;
  resultLabel: string;
  resultHash: string;
  route: string;
  predictions: TournamentScoredPredictionNotification[];
  leaderboard: TournamentLeaderboardNotificationRow[];
  previousLeaderboard: TournamentLeaderboardNotificationRow[];
}) {
  const previousRankByUser = new Map(
    input.previousLeaderboard.map((item) => [item.userId, item.rank]),
  );
  const nextRankByUser = new Map(
    input.leaderboard.map((item) => [item.userId, item.rank]),
  );
  const rows: Array<{
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    tournamentId: string;
    matchId: string;
    route: string;
    dedupeKey: string;
  }> = [];

  input.predictions.forEach((prediction) => {
    const suffix = prediction.points > 0 ? ` +${prediction.points} نقطة` : "";
    const copy =
      prediction.resultType === "exact"
        ? {
            type: "exact_hit" as const,
            title: "جبتها بالملي 🎯",
            message: `نتيجة ${input.matchLabel} انتهت ${input.resultLabel}. توقّعك أصاب النتيجة كاملة.${suffix}`,
          }
        : prediction.resultType === "outcome"
          ? {
              type: "winner_hit" as const,
              title: "توقع صحيح ✅",
              message: `نتيجة ${input.matchLabel} انتهت ${input.resultLabel}. أصبت نتيجة الفائز/التأهل.${suffix}`,
            }
          : {
              type: "match_result" as const,
              title: "انتهت المباراة",
              message: `نتيجة ${input.matchLabel} انتهت ${input.resultLabel}. راجع توقعك وترتيبك الجديد.`,
            };

    const dedupeKey = `result:${input.tournamentId}:${input.matchId}:${input.resultHash}:${prediction.userId}`;
    rows.push({
      id: notificationDocId([
        "tn",
        input.tournamentId,
        input.matchId,
        input.resultHash,
        "result",
        prediction.userId,
      ]),
      userId: prediction.userId,
      type: copy.type,
      title: copy.title,
      message: copy.message,
      tournamentId: input.tournamentId,
      matchId: input.matchId,
      route: input.route,
      dedupeKey,
    });

    const previousRank = previousRankByUser.get(prediction.userId) ?? null;
    const nextRank = nextRankByUser.get(prediction.userId) ?? null;
    if (
      previousRank != null &&
      nextRank != null &&
      previousRank !== nextRank
    ) {
      const improved = nextRank < previousRank;
      const rankDedupeKey = `rank:${input.tournamentId}:${input.matchId}:${input.resultHash}:${prediction.userId}`;
      rows.push({
        id: notificationDocId([
          "tn",
          input.tournamentId,
          input.matchId,
          input.resultHash,
          "rank",
          prediction.userId,
        ]),
        userId: prediction.userId,
        type: "tournament_rank",
        title: improved ? "مركزك ارتفع 🚀" : "تغير مركزك",
        message: improved
          ? `تقدمت من المركز ${previousRank} إلى ${nextRank} في ترتيب البطولة.`
          : `أصبح مركزك ${nextRank} بعد أن كان ${previousRank}.`,
        tournamentId: input.tournamentId,
        matchId: input.matchId,
        route: input.route,
        dedupeKey: rankDedupeKey,
      });
    }
  });

  const count = await writeNotifications(rows);
  return { notifications: count };
}

export async function resetTournamentNotificationReadStateForAdmin(
  notificationId: string,
) {
  await setDoc(
    doc(db, NOTIFICATIONS_COLLECTION, notificationId),
    { isRead: false, readAt: null },
    { merge: true },
  );
}
