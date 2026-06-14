import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export type AdminOverview = {
  membersCount: number;

  matchesCount: number;
  activeMatchesCount: number;
  hiddenMatchesCount: number;
  scheduledMatchesCount: number;
  finishedMatchesCount: number;

  predictionsCount: number;
  calculatedPredictionsCount: number;
  pendingPredictionsCount: number;

  logsCount: number;

  updatedAt: string;
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const [usersSnapshot, matchesSnapshot, predictionsSnapshot, logsSnapshot] =
    await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "matches")),
      getDocs(collection(db, "predictions")),
      getDocs(collection(db, "admin_logs")),
    ]);

  const matches = matchesSnapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => docSnap.data());

  const predictions = predictionsSnapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => docSnap.data());

  const activeMatchesCount = matches.filter(
    (match) => match.isActive === true
  ).length;

  const hiddenMatchesCount = matches.filter(
    (match) => match.isActive === false
  ).length;

  const finishedMatchesCount = matches.filter(
    (match) => match.status === "finished" || match.resultCalculated === true
  ).length;

  const scheduledMatchesCount = matches.length - finishedMatchesCount;

  const calculatedPredictionsCount = predictions.filter(
    (prediction) => prediction.isCalculated === true
  ).length;

  const pendingPredictionsCount =
    predictions.length - calculatedPredictionsCount;

  return {
    membersCount: usersSnapshot.docs.filter((docSnap) => docSnap.id !== "_init")
      .length,

    matchesCount: matches.length,
    activeMatchesCount,
    hiddenMatchesCount,
    scheduledMatchesCount,
    finishedMatchesCount,

    predictionsCount: predictions.length,
    calculatedPredictionsCount,
    pendingPredictionsCount,

    logsCount: logsSnapshot.docs.filter((docSnap) => docSnap.id !== "_init")
      .length,

    updatedAt: new Date().toISOString(),
  };
}