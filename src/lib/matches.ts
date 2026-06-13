import { collection, getDocs, orderBy, query } from "firebase/firestore";
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
  matchDay: string;
  matchTime: string;

  startAt: string;
  status: "scheduled" | "closed" | "finished";

  createdAt?: string;
  updatedAt?: string;
};

function getMakkahTodayStart() {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const makkahDate = formatter.format(now);

  return new Date(`${makkahDate}T00:00:00+03:00`);
}

function getMakkahTomorrowEnd() {
  const todayStart = getMakkahTodayStart();
  const tomorrowEnd = new Date(todayStart);

  tomorrowEnd.setDate(tomorrowEnd.getDate() + 2);

  return tomorrowEnd;
}

export function isMatchVisible(match: Match) {
  if (!match.startAt) return false;

  const now = new Date();
  const matchStart = new Date(match.startAt);

  const todayStart = getMakkahTodayStart();
  const tomorrowEnd = getMakkahTomorrowEnd();

  const hideAfter = new Date(matchStart);
  hideAfter.setMinutes(hideAfter.getMinutes() + 120);

  const isTodayOrTomorrow = matchStart >= todayStart && matchStart < tomorrowEnd;
  const isNotHiddenYet = now < hideAfter;

  return isTodayOrTomorrow && isNotHiddenYet;
}

export function isPredictionOpen(match: Match) {
  if (!match.startAt) return false;

  const now = new Date();
  const matchStart = new Date(match.startAt);

  return now < matchStart;
}

export function getMatchCountdown(match: Match) {
  if (!match.startAt) return "انتهى وقت التوقع";

  const now = new Date().getTime();
  const start = new Date(match.startAt).getTime();
  const diff = start - now;

  if (diff <= 0) return "انتهى وقت التوقع";

  const totalSeconds = Math.floor(diff / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days} يوم ${hours} ساعة ${minutes} دقيقة`;
  }

  if (hours > 0) {
    return `${hours} ساعة ${minutes} دقيقة ${seconds} ثانية`;
  }

  return `${minutes} دقيقة ${seconds} ثانية`;
}

export async function getVisibleMatches(): Promise<Match[]> {
  const matchesRef = collection(db, "matches");
  const q = query(matchesRef, orderBy("startAt", "asc"));
  const snapshot = await getDocs(q);

  const matches = snapshot.docs
    .filter((doc) => doc.id !== "_init")
    .map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Match, "id">),
    }));

  return matches.filter(isMatchVisible);
}