import React from "react";

export default function MaintenancePage() {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 text-slate-100 font-sans antialiased flex items-center justify-center p-4 selection:bg-purple-500/30"
    >
      <div className="max-w-2xl w-full bg-slate-900/60 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6">
        <div className="text-4xl md:text-6xl drop-shadow-lg animate-pulse">🚧</div>
        
        <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent tracking-tight">
          نعتذر منكم
        </h1>

        <div className="space-y-5 text-sm md:text-base text-slate-200 font-bold leading-relaxed max-w-xl mx-auto">
          <p className="text-lg md:text-xl text-amber-400">هلا والله بالجميع 🌹</p>
          
          <p className="text-slate-300 font-medium">
            حالياً الموقع مغلق مؤقتاً للصيانة بسبب وجود مشاكل تقنية ناتجة عن تضخم البيانات وزيادة الأحمال على النظام.
          </p>
          
          <p className="text-slate-300 font-medium">
            نعمل حالياً على تحسين الأداء ومعالجة جميع الملاحظات لضمان تجربة أفضل للجميع بإذن الله.
          </p>
          
          <p className="text-purple-300">
            نعتذر عن هذا التوقف المؤقت، ونوعدكم إننا راجعين قريب بشكل أقوى وأفضل 🚀
          </p>
        </div>

        <div className="pt-6 border-t border-purple-900/30">
          <span className="text-base md:text-lg font-black text-amber-400 tracking-wide block">
            يعطيكم العافيه ❤️
          </span>
        </div>
      </div>
    </div>
  );
}