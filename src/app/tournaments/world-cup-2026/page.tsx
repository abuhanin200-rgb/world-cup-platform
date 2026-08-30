import TournamentHero from "@/components/tournaments/TournamentHero";
import TournamentNavigation from "@/components/tournaments/TournamentNavigation";
import TournamentOverview from "@/components/tournaments/TournamentOverview";
import WorldCupChampionsPodium from "@/components/WorldCupChampionsPodium";
import { WORLD_CUP_2026_TOURNAMENT, getTournamentThemeStyle } from "@/domain/tournaments";

export default function WorldCup2026Page() {
  const tournament = WORLD_CUP_2026_TOURNAMENT;
  return <main dir="rtl" style={getTournamentThemeStyle(tournament)} className="min-h-screen bg-[var(--tournament-background)] text-[var(--tournament-text)]"><TournamentHero tournament={tournament}/><TournamentNavigation tournament={tournament} activeSection="home"/><WorldCupChampionsPodium/><TournamentOverview tournament={tournament}/></main>;
}
