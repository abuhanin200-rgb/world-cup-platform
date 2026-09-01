import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/client";
import type { Member, RankDirection } from "@/types/member";

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function direction(value: unknown): RankDirection {
  return value === "up" || value === "down" ? value : "-";
}

export async function loadMemberProfile(userId: string): Promise<Member | null> {
  const snapshot = await getDoc(doc(db, "users", userId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as Record<string, unknown>;
  const notices = data.seenNotices && typeof data.seenNotices === "object"
    ? Object.fromEntries(Object.entries(data.seenNotices as Record<string, unknown>).map(([key, value]) => [key, Boolean(value)]))
    : {};

  return {
    id: snapshot.id,
    fullName: String(data.fullName || ""),
    phone: String(data.phone || ""),
    favoriteTeam: String(data.favoriteTeam || ""),
    teamEmoji: String(data.teamEmoji || ""),
    points: number(data.points),
    total: number(data.total),
    correct: number(data.correct),
    wrong: number(data.wrong),
    currentRank: number(data.currentRank),
    previousRank: number(data.previousRank),
    rankChange: number(data.rankChange),
    rankDirection: direction(data.rankDirection),
    currentStreak: number(data.currentStreak),
    bestStreak: number(data.bestStreak),
    seenNotices: notices,
    createdAt: data.createdAt ? String(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
    lastUpdated: data.lastUpdated ? String(data.lastUpdated) : undefined,
  };
}
