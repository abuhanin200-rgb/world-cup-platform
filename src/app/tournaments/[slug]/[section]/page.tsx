import { notFound } from "next/navigation";
import TournamentHero from "@/components/tournaments/TournamentHero";
import TournamentNavigation from "@/components/tournaments/TournamentNavigation";
import TournamentStatsSummary from "@/components/TournamentStatsSummary";
import TournamentV2Section from "@/components/TournamentV2Section";
import WorldCup2026Section from "@/components/WorldCup2026Section";
import { getTournamentThemeStyle, TOURNAMENT_SECTIONS, tournamentService, type TournamentSection } from "@/domain/tournaments";

type Props = { params: Promise<{ slug: string; section: string }> };
function isTournamentSection(value: string): value is TournamentSection { return TOURNAMENT_SECTIONS.includes(value as TournamentSection); }

export default async function TournamentSectionPage({ params }: Props) {
  const { slug, section } = await params; const tournament = await tournamentService.getBySlug(slug);
  if (!tournament || tournament.status === "hidden" || tournament.status === "draft" || !isTournamentSection(section)) notFound();
  return <main dir="rtl" style={getTournamentThemeStyle(tournament)} className="min-h-screen bg-[var(--tournament-background)] text-[var(--tournament-text)]"><TournamentHero tournament={tournament}/><TournamentNavigation tournament={tournament} activeSection={section}/><div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6"><TournamentStatsSummary tournament={tournament}/></div>{tournament.engine === "legacy_wc2026" ? <WorldCup2026Section section={section}/> : <TournamentV2Section tournament={tournament} section={section}/>}</main>;
}
