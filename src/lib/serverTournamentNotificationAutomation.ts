import { adminDb } from "@/lib/firebaseAdmin";
import { GULF_CUP_27_TOURNAMENT_ID, getGulfCup27Team } from "@/domain/tournaments";

const AUTOMATION_STATE_COLLECTION = "systemAutomationState";
const DISPATCH_COLLECTION = "tournamentNotificationDispatches";
const MATCHES_COLLECTION = "tournamentMatches";
const PREDICTIONS_COLLECTION = "tournamentPredictions";
const USERS_COLLECTION = "users";
const NOTIFICATIONS_COLLECTION = "notifications";
const AUTOMATION_STATE_ID = "tournament-notifications-v2";
const MIN_RUN_GAP_MS = 90_000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;
const BATCH_SIZE = 350;

type ReminderMode = "one_hour" | "thirty_minutes" | "missing_prediction";

type MatchRow = {
  id: string;
  tournamentId: string;
  round: string;
  homeTeamId: string;
  awayTeamId: string;
  homeSourceLabel: string;
  awaySourceLabel: string;
  kickoffAt: number;
  predictionClosesAt: number | null;
  predictionIsOpen: boolean;
  calculationStatus: string;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function numberValue(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 500);
}

function matchLabel(match: MatchRow) {
  const home = getGulfCup27Team(match.homeTeamId)?.nameAr || match.homeSourceLabel || "لم يتحدد";
  const away = getGulfCup27Team(match.awayTeamId)?.nameAr || match.awaySourceLabel || "لم يتحدد";
  return `${home} × ${away}`;
}

function reminderCopy(mode: ReminderMode, label: string) {
  if (mode === "one_hour") {
    return {
      title: "باقي ساعة على إغلاق التوقع ⏰",
      message: `باقي تقريبًا ساعة على مباراة ${label}. سجّل توقعك قبل الإغلاق.`,
    };
  }
  if (mode === "thirty_minutes") {
    return {
      title: "باقي 30 دقيقة ⏳",
      message: `باقي تقريبًا 30 دقيقة على مباراة ${label}. توقعك ما زال ناقصًا.`,
    };
  }
  return {
    title: "آخر فرصة للتوقع 🔔",
    message: `اقترب إغلاق التوقع لمباراة ${label}. ادخل الآن وسجّل توقعك.`,
  };
}

async function acquireRunSlot(force: boolean) {
  const ref = adminDb.collection(AUTOMATION_STATE_COLLECTION).doc(AUTOMATION_STATE_ID);
  const now = Date.now();

  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const lastRunAt = numberValue(snapshot.data()?.lastRunAt);

    if (!force && lastRunAt > 0 && now - lastRunAt < MIN_RUN_GAP_MS) {
      return false;
    }

    transaction.set(
      ref,
      {
        lastRunAt: now,
        updatedAt: new Date(now).toISOString(),
        source: force ? "admin" : "heartbeat",
      },
      { merge: true },
    );
    return true;
  });
}

async function loadGulfMatches(): Promise<Array<MatchRow & { refPath: string }>> {
  const snapshot = await adminDb
    .collection(MATCHES_COLLECTION)
    .where("tournamentId", "==", GULF_CUP_27_TOURNAMENT_ID)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: clean(data.id) || doc.id.replace(`${GULF_CUP_27_TOURNAMENT_ID}_`, ""),
      tournamentId: clean(data.tournamentId),
      round: clean(data.round),
      homeTeamId: clean(data.homeTeamId),
      awayTeamId: clean(data.awayTeamId),
      homeSourceLabel: clean(data.homeSourceLabel),
      awaySourceLabel: clean(data.awaySourceLabel),
      kickoffAt: numberValue(data.kickoffAt),
      predictionClosesAt:
        data.predictionClosesAt == null ? null : numberValue(data.predictionClosesAt),
      predictionIsOpen: data.predictionIsOpen === true,
      calculationStatus: clean(data.calculationStatus),
      refPath: doc.ref.path,
    };
  });
}

