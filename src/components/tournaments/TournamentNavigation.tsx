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
    <nav aria-label={`تنقل ${tournament.name}`} className="sticky top-[64px] z-50 border-b border-white/[0.08] bg-[var(--tournament-background)]/58 backdrop-blur-2xl md:top-[72px]">
      <div className="mx-auto max-w-7xl px-3 py-2 sm:px-4 md:px-6 md:py-2.5">
        <div className="altahaddi-glass-soft hidden-scrollbar flex gap-1 overflow-x-auto rounded-2xl p-1">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.key === activeSection;
            const href = item.key === "home" ? getTournamentHref(tournament) : getTournamentSectionHref(tournament, item.key);
            return <Link key={item.key} href={href} aria-current={active ? "page" : undefined} className={`relative inline-flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-xl px-3 text-[10px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tournament-primary)] md:min-h-[44px] md:px-4 md:text-xs ${active ? "bg-white text-slate-950 shadow-lg shadow-black/10" : "text-white/58 hover:bg-white/[0.06] hover:text-white"}`}><Icon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${active ? "text-[var(--tournament-primary)]" : ""}`} />{item.label}</Link>;
          })}
        </div>
      </div>
    </nav>
  );
}
