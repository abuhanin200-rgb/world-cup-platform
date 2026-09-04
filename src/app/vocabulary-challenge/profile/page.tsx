import type { Metadata } from "next";
import VocabularyProfilePage from "@/components/vocabulary-challenge/VocabularyProfilePage";

export const metadata: Metadata = {
  title: "ملف تحدي المفردات",
  description: "إحصائيات وإنجازات اللاعب في تحدي المفردات.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <VocabularyProfilePage />;
}
