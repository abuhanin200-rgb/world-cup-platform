import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Sparkles, Trophy } from "lucide-react";
import { formatTournamentDateRange, getTournamentDisplayStatus, getTournamentThemeStyle, type Tournament } from "@/domain/tournaments";
import TournamentStatusBadge from "./TournamentStatusBadge";

type TournamentHeroProps = { tournament: Tournament };

function seasonMark(tournament: Tournament) {
  if (tournament.slug === "world-cup-2026") return "2026";
  if (tournament.slug === "gulf-cup-27") return "27";
  if (tournament.slug === "asian-cup-2027") return "2027";
  return "التحدي";
}

function worldCupBackdrop(tournament: Tournament) {
  if (tournament.slug !== "world-cup-2026") return undefined;
  return "radial-gradient(circle at 15% 25%,rgba(34,211,238,.20),transparent 28%),radial-gradient(circle at 78% 72%,rgba(59,130,246,.25),transparent 35%),linear-gradient(135deg,#020617 0%,#07142f 50%,#101b45 100%)";
}

export default function TournamentHero({ tournament }: TournamentHeroProps) {
  const dateRange = formatTournamentDateRange(tournament);
  const displayStatus = getTournamentDisplayStatus(tournament);
  const hero = tournament.branding.heroUrl ?? tournament.branding.coverUrl;

  return (
    <section style={{ ...getTournamentThemeStyle(tournament), background: worldCupBackdrop(tournament) }} className="relative isolate overflow-hidden border-b border-white/[0.10] bg-[var(--tournament-background)] text-[var(--tournament-text)]">
      {hero ? <img src={hero} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-70" /> : null}
      <div className="absolute inset-0 bg-gradient-to-b from-black/28 via-[var(--tournament-background)]/78 to-[var(--tournament-background)]" />
      <div className="absolute inset-0 opacity-35" style={{ background: "radial-gradient(circle at 82% 18%,var(--tournament-primary),transparent 30%),radial-gradient(circle at 8% 90%,var(--tournament-accent),transparent 28%)" }} />
      <div className="absolute -left-4 top-1/2 -translate-y-1/2 select-none text-[105px] font-black leading-none text-white/[0.045] sm:text-[140px] md:text-[210px]" aria-hidden="true">{seasonMark(tournament)}</div>

      <div className="relative mx-auto max-w-7xl px-3 pb-6 pt-3 sm:px-4 md:px-6 md:pb-9 md:pt-5">
        <div className="mb-4 flex items-center justify-between gap-2 md:mb-6">
          <Link href="/tournaments" className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-white/12 bg-black/20 px-3 text-[10px] font-black backdrop-blur-xl transition hover:bg-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tournament-primary)] md:min-h-[44px] md:text-xs"><ArrowRight className="h-4 w-4" /> البطولات</Link>
          <div className="flex items-center gap-2"><TournamentStatusBadge status={displayStatus} /></div>
        </div>

        <div className="grid items-center gap-4 md:grid-cols-[1fr_auto] md:gap-8">
          <div className="order-2 md:order-1">
            <div className="altahaddi-eyebrow altahaddi-glass-chip inline-flex min-h-[30px] items-center gap-1.5 rounded-full px-2.5 font-black text-white/72"><Sparkles className="h-3 w-3 text-[var(--tournament-accent)]" /> موسم مستقل داخل التحدي</div>
            <h1 className="altahaddi-display-title mt-2 max-w-3xl font-black">{tournament.name}</h1>
            {tournament.description ? <p className="altahaddi-body-copy mt-2 max-w-2xl font-semibold text-white/62 md:mt-3">{tournament.description}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black text-white/88 md:mt-5 md:text-xs">
              {tournament.hostCountry ? <div className="altahaddi-glass-chip inline-flex min-h-[36px] items-center gap-2 rounded-xl px-3"><MapPin className="h-4 w-4 text-[var(--tournament-accent)]" />{tournament.hostCountry}</div> : null}
              {dateRange ? <div className="altahaddi-glass-chip inline-flex min-h-[36px] items-center gap-2 rounded-xl px-3"><CalendarDays className="h-4 w-4 text-[var(--tournament-accent)]" /><span className="[unicode-bidi:isolate]" dir="rtl">{dateRange}</span></div> : null}
            </div>
          </div>

          <div className="order-1 flex justify-center md:order-2 md:justify-end">
            <div className="relative">
              <div className="absolute inset-0 scale-125 rounded-full bg-[var(--tournament-primary)]/12 blur-3xl" aria-hidden="true" />
              {tournament.branding.logoUrl ? <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-[24px] border border-white/16 bg-white/94 p-2.5 shadow-[0_22px_60px_rgba(0,0,0,.32)] sm:h-28 sm:w-28 md:h-40 md:w-40 md:rounded-[32px] md:p-4"><img src={tournament.branding.logoUrl} alt={`شعار ${tournament.name}`} className="h-full w-full object-contain" /></div> : <div className="relative flex h-24 w-24 items-center justify-center rounded-[24px] border border-white/15 bg-black/20 md:h-40 md:w-40"><Trophy className="h-12 w-12 text-[var(--tournament-primary)]" /></div>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
