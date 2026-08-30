"use client";

import { useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { auth } from "@/lib/firebase";

type MigrationResult = {
  processed: number;
  migrated: number;
  alreadySecure: number;
  unresolved: number;
  nextCursor: string | null;
  done: boolean;
  error?: string;
};

export default function AdminMemberSecurityMigration() {
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({
    processed: 0,
    migrated: 0,
    alreadySecure: 0,
    unresolved: 0,
  });

  async function migrateAll() {
    setWorking(true);
    setMessage("");
    setError("");
    setProgress({ processed: 0, migrated: 0, alreadySecure: 0, unresolved: 0 });

    try {
      const currentAdmin = auth.currentUser;
      if (!currentAdmin) throw new Error("جلسة الأدمن غير موجودة، أعد فتح لوحة التحكم");

      const token = await currentAdmin.getIdToken();
      let cursor: string | null = null;
      let totalProcessed = 0;
      let totalMigrated = 0;
      let totalSecure = 0;
      let totalUnresolved = 0;
      let safetyCounter = 0;

      do {
        const response = await fetch("/api/admin/migrate-member-credentials", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ cursor }),
        });
        const result = (await response.json()) as MigrationResult;

        if (!response.ok) {
          throw new Error(result.error || "تعذر ترحيل حسابات الأعضاء");
        }

        totalProcessed += result.processed;
        totalMigrated += result.migrated;
        totalSecure += result.alreadySecure;
        totalUnresolved += result.unresolved;
        cursor = result.nextCursor;
        safetyCounter += 1;

        setProgress({
          processed: totalProcessed,
          migrated: totalMigrated,
          alreadySecure: totalSecure,
          unresolved: totalUnresolved,
        });

        if (result.done || safetyCounter >= 200) break;
      } while (cursor);

      setMessage(
        totalUnresolved > 0
          ? `اكتمل الترحيل. تم تأمين ${totalMigrated + totalSecure} حسابًا، ويوجد ${totalUnresolved} حسابًا قديمًا بدون كلمة مرور يحتاج مراجعة.`
          : `اكتمل ترحيل الأمان بنجاح. تمت معالجة ${totalProcessed} حسابًا بدون تغيير النقاط أو التوقعات.`,
      );
    } catch (migrationError) {
      setError(
        migrationError instanceof Error
          ? migrationError.message
          : "تعذر تنفيذ ترحيل الأمان",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.05] p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h3 className="flex items-center gap-2 text-lg font-black text-white md:text-xl">
            <ShieldCheck className="h-5 w-5 text-cyan-200" aria-hidden="true" />
            أمان حسابات الأعضاء
          </h3>
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-300">
            ينقل كلمات المرور القديمة من وثائق users إلى memberCredentials مشفرة بـ scrypt، ويحذف الحقل النصي password. أسماء الأعضاء ونقاط كأس العالم وتوقعاتهم لا تتغير.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void migrateAll()}
          disabled={working}
          className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 text-sm font-black text-slate-950 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-55"
        >
          {working ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <KeyRound className="h-4 w-4" aria-hidden="true" />
          )}
          {working ? "جاري تأمين الحسابات..." : "ترحيل أمان الأعضاء"}
        </button>
      </div>

      {(working || progress.processed > 0) && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
            <div className="text-xl font-black">{progress.processed}</div>
            <div className="mt-1 text-[11px] font-bold text-slate-400">تمت معالجتها</div>
          </div>
          <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-3">
            <div className="text-xl font-black text-emerald-200">{progress.migrated}</div>
            <div className="mt-1 text-[11px] font-bold text-emerald-100/60">ترحيل جديد</div>
          </div>
          <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-3">
            <div className="text-xl font-black text-cyan-200">{progress.alreadySecure}</div>
            <div className="mt-1 text-[11px] font-bold text-cyan-100/60">مؤمّنة مسبقًا</div>
          </div>
          <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] p-3">
            <div className="text-xl font-black text-amber-200">{progress.unresolved}</div>
            <div className="mt-1 text-[11px] font-bold text-amber-100/60">تحتاج مراجعة</div>
          </div>
        </div>
      )}

      {(message || error) && (
        <div
          role={error ? "alert" : "status"}
          aria-live="polite"
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-black ${
            error
              ? "border-red-300/20 bg-red-400/10 text-red-100"
              : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
          }`}
        >
          {error || message}
        </div>
      )}
    </section>
  );
}
