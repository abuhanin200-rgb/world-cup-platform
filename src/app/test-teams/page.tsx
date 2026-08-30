import { notFound } from "next/navigation";
import TestTeamsClient from "./TestTeamsClient";

export default function TestTeamsPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <TestTeamsClient />;
}
