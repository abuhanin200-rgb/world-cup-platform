"use client";

import { useMemo, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  Clock3,
  Loader2,
  Megaphone,
  RefreshCw,
  Send,
  Sparkles,
  UserRoundX,
} from "lucide-react";
import {
  GULF_CUP_27_TOURNAMENT_ID,
  getGulfCup27Team,
} from "@/domain/tournaments";
import type { TournamentMatchRuntimeV2 } from "@/lib/tournamentV2Firestore";
import {
  sendTournamentAnnouncementV2,
  sendTournamentMatchReminderV2,
  type TournamentMatchNotificationMode,
} from "@/lib/tournamentNotificationsV2";
import { addAdminLog } from "@/lib/adminLogs";
import { auth } from "@/lib/firebase";

function getTeamName(teamId: string, fallback?: string | null) {
  return getGulfCup27Team(teamId)?.nameAr || fallback || "لم يتحدد";
}

function getMatchLabel(match: TournamentMatchRuntimeV2) {
  return `${getTeamName(match.homeTeamId, match.homeSourceLabel)} × ${getTeamName(
    match.awayTeamId,
    match.awaySourceLabel,
  )}`;
}

const reminderButtons: Array<{
  mode: TournamentMatchNotificationMode;
  label: string;
  description: string;
  icon: typeof BellRing;
}> = [
  {
    mode: "prediction_open",
    label: "إشعار فتح التوقع",
    description: "يرسل لجميع الأعضاء",
    icon: BellRing,
  },
  {
    mode: "one_hour",
    label: "باقي ساعة",
    description: "فقط لمن لم يتوقع",
    icon: Clock3,
  },
  {
    mode: "thirty_minutes",
    label: "باقي 30 دقيقة",
    description: "فقط لمن لم يتوقع",
    icon: Clock3,
  },
  {
    mode: "missing_prediction",
    label: "لم تتوقع بعد",
    description: "تذكير مباشر للناقصين",
    icon: UserRoundX,
  },
];

