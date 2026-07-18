import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import type {
  KnockoutRound,
  PredictionType,
  QualificationMethod,
} from "./matches";

export type HomeHighlightUser = {
  id: string;
  fullName: string;
  favoriteTeam: string;
  teamEmoji: string;
  teamCode: string;

  points: number;
  total: number;
  correct: number;
  wrong: number;

  currentRank: number;
  previousRank: number;
  rankChange: number;
  rankDirection: "up" | "down" | "-";

  currentStreak: number;
  bestStreak: number;
  exactHits: number;

  lastPredictionAt?: string;
};

export type ExactHit = {
  id: string;
  userId: string;
  userName: string;

  matchId: string;

  homeTeamName: string;
  awayTeamName: string;
  homeTeamEmoji: string;
  awayTeamEmoji: string;
  homeTeamCode: string;
  awayTeamCode: string;

  homeScore: number;
  awayScore: number;

  qualifiedTeamCode?: string | null;
  qualificationMethod?: QualificationMethod | null;

  points: number;
  predictionType: PredictionType;
  knockoutRound?: KnockoutRound;

  createdAt: string;
  calculatedAt: string;
};

type HighlightPrediction = ExactHit & {
  actualHomeScore: number | null;
  actualAwayScore: number | null;

  resultType: string;
  isCalculated: boolean;

  createdTimeValue: number;
  calculatedTimeValue: number;
};

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toText(value: unknown) {
  return String(value || "").trim();
}

function toNullableText(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return toText(value);
}

const TEAM_NAME_TO_CODE: Record<string, string> = {
  "الأرجنتين": "ARG",
  "الارجنتين": "ARG",
  "أستراليا": "AUS",
  "استراليا": "AUS",
  "النمسا": "AUT",
  "بلجيكا": "BEL",
  "البوسنة والهرسك": "BIH",
  "البرازيل": "BRA",
  "كندا": "CAN",
  "ساحل العاج": "CIV",
  "الكونغو الديمقراطية": "COD",
  "كولومبيا": "COL",
  "الرأس الأخضر": "CPV",
  "الراس الاخضر": "CPV",
  "كرواتيا": "CRO",
  "التشيك": "CZE",
  "الدنمارك": "DEN",
  "الإكوادور": "ECU",
  "الاكوادور": "ECU",
  "مصر": "EGY",
  "إنجلترا": "ENG",
  "انجلترا": "ENG",
  "إسبانيا": "ESP",
  "اسبانيا": "ESP",
  "فرنسا": "FRA",
  "ألمانيا": "GER",
  "المانيا": "GER",
  "غانا": "GHA",
  "هايتي": "HAI",
  "إيران": "IRN",
  "ايران": "IRN",
  "العراق": "IRQ",
  "الأردن": "JOR",
  "الاردن": "JOR",
  "اليابان": "JPN",
  "كوريا الجنوبية": "KOR",
  "المغرب": "MAR",
  "المكسيك": "MEX",
  "هولندا": "NED",
  "النرويج": "NOR",
  "نيوزيلندا": "NZL",
  "بنما": "PAN",
  "باراغواي": "PAR",
  "الباراغواي": "PAR",
  "البرتغال": "POR",
  "قطر": "QAT",
  "جنوب أفريقيا": "RSA",
  "جنوب افريقيا": "RSA",
  "السعودية": "KSA",
  "المملكة العربية السعودية": "KSA",
  "السنغال": "SEN",
  "سويسرا": "SUI",
  "السويد": "SWE",
  "تونس": "TUN",
  "تركيا": "TUR",
  "الأوروغواي": "URU",
  "الاوروغواي": "URU",
  "أوروغواي": "URU",
  "اوروغواي": "URU",
  "الولايات المتحدة": "USA",
  "أمريكا": "USA",
  "امريكا": "USA",
  "أوزبكستان": "UZB",
  "اوزبكستان": "UZB",
  "الجزائر": "DZA",
};

