import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { PredictionType } from "./matches";

type ResultType = "exact" | "winner" | "wrong" | "";

type PredictionDoc = {
  id: string;
  userId: string;
  userName: string;
  matchId: string;

  homeScore: number;
  awayScore: number;

  points?: number;
  isCalculated?: boolean;
  createdAt?: string;

  actualHomeScore?: number | null;
  actualAwayScore?: number | null;

  resultType?: ResultType;
};

type MatchDoc = {
  id: string;
  predictionType: PredictionType;
  resultCalculated?: boolean;
  status?: string;
};

type UserStats = {
  points: number;
  total: number;
  correct: number;
  wrong: number;
  currentStreak: number;
  bestStreak: number;
};

type UserDoc = {
  id: string;
  fullName: string;
  currentRank?: number;
  previousRank?: number;
};

export type CalculateMatchInput = {
  matchId: string;
  actualHomeScore: number;
  actualAwayScore: number;
};

function validateScore(score: number) {
  return Number.isInteger(score) && score >= 0 && score <= 30;
}

function normalizePredictionType(value: unknown): PredictionType {
  return value === "golden" ? "golden" : "normal";
}

async function getMatchById(matchId: string): Promise<MatchDoc> {
  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);

  if (!matchSnap.exists()) {
    throw new Error("المباراة غير موجودة");
  }

  const data = matchSnap.data();

  return {
    id: matchSnap.id,
    predictionType: normalizePredictionType(data.predictionType),
    resultCalculated: Boolean(data.resultCalculated),
    status: String(data.status || "scheduled"),
  };
}

function getOutcome(homeScore: number, awayScore: number) {
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
}

function calculatePredictionPoints(
  predictedHomeScore: number,
  predictedAwayScore: number,
  actualHomeScore: number,
  actualAwayScore: number,
  predictionType: PredictionType
) {
  const exactPoints = predictionType === "golden" ? 6 : 3;
  const winnerPoints = predictionType === "golden" ? 2 : 1;

  const exact =
    predictedHomeScore === actualHomeScore &&
    predictedAwayScore === actualAwayScore;

  if (exact) {
    return {
      points: exactPoints,
      resultType: "exact" as const,
    };
  }

  const predictedOutcome = getOutcome(predictedHomeScore, predictedAwayScore);
  const actualOutcome = getOutcome(actualHomeScore, actualAwayScore);

  if (predictedOutcome === actualOutcome) {
    return {
      points: winnerPoints,
      resultType: "winner" as const,
    };
  }

  return {
    points: 0,
    resultType: "wrong" as const,
  };
}

async function getAllUsers(): Promise<UserDoc[]> {
  const snapshot = await getDocs(collection(db, "users"));

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();

    return {
      id: docSnap.id,
      fullName: data.fullName || "عضو بدون اسم",
      currentRank:
        typeof data.currentRank === "number" ? data.currentRank : undefined,
      previousRank:
        typeof data.previousRank === "number" ? data.previousRank : undefined,
    };
  });
}

async function getAllCalculatedPredictions(): Promise<PredictionDoc[]> {
  const predictionsRef = collection(db, "predictions");
  const q = query(predictionsRef, where("isCalculated", "==", true));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<PredictionDoc, "id">),
    }));
}

async function getMatchPredictions(matchId: string): Promise<PredictionDoc[]> {
  const predictionsRef = collection(db, "predictions");
  const q = query(predictionsRef, where("matchId", "==", matchId));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<PredictionDoc, "id">),
    }));
}

function buildUserStats(predictions: PredictionDoc[]) {
  const statsByUser: Record<string, UserStats> = {};
  const predictionsByUser: Record<string, PredictionDoc[]> = {};

  for (const prediction of predictions) {
    if (!prediction.userId) continue;

    if (!predictionsByUser[prediction.userId]) {
      predictionsByUser[prediction.userId] = [];
    }

    predictionsByUser[prediction.userId].push(prediction);
  }

  Object.entries(predictionsByUser).forEach(([userId, userPredictions]) => {
    const sortedPredictions = [...userPredictions].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime;
    });

    let points = 0;
    let total = 0;
    let correct = 0;
    let wrong = 0;
    let currentStreak = 0;
    let bestStreak = 0;

    for (const prediction of sortedPredictions) {
      const predictionPoints = Number(prediction.points || 0);

      total += 1;
      points += predictionPoints;

      if (predictionPoints > 0) {
        correct += 1;
        currentStreak += 1;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        wrong += 1;
        currentStreak = 0;
      }
    }

    statsByUser[userId] = {
      points,
      total,
      correct,
      wrong,
      currentStreak,
      bestStreak,
    };
  });

  return statsByUser;
}

