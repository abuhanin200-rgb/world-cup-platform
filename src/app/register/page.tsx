"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTeams, Team } from "@/lib/teams";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoggedIn, loading: authLoading } = useAuth();

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [teamEmoji, setTeamEmoji] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      router.push("/");
    }
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    async function loadTeams() {
      try {
        const data = await getTeams();
        setTeams(data);
      } catch (err) {
        console.error(err);
        setError("تعذر تحميل قائمة المنتخبات");
      } finally {
        setTeamsLoading(false);
      }
    }

    loadTeams();
  }, []);

  function handleTeamChange(value: string) {
    setFavoriteTeam(value);

    const selected = teams.find((team) => team.nameAr === value);

    if (selected) {
      setTeamEmoji(selected.emoji);
    } else {
      setTeamEmoji("");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (fullName.trim().length > 20) {
      setError("الاسم يجب ألا يتجاوز 20 حرفًا");
      return;
    }

    if (!fullName.trim() || !password.trim() || !phone.trim() || !favoriteTeam) {
      setError("جميع الحقول إلزامية");
      return;
    }

    setLoading(true);

    try {
      const newUser = await register({
        fullName,
        password,
        phone,
        favoriteTeam,
        teamEmoji,
      });

      setMessage(`تم تسجيلك بنجاح، حيّاك الله يا ${newUser.fullName}`);

      setTimeout(() => {
        router.push("/");
      }, 900);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء التسجيل";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl p-6">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
            <img
              src="/wc2026-logo.png"
              alt="شعار المنصة"
              className="h-full w-full object-contain p-2"
            />
          </div>

          <h1 className="text-2xl font-black mb-2">تسجيل عضو جديد</h1>
          <p className="text-sm text-slate-300">
            سجّل بياناتك وادخل تحدي توقعات كأس العالم 2026.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-bold">
              الاسم <span className="text-slate-400">(20 حرف كحد أقصى)</span>
            </label>
            <input
              type="text"
              value={fullName}
              maxLength={20}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="اكتب اسمك"
              required
            />
            <div className="mt-1 text-xs text-slate-400">
              {fullName.length}/20
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">الرقم السري</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="اكتب الرقم السري"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">رقم الجوال</label>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="05xxxxxxxx"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold">
              المنتخب المرشح للقب
            </label>
            <select
              value={favoriteTeam}
              onChange={(event) => handleTeamChange(event.target.value)}
              disabled={teamsLoading}
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-amber-400"
              required
            >
              <option value="">
                {teamsLoading ? "جاري تحميل المنتخبات..." : "اختر المنتخب"}
              </option>

              {teams.map((team) => (
                <option key={team.code} value={team.nameAr}>
                  {team.emoji} {team.nameAr}
                </option>
              ))}
            </select>
          </div>

          {favoriteTeam && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
              منتخبك المرشح: {teamEmoji} {favoriteTeam}
            </div>
          )}

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
            disabled={loading || teamsLoading || authLoading}
            className="w-full rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
          >
            {loading ? "جاري التسجيل..." : "تسجيل"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => router.push("/login")}
          className="mt-4 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-white/10"
        >
          عندك حساب؟ تسجيل الدخول
        </button>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-3 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/10"
        >
          العودة للرئيسية
        </button>
      </div>
    </main>
  );
}