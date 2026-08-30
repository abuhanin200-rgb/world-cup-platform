import { CalendarClock } from "lucide-react";
import type { Tournament, TournamentSection } from "@/domain/tournaments";

const LABELS: Record<TournamentSection, string> = { matches: "المباريات", predictions: "توقعاتي", leaderboard: "الترتيب", studio: "الاستوديو", rules: "القوانين" };
export default function TournamentSectionPlaceholder({ tournament, section }: { tournament: Tournament; section: TournamentSection }) {
  return <div className="mx-auto max-w-7xl px-3 pb-12 sm:px-4 md:px-6"><div className="rounded-[22px] border border-white/10 bg-white/[0.055] p-6 text-center md:rounded-[28px] md:p-9"><CalendarClock className="mx-auto h-8 w-8 text-[var(--tournament-primary)]" aria-hidden="true" /><h2 className="mt-3 text-xl font-black md:text-2xl">{LABELS[section]}</h2><p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-7 text-white/55">سيظهر محتوى {LABELS[section]} الخاص بـ{tournament.shortName} هنا عند توفر بيانات البطولة وبدء فعالياتها.</p></div></div>;
}