function mergeCalculatedPredictions(
  allCalculatedPredictions: PredictionDoc[],
  updatedMatchPredictions: PredictionDoc[],
  matchId: string
) {
  const otherPredictions = allCalculatedPredictions.filter(
    (prediction) => prediction.matchId !== matchId
  );

  return [...otherPredictions, ...updatedMatchPredictions];
}

function getRankMovement(oldRank: number, newRank: number) {
  let rankDirection: "up" | "down" | "-" = "-";
  let rankChange = 0;

  if (oldRank > newRank) {
    rankDirection = "up";
    rankChange = oldRank - newRank;
  } else if (oldRank < newRank) {
    rankDirection = "down";
    rankChange = newRank - oldRank;
  }

  return {
    rankDirection,
    rankChange,
  };
}

function buildRankedUsers(
  allUsers: UserDoc[],
  statsByUser: Record<string, UserStats>
) {
  return allUsers
    .map((user) => {
      const stats = statsByUser[user.id] || {
        points: 0,
        total: 0,
        correct: 0,
        wrong: 0,
        currentStreak: 0,
        bestStreak: 0,
      };

      return {
        ...user,
        ...stats,
      };
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.correct !== a.correct) return b.correct - a.correct;
      if (a.total !== b.total) return a.total - b.total;
      return a.fullName.localeCompare(b.fullName, "ar");
    });
}

export async function calculateMatchResult(input: CalculateMatchInput) {
  if (!input.matchId) {
    throw new Error("اختر المباراة أولًا");
  }

  if (
    !validateScore(input.actualHomeScore) ||
    !validateScore(input.actualAwayScore)
  ) {
    throw new Error("أدخل نتيجة صحيحة من 0 إلى 30");
  }

  const match = await getMatchById(input.matchId);

  const matchPredictions = await getMatchPredictions(input.matchId);

  if (matchPredictions.length === 0) {
    throw new Error("لا توجد توقعات لهذه المباراة");
  }

  const alreadyCalculated =
    match.resultCalculated ||
    matchPredictions.some((prediction) => prediction.isCalculated);

  if (alreadyCalculated) {
    throw new Error("تم احتساب هذه المباراة مسبقًا ولا يمكن احتسابها مرة أخرى");
  }

  const calculatedMatchPredictions = matchPredictions.map((prediction) => {
    const result = calculatePredictionPoints(
      Number(prediction.homeScore),
      Number(prediction.awayScore),
      input.actualHomeScore,
      input.actualAwayScore,
      match.predictionType
    );

    return {
      ...prediction,
      points: result.points,
      resultType: result.resultType,
      isCalculated: true,
    };
  });

  const allUsers = await getAllUsers();
  const allCalculatedPredictions = await getAllCalculatedPredictions();

  const mergedPredictions = mergeCalculatedPredictions(
    allCalculatedPredictions,
    calculatedMatchPredictions,
    input.matchId
  );

  const statsByUser = buildUserStats(mergedPredictions);
  const rankedUsers = buildRankedUsers(allUsers, statsByUser);

  const batch = writeBatch(db);
  const now = new Date().toISOString();

  for (const prediction of calculatedMatchPredictions) {
    const predictionRef = doc(db, "predictions", prediction.id);

    batch.update(predictionRef, {
      points: prediction.points,
      resultType: prediction.resultType,
      isCalculated: true,
      actualHomeScore: input.actualHomeScore,
      actualAwayScore: input.actualAwayScore,
      predictionType: match.predictionType,
      calculatedAt: now,
      updatedAt: now,
    });
  }

  for (const user of rankedUsers) {
    const userRef = doc(db, "users", user.id);
    const newRank = rankedUsers.findIndex((item) => item.id === user.id) + 1;
    const oldRank =
      typeof user.currentRank === "number" && user.currentRank > 0
        ? user.currentRank
        : newRank;

    const movement = getRankMovement(oldRank, newRank);

    batch.update(userRef, {
      points: user.points,
      total: user.total,
      correct: user.correct,
      wrong: user.wrong,

      currentStreak: user.currentStreak,
      bestStreak: user.bestStreak,

      previousRank: oldRank,
      currentRank: newRank,
      rankDirection: movement.rankDirection,
      rankChange: movement.rankChange,

      lastUpdated: now,
    });
  }

  const matchRef = doc(db, "matches", input.matchId);

  batch.update(matchRef, {
    status: "finished",
    actualHomeScore: input.actualHomeScore,
    actualAwayScore: input.actualAwayScore,
    resultCalculated: true,
    calculatedAt: now,
    updatedAt: now,
  });

  await batch.commit();

  const exactCount = calculatedMatchPredictions.filter(
    (prediction) => prediction.resultType === "exact"
  ).length;

  const winnerCount = calculatedMatchPredictions.filter(
    (prediction) => prediction.resultType === "winner"
  ).length;

  const wrongCount = calculatedMatchPredictions.filter(
    (prediction) => prediction.resultType === "wrong"
  ).length;

  return {
    totalPredictions: calculatedMatchPredictions.length,
    exactCount,
    winnerCount,
    wrongCount,
    predictionType: match.predictionType,
  };
}

