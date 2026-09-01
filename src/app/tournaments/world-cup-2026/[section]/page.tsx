import { notFound } from "next/navigation";
import TournamentHero from "@/components/tournaments/TournamentHero";
import TournamentNavigation from "@/components/tournaments/TournamentNavigation";
import TournamentStatsSummary from "@/components/TournamentStatsSummary";
import TournamentSectionHeader from "@/components/tournaments/TournamentSectionHeader";
import WorldCup2026Section from "@/components/WorldCup2026Section";
import { TOURNAMENT_SECTIONS, WORLD_CUP_2026_TOURNAMENT, getTournamentThemeStyle, type TournamentSection } from "@/domain/tournaments";

type Props={params:Promise<{section:string}>};
function valid(value:string):value is TournamentSection{return TOURNAMENT_SECTIONS.includes(value as TournamentSection)}
export default async function Page({params}:Props){const{section}=await params;if(!valid(section))notFound();const tournament=WORLD_CUP_2026_TOURNAMENT;return <main dir="rtl" style={getTournamentThemeStyle(tournament)} className="min-h-screen bg-[var(--tournament-background)] text-[var(--tournament-text)]"><TournamentHero tournament={tournament}/><TournamentNavigation tournament={tournament} activeSection={section}/><TournamentSectionHeader tournament={tournament} section={section}/><div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6"><TournamentStatsSummary tournament={tournament}/></div><WorldCup2026Section section={section}/></main>}
