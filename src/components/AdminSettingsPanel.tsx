"use client";

import { useEffect, useState } from "react";
import {
  getSiteSettings,
  SiteSettings,
  TickerSpeed,
  updateSiteSettings,
} from "@/lib/siteSettings";
import { addAdminLog } from "@/lib/adminLogs";

const defaultMaintenanceMessage =
  "الموقع مغلق مؤقتًا للصيانة بسبب بعض المشاكل التقنية وتضخم البيانات. نعتذر لكم، وراح نرجع لكم قريب بإذن الله.";

type SpeedOption = {
  value: TickerSpeed;
  title: string;
  description: string;
};

const speedOptions: SpeedOption[] = [
  {
    value: "very_slow",
    title: "بطيء جدًا",
    description: "حركة هادئة جدًا ومناسبة للقراءة",
  },
  {
    value: "slow",
    title: "بطيء",
    description: "حركة هادئة وبطيئة",
  },
  {
    value: "normal",
    title: "متوسط",
    description: "السرعة الافتراضية المناسبة",
  },
  {
    value: "fast",
    title: "سريع",
    description: "حركة أسرع قليلًا",
  },
  {
    value: "very_fast",
    title: "سريع جدًا",
    description: "حركة عالية ومناسبة للمحتوى الكثير",
  },
];

export default function AdminSettingsPanel() {
  const [settings, setSettings] = useState<SiteSettings>({
    latestPredictionsSpeed: "normal",
    exactHitsSpeed: "normal",
    maintenanceMode: false,
    maintenanceMessage: defaultMaintenanceMessage,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadSettings() {
    try {
      setLoading(true);
      const data = await getSiteSettings();
      setSettings(data);
    } catch (error) {
      console.error("Load settings error:", error);
      alert("تعذر تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function updateSpeed(key: "latestPredictionsSpeed" | "exactHitsSpeed", value: TickerSpeed) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateMaintenanceMode(value: boolean) {
    setSettings((current) => ({
      ...current,
      maintenanceMode: value,
    }));
  }

  function updateMaintenanceMessage(value: string) {
    setSettings((current) => ({
      ...current,
      maintenanceMessage: value,
    }));
  }

  async function handleSave() {
    try {
      setSaving(true);

      const updated = await updateSiteSettings({
        ...settings,
        maintenanceMessage:
          settings.maintenanceMessage.trim() || defaultMaintenanceMessage,
      });

      setSettings(updated);

      await addAdminLog({
        action: "update_settings",
        title: "تحديث إعدادات الموقع",
        description: "تم تحديث إعدادات الشرائط ووضع الصيانة",
        metadata: {
          latestPredictionsSpeed: updated.latestPredictionsSpeed,
          exactHitsSpeed: updated.exactHitsSpeed,
          maintenanceMode: updated.maintenanceMode,
        },
      });

      alert("تم حفظ الإعدادات بنجاح");
    } catch (error) {
      console.error("Save settings error:", error);
      alert("تعذر حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  }

  function renderSpeedOptions(
    title: string,
    selectedValue: TickerSpeed,
    onChange: (value: TickerSpeed) => void,
    activeColor: "amber" | "emerald"
  ) {
    return (
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">
        <h3 className="mb-4 text-xl font-black">{title}</h3>

        <div className="space-y-3">
          {speedOptions.map((option) => {
            const selected = selectedValue === option.value;

            const selectedClass =
              activeColor === "amber"
                ? "border-amber-400 bg-amber-400/10"
                : "border-emerald-400 bg-emerald-400/10";

            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                  selected
                    ? selectedClass
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <input
                  type="radio"
                  checked={selected}
                  onChange={() => onChange(option.value)}
                  className="h-5 w-5"
                />

                <div className="flex-1 text-right">
                  <div className="text-lg font-black">{option.title}</div>
                  <div className="mt-1 text-sm text-slate-300">
                    {option.description}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/10 p-6 text-center text-slate-300 shadow-2xl">
        جاري تحميل الإعدادات...
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
        <div className="mb-4">
          <h2 className="text-xl font-black md:text-2xl">⚙️ إعدادات الموقع</h2>
          <p className="mt-1 text-sm text-slate-300">
            تحكم في سرعة الشرائط ووضع الصيانة.
          </p>
        </div>

        <section className="rounded-3xl border border-red-400/20 bg-red-500/10 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-red-100">
                وضع الصيانة
              </h3>
              <p className="mt-1 text-sm text-red-100/80">
                عند التفعيل، يظهر للزوار تنبيه إغلاق مؤقت، ويبقى الأدمن متاحًا.
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(event) =>
                  updateMaintenanceMode(event.target.checked)
                }
                className="h-5 w-5"
              />
              <span className="text-sm font-black">
                {settings.maintenanceMode ? "مفعل" : "غير مفعل"}
              </span>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-red-100">
              رسالة الصيانة
            </span>

            <textarea
              value={settings.maintenanceMessage}
              onChange={(event) =>
                updateMaintenanceMessage(event.target.value)
              }
              rows={4}
              className="w-full rounded-2xl border border-red-400/20 bg-slate-950/70 px-4 py-3 text-sm leading-7 text-white outline-none focus:border-red-300"
              placeholder={defaultMaintenanceMessage}
            />
          </label>
        </section>
      </div>

      {renderSpeedOptions(
        "سرعة شريط آخر التوقعات",
        settings.latestPredictionsSpeed,
        (value) => updateSpeed("latestPredictionsSpeed", value),
        "amber"
      )}

      {renderSpeedOptions(
        "سرعة شريط جابها صح",
        settings.exactHitsSpeed,
        (value) => updateSpeed("exactHitsSpeed", value),
        "emerald"
      )}

      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="w-full rounded-2xl bg-amber-400 px-4 py-4 text-base font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
      </button>
    </section>
  );
}