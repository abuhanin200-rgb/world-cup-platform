import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "./firebase";

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
  matchDay: string;
  startAt: string;

  status: "scheduled" | "finished";
  isActive: boolean;

  resultCalculated?: boolean;
  actualHomeScore?: number | null;
  actualAwayScore?: number | null;
  calculatedAt?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

export type AddMatchInput = {
  homeTeamCode: string;
  homeTeamName: string;
  homeTeamEmoji: string;

  awayTeamCode: string;
  awayTeamName: string;
  awayTeamEmoji: string;

  matchDate: string;
  matchTime: string;
};

function getMatchDayArabic(dateText: string) {
  const date = new Date(`${dateText}T12:00:00+03:00`);

  return new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    timeZone: "Asia/Riyadh",
  }).format(date);
}

function getMakkahTodayDate() {
  const now = new Date();

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function addDaysToDate(dateText: string, days: number) {
  const date = new Date(`${dateText}T12:00:00+03:00`);
  date.setDate(date.getDate() + days);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function mapMatchDoc(docId: string, data: Record<string, unknown>): Match {
  return {
    id: docId,

    homeTeamCode: String(data.homeTeamCode || ""),
    homeTeamName: String(data.homeTeamName || ""),
    homeTeamEmoji: String(data.homeTeamEmoji || ""),

    awayTeamCode: String(data.awayTeamCode || ""),
    awayTeamName: String(data.awayTeamName || ""),
    awayTeamEmoji: String(data.awayTeamEmoji || ""),

    matchDate: String(data.matchDate || ""),
    matchTime: String(data.matchTime || ""),
    matchDay: String(data.matchDay || ""),
    startAt: String(data.startAt || ""),

    status: data.status === "finished" ? "finished" : "scheduled",
    isActive: Boolean(data.isActive),

    resultCalculated: Boolean(data.resultCalculated),
    actualHomeScore:
      data.actualHomeScore === undefined || data.actualHomeScore === null
        ? null
        : Number(data.actualHomeScore),
    actualAwayScore:
      data.actualAwayScore === undefined || data.actualAwayScore === null
        ? null
        : Number(data.actualAwayScore),
    calculatedAt:
      data.calculatedAt === undefined || data.calculatedAt === null
        ? null
        : String(data.calculatedAt),

    createdAt: data.createdAt ? String(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
  };
}

export async function getAllMatches(): Promise<Match[]> {
  const matchesRef = collection(db, "matches");
  const q = query(matchesRef, orderBy("startAt", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .filter((docSnap) => docSnap.id !== "_init")
    .map((docSnap) => mapMatchDoc(docSnap.id, docSnap.data()));
}

export async function getVisibleMatches(): Promise<Match[]> {
  const allMatches = await getAllMatches();

  const today = getMakkahTodayDate();
  const tomorrow = addDaysToDate(today, 1);
  const now = Date.now();

  return allMatches.filter((match) => {
    if (!match.isActive) return false;
    if (match.status === "finished") return false;

    const isTodayOrTomorrow =
      match.matchDate === today || match.matchDate === tomorrow;

    if (!isTodayOrTomorrow) return false;

    const startTime = new Date(match.startAt).getTime();

    if (!Number.isFinite(startTime)) return true;

    const twoHoursAfterStart = startTime + 2 * 60 * 60 * 1000;

    return now < twoHoursAfterStart;
  });
}

export async function addMatch(input: AddMatchInput) {
  if (!input.homeTeamCode || !input.awayTeamCode) {
    throw new Error("اختر الفريقين بشكل صحيح");
  }

  if (input.homeTeamCode === input.awayTeamCode) {
    throw new Error("لا يمكن اختيار نفس الفريقين");
  }

  if (!input.matchDate || !input.matchTime) {
    throw new Error("أدخل تاريخ ووقت المباراة");
  }

  const now = new Date().toISOString();
  const startAt = `${input.matchDate}T${input.matchTime}:00+03:00`;

  const matchData = {
    homeTeamCode: input.homeTeamCode,
    homeTeamName: input.homeTeamName,
    homeTeamEmoji: input.homeTeamEmoji,

    awayTeamCode: input.awayTeamCode,
    awayTeamName: input.awayTeamName,
    awayTeamEmoji: input.awayTeamEmoji,

    matchDate: input.matchDate,
    matchTime: input.matchTime,
    matchDay: getMatchDayArabic(input.matchDate),
    startAt,

    status: "scheduled",
    isActive: true,

    resultCalculated: false,
    actualHomeScore: null,
    actualAwayScore: null,
    calculatedAt: null,

    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, "matches"), matchData);

  return {
    id: docRef.id,
    ...matchData,
  };
}