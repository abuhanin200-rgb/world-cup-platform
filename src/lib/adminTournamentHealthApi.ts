import { auth } from "@/lib/firebase";

export type GulfCup27Health = {
  source: "firestore";
  fallbackUsed: boolean;
  checkedAt: number;
  checks: Record<string, boolean>;
  counts: {
    teams: number;
    matches: number;
    groupMatches: number;
    knockoutMatches: number;
    predictions: number;
    userStats: number;
    achievements: number;
    linkedFixtures: number;
    unlinkedFixtures: number;
    conflicts: number;
    calculated: number;
  };
  sports: {
    configured: boolean;
    enabled: boolean;
    leagueId: number | null;
    leagueName: string | null;
    season: number | null;
    seasonAvailability: string;
    lastSyncAt: number | null;
    lastSuccessAt: number | null;
    lastError: string | null;
  };
  issues: {
    duplicateMatchIds: string[];
    duplicatePredictionKeys: string[];
    predictionWindowMatchIds: string[];
    missingTeamIds: string[];
    missingMatchIds: string[];
  };
};

export async function getGulfCup27AdminHealth() {
  const user = auth.currentUser;
  if (!user) throw new Error("انتهت جلسة الإدارة");
  const token = await user.getIdToken();
  const response = await fetch("/api/admin/tournaments/gulf27-health", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as (GulfCup27Health & { error?: string }) | null;
  if (!response.ok || !data) throw new Error(data?.error || "تعذر تنفيذ فحص الجاهزية");
  return data;
}
