"use client";

import { useEffect, useState } from "react";
import AdminMemberSecurityMigration from "@/components/AdminMemberSecurityMigration";
import AdminTournamentV2Management from "@/components/AdminTournamentV2Management";
import AdminTournamentNotifications from "@/components/AdminTournamentNotifications";
import AdminTournamentEngagementV2 from "@/components/AdminTournamentEngagementV2";
import AdminTournamentSportsApi from "@/components/AdminTournamentSportsApi";
import AdminTournamentPredictionsManager from "@/components/AdminTournamentPredictionsManager";
import {
  BellRing,
  Calculator,
  CalendarDays,
  CheckCircle2,
  Database,
  GitBranch,
  Hash,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  Newspaper,
  RefreshCw,
  RotateCcw,
  Settings2,
  Satellite,
  ShieldCheck,
  Trophy,
  UnlockKeyhole,
  UsersRound,
} from "lucide-react";
import {
  ASIAN_CUP_2027_TOURNAMENT_ID,
  GULF_CUP_27_KNOCKOUT_SCORING_V1,
  GULF_CUP_27_SCORING_V1,
  GULF_CUP_27_TOURNAMENT_ID,
  getGulfCup27Team,
  type TournamentQualificationMethod,
} from "@/domain/tournaments";
import { addAdminLog } from "@/lib/adminLogs";
import {
  calculateTournamentMatchViaServerV2,
  undoTournamentMatchCalculationViaServerV2,
} from "@/lib/adminTournamentPredictionsApiV2";
import {
  sendTournamentAnnouncementV2,
  sendTournamentMatchReminderV2,
} from "@/lib/tournamentNotificationsV2";
import {
  getTournamentMatchesV2,
  initializeGulfCup27V2Data,
  setAllTournamentPredictionsOpen,
  setTournamentMatchPredictionEditingOpen,
  setTournamentMatchPredictionOpen,
  syncGulfCup27KnockoutBracketV2,
  type TournamentMatchRuntimeV2,
} from "@/lib/tournamentV2Firestore";

const DATE_LOCALE = "ar-SA-u-ca-gregory-nu-latn";

type ResultDraft = {
  home: string;
  away: string;
  qualifiedTeamId: string;
  qualificationMethod: TournamentQualificationMethod | "";
  extraHome: string;
  extraAway: string;
  penaltiesHome: string;
  penaltiesAway: string;
};

function emptyDraft(): ResultDraft {
  return {
    home: "",
    away: "",
    qualifiedTeamId: "",
    qualificationMethod: "",
    extraHome: "",
    extraAway: "",
    penaltiesHome: "",
    penaltiesAway: "",
  };
}

function teamName(teamId: string, fallback?: string | null) {
  return getGulfCup27Team(teamId)?.nameAr || fallback || "لم يتحدد";
}

function formatMatch(match: TournamentMatchRuntimeV2) {
  return `${teamName(match.homeTeamId, match.homeSourceLabel)} × ${teamName(match.awayTeamId, match.awaySourceLabel)}`;
}

function formatKickoff(timestamp: number) {
  return new Intl.DateTimeFormat(DATE_LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Riyadh",
  }).format(new Date(timestamp));
}

function calculationLabel(match: TournamentMatchRuntimeV2) {
  if (match.calculationStatus === "processing") return "جاري الاحتساب";
  if (match.calculationStatus === "calculated") return "محتسبة";
  if (match.calculationStatus === "error") return "خطأ احتساب";
  return "غير محتسبة";
}

