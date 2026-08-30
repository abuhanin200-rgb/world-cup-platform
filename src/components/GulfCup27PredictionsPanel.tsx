"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  LockKeyhole,
  LogIn,
  Save,
  ShieldCheck,
  Target,
  Trophy,
} from "lucide-react";
import TeamFlag from "@/components/TeamFlag";
import { useAuth } from "@/context/AuthContext";
import {
  GULF_CUP_27_TOURNAMENT_ID,
  getGulfCup27Team,
  type TournamentPredictionV2,
  type TournamentQualificationMethod,
} from "@/domain/tournaments";
import {
  ensureTournamentUserStatsV2,
  getTournamentMatchesV2,
  getUserTournamentPredictionsV2,
  isTournamentPredictionOpen,
  saveTournamentPredictionV2,
  type TournamentMatchRuntimeV2,
} from "@/lib/tournamentV2Firestore";

const DATE_LOCALE = "ar-SA-u-ca-gregory-nu-latn";

type PredictionDraft = {
  home: string;
  away: string;
  qualifiedTeamId: string;
  qualificationMethod: TournamentQualificationMethod | "";
};

function emptyDraft(): PredictionDraft {
  return { home: "", away: "", qualifiedTeamId: "", qualificationMethod: "" };
}

function formatKickoff(timestamp: number) {
  const value = new Date(timestamp);
  return {
    date: new Intl.DateTimeFormat(DATE_LOCALE, {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "Asia/Riyadh",
    }).format(value),
    time: new Intl.DateTimeFormat(DATE_LOCALE, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Riyadh",
    }).format(value),
  };
}

function methodLabel(value?: TournamentQualificationMethod | null) {
  if (value === "regular") return "فوز مباشر";
  if (value === "extra_time") return "وقت إضافي";
  if (value === "penalties") return "ركلات الترجيح";
  return "—";
}

