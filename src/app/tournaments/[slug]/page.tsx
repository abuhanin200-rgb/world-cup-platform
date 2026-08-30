import { notFound } from "next/navigation";
import TournamentHero from "@/components/tournaments/TournamentHero";
import TournamentNavigation from "@/components/tournaments/TournamentNavigation";
import TournamentOverview from "@/components/tournaments/TournamentOverview";
import { getTournamentThemeStyle, tournamentService } from "@/domain/tournaments";

type TournamentPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function TournamentPage({ params }: TournamentPageProps) {
  const { slug } = await params;
  const tournament = await tournamentService.getBySlug(slug);

  if (!tournament || tournament.status === "hidden" || tournament.status === "draft") {
    notFound();
  }

  return (
    <main
      dir="rtl"
      style={getTournamentThemeStyle(tournament)}
      className="min-h-screen bg-[var(--tournament-background)] text-[var(--tournament-text)]"
    >
      <TournamentHero tournament={tournament} />
      <TournamentNavigation tournament={tournament} activeSection="home" />
      <TournamentOverview tournament={tournament} />
    </main>
  );
}
