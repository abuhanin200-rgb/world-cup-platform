import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import MaintenanceGate from "@/components/MaintenanceGate";

export const metadata: Metadata = {
  title: "منصة توقعات كأس العالم 2026",
  description: "منصة تحدي توقعات كأس العالم 2026",
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
          <MaintenanceGate>{children}</MaintenanceGate>
        </AuthProvider>
      </body>
    </html>
  );
}