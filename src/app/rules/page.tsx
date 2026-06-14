"use client";

import { useRouter } from "next/navigation";

export default function RulesPage() {
  const router = useRouter();

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 text-white"
    >
      <div className="mx-auto max-w-4xl">
        <header className="mb-5 rounded-3xl border border-white/10 bg-white/10 p-5 text-center shadow-2xl md:p-6">
          <div className="mx-auto mb-4 h-16 w-16 overflow-hidden rounded-3xl border border-white/20 bg-white/10">
            <img
              src="/wc2026-logo.png"
              alt="شعار منصة توقعات كأس العالم 2026"
              className="h-full w-full object-contain p-2"
            />
          </div>

          <h1 className="text-2xl font-black md:text-4xl">
            قوانين تحدي التوقعات
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
            هنا توضيح طريقة المشاركة واحتساب النقاط في منصة توقعات كأس العالم
            2026.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-center shadow-xl">
            <div className="text-4xl">🎯</div>
            <h2 className="mt-3 text-xl font-black text-emerald-200">
              بالملي
            </h2>
            <p className="mt-2 text-4xl font-black text-emerald-300">+3</p>
            <p className="mt-3 text-sm leading-6 text-emerald-100">
              إذا توقعت النتيجة الصحيحة كاملة مثل 2 - 1.
            </p>
          </div>

          <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5 text-center shadow-xl">
            <div className="text-4xl">🏆</div>
            <h2 className="mt-3 text-xl font-black text-amber-200">
              الفائز الصحيح
            </h2>
            <p className="mt-2 text-4xl font-black text-amber-300">+1</p>
            <p className="mt-3 text-sm leading-6 text-amber-100">
              إذا توقعت الفائز أو التعادل بشكل صحيح بدون تطابق النتيجة.
            </p>
          </div>

          <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-5 text-center shadow-xl">
            <div className="text-4xl">❌</div>
            <h2 className="mt-3 text-xl font-black text-red-100">
              توقع خاطئ
            </h2>
            <p className="mt-2 text-4xl font-black text-red-300">+0</p>
            <p className="mt-3 text-sm leading-6 text-red-100">
              إذا كان توقع الفائز أو التعادل غير صحيح.
            </p>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl md:p-6">
          <h2 className="mb-4 text-xl font-black">شروط المشاركة</h2>

          <div className="space-y-3 text-sm leading-7 text-slate-200 md:text-base">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              ✅ يجب تسجيل الدخول قبل اعتماد التوقع.
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              ✅ كل عضو يملك توقعًا واحدًا فقط لكل مباراة.
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              ✅ بعد اعتماد التوقع لا يمكن تعديله.
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              ✅ التوقع يكون متاحًا قبل بداية المباراة، وقد يُغلق تلقائيًا بعد
              بداية المباراة.
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              ✅ ترتيب لوحة الصدارة يعتمد على النقاط أولًا، ثم عدد التوقعات
              الصحيحة، ثم عدد التوقعات الأقل عند التعادل.
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5 text-center shadow-2xl">
          <h2 className="text-xl font-black text-amber-200">
            الهدف من التحدي
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-amber-100 md:text-base">
            التحدي للتسلية والحماس بين الأصدقاء، ونهاية البطولة نشوف من صاحب
            أقوى توقعات وأفضل قراءة للنتائج.
          </p>
        </section>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-xl bg-amber-400 px-6 py-3 text-sm font-black text-slate-950 hover:bg-amber-300"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    </main>
  );
}