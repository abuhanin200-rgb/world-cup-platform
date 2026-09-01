export type MobileTournamentStatus = "active" | "finished" | "coming_soon";
export type MobileTournament = {
  id: "gulf27" | "wc2026" | "asian2027";
  slug: "gulf-cup-27" | "world-cup-2026" | "asian-cup-2027";
  name: string;
  country: string;
  dates: string;
  startAt: number;
  endAt: number;
  accent: string;
  logo: number;
};

export function getMobileTournamentStatus(item: MobileTournament, now = Date.now()): MobileTournamentStatus {
  if (now < item.startAt) return "coming_soon";
  if (now > item.endAt) return "finished";
  return "active";
}

export const mobileTournaments: MobileTournament[] = [
  { id: "gulf27", slug: "gulf-cup-27", name: "خليجي 27", country: "السعودية · جدة", dates: "23 سبتمبر — 6 أكتوبر 2026", startAt: Date.UTC(2026, 8, 23), endAt: Date.UTC(2026, 9, 6, 23, 59, 59, 999), accent: "#F4BC58", logo: require("../../assets/gulf-cup-27.png") },
  { id: "wc2026", slug: "world-cup-2026", name: "كأس العالم 2026", country: "الولايات المتحدة · كندا · المكسيك", dates: "11 يونيو — 19 يوليو 2026", startAt: Date.UTC(2026, 5, 11), endAt: Date.UTC(2026, 6, 19, 23, 59, 59, 999), accent: "#F08080", logo: require("../../assets/world-cup-2026.png") },
  { id: "asian2027", slug: "asian-cup-2027", name: "كأس آسيا 2027", country: "السعودية", dates: "7 يناير — 5 فبراير 2027", startAt: Date.UTC(2027, 0, 7), endAt: Date.UTC(2027, 1, 5, 23, 59, 59, 999), accent: "#F4BC58", logo: require("../../assets/asian-cup-2027.png") },
];
