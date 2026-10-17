import type { Metadata } from "next";
import { Archive, Sparkles, Trophy } from "lucide-react";
import TournamentCard from "@/components/tournaments/TournamentCard";
import { getTournamentDisplayStatus, tournamentService } from "@/domain/tournaments";
import { withLiveGulfCup27Status } from "@/lib/serverTournamentPublicStatus";

export const metadata: Metadata = { title: "البطولات", description: "استعرض بطولات منصة التحدي الحالية والمنتهية والقادمة." };

export default async function TournamentsPage() {
  const tournaments = await Promise.all((await tournamentService.list()).map(withLiveGulfCup27Status));
  const visible = tournaments.filter((t) => t.status !== "hidden" && t.status !== "draft");
  const archived = visible.filter((t) => getTournamentDisplayStatus(t) === "finished");
  const upcomingAndActive = visible.filter((t) => getTournamentDisplayStatus(t) !== "finished");
  return (
    <main dir="rtl" className="mx-auto max-w-7xl px-3 pb-12 pt-4 sm:px-4 md:px-6 md:pb-16 md:pt-7">
      <section className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#071d54] p-5 md:rounded-[36px] md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_12%,rgba(255,194,16,.16),transparent_28%),radial-gradient(circle_at_10%_85%,rgba(56,113,255,.16),transparent_32%)]" />
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 select-none text-[150px] font-black text-white/[0.025] md:text-[220px]" aria-hidden="true">03</div>
        <div className="relative grid items-end gap-5 md:grid-cols-[1fr_auto]">
          <div><div className="altahaddi-eyebrow inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-[#ffc210]/20 bg-[#ffc210]/[0.08] px-2.5 font-black text-[#ffc210]"><Trophy className="h-3.5 w-3.5" /> بطولات التحدي</div><h1 className="altahaddi-display-title mt-2 font-black">كل بطولة لها عالمها.</h1><p className="altahaddi-body-copy mt-2 max-w-2xl font-semibold text-white/48">اختر الموسم، ادخل إلى مبارياته وتوقعاته وترتيبه، واحتفظ بتاريخك في كل بطولة بشكل مستقل.</p></div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs font-black text-white/55 backdrop-blur-xl"><Sparkles className="h-4 w-4 text-[#ffc210]" /><span dir="ltr">{visible.length}</span> مواسم</div>
        </div>
      </section>
      {upcomingAndActive.length > 0 ? (
        <section className="mt-6" aria-label="البطولات الحالية والقادمة">
          <h2 className="mb-3 text-lg font-black text-white">البطولات الحالية والقادمة</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4">{upcomingAndActive.map((t) => <TournamentCard key={t.id} tournament={t} />)}</div>
        </section>
      ) : null}
      {archived.length > 0 ? (
        <section className="mt-7" aria-label="سجل البطولات المنتهية">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-white"><Archive className="h-5 w-5 text-[#ffc210]" /> سجل البطولات المنتهية</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4">{archived.map((t) => <TournamentCard key={t.id} tournament={t} />)}</div>
        </section>
      ) : null}
    </main>
  );
}
