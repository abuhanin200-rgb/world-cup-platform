import Link from "next/link";
import { ArrowRight, Home, Trophy } from "lucide-react";

export default function NotFound() {
  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <section className="w-full max-w-xl rounded-[32px] border border-white/10 bg-white/[0.04] p-7 text-center shadow-2xl shadow-black/30 backdrop-blur-xl md:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
          <Trophy className="h-8 w-8" aria-hidden="true" />
        </div>
        <p dir="ltr" className="mt-6 text-sm font-black tracking-[0.22em] text-white/35">404</p>
        <h1 className="mt-2 text-3xl font-black md:text-4xl">الصفحة غير موجودة</h1>
        <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-7 text-slate-400">
          الرابط الذي فتحته غير متاح أو تم نقله. ارجع للرئيسية أو استعرض البطولات الحالية.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link href="/" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
            <Home className="h-4 w-4" aria-hidden="true" />الرئيسية
          </Link>
          <Link href="/tournaments" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
            البطولات<ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