function optionalScore(value: string) {
  if (value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

type TournamentAdminTab = "gulf27" | "asian2027";
type GulfAdminSection =
  | "overview"
  | "settings"
  | "teams"
  | "matches"
  | "results"
  | "notifications"
  | "engagement"
  | "sports"
  | "security";

export default function AdminTournamentV2Panel() {
  const [tournamentTab, setTournamentTab] = useState<TournamentAdminTab>("gulf27");
  const [sectionTab, setSectionTab] = useState<GulfAdminSection>("overview");
  const [matches, setMatches] = useState<TournamentMatchRuntimeV2[]>([]);
  const [resultDrafts, setResultDrafts] = useState<Record<string, ResultDraft>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const nextMatches = await getTournamentMatchesV2(
        GULF_CUP_27_TOURNAMENT_ID,
        { fallback: false },
      );
      setMatches(nextMatches);
      setResultDrafts((current) => {
        const next: Record<string, ResultDraft> = {};
        nextMatches.forEach((match) => {
          const existing = current[match.id] ?? emptyDraft();
          next[match.id] = {
            home: match.result.homeScore == null ? existing.home : String(match.result.homeScore),
            away: match.result.awayScore == null ? existing.away : String(match.result.awayScore),
            qualifiedTeamId: match.result.qualifiedTeamId ?? existing.qualifiedTeamId,
            qualificationMethod: match.result.qualificationMethod ?? existing.qualificationMethod,
            extraHome:
              match.result.extraTimeHomeScore == null
                ? existing.extraHome
                : String(match.result.extraTimeHomeScore),
            extraAway:
              match.result.extraTimeAwayScore == null
                ? existing.extraAway
                : String(match.result.extraTimeAwayScore),
            penaltiesHome:
              match.result.penaltiesHomeScore == null
                ? existing.penaltiesHome
                : String(match.result.penaltiesHomeScore),
            penaltiesAway:
              match.result.penaltiesAwayScore == null
                ? existing.penaltiesAway
                : String(match.result.penaltiesAwayScore),
          };
        });
        return next;
      });
    } catch (loadError) {
      console.error("Admin V2 tournament load error:", loadError);
      setError("تعذر تحميل بيانات خليجي 27");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void load());
  }, []);

  async function initialize() {
    setWorking("init");
    setMessage("");
    setError("");
    try {
      const result = await initializeGulfCup27V2Data();
      await syncGulfCup27KnockoutBracketV2();
      await addAdminLog({
        action: "other",
        title: "تهيئة خليجي 27",
        description: `تمت تهيئة ${result.teams} منتخبات و${result.matches} مباراة في Collections الجديدة.`,
        metadata: result,
      });
      setMessage("تمت تهيئة خليجي 27 وتحديث الأدوار الإقصائية بنجاح.");
      await load();
    } catch (initError) {
      setError(initError instanceof Error ? initError.message : "فشلت التهيئة");
    } finally {
      setWorking("");
    }
  }

  async function syncKnockout() {
    setWorking("sync-ko");
    setMessage("");
    setError("");
    try {
      const result = await syncGulfCup27KnockoutBracketV2();
      await addAdminLog({
        action: "other",
        title: "مزامنة أدوار خليجي 27 الإقصائية",
        description: `تمت المزامنة. أضيفت ${result.created} مباريات جديدة، وتغيرت ${result.changes.length} مواجهات.`,
        metadata: result,
      });
      setMessage(
        result.allGroupsFinished
          ? "تمت مزامنة نصف النهائي/النهائي حسب النتائج المعتمدة."
          : "تم تجهيز مباريات نصف النهائي والنهائي. سيتم تحديد المنتخبات تلقائيًا بعد اكتمال دور المجموعات.",
      );
      await load();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "تعذرت مزامنة الأدوار الإقصائية");
    } finally {
      setWorking("");
    }
  }

  async function toggle(match: TournamentMatchRuntimeV2) {
    const nextOpen = !match.predictionIsOpen;
    setWorking(`toggle-${match.id}`);
    setMessage("");
    setError("");
    try {
      await setTournamentMatchPredictionOpen(
        GULF_CUP_27_TOURNAMENT_ID,
        match.id,
        nextOpen,
      );
      await addAdminLog({
        action: "other",
        title: nextOpen ? "فتح توقعات خليجي 27" : "إغلاق توقعات خليجي 27",
        description: `${formatMatch(match)} — ${nextOpen ? "تم الفتح" : "تم الإغلاق"}.`,
        metadata: {
          tournamentId: GULF_CUP_27_TOURNAMENT_ID,
          matchId: match.id,
          predictionIsOpen: nextOpen,
        },
      });

      if (nextOpen) {
        try {
          const notification = await sendTournamentMatchReminderV2({
            tournamentId: GULF_CUP_27_TOURNAMENT_ID,
            matchId: match.id,
            matchLabel: formatMatch(match),
            mode: "prediction_open",
            route: "/tournaments/gulf-cup-27/predictions",
          });
          setMessage(`تم فتح التوقع وإرسال إشعار تلقائي إلى ${notification.recipients} عضو.`);
        } catch (notificationError) {
          console.error("Automatic prediction-open notification failed:", notificationError);
          setMessage("تم فتح التوقع، لكن تعذر إرسال إشعار الفتح التلقائي.");
        }
      } else {
        setMessage("تم إغلاق التوقع.");
      }
      await load();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "تعذر تحديث المباراة");
    } finally {
      setWorking("");
    }
  }

  async function toggleEditing(match: TournamentMatchRuntimeV2) {
    const nextOpen = !match.predictionEditingIsOpen;
    setWorking(`toggle-editing-${match.id}`);
    setMessage("");
    setError("");
    try {
      await setTournamentMatchPredictionEditingOpen(
        GULF_CUP_27_TOURNAMENT_ID,
        match.id,
        nextOpen,
      );
      await addAdminLog({
        action: "other",
        title: nextOpen ? "فتح تعديل توقعات خليجي 27" : "إغلاق تعديل توقعات خليجي 27",
        description: `${formatMatch(match)} — ${nextOpen ? "تم فتح التعديل" : "تم إغلاق التعديل"}.`,
        metadata: {
          tournamentId: GULF_CUP_27_TOURNAMENT_ID,
          matchId: match.id,
          predictionEditingIsOpen: nextOpen,
        },
      });
      setMessage(nextOpen ? "تم فتح تعديل التوقعات." : "تم إغلاق تعديل التوقعات.");
      await load();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "تعذر تغيير صلاحية تعديل التوقعات",
      );
    } finally {
      setWorking("");
    }
  }

  async function toggleAll(open: boolean) {
    setWorking(open ? "all-open" : "all-close");
    setMessage("");
    setError("");
    try {
      await setAllTournamentPredictionsOpen(GULF_CUP_27_TOURNAMENT_ID, open);
      await addAdminLog({
        action: "other",
        title: open ? "فتح توقعات خليجي 27 بالكامل" : "إغلاق توقعات خليجي 27 بالكامل",
        description: open
          ? "تم فتح جميع المباريات المكتملة الأطراف والقابلة للفتح."
          : "تم إغلاق التوقعات لجميع مباريات خليجي 27.",
        metadata: { tournamentId: GULF_CUP_27_TOURNAMENT_ID, open },
      });
      if (open) {
        try {
          const notification = await sendTournamentAnnouncementV2({
            tournamentId: GULF_CUP_27_TOURNAMENT_ID,
            title: "توقعات خليجي 27 مفتوحة الآن 🏆",
            message: "تم فتح التوقعات للمباريات المتاحة. ادخل وسجّل توقعك قبل الإغلاق.",
            route: "/tournaments/gulf-cup-27/predictions",
          });
          setMessage(`تم فتح المباريات القابلة للفتح وإرسال إشعار جماعي إلى ${notification.recipients} عضو.`);
        } catch (notificationError) {
          console.error("Bulk prediction-open notification failed:", notificationError);
          setMessage("تم فتح المباريات القابلة للفتح، لكن تعذر إرسال الإشعار الجماعي.");
        }
      } else {
        setMessage("تم إغلاق جميع التوقعات.");
      }
      await load();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "تعذر تنفيذ العملية");
    } finally {
      setWorking("");
    }
  }

  async function calculate(match: TournamentMatchRuntimeV2) {
    const draft = resultDrafts[match.id] ?? emptyDraft();
    const homeScore = Number(draft.home);
    const awayScore = Number(draft.away);

    if (
      draft.home === "" ||
      draft.away === "" ||
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 || awayScore < 0 || homeScore > 30 || awayScore > 30
    ) {
      setError("أدخل نتيجة صحيحة من 0 إلى 30 للفريقين");
      return;
    }

    let qualifiedTeamId: string | null = null;
    let qualificationMethod: TournamentQualificationMethod | null = null;

    if (match.stage === "knockout") {
      if (!match.homeTeamId || !match.awayTeamId) {
        setError("لم يتم تحديد طرفي المباراة بعد");
        return;
      }

      if (homeScore > awayScore) {
        qualifiedTeamId = match.homeTeamId;
        qualificationMethod = "regular";
      } else if (awayScore > homeScore) {
        qualifiedTeamId = match.awayTeamId;
        qualificationMethod = "regular";
      } else {
        qualifiedTeamId = draft.qualifiedTeamId || null;
        qualificationMethod = draft.qualificationMethod || null;
      }
    }

    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `اعتماد نتيجة ${formatMatch(match)} (${homeScore}-${awayScore}) واحتساب جميع التوقعات؟`,
      )
    ) return;

    setWorking(`calculate-${match.id}`);
    setMessage("");
    setError("");
    try {
      const result = await calculateTournamentMatchViaServerV2({
        tournamentId: GULF_CUP_27_TOURNAMENT_ID,
        matchId: match.id,
        homeScore,
        awayScore,
        qualifiedTeamId,
        qualificationMethod,
        extraTimeHomeScore: optionalScore(draft.extraHome),
        extraTimeAwayScore: optionalScore(draft.extraAway),
        penaltiesHomeScore: optionalScore(draft.penaltiesHome),
        penaltiesAwayScore: optionalScore(draft.penaltiesAway),
      });

      await addAdminLog({
        action: "calculate_match",
        title: `احتساب ${match.stage === "knockout" ? "مباراة إقصائية" : "مباراة"} في خليجي 27`,
        description: `${formatMatch(match)} — النتيجة ${homeScore}-${awayScore} — تم احتساب ${result.predictionsCalculated} توقع.`,
        metadata: { ...result, homeScore, awayScore, qualifiedTeamId, qualificationMethod },
      });

      setMessage(`تم احتساب ${formatMatch(match)} وإعادة بناء الترتيب ومزامنة المسار الإقصائي.`);
      await load();
    } catch (calculateError) {
      setError(calculateError instanceof Error ? calculateError.message : "تعذر احتساب المباراة");
    } finally {
      setWorking("");
    }
  }

  async function undo(match: TournamentMatchRuntimeV2) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`التراجع عن نتيجة واحتساب ${formatMatch(match)}؟ سيعاد بناء الترتيب تلقائيًا.`)
    ) return;

    setWorking(`undo-${match.id}`);
    setMessage("");
    setError("");
    try {
      const result = await undoTournamentMatchCalculationViaServerV2({
        tournamentId: GULF_CUP_27_TOURNAMENT_ID,
        matchId: match.id,
      });
      await addAdminLog({
        action: "undo_match_calculation",
        title: "تراجع عن احتساب خليجي 27",
        description: `${formatMatch(match)} — تم إلغاء احتساب ${result.predictionsReset} توقع وإعادة بناء الترتيب.`,
        metadata: result,
      });
      setResultDrafts((current) => ({ ...current, [match.id]: emptyDraft() }));
      setMessage(`تم التراجع عن احتساب ${formatMatch(match)}.`);
      await load();
    } catch (undoError) {
      setError(undoError instanceof Error ? undoError.message : "تعذر التراجع عن الاحتساب");
    } finally {
      setWorking("");
    }
  }

  const sectionTabs: Array<{ id: GulfAdminSection; label: string; icon: typeof ShieldCheck }> = [
    { id: "overview", label: "نظرة عامة", icon: LayoutDashboard },
    { id: "settings", label: "الإعدادات", icon: Settings2 },
    { id: "teams", label: "المنتخبات", icon: UsersRound },
    { id: "matches", label: "المباريات", icon: CalendarDays },
    { id: "results", label: "التوقعات والنتائج", icon: Calculator },
    { id: "notifications", label: "الإشعارات", icon: BellRing },
    { id: "engagement", label: "الاستوديو والجوائز", icon: Newspaper },
    { id: "sports", label: "Sports API", icon: Satellite },
    { id: "security", label: "أمان الأعضاء", icon: ShieldCheck },
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
      <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-2">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="بطولات المنصة">
          <button type="button" role="tab" aria-selected={tournamentTab === "gulf27"} onClick={() => setTournamentTab("gulf27")} className={`inline-flex min-h-[46px] items-center gap-2 rounded-xl px-4 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${tournamentTab === "gulf27" ? "bg-emerald-400 text-slate-950" : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"}`}><Trophy className="h-4 w-4" aria-hidden="true" />خليجي 27</button>
          <button type="button" role="tab" aria-selected={tournamentTab === "asian2027"} onClick={() => setTournamentTab("asian2027")} className={`inline-flex min-h-[46px] items-center gap-2 rounded-xl px-4 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${tournamentTab === "asian2027" ? "bg-violet-400 text-slate-950" : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"}`}><Trophy className="h-4 w-4" aria-hidden="true" />كأس آسيا 2027 <span className="rounded-full bg-black/15 px-2 py-0.5 text-[10px]">قريبًا</span></button>
        </div>
      </div>

      {tournamentTab === "asian2027" ? (
        <div className="mt-5 rounded-3xl border border-violet-300/20 bg-violet-300/[0.06] p-6">
          <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-300/10 text-violet-200"><Trophy className="h-6 w-6" aria-hidden="true" /></div><div><p className="text-xs font-black text-violet-200">بطولة مسجلة في المنصة</p><h2 className="mt-1 text-xl font-black text-white">كأس آسيا 2027</h2></div></div>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-300">سيستخدم كأس آسيا 2027 نفس أدوات الإدارة الموحدة عند تهيئة الفرق والمباريات، بما في ذلك التحكم الكامل في توقعات الأعضاء.</p>
          <AdminTournamentPredictionsManager tournamentId={ASIAN_CUP_2027_TOURNAMENT_ID} tournamentLabel="كأس آسيا 2027" />
        </div>
      ) : (
        <>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="أقسام خليجي 27">
            {sectionTabs.map((item) => { const Icon = item.icon; const active = sectionTab === item.id; return <button key={item.id} type="button" role="tab" aria-selected={active} onClick={() => setSectionTab(item.id)} className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${active ? "border-emerald-300/30 bg-emerald-300/15 text-emerald-100" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}><Icon className="h-4 w-4" aria-hidden="true" />{item.label}</button>; })}
          </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black md:text-2xl">
            <ShieldCheck className="h-6 w-6 text-emerald-300" aria-hidden="true" />
            إدارة البطولات — خليجي 27
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
            إدارة المجموعات والأدوار الإقصائية والنتائج والتأهل والاحتساب من مكان واحد.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void syncKnockout()} disabled={Boolean(working)} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 text-sm font-bold text-emerald-100 hover:bg-emerald-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50">
            {working === "sync-ko" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <GitBranch className="h-4 w-4" aria-hidden="true" />}
            مزامنة الإقصائيات
          </button>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            تحديث
          </button>
        </div>
      </div>

      {(sectionTab === "settings" || sectionTab === "teams" || sectionTab === "matches") && (
        <AdminTournamentV2Management section={sectionTab} showTabs={false} />
      )}

      {sectionTab === "notifications" && <AdminTournamentNotifications matches={matches} />}

      {sectionTab === "engagement" && <AdminTournamentEngagementV2 />}

      {sectionTab === "sports" && <AdminTournamentSportsApi />}

      {sectionTab === "overview" && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><p className="text-xs font-bold text-slate-400">المباريات</p><p className="mt-1 text-2xl font-black text-white">{matches.length}</p></div>
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-4"><p className="text-xs font-bold text-emerald-200/70">التوقع مفتوح</p><p className="mt-1 text-2xl font-black text-emerald-200">{matches.filter((item) => item.predictionIsOpen).length}</p></div>
            <div className="rounded-2xl border border-sky-300/15 bg-sky-300/[0.06] p-4"><p className="text-xs font-bold text-sky-200/70">المباريات المحتسبة</p><p className="mt-1 text-2xl font-black text-sky-100">{matches.filter((item) => item.calculationStatus === "calculated").length}</p></div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-4">
          <p className="text-xs font-bold text-emerald-200/70">دور المجموعات</p>
          <p className="mt-1 font-black text-white">بالملي {GULF_CUP_27_SCORING_V1.exact} · الفائز/التعادل {GULF_CUP_27_SCORING_V1.outcome}</p>
        </div>
        <div className="rounded-2xl border border-sky-300/15 bg-sky-300/[0.06] p-4">
          <p className="text-xs font-bold text-sky-200/70">خروج المغلوب</p>
          <p className="mt-1 font-black text-white">نتيجة 90 دقيقة: بالملي {GULF_CUP_27_KNOCKOUT_SCORING_V1.exact} · الاتجاه {GULF_CUP_27_KNOCKOUT_SCORING_V1.outcome} · المتأهل {GULF_CUP_27_KNOCKOUT_SCORING_V1.qualified} · الطريقة {GULF_CUP_27_KNOCKOUT_SCORING_V1.method} · الأعلى {GULF_CUP_27_KNOCKOUT_SCORING_V1.max}</p>
        </div>
          </div>
        </>
      )}

      {(message || error) && (
        <div role={error ? "alert" : "status"} aria-live="polite" className={`mt-4 rounded-2xl border p-3 text-sm font-bold ${error ? "border-red-300/20 bg-red-400/10 text-red-100" : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"}`}>
          {error || message}
        </div>
      )}

      {sectionTab === "results" && <AdminTournamentPredictionsManager tournamentId={GULF_CUP_27_TOURNAMENT_ID} tournamentLabel="خليجي 27" />}

      {sectionTab === "results" && (loading ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-8 text-center text-slate-300">
          <Loader2 className="mx-auto h-7 w-7 animate-spin" aria-hidden="true" />
          <p className="mt-3 font-bold">جاري تحميل بيانات البطولة...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-dashed border-emerald-300/20 bg-emerald-300/[0.05] p-6 text-center">
          <Database className="mx-auto h-10 w-10 text-emerald-300" aria-hidden="true" />
          <h3 className="mt-3 text-lg font-black">خليجي 27 لم تتم تهيئتها بعد</h3>
          <button type="button" onClick={() => void initialize()} disabled={working === "init"} className="mt-5 inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50">
            {working === "init" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Database className="h-4 w-4" aria-hidden="true" />}
            تهيئة خليجي 27
          </button>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><p className="text-xs font-bold text-slate-400">المباريات</p><p className="mt-1 text-2xl font-black text-white">{matches.length}</p></div>
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-4"><p className="text-xs font-bold text-emerald-200/70">التوقع مفتوح</p><p className="mt-1 text-2xl font-black text-emerald-200">{matches.filter((item) => item.predictionIsOpen).length}</p></div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/45 p-3">
              <button type="button" onClick={() => void toggleAll(true)} disabled={Boolean(working)} className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-3 text-xs font-black text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"><UnlockKeyhole className="h-4 w-4" aria-hidden="true" />فتح الكل</button>
              <button type="button" onClick={() => void toggleAll(false)} disabled={Boolean(working)} className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"><LockKeyhole className="h-4 w-4" aria-hidden="true" />إغلاق الكل</button>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {matches.map((match) => {
              const draft = resultDrafts[match.id] ?? emptyDraft();
              const calculated = match.calculationStatus === "calculated";
              const tied = draft.home !== "" && draft.away !== "" && Number(draft.home) === Number(draft.away);
              const teamsReady = Boolean(match.homeTeamId && match.awayTeamId);
              return (
                <article key={match.id} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                  <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-black text-slate-300">{match.round}{match.group ? ` · المجموعة ${match.group}` : " · خروج المغلوب"}</span>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${match.predictionIsOpen ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-white/5 text-slate-400"}`}>{match.predictionIsOpen ? "مفتوح" : "مغلق"}</span>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${calculated ? "border-sky-300/20 bg-sky-300/10 text-sky-100" : "border-white/10 bg-white/5 text-slate-400"}`}>{calculationLabel(match)}</span>
                      </div>
                      <h3 className="mt-2 font-black text-white">{formatMatch(match)}</h3>
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-400"><CalendarDays className="h-4 w-4" aria-hidden="true" />{formatKickoff(match.kickoffAt)} · {match.stadium}</p>
                      {match.resultHash && <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><Hash className="h-3.5 w-3.5" aria-hidden="true" /><span dir="ltr" className="[unicode-bidi:isolate]">{match.resultHash}</span> · {match.calculatedPredictions} توقع</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void toggle(match)} disabled={Boolean(working) || calculated || !teamsReady} className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50 ${match.predictionIsOpen ? "border border-red-300/20 bg-red-400/10 text-red-100" : "bg-emerald-400 text-slate-950"}`}>
                        {working === `toggle-${match.id}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : match.predictionIsOpen ? <LockKeyhole className="h-4 w-4" aria-hidden="true" /> : <UnlockKeyhole className="h-4 w-4" aria-hidden="true" />}
                        {!teamsReady ? "بانتظار المتأهلين" : match.predictionIsOpen ? "إغلاق التوقع" : "فتح التوقع"}
                      </button>
                      <button type="button" onClick={() => void toggleEditing(match)} disabled={Boolean(working) || calculated || !teamsReady} className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50 ${match.predictionEditingIsOpen ? "border-amber-300/20 bg-amber-300/10 text-amber-100" : "border-white/10 bg-white/5 text-slate-200"}`}>
                        {working === `toggle-editing-${match.id}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : match.predictionEditingIsOpen ? <LockKeyhole className="h-4 w-4" aria-hidden="true" /> : <UnlockKeyhole className="h-4 w-4" aria-hidden="true" />}
                        {match.predictionEditingIsOpen ? "إغلاق التعديل" : "فتح التعديل"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-white/10 pt-4">
                    <p className="mb-2 text-xs font-black text-slate-400">{match.stage === "knockout" ? "النتيجة بعد 90 دقيقة (نهاية الوقت الأصلي)" : "النتيجة النهائية"}</p>
                    <div className="flex items-center gap-2">
                      <input aria-label={`نتيجة ${teamName(match.homeTeamId, match.homeSourceLabel)}`} type="number" inputMode="numeric" min={0} max={30} value={draft.home} disabled={calculated || Boolean(working) || !teamsReady} onChange={(event) => setResultDrafts((current) => ({ ...current, [match.id]: { ...draft, home: event.target.value } }))} className="h-12 w-20 rounded-xl border border-white/10 bg-black/25 text-center text-lg font-black outline-none focus-visible:border-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-300/25 disabled:opacity-55" />
                      <span className="font-black text-slate-500">—</span>
                      <input aria-label={`نتيجة ${teamName(match.awayTeamId, match.awaySourceLabel)}`} type="number" inputMode="numeric" min={0} max={30} value={draft.away} disabled={calculated || Boolean(working) || !teamsReady} onChange={(event) => setResultDrafts((current) => ({ ...current, [match.id]: { ...draft, away: event.target.value } }))} className="h-12 w-20 rounded-xl border border-white/10 bg-black/25 text-center text-lg font-black outline-none focus-visible:border-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-300/25 disabled:opacity-55" />
                    </div>

                    {match.stage === "knockout" && tied && teamsReady && (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <label className="text-xs font-black text-slate-300">المتأهل
                          <select value={draft.qualifiedTeamId} disabled={calculated || Boolean(working)} onChange={(event) => setResultDrafts((current) => ({ ...current, [match.id]: { ...draft, qualifiedTeamId: event.target.value } }))} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm font-black text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                            <option value="">اختر المتأهل</option><option value={match.homeTeamId}>{teamName(match.homeTeamId)}</option><option value={match.awayTeamId}>{teamName(match.awayTeamId)}</option>
                          </select>
                        </label>
                        <label className="text-xs font-black text-slate-300">طريقة التأهل
                          <select value={draft.qualificationMethod} disabled={calculated || Boolean(working)} onChange={(event) => setResultDrafts((current) => ({ ...current, [match.id]: { ...draft, qualificationMethod: event.target.value as TournamentQualificationMethod } }))} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm font-black text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                            <option value="">اختر الطريقة</option><option value="extra_time">بعد الوقت الإضافي</option><option value="penalties">ركلات الترجيح</option>
                          </select>
                        </label>
                        {draft.qualificationMethod === "extra_time" && <div className="md:col-span-2"><p className="mb-2 text-xs font-black text-slate-400">النتيجة بعد 120 دقيقة</p><div className="flex items-center gap-2"><input type="number" min={0} max={30} value={draft.extraHome} onChange={(e) => setResultDrafts((c) => ({ ...c, [match.id]: { ...draft, extraHome: e.target.value } }))} className="h-12 w-20 rounded-xl border border-white/10 bg-black/25 text-center font-black"/><span>—</span><input type="number" min={0} max={30} value={draft.extraAway} onChange={(e) => setResultDrafts((c) => ({ ...c, [match.id]: { ...draft, extraAway: e.target.value } }))} className="h-12 w-20 rounded-xl border border-white/10 bg-black/25 text-center font-black"/></div></div>}
                        {draft.qualificationMethod === "penalties" && <div className="md:col-span-2"><p className="mb-2 text-xs font-black text-slate-400">نتيجة ركلات الترجيح</p><div className="flex items-center gap-2"><input type="number" min={0} max={30} value={draft.penaltiesHome} onChange={(e) => setResultDrafts((c) => ({ ...c, [match.id]: { ...draft, penaltiesHome: e.target.value } }))} className="h-12 w-20 rounded-xl border border-white/10 bg-black/25 text-center font-black"/><span>—</span><input type="number" min={0} max={30} value={draft.penaltiesAway} onChange={(e) => setResultDrafts((c) => ({ ...c, [match.id]: { ...draft, penaltiesAway: e.target.value } }))} className="h-12 w-20 rounded-xl border border-white/10 bg-black/25 text-center font-black"/></div></div>}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {!calculated ? <button type="button" onClick={() => void calculate(match)} disabled={Boolean(working) || !teamsReady} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 text-sm font-black text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50">{working === `calculate-${match.id}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Calculator className="h-4 w-4" aria-hidden="true" />}حفظ النتيجة واحتساب</button> : <button type="button" onClick={() => void undo(match)} disabled={Boolean(working)} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 text-sm font-black text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50">{working === `undo-${match.id}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />}تراجع عن الاحتساب</button>}
                      {calculated && <span className="inline-flex items-center gap-2 text-xs font-black text-sky-100"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />تم احتساب {match.calculatedPredictions} توقع</span>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ))}

      {sectionTab === "security" && <AdminMemberSecurityMigration />}
        </>
      )}
    </section>
  );
}
