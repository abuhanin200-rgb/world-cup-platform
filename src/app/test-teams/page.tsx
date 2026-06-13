"use client";

import { useEffect, useState } from "react";
import { getTeams, Team } from "@/lib/teams";

export default function TestTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTeams() {
      try {
        const data = await getTeams();
        setTeams(data);
      } catch (err) {
        console.error(err);
        setError("حدث خطأ أثناء جلب المنتخبات من قاعدة البيانات");
      } finally {
        setLoading(false);
      }
    }

    loadTeams();
  }, []);

  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 text-white p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold mb-2">
          اختبار قراءة المنتخبات من Firebase
        </h1>

        <p className="text-slate-300 mb-6">
          إذا ظهرت المنتخبات هنا، فهذا يعني أن الربط مع Firebase يعمل بنجاح.
        </p>

        {loading && (
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
            جاري تحميل المنتخبات...
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-950 border border-red-800 p-4 text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="mb-4 rounded-xl bg-emerald-950 border border-emerald-800 p-4 text-emerald-200">
              تم جلب عدد {teams.length} منتخب من Firebase بنجاح.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {teams.map((team) => (
                <div
                  key={team.code}
                  className="rounded-xl bg-slate-900 border border-slate-800 p-4"
                >
                  <div className="text-3xl mb-2">{team.emoji}</div>
                  <div className="font-bold">{team.nameAr}</div>
                  <div className="text-sm text-slate-400">{team.nameEn}</div>
                  <div className="text-xs text-amber-300 mt-2">
                    المجموعة {team.group}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}