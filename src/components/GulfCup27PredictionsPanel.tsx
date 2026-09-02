"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  Loader2,
  LockKeyhole,
  LogIn,
  RotateCcw,
  Save,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import TeamFlag from "@/components/TeamFlag";
import AuthGateCard from "@/components/auth/AuthGateCard";
import { useAuth } from "@/context/AuthContext";
import {
  GULF_CUP_27_TOURNAMENT_ID,
  TOURNAMENT_PREDICTION_MAX_SCORE,
  canEditTournamentPredictionV2,
  getGulfCup27Team,
  getTournamentPredictionDeadlineV2,
  getTournamentPredictionWindowStateV2,
  isValidTournamentPredictionScoreV2,
  type TournamentPredictionV2,
  type TournamentPredictionWindowStateV2,
  type TournamentQualificationMethod,
} from "@/domain/tournaments";
import {
  getTournamentMatchesV2,
  getUserTournamentPredictionsV2,
  saveTournamentPredictionV2,
  type TournamentMatchRuntimeV2,
} from "@/lib/tournamentV2Firestore";

const DATE_LOCALE = "ar-SA-u-ca-gregory-nu-latn";
const RETURN_TO = "/tournaments/gulf-cup-27/predictions";

type PredictionDraft = {
  home: string;
  away: string;
  qualifiedTeamId: string;
  qualificationMethod: TournamentQualificationMethod | "";
};

type MatchFilter =
  | "all"
  | "available"
  | "missing"
  | "saved"
  | "closed"
  | "results";

const FILTER_LABELS: Record<MatchFilter, string> = {
  all: "الكل",
  available: "متاح الآن",
  missing: "لم أتوقع",
  saved: "محفوظ",
  closed: "مغلق",
  results: "النتائج",
};

const STATE_LABELS: Record<TournamentPredictionWindowStateV2, string> = {
  teams_pending: "بانتظار تحديد المنتخبين",
  not_open: "لم يفتح بعد",
  open: "التوقع مفتوح",
  closed: "التوقع مغلق",
  live: "المباراة مباشرة",
  finished: "انتهت المباراة",
  postponed: "المباراة مؤجلة",
  cancelled: "المباراة ملغاة",
};

function emptyDraft(): PredictionDraft {
  return {
    home: "",
    away: "",
    qualifiedTeamId: "",
    qualificationMethod: "",
  };
}

function predictionToDraft(prediction: TournamentPredictionV2): PredictionDraft {
  return {
    home: String(prediction.homeScore),
    away: String(prediction.awayScore),
    qualifiedTeamId: prediction.qualifiedTeamId || "",
    qualificationMethod: prediction.qualificationMethod || "",
  };
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

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat(DATE_LOCALE, {
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Riyadh",
  }).format(new Date(timestamp));
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}ي ${hours}س ${minutes}د`;
  if (hours > 0) return `${hours}س ${minutes}د ${seconds}ث`;
  return `${minutes}د ${seconds}ث`;
}

function Countdown({ deadline, now }: { deadline: number; now: number }) {
  const remaining = Math.max(0, deadline - now);
  const urgent = remaining > 0 && remaining <= 15 * 60 * 1000;
  const minutes = Math.max(0, Math.ceil(remaining / 60_000));

  if (remaining <= 0) return null;

  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${
        urgent
          ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
          : "border-white/10 bg-white/5 text-white/55"
      }`}
    >
      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
      <span aria-hidden="true">يغلق بعد {formatDuration(remaining)}</span>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        متبقٍ نحو {minutes} دقيقة لإغلاق التوقع
      </span>
    </span>
  );
}

function methodLabel(value?: TournamentQualificationMethod | null) {
  if (value === "regular") return "فوز مباشر";
  if (value === "extra_time") return "وقت إضافي";
  if (value === "penalties") return "ركلات الترجيح";
  return "—";
}

