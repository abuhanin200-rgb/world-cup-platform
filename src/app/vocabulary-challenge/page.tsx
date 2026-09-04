import type { Metadata } from "next";
import VocabularyChallengeGame from "@/components/vocabulary-challenge/VocabularyChallengeGame";

export const metadata: Metadata = {
  title: "تحدي المفردات",
  description: "غيّر حرفًا واحدًا لتصنع كلمة عربية صحيحة، وتخلّص من بطاقاتك قبل انتهاء الوقت.",
};

export default function VocabularyChallengePage() {
  return <VocabularyChallengeGame />;
}
