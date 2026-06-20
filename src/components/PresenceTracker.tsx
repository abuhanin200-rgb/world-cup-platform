"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { updateMemberLastSeen } from "@/lib/presence";
import { updateOnlinePresence } from "@/lib/presenceService";

const UPDATE_INTERVAL_MS = 60 * 1000;
const MIN_EVENT_UPDATE_GAP_MS = 30 * 1000;

export default function PresenceTracker() {
  const pathname = usePathname();
  const { user, isLoggedIn, loading } = useAuth();
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    if (loading || !isLoggedIn || !user?.id) return;

    let isMounted = true;

    async function updatePresence(force = false) {
      if (!user?.id || !isMounted) return;

      const now = Date.now();

      if (!force && now - lastUpdateRef.current < MIN_EVENT_UPDATE_GAP_MS) {
        return;
      }

      lastUpdateRef.current = now;

      try {
        await Promise.all([
          updateMemberLastSeen(user.id),
          updateOnlinePresence({
            userId: user.id,
            fullName: user.fullName || "عضو",
            path: pathname || "/",
          }),
        ]);
      } catch (error) {
        console.error("Presence update error:", error);
      }
    }

    updatePresence(true);

    const interval = window.setInterval(() => {
      updatePresence(true);
    }, UPDATE_INTERVAL_MS);

    const handleActivity = () => {
      updatePresence(false);
    };

    window.addEventListener("click", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity, { passive: true });
    window.addEventListener("touchstart", handleActivity, { passive: true });

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
    };
  }, [loading, isLoggedIn, user?.id, user?.fullName, pathname]);

  return null;
}