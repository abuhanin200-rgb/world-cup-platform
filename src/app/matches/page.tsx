"use client";

import { useState } from "react";

// قائمة المنتخبات المشاركة بكأس العالم 2026 مع الأعلام
const WORLD_CUP_TEAMS = [
  { code: "SA", name: "السعودية", emoji: "🇸🇦" },
  { code: "MA", name: "المغرب", emoji: "🇲🇦" },
  { code: "EG", name: "مصر", emoji: "🇪🇬" },
  { code: "AE", name: "الإمارات", emoji: "🇦🇪" },
  { code: "QA", name: "قطر", emoji: "🇶🇦" },
  { code: "US", name: "الولايات المتحدة", emoji: "🇺🇸" },
  { code: "MX", name: "المكسيك", emoji: "🇲🇽" },
  { code: "CA", name: "كندا", emoji: "🇨🇦" },
  { code: "AR", name: "الأرجنتين", emoji: "🇦🇷" },
  { code: "BR", name: "البرازيل", emoji: "🇧🇷" },
  { code: "FR", name: "فرنسا", emoji: "🇫🇷" },
  { code: "ES", name: "إسبانيا", emoji: "🇪🇸" },
];

// قائمة مفاتيح الاتصال والدول
const COUNTRIES = [
  { code: "SA", name: "المملكة العربية السعودية", dialCode: "+966", flag: "🇸🇦" },
  { code: "KW", name: "الكويت", dialCode: "+965", flag: "🇰🇼" },
  { code: "AE", name: "الإمارات العربية المتحدة", dialCode: "+971", flag: "🇦🇪" },
  { code: "QA", name: "قطر", dialCode: "+974", flag: "🇶🇦" },
  { code: "BH", name: "البحرين", dialCode: "+973", flag: "🇧🇭" },
  { code: "OM", name: "عُمان", dialCode: "+968", flag: "🇴🇲" },
  { code: "EG", name: "مصر", dialCode: "+20", flag: "🇪🇬" },
  { code: "MA", name: "المغرب", dialCode: "+212", flag: "🇲🇦" },
];

