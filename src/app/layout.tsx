import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import MaintenanceGate from "@/components/MaintenanceGate";
import PresenceTracker from "@/components/PresenceTracker";
import SuperGoldenNotice from "@/components/SuperGoldenNotice";
import PlatformChrome from "@/components/PlatformChrome";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://world-cup-platform.vercel.app";
const brandName = "التحدي";
const brandDescription = "منصة رياضية للتوقعات والبطولات والألعاب والتحديات.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${brandName} | توقعات وبطولات وألعاب`, template: `%s | ${brandName}` },
  description: brandDescription,
  applicationName: brandName,
  manifest: "/manifest.json",
  keywords: ["التحدي", "توقعات كرة القدم", "خليجي 27", "كأس العالم 2026", "كأس آسيا 2027", "ألعاب رياضية"],
  authors: [{ name: "منصة التحدي" }],
  creator: "منصة التحدي",
  publisher: "منصة التحدي",
  formatDetection: { telephone: false, address: false, email: false },
  appleWebApp: { capable: true, title: brandName, statusBarStyle: "black-translucent" },
  icons: { icon: [{ url: "/favicon.png", type: "image/png" }, { url: "/app-icon-192.png", sizes: "192x192", type: "image/png" }], shortcut: "/favicon.png", apple: "/apple-touch-icon.png" },
  openGraph: { title: `${brandName} | توقعات وبطولات وألعاب`, description: brandDescription, url: siteUrl, siteName: brandName, images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "منصة التحدي" }], locale: "ar_SA", type: "website" },
  twitter: { card: "summary_large_image", title: `${brandName} | توقعات وبطولات وألعاب`, description: brandDescription, images: ["/og-image.png"] },
};

export const viewport: Viewport = { themeColor: "#061A4D", width: "device-width", initialScale: 1, viewportFit: "cover", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <AuthProvider>
          <PresenceTracker />
          <MaintenanceGate><PlatformChrome>{children}</PlatformChrome></MaintenanceGate>
          <SuperGoldenNotice />
        </AuthProvider>
      </body>
    </html>
  );
}
