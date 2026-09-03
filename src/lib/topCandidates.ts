export type TopCandidateTeam = {
  teamName: string;
  teamEmoji: string;
  votes: number;
  rank: number;
};

export async function getTopCandidateTeams(): Promise<TopCandidateTeam[]> {
  const response = await fetch("/api/public/legacy-community?view=top-candidates", {
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as {
    teams?: TopCandidateTeam[];
    error?: string;
  } | null;
  if (!response.ok || !data?.teams) {
    throw new Error(data?.error || "تعذر تحميل المنتخبات المرشحة الآن.");
  }
  return data.teams;
}