async function getRecipientIds(matchId: string) {
  const [usersSnapshot, predictionsSnapshot] = await Promise.all([
    adminDb.collection(USERS_COLLECTION).get(),
    adminDb.collection(PREDICTIONS_COLLECTION).where("matchId", "==", matchId).get(),
  ]);

  const predicted = new Set(
    predictionsSnapshot.docs
      .filter((doc) => clean(doc.data().tournamentId) === GULF_CUP_27_TOURNAMENT_ID)
      .map((doc) => clean(doc.data().userId))
      .filter(Boolean),
  );

  return usersSnapshot.docs
    .map((doc) => clean(doc.data().id) || doc.id)
    .filter((userId) => Boolean(userId) && !predicted.has(userId));
}

async function dispatchReminder(match: MatchRow, mode: ReminderMode) {
  const dispatchId = safeId(`${match.tournamentId}__${match.id}__${mode}`);
  const dispatchRef = adminDb.collection(DISPATCH_COLLECTION).doc(dispatchId);
  const existing = await dispatchRef.get();

  if (existing.exists) {
    return { sent: 0, skipped: true };
  }

  const recipients = await getRecipientIds(match.id);
  const copy = reminderCopy(mode, matchLabel(match));
  const nowIso = new Date().toISOString();

  for (let index = 0; index < recipients.length; index += BATCH_SIZE) {
    const batch = adminDb.batch();
    recipients.slice(index, index + BATCH_SIZE).forEach((userId) => {
      const notificationId = safeId(
        `auto__${match.tournamentId}__${match.id}__${mode}__${userId}`,
      );
      batch.set(adminDb.collection(NOTIFICATIONS_COLLECTION).doc(notificationId), {
        userId,
        type: "prediction_reminder",
        title: copy.title,
        message: copy.message,
        isRead: false,
        createdAt: nowIso,
        readAt: null,
        tournamentId: match.tournamentId,
        matchId: match.id,
        route: "/tournaments/gulf-cup-27/predictions",
        dedupeKey: `auto:${match.tournamentId}:${match.id}:${mode}`,
        automated: true,
      });
    });
    await batch.commit();
  }

  await dispatchRef.set({
    tournamentId: match.tournamentId,
    matchId: match.id,
    mode,
    recipients: recipients.length,
    sentAt: Date.now(),
    createdAt: nowIso,
  });

  return { sent: recipients.length, skipped: false };
}

function chooseReminderMode(remainingMs: number): ReminderMode | null {
  if (remainingMs <= 0) return null;
  if (remainingMs <= TEN_MINUTES_MS) return "missing_prediction";
  if (remainingMs <= THIRTY_MINUTES_MS) return "thirty_minutes";
  if (remainingMs <= ONE_HOUR_MS) return "one_hour";
  return null;
}

export async function runTournamentNotificationAutomationV2(options?: {
  force?: boolean;
}) {
  const force = options?.force === true;
  const acquired = await acquireRunSlot(force);

  if (!acquired) {
    return {
      skipped: true,
      reason: "throttled",
      checkedMatches: 0,
      closedMatches: 0,
      remindersDispatched: 0,
      notificationsCreated: 0,
    };
  }

  const now = Date.now();
  const matches = await loadGulfMatches();
  let closedMatches = 0;
  let remindersDispatched = 0;
  let notificationsCreated = 0;

  for (const match of matches) {
    if (!match.predictionIsOpen || match.calculationStatus === "calculated") continue;
    if (!match.homeTeamId || !match.awayTeamId) continue;

    const closesAt = match.predictionClosesAt || match.kickoffAt;
    if (!closesAt) continue;

    if (now >= closesAt || now >= match.kickoffAt) {
      const ref = adminDb.doc(match.refPath);
      await ref.set(
        {
          predictionIsOpen: false,
          status: now >= match.kickoffAt ? "live" : "scheduled",
          automationClosedAt: now,
          updatedAt: now,
        },
        { merge: true },
      );
      closedMatches += 1;
      continue;
    }

    const mode = chooseReminderMode(closesAt - now);
    if (!mode) continue;

    const dispatched = await dispatchReminder(match, mode);
    if (!dispatched.skipped) remindersDispatched += 1;
    notificationsCreated += dispatched.sent;
  }

  return {
    skipped: false,
    checkedMatches: matches.length,
    closedMatches,
    remindersDispatched,
    notificationsCreated,
    ranAt: now,
  };
}
