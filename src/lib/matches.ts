import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "./firebase";
import { Team } from "./teams";

export type MatchStatus = "scheduled" | "finished";

export type PredictionType = "normal" | "golden";

export type Match = {
  id: string;

  homeTeamCode: string;
  homeTeamName: string;
  homeTeamEmoji: string;

  awayTeamCode: string;
  awayTeamName: string;
  awayTeamEmoji: string;

  matchDate: string;
  matchTime: string;
  matchDay?: string;
  startAt: string;

  status: MatchStatus;
  isActive: boolean;

  predictionType: PredictionType;

  actualHomeScore?: number | null;
  actualAwayScore?: number | null;
  resultCalculated?: boolean;
  calculatedAt?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

export type AddMatchInput = {
  homeTeam: Team;
  awayTeam: Team;
  matchDate: string;
  matchTime: string;
  predictionType?: PredictionType;
};

function toText(value: unknown) {
  return String(value || "").trim();
}

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeStatus(value: unknown): MatchStatus {
  if (value === "finished") return "finished";
  return "scheduled";
}

function normalizePredictionType(value: unknown): PredictionType {
  return value === "golden" ? "golden" : "normal";
}

function getMakkahStartAt(matchDate: string, matchTime: string) {
  return new Date(`${matchDate}T${matchTime}:00+03:00`).toISOString();
}

function getArabicDayName(matchDate: string) {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      weekday: "long",
      timeZone: "Asia/Riyadh",
    }).format(new Date(`${matchDate}T12:00:00+03:00`));
  } catch {
    return "";
  }
}

function mapMatch(id: string, data: Record<string, unknown>): Match {
  return {
    id,

    homeTeamCode: toText(data.homeTeamCode),
    homeTeamName: toText(data.homeTeamName),
    homeTeamEmoji: toText(data.homeTeamEmoji),

    awayTeamCode: toText(data.awayTeamCode),
    awayTeamName: toText(data.awayTeamName),
    awayTeamEmoji: toText(data.awayTeamEmoji),

    matchDate: toText(data.matchDate),
    matchTime: toText(data.matchTime),
    matchDay: toText(data.matchDay),
    startAt: toText(data.startAt),

    status: normalizeStatus(data.status),
    isActive: Boolean(data.isActive),

    predictionType: normalizePredictionType(data.predictionType),

    actualHomeScore: toNumberOrNull(data.actualHomeScore),
    actualAwayScore: toNumberOrNull(data.actualAwayScore),
    resultCalculated: Boolean(data.resultCalculated),
    calculatedAt:
      data.calculatedAt === null || data.calculatedAt === undefined
        ? null
        : toText(data.calculatedAt),

    createdAt: toText(data.createdAt),
    updatedAt: toText(data.updatedAt),
  };
}

function getCurrentMakkahDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDaysToDateString(dateString: string, days: number) {
  const date = new Date(`${dateString}T12:00:00+03:00`);
  date.setDate(date.getDate() + days);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function shouldShowMatch(match: Match) {
  if (!match.isActive) return false;
  if (match.status !== "scheduled") return false;
  if (!match.startAt) return false;

  const today = getCurrentMakkahDateString();
  const tomorrow = addDaysToDateString(today, 1);

  const isTodayOrTomorrow =
    match.matchDate === today || match.matchDate === tomorrow;

  if (!isTodayOrTomorrow) return false;

  const startTime = new Date(match.startAt).getTime();

  if (!Number.isFinite(startTime)) return false;

  const twoHoursAfterStart = startTime + 2 * 60 * 60 * 1000;

  return Date.now() < twoHoursAfterStart;
}

export async function getAllMatches(): Promise<Match[]> {
  const matchesRef = collection(db, "matches");
  const q = query(matchesRef, orderBy("startAt", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => mapMatch(docSnap.id, docSnap.data()));
}

export async function getVisibleMatches(): Promise<Match[]> {
  const matches = await getAllMatches();

  return matches.filter(shouldShowMatch);
}

export async function addMatch(input: AddMatchInput) {
  const { homeTeam, awayTeam, matchDate, matchTime, predictionType } = input;

  if (!homeTeam || !awayTeam) {
    throw new Error("بيانات المنتخبين غير مكتملة");
  }

  if (homeTeam.code === awayTeam.code) {
    throw new Error("لا يمكن إضافة مباراة بين نفس المنتخب");
  }

  if (!matchDate || !matchTime) {
    throw new Error("تاريخ ووقت المباراة مطلوبان");
  }

  const now = new Date().toISOString();
  const startAt = getMakkahStartAt(matchDate, matchTime);

  const matchData = {
    homeTeamCode: homeTeam.code,
    homeTeamName: homeTeam.nameAr,
    homeTeamEmoji: homeTeam.emoji,

    awayTeamCode: awayTeam.code,
    awayTeamName: awayTeam.nameAr,
    awayTeamEmoji: awayTeam.emoji,

    matchDate,
    matchTime,
    matchDay: getArabicDayName(matchDate),
    startAt,

    status: "scheduled" as MatchStatus,
    isActive: true,

    predictionType: normalizePredictionType(predictionType),

    actualHomeScore: null,
    actualAwayScore: null,
    resultCalculated: false,
    calculatedAt: null,

    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, "matches"), matchData);

  return {
    id: docRef.id,
    ...matchData,
  } as Match;
}