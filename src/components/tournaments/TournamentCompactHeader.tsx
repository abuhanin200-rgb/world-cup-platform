import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Trophy } from "lucide-react";
import {
  formatTournamentDateRange,
  getTournamentDisplayStatus,
  getTournamentThemeStyle,
  type Tournament,
} from "@/domain/tournaments";
import TournamentStatusBadge from "./TournamentStatusBadge";

export default function TournamentCompactHeader({ tournament }: { tournament: Tournament }) {
  const cover = tournament.branding.heroUrl ?? tournament.branding.coverUrl;
  const dateRange = formatTournamentDateRange(tournament);

  return (
    <section
      style={getTournamentThemeStyle(tournament)}
      className="relative isolate min-h-[108px] overflow-hidden border-b border-white/10 bg-[var(--tournament-background)] text-[var(--tournament-text)] md:min-h-[142px]"
    >
      {cover ? <img src={cover} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-30" /> : null}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--tournament-background),color-mix(in_srgb,var(--tournament-background)_82%,transparent),var(--tournament-background))]" />
      <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 12% 10%,var(--tournament-primary),transparent 34%)" }} />
      <div className="relative mx-auto flex max-w-7xl items-center gap-3 px-3 py-3 sm:px-4 md:gap-5 md:px-6 md:py-5">
        <Link href="/tournaments" aria-label="العودة إلى البطولات" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/12 bg-black/20 text-white/75 backdrop-blur-xl transition hover:bg-black/35 hover:text-white">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/18 bg-white/95 p-1.5 shadow-xl shadow-black/20 md:h-24 md:w-24 md:rounded-[24px] md:p-2.5">
          {tournament.branding.logoUrl ? <img src={tournament.branding.logoUrl} alt={`شعار ${tournament.name}`} className="h-full w-full object-contain" /> : <Trophy className="h-8 w-8 text-[var(--tournament-primary)]" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><TournamentStatusBadge status={getTournamentDisplayStatus(tournament)} /><span className="hidden text-[10px] font-bold text-white/55 sm:inline">صفحة داخلية</span></div>
          <h1 className="mt-1 truncate text-xl font-black sm:text-2xl md:text-3xl">{tournament.name}</h1>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-white/62 md:text-xs">
            {dateRange ? <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-[var(--tournament-accent)]" aria-hidden="true" /><span className="[unicode-bidi:isolate]">{dateRange}</span></span> : null}
            {tournament.hostCountry ? <span className="hidden items-center gap-1.5 sm:inline-flex"><MapPin className="h-3.5 w-3.5 text-[var(--tournament-accent)]" aria-hidden="true" />{tournament.hostCountry}</span> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
