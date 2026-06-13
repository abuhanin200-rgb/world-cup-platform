"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const user = await login({
        fullName,
        password,
      });

      setMessage(`أهلًا بعودتك يا بطل ${user.fullName}`);

      setTimeout(() => {
        router.push("/");
      }, 900);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء تسجيل الدخول";
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

          <h1 className="text-2xl font-black mb-2">تسجيل الدخول</h1>
          <p className="text-sm text-slate-300">
            أدخل بياناتك للعودة إلى منصة توقعات كأس العالم 2026.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-bold">الاسم</label>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-amber-400"
              placeholder="اكتب اسمك"
              required
            />
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
            disabled={loading}
            className="w-full rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
          >
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-4 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-white/10"
        >
          العودة للرئيسية
        </button>
      </div>
    </main>
  );
}