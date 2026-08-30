import Link from "next/link";
import { ArrowLeft, BarChart3, ListChecks, Newspaper, Sparkles, Trophy } from "lucide-react";
import GulfCup27OverviewLive from "@/components/GulfCup27OverviewLive";
import TournamentStatsSummary from "@/components/TournamentStatsSummary";
import { GULF_CUP_27_TOURNAMENT_ID, getTournamentSectionHref, getTournamentThemeStyle, type Tournament } from "@/domain/tournaments";

const FEATURES = [
  { section: "matches" as const, title: "المباريات", description: "المواعيد والنتائج وترتيب المجموعات وحالة كل مباراة.", icon: ListChecks },
  { section: "predictions" as const, title: "توقعاتي", description: "راجع توقعاتك ونقاطك ونتائج احتسابها.", icon: Trophy },
  { section: "leaderboard" as const, title: "الترتيب", description: "تابع مركزك وأفضل المنافسين في البطولة.", icon: BarChart3 },
  { section: "studio" as const, title: "استوديو البطولة", description: "أخبار وتحليلات وإنجازات مرتبطة بأحداث البطولة.", icon: Newspaper },
];

export default function TournamentOverview({ tournament }: { tournament: Tournament }) {
  return (
    <div style={getTournamentThemeStyle(tournament)} className="mx-auto max-w-7xl px-3 pb-10 sm:px-4 md:px-6 md:pb-16">
      <TournamentStatsSummary tournament={tournament} />
      {tournament.id === GULF_CUP_27_TOURNAMENT_ID ? <GulfCup27OverviewLive /> : null}
      <div className="mb-3 mt-5 flex items-center gap-2 md:mb-5 md:mt-7"><Sparkles className="h-4 w-4 text-[var(--tournament-primary)] md:h-5 md:w-5" aria-hidden="true" /><h2 className="text-lg font-black md:text-2xl">داخل البطولة</h2></div>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 md:gap-3">
        {FEATURES.map((feature) => { const Icon = feature.icon; return (
          <Link key={feature.section} href={getTournamentSectionHref(tournament, feature.section)} className="group rounded-[20px] border border-white/10 bg-white/[0.055] p-3.5 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tournament-primary)] md:rounded-[24px] md:p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-[var(--tournament-primary)] md:mb-5 md:h-11 md:w-11 md:rounded-2xl"><Icon className="h-4 w-4 md:h-5 md:w-5" aria-hidden="true" /></div>
            <h3 className="text-sm font-black md:text-lg">{feature.title}</h3><p className="mt-1.5 text-[10px] font-semibold leading-5 text-white/55 md:mt-2 md:min-h-[48px] md:text-sm md:leading-6">{feature.description}</p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-black text-white/75 md:mt-4 md:text-sm">فتح <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-1 md:h-4 md:w-4" aria-hidden="true" /></div>
          </Link>
        ); })}
      </div>
    </div>
  );
}