export default function AdminTournamentNotifications({
  matches,
}: {
  matches: TournamentMatchRuntimeV2[];
}) {
  const sortedMatches = useMemo(
    () => [...matches].sort((a, b) => a.kickoffAt - b.kickoffAt),
    [matches],
  );
  const [matchId, setMatchId] = useState(sortedMatches[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const selectedMatch =
    sortedMatches.find((match) => match.id === matchId) ?? sortedMatches[0] ?? null;

  async function sendAnnouncement() {
    if (!title.trim() || !message.trim()) {
      setError("اكتب عنوان الإشعار والنص");
      return;
    }

    setWorking("announcement");
    setStatus("");
    setError("");
    try {
      const result = await sendTournamentAnnouncementV2({
        tournamentId: GULF_CUP_27_TOURNAMENT_ID,
        title,
        message,
        route: "/tournaments/gulf-cup-27",
      });
      await addAdminLog({
        action: "other",
        title: "إشعار بطولة جماعي",
        description: `تم إرسال إشعار خليجي 27 إلى ${result.recipients} عضو.`,
        metadata: {
          tournamentId: GULF_CUP_27_TOURNAMENT_ID,
          recipients: result.recipients,
          broadcastId: result.broadcastId,
        },
      });
      setStatus(`تم إرسال الإشعار إلى ${result.recipients} عضو.`);
      setTitle("");
      setMessage("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "تعذر إرسال الإشعار");
    } finally {
      setWorking("");
    }
  }

  async function sendReminder(mode: TournamentMatchNotificationMode) {
    if (!selectedMatch) {
      setError("اختر مباراة أولًا");
      return;
    }

    const label = getMatchLabel(selectedMatch);
    setWorking(mode);
    setStatus("");
    setError("");
    try {
      const result = await sendTournamentMatchReminderV2({
        tournamentId: GULF_CUP_27_TOURNAMENT_ID,
        matchId: selectedMatch.id,
        matchLabel: label,
        mode,
        route: "/tournaments/gulf-cup-27/predictions",
      });
      await addAdminLog({
        action: "other",
        title: "تنبيه توقعات خليجي 27",
        description: `${label} — تم إرسال ${result.recipients} إشعار.`,
        metadata: {
          tournamentId: GULF_CUP_27_TOURNAMENT_ID,
          matchId: selectedMatch.id,
          mode,
          recipients: result.recipients,
          skippedBecausePredicted: result.skippedBecausePredicted,
        },
      });
      setStatus(
        `تم إرسال ${result.recipients} إشعار${
          result.skippedBecausePredicted > 0
            ? `، وتم استبعاد ${result.skippedBecausePredicted} أعضاء سبق أن توقعوا.`
            : "."
        }`,
      );
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "تعذر إرسال التنبيه");
    } finally {
      setWorking("");
    }
  }

  async function runAutomationNow() {
    setWorking("automation");
    setStatus("");
    setError("");
    try {
      const currentAdmin = auth.currentUser;
      if (!currentAdmin) throw new Error("أعد تسجيل دخول الأدمن");
      const token = await currentAdmin.getIdToken();
      const response = await fetch("/api/tournaments/notifications/auto?force=1", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        closedMatches?: number;
        remindersDispatched?: number;
        notificationsCreated?: number;
      };
      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "تعذر تشغيل الفحص التلقائي");
      }
      setStatus(
        `تم الفحص: ${data.remindersDispatched || 0} تنبيه آلي، ${data.notificationsCreated || 0} إشعار، وإغلاق ${data.closedMatches || 0} مباراة انتهى وقت توقعها.`,
      );
    } catch (automationError) {
      setError(
        automationError instanceof Error
          ? automationError.message
          : "تعذر تشغيل الفحص التلقائي",
      );
    } finally {
      setWorking("");
    }
  }

  return (
    <section className="mt-5 rounded-3xl border border-amber-300/15 bg-amber-300/[0.045] p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
            <BellRing className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="mt-3 text-lg font-black text-white">إشعارات البطولة</h3>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-slate-300">
            الأتمتة تتولى التنبيهات الأساسية تلقائيًا، وتبقى الأدوات أدناه للإعلان العام أو الإرسال اليدوي عند الحاجة. التذكيرات تستبعد من سجّل توقعه.
          </p>
        </div>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-black text-emerald-100">
          Tournament-aware
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-emerald-100"><Sparkles className="h-4 w-4" aria-hidden="true" />الأتمتة مفعّلة</div>
            <p className="mt-1 text-xs font-semibold leading-6 text-slate-300">فتح التوقع يرسل إشعارًا فوريًا تلقائيًا. وعند بقاء 60 دقيقة ثم 30 دقيقة ثم آخر 10 دقائق، يرسل النظام التذكير الأنسب فقط لمن لم يتوقع، ويغلق التوقع تلقائيًا عند الموعد.</p>
          </div>
          <button type="button" onClick={() => void runAutomationNow()} disabled={Boolean(working)} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 text-xs font-black text-emerald-100 hover:bg-emerald-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50">
            {working === "automation" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            فحص الآن
          </button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {["عند فتح التوقع", "قبل 60 دقيقة", "قبل 30 دقيقة", "آخر 10 دقائق"].map((label) => <div key={label} className="rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-center text-[11px] font-black text-slate-200">{label}</div>)}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <Megaphone className="h-4 w-4 text-amber-300" aria-hidden="true" />
            إعلان عام لخليجي 27
          </div>
          <label className="mt-4 block text-xs font-bold text-slate-300" htmlFor="tournament-notification-title">
            العنوان
          </label>
          <input
            id="tournament-notification-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={100}
            className="mt-2 min-h-[44px] w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            placeholder="مثال: توقعات الجولة الثانية مفتوحة"
          />
          <label className="mt-3 block text-xs font-bold text-slate-300" htmlFor="tournament-notification-body">
            النص
          </label>
          <textarea
            id="tournament-notification-body"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={300}
            rows={4}
            className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm font-bold leading-6 text-white outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            placeholder="اكتب رسالة مختصرة وواضحة للأعضاء..."
          />
          <button
            type="button"
            onClick={() => void sendAnnouncement()}
            disabled={Boolean(working)}
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-sm font-black text-slate-950 transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
          >
            {working === "announcement" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            إرسال لجميع الأعضاء
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
          <div className="text-sm font-black text-white">تنبيهات المباراة</div>
          <label className="mt-4 block text-xs font-bold text-slate-300" htmlFor="tournament-notification-match">
            المباراة
          </label>
          <select
            id="tournament-notification-match"
            value={selectedMatch?.id ?? ""}
            onChange={(event) => setMatchId(event.target.value)}
            className="mt-2 min-h-[44px] w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            {sortedMatches.map((match) => (
              <option key={match.id} value={match.id}>
                {getMatchLabel(match)} — {match.round}
              </option>
            ))}
          </select>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {reminderButtons.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => void sendReminder(item.mode)}
                  disabled={Boolean(working) || !selectedMatch}
                  className="min-h-[74px] rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-right transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-50"
                >
                  <div className="flex items-center gap-2 text-sm font-black text-white">
                    {working === item.mode ? (
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-300" aria-hidden="true" />
                    ) : (
                      <Icon className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                    )}
                    {item.label}
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-slate-400">{item.description}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {(status || error) && (
        <div
          role={error ? "alert" : "status"}
          aria-live="polite"
          className={`mt-4 flex items-start gap-2 rounded-2xl border p-3 text-sm font-bold ${
            error
              ? "border-red-300/20 bg-red-400/10 text-red-100"
              : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
          }`}
        >
          {!error && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
          <span>{error || status}</span>
        </div>
      )}
    </section>
  );
}
