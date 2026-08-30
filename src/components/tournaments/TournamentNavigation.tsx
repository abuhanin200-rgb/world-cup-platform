import Link from "next/link";
import { BarChart3, Home, ListChecks, Newspaper, ScrollText, Trophy } from "lucide-react";
import { getTournamentHref, getTournamentSectionHref, type Tournament, type TournamentSection } from "@/domain/tournaments";

type Props = { tournament: Tournament; activeSection?: TournamentSection | "home" };
const ITEMS: Array<{ key: TournamentSection | "home"; label: string; icon: typeof Home }> = [
  { key: "home", label: "الرئيسية", icon: Home },
  { key: "matches", label: "المباريات", icon: ListChecks },
  { key: "predictions", label: "توقعاتي", icon: Trophy },
  { key: "leaderboard", label: "الترتيب", icon: BarChart3 },
  { key: "studio", label: "الاستوديو", icon: Newspaper },
  { key: "rules", label: "القوانين", icon: ScrollText },
];

export default function TournamentNavigation({ tournament, activeSection = "home" }: Props) {
  return (
    <nav aria-label={`تنقل ${tournament.name}`} className="mx-auto max-w-7xl px-3 py-3 sm:px-4 md:px-6 md:py-4">
      <div className="hidden-scrollbar flex gap-1.5 overflow-x-auto pb-1 md:gap-2">
        {ITEMS.map((item) => {
          const Icon = item.icon; const active = item.key === activeSection;
          const href = item.key === "home" ? getTournamentHref(tournament) : getTournamentSectionHref(tournament, item.key);
          return <Link key={item.key} href={href} aria-current={active ? "page" : undefined} className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[11px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tournament-primary)] md:min-h-[44px] md:rounded-2xl md:px-4 md:text-sm ${active ? "border-white/25 bg-white text-slate-950" : "border-white/10 bg-white/[0.055] text-white/75 hover:bg-white/10 hover:text-white"}`}><Icon className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true" />{item.label}</Link>;
        })}
      </div>
    </nav>
  );
}
