import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export type HomeBannerSettings = {
  isActive: boolean;
  imageUrl: string;
  externalUrl: string;
  updatedAt?: string;
};

const BANNER_DOC_ID = "homeBanner";

const defaultBanner: HomeBannerSettings = {
  isActive: false,
  imageUrl: "",
  externalUrl: "",
};

function toText(value: unknown) {
  return String(value || "").trim();
}

function normalizeUrl(value: string) {
  const url = value.trim();

  if (!url) return "";

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `https://${url}`;
}

export async function getHomeBanner(): Promise<HomeBannerSettings> {
  const bannerRef = doc(db, "settings", BANNER_DOC_ID);
  const bannerSnap = await getDoc(bannerRef);

  if (!bannerSnap.exists()) {
    return defaultBanner;
  }

  const data = bannerSnap.data();

  return {
    isActive: Boolean(data.isActive),
    imageUrl: toText(data.imageUrl),
    externalUrl: toText(data.externalUrl),
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
  };
}

export async function updateHomeBanner(input: HomeBannerSettings) {
  const bannerRef = doc(db, "settings", BANNER_DOC_ID);

  await setDoc(
    bannerRef,
    {
      isActive: Boolean(input.isActive),
      imageUrl: normalizeUrl(input.imageUrl),
      externalUrl: normalizeUrl(input.externalUrl),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return getHomeBanner();
}

export async function clearHomeBanner() {
  return updateHomeBanner({
    isActive: false,
    imageUrl: "",
    externalUrl: "",
  });
}
