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

type MatchData = {
  id: string;
  isActive?: boolean;
  status?: string;
  resultCalculated?: boolean;
};

type PredictionData = {
  matchId?: string;
  isCalculated?: boolean;
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const [usersSnapshot, matchesSnapshot, predictionsSnapshot, logsSnapshot] =
    await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "matches")),
      getDocs(collection(db, "predictions")),
      getDocs(collection(db, "admin_logs")),
    ]);

  const matches: MatchData[] = matchesSnapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();

      return {
        id: docSnap.id,
        isActive: Boolean(data.isActive),
        status: String(data.status || ""),
        resultCalculated: Boolean(data.resultCalculated),
      };
    });

  const activeMatches = matches.filter((match) => match.isActive === true);
  const hiddenMatches = matches.filter((match) => match.isActive === false);

  const activeMatchIds = new Set(activeMatches.map((match) => match.id));

  const predictions: PredictionData[] = predictionsSnapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();

      return {
        matchId: String(data.matchId || ""),
        isCalculated: Boolean(data.isCalculated),
      };
    });

  /**
   * مهم:
   * هنا نستبعد توقعات المباريات المخفية من الإحصائيات العامة
   * عشان مباريات الاختبار ما تلخبط الأرقام.
   */
  const activePredictions = predictions.filter((prediction) => {
    return prediction.matchId && activeMatchIds.has(prediction.matchId);
  });

  const finishedMatchesCount = activeMatches.filter((match) => {
    return match.status === "finished" || match.resultCalculated === true;
  }).length;

  const scheduledMatchesCount = activeMatches.length - finishedMatchesCount;

  const calculatedPredictionsCount = activePredictions.filter((prediction) => {
    return prediction.isCalculated === true;
  }).length;

  const pendingPredictionsCount =
    activePredictions.length - calculatedPredictionsCount;

  return {
    membersCount: usersSnapshot.docs.filter((docSnap) => docSnap.id !== "_init")
      .length,

    /**
     * عدد المباريات هنا صار للمباريات المفعلة فقط.
     * المخفية لها عداد مستقل تحت.
     */
    matchesCount: activeMatches.length,
    activeMatchesCount: activeMatches.length,
    hiddenMatchesCount: hiddenMatches.length,
    scheduledMatchesCount,
    finishedMatchesCount,

    /**
     * التوقعات هنا صارت فقط لتوقعات المباريات المفعلة.
     */
    predictionsCount: activePredictions.length,
    calculatedPredictionsCount,
    pendingPredictionsCount,

    logsCount: logsSnapshot.docs.filter((docSnap) => docSnap.id !== "_init")
      .length,

    updatedAt: new Date().toISOString(),
  };
}