import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "منصة توقعات كأس العالم 2026",
  description: "المنصة الرسمية التفاعلية للجماهير - إطلاق تجريبي",
  // 🏆 كود حقن الأيقونة والشعار للواتساب والمتصفحات
  icons: {
    icon: "/wc2026-logo.png",
    apple: "/wc2026-logo.png",
  },
  openGraph: {
    title: "منصة توقعات كأس العالم 2026",
    description: "المنصة الرسمية التفاعلية للجماهير - إطلاق تجريبي",
    images: [
      {
        url: "/wc2026-logo.png", // الصورة اللي تظهر في كرت الرابط بالواتساب
        width: 512,
        height: 512,
        alt: "FIFA 2026 Logo",
      },
    ],
  },
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