import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export type TickerSpeed = "slow" | "normal" | "fast" | "very_fast";

export type SiteSettings = {
  latestPredictionsSpeed: TickerSpeed;
  exactHitsSpeed: TickerSpeed;

  maintenanceMode: boolean;
  maintenanceMessage: string;

  updatedAt?: string;
};

const SETTINGS_DOC_ID = "main";

const defaultSettings: SiteSettings = {
  latestPredictionsSpeed: "normal",
  exactHitsSpeed: "normal",

  maintenanceMode: false,
  maintenanceMessage:
    "الموقع مغلق مؤقتًا للصيانة بسبب بعض المشاكل التقنية وتضخم البيانات. نعتذر لكم، وراح نرجع لكم قريب بإذن الله.",
};

export function getTickerDuration(speed: TickerSpeed) {
  if (speed === "slow") return 34;
  if (speed === "normal") return 28;
  if (speed === "fast") return 22;
  if (speed === "very_fast") return 16;

  return 28;
}

function normalizeTickerSpeed(value: unknown): TickerSpeed {
  if (
    value === "slow" ||
    value === "normal" ||
    value === "fast" ||
    value === "very_fast"
  ) {
    return value;
  }

  return "normal";
}

function toText(value: unknown, fallback: string) {
  const text = String(value || "").trim();
  return text || fallback;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const settingsRef = doc(db, "settings", SETTINGS_DOC_ID);
  const settingsSnap = await getDoc(settingsRef);

  if (!settingsSnap.exists()) {
    await setDoc(settingsRef, {
      ...defaultSettings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return defaultSettings;
  }

  const data = settingsSnap.data();

  return {
    latestPredictionsSpeed: normalizeTickerSpeed(data.latestPredictionsSpeed),
    exactHitsSpeed: normalizeTickerSpeed(data.exactHitsSpeed),

    maintenanceMode: Boolean(data.maintenanceMode),
    maintenanceMessage: toText(
      data.maintenanceMessage,
      defaultSettings.maintenanceMessage
    ),

    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
  };
}

export async function updateSiteSettings(input: SiteSettings) {
  const settingsRef = doc(db, "settings", SETTINGS_DOC_ID);
  const now = new Date().toISOString();

  await setDoc(
    settingsRef,
    {
      latestPredictionsSpeed: normalizeTickerSpeed(
        input.latestPredictionsSpeed
      ),
      exactHitsSpeed: normalizeTickerSpeed(input.exactHitsSpeed),

      maintenanceMode: Boolean(input.maintenanceMode),
      maintenanceMessage: toText(
        input.maintenanceMessage,
        defaultSettings.maintenanceMessage
      ),

      updatedAt: now,
    },
    { merge: true }
  );

  return getSiteSettings();
}