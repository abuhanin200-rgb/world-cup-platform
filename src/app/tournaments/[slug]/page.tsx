import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TournamentHero from "@/components/tournaments/TournamentHero";
import TournamentNavigation from "@/components/tournaments/TournamentNavigation";
import TournamentOverview from "@/components/tournaments/TournamentOverview";
import { getTournamentThemeStyle, tournamentService } from "@/domain/tournaments";

type TournamentPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: TournamentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tournament = await tournamentService.getBySlug(slug);
  if (!tournament) return {};
  return { title: tournament.name, description: tournament.description || `نظرة عامة على ${tournament.name} في منصة التحدي.` };
}

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
