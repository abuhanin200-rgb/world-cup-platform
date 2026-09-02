import type { Metadata } from "next";
import { TimerReset } from "lucide-react";
import GamePageShell from "@/components/games/GamePageShell";
import TenSecondsChallengeGame from "@/components/TenSecondsChallengeGame";

export const metadata: Metadata = { title: "تحدي العشر ثواني", description: "أوقف المؤقت عند 10.000 بالضبط وسجّل محاولاتك اليومية وXP." };

export default function TenSecondsChallengePage() {
  return (
    <GamePageShell
      eyebrow="دقة التوقيت"
      title="تحدي العشر ثواني"
      description="أوقف المؤقت عند 10.000 بالضبط. كل جزء من الثانية يفرق."
      icon={<TimerReset className="h-6 w-6" />}
      visual={<div dir="ltr" className="rounded-2xl border border-[var(--brand-yellow)]/20 bg-black/20 px-5 py-3 text-3xl font-black tabular-nums text-[var(--brand-yellow)]">10.000</div>}
    >
      <TenSecondsChallengeGame />
    </GamePageShell>
  );
}