export default function HomePage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "",
    countryCode: "+966",
    phone: "",
    residence: "المملكة العربية السعودية",
    favoriteTeam: "",
  });

  const [chatMessage, setChatMessage] = useState("");
  const [chatList, setChatList] = useState([
    { user: "أحمد العتيبي", text: "توقعي الأرجنتين بتكتسح اليوم 💥" },
    { user: "سلطان الشمري", text: "يا شباب صقورنا قدها إن شاء الله 🇸🇦⚽" },
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    setChatList([...chatList, { user: formData.fullName || "زائر", text: chatMessage }]);
    setChatMessage("");
  };

  return (
    // استخدام dir="rtl" لضبط المحاذاة الافتراضية للغة العربية بالكامل
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-purple-200 text-right">
      
      {/* 1. الهيدر المشترك المتجاوب (زي سلة) */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* اليمين: الشعار والاسم */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative w-8 h-8 md:w-9 md:h-9 flex-shrink-0">
              <img 
                src="/wc2026-logo.png" 
                alt="شعار كأس العالم 2026" 
                className="object-contain w-full h-full" 
                onError={(e) => { e.currentTarget.src = "🏆"; }} 
              />
            </div>
            <h1 className="text-sm md:text-lg font-bold bg-gradient-to-r from-purple-800 to-indigo-600 bg-clip-text text-transparent truncate max-w-[180px] sm:max-w-none">
              تحدي توقعات كأس العالم 2026
            </h1>
          </div>

          {/* اليسار: الحساب / تسجيل الدخول */}
          <div>
            {isLoggedIn ? (
              <div className="bg-purple-50 text-purple-700 px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-medium text-xs md:text-sm">
                أهلاً، {formData.fullName || "المستخدم"}
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs md:text-sm font-semibold px-3 py-2 md:px-5 md:py-2.5 rounded-xl transition-all shadow-sm shadow-purple-200"
              >
                الدخول / التسجيل
              </button>
            )}
          </div>
        </div>
      </header>

      {/* المحتوى العام للمنصة */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        
        {/* البانر الرئيسي المحمس (متجاوب الحجم تماماً) */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-950 text-white rounded-2xl md:rounded-3xl p-5 sm:p-8 md:p-12 shadow-xl mb-6 md:mb-10 text-center flex flex-col items-center justify-center">
          <div className="absolute top-0 left-0 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <span className="bg-purple-500/20 text-purple-300 text-[10px] md:text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full border border-purple-500/30 mb-3 inline-block">
            🏆 أضخم منصة توقعات جماهيرية لعام 2026
          </span>
          <h2 className="text-lg sm:text-2xl md:text-4xl font-extrabold mb-3 leading-snug max-w-2xl">
            سجل توقعاتك الدقيقة للمباريات، اجمع النقاط، ونافس على صدارة المجموعات الكبرى!
          </h2>
          <p className="text-slate-300 text-xs md:text-base max-w-xl mb-5 md:mb-6">
            شاهد البث المباشر، تفاعل مع الجمهور في الشات الفوري، وكن أنت ملك التوقعات القادم.
          </p>
          {!isLoggedIn && (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-white text-purple-950 hover:bg-purple-50 font-bold px-5 py-2.5 md:px-7 md:py-3 rounded-xl transition-all shadow-lg text-xs md:text-sm"
            >
              شارك التحدي وابدأ التوقع الآن 🔥
            </button>
          )}
        </div>

        {/* تقسيم شبكة العرض (Grid): 3 أعمدة على الكمبيوتر، وعمود واحد على الجوال */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
          
          {/* الجانب الأيمن (عمودين على الكمبيوتر وعام على الجوال): ويشمل المباريات والإحصاءات */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            
            {/* قسم البث والمباريات الحية */}
            <section className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                <h3 className="font-bold text-sm md:text-lg text-slate-900 flex items-center gap-2">
                  <span>📺</span> مباريات اليوم والبث المباشر
                </h3>
                <span className="flex items-center gap-1.5 bg-red-50 text-red-600 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold animate-pulse">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span> مباشر الآن
                </span>
              </div>
              
              {/* شاشة البث الافتراضية المتجاوبة */}
              <div className="aspect-video bg-slate-900 rounded-xl mb-4 relative flex items-center justify-center text-slate-400 text-xs md:text-sm p-4 text-center border border-slate-800">
                <p>شاشة البث المباشر ستظهر هنا عند بدء المباراة ⚽📺</p>
              </div>

              {/* بطاقة عرض المباراة الحية */}
              <div className="space-y-2">
                <div className="bg-slate-50 hover:bg-slate-100/70 p-3 md:p-4 rounded-xl border border-slate-100 flex items-center justify-between text-center text-xs md:text-sm font-bold transition-all">
                  <div className="flex-1 flex items-center justify-center gap-1">🇸🇦 السعودية</div>
                  <div className="px-3 py-1 bg-purple-100 text-purple-800 text-[10px] md:text-xs rounded-lg">20:00</div>
                  <div className="flex-1 flex items-center justify-center gap-1">🇦🇷 الأرجنتين</div>
                </div>
              </div>
            </section>

            {/* صف فرعي: ينقسم لعمودين على الكمبيوتر وينفرد على الجوال */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* لوحة الصدارة */}
              <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100">
                <h3 className="font-bold text-sm md:text-base text-slate-900 mb-3 border-b border-slate-50 pb-2">
                  🥇 لوحة الصدارة المؤقتة
                </h3>
                <div className="space-y-2 text-xs md:text-sm">
                  <div className="flex justify-between items-center bg-yellow-50/50 p-2.5 rounded-xl border border-yellow-100">
                    <span className="font-bold">🥇 1. عبدالسلام العنزي</span>
                    <span className="font-mono bg-yellow-100 px-2 py-0.5 rounded text-[10px] font-bold text-yellow-800">145 نقطة</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-xl border border-slate-100">
                    <span className="font-medium">🥈 2. فيصل الحربي</span>
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-600">130 نقطة</span>
                  </div>
                </div>
              </div>

              {/* توقعات الجماهير */}
              <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100">
                <h3 className="font-bold text-sm md:text-base text-slate-900 mb-3 border-b border-slate-50 pb-2">
                  📊 أعلى توقعات الجماهير للبطل
                </h3>
                <div className="space-y-3 text-xs md:text-sm">
                  <div>
                    <div className="flex justify-between mb-1 text-[10px] text-slate-500">
                      <span>🇸🇦 السعودية</span>
                      <span>42%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-purple-600 h-full rounded-full" style={{ width: "42%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-[10px] text-slate-500">
                      <span>🇦🇷 الأرجنتين</span>
                      <span>28%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: "28%" }}></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* الجانب الأيسر (عمود كامل ومثبت على الكمبيوتر، وينزل تحت بالترتيب على الجوال) */}
          <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100 lg:sticky lg:top-24 h-[450px] md:h-[520px] flex flex-col justify-between">
            <div className="overflow-hidden flex flex-col h-full">
              <h3 className="font-bold text-sm md:text-lg text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-3 mb-3 flex-shrink-0">
                <span>💬</span> دردشة الجمهور الحية
              </h3>
              
              {/* منطقة الرسائل بالتمرير الذكي */}
              <div className="space-y-2.5 overflow-y-auto flex-1 pl-1 text-xs md:text-sm">
                {chatList.map((msg, i) => (
                  <div key={i} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="block font-bold text-[10px] text-purple-700 mb-0.5">{msg.user}</span>
                    <p className="text-slate-700 leading-relaxed">{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* صندوق إدخال الرسالة السفلي للشات */}
            <form onSubmit={handleSendMessage} className="mt-3 flex gap-2 border-t border-slate-100 pt-3 flex-shrink-0">
              <button type="submit" className="bg-purple-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs md:text-sm hover:bg-purple-700 transition-colors">
                إرسال
              </button>
              <input 
                type="text" 
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="اكتب رسالتك هنا للجمهور..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
              />
            </form>
          </div>

        </div>
      </main>

      {/* 🔐 مودال التسجيل المنبثق (متجاوب بالكامل للكمبيوتر والجوال) */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          {/* على الجوال يملأ الشاشة تقريباً وعلى الكمبيوتر يتوسط بمقاس محدد */}
          <div className="bg-white w-full max-w-md rounded-2xl p-5 md:p-7 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            
            <button 
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 bg-slate-50 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            >
              ✕
            </button>

            <div className="text-center mb-5">
              <h4 className="text-lg md:text-xl font-bold text-slate-900 mb-1">إنشاء حساب جديد</h4>
              <p className="text-[11px] md:text-xs text-slate-500">املأ الحقول التالية للانضمام وتفعيل جدول التوقعات</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setIsAuthModalOpen(false); setIsLoggedIn(true); }} className="space-y-4">
              
              {/* 1. الاسم الكريم */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم (يظهر للعامة ولوحة الصدارة)</label>
                <input 
                  type="text" 
                  required
                  placeholder="مثال: عبدالسلام العنزي"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 md:py-2.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                />
              </div>

              {/* 2. رقم الجوال مع قائمة المفاتيح */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الجوال (المعرف السري لحسابك)</label>
                <div className="flex gap-2" style={{ direction: "ltr" }}>
                  <select 
                    value={formData.countryCode}
                    onChange={(e) => setFormData({...formData, countryCode: e.target.value})}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-left"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.dialCode}>{c.flag} {c.dialCode}</option>
                    ))}
                  </select>
                  <input 
                    type="tel" 
                    required
                    placeholder="رقم الهاتف بدون رمز الدولة"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* 3. مقر الإقامة */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الدولة أو مقر الإقامة الحالي</label>
                <select 
                  value={formData.residence}
                  onChange={(e) => setFormData({...formData, residence: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 md:py-2.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>

              {/* 4. المنتخب المفضل */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">المنتخب المفضل أو المتوقع فوزه بالبطولة</label>
                <select 
                  required
                  value={formData.favoriteTeam}
                  onChange={(e) => setFormData({...formData, favoriteTeam: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 md:py-2.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                >
                  <option value="" disabled>اختر المنتخب المفضل...</option>
                  {WORLD_CUP_TEAMS.map((team) => (
                    <option key={team.code} value={team.name}>
                      {team.emoji} {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <button 
                type="submit" 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 md:py-3 rounded-xl text-xs md:text-sm transition-colors mt-2 shadow-md shadow-purple-100"
              >
                دخول المنصة وبدء حفظ التوقعات الحالية 🚀
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}