"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CloudDownload,
  DatabaseZap,
  Link2,
  Loader2,
  Radio,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Unlink,
} from "lucide-react";
import { auth } from "@/lib/firebase";

type Config = {
  enabled: boolean;
  leagueId: number | null;
  season: number;
  providerLeagueName: string | null;
  providerAvailableSeasons: number[];
  seasonAvailability: "unknown" | "pending" | "available";
  lastSeasonCheckAt: number | null;
  seasonAvailableAt: number | null;
  lastDiscoveryAt: number | null;
  syncSchedule: boolean;
  syncStatus: boolean;
  syncResults: boolean;
  syncMode: "protected_auto" | "review_only";
  autoDiscover: boolean;
  lastSyncAt: number | null;
  lastSuccessAt: number | null;
  lastError: string | null;
};

type Mapping = {
  matchId: string;
  label: string;
  kickoffAt: number;
  providerFixtureId: number | null;
  providerStatusShort: string | null;
  providerLastSyncedAt: number | null;
  providerSyncState: string;
  providerSyncMessage: string | null;
  calculationStatus: string;
};

type League = {
  id: number;
  name: string;
  country: string;
  type: string;
  logo: string | null;
  seasons: number[];
};

const DATE_LOCALE = "ar-SA-u-ca-gregory-nu-latn";

function formatDate(timestamp: number | null) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat(DATE_LOCALE, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Riyadh",
  }).format(new Date(timestamp));
}

function stateLabel(state: string) {
  if (state === "calculated") return "محتسبة";
  if (state === "verified") return "متحقق منها";
  if (state === "awaiting_review") return "بانتظار التحقق";
  if (state === "conflict") return "تعارض";
  if (state === "synced") return "متزامنة";
  if (state === "linked") return "مرتبطة";
  return "غير مرتبطة";
}

function stateClass(state: string) {
  if (state === "conflict") return "border-red-300/20 bg-red-400/10 text-red-100";
  if (state === "calculated" || state === "verified") return "border-emerald-300/20 bg-emerald-300/10 text-emerald-100";
  if (state === "awaiting_review") return "border-amber-300/20 bg-amber-300/10 text-amber-100";
  if (state === "linked" || state === "synced") return "border-sky-300/20 bg-sky-300/10 text-sky-100";
  return "border-white/10 bg-white/5 text-slate-300";
}

