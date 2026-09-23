"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  UserRoundX,
  UsersRound,
} from "lucide-react";
import { GULF_CUP_27_TOURNAMENT_ID } from "@/domain/tournaments";
import {
  buildGulf27ReturnReminderMessage,
  buildGulf27WhatsappUrl,
  getTournamentMembersWithoutPredictionsV2,
  normalizeWhatsappPhone,
  type TournamentMissingMemberV2,
} from "@/lib/adminTournamentMissingMembersV2";

type Summary = {
  totalMembers: number;
  predictedMembers: number;
  missingMembers: number;
  missingPhone: number;
};

const EMPTY_SUMMARY: Summary = {
  totalMembers: 0,
  predictedMembers: 0,
  missingMembers: 0,
  missingPhone: 0,
};

export default function AdminTournamentMissingMembersV2() {
  const [members, setMembers] = useState<TournamentMissingMemberV2[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [onlyWithPhone, setOnlyWithPhone] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await getTournamentMembersWithoutPredictionsV2(
        GULF_CUP_27_TOURNAMENT_ID,
      );
      setMembers(result.members);
      setSummary({
        totalMembers: result.totalMembers,
        predictedMembers: result.predictedMembers,
        missingMembers: result.missingMembers,
        missingPhone: result.missingPhone,
      });
    } catch (loadError) {
      console.error("Gulf 27 missing members load error:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "تعذر تحميل قائمة الأعضاء غير المتوقّعين",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void load());
  }, []);

  const visibleMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return members.filter((member) => {
      if (onlyWithPhone && !normalizeWhatsappPhone(member.phone)) return false;
      if (!query) return true;
      return [member.fullName, member.phone, member.favoriteTeam]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [members, onlyWithPhone, search]);

  async function copyMessage() {
    await navigator.clipboard.writeText(buildGulf27ReturnReminderMessage());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function copyPhones() {
    const phones = visibleMembers
      .map((member) => normalizeWhatsappPhone(member.phone))
      .filter(Boolean);
    if (phones.length === 0) return;
    await navigator.clipboard.writeText(phones.join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="mt-5 rounded-3xl border border-amber-300/15 bg-amber-300/[0.04] p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-amber-200">
            <UserRoundX className="h-5 w-5" aria-hidden="true" />
            <p className="text-xs font-black">تذكير عودة التحديات</p>
          </div>
          <h3 className="mt-1 text-lg font-black text-white md:text-xl">
            أعضاء لم يشاركوا في توقعات خليجي 27
          </h3>
          <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-300">
            القائمة تشمل الأعضاء المسجلين الذين لا يوجد لهم أي توقع في خليجي الديار العربية 27 حتى الآن، مع رسالة واتساب جاهزة للتذكير بعودة التحديات.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black text-white hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          تحديث القائمة
        </button>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/10 p-3 text-sm font-bold text-red-100">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي الأعضاء" value={summary.totalMembers} tone="slate" />
        <StatCard label="شاركوا بالتوقع" value={summary.predictedMembers} tone="emerald" />
        <StatCard label="لم يتوقعوا" value={summary.missingMembers} tone="amber" />
        <StatCard label="بدون رقم جوال" value={summary.missingPhone} tone="rose" />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/45 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-slate-400">نص التذكير</p>
            <p className="mt-1 text-sm font-black text-white">
              🔥 التحديات رجعت! · بدأت توقعات خليجي الديار العربية 27
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyMessage()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 text-xs font-black text-emerald-100 hover:bg-emerald-300/15"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              نسخ الرسالة
            </button>
            <button
              type="button"
              onClick={() => void copyPhones()}
              disabled={visibleMembers.every((member) => !normalizeWhatsappPhone(member.phone))}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black text-slate-200 hover:bg-white/10 disabled:opacity-40"
            >
              <Copy className="h-4 w-4" />
              نسخ الأرقام الظاهرة
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث بالاسم أو الجوال أو المنتخب..."
            className="h-12 w-full rounded-xl border border-white/10 bg-slate-950/60 pr-10 pl-3 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          />
        </label>
        <label className="flex min-h-[48px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black text-slate-200">
          <input
            type="checkbox"
            checked={onlyWithPhone}
            onChange={(event) => setOnlyWithPhone(event.target.checked)}
          />
          لديهم رقم واتساب فقط
        </label>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/45">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <UsersRound className="h-4 w-4 text-amber-200" aria-hidden="true" />
            <span className="text-sm font-black text-white">القائمة</span>
          </div>
          <span className="rounded-full border border-amber-300/15 bg-amber-300/10 px-2.5 py-1 text-[11px] font-black text-amber-100">
            {visibleMembers.length} عضو
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-300">
            <Loader2 className="mx-auto h-6 w-6 animate-spin" aria-hidden="true" />
            <p className="mt-2 text-sm font-bold">جاري مطابقة الأعضاء مع توقعات البطولة...</p>
          </div>
        ) : visibleMembers.length === 0 ? (
          <div className="p-8 text-center text-sm font-bold text-slate-300">
            {members.length === 0
              ? "ممتاز — جميع الأعضاء شاركوا في توقعات خليجي 27 حتى الآن."
              : "لا توجد نتائج مطابقة للبحث الحالي."}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {visibleMembers.map((member, index) => {
              const whatsappUrl = buildGulf27WhatsappUrl(member.phone, member.fullName);
              return (
                <div key={member.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-xs font-black text-slate-300">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">
                        {member.fullName}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-400">
                        <span dir="ltr" className="[unicode-bidi:isolate]">
                          {member.phone || "لا يوجد رقم جوال"}
                        </span>
                        {member.favoriteTeam && (
                          <span>· {member.teamEmoji} {member.favoriteTeam}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-xs font-black text-slate-950 hover:bg-emerald-300"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                      تذكير واتساب
                    </a>
                  ) : (
                    <span className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black text-slate-500">
                      لا يوجد جوال
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "emerald" | "amber" | "rose";
}) {
  const classes = {
    slate: "border-white/10 bg-white/[0.04] text-white",
    emerald: "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-100",
    amber: "border-amber-300/15 bg-amber-300/[0.06] text-amber-100",
    rose: "border-rose-300/15 bg-rose-300/[0.06] text-rose-100",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <p className="text-xs font-bold opacity-65">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
