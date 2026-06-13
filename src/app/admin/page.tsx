"use client";

import { FormEvent, useEffect, useState } from "react";
import { getTeams, Team } from "@/lib/teams";
import { addMatch, getAllMatches, Match } from "@/lib/matches";

export default function AdminPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  const [homeTeamCode, setHomeTeamCode] = useState("");
  const [awayTeamCode, setAwayTeamCode] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);

      const [teamsData, matchesData] = await Promise.all([
        getTeams(),
        getAllMatches(),
      ]);

      setTeams(teamsData);
      setMatches(matchesData);
    } catch (err) {
      console.error(err);
      setError("تعذر تحميل بيانات لوحة التحكم");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function getSelectedTeam(code: string) {
    return teams.find((team) => team.code === code);
  }

  async function handleAddMatch(event: FormEvent) {
    event.preventDefault();

    setMessage("");
    setError("");

    const homeTeam = getSelectedTeam(homeTeamCode);
    const awayTeam = getSelectedTeam(awayTeamCode);

    if (!homeTeam || !awayTeam) {
      setError("اختر الفريقين بشكل صحيح");
      return;
    }

    setSaving(true);

    try {
      await addMatch({
        homeTeamCode: homeTeam.code,
        homeTeamName: homeTeam.nameAr,
        homeTeamEmoji: homeTeam.emoji,

        awayTeamCode: awayTeam.code,
        awayTeamName: awayTeam.nameAr,
        awayTeamEmoji: awayTeam.emoji,

        matchDate,
        matchTime,
      });

      setMessage("تمت إضافة المباراة بنجاح وستظهر في صفحة الجمهور حسب تاريخها.");
      setHomeTeamCode("");
      setAwayTeamCode("");
      setMatchDate("");
      setMatchTime("");

      await loadData();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء إضافة المباراة";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 text-white"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
          <h1 className="text-3xl font-black">لوحة التحكم</h1>
          <p className="mt-2 text-sm text-slate-300">
            إدارة مباريات منصة توقعات كأس العالم 2026.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-black">إضافة مباراة جديدة</h2>

            <form onSubmit={handleAddMatch} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold">
                  الفريق الأول
                </label>
                <select
                  value={homeTeamCode}
                  onChange={(event) => setHomeTeamCode(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-amber-400"
                  required
                >
                  <option value="">اختر الفريق الأول</option>
                  {teams.map((team) => (
                    <option key={team.code} value={team.code}>
                      {team.emoji} {team.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-center text-sm font-black text-amber-300">
                VS
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  الفريق الثاني
                </label>
                <select
                  value={awayTeamCode}
                  onChange={(event) => setAwayTeamCode(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-amber-400"
                  required
                >
                  <option value="">اختر الفريق الثاني</option>
                  {teams.map((team) => (
                    <option key={team.code} value={team.code}>
                      {team.emoji} {team.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  تاريخ المباراة
                </label>
                <input
                  type="date"
                  value={matchDate}
                  onChange={(event) => setMatchDate(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  وقت المباراة بتوقيت مكة
                </label>
                <input
                  type="time"
                  value={matchTime}
                  onChange={(event) => setMatchTime(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-amber-400"
                  required
                />
              </div>

              {message && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3 text-sm text-emerald-200">
                  {message}
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/15 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving || loading}
                className="w-full rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
              >
                {saving ? "جاري الإضافة..." : "إضافة المباراة"}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-black">المباريات المضافة</h2>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-slate-300">
                جاري تحميل المباريات...
              </div>
            ) : matches.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-slate-300">
                لا توجد مباريات مضافة حتى الآن.
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map((match) => (
                  <div
                    key={match.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"
                  >
                    <div className="mb-2 text-sm text-slate-300">
                      {match.matchDay} • {match.matchDate} • {match.matchTime} بتوقيت مكة
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-center font-black">
                        <div className="text-2xl">{match.homeTeamEmoji}</div>
                        <div>{match.homeTeamName}</div>
                      </div>

                      <div className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-amber-300">
                        VS
                      </div>

                      <div className="text-center font-black">
                        <div className="text-2xl">{match.awayTeamEmoji}</div>
                        <div>{match.awayTeamName}</div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-400">
                      الحالة: {match.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}