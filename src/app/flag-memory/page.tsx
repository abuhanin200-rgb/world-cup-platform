import { Flag } from "lucide-react";
import GamePageShell from "@/components/games/GamePageShell";
import FlagMemoryGame from "@/components/flag-memory/FlagMemoryGame";

export default function FlagMemoryPage() {
  return (
    <GamePageShell
      eyebrow="ذاكرة وتركيز"
      title="تحدي الأعلام"
      description="طابق أعلام المنتخبات بأقل وقت وأقل عدد من الأخطاء."
      icon={<Flag className="h-6 w-6" />}
      visual={<div className="grid grid-cols-2 gap-2 text-2xl" aria-hidden="true"><span className="grid h-12 w-14 place-items-center rounded-xl bg-white/[0.06]">🇸🇦</span><span className="grid h-12 w-14 place-items-center rounded-xl bg-white/[0.06]">🇯🇵</span><span className="grid h-12 w-14 place-items-center rounded-xl bg-white/[0.06]">🇦🇷</span><span className="grid h-12 w-14 place-items-center rounded-xl bg-white/[0.06]">🇲🇦</span></div>}
    >
      <FlagMemoryGame />
    </GamePageShell>
  );
}
