export const TOURNAMENT_TIME_ZONE = "Asia/Riyadh" as const;
export const RIYADH_UTC_OFFSET = "+03:00" as const;
export const TOURNAMENT_PREDICTION_OPEN_LEAD_MS = 72 * 60 * 60 * 1000;

/** Converts an explicit Riyadh wall-clock ISO value into an absolute timestamp. */
export function riyadhTimestamp(localIso: string) {
  const normalized = localIso.trim();
  const withOffset = /(?:Z|[+-]\d{2}:\d{2})$/.test(normalized)
    ? normalized
    : `${normalized}${RIYADH_UTC_OFFSET}`;
  const timestamp = new Date(withOffset).getTime();
  if (!Number.isFinite(timestamp)) {
    throw new Error(`INVALID_RIYADH_DATETIME:${localIso}`);
  }
  return timestamp;
}

export function predictionWindowForKickoff(
  kickoffAt: number,
  leadMs = TOURNAMENT_PREDICTION_OPEN_LEAD_MS,
) {
  return {
    predictionOpensAt: kickoffAt - leadMs,
    predictionClosesAt: kickoffAt,
  };
}
