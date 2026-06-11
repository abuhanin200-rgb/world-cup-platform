import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "منصة توقعات كأس العالم 2026",
  description: "المنصة الرسمية التفاعلية للجماهير - إطلاق تجريبي",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" 
        />
      </head>
      <body>{children}</body>
    </html>
  );
}