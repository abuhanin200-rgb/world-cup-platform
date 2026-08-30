import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "altahaddi-web",
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
      integrations: {
        apiFootballConfigured: Boolean(process.env.API_FOOTBALL_KEY),
        cronConfigured: Boolean(process.env.CRON_SECRET),
        openAiConfigured: Boolean(
          process.env.OPENAI_API_KEY &&
            process.env.OPENAI_API_KEY !== "[PUT_OPENAI_API_KEY_HERE]",
        ),
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
