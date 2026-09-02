import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";

type QualificationMethod = "extraTime" | "penalties";

type LegacyPredictionInput = {
  userId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  qualifiedTeamCode?: unknown;
  qualificationMethod?: unknown;
  finalBonusPrediction?: unknown;
  adminOverride?: boolean;
};

export class LegacyPredictionSubmissionError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

const EDIT_WINDOW_MS = 5 * 60 * 1000;

function clean(value: unknown) {
  return String(value || "").trim();
}

function validScore(value: unknown) {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 30;
}

function qualificationMethod(value: unknown): QualificationMethod | null {
  return value === "extraTime" || value === "penalties" ? value : null;
}

function isAdminSnapshot(data: Record<string, unknown> | undefined) {
  return data?.role === "admin" && data.enabled === true;
}

function matchInfo(data: Record<string, unknown>) {
  const startAt = clean(data.startAt);
  const startTime = new Date(startAt).getTime();
  const matchStage = data.matchStage === "knockout" ? "knockout" : "group";
  const knockoutRound = ["general", "semiFinal", "thirdPlace", "final"].includes(clean(data.knockoutRound))
    ? clean(data.knockoutRound)
    : undefined;

  if (
    data.isActive !== true ||
    data.status !== "scheduled" ||
    !Number.isFinite(startTime) ||
    startTime <= Date.now()
  ) {
    throw new LegacyPredictionSubmissionError("انتهى وقت التوقع لهذه المباراة.");
  }

  return {
    startTime,
    matchStage,
    knockoutRound,
    predictionType: data.predictionType === "golden" ? "golden" : "normal",
    homeTeamCode: clean(data.homeTeamCode),
    awayTeamCode: clean(data.awayTeamCode),
    homeTeamName: clean(data.homeTeamName),
    homeTeamEmoji: clean(data.homeTeamEmoji),
    awayTeamName: clean(data.awayTeamName),
    awayTeamEmoji: clean(data.awayTeamEmoji),
  };
}

function validatedExtras(input: LegacyPredictionInput, match: ReturnType<typeof matchInfo>) {
  const isDrawKnockout = match.matchStage === "knockout" && input.homeScore === input.awayScore;
  if (!isDrawKnockout) {
    return { qualifiedTeamCode: null, qualificationMethod: null };
  }

  const qualifiedTeamCode = clean(input.qualifiedTeamCode);
  const method = qualificationMethod(input.qualificationMethod);
  if (
    (qualifiedTeamCode !== match.homeTeamCode && qualifiedTeamCode !== match.awayTeamCode) ||
    !method
  ) {
    throw new LegacyPredictionSubmissionError("أكمل اختيار المتأهل وطريقة التأهل.");
  }

  return { qualifiedTeamCode, qualificationMethod: method };
}

function validatedFinalBonus(input: LegacyPredictionInput, match: ReturnType<typeof matchInfo>) {
  if (match.matchStage !== "knockout" || match.knockoutRound !== "final") return null;
  const data = input.finalBonusPrediction;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new LegacyPredictionSubmissionError("أكمل اختيارات إضافات النهائي.");
  }
  const value = data as Record<string, unknown>;
  const firstScoringTeamCode = clean(value.firstScoringTeamCode);
  const firstSpainScorer = clean(value.firstSpainScorer);
  const firstArgentinaScorer = clean(value.firstArgentinaScorer);
  if (
    ![match.homeTeamCode, match.awayTeamCode, "none"].includes(firstScoringTeamCode) ||
    !firstSpainScorer ||
    !firstArgentinaScorer
  ) {
    throw new LegacyPredictionSubmissionError("اختيارات إضافات النهائي غير صحيحة.");
  }
  return { firstScoringTeamCode, firstSpainScorer, firstArgentinaScorer };
}

async function authorizeActor(actorUserId: string, requestedUserId: string, adminOverride: boolean) {
  if (actorUserId === requestedUserId && !adminOverride) return false;
  const admin = await adminDb.collection("admins").doc(actorUserId).get();
  if (!isAdminSnapshot(admin.data())) {
    throw new LegacyPredictionSubmissionError("غير مصرح بحفظ هذا التوقع.", 403);
  }
  return true;
}