function normalizeTeamName(value: string) {
  return value
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function getTeamCodeFromUserData(data: Record<string, unknown>) {
  const directCode =
    toText(data.teamCode) ||
    toText(data.favoriteTeamCode) ||
    toText(data.selectedTeamCode) ||
    toText(data.championTeamCode);

  if (directCode) {
    return directCode.toUpperCase();
  }

  const favoriteTeam = toText(data.favoriteTeam);

  if (!favoriteTeam) return "";

  const exactCode = TEAM_NAME_TO_CODE[favoriteTeam];

  if (exactCode) return exactCode;

  const normalizedFavoriteTeam = normalizeTeamName(favoriteTeam);

  const matchedEntry = Object.entries(TEAM_NAME_TO_CODE).find(([teamName]) => {
    return normalizeTeamName(teamName) === normalizedFavoriteTeam;
  });

  return matchedEntry?.[1] || "";
}

function normalizePredictionType(value: unknown): PredictionType {
  return value === "golden" ? "golden" : "normal";
}


function normalizeKnockoutRound(value: unknown): KnockoutRound {
  if (
    value === "semiFinal" ||
    value === "thirdPlace" ||
    value === "final"
  ) {
    return value;
  }

  return "general";
}

type MatchesHighlightMeta = {
  knockoutRoundsByMatchId: Map<string, KnockoutRound>;
  isFinalCalculated: boolean;
};

async function getMatchesHighlightMeta(): Promise<MatchesHighlightMeta> {
  const snapshot = await getDocs(collection(db, "matches"));
  const knockoutRoundsByMatchId = new Map<string, KnockoutRound>();
  let isFinalCalculated = false;

  snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .forEach((docSnap) => {
      const data = docSnap.data();

      if (data.matchStage !== "knockout") return;

      const knockoutRound = normalizeKnockoutRound(data.knockoutRound);

      knockoutRoundsByMatchId.set(docSnap.id, knockoutRound);

      if (
        knockoutRound === "final" &&
        Boolean(data.resultCalculated)
      ) {
        isFinalCalculated = true;
      }
    });

  return {
    knockoutRoundsByMatchId,
    isFinalCalculated,
  };
}

function normalizeQualificationMethod(
  value: unknown
): QualificationMethod | null {
  if (value === "extraTime" || value === "penalties") {
    return value;
  }

  return null;
}

function toTimeValue(value: unknown) {
  const text = toText(value);

  if (!text) return 0;

  const time = new Date(text).getTime();

  if (!Number.isFinite(time)) return 0;

  return time;
}

function toLeaderboardTimeValue(value: unknown) {
  const text = toText(value);

  if (!text) return Number.MAX_SAFE_INTEGER;

  const time = new Date(text).getTime();

  if (!Number.isFinite(time)) return Number.MAX_SAFE_INTEGER;

  return time;
}

function getSaudiDateKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getTodaySaudiDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function getUsersForHighlights(): Promise<HomeHighlightUser[]> {
  const snapshot = await getDocs(collection(db, "users"));

  const users = snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();

      return {
        id: docSnap.id,
        fullName: toText(data.fullName) || "عضو بدون اسم",
        favoriteTeam: toText(data.favoriteTeam),
        teamEmoji: toText(data.teamEmoji),
        teamCode: getTeamCodeFromUserData(data),

        points: toNumber(data.points),
        total: toNumber(data.total),
        correct: toNumber(data.correct),
        wrong: toNumber(data.wrong),

        currentRank: toNumber(data.currentRank),
        previousRank: toNumber(data.previousRank),
        rankChange: toNumber(data.rankChange),
        rankDirection:
          data.rankDirection === "up" ||
          data.rankDirection === "down" ||
          data.rankDirection === "-"
            ? data.rankDirection
            : "-",

        currentStreak: toNumber(data.currentStreak),
        bestStreak: toNumber(data.bestStreak),
        exactHits: 0,

        lastPredictionAt: toText(data.lastPredictionAt),
      } as HomeHighlightUser;
    });

  return users
    .sort((a, b) => {
      const aHasPredictions = a.total > 0;
      const bHasPredictions = b.total > 0;

      if (aHasPredictions !== bHasPredictions) {
        return aHasPredictions ? -1 : 1;
      }

      if (b.points !== a.points) return b.points - a.points;
      if (b.correct !== a.correct) return b.correct - a.correct;
      if (b.total !== a.total) return b.total - a.total;
      if (a.wrong !== b.wrong) return a.wrong - b.wrong;

      const aPredictionTime = toLeaderboardTimeValue(a.lastPredictionAt);
      const bPredictionTime = toLeaderboardTimeValue(b.lastPredictionAt);

      if (aPredictionTime !== bPredictionTime) {
        return aPredictionTime - bPredictionTime;
      }

      return a.fullName.localeCompare(b.fullName, "ar");
    })
    .map((user, index) => {
      return {
        ...user,
        currentRank: index + 1,
      };
    });
}

