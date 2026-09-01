import { BarChart3, ListChecks, Newspaper, ScrollText, Sparkles, Trophy } from "lucide-react";
import type { Tournament, TournamentSection } from "@/domain/tournaments";

const COPY: Record<TournamentSection, { title: string; eyebrow: string; description: string; icon: typeof Trophy }> = {
  matches: { title: "المباريات", eyebrow: "مركز المباريات", description: "المواعيد والنتائج وحالة المواجهات في مكان واحد.", icon: ListChecks },
  predictions: { title: "توقعاتي", eyebrow: "مساحة التوقع", description: "تابع اختياراتك ونقاطك ونتيجة احتساب كل توقع.", icon: Trophy },
  leaderboard: { title: "الترتيب", eyebrow: "سباق الصدارة", description: "شاهد ترتيب المنافسين وموقعك داخل البطولة.", icon: BarChart3 },
  studio: { title: "الاستوديو", eyebrow: "تغطية البطولة", description: "الأخبار والتحليلات وأبرز ما يحدث حول المنافسة.", icon: Newspaper },
  rules: { title: "القوانين", eyebrow: "قواعد المنافسة", description: "نظام البطولة وقواعد التوقع والاحتساب بشكل واضح.", icon: ScrollText },
};

export default function TournamentSectionHeader({ tournament, section }: { tournament: Tournament; section: TournamentSection }) {
  const copy = COPY[section];
  const Icon = copy.icon;
  return (
    <div className="mx-auto max-w-7xl px-3 pt-4 sm:px-4 md:px-6 md:pt-6">
      <section className="relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.04] px-4 py-4 md:rounded-[28px] md:px-5 md:py-5">
        <div className="absolute inset-y-0 right-0 w-1 bg-[var(--tournament-primary)]" />
        <div className="absolute -left-10 -top-16 h-36 w-36 rounded-full bg-[var(--tournament-primary)]/10 blur-3xl" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.07] text-[var(--tournament-primary)]"><Icon className="h-5 w-5" /></div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[9px] font-black text-[var(--tournament-accent)] md:text-[10px]"><Sparkles className="h-3 w-3" />{copy.eyebrow}</div>
            <h2 className="mt-0.5 text-xl font-black md:text-2xl">{copy.title} <span className="text-white/28">·</span> <span className="text-sm text-white/45 md:text-base">{tournament.shortName}</span></h2>
            <p className="mt-1 text-[10px] font-semibold text-white/45 md:text-xs">{copy.description}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
