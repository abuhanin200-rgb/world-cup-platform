"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const router = useRouter();
  const { loading, isLoggedIn } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (isLoggedIn) {
      router.replace("/account");
    } else {
      router.replace("/login");
    }
  }, [loading, isLoggedIn, router]);

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 text-white"
    >
      <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 h-14 w-14 animate-pulse rounded-full bg-amber-400/30" />

        <h1 className="text-xl font-black">جاري تحويلك...</h1>

        <p className="mt-2 text-sm text-slate-300">
          لحظات ويتم نقلك إلى صفحة الحساب.
        </p>
      </div>
    </main>
  );
}