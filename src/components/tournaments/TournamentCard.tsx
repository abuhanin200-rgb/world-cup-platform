import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin, Sparkles } from "lucide-react";
import {
  formatTournamentDateRange,
  getTournamentDisplayStatus,
  getTournamentHref,
  getTournamentThemeStyle,
  type Tournament,
} from "@/domain/tournaments";
import TournamentStatusBadge from "./TournamentStatusBadge";

type TournamentCardProps = { tournament: Tournament };

function seasonMark(tournament: Tournament) {
  if (tournament.slug === "world-cup-2026") return "26";
  if (tournament.slug === "gulf-cup-27") return "27";
  if (tournament.slug === "asian-cup-2027") return "27";
  return "•";
}

function fallbackBackground(tournament: Tournament) {
  if (tournament.slug === "world-cup-2026") {
    return "radial-gradient(circle at 18% 18%, rgba(34,211,238,.24), transparent 31%), radial-gradient(circle at 85% 75%, rgba(59,130,246,.28), transparent 36%), linear-gradient(135deg,#030712 0%,#08122f 45%,#10193e 100%)";
  }
  return "linear-gradient(135deg,var(--tournament-background),color-mix(in srgb,var(--tournament-primary) 18%,var(--tournament-background)))";
}

export default function TournamentCard({ tournament }: TournamentCardProps) {
  const dateRange = formatTournamentDateRange(tournament);
  const cover = tournament.branding.coverUrl ?? tournament.branding.heroUrl;
  const status = getTournamentDisplayStatus(tournament);

  return (
    <Link
      href={getTournamentHref(tournament)}
      style={{ ...getTournamentThemeStyle(tournament), background: fallbackBackground(tournament) }}
      className="altahaddi-glass group relative isolate min-h-[280px] overflow-hidden rounded-[28px] text-[var(--tournament-text)] outline-none transition duration-300 hover:-translate-y-1 hover:border-white/25 focus-visible:ring-2 focus-visible:ring-[var(--tournament-primary)] active:scale-[0.99] md:min-h-[360px] md:rounded-[34px]"
      aria-label={`فتح بطولة ${tournament.name}`}
    >
      {cover ? <img src={cover} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]" /> : null}
      <div className="absolute inset-0 bg-gradient-to-t from-[#020817]/95 via-[#03102a]/58 to-black/12" />
      <div className="absolute inset-0 opacity-50" style={{ background: "radial-gradient(circle at 82% 10%,var(--tournament-primary),transparent 31%)" }} />
      <div className="absolute -left-8 top-1/2 -translate-y-1/2 select-none text-[150px] font-black leading-none text-white/[0.035] md:text-[210px]" aria-hidden="true">{seasonMark(tournament)}</div>

      <div className="relative flex min-h-[280px] flex-col justify-between p-4 md:min-h-[360px] md:p-5">
        <div className="flex items-start justify-between gap-2">
          <TournamentStatusBadge status={status} />
          <span className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-white/12 bg-black/20 px-2.5 text-[9px] font-black text-white/70 backdrop-blur-xl md:text-[10px]"><Sparkles className="h-3 w-3 text-[var(--tournament-accent)]" /> موسم التحدي</span>
        </div>

        <div>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="altahaddi-eyebrow font-black text-white/48">بطولات التحدي</p>
              <h2 className="altahaddi-feature-title mt-1 font-black">{tournament.shortName}</h2>
            </div>
            {tournament.branding.logoUrl ? (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-white/15 bg-white/92 p-2 shadow-2xl md:h-20 md:w-20 md:rounded-[24px]">
                <img src={tournament.branding.logoUrl} alt={`شعار ${tournament.name}`} className="h-full w-full object-contain" />
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 text-[10px] font-black text-white/86 md:text-xs">
            {tournament.hostCountry ? <span className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.08] px-2.5 backdrop-blur-xl"><MapPin className="h-3.5 w-3.5 text-[var(--tournament-accent)]" />{tournament.hostCountry}</span> : null}
            {dateRange ? <span className="inline-flex min-h-[34px] items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.08] px-2.5 backdrop-blur-xl"><CalendarDays className="h-3.5 w-3.5 text-[var(--tournament-accent)]" /><span className="[unicode-bidi:isolate]" dir="rtl">{dateRange}</span></span> : null}
          </div>

          <div className="mt-4 flex min-h-[46px] items-center justify-between rounded-2xl border border-white/12 bg-black/24 px-3.5 text-xs font-black backdrop-blur-xl transition group-hover:bg-black/38 md:text-sm">
            <span>دخول البطولة</span><ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}
