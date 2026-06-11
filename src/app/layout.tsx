import "./globals.css";
import Navbar from "@/components/ui/Navbar";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata = {
  title: "تحدي توقعات كأس العالم 2026",
  description: "منصة توقعات مباريات كأس العالم 2026",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-slate-950 text-white min-h-screen flex flex-col justify-between">
        <ThemeProvider>
          <AuthProvider>
            
            {/* القائمة العلوية الثابتة (Navbar) */}
            <Navbar />
            
            {/* محتوى الصفحات المتغير (Main Content) */}
            <main className="container mx-auto px-4 py-8 flex-grow">
              {children}
            </main>
            
            {/* 📥 الفوتر الاحترافي الموحد لجميع صفحات المنصة */}
            <footer className="w-full mt-20 border-t-4 border-brand-purple bg-gradient-to-b from-slate-900 to-black text-white relative overflow-hidden">
              {/* تأثير خلفية خافت لإضافة عمق فني */}
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>
              
              <div className="container mx-auto px-6 py-8 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                
                {/* القسم الأيمن: الحقوق العامة وسنة التحديث تلقائياً */}
                <div className="flex flex-col items-center sm:items-start gap-1 text-center sm:text-right">
                  <span className="text-sm font-black tracking-tight text-white/90">تحدي توقعات كأس العالم 2026</span>
                  <p className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5">
                    <span>© {new Date().getFullYear()} جميع الحقوق محفوظة </span>
                    <span className="text-brand-pink/60">•</span>
                    <span>النسخة التجريبية V1.0</span>
                  </p>
                </div>

                {/* القسم الأيسر: الإمضاء الاحترافي العريض والواضح */}
                <div className="flex items-center gap-4 bg-slate-800/40 p-4 rounded-2xl border border-white/5 backdrop-blur-sm shadow-inner group transition-all hover:border-brand-gold/30 hover:bg-slate-800/60">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand-purple to-brand-pink rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-lg group-hover:rotate-6 transition-transform">
                    {/* الحرف الأول من اسمك الكريم كشعار مصغر */}
                    ع
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-slate-400">فكرة وتطوير</span>
                    <span className="text-xl font-black text-white group-hover:text-brand-gold transition-colors">
                      عبدالسلام <span className="text-brand-gold">العنزي</span>
                    </span>
                  </div>
                </div>

              </div>
            </footer>

          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}