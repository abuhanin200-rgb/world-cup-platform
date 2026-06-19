export function getMakkahNow(): Date {
  const now = new Date();

  const makkahString = now.toLocaleString("en-US", {
    timeZone: "Asia/Riyadh",
  });

  return new Date(makkahString);
}

export function getMakkahDateKey(date: Date = getMakkahNow()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getTodayMakkahKey(): string {
  return getMakkahDateKey(getMakkahNow());
}

export function getTomorrowMakkahKey(): string {
  const makkahNow = getMakkahNow();
  makkahNow.setDate(makkahNow.getDate() + 1);

  return getMakkahDateKey(makkahNow);
}

export function getSecondsUntilMakkahTomorrow(): number {
  const makkahNow = getMakkahNow();

  const tomorrow = new Date(makkahNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const diffMs = tomorrow.getTime() - makkahNow.getTime();

  return Math.max(0, Math.floor(diffMs / 1000));
}

export function formatCountdown(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(secs).padStart(2, "0"),
  ].join(":");
}