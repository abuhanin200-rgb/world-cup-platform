import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GulfCup27EntranceIntro from "@/components/tournaments/GulfCup27EntranceIntro";
import TournamentHero from "@/components/tournaments/TournamentHero";
import TournamentNavigation from "@/components/tournaments/TournamentNavigation";
import TournamentActivityStrips from "@/components/tournaments/TournamentActivityStrips";
import TournamentOverview from "@/components/tournaments/TournamentOverview";
import { getTournamentThemeStyle, tournamentService } from "@/domain/tournaments";

type TournamentPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: TournamentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tournament = await tournamentService.getBySlug(slug);
  if (!tournament) return {};
  return {
    title: tournament.name,
    description: tournament.description || `نظرة عامة على ${tournament.name} في منصة التحدي.`,
  };
}

export default async function TournamentPage({ params }: TournamentPageProps) {
  const { slug } = await params;
  const tournament = await tournamentService.getBySlug(slug);

  if (!tournament || tournament.status === "hidden" || tournament.status === "draft") {
    notFound();
  }

  const isGulfCup27 = tournament.slug === "gulf-cup-27";

  return (
    <main
      dir="rtl"
      style={getTournamentThemeStyle(tournament)}
      className="min-h-screen bg-[var(--tournament-background)] text-[var(--tournament-text)]"
    >
      {/* Home page only. Because this page unmounts on section routes, the intro replays on every re-entry. */}
      {isGulfCup27 ? <GulfCup27EntranceIntro /> : null}
      <TournamentHero tournament={tournament} />
      {tournament.engine === "v2" && tournament.status !== "coming_soon" ? (
        <TournamentActivityStrips tournamentId={tournament.id} tournamentName={tournament.shortName || tournament.name} />
      ) : null}
      <TournamentNavigation tournament={tournament} activeSection="home" />
      <TournamentOverview tournament={tournament} />
    </main>
  );
}
