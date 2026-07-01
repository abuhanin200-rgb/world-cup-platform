"use client";

import { useState } from "react";
import AdminWordGamePanel from "@/components/AdminWordGamePanel";
import AdminFlagMemoryPanel from "@/components/AdminFlagMemoryPanel";

type GamesAdminTab = "wordGame" | "flagMemory";

export default function AdminGamesPanel() {
  const [activeGameTab, setActiveGameTab] =
    useState<GamesAdminTab>("wordGame");

  return (
    <section className="space-y-5" dir="rtl">
      <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
        <div className="mb-4">
          <h2 className="text-xl font-black md:text-2xl">🎮 إدارة الألعاب</h2>

          <p className="mt-1 text-sm leading-6 text-slate-300">
            تحكم بألعاب المنصة من مكان واحد، مع فصل كل لعبة في تبويب مستقل.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-950/50 p-2">
          <button
            type="button"
            onClick={() => setActiveGameTab("wordGame")}
            className={`rounded-xl px-4 py-2 text-sm font-black transition ${
              activeGameTab === "wordGame"
                ? "bg-amber-400 text-slate-950"
                : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            🧩 لعبة خمن الكلمة
          </button>

          <button
            type="button"
            onClick={() => setActiveGameTab("flagMemory")}
            className={`rounded-xl px-4 py-2 text-sm font-black transition ${
              activeGameTab === "flagMemory"
                ? "bg-amber-400 text-slate-950"
                : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            🎌 تحدي الأعلام
          </button>
        </div>
      </div>

      {activeGameTab === "wordGame" && <AdminWordGamePanel />}

      {activeGameTab === "flagMemory" && <AdminFlagMemoryPanel />}
    </section>
  );
}