export default function AdminTournamentSportsApi() {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [search, setSearch] = useState("Gulf Cup");
  const [leagues, setLeagues] = useState<League[]>([]);
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [manualIds, setManualIds] = useState<Record<string, string>>({});

  async function adminFetch(path: string, init?: RequestInit) {
    const currentAdmin = auth.currentUser;
    if (!currentAdmin) throw new Error("أعد تسجيل دخول الأدمن");
    const token = await currentAdmin.getIdToken();
    const response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
      cache: "no-store",
    });
    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok || data.ok === false) throw new Error(String(data.error || "تعذر تنفيذ العملية"));
    return data;
  }

  async function load() {
    setWorking((current) => current || "load");
    setError("");
    try {
      const data = await adminFetch("/api/tournaments/sports");
      setHasApiKey(data.hasApiKey === true);
      setConfig(data.config as Config);
      const nextMappings = (Array.isArray(data.mappings) ? data.mappings : []) as Mapping[];
      setMappings(nextMappings);
      setManualIds(Object.fromEntries(nextMappings.map((item) => [item.matchId, item.providerFixtureId ? String(item.providerFixtureId) : ""])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل إعدادات Sports API");
    } finally {
      setWorking((current) => (current === "load" ? "" : current));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function post(action: string, payload?: Record<string, unknown>) {
    return adminFetch("/api/tournaments/sports", {
      method: "POST",
      body: JSON.stringify({ action, ...(payload || {}) }),
    });
  }

  async function testConnection() {
    setWorking("test"); setMessage(""); setError("");
    try {
      const data = await post("test");
      setMessage(`تم الاتصال بـ API-FOOTBALL بنجاح${data.quotaRemaining != null ? ` · المتبقي اليوم: ${data.quotaRemaining}` : ""}.`);
      setHasApiKey(true);
    } catch (testError) { setError(testError instanceof Error ? testError.message : "فشل اختبار الاتصال"); }
    finally { setWorking(""); }
  }

  async function searchLeagues() {
    setWorking("search"); setMessage(""); setError("");
    try {
      const data = await post("search_leagues", { search });
      setLeagues((Array.isArray(data.leagues) ? data.leagues : []) as League[]);
      if (!Array.isArray(data.leagues) || data.leagues.length === 0) setMessage("لم يجد المزود بطولة مطابقة؛ جرّب Gulf أو Arabian Gulf.");
    } catch (searchError) { setError(searchError instanceof Error ? searchError.message : "تعذر البحث"); }
    finally { setWorking(""); }
  }

  async function saveConfig() {
    if (!config) return;
    setWorking("save"); setMessage(""); setError("");
    try {
      const data = await post("save_config", config as unknown as Record<string, unknown>);
      setConfig(data.config as Config);
      setMessage("تم حفظ إعدادات Sports API.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "تعذر الحفظ"); }
    finally { setWorking(""); }
  }

  async function checkSeason() {
    setWorking("season"); setMessage(""); setError("");
    try {
      const data = await post("check_season");
      if (data.available === true) {
        setMessage(`ممتاز: موسم ${data.season || 2026} أصبح متاحًا لدى ${data.leagueName || "Gulf Cup of Nations"}. يمكن الآن اكتشاف وربط المباريات.`);
      } else {
        const seasons = Array.isArray(data.seasons) ? (data.seasons as number[]).join("، ") : "";
        setMessage(`تم اعتماد Gulf Cup of Nations (ID 25)، لكن موسم 2026 لم يظهر بعد${seasons ? ` · المواسم الحالية: ${seasons}` : ""}. النظام سيعيد الفحص تلقائيًا.`);
      }
      await load();
    } catch (seasonError) {
      setError(seasonError instanceof Error ? seasonError.message : "تعذر فحص موسم 2026");
    } finally {
      setWorking("");
    }
  }

  async function configureGulfCup27() {
    if (!config) return;
    setWorking("configure-gulf"); setMessage(""); setError("");
    try {
      const nextConfig: Config = {
        ...config,
        enabled: true,
        leagueId: 25,
        season: 2026,
        syncSchedule: true,
        syncStatus: true,
        syncResults: true,
        syncMode: "protected_auto",
        autoDiscover: true,
      };
      const saved = await post("save_config", nextConfig as unknown as Record<string, unknown>);
      setConfig(saved.config as Config);
      const season = await post("check_season");
      await load();
      setMessage(
        season.available === true
          ? "تم اعتماد خليجي 27 على Gulf Cup of Nations (ID 25) وموسم 2026 متاح الآن."
          : "تم اعتماد خليجي 27 على Gulf Cup of Nations (ID 25). موسم 2026 غير متاح بعد وسيتم رصده تلقائيًا دون استخدام بطولة U23.",
      );
    } catch (configError) {
      setError(configError instanceof Error ? configError.message : "تعذر اعتماد إعداد خليجي 27");
    } finally {
      setWorking("");
    }
  }

  async function discover() {
    setWorking("discover"); setMessage(""); setError("");
    try {
      const data = await post("discover");
      if (data.seasonPending === true) {
        setMessage(String(data.message || "موسم 2026 غير متاح بعد لدى API-FOOTBALL، وسيستمر النظام في مراقبته تلقائيًا."));
      } else {
        setMessage(`اكتشاف المباريات: تم ربط ${data.linked || 0} مباراة، والمتبقي بدون ربط ${(data.unmatched as unknown[])?.length || 0}.`);
      }
      await load();
    } catch (discoverError) { setError(discoverError instanceof Error ? discoverError.message : "تعذر اكتشاف المباريات"); }
    finally { setWorking(""); }
  }

  async function syncNow() {
    setWorking("sync"); setMessage(""); setError("");
    try {
      const data = await post("sync");
      if (data.skipped === true && data.reason === "season_not_available") {
        setMessage("المزامنة جاهزة، لكن موسم خليجي 27 لعام 2026 لم يظهر لدى API-FOOTBALL بعد. سيتم فحص توفره تلقائيًا كل 12 ساعة.");
      } else if (data.skipped === true && data.reason === "no_mapped_matches") {
        setMessage("لا توجد مباريات مرتبطة بعد. عند ظهور موسم 2026 سيحاول النظام اكتشافها وربطها تلقائيًا.");
      } else {
        setMessage(`المزامنة: فحص ${data.checked || 0} · تحديث ${data.updated || 0} · احتساب تلقائي ${data.calculated || 0} · تعارض ${data.conflicts || 0} · بانتظار تحقق ${data.awaitingReview || 0}.`);
      }
      await load();
    } catch (syncError) { setError(syncError instanceof Error ? syncError.message : "تعذرت المزامنة"); }
    finally { setWorking(""); }
  }

  async function mapFixture(matchId: string, unlink = false) {
    setWorking(`map-${matchId}`); setMessage(""); setError("");
    try {
      await post("map_fixture", { matchId, providerFixtureId: unlink ? null : Number(manualIds[matchId] || 0) });
      setMessage(unlink ? "تم إلغاء ربط المباراة." : "تم حفظ Fixture ID للمباراة.");
      await load();
    } catch (mapError) { setError(mapError instanceof Error ? mapError.message : "تعذر حفظ الربط"); }
    finally { setWorking(""); }
  }

  async function approveResult(matchId: string) {
    if (typeof window !== "undefined" && !window.confirm("اعتماد النتيجة المرصودة من المزود واحتساب التوقعات الآن؟")) return;
    setWorking(`approve-${matchId}`); setMessage(""); setError("");
    try {
      const data = await post("approve_result", { matchId });
      setMessage(`تم اعتماد النتيجة واحتساب ${data.predictionsCalculated || 0} توقع.`);
      await load();
    } catch (approveError) { setError(approveError instanceof Error ? approveError.message : "تعذر اعتماد النتيجة"); }
    finally { setWorking(""); }
  }

  const counts = useMemo(() => ({
    linked: mappings.filter((item) => item.providerFixtureId).length,
    conflicts: mappings.filter((item) => item.providerSyncState === "conflict").length,
    awaiting: mappings.filter((item) => item.providerSyncState === "awaiting_review").length,
  }), [mappings]);

  const isOfficialGulfCup = config?.leagueId === 25 && config?.season === 2026;
  const seasonIsAvailable = config?.seasonAvailability === "available";

  if (!config) {
    return <div className="mt-5 flex min-h-[180px] items-center justify-center rounded-3xl border border-white/10 bg-black/20 text-slate-300"><Loader2 className="ml-2 h-5 w-5 animate-spin" aria-hidden="true" />تحميل إعدادات Sports API…</div>;
  }

  return (
    <div className="mt-5 space-y-5">
      <section className="rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.045] p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-black text-cyan-100"><Radio className="h-3.5 w-3.5" aria-hidden="true" />Sports API</span>
            <h3 className="mt-3 text-xl font-black text-white">API-FOOTBALL — مزامنة خليجي 27</h3>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-300">المفتاح يبقى في السيرفر فقط. وضع الحماية يتحقق من النتيجة النهائية في قراءتين منفصلتين قبل الاحتساب التلقائي، وأي اختلاف يتحول إلى تعارض يحتاج مراجعة الأدمن.</p>
          </div>
          <div className={`rounded-2xl border px-4 py-3 text-xs font-black ${hasApiKey ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" : "border-amber-300/20 bg-amber-300/10 text-amber-100"}`}>
            {hasApiKey ? <><CheckCircle2 className="mb-1 h-4 w-4" aria-hidden="true" />مفتاح API موجود</> : <><AlertTriangle className="mb-1 h-4 w-4" aria-hidden="true" />API_FOOTBALL_KEY غير مضاف</>}
          </div>
        </div>

        {!hasApiKey && <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4 text-xs font-bold leading-6 text-amber-50">أضف المتغير <span dir="ltr" className="rounded bg-black/25 px-1.5 py-0.5 [unicode-bidi:isolate]">API_FOOTBALL_KEY</span> داخل <span dir="ltr" className="[unicode-bidi:isolate]">.env.local</span> محليًا وEnvironment Variables في Vercel. لا تضع المفتاح في الكود.</div>}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => void testConnection()} disabled={Boolean(working)} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 text-xs font-black text-cyan-100 disabled:opacity-50">{working === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseZap className="h-4 w-4" />}اختبار الاتصال</button>
          <button type="button" onClick={() => void syncNow()} disabled={Boolean(working) || !config.enabled} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-400 px-4 text-xs font-black text-slate-950 disabled:opacity-50">{working === "sync" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}مزامنة الآن</button>
        </div>
      </section>

      {(message || error) && <div role={error ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm font-bold ${error ? "border-red-300/20 bg-red-400/10 text-red-100" : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"}`}>{error || message}</div>}

      <section className="rounded-3xl border border-white/10 bg-black/20 p-4 md:p-5">
        <h4 className="flex items-center gap-2 font-black text-white"><ShieldCheck className="h-5 w-5 text-emerald-300" aria-hidden="true" />إعداد الربط والحماية</h4>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-bold text-slate-300">League ID<input type="number" inputMode="numeric" value={config.leagueId ?? ""} onChange={(e) => setConfig({ ...config, leagueId: e.target.value ? Number(e.target.value) : null })} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-3 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" /></label>
          <label className="text-xs font-bold text-slate-300">الموسم<input type="number" value={config.season} onChange={(e) => setConfig({ ...config, season: Number(e.target.value) || 2026 })} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-3 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" /></label>
          <label className="text-xs font-bold text-slate-300">وضع النتائج<select value={config.syncMode} onChange={(e) => setConfig({ ...config, syncMode: e.target.value as Config["syncMode"] })} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-slate-900 px-3"><option value="protected_auto">تلقائي مع حماية الاستثناءات</option><option value="review_only">مراجعة الأدمن قبل الاحتساب</option></select></label>
          <label className="flex min-h-[48px] items-center gap-3 self-end rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black"><input type="checkbox" checked={config.enabled} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} className="h-5 w-5 accent-emerald-400" />تفعيل المزامنة</label>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {([['syncSchedule','المواعيد والملاعب'],['syncStatus','حالة المباراة'],['syncResults','النتائج النهائية'],['autoDiscover','المزامنة التلقائية']] as const).map(([key,label]) => <label key={key} className="flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold"><input type="checkbox" checked={config[key]} onChange={(e) => setConfig({ ...config, [key]: e.target.checked })} className="h-4 w-4 accent-cyan-400" />{label}</label>)}
        </div>
        <button type="button" onClick={() => void saveConfig()} disabled={Boolean(working)} className="mt-4 inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-black text-slate-950 disabled:opacity-50">{working === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}حفظ الإعدادات</button>
      </section>

      <section className={`rounded-3xl border p-4 md:p-5 ${seasonIsAvailable ? "border-emerald-300/20 bg-emerald-300/[0.06]" : "border-amber-300/20 bg-amber-300/[0.055]"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-black text-white">رصد خليجي 27 الرسمي</h4>
              <span dir="ltr" className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black text-cyan-100">League ID 25</span>
              <span dir="ltr" className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black text-white">Season 2026</span>
            </div>
            <p className="mt-2 max-w-3xl text-xs font-semibold leading-6 text-slate-300">نعتمد فقط <strong className="text-white">Gulf Cup of Nations</strong>. بطولة <span dir="ltr" className="[unicode-bidi:isolate]">Arabian Gulf Cup U23 (ID 1208)</span> مستبعدة نهائيًا حتى لو كان موسم 2026 ظاهرًا لديها.</p>
            {isOfficialGulfCup ? (
              <p className={`mt-2 text-xs font-black ${seasonIsAvailable ? "text-emerald-200" : "text-amber-100"}`}>
                {seasonIsAvailable
                  ? "موسم 2026 متاح — الربط والمزامنة التلقائية جاهزان."
                  : `موسم 2026 لم يظهر بعد. آخر المواسم لدى المزود: ${config.providerAvailableSeasons.length ? config.providerAvailableSeasons.join("، ") : "لم يتم الفحص بعد"}.`}
              </p>
            ) : (
              <p className="mt-2 text-xs font-black text-amber-100">الإعداد الحالي ليس خليجي 27 الرسمي. استخدم زر الاعتماد أدناه.</p>
            )}
            {config.lastSeasonCheckAt && <p className="mt-1 text-[11px] font-semibold text-slate-500">آخر فحص للموسم: {formatDate(config.lastSeasonCheckAt)} · الفحص التلقائي كل 12 ساعة أثناء عدم توفر الموسم.</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void configureGulfCup27()} disabled={Boolean(working)} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-amber-300 px-4 text-xs font-black text-slate-950 disabled:opacity-50">{working === "configure-gulf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}اعتماد خليجي 27</button>
            <button type="button" onClick={() => void checkSeason()} disabled={Boolean(working) || !config.leagueId} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black text-white disabled:opacity-50">{working === "season" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}فحص موسم 2026 الآن</button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/20 p-4 md:p-5">
        <h4 className="font-black text-white">البحث عن البطولة لدى API-FOOTBALL</h4>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void searchLeagues(); }} placeholder="Gulf Cup" className="h-12 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"/><button type="button" onClick={() => void searchLeagues()} disabled={Boolean(working)} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-black"><Search className="h-4 w-4" />بحث</button></div>
        {leagues.length > 0 && <div className="mt-3 grid gap-2 md:grid-cols-2">{leagues.slice(0,8).map((league) => {
          const isSeniorGulfCup = league.id === 25;
          const isU23 = league.id === 1208 || /u23/i.test(league.name);
          return <button key={league.id} type="button" disabled={isU23} onClick={() => setConfig({ ...config, leagueId: league.id, season: isSeniorGulfCup ? 2026 : (league.seasons.includes(2026) ? 2026 : (league.seasons[0] || config.season)) })} className={`min-h-[76px] rounded-2xl border p-3 text-right transition ${isU23 ? "cursor-not-allowed border-red-300/10 bg-red-400/[0.04] opacity-60" : isSeniorGulfCup ? "border-emerald-300/25 bg-emerald-300/[0.08] hover:bg-emerald-300/[0.12]" : "border-white/10 bg-white/5 hover:bg-white/10"}`}><div className="flex items-center justify-between gap-2"><span className="font-black text-white">{league.name}</span><span dir="ltr" className="rounded-lg bg-black/20 px-2 py-1 text-xs font-black text-cyan-200">ID {league.id}</span></div><p className="mt-1 text-xs text-slate-400">{league.country || "—"} · {league.type || "Cup"} · المواسم: {league.seasons.slice(0,6).join(', ') || '—'}</p>{isSeniorGulfCup && <p className="mt-1 text-[11px] font-black text-emerald-200">✓ هذه البطولة الرسمية لخليجي 27 — ننتظر ظهور موسم 2026.</p>}{isU23 && <p className="mt-1 text-[11px] font-black text-red-200">مستبعدة: بطولة تحت 23 سنة وليست خليجي 27.</p>}</button>;
        })}</div>}
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/20 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-black text-white">ربط المباريات</h4><p className="mt-1 text-xs text-slate-400">مرتبط {counts.linked}/{mappings.length} · تعارض {counts.conflicts} · بانتظار تحقق {counts.awaiting}</p></div><button type="button" onClick={() => void discover()} disabled={Boolean(working) || !config.leagueId} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 text-xs font-black text-emerald-100 disabled:opacity-50">{working === "discover" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />}اكتشاف وربط تلقائي</button></div>
        <div className="mt-4 space-y-2">{mappings.map((item) => <div key={item.matchId} className="rounded-2xl border border-white/10 bg-slate-950/45 p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="font-black text-white">{item.label}</span><span className={`rounded-full border px-2 py-1 text-[10px] font-black ${stateClass(item.providerSyncState)}`}>{stateLabel(item.providerSyncState)}</span>{item.providerStatusShort && <span dir="ltr" className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-300">{item.providerStatusShort}</span>}</div><p className="mt-1 text-xs text-slate-500">{formatDate(item.kickoffAt)}{item.providerLastSyncedAt ? ` · آخر مزامنة ${formatDate(item.providerLastSyncedAt)}` : ""}</p>{item.providerSyncMessage && <p className={`mt-1 text-xs font-bold ${item.providerSyncState === 'conflict' ? 'text-red-200' : 'text-slate-400'}`}>{item.providerSyncMessage}</p>}</div><div className="flex flex-wrap items-center gap-2"><input aria-label={`Fixture ID ${item.label}`} dir="ltr" inputMode="numeric" value={manualIds[item.matchId] || ""} onChange={(e) => setManualIds({ ...manualIds, [item.matchId]: e.target.value })} placeholder="Fixture ID" className="h-10 w-32 rounded-xl border border-white/10 bg-black/25 px-2 text-center text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"/><button type="button" onClick={() => void mapFixture(item.matchId)} disabled={Boolean(working)} className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 text-[11px] font-black"><Link2 className="h-3.5 w-3.5" />ربط</button>{item.providerFixtureId && <button type="button" onClick={() => void mapFixture(item.matchId, true)} disabled={Boolean(working)} className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-red-300/15 bg-red-400/10 px-3 text-[11px] font-black text-red-100"><Unlink className="h-3.5 w-3.5" />فصل</button>}{item.providerSyncState === "awaiting_review" && item.calculationStatus !== "calculated" && <button type="button" onClick={() => void approveResult(item.matchId)} disabled={Boolean(working)} className="inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-amber-300 px-3 text-[11px] font-black text-slate-950"><CheckCircle2 className="h-3.5 w-3.5" />اعتماد النتيجة</button>}</div></div></div>)}</div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 text-xs font-semibold leading-6 text-slate-400"><p><strong className="text-slate-200">المزامنة التلقائية:</strong> عند وجود مستخدم نشط في المنصة يعمل Heartbeat بخادم المنصة. قبل المباريات البعيدة تكون المزامنة قليلة، وتزداد حول وقت المباراة، مع حد أدنى يمنع استنزاف حصة API.</p><p className="mt-2">آخر مزامنة: {formatDate(config.lastSyncAt)} · آخر نجاح: {formatDate(config.lastSuccessAt)}{config.lastError ? ` · آخر خطأ: ${config.lastError}` : ""}</p></section>
    </div>
  );
}
