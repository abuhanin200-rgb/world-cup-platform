import type { Metadata } from "next";
import PlatformHome from "@/components/PlatformHome";

export const metadata: Metadata = {
  title: { absolute: "التحدي | توقعات وبطولات وألعاب" },
  description:
    "التحدي منصة رياضية دائمة للتوقعات والبطولات والألعاب والتحديات الرياضية.",
};

export default function HomePage() {
  return <PlatformHome />;
}