export async function saveLegacyPredictionOnServer(
  actorUserId: string,
  rawInput: LegacyPredictionInput,
) {
  const userId = clean(rawInput.userId);
  const matchId = clean(rawInput.matchId);
  const adminOverride = await authorizeActor(actorUserId, userId, Boolean(rawInput.adminOverride));
  if (!userId || !matchId || !validScore(rawInput.homeScore) || !validScore(rawInput.awayScore)) {
    throw new LegacyPredictionSubmissionError("بيانات التوقع غير مكتملة أو غير صحيحة.");
  }

  const [userSnap, matchSnap] = await Promise.all([
    adminDb.collection("users").doc(userId).get(),
    adminDb.collection("matches").doc(matchId).get(),
  ]);
  if (!userSnap.exists || !matchSnap.exists) {
    throw new LegacyPredictionSubmissionError("المستخدم أو المباراة غير موجودين.", 404);
  }

  const match = matchInfo(matchSnap.data() || {});
  const input = { ...rawInput, userId, matchId };
  const extras = validatedExtras(input, match);
  const finalBonusPrediction = validatedFinalBonus(input, match);
  const predictionRef = adminDb.collection("predictions").doc(`${userId}_${matchId}`);
  const existing = await predictionRef.get();
  const now = new Date().toISOString();

  if (!existing.exists) {
    const prediction = {
      userId,
      userName: clean(userSnap.data()?.fullName) || "عضو",
      matchId,
      homeTeamName: match.homeTeamName,
      homeTeamEmoji: match.homeTeamEmoji,
      awayTeamName: match.awayTeamName,
      awayTeamEmoji: match.awayTeamEmoji,
      homeTeamCode: match.homeTeamCode,
      awayTeamCode: match.awayTeamCode,
      homeScore: input.homeScore,
      awayScore: input.awayScore,
      ...extras,
      points: 0,
      resultType: "",
      isCalculated: false,
      predictionType: match.predictionType,
      matchStage: match.matchStage,
      ...(match.knockoutRound ? { knockoutRound: match.knockoutRound } : {}),
      ...(match.knockoutRound === "final"
        ? { finalBonusPrediction, finalBonusResult: null, finalBonusPoints: 0 }
        : {}),
      actualHomeScore: null,
      actualAwayScore: null,
      actualQualifiedTeamCode: null,
      actualQualificationMethod: null,
      calculatedAt: null,
      createdAt: now,
      createdAtServer: FieldValue.serverTimestamp(),
      updatedAt: now,
      editedAt: null,
      editCount: 0,
    };
    await adminDb.runTransaction(async (transaction) => {
      const fresh = await transaction.get(predictionRef);
      if (fresh.exists && !adminOverride) {
        throw new LegacyPredictionSubmissionError("تم اعتماد توقعك مسبقًا لهذه المباراة.", 409);
      }
      transaction.set(predictionRef, prediction, { merge: adminOverride && fresh.exists });
      transaction.set(adminDb.collection("users").doc(userId), {
        lastPredictionAt: now,
        updatedAt: now,
      }, { merge: true });
    });
    return { prediction: { id: predictionRef.id, ...prediction, createdAtServer: now } };
  }

  const current = existing.data() || {};
  const createdAt = new Date(clean(current.createdAt)).getTime();
  if (!adminOverride && (
    current.userId !== userId ||
    current.isCalculated === true ||
    !Number.isFinite(createdAt) ||
    Date.now() >= Math.min(match.startTime, createdAt + EDIT_WINDOW_MS)
  )) {
    throw new LegacyPredictionSubmissionError("انتهت مدة تعديل التوقع.");
  }

  const update = {
    homeScore: input.homeScore,
    awayScore: input.awayScore,
    ...extras,
    ...(match.knockoutRound === "final" ? { finalBonusPrediction } : {}),
    updatedAt: now,
    editedAt: now,
    editCount: Number(current.editCount || 0) + 1,
  };
  await predictionRef.update(update);
  return { prediction: { id: predictionRef.id, ...current, ...update } };
}