export async function undoMatchCalculation(matchId: string) {
  if (!matchId) {
    throw new Error("اختر المباراة أولًا");
  }

  const matchPredictions = await getMatchPredictions(matchId);

  if (matchPredictions.length === 0) {
    throw new Error("لا توجد توقعات لهذه المباراة");
  }

  const calculatedPredictions = matchPredictions.filter(
    (prediction) => prediction.isCalculated
  );

  if (calculatedPredictions.length === 0) {
    throw new Error("هذه المباراة غير محتسبة حاليًا");
  }

  const allUsers = await getAllUsers();
  const allCalculatedPredictions = await getAllCalculatedPredictions();

  const remainingCalculatedPredictions = allCalculatedPredictions.filter(
    (prediction) => prediction.matchId !== matchId
  );

  const statsByUser = buildUserStats(remainingCalculatedPredictions);
  const rankedUsers = buildRankedUsers(allUsers, statsByUser);

  const batch = writeBatch(db);
  const now = new Date().toISOString();

  for (const prediction of calculatedPredictions) {
    const predictionRef = doc(db, "predictions", prediction.id);

    batch.update(predictionRef, {
      points: 0,
      resultType: "",
      isCalculated: false,
      actualHomeScore: null,
      actualAwayScore: null,
      calculatedAt: null,
      updatedAt: now,
    });
  }

  for (const user of rankedUsers) {
    const userRef = doc(db, "users", user.id);
    const newRank = rankedUsers.findIndex((item) => item.id === user.id) + 1;
    const oldRank =
      typeof user.currentRank === "number" && user.currentRank > 0
        ? user.currentRank
        : newRank;

    const movement = getRankMovement(oldRank, newRank);

    batch.update(userRef, {
      points: user.points,
      total: user.total,
      correct: user.correct,
      wrong: user.wrong,

      currentStreak: user.currentStreak,
      bestStreak: user.bestStreak,

      previousRank: oldRank,
      currentRank: newRank,
      rankDirection: movement.rankDirection,
      rankChange: movement.rankChange,

      lastUpdated: now,
    });
  }

  const matchRef = doc(db, "matches", matchId);

  batch.update(matchRef, {
    status: "scheduled",
    actualHomeScore: null,
    actualAwayScore: null,
    resultCalculated: false,
    calculatedAt: null,
    updatedAt: now,
  });

  await batch.commit();

  return {
    undonePredictions: calculatedPredictions.length,
  };
}