function MatchPredictionCard({
  match,
  draft,
  onChange,
  onSave,
  saving,
  saved,
  prediction,
}: {
  match: TournamentMatchRuntimeV2;
  draft: PredictionDraft;
  onChange: (draft: PredictionDraft) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  prediction?: TournamentPredictionV2;
}) {
  const home = getGulfCup27Team(match.homeTeamId);
  const away = getGulfCup27Team(match.awayTeamId);
  const { date, time } = formatKickoff(match.kickoffAt);
  const teamsReady = Boolean(match.homeTeamId && match.awayTeamId && home && away);
  const newPredictionOpen = teamsReady && isTournamentPredictionOpen(match);
  const editOpen = Boolean(prediction) && teamsReady && match.predictionEditingIsOpen !== false && ["scheduled", "prediction_open"].includes(match.status);
  const open = Boolean(prediction) ? editOpen : newPredictionOpen;
  const predictedTie =
    draft.home !== "" && draft.away !== "" && Number(draft.home) === Number(draft.away);

  return (
    <article className="rounded-[26px] border border-white/10 bg-black/20 p-4 shadow-xl shadow-black/10 md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 text-xs font-black text-white/60">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{match.round}</span>
          <span>{match.group ? `المجموعة ${match.group}` : "خروج المغلوب"}</span>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${open ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-white/5 text-white/45"}`}>
          {open ? <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> : <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />}
          {!teamsReady ? "بانتظار المتأهلين" : prediction ? (editOpen ? "التعديل مفتوح" : "التعديل مغلق") : newPredictionOpen ? "التوقع مفتوح" : "التوقع مغلق"}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        <div className="min-w-0 text-center">
          {home ? (
            <>
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5"><TeamFlag code={home.flagCode} name={home.nameAr} size="md" /></div>
              <div className="mt-2 truncate text-sm font-black">{home.nameAr}</div>
            </>
          ) : <div className="mt-3 text-xs font-black leading-6 text-white/40">{match.homeSourceLabel || "لم يتحدد"}</div>}
          <input aria-label={`توقع أهداف ${home?.nameAr || "الفريق الأول"}`} inputMode="numeric" type="number" min={0} max={30} disabled={!open} value={draft.home} onChange={(event) => onChange({ ...draft, home: event.target.value })} className="mx-auto mt-3 h-12 w-16 rounded-2xl border border-white/10 bg-black/30 text-center text-xl font-black outline-none transition focus-visible:border-[var(--tournament-primary)] focus-visible:ring-2 focus-visible:ring-[var(--tournament-primary)]/30 disabled:cursor-not-allowed disabled:opacity-45" />
        </div>

        <div dir="ltr" className="mt-10 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/45">VS</div>

        <div className="min-w-0 text-center">
          {away ? (
            <>
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5"><TeamFlag code={away.flagCode} name={away.nameAr} size="md" /></div>
              <div className="mt-2 truncate text-sm font-black">{away.nameAr}</div>
            </>
          ) : <div className="mt-3 text-xs font-black leading-6 text-white/40">{match.awaySourceLabel || "لم يتحدد"}</div>}
          <input aria-label={`توقع أهداف ${away?.nameAr || "الفريق الثاني"}`} inputMode="numeric" type="number" min={0} max={30} disabled={!open} value={draft.away} onChange={(event) => onChange({ ...draft, away: event.target.value })} className="mx-auto mt-3 h-12 w-16 rounded-2xl border border-white/10 bg-black/30 text-center text-xl font-black outline-none transition focus-visible:border-[var(--tournament-primary)] focus-visible:ring-2 focus-visible:ring-[var(--tournament-primary)]/30 disabled:cursor-not-allowed disabled:opacity-45" />
        </div>
      </div>

      {match.stage === "knockout" && open && predictedTie && home && away && (
        <div className="mt-4 grid gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-3 sm:grid-cols-2">
          <label className="text-xs font-black text-white/65">من سيتأهل؟
            <select value={draft.qualifiedTeamId} onChange={(event) => onChange({ ...draft, qualifiedTeamId: event.target.value })} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm font-black text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--tournament-primary)]">
              <option value="">اختر المتأهل</option><option value={home.id}>{home.nameAr}</option><option value={away.id}>{away.nameAr}</option>
            </select>
          </label>
          <label className="text-xs font-black text-white/65">طريقة التأهل
            <select value={draft.qualificationMethod} onChange={(event) => onChange({ ...draft, qualificationMethod: event.target.value as TournamentQualificationMethod })} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm font-black text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--tournament-primary)]">
              <option value="">اختر الطريقة</option><option value="extra_time">بعد الوقت الإضافي</option><option value="penalties">ركلات الترجيح</option>
            </select>
          </label>
        </div>
      )}

      {match.stage === "knockout" && open && !predictedTie && draft.home !== "" && draft.away !== "" && (
        <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-2 text-xs font-black text-emerald-100">
          عند توقع فوز مباشر، يعتمد النظام الفائز في النتيجة كمتأهل وطريقة التأهل «فوز مباشر» تلقائيًا.
        </div>
      )}

      {prediction?.isCalculated && prediction.points != null && (
        <div className="mt-4 grid gap-2 rounded-2xl border border-sky-300/15 bg-sky-300/[0.07] p-3 text-xs font-black sm:grid-cols-3">
          <div><span className="block text-white/45">نتيجة المباراة</span><span dir="ltr" className="mt-1 block text-base text-white [unicode-bidi:isolate]">{match.result.homeScore ?? "—"} - {match.result.awayScore ?? "—"}</span></div>
          <div><span className="block text-white/45">تقييم توقعك</span><span className="mt-1 block text-sky-100">{prediction.resultType === "exact" ? "بالملي" : prediction.resultType === "outcome" ? "توقع صحيح جزئيًا" : "غير صحيح"}</span></div>
          <div><span className="block text-white/45">نقاطك</span><span dir="ltr" className="mt-1 block text-lg text-[var(--tournament-primary)] [unicode-bidi:isolate]">+{prediction.points}</span></div>
          {match.stage === "knockout" && (
            <div className="sm:col-span-3 border-t border-white/10 pt-2 text-white/55">
              المتأهل: <strong className="text-white">{getGulfCup27Team(match.result.qualifiedTeamId || "")?.nameAr || "—"}</strong> · {methodLabel(match.result.qualificationMethod)}
              {prediction.pointsBreakdown && <span dir="ltr" className="mr-2 [unicode-bidi:isolate]">({prediction.pointsBreakdown.score}+{prediction.pointsBreakdown.qualified}+{prediction.pointsBreakdown.method})</span>}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs font-bold text-white/55">
        <div className="flex flex-wrap gap-x-4 gap-y-1"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-[var(--tournament-primary)]" aria-hidden="true" />{date}</span><span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-[var(--tournament-primary)]" aria-hidden="true" /><span dir="ltr" className="[unicode-bidi:isolate]">{time}</span></span></div>
        <button type="button" disabled={!open || saving} onClick={onSave} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-[var(--tournament-primary)] px-4 text-sm font-black text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-45 active:scale-[0.98]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : saved ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          {saving ? "جاري الحفظ" : saved ? "تم الحفظ" : "حفظ التوقع"}
        </button>
      </div>
    </article>
  );
}

export default function GulfCup27PredictionsPanel() {
  const { user, loading: authLoading, isLoggedIn, secureSession } = useAuth();
  const [matches, setMatches] = useState<TournamentMatchRuntimeV2[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PredictionDraft>>({});
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [predictionByMatch, setPredictionByMatch] = useState<Record<string, TournamentPredictionV2>>({});
  const [savingId, setSavingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const nextMatches = await getTournamentMatchesV2(GULF_CUP_27_TOURNAMENT_ID);
      if (!user || !secureSession) { setMatches([...nextMatches].sort((a,b) => b.kickoffAt - a.kickoffAt)); setDrafts({}); setSavedIds({}); setPredictionByMatch({}); return; }
      await ensureTournamentUserStatsV2({ tournamentId: GULF_CUP_27_TOURNAMENT_ID, userId: user.id, fullName: user.fullName });
      const predictions = await getUserTournamentPredictionsV2(GULF_CUP_27_TOURNAMENT_ID, user.id);
      const nextDrafts: Record<string, PredictionDraft> = {};
      const nextSaved: Record<string, boolean> = {};
      const nextPredictionMap: Record<string, TournamentPredictionV2> = {};
      predictions.forEach((prediction) => {
        nextDrafts[prediction.matchId] = { home: String(prediction.homeScore), away: String(prediction.awayScore), qualifiedTeamId: prediction.qualifiedTeamId || "", qualificationMethod: prediction.qualificationMethod || "" };
        nextSaved[prediction.matchId] = true; nextPredictionMap[prediction.matchId] = prediction;
      });
      setMatches([...nextMatches].sort((a,b) => {
        const pa = nextPredictionMap[a.id]; const pb = nextPredictionMap[b.id];
        if (pa && pb) return pb.updatedAt - pa.updatedAt;
        if (pa) return -1; if (pb) return 1;
        return b.kickoffAt - a.kickoffAt;
      }));
      setDrafts(nextDrafts); setSavedIds(nextSaved); setPredictionByMatch(nextPredictionMap);
    } catch (loadError) {
      console.error("Gulf 27 predictions load error:", loadError);
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل توقعات خليجي 27");
    } finally { setLoading(false); }
  }, [user, secureSession]);

  useEffect(() => { if (!authLoading) void loadData(); }, [authLoading, loadData]);
  const openCount = useMemo(() => matches.filter((match) => isTournamentPredictionOpen(match)).length, [matches]);

  async function save(match: TournamentMatchRuntimeV2) {
    if (!user) return;
    setMessage(""); setError(""); setSavingId(match.id);
    try {
      const draft = drafts[match.id] ?? emptyDraft();
      const homeScore = Number(draft.home); const awayScore = Number(draft.away);
      if (draft.home === "" || draft.away === "" || !Number.isInteger(homeScore) || !Number.isInteger(awayScore)) throw new Error("أدخل نتيجة صحيحة للفريقين");
      if (match.stage === "knockout" && homeScore === awayScore && (!draft.qualifiedTeamId || !draft.qualificationMethod)) throw new Error("اختر المتأهل وطريقة التأهل عند توقع التعادل");
      await saveTournamentPredictionV2({ tournamentId: GULF_CUP_27_TOURNAMENT_ID, matchId: match.id, userId: user.id, userName: user.fullName, homeScore, awayScore, qualifiedTeamId: draft.qualifiedTeamId || null, qualificationMethod: draft.qualificationMethod || null });
      setSavedIds((current) => ({ ...current, [match.id]: true })); setMessage("تم حفظ توقعك بنجاح"); await loadData();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "تعذر حفظ التوقع"); }
    finally { setSavingId(""); }
  }

  if (authLoading || loading) return <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 text-center text-white/65"><Loader2 className="mx-auto h-7 w-7 animate-spin text-[var(--tournament-primary)]" aria-hidden="true" /><p className="mt-3 text-sm font-bold">جاري تحميل توقعات خليجي 27...</p></div>;
  if (isLoggedIn && user && !secureSession) return <section className="rounded-[28px] border border-amber-300/20 bg-amber-300/[0.07] p-6 text-center md:p-8"><ShieldCheck className="mx-auto h-9 w-9 text-amber-200" aria-hidden="true" /><h2 className="mt-4 text-2xl font-black">فعّل الجلسة الآمنة مرة واحدة</h2><p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-7 text-white/65">سجّل الدخول مرة أخرى بنفس بياناتك الحالية لتفعيل Firebase Auth الآمن.</p><Link href="/login" className="mt-5 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-amber-300 px-5 text-sm font-black text-slate-950"><LogIn className="h-4 w-4" aria-hidden="true" />إعادة تسجيل الدخول</Link></section>;
  if (!isLoggedIn || !user) return <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-center md:p-8"><LogIn className="mx-auto h-9 w-9 text-[var(--tournament-primary)]" aria-hidden="true" /><h2 className="mt-4 text-2xl font-black">سجّل الدخول لتوقع مباريات خليجي 27</h2><p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-7 text-white/60">سجّل الدخول لتسجيل توقعاتك ومتابعة نقاطك في خليجي 27.</p><Link href="/login" className="mt-5 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-[var(--tournament-primary)] px-5 text-sm font-black text-white"><LogIn className="h-4 w-4" aria-hidden="true" />تسجيل الدخول</Link></section>;

  return <div className="space-y-5">
    <section className="rounded-[26px] border border-white/10 bg-white/5 p-4 md:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black text-[var(--tournament-primary)]">توقعات البطولة</p><h2 className="mt-1 text-xl font-black md:text-2xl">توقعاتي في خليجي 27</h2><p className="mt-1 text-[11px] font-bold text-white/40">مرتبة من الأحدث إلى الأقدم</p></div><div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.07] px-3 py-2 text-xs font-black text-emerald-100">المباريات المفتوحة الآن: <span dir="ltr" className="[unicode-bidi:isolate]">{openCount}</span></div></div><p className="mt-2 text-sm font-semibold leading-7 text-white/55">في خروج المغلوب: إذا توقعت التعادل اختر المتأهل وطريقة التأهل. عند توقع فوز مباشر يحدد النظام المتأهل تلقائيًا.</p></section>
    {(message || error) && <div role={error ? "alert" : "status"} aria-live="polite" className={`rounded-2xl border px-4 py-3 text-sm font-black ${error ? "border-red-300/20 bg-red-400/10 text-red-100" : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"}`}>{error || message}</div>}
    <div className="grid gap-4 lg:grid-cols-2">{matches.map((match) => <MatchPredictionCard key={match.id} match={match} draft={drafts[match.id] ?? emptyDraft()} onChange={(draft) => { setDrafts((current) => ({ ...current, [match.id]: draft })); setSavedIds((current) => ({ ...current, [match.id]: false })); }} onSave={() => void save(match)} saving={savingId === match.id} saved={Boolean(savedIds[match.id])} prediction={predictionByMatch[match.id]} />)}</div>
  </div>;
}
