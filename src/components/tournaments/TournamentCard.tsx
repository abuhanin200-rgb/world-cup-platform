import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import {
  formatTournamentDateRange,
  getTournamentHref,
  getTournamentThemeStyle,
  type Tournament,
} from "@/domain/tournaments";
import TournamentStatusBadge from "./TournamentStatusBadge";

type TournamentCardProps = {
  tournament: Tournament;
};

function getTournamentLogoSurfaceClass(tournament: Tournament): string {
  if (tournament.id === "gulf27") {
    return "bg-[#DDEEE3]/95 border-[#8FD0A3]/35";
  }

  if (tournament.id === "asian2027") {
    return "bg-[#DDEBE8]/95 border-[#8CB8AE]/35";
  }

  if (tournament.engine === "legacy_wc2026") {
    return "bg-white/95 border-white/20";
  }

  return "bg-white/90 border-white/15";
}

function getTournamentLogoImageClass(tournament: Tournament): string {
  return tournament.id === "gulf27" || tournament.id === "asian2027"
    ? "mix-blend-multiply"
    : "";
}

export default function TournamentCard({ tournament }: TournamentCardProps) {
  const dateRange = formatTournamentDateRange(tournament);
  const cover = tournament.branding.coverUrl ?? tournament.branding.heroUrl;

  return (
    <Link
      href={getTournamentHref(tournament)}
      style={getTournamentThemeStyle(tournament)}
      className="group relative isolate min-h-[250px] md:min-h-[330px] overflow-hidden rounded-[28px] border border-white/15 bg-[var(--tournament-background)] text-[var(--tournament-text)] shadow-2xl shadow-black/25 outline-none transition duration-200 hover:-translate-y-1 hover:border-white/30 focus-visible:ring-2 focus-visible:ring-[var(--tournament-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.99]"
      aria-label={`فتح بطولة ${tournament.name}`}
    >
      {cover && (
        <img
          src={cover}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/15" />
      <div
        className="absolute inset-0 opacity-25"
        style={{
          background:
            "radial-gradient(circle at 12% 12%, var(--tournament-primary), transparent 34%), radial-gradient(circle at 90% 5%, var(--tournament-accent), transparent 30%)",
        }}
      />

      <div className="relative flex min-h-[250px] md:min-h-[330px] flex-col justify-between p-4 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <TournamentStatusBadge status={tournament.status} />

          {tournament.isCurrent && (
            <span className="rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-[11px] font-black backdrop-blur-md">
              البطولة الحالية
            </span>
          )}
        </div>

        <div>
          <div className="mb-4 flex min-h-[96px] items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-1 text-xs font-bold text-white/70">منصة التحدي</p>
              <h2 className="text-2xl font-black tracking-tight md:text-4xl">
                {tournament.shortName}
              </h2>
            </div>

            {tournament.branding.logoUrl && (
              <div
                className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border p-2 shadow-xl shadow-black/20 md:h-24 md:w-24 ${getTournamentLogoSurfaceClass(
                  tournament,
                )}`}
              >
                <img
                  src={tournament.branding.logoUrl}
                  alt={`شعار ${tournament.name}`}
                  className={`h-full w-full object-contain ${getTournamentLogoImageClass(tournament)}`}
                />
              </div>
            )}
          </div>

          <div className="min-h-[52px] space-y-2 text-xs font-bold text-white/80 md:text-sm">
            {tournament.hostCountry && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{tournament.hostCountry}</span>
              </div>
            )}

            {dateRange && (
              <div className="flex items-center gap-2" dir="rtl">
                <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="[unicode-bidi:isolate]" dir="rtl">
                  {dateRange}
                </span>
              </div>
            )}
          </div>

          <div className="mt-5 flex min-h-[46px] items-center justify-between rounded-2xl border border-white/15 bg-black/30 px-4 py-3 font-black backdrop-blur-md transition group-hover:bg-black/45">
            <span>دخول البطولة</span>
            <ArrowLeft className="h-5 w-5 transition group-hover:-translate-x-1" aria-hidden="true" />
          </div>
        </div>
      </div>
    </Link>
  );
}
