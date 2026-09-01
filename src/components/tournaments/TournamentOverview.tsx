import Link from "next/link";
import { ArrowLeft, BarChart3, ListChecks, Newspaper, Sparkles, Trophy } from "lucide-react";
import GulfCup27OverviewLive from "@/components/GulfCup27OverviewLive";
import TournamentStatsSummary from "@/components/TournamentStatsSummary";
import { GULF_CUP_27_TOURNAMENT_ID, getTournamentSectionHref, getTournamentThemeStyle, type Tournament } from "@/domain/tournaments";

const FEATURES = [
  { section: "matches" as const, title: "المباريات", description: "المواعيد والنتائج وحالة كل مواجهة.", icon: ListChecks },
  { section: "predictions" as const, title: "توقعاتي", description: "توقعاتك ونقاطك ونتائج الاحتساب.", icon: Trophy },
  { section: "leaderboard" as const, title: "الترتيب", description: "مركزك وأفضل المنافسين في البطولة.", icon: BarChart3 },
  { section: "studio" as const, title: "الاستوديو", description: "أخبار وتحليلات وتغطية البطولة.", icon: Newspaper },
];

export default function TournamentOverview({ tournament }: { tournament: Tournament }) {
  return (
    <div style={getTournamentThemeStyle(tournament)} className="mx-auto max-w-7xl px-3 pb-10 sm:px-4 md:px-6 md:pb-16">
      <TournamentStatsSummary tournament={tournament} />
      {tournament.id === GULF_CUP_27_TOURNAMENT_ID ? <GulfCup27OverviewLive /> : null}
      <div className="mb-3 mt-5 flex items-center justify-between gap-3 md:mt-7">
        <div><div className="flex items-center gap-1.5 text-[9px] font-black text-[var(--tournament-accent)]"><Sparkles className="h-3 w-3" /> مركز البطولة</div><h2 className="mt-1 text-lg font-black md:text-2xl">كل ما تحتاجه داخل {tournament.shortName}</h2></div>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 md:gap-3">
        {FEATURES.map((feature) => { const Icon = feature.icon; return (
          <Link key={feature.section} href={getTournamentSectionHref(tournament, feature.section)} className="altahaddi-glass-soft group relative overflow-hidden rounded-[20px] p-3.5 transition hover:-translate-y-0.5 hover:border-white/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tournament-primary)] md:rounded-[24px] md:p-4">
            <div className="absolute -left-8 -top-8 h-20 w-20 rounded-full bg-[var(--tournament-primary)]/8 blur-2xl" />
            <div className="relative"><div className="mb-3 grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.06] text-[var(--tournament-primary)]"><Icon className="h-4 w-4" /></div><h3 className="text-sm font-black md:text-base">{feature.title}</h3><p className="mt-1 text-[9px] font-semibold leading-5 text-white/43 md:text-[11px]">{feature.description}</p><div className="mt-3 flex items-center gap-1 text-[9px] font-black text-white/62 md:text-[10px]">فتح <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-1" /></div></div>
          </Link>
        ); })}
      </div>
    </div>
  );
}