async function getPredictionsForHighlights(): Promise<HighlightPrediction[]> {
  const snapshot = await getDocs(collection(db, "predictions"));

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => {
      const data = docSnap.data();

      const createdAt = toText(data.createdAt);
      const calculatedAt = toText(data.calculatedAt);

      return {
        id: docSnap.id,
        userId: toText(data.userId),
        userName: toText(data.userName) || "عضو بدون اسم",

        matchId: toText(data.matchId),

        homeTeamName: toText(data.homeTeamName),
        awayTeamName: toText(data.awayTeamName),
        homeTeamEmoji: toText(data.homeTeamEmoji),
        awayTeamEmoji: toText(data.awayTeamEmoji),
        homeTeamCode: toText(data.homeTeamCode),
        awayTeamCode: toText(data.awayTeamCode),

        homeScore: toNumber(data.homeScore),
        awayScore: toNumber(data.awayScore),

        qualifiedTeamCode: toNullableText(data.qualifiedTeamCode),
        qualificationMethod: normalizeQualificationMethod(
          data.qualificationMethod
        ),

        actualHomeScore:
          data.actualHomeScore === undefined || data.actualHomeScore === null
            ? null
            : toNumber(data.actualHomeScore),

        actualAwayScore:
          data.actualAwayScore === undefined || data.actualAwayScore === null
            ? null
            : toNumber(data.actualAwayScore),

        points: toNumber(data.points),
        resultType: toText(data.resultType),
        isCalculated: Boolean(data.isCalculated),
        predictionType: normalizePredictionType(data.predictionType),

        createdAt,
        createdTimeValue: toTimeValue(createdAt),

        calculatedAt,
        calculatedTimeValue: toTimeValue(calculatedAt),
      };
    });
}

function pickPredictionKing(users: HomeHighlightUser[]) {
  return (
    users.find((user) => {
      return user.total > 0 && user.points > 0;
    }) || null
  );
}

function pickBestStreakUser(
  users: HomeHighlightUser[],
  excludedUserIds: Set<string>
) {
  const usersWithStreak = users
    .filter((user) => user.bestStreak > 0)
    .sort((a, b) => {
      if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
      if (b.points !== a.points) return b.points - a.points;
      if (b.correct !== a.correct) return b.correct - a.correct;
      if (b.total !== a.total) return b.total - a.total;
      if (a.wrong !== b.wrong) return a.wrong - b.wrong;

      const aPredictionTime = toLeaderboardTimeValue(a.lastPredictionAt);
      const bPredictionTime = toLeaderboardTimeValue(b.lastPredictionAt);

      if (aPredictionTime !== bPredictionTime) {
        return aPredictionTime - bPredictionTime;
      }

      return a.fullName.localeCompare(b.fullName, "ar");
    });

  const differentUser = usersWithStreak.find(
    (user) => !excludedUserIds.has(user.id)
  );

  return differentUser || usersWithStreak[0] || null;
}

function pickFastestRiserUser(
  users: HomeHighlightUser[],
  excludedUserIds: Set<string>
) {
  const risers = users
    .filter((user) => {
      return user.rankDirection === "up" && user.rankChange > 0;
    })
    .sort((a, b) => {
      if (b.rankChange !== a.rankChange) return b.rankChange - a.rankChange;
      if (b.points !== a.points) return b.points - a.points;
      if (b.correct !== a.correct) return b.correct - a.correct;
      if (b.total !== a.total) return b.total - a.total;
      if (a.wrong !== b.wrong) return a.wrong - b.wrong;

      const aPredictionTime = toLeaderboardTimeValue(a.lastPredictionAt);
      const bPredictionTime = toLeaderboardTimeValue(b.lastPredictionAt);

      if (aPredictionTime !== bPredictionTime) {
        return aPredictionTime - bPredictionTime;
      }

      return a.fullName.localeCompare(b.fullName, "ar");
    });

  const differentUser = risers.find((user) => !excludedUserIds.has(user.id));

  return differentUser || risers[0] || null;
}

