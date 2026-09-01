"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Altahaddi route error:", error);
  }, [error]);

  return (
    <main dir="rtl" className="mx-auto flex min-h-[65dvh] max-w-3xl items-center px-4 py-10 text-white">
      <section className="w-full overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(11,42,105,.86),rgba(4,19,58,.96))] p-5 text-center shadow-[0_28px_70px_rgba(0,0,0,.32)] sm:p-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[#ffc210]/20 bg-[#ffc210]/10 text-[#ffc210]">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-xl font-black sm:text-2xl">تعذر تحميل هذه الصفحة</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-7 text-white/55">
          حصل خطأ مؤقت أثناء تحميل المحتوى. جرّب مرة أخرى، وإذا استمر الخطأ ارجع للرئيسية بدون فقدان حسابك.
        </p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <button type="button" onClick={reset} className="altahaddi-primary-button justify-center">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> إعادة المحاولة
          </button>
          <Link href="/" className="altahaddi-secondary-button justify-center">
            <Home className="h-4 w-4" aria-hidden="true" /> الرئيسية
          </Link>
        </div>
      </section>
    </main>
  );
}