function resultReason(prediction: TournamentPredictionV2) {
  const breakdown = prediction.pointsBreakdown;
  if (!breakdown) {
    if (prediction.resultType === "exact") return "نتيجة مطابقة";
    if (prediction.resultType === "outcome") return "اتجاه صحيح";
    return "توقع غير صحيح";
  }

  const reasons: string[] = [];
  if (breakdown.score === 3) reasons.push("نتيجة 90 دقيقة مطابقة");
  else if (breakdown.score === 1) reasons.push("اتجاه 90 دقيقة صحيح");
  if (breakdown.qualified === 2) reasons.push("المتأهل صحيح");
  if (breakdown.method === 1) reasons.push("طريقة التأهل صحيحة");
  return reasons.length > 0 ? reasons.join(" + ") : "توقع غير صحيح";
}

function statusTone(state: TournamentPredictionWindowStateV2) {
  if (state === "open") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }
  if (state === "live") {
    return "border-red-300/25 bg-red-300/10 text-red-100";
  }
  if (state === "postponed" || state === "cancelled") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }
  return "border-white/10 bg-white/5 text-white/50";
}

function MatchPredictionCard({
  match,
  draft,
  prediction,
  editing,
  saving,
  justSaved,
  now,
  inputRef,
  onChange,
  onEdit,
  onCancel,
  onSave,
}: {
  match: TournamentMatchRuntimeV2;
  draft: PredictionDraft;
  prediction?: TournamentPredictionV2;
  editing: boolean;
  saving: boolean;
  justSaved: boolean;
  now: number;
  inputRef: (element: HTMLInputElement | null) => void;
  onChange: (draft: PredictionDraft) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const home = getGulfCup27Team(match.homeTeamId);
  const away = getGulfCup27Team(match.awayTeamId);
  const { date, time } = formatKickoff(match.kickoffAt);
  const state = getTournamentPredictionWindowStateV2(match, now);
  const canEditSaved = Boolean(
    prediction &&
      !prediction.isCalculated &&
      canEditTournamentPredictionV2(match, now),
  );
  const formOpen = prediction
    ? editing && canEditSaved
    : state === "open";
  const deadline = getTournamentPredictionDeadlineV2(match);
  const predictedTie =
    draft.home !== "" &&
    draft.away !== "" &&
    Number(draft.home) === Number(draft.away);
  const homeInvalid =
    draft.home !== "" && !isValidTournamentPredictionScoreV2(Number(draft.home));
  const awayInvalid =
    draft.away !== "" && !isValidTournamentPredictionScoreV2(Number(draft.away));
  const knockoutSelectionMissing = Boolean(
    match.stage === "knockout" &&
      predictedTie &&
      (!draft.qualifiedTeamId || !draft.qualificationMethod),
  );
  const validDraft = Boolean(
    draft.home !== "" &&
      draft.away !== "" &&
      !homeInvalid &&
      !awayInvalid &&
      !knockoutSelectionMissing,
  );
  const showCountdown = deadline > now && (state === "open" || canEditSaved);

  return (
    <article className="min-w-0 rounded-[26px] border border-white/10 bg-black/20 p-4 shadow-xl shadow-black/10 md:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-black text-white/60">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
            {match.round}
          </span>
          <span>
            {match.group ? `المجموعة ${match.group}` : "خروج المغلوب"}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {showCountdown ? (
            <Countdown deadline={deadline} now={now} />
          ) : null}
          <span
            className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${statusTone(state)}`}
          >
            {state === "open" ? (
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {prediction && canEditSaved && !editing
              ? "توقعك محفوظ"
              : editing
                ? "وضع التعديل"
                : STATE_LABELS[state]}
          </span>
        </div>
      </div>

      {match.stage === "knockout" ? (
        <p className="mb-3 rounded-xl border border-sky-300/15 bg-sky-300/[0.06] px-3 py-2 text-center text-[11px] font-black text-sky-100">
          النتيجة المتوقعة هنا هي نتيجة نهاية الوقت الأصلي بعد 90 دقيقة.
        </p>
      ) : null}

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 sm:gap-3">
        <div className="min-w-0 text-center">
          {home ? (
            <>
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <TeamFlag code={home.flagCode} name={home.nameAr} size="md" />
              </div>
              <div className="mt-2 truncate text-sm font-black">{home.nameAr}</div>
            </>
          ) : (
            <div className="mt-3 text-xs font-black leading-6 text-white/40">
              {match.homeSourceLabel || "لم يتحدد"}
            </div>
          )}
          <input
            ref={inputRef}
            aria-label={`توقع أهداف ${home?.nameAr || "الفريق الأول"}`}
            inputMode="numeric"
            type="number"
            min={0}
            max={TOURNAMENT_PREDICTION_MAX_SCORE}
            step={1}
            aria-invalid={homeInvalid}
            aria-describedby={homeInvalid ? `${match.id}-home-error` : undefined}
            disabled={!formOpen}
            value={draft.home}
            onChange={(event) => onChange({ ...draft, home: event.target.value })}
            className="mx-auto mt-3 h-12 w-16 rounded-2xl border border-white/10 bg-black/30 text-center text-xl font-black outline-none transition focus-visible:border-[var(--tournament-primary)] focus-visible:ring-2 focus-visible:ring-[var(--tournament-primary)]/30 disabled:cursor-not-allowed disabled:opacity-55"
          />
          {homeInvalid ? (
            <p id={`${match.id}-home-error`} className="mt-1 text-[10px] font-bold text-red-200">
              من 0 إلى {TOURNAMENT_PREDICTION_MAX_SCORE}
            </p>
          ) : null}
        </div>

        <div
          dir="ltr"
          className="mt-10 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-black text-white/45 sm:px-3"
        >
          VS
        </div>

        <div className="min-w-0 text-center">
          {away ? (
            <>
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <TeamFlag code={away.flagCode} name={away.nameAr} size="md" />
              </div>
              <div className="mt-2 truncate text-sm font-black">{away.nameAr}</div>
            </>
          ) : (
            <div className="mt-3 text-xs font-black leading-6 text-white/40">
              {match.awaySourceLabel || "لم يتحدد"}
            </div>
          )}
          <input
            aria-label={`توقع أهداف ${away?.nameAr || "الفريق الثاني"}`}
            inputMode="numeric"
            type="number"
            min={0}
            max={TOURNAMENT_PREDICTION_MAX_SCORE}
            step={1}
            aria-invalid={awayInvalid}
            aria-describedby={awayInvalid ? `${match.id}-away-error` : undefined}
            disabled={!formOpen}
            value={draft.away}
            onChange={(event) => onChange({ ...draft, away: event.target.value })}
            className="mx-auto mt-3 h-12 w-16 rounded-2xl border border-white/10 bg-black/30 text-center text-xl font-black outline-none transition focus-visible:border-[var(--tournament-primary)] focus-visible:ring-2 focus-visible:ring-[var(--tournament-primary)]/30 disabled:cursor-not-allowed disabled:opacity-55"
          />
          {awayInvalid ? (
            <p id={`${match.id}-away-error`} className="mt-1 text-[10px] font-bold text-red-200">
              من 0 إلى {TOURNAMENT_PREDICTION_MAX_SCORE}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-bold leading-6 text-white/55">
        {state === "teams_pending" ? (
          <span>يفتح التوقع بعد تحديد طرفي المباراة واعتماد الإدارة.</span>
        ) : state === "not_open" ? (
          <span>
            {match.predictionOpensAt && match.predictionOpensAt > now
              ? `يفتح التوقع: ${formatDateTime(match.predictionOpensAt)}`
              : "لم تفتح الإدارة التوقع لهذه المباراة بعد."}
          </span>
        ) : state === "open" || canEditSaved ? (
          <span>
            يغلق التوقع: {formatDateTime(deadline)} بتوقيت الرياض، أو عند بدء المباراة أيهما أسبق.
          </span>
        ) : state === "live" ? (
          <span>
            المباراة مباشرة والتوقع مقفل.
            {match.result.homeScore != null && match.result.awayScore != null
              ? ` النتيجة الحالية: ${match.result.homeScore} - ${match.result.awayScore}.`
              : ""}
            {!prediction ? " لم تسجل توقعًا لهذه المباراة." : ""}
          </span>
        ) : state === "postponed" ? (
          <span>توقف التوقع حتى تعتمد الإدارة الموعد الجديد.</span>
        ) : state === "cancelled" ? (
          <span>ألغيت المباراة ولا تُحتسب عليها نقاط.</span>
        ) : !prediction ? (
          <span>
            {state === "finished"
              ? "لم تسجل توقعًا لهذه المباراة."
              : "أغلق التوقع مع بداية المباراة، ولم تسجل توقعًا."}
          </span>
        ) : (
          <span>أغلق التوقع مع بداية المباراة، وتوقعك محفوظ للقراءة فقط.</span>
        )}
      </div>

      {match.stage === "knockout" && formOpen && predictedTie && home && away ? (
        <div className="mt-4 grid gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-3 sm:grid-cols-2">
          <label className="text-xs font-black text-white/65">
            من سيتأهل؟
            <select
              value={draft.qualifiedTeamId}
              onChange={(event) =>
                onChange({ ...draft, qualifiedTeamId: event.target.value })
              }
              className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm font-black text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--tournament-primary)]"
            >
              <option value="">اختر المتأهل</option>
              <option value={home.id}>{home.nameAr}</option>
              <option value={away.id}>{away.nameAr}</option>
            </select>
          </label>
          <label className="text-xs font-black text-white/65">
            طريقة التأهل
            <select
              value={draft.qualificationMethod}
              onChange={(event) =>
                onChange({
                  ...draft,
                  qualificationMethod: event.target
                    .value as TournamentQualificationMethod,
                })
              }
              className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm font-black text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--tournament-primary)]"
            >
              <option value="">اختر الطريقة</option>
              <option value="extra_time">بعد الوقت الإضافي</option>
              <option value="penalties">ركلات الترجيح</option>
            </select>
          </label>
        </div>
      ) : null}

      {match.stage === "knockout" && formOpen && !predictedTie && draft.home !== "" && draft.away !== "" ? (
        <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-2 text-xs font-black leading-6 text-emerald-100">
          عند توقع فوز في الوقت الأصلي، يعتمد النظام الفائز كمتأهل وطريقة التأهل «فوز مباشر» تلقائيًا؛ لذلك لا يمكن اختيار وقت إضافي أو ترجيح مع هذه النتيجة.
        </div>
      ) : null}

      {prediction?.isCalculated && prediction.points != null ? (
        <div className="mt-4 grid gap-2 rounded-2xl border border-sky-300/15 bg-sky-300/[0.07] p-3 text-xs font-black sm:grid-cols-4">
          <div>
            <span className="block text-white/45">توقعك</span>
            <span
              dir="ltr"
              className="mt-1 block text-base text-white [unicode-bidi:isolate]"
            >
              {prediction.homeScore} - {prediction.awayScore}
            </span>
          </div>
          <div>
            <span className="block text-white/45">النتيجة الرسمية</span>
            <span
              dir="ltr"
              className="mt-1 block text-base text-white [unicode-bidi:isolate]"
            >
              {match.result.homeScore ?? "—"} - {match.result.awayScore ?? "—"}
            </span>
          </div>
          <div>
            <span className="block text-white/45">سبب النقاط</span>
            <span className="mt-1 block text-sky-100">
              {resultReason(prediction)}
            </span>
          </div>
          <div>
            <span className="block text-white/45">نقاط المباراة</span>
            <span
              dir="ltr"
              className="mt-1 block text-lg text-[var(--tournament-primary)] [unicode-bidi:isolate]"
            >
              +{prediction.points}
            </span>
          </div>
          {match.stage === "knockout" ? (
            <div className="border-t border-white/10 pt-2 text-white/55 sm:col-span-4">
              المتأهل: {" "}
              <strong className="text-white">
                {getGulfCup27Team(match.result.qualifiedTeamId || "")?.nameAr ||
                  "—"}
              </strong>{" "}
              · {methodLabel(match.result.qualificationMethod)}
              {prediction.pointsBreakdown ? (
                <span dir="ltr" className="mr-2 [unicode-bidi:isolate]">
                  ({prediction.pointsBreakdown.score}+
                  {prediction.pointsBreakdown.qualified}+
                  {prediction.pointsBreakdown.method})
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {prediction && !editing && !prediction.isCalculated ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold leading-6 text-white/55">
          توقعك المحفوظ: {" "}
          <strong dir="ltr" className="text-white [unicode-bidi:isolate]">
            {prediction.homeScore} - {prediction.awayScore}
          </strong>
          {prediction.qualifiedTeamId ? (
            <span>
              {" "}· المتأهل {getGulfCup27Team(prediction.qualifiedTeamId)?.nameAr || "—"}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs font-bold text-white/55">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays
              className="h-4 w-4 text-[var(--tournament-primary)]"
              aria-hidden="true"
            />
            {date}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3
              className="h-4 w-4 text-[var(--tournament-primary)]"
              aria-hidden="true"
            />
            <span dir="ltr" className="[unicode-bidi:isolate]">
              {time}
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {prediction && !editing && canEditSaved ? (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 text-sm font-black text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Edit3 className="h-4 w-4" aria-hidden="true" />
              تعديل التوقع
            </button>
          ) : null}
          {editing ? (
            <button
              type="button"
              disabled={saving}
              onClick={onCancel}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 text-sm font-black text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-45"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              إلغاء
            </button>
          ) : null}
          {formOpen ? (
            <button
              type="button"
              disabled={saving || !validDraft}
              onClick={onSave}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--tournament-primary)] px-4 text-sm font-black text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-45 active:scale-[0.98]"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : justSaved ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              {saving
                ? "جاري الحفظ"
                : justSaved
                  ? "تم الحفظ"
                  : prediction
                    ? "حفظ التعديل"
                    : "حفظ التوقع"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function GulfCup27PredictionsPanel() {
  const { user, loading: authLoading, isLoggedIn, secureSession } = useAuth();
  const [matches, setMatches] = useState<TournamentMatchRuntimeV2[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PredictionDraft>>({});
  const [predictionByMatch, setPredictionByMatch] = useState<
    Record<string, TournamentPredictionV2>
  >({});
  const [dirtyIds, setDirtyIds] = useState<Record<string, boolean>>({});
  const [editingIds, setEditingIds] = useState<Record<string, boolean>>({});
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState("");
  const [filter, setFilter] = useState<MatchFilter>("all");
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const savingLocks = useRef(new Set<string>());

  const refreshMatches = useCallback(async () => {
    const nextMatches = await getTournamentMatchesV2(
      GULF_CUP_27_TOURNAMENT_ID,
    );
    setMatches(nextMatches);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextMatches = await getTournamentMatchesV2(
        GULF_CUP_27_TOURNAMENT_ID,
      );
      setMatches(nextMatches);

      if (!user || !secureSession) {
        setDrafts({});
        setPredictionByMatch({});
        setDirtyIds({});
        setEditingIds({});
        return;
      }

      const predictions = await getUserTournamentPredictionsV2(
        GULF_CUP_27_TOURNAMENT_ID,
        user.id,
      );
      const nextDrafts: Record<string, PredictionDraft> = {};
      const nextPredictionMap: Record<string, TournamentPredictionV2> = {};
      for (const prediction of predictions) {
        nextDrafts[prediction.matchId] = predictionToDraft(prediction);
        nextPredictionMap[prediction.matchId] = prediction;
      }
      setDrafts(nextDrafts);
      setPredictionByMatch(nextPredictionMap);
      setDirtyIds({});
      setEditingIds({});
    } catch (loadError) {
      console.error("Gulf 27 predictions load error:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "تعذر تحميل توقعات خليجي 27",
      );
    } finally {
      setLoading(false);
    }
  }, [secureSession, user]);

  useEffect(() => {
    if (!authLoading) queueMicrotask(() => void loadData());
  }, [authLoading, loadData]);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    const refresh = window.setInterval(() => {
      void refreshMatches().catch((refreshError) => {
        console.error("Gulf 27 matches refresh error:", refreshError);
      });
    }, 15_000);
    return () => window.clearInterval(refresh);
  }, [refreshMatches]);

  const counts = useMemo(() => {
    const result = {
      all: matches.length,
      available: 0,
      missing: 0,
      saved: 0,
      closed: 0,
      results: 0,
    };
    for (const match of matches) {
      const prediction = predictionByMatch[match.id];
      const state = getTournamentPredictionWindowStateV2(match, now);
      if (state === "open") result.available += 1;
      if (!prediction && state === "open") result.missing += 1;
      if (prediction) result.saved += 1;
      if (state !== "open" && state !== "not_open") result.closed += 1;
      if (prediction?.isCalculated || state === "finished") result.results += 1;
    }
    return result;
  }, [matches, now, predictionByMatch]);

  const visibleMatches = useMemo(() => {
    function included(match: TournamentMatchRuntimeV2) {
      const prediction = predictionByMatch[match.id];
      const state = getTournamentPredictionWindowStateV2(match, now);
      if (filter === "available") return state === "open";
      if (filter === "missing") return state === "open" && !prediction;
      if (filter === "saved") return Boolean(prediction);
      if (filter === "closed") {
        return state !== "open" && state !== "not_open";
      }
      if (filter === "results") {
        return Boolean(prediction?.isCalculated || state === "finished");
      }
      return true;
    }

    function priority(match: TournamentMatchRuntimeV2) {
      const prediction = predictionByMatch[match.id];
      const state = getTournamentPredictionWindowStateV2(match, now);
      if (state === "open" && !prediction) return 0;
      if (state === "open" && prediction) return 1;
      if (state === "not_open") return 2;
      if (prediction?.isCalculated || state === "finished") return 4;
      return 3;
    }

    return matches
      .filter(included)
      .sort((a, b) => priority(a) - priority(b) || a.kickoffAt - b.kickoffAt);
  }, [filter, matches, now, predictionByMatch]);

  const hasUnsavedChanges = useMemo(
    () =>
      Object.entries(dirtyIds).some(([matchId, dirty]) => {
        const match = matches.find((item) => item.id === matchId);
        return (
          dirty &&
          Boolean(match) &&
          getTournamentPredictionWindowStateV2(match!, now) === "open"
        );
      }),
    [dirtyIds, matches, now],
  );

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

  function updateDraft(
    match: TournamentMatchRuntimeV2,
    nextDraft: PredictionDraft,
  ) {
    const original = predictionByMatch[match.id]
      ? predictionToDraft(predictionByMatch[match.id])
      : emptyDraft();
    const dirty = JSON.stringify(nextDraft) !== JSON.stringify(original);
    setDrafts((current) => ({ ...current, [match.id]: nextDraft }));
    setDirtyIds((current) => ({ ...current, [match.id]: dirty }));
    setSavedIds((current) => ({ ...current, [match.id]: false }));
  }

  function startEditing(matchId: string) {
    setMessage("");
    setError("");
    setEditingIds((current) => ({ ...current, [matchId]: true }));
    window.requestAnimationFrame(() => inputRefs.current[matchId]?.focus());
  }

  function cancelEditing(matchId: string) {
    const prediction = predictionByMatch[matchId];
    if (prediction) {
      setDrafts((current) => ({
        ...current,
        [matchId]: predictionToDraft(prediction),
      }));
    }
    setEditingIds((current) => ({ ...current, [matchId]: false }));
    setDirtyIds((current) => ({ ...current, [matchId]: false }));
    setError("");
  }

  async function save(match: TournamentMatchRuntimeV2) {
    if (!user || !secureSession) return;
    if (savingLocks.current.has(match.id)) return;
    savingLocks.current.add(match.id);
    setMessage("");
    setError("");
    setSavingId(match.id);
    setSavedIds((current) => ({ ...current, [match.id]: false }));

    try {
      const draft = drafts[match.id] ?? emptyDraft();
      const homeScore = Number(draft.home);
      const awayScore = Number(draft.away);
      if (
        draft.home === "" ||
        draft.away === "" ||
        !isValidTournamentPredictionScoreV2(homeScore) ||
        !isValidTournamentPredictionScoreV2(awayScore)
      ) {
        inputRefs.current[match.id]?.focus();
        throw new Error(
          `أدخل لكل منتخب رقمًا صحيحًا من 0 إلى ${TOURNAMENT_PREDICTION_MAX_SCORE}.`,
        );
      }
      if (
        match.stage === "knockout" &&
        homeScore === awayScore &&
        (!draft.qualifiedTeamId || !draft.qualificationMethod)
      ) {
        throw new Error(
          "اختر المتأهل وطريقة التأهل عند توقع التعادل في مباراة خروج المغلوب.",
        );
      }

      const savedPrediction = await saveTournamentPredictionV2({
        tournamentId: GULF_CUP_27_TOURNAMENT_ID,
        matchId: match.id,
        userId: user.id,
        userName: user.fullName,
        homeScore,
        awayScore,
        qualifiedTeamId: draft.qualifiedTeamId || null,
        qualificationMethod: draft.qualificationMethod || null,
      });
      setPredictionByMatch((current) => ({
        ...current,
        [match.id]: savedPrediction,
      }));
      setDrafts((current) => ({
        ...current,
        [match.id]: predictionToDraft(savedPrediction),
      }));
      setDirtyIds((current) => ({ ...current, [match.id]: false }));
      setEditingIds((current) => ({ ...current, [match.id]: false }));
      setSavedIds((current) => ({ ...current, [match.id]: true }));
      setMessage("تم حفظ توقعك بنجاح.");
    } catch (saveError) {
      // Keep the draft in place so a server-side deadline rejection never erases
      // work in this card or any other card.
      setError(
        saveError instanceof Error
          ? saveError.message
          : "تعذر حفظ التوقع. لم تُفقد تغييراتك.",
      );
      void refreshMatches().catch(() => undefined);
    } finally {
      savingLocks.current.delete(match.id);
      setSavingId("");
    }
  }

  if (authLoading || loading) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 text-center text-white/65">
        <Loader2
          className="mx-auto h-7 w-7 animate-spin text-[var(--tournament-primary)]"
          aria-hidden="true"
        />
        <p className="mt-3 text-sm font-bold">جاري تحميل توقعات خليجي 27...</p>
      </div>
    );
  }

  if (isLoggedIn && user && !secureSession) {
    return (
      <section className="rounded-[28px] border border-amber-300/20 bg-amber-300/[0.07] p-6 text-center md:p-8">
        <ShieldCheck
          className="mx-auto h-9 w-9 text-amber-200"
          aria-hidden="true"
        />
        <h2 className="mt-4 text-2xl font-black">فعّل الجلسة الآمنة مرة واحدة</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-7 text-white/65">
          سجّل الدخول مرة أخرى بنفس بياناتك الحالية لتأكيد هويتك قبل حفظ التوقعات.
        </p>
        <Link
          href={`/login?returnTo=${encodeURIComponent(RETURN_TO)}`}
          className="mt-5 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-amber-300 px-5 text-sm font-black text-slate-950"
        >
          <LogIn className="h-4 w-4" aria-hidden="true" />
          إعادة تسجيل الدخول
        </Link>
      </section>
    );
  }

  if (!isLoggedIn || !user) {
    return (
      <AuthGateCard
        compact
        returnTo={RETURN_TO}
        title="ادخل إلى توقعات خليجي 27"
        description="سجّل توقعاتك وتابع نقاطك وترتيبك في البطولة."
        benefit="بعد تسجيل الدخول أو إنشاء الحساب ستعود إلى صفحة توقعاتك نفسها مباشرة."
        primaryLabel="تسجيل الدخول"
      />
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      <section className="rounded-[26px] border border-white/10 bg-white/5 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-[var(--tournament-primary)]">
              توقعات البطولة
            </p>
            <h2 className="mt-1 text-xl font-black md:text-2xl">
              توقعاتي في خليجي 27
            </h2>
            <p className="mt-1 text-[11px] font-bold text-white/40">
              المباريات التي تحتاج توقعك تظهر أولًا
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.07] px-3 py-2 text-xs font-black text-emerald-100">
            متاح الآن: {" "}
            <span dir="ltr" className="[unicode-bidi:isolate]">
              {counts.available}
            </span>
          </div>
        </div>
        <p className="mt-3 text-sm font-semibold leading-7 text-white/55">
          يغلق الحفظ تلقائيًا عند الموعد المحدد أو صافرة البداية، أيهما أسبق. في خروج المغلوب تخص النتيجة نهاية الوقت الأصلي؛ وعند التعادل اختر المتأهل وطريقة التأهل.
        </p>

        <div
          className="mt-4 flex max-w-full gap-2 overflow-x-auto pb-1"
          aria-label="تصفية المباريات"
        >
          {(Object.keys(FILTER_LABELS) as MatchFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border px-3 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                filter === key
                  ? "border-[var(--tournament-primary)] bg-[var(--tournament-primary)] text-white"
                  : "border-white/10 bg-black/20 text-white/65 hover:bg-white/10"
              }`}
            >
              {FILTER_LABELS[key]}
              <span
                dir="ltr"
                className="rounded-full bg-black/20 px-1.5 py-0.5 [unicode-bidi:isolate]"
              >
                {counts[key]}
              </span>
            </button>
          ))}
        </div>
      </section>

      {message || error ? (
        <div
          role={error ? "alert" : "status"}
          aria-live="polite"
          className={`rounded-2xl border px-4 py-3 text-sm font-black ${
            error
              ? "border-red-300/20 bg-red-400/10 text-red-100"
              : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
          }`}
        >
          {error || message}
        </div>
      ) : null}

      {hasUnsavedChanges ? (
        <div
          role="status"
          className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] px-4 py-3 text-xs font-black text-amber-100"
        >
          لديك تعديل غير محفوظ في مباراة متاحة. احفظه قبل مغادرة الصفحة.
        </div>
      ) : null}

      {visibleMatches.length ? (
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          {visibleMatches.map((match) => (
            <MatchPredictionCard
              key={match.id}
              match={match}
              draft={drafts[match.id] ?? emptyDraft()}
              prediction={predictionByMatch[match.id]}
              editing={Boolean(editingIds[match.id])}
              saving={savingId === match.id}
              justSaved={Boolean(savedIds[match.id])}
              now={now}
              inputRef={(element) => {
                inputRefs.current[match.id] = element;
              }}
              onChange={(draft) => updateDraft(match, draft)}
              onEdit={() => startEditing(match.id)}
              onCancel={() => cancelEditing(match.id)}
              onSave={() => void save(match)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[26px] border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-sm font-bold text-white/55">
          لا توجد مباريات ضمن هذا التصنيف حاليًا.
        </div>
      )}
    </div>
  );
}
