"use client";

import { useEffect } from "react";

// A visit means one browser tab session. Route changes and reloads in that
// session must not inflate the counter. A later/new session counts again.
const SESSION_KEY = "altahaddi:platform-visit:v1";
const inFlight = new Set<string>();

type VisitSession = { id: string; recorded: boolean };

function getSession(): VisitSession | null {
  try {
    const stored = window.sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const value = JSON.parse(stored) as Partial<VisitSession>;
      if (typeof value.id === "string" && /^[0-9a-f-]{36}$/i.test(value.id)) {
        return { id: value.id, recorded: value.recorded === true };
      }
    }
    const session = { id: window.crypto.randomUUID(), recorded: false };
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  } catch {
    // Browsers with storage disabled should not trigger a new visit on each
    // React render. Without session storage, do not report a visit.
    return null;
  }
}

export default function PlatformVisitTracker() {
  useEffect(() => {
    const session = getSession();
    if (!session || session.recorded || inFlight.has(session.id)) return;
    inFlight.add(session.id);

    void fetch("/api/public/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitId: session.id }),
      cache: "no-store",
      keepalive: true,
    })
      .then((response) => {
        if (!response.ok) return;
        try {
          const current = window.sessionStorage.getItem(SESSION_KEY);
          if (current && (JSON.parse(current) as VisitSession).id === session.id) {
            window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: session.id, recorded: true }));
          }
        } catch {
          // The server still records the visit even if storage is blocked later.
        }
        window.dispatchEvent(new Event("altahaddi:visit-counted"));
      })
      .catch(() => {
        // Keep the same visitId for an idempotent retry on a later page load.
      })
      .finally(() => {
        inFlight.delete(session.id);
      });
  }, []);

  return null;
}
