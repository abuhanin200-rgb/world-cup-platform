import type { CSSProperties } from "react";
import type { Tournament } from "./types";

export type TournamentThemeStyle = CSSProperties & {
  "--tournament-primary": string;
  "--tournament-secondary": string;
  "--tournament-accent": string;
  "--tournament-background": string;
  "--tournament-card": string;
  "--tournament-text": string;
};

export function getTournamentThemeStyle(
  tournament: Tournament,
): TournamentThemeStyle {
  return {
    "--tournament-primary": tournament.branding.primaryColor ?? "#22D3EE",
    "--tournament-secondary": tournament.branding.secondaryColor ?? "#FBBF24",
    "--tournament-accent": tournament.branding.accentColor ?? "#3B82F6",
    "--tournament-background":
      tournament.branding.backgroundColor ?? "#020617",
    "--tournament-card": tournament.branding.cardColor ?? "#0F172A",
    "--tournament-text": tournament.branding.textColor ?? "#F8FAFC",
  };
}

export function formatTournamentDateRange(tournament: Tournament): string | null {
  if (!tournament.startAt && !tournament.endAt) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  if (tournament.startAt && tournament.endAt) {
    return `${formatter.format(new Date(tournament.startAt))} — ${formatter.format(
      new Date(tournament.endAt),
    )}`;
  }

  const timestamp = tournament.startAt ?? tournament.endAt;
  return timestamp ? formatter.format(new Date(timestamp)) : null;
}
