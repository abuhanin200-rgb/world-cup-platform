import type { Metadata } from "next";
import { Flag } from "lucide-react";
import GamePageShell from "@/components/games/GamePageShell";
import FlagMemoryGame from "@/components/flag-memory/FlagMemoryGame";

export const metadata: Metadata = { title: "تحدي الأعلام", description: "طابق أعلام المنتخبات بأقل وقت وأقل عدد من الأخطاء." };

export default function FlagMemoryPage() {
  return (
    <GamePageShell
      eyebrow="ذاكرة وتركيز"
      title="تحدي الأعلام"
      description="طابق أعلام المنتخبات بأقل وقت وأقل عدد من الأخطاء."
      icon={<Flag className="h-6 w-6" />}
      visual={<div className="grid grid-cols-2 gap-2" aria-hidden="true">{["sa", "jp", "ar", "ma"].map((code) => <span key={code} className="grid h-12 w-14 place-items-center rounded-xl border border-white/10 bg-white/[0.06] p-2"><img src={`/flags/${code}.svg`} alt="" className="h-full w-full rounded object-cover" /></span>)}</div>}
    >
      <FlagMemoryGame />
    </GamePageShell>
  );
}
