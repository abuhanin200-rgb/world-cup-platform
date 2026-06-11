import "./globals.css";

export const metadata = {
  title: "تحدي توقعات كأس العالم 2026",
  description: "أضخم منصة توقعات جماهيرية لعام 2026",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased">
        {/* هنا يعرض محتوى الصفحات تلقائياً بدون أي فوتر مكرر بالأسفل */}
        {children}
      </body>
    </html>
  );
}