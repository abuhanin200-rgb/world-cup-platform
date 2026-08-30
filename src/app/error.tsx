"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[altahaddi:error-boundary]", error);
  }, [error]);

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <section role="alert" className="w-full max-w-xl rounded-[32px] border border-red-300/10 bg-white/[0.04] p-7 text-center shadow-2xl shadow-black/30 md:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-300/20 bg-red-400/10 text-red-200">
          <AlertTriangle className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-3xl font-black">تعذر تحميل الصفحة</h1>
        <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-7 text-slate-400">
          حدث خطأ غير متوقع. بياناتك محفوظة، ويمكنك إعادة المحاولة الآن.
        </p>
        <button type="button" onClick={reset} className="mt-7 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:w-auto sm:min-w-48">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />إعادة المحاولة
        </button>
      </section>
    </main>
  );
}
