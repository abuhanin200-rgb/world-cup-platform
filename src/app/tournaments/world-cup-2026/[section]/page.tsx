import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TournamentCompactHeader from "@/components/tournaments/TournamentCompactHeader";
import TournamentNavigation from "@/components/tournaments/TournamentNavigation";
import TournamentStatsSummary from "@/components/TournamentStatsSummary";
import TournamentSectionHeader from "@/components/tournaments/TournamentSectionHeader";
import WorldCup2026Section from "@/components/WorldCup2026Section";
import { TOURNAMENT_SECTIONS, WORLD_CUP_2026_TOURNAMENT, getTournamentThemeStyle, type TournamentSection } from "@/domain/tournaments";

type Props={params:Promise<{section:string}>};
function valid(value:string):value is TournamentSection{return TOURNAMENT_SECTIONS.includes(value as TournamentSection)}
const LABELS:Record<TournamentSection,string>={matches:"مباريات",predictions:"توقعات",leaderboard:"ترتيب",studio:"استوديو",rules:"قوانين"};
export async function generateMetadata({params}:Props):Promise<Metadata>{const{section}=await params;if(!valid(section))return{};return{title:`${LABELS[section]} كأس العالم 2026`,description:`${LABELS[section]} وإحصائيات كأس العالم 2026 في منصة التحدي.`}}
export default async function Page({params}:Props){const{section}=await params;if(!valid(section))notFound();const tournament=WORLD_CUP_2026_TOURNAMENT;return <main dir="rtl" style={getTournamentThemeStyle(tournament)} className="min-h-screen bg-[var(--tournament-background)] text-[var(--tournament-text)]"><TournamentCompactHeader tournament={tournament}/><TournamentNavigation tournament={tournament} activeSection={section}/><TournamentSectionHeader tournament={tournament} section={section}/><div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6"><TournamentStatsSummary tournament={tournament}/></div><WorldCup2026Section section={section}/></main>}
