"use client";

import { useEffect } from "react";

const HEARTBEAT_MS = 120_000;
const SESSION_KEY = "altahaddi_tournament_automation_last_ping";

export default function TournamentAutomationHeartbeat() {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const ping = async () => {
      if (document.visibilityState !== "visible") return;

      const now = Date.now();
      const previous = Number(sessionStorage.getItem(SESSION_KEY) || 0);
      if (previous > 0 && now - previous < 90_000) return;
      sessionStorage.setItem(SESSION_KEY, String(now));

      try {
        await Promise.allSettled([
          fetch("/api/tournaments/notifications/auto", {
            method: "POST",
            cache: "no-store",
            keepalive: true,
          }),
          fetch("/api/tournaments/sports/auto", {
            method: "POST",
            cache: "no-store",
            keepalive: true,
          }),
        ]);
      } catch {
        // الأتمتة مساعدة ولا يجب أن تؤثر على تصفح المستخدم عند انقطاع الشبكة.
      }
    };

    void ping();
    timer = setInterval(() => void ping(), HEARTBEAT_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void ping();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
