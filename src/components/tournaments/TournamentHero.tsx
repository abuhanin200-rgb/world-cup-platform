import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Trophy } from "lucide-react";
import { formatTournamentDateRange, getTournamentThemeStyle, type Tournament } from "@/domain/tournaments";
import TournamentStatusBadge from "./TournamentStatusBadge";

type TournamentHeroProps = { tournament: Tournament };

export default function TournamentHero({ tournament }: TournamentHeroProps) {
  const dateRange = formatTournamentDateRange(tournament);
  const hero = tournament.branding.heroUrl ?? tournament.branding.coverUrl;
  const logoSurface = tournament.slug === "world-cup-2026" ? "bg-white/95" : "bg-white/92";

  return (
    <section style={getTournamentThemeStyle(tournament)} className="relative isolate overflow-hidden rounded-b-[28px] bg-[var(--tournament-background)] text-[var(--tournament-text)] shadow-2xl shadow-black/25 md:rounded-b-[42px]">
      {hero ? <img src={hero} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-70" /> : null}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-[var(--tournament-background)]/78 to-[var(--tournament-background)]" />
      <div className="absolute inset-0 opacity-25" style={{ background: "radial-gradient(circle at 78% 18%, var(--tournament-primary), transparent 32%), radial-gradient(circle at 12% 65%, var(--tournament-accent), transparent 30%)" }} />

      <div className="relative mx-auto max-w-7xl px-3 pb-7 pt-4 sm:px-4 md:px-6 md:pb-10 md:pt-6">
        <div className="mb-5 flex items-center justify-between gap-2 md:mb-8">
          <Link href="/tournaments" className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/15 bg-black/25 px-3 text-xs font-black backdrop-blur-md transition hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tournament-primary)] md:min-h-[44px] md:px-4 md:text-sm">
            <ArrowRight className="h-4 w-4" aria-hidden="true" /> البطولات
          </Link>
          <div className="flex items-center gap-2"><TournamentStatusBadge status={tournament.status} />{tournament.isCurrent ? <span className="hidden rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-xs font-black sm:inline-flex">البطولة الحالية</span> : null}</div>
        </div>

        <div className="grid items-center gap-5 md:grid-cols-[1fr_auto] md:gap-8">
          <div className="order-2 md:order-1">
            <div className="mb-3 inline-flex min-h-[32px] items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 text-[10px] font-black text-white/80 backdrop-blur-md md:text-xs">
              <Trophy className="h-3.5 w-3.5 text-[var(--tournament-accent)]" aria-hidden="true" /> بطولات التحدي
            </div>
            <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-4xl md:text-6xl">{tournament.name}</h1>
            {tournament.description ? <p className="mt-3 max-w-2xl text-xs font-semibold leading-6 text-white/72 sm:text-sm md:mt-4 md:text-base md:leading-8">{tournament.description}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-white/80 md:mt-6 md:text-sm">
              {tournament.hostCountry ? <div className="inline-flex min-h-[36px] items-center gap-2 rounded-xl border border-white/12 bg-black/20 px-3 backdrop-blur-md md:min-h-[40px]"><MapPin className="h-4 w-4" aria-hidden="true" />{tournament.hostCountry}</div> : null}
              {dateRange ? <div className="inline-flex min-h-[36px] items-center gap-2 rounded-xl border border-white/12 bg-black/20 px-3 backdrop-blur-md md:min-h-[40px]"><CalendarDays className="h-4 w-4" aria-hidden="true" /><span className="[unicode-bidi:isolate]" dir="rtl">{dateRange}</span></div> : null}
            </div>
          </div>

          <div className="order-1 flex justify-center md:order-2 md:justify-end">
            {tournament.branding.logoUrl ? <div className={`flex h-28 w-28 items-center justify-center overflow-hidden rounded-[24px] border border-white/15 p-2.5 shadow-2xl shadow-black/30 sm:h-32 sm:w-32 md:h-52 md:w-52 md:rounded-[36px] md:p-4 ${logoSurface}`}><img src={tournament.branding.logoUrl} alt={`شعار ${tournament.name}`} className="h-full w-full object-contain" /></div> : <div className="flex h-28 w-28 items-center justify-center rounded-[24px] border border-white/15 bg-black/20 md:h-52 md:w-52"><Trophy className="h-14 w-14 text-[var(--tournament-primary)]" aria-hidden="true" /></div>}
          </div>
        </div>
      </div>
    </section>
  );
}
