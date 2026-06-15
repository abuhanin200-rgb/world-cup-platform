"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const forgotPasswordMessage = `السلام عليكم، نسيت الرقم السري في منصة توقعات كأس العالم 2026.

*بيانات التحقق*

الاسم المسجل:
رقم الجوال المسجل:
المنتخب المرشح:

أرجو إعادة تعيين كلمة المرور.`;

const forgotPasswordWhatsappUrl = `https://wa.me/966542180200?text=${encodeURIComponent(
  forgotPasswordMessage
)}`;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggedIn, loading: authLoading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      router.push("/");
    }
  }, [authLoading, isLoggedIn, router]);

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
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 text-white"
    >
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10">
            <img
              src="/wc2026-logo.png"
              alt="شعار المنصة"
              className="h-full w-full object-contain p-2"
            />
          </div>

          <h1 className="mb-2 text-2xl font-black">تسجيل الدخول</h1>

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
            disabled={loading || authLoading}
            className="w-full rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
          >
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => router.push("/register")}
          className="mt-4 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-white/10"
        >
          ما عندك حساب؟ تسجيل جديد
        </button>

        <a
          href={forgotPasswordWhatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full items-center justify-center rounded-xl border border-red-300/40 bg-red-600 px-4 py-3 text-center text-sm font-black text-white shadow-lg shadow-red-950/30 hover:bg-red-500"
        >
          🔐 نسيت الرقم السري؟ تواصل معنا واتساب
        </a>

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