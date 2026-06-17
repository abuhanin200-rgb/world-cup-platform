import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { Match } from "./matches";

export type PredictionType = "normal" | "golden";

export type UpdateAdminMatchInput = {
  matchId: string;
  matchDate: string;
  matchTime: string;
  isActive: boolean;
  predictionType?: PredictionType;
};

function getMatchDayArabic(dateText: string) {
  const date = new Date(`${dateText}T12:00:00+03:00`);

  return new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    timeZone: "Asia/Riyadh",
  }).format(date);
}

function cleanText(value: string) {
  return value.trim();
}

function normalizePredictionType(value?: string): PredictionType {
  return value === "golden" ? "golden" : "normal";
}

async function hasPredictionsForMatch(matchId: string) {
  const predictionsRef = collection(db, "predictions");

  const predictionsQuery = query(
    predictionsRef,
    where("matchId", "==", matchId)
  );

  const predictionsSnapshot = await getDocs(predictionsQuery);

  return !predictionsSnapshot.empty;
}

export async function updateAdminMatch(input: UpdateAdminMatchInput) {
  const matchId = cleanText(input.matchId);
  const matchDate = cleanText(input.matchDate);
  const matchTime = cleanText(input.matchTime);

  if (!matchId) {
    throw new Error("معرّف المباراة غير موجود");
  }

  if (!matchDate || !matchTime) {
    throw new Error("تاريخ ووقت المباراة مطلوبان");
  }

  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);

  if (!matchSnap.exists()) {
    throw new Error("المباراة غير موجودة");
  }

  const currentMatchData = matchSnap.data();

  const currentPredictionType = normalizePredictionType(
    String(currentMatchData.predictionType || "normal")
  );

  const nextPredictionType = input.predictionType
    ? normalizePredictionType(input.predictionType)
    : undefined;

  const shouldChangePredictionType =
    Boolean(nextPredictionType) && nextPredictionType !== currentPredictionType;

  if (shouldChangePredictionType) {
    const isCalculated =
      Boolean(currentMatchData.resultCalculated) ||
      String(currentMatchData.status || "") === "finished";

    if (isCalculated) {
      throw new Error("لا يمكن تغيير نوع التوقع بعد احتساب المباراة.");
    }

    const hasPredictions = await hasPredictionsForMatch(matchId);

    if (hasPredictions) {
      throw new Error(
        "لا يمكن تغيير نوع التوقع بعد تسجيل توقعات من الأعضاء على هذه المباراة."
      );
    }
  }

  const startAt = `${matchDate}T${matchTime}:00+03:00`;
  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = {
    matchDate,
    matchTime,
    matchDay: getMatchDayArabic(matchDate),
    startAt,
    isActive: input.isActive,
    updatedAt: now,
  };

  if (nextPredictionType) {
    updateData.predictionType = nextPredictionType;
  }

  await updateDoc(matchRef, updateData);

  return true;
}

export async function deleteAdminMatch(match: Match) {
  if (!match.id) {
    throw new Error("معرّف المباراة غير موجود");
  }

  if (match.resultCalculated || match.status === "finished") {
    throw new Error("لا يمكن حذف مباراة محتسبة. استخدم تراجع عن الحسبة أولًا.");
  }

  const predictionsRef = collection(db, "predictions");
  const predictionsQuery = query(
    predictionsRef,
    where("matchId", "==", match.id)
  );

  const predictionsSnapshot = await getDocs(predictionsQuery);

  if (!predictionsSnapshot.empty) {
    throw new Error(
      "لا يمكن حذف المباراة لأن عليها توقعات من الأعضاء. الأفضل إخفاؤها بدل حذفها."
    );
  }

  await deleteDoc(doc(db, "matches", match.id));

  return true;
}