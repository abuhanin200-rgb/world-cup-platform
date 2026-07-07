import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import MaintenanceGate from "@/components/MaintenanceGate";
import PresenceTracker from "@/components/PresenceTracker";
import SuperGoldenNotice from "@/components/SuperGoldenNotice";

const siteUrl = "https://world-cup-platform.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "منصة توقعات كأس العالم 2026",
  description: "منصة تحدي توقعات كأس العالم 2026",
  manifest: "/manifest.json",

  appleWebApp: {
    capable: true,
    title: "توقعات 2026",
    statusBarStyle: "black-translucent",
  },

  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/app-icon.png",
  },

  openGraph: {
    title: "منصة توقعات كأس العالم 2026",
    description: "منصة تحدي توقعات كأس العالم 2026",
    url: siteUrl,
    siteName: "منصة توقعات كأس العالم 2026",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "منصة توقعات كأس العالم 2026",
      },
    ],
    locale: "ar_SA",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "منصة توقعات كأس العالم 2026",
    description: "منصة تحدي توقعات كأس العالم 2026",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <AuthProvider>
          <PresenceTracker />
          <MaintenanceGate>{children}</MaintenanceGate>
        </AuthProvider>
      </body>
    </html>
  );
}