function pickFirstArriverUser(
  users: HomeHighlightUser[],
  predictions: HighlightPrediction[],
  excludedUserIds: Set<string>
) {
  const todaySaudiDateKey = getTodaySaudiDateKey();

  const todayPredictions = predictions
    .filter((prediction) => {
      if (!prediction.userId || !prediction.createdAt) return false;
      if (prediction.createdTimeValue <= 0) return false;

      return getSaudiDateKey(prediction.createdAt) === todaySaudiDateKey;
    })
    .sort((a, b) => a.createdTimeValue - b.createdTimeValue);

  if (todayPredictions.length === 0) return null;

  const firstDifferentUserPrediction = todayPredictions.find(
    (prediction) => !excludedUserIds.has(prediction.userId)
  );

  const selectedPrediction =
    firstDifferentUserPrediction || todayPredictions[0];

  return users.find((user) => user.id === selectedPrediction.userId) || null;
}

function getExactHits(
  predictions: HighlightPrediction[],
  knockoutRoundsByMatchId: Map<string, KnockoutRound>
): ExactHit[] {
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  return predictions
    .filter((prediction) => {
      if (!prediction.isCalculated) return false;

      if (prediction.resultType !== "exact") return false;

      const referenceTime =
        prediction.calculatedTimeValue || prediction.createdTimeValue;

      if (!referenceTime) return false;

      return now - referenceTime <= twentyFourHours;
    })
    .sort((a, b) => {
      const aTime = a.calculatedTimeValue || a.createdTimeValue;
      const bTime = b.calculatedTimeValue || b.createdTimeValue;

      return bTime - aTime;
    })
    .map((prediction) => {
      return {
        id: prediction.id,
        userId: prediction.userId,
        userName: prediction.userName,

        matchId: prediction.matchId,

        homeTeamName: prediction.homeTeamName,
        awayTeamName: prediction.awayTeamName,
        homeTeamEmoji: prediction.homeTeamEmoji,
        awayTeamEmoji: prediction.awayTeamEmoji,
        homeTeamCode: prediction.homeTeamCode,
        awayTeamCode: prediction.awayTeamCode,

        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,

        qualifiedTeamCode: prediction.qualifiedTeamCode,
        qualificationMethod: prediction.qualificationMethod,

        points: prediction.points,
        predictionType: prediction.predictionType,
        knockoutRound: knockoutRoundsByMatchId.get(prediction.matchId),

        createdAt: prediction.createdAt,
        calculatedAt: prediction.calculatedAt,
      };
    });
}

export async function getHomeHighlights() {
  const [users, predictions, matchesMeta] = await Promise.all([
    getUsersForHighlights(),
    getPredictionsForHighlights(),
    getMatchesHighlightMeta(),
  ]);

  const excludedUserIds = new Set<string>();

  const predictionKing = pickPredictionKing(users);

  if (predictionKing) {
    excludedUserIds.add(predictionKing.id);
  }

  const bestStreakUser = pickBestStreakUser(users, excludedUserIds);

  if (bestStreakUser) {
    excludedUserIds.add(bestStreakUser.id);
  }

  const fastestRiserUser = pickFastestRiserUser(users, excludedUserIds);

  if (fastestRiserUser) {
    excludedUserIds.add(fastestRiserUser.id);
  }

  const firstArriverUser = pickFirstArriverUser(
    users,
    predictions,
    excludedUserIds
  );

  const exactHits = getExactHits(
    predictions,
    matchesMeta.knockoutRoundsByMatchId
  );

  const exactHitsByUserId = predictions.reduce<Map<string, number>>(
    (counts, prediction) => {
      if (
        prediction.isCalculated &&
        prediction.resultType === "exact" &&
        prediction.userId
      ) {
        counts.set(
          prediction.userId,
          (counts.get(prediction.userId) || 0) + 1
        );
      }

      return counts;
    },
    new Map<string, number>()
  );

  const platformChampions = matchesMeta.isFinalCalculated
    ? users
        .filter((user) => user.total > 0)
        .slice(0, 3)
        .map((user) => ({
          ...user,
          exactHits: exactHitsByUserId.get(user.id) || 0,
        }))
    : [];

  return {
    predictionKing,
    bestStreakUser,
    fastestRiserUser,
    firstArriverUser,
    exactHits,

    isFinalCalculated: matchesMeta.isFinalCalculated,
    platformChampions,
  };
}