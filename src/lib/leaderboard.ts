import type { LeaderboardUser } from "@/lib/legacyLeaderboardLogic";

export type { LeaderboardUser } from "@/lib/legacyLeaderboardLogic";

export async function getLeaderboardUsers(): Promise<LeaderboardUser[]> {
  const response = await fetch("/api/public/legacy-community?view=leaderboard", {
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as {
    users?: LeaderboardUser[];
    error?: string;
  } | null;

  if (!response.ok || !data?.users) {
    throw new Error(data?.error || "تعذر تحميل ترتيب الأعضاء الآن.");
  }

  return data.users;
}
