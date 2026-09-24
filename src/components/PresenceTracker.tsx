"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { updateMemberLastSeen } from "@/lib/presence";
import { updateOnlinePresence } from "@/lib/presenceService";
import type { PresenceDeviceInfo } from "@/types/presence";

const UPDATE_INTERVAL_MS = 60 * 1000;
const MIN_EVENT_UPDATE_GAP_MS = 30 * 1000;
const SESSION_START_KEY = "altahaddi_presence_session_started_at";

type BatteryManagerLike = {
  level: number;
  charging: boolean;
};

type NetworkInformationLike = {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  saveData?: boolean;
};

type NavigatorWithDeviceSignals = Navigator & {
  getBattery?: () => Promise<BatteryManagerLike>;
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
};

function detectBrowser(userAgent: string) {
  if (/Edg\//i.test(userAgent)) return "Edge";
  if (/SamsungBrowser\//i.test(userAgent)) return "Samsung Internet";
  if (/CriOS\//i.test(userAgent) || /Chrome\//i.test(userAgent)) return "Chrome";
  if (/FxiOS\//i.test(userAgent) || /Firefox\//i.test(userAgent)) return "Firefox";
  if (/Safari\//i.test(userAgent) && !/Chrome|CriOS|Android/i.test(userAgent)) return "Safari";
  return "متصفح آخر";
}

function detectDevice(): PresenceDeviceInfo {
  if (typeof navigator === "undefined") {
    return { deviceType: "other", deviceLabel: "غير معروف", browserName: "غير معروف", osName: "غير معروف" };
  }

  const ua = navigator.userAgent || "";
  const isIPad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  const isIPhone = /iPhone|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const browserName = detectBrowser(ua);

  if (isIPhone) {
    return { deviceType: "iphone", deviceLabel: "iPhone", browserName, osName: "iOS" };
  }

  if (isIPad) {
    return { deviceType: "ipad", deviceLabel: "iPad", browserName, osName: "iPadOS" };
  }

  if (isAndroid) {
    const isTablet = !/Mobile/i.test(ua);
    return {
      deviceType: "android",
      deviceLabel: isTablet ? "Android Tablet" : "Android",
      browserName,
      osName: "Android",
    };
  }

  if (/Windows/i.test(ua)) {
    return { deviceType: "computer", deviceLabel: "كمبيوتر Windows", browserName, osName: "Windows" };
  }

  if (/Macintosh|Mac OS X/i.test(ua)) {
    return { deviceType: "computer", deviceLabel: "Mac", browserName, osName: "macOS" };
  }

  if (/Linux/i.test(ua)) {
    return { deviceType: "computer", deviceLabel: "كمبيوتر Linux", browserName, osName: "Linux" };
  }

  return { deviceType: "other", deviceLabel: "جهاز آخر", browserName, osName: "غير معروف" };
}

async function readDeviceSignals(baseDevice: PresenceDeviceInfo): Promise<PresenceDeviceInfo> {
  if (typeof navigator === "undefined") return baseDevice;

  const nav = navigator as NavigatorWithDeviceSignals;
  const result: PresenceDeviceInfo = { ...baseDevice };

  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
  if (connection) {
    if (connection.type) result.networkType = String(connection.type);
    if (connection.effectiveType) result.effectiveConnectionType = String(connection.effectiveType);
    if (Number.isFinite(connection.downlink)) result.downlinkMbps = Number(connection.downlink);
    if (typeof connection.saveData === "boolean") result.saveData = connection.saveData;
  }

  if (typeof nav.getBattery === "function") {
    try {
      const battery = await nav.getBattery();
      if (battery && Number.isFinite(battery.level)) {
        result.batteryLevelPct = Math.max(0, Math.min(100, Math.round(battery.level * 100)));
      }
      if (battery && typeof battery.charging === "boolean") {
        result.batteryCharging = battery.charging;
      }
    } catch {
      // Battery Status API is intentionally optional and unavailable on several browsers.
    }
  }

  return result;
}

function getSessionStartedAt(userId: string) {
  if (typeof window === "undefined") return Date.now();

  const key = `${SESSION_START_KEY}_${userId}`;
  const existing = Number(window.sessionStorage.getItem(key));
  if (Number.isFinite(existing) && existing > 0) return existing;

  const now = Date.now();
  window.sessionStorage.setItem(key, String(now));
  return now;
}

export default function PresenceTracker() {
  const pathname = usePathname();
  const { user, isLoggedIn, loading } = useAuth();
  const lastUpdateRef = useRef(0);
  const baseDevice = useMemo(() => detectDevice(), []);

  useEffect(() => {
    if (loading || !isLoggedIn || !user?.id) return;

    let isMounted = true;
    const sessionStartedAt = getSessionStartedAt(user.id);

    async function updatePresence(force = false) {
      if (!user?.id || !isMounted) return;

      const now = Date.now();
      if (!force && now - lastUpdateRef.current < MIN_EVENT_UPDATE_GAP_MS) return;
      lastUpdateRef.current = now;

      try {
        const device = await readDeviceSignals(baseDevice);
        await Promise.all([
          updateMemberLastSeen(user.id),
          updateOnlinePresence({
            userId: user.id,
            fullName: user.fullName || "عضو",
            path: pathname || "/",
            device,
            sessionStartedAt,
          }),
        ]);
      } catch (error) {
        console.error("Presence update error:", error);
      }
    }

    void updatePresence(true);

    const interval = window.setInterval(() => {
      void updatePresence(true);
    }, UPDATE_INTERVAL_MS);

    const handleActivity = () => {
      void updatePresence(false);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void updatePresence(true);
      else void updatePresence(false);
    };

    window.addEventListener("click", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity, { passive: true });
    window.addEventListener("touchstart", handleActivity, { passive: true });
    window.addEventListener("focus", handleActivity);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("focus", handleActivity);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loading, isLoggedIn, user?.id, user?.fullName, pathname, baseDevice]);

  return null;
}
