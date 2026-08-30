import type { Metadata } from "next";
import GamesHub from "@/components/GamesHub";

export const metadata: Metadata = {
  title: "الألعاب والتحديات | التحدي",
  description: "الألعاب والتحديات الرياضية في منصة التحدي مع مستويات ونقاط خبرة وترتيب عام.",
};

export default function GamesPage() {
  return <GamesHub />;
}
