import { Target } from "lucide-react";
import GamePageShell from "@/components/games/GamePageShell";
import WordGame from "@/components/word-game/WordGame";

export default function WordGamePage() {
  return (
    <GamePageShell
      eyebrow="تحدي اليوم"
      title="خمن كلمة اليوم"
      description="ست محاولات فقط لاكتشاف كلمة رياضية واحدة قبل نهاية اليوم."
      icon={<Target className="h-6 w-6" />}
      visual={<div className="flex gap-1.5" dir="ltr">{["ت","ح","د","ي"].map((letter) => <span key={letter} className="grid h-11 w-11 place-items-center rounded-xl border border-white/12 bg-white/[0.06] text-lg font-black text-white">{letter}</span>)}</div>}
    >
      <WordGame />
    </GamePageShell>
  );
}
