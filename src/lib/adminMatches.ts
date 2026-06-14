import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { Match } from "./matches";

export type UpdateAdminMatchInput = {
  matchId: string;
  matchDate: string;
  matchTime: string;
  isActive: boolean;
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

  const startAt = `${matchDate}T${matchTime}:00+03:00`;
  const now = new Date().toISOString();

  await updateDoc(doc(db, "matches", matchId), {
    matchDate,
    matchTime,
    matchDay: getMatchDayArabic(matchDate),
    startAt,
    isActive: input.isActive,
    updatedAt: now,
  });

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