import type { CSSProperties } from "react";
import type { Tournament, TournamentStatus } from "./types";

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

/**
 * الحالة البصرية العامة للبطولة.
 *
 * تبقى tournament.status هي الحالة التشغيلية المستخدمة في الـEngine والإدارة،
 * بينما الواجهات العامة تعتمد تاريخ البداية والنهاية حتى لا تظهر بطولة مستقبلية
 * كأنها جارية فقط لأن محركها مفعّل تشغيليًا.
 */
export function getTournamentDisplayStatus(
  tournament: Tournament,
  now: number = Date.now(),
): TournamentStatus {
  if (
    tournament.status === "hidden" ||
    tournament.status === "draft" ||
    tournament.status === "paused" ||
    tournament.status === "registration_open"
  ) {
    return tournament.status;
  }

  if (tournament.startAt != null && now < tournament.startAt) {
    return "coming_soon";
  }

  if (tournament.endAt != null && now > tournament.endAt) {
    return "finished";
  }

  if (tournament.startAt != null && now >= tournament.startAt) {
    return "active";
  }

  return tournament.status;
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
