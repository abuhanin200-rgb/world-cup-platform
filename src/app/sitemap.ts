import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://world-cup-platform.vercel.app";

const routes = [
  "",
  "/tournaments",
  "/tournaments/gulf-cup-27",
  "/tournaments/gulf-cup-27/matches",
  "/tournaments/gulf-cup-27/leaderboard",
  "/tournaments/gulf-cup-27/studio",
  "/tournaments/world-cup-2026",
  "/tournaments/asian-cup-2027",
  "/games",
  "/word-game",
  "/flag-memory",
  "/ten-seconds-challenge",
  "/rules",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return routes.map((route, index) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: index === 0 ? "daily" : "weekly",
    priority: index === 0 ? 1 : route.startsWith("/tournaments/gulf-cup-27") ? 0.9 : 0.7,
  }));
}
