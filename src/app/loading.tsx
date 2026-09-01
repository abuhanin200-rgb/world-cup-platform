export default function Loading() {
  return (
    <main dir="rtl" className="mx-auto max-w-7xl px-3 py-5 sm:px-4 md:px-6" aria-busy="true" aria-label="جاري تحميل الصفحة">
      <div className="animate-pulse space-y-4">
        <div className="h-36 rounded-[28px] border border-white/[0.06] bg-white/[0.045] md:h-48" />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-20 rounded-2xl border border-white/[0.05] bg-white/[0.035]" />
          ))}
        </div>
        <div className="h-72 rounded-[28px] border border-white/[0.06] bg-white/[0.04]" />
      </div>
      <span className="sr-only">جاري التحميل</span>
    </main>
  );
}
