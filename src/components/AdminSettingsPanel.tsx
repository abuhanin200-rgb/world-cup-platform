"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  getSiteSettings,
  SiteSettings,
  TickerSpeed,
  updateSiteSettings,
} from "@/lib/siteSettings";
import { addAdminLog } from "@/lib/adminLogs";

const speedOptions: {
  value: TickerSpeed;
  label: string;
  description: string;
}[] = [
  {
    value: "slow",
    label: "بطيء",
    description: "حركة هادئة وبطيئة",
  },
  {
    value: "normal",
    label: "متوسط",
    description: "السرعة الافتراضية المناسبة",
  },
  {
    value: "fast",
    label: "سريع",
    description: "حركة أسرع قليلًا",
  },
  {
    value: "very_fast",
    label: "سريع جدًا",
    description: "حركة عالية ومناسبة للمحتوى الكثير",
  },
];

function getSpeedLabel(speed: TickerSpeed) {
  return speedOptions.find((option) => option.value === speed)?.label || "متوسط";
}

export default function AdminSettingsPanel() {
  const [settings, setSettings] = useState<SiteSettings>({
    latestPredictionsSpeed: "normal",
    exactHitsSpeed: "normal",
  });

  const [originalSettings, setOriginalSettings] = useState<SiteSettings>({
    latestPredictionsSpeed: "normal",
    exactHitsSpeed: "normal",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const data = await getSiteSettings();

        setSettings(data);
        setOriginalSettings(data);
      } catch (err) {
        console.error("فشل تحميل إعدادات الموقع:", err);
        setError("تعذر تحميل إعدادات الشرائط");
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  function updateField(field: keyof SiteSettings, value: TickerSpeed) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSaveSettings(event: FormEvent) {
    event.preventDefault();

    setMessage("");
    setError("");
    setSaving(true);

    try {
      const updatedSettings = await updateSiteSettings(settings);

      const latestChanged =
        originalSettings.latestPredictionsSpeed !==
        updatedSettings.latestPredictionsSpeed;

      const exactChanged =
        originalSettings.exactHitsSpeed !== updatedSettings.exactHitsSpeed;

      const changes: string[] = [];

      if (latestChanged) {
        changes.push(
          `شريط آخر التوقعات من ${getSpeedLabel(
            originalSettings.latestPredictionsSpeed
          )} إلى ${getSpeedLabel(updatedSettings.latestPredictionsSpeed)}`
        );
      }

      if (exactChanged) {
        changes.push(
          `شريط جابها صح من ${getSpeedLabel(
            originalSettings.exactHitsSpeed
          )} إلى ${getSpeedLabel(updatedSettings.exactHitsSpeed)}`
        );
      }

      await addAdminLog({
        action: "update_settings",
        title: "تعديل إعدادات الشرائط",
        description:
          changes.length > 0
            ? `تم تعديل ${changes.join("، ")}.`
            : "تم حفظ إعدادات الشرائط بدون تغيير في القيم.",
      });

      setSettings(updatedSettings);
      setOriginalSettings(updatedSettings);
      setMessage("تم حفظ إعدادات الشرائط بنجاح ✅");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "تعذر حفظ إعدادات الشرائط";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-6">
      <div className="mb-5">
        <h2 className="text-2xl font-black">إعدادات الشرائط</h2>
        <p className="mt-2 text-sm text-slate-300">
          التحكم بسرعة شريط آخر التوقعات وشريط جابها صح.
        </p>
      </div>

      {(message || error) && (
        <div className="mb-5 space-y-2">
          {message && (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
              {error}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-sm text-slate-300">
          جاري تحميل الإعدادات...
        </div>
      ) : (
        <form onSubmit={handleSaveSettings} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <label className="mb-3 block text-sm font-black">
                سرعة شريط آخر التوقعات
              </label>

              <div className="space-y-2">
                {speedOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition ${
                      settings.latestPredictionsSpeed === option.value
                        ? "border-amber-400 bg-amber-400/10"
                        : "border-white/10 bg-slate-900/70 hover:bg-white/10"
                    }`}
                  >
                    <div>
                      <div className="font-black">{option.label}</div>
                      <div className="mt-1 text-xs text-slate-300">
                        {option.description}
                      </div>
                    </div>

                    <input
                      type="radio"
                      name="latestPredictionsSpeed"
                      value={option.value}
                      checked={settings.latestPredictionsSpeed === option.value}
                      onChange={() =>
                        updateField("latestPredictionsSpeed", option.value)
                      }
                      className="h-4 w-4"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <label className="mb-3 block text-sm font-black">
                سرعة شريط جابها صح
              </label>

              <div className="space-y-2">
                {speedOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition ${
                      settings.exactHitsSpeed === option.value
                        ? "border-emerald-400 bg-emerald-400/10"
                        : "border-white/10 bg-slate-900/70 hover:bg-white/10"
                    }`}
                  >
                    <div>
                      <div className="font-black">{option.label}</div>
                      <div className="mt-1 text-xs text-slate-300">
                        {option.description}
                      </div>
                    </div>

                    <input
                      type="radio"
                      name="exactHitsSpeed"
                      value={option.value}
                      checked={settings.exactHitsSpeed === option.value}
                      onChange={() => updateField("exactHitsSpeed", option.value)}
                      className="h-4 w-4"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "جاري حفظ الإعدادات..." : "حفظ إعدادات الشرائط"}
          </button>

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs leading-6 text-slate-300">
            بعد الحفظ، الشرائط في الصفحة الرئيسية تقرأ السرعة من Firebase وتتحدث
            تلقائيًا خلال ثواني، وسيتم تسجيل العملية في تبويب السجل.
          </div>
        </form>
      )}
    </section>
  );
}