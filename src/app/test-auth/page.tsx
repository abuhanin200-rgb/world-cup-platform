import { notFound } from "next/navigation";
import TestAuthClient from "./TestAuthClient";

export default function TestAuthPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <TestAuthClient />;
}
