"use client";

type KnockoutRulesNoticeProps = {
  saving?: boolean;
  onConfirm: () => void;
};

export default function KnockoutRulesNotice({
  saving = false,
  onConfirm,
}: KnockoutRulesNoticeProps) {
  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-950 p-5 text-right text-white shadow-2xl md:p-6">
        <h2 className="mb-4 text-xl font-black text-amber-300 md:text-2xl">
          تحديث مهم في نظام توقعات خروج المغلوب
        </h2>

        <div className="space-y-4 text-sm leading-7 text-slate-100 md:text-base">
          <p>
            يا بطل، مباريات خروج المغلوب تختلف عن دور المجموعات لأنها ممكن تمتد
            لأشواط إضافية أو ركلات ترجيح، لذلك تم تحديث طريقة التوقع واحتساب
            النقاط.
          </p>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="mb-2 font-black text-white">التوقع العادي</p>

            <p>
              إذا توقعت فوز أحد المنتخبين:
              <br />
              مثال: البرازيل 2 - 1 اليابان
              <br />
              - إذا جبت النتيجة بالملي: تحصل على 3 نقاط.
              <br />- إذا عرفت الفائز فقط بدون النتيجة بالملي: تحصل على 1 نقطة.
            </p>

            <p className="mt-3">
              إذا توقعت تعادل:
              <br />
              مثال: البرازيل 1 - 1 اليابان
              <br />
              راح يظهر لك خيارين:
              <br />
              1- اختيار المنتخب المتأهل.
              <br />
              2- اختيار طريقة التأهل: أشواط إضافية أو ركلات ترجيح.
            </p>

            <p className="mt-3">
              طريقة الحسبة عند التعادل:
              <br />
              - النتيجة بالملي: 3 نقاط.
              <br />
              - توقعت تعادل صحيح لكن النتيجة غير متطابقة: 1 نقطة.
              <br />
              - المتأهل الصحيح: 2 نقطة.
              <br />- طريقة التأهل الصحيحة: 1 نقطة.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4">
            <p className="mb-2 font-black text-amber-300">التوقع الذهبي</p>

            <p>
              إذا توقعت فوز أحد المنتخبين:
              <br />
              مثال: البرازيل 2 - 1 اليابان
              <br />
              - إذا جبت النتيجة بالملي: تحصل على 6 نقاط.
              <br />- إذا عرفت الفائز فقط بدون النتيجة بالملي: تحصل على 2 نقطة.
            </p>

            <p className="mt-3">
              إذا توقعت تعادل:
              <br />
              مثال: البرازيل 1 - 1 اليابان
              <br />
              راح يظهر لك خيارين:
              <br />
              1- اختيار المنتخب المتأهل.
              <br />
              2- اختيار طريقة التأهل: أشواط إضافية أو ركلات ترجيح.
            </p>

            <p className="mt-3">
              طريقة الحسبة عند التعادل الذهبي:
              <br />
              - النتيجة بالملي: 6 نقاط.
              <br />
              - توقعت تعادل صحيح لكن النتيجة غير متطابقة: 2 نقطة.
              <br />
              - المتأهل الصحيح: 4 نقاط.
              <br />- طريقة التأهل الصحيحة: 2 نقطة.
            </p>
          </div>

          <p>
            حالة خاصة:
            <br />
            إذا توقعت تعادل واخترت المتأهل الصحيح، لكن المباراة انتهت بفوز نفس
            المنتخب في الوقت الأصلي، تحصل على نقاط معرفة الفائز فقط.
          </p>

          <p>
            مثال:
            <br />
            توقعت: البرازيل 1 - 1 اليابان، والمتأهل البرازيل.
            <br />
            النتيجة الفعلية: البرازيل 2 - 1 اليابان.
            <br />
            في التوقع العادي تحصل على 1 نقطة.
            <br />
            في التوقع الذهبي تحصل على 2 نقطة.
          </p>

          <p className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 font-bold text-amber-100">
            مهم:
            <br />
            صور الشاشة واحفظها عندك عشان تكون طريقة الحسبة واضحة لك.
            <br />
            بالتوفيق للجميع، ومشاهدة ممتعة ♥️
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={onConfirm}
          className="mt-6 w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70 md:text-base"
        >
          {saving ? "جاري الحفظ..." : "فهمت، لا تظهرها مرة ثانية"}
        </button>
      </div>
    </div>
  );
}