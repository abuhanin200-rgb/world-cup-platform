"use client";

import { useMemo, useState } from "react";
import type { Match } from "@/lib/matches";
import {
  buildMissingPredictionMessage,
  buildWhatsappUrl,
  getMembersMissingPrediction,
  type MissingPredictionMember,
} from "@/lib/adminMissingPredictions";

type Props = {
  matches: Match[];
};

const PLATFORM_URL = "https://world-cup-platform.vercel.app";

function formatMatchLabel(match: Match) {
  return `${match.homeTeamEmoji} ${match.homeTeamName} × ${match.awayTeamName} ${match.awayTeamEmoji}`;
}

function getPredictionTypeLabel(predictionType?: Match["predictionType"]) {
  return predictionType === "golden" ? "توقع سوبر ذهبي" : "توقع عادي";
}

function getPredictionTypeMessageHint(predictionType?: Match["predictionType"]) {
  return predictionType === "golden"
    ? "توقع سوبر ذهبي — الرسالة: فرصة الريمونتادا"
    : "توقع عادي — الرسالة: زِد نقاطك";
}

function isFinalMatch(match: Match) {
  return (
    match.matchStage === "knockout" &&
    match.knockoutRound === "final"
  );
}

function isThirdPlaceMatch(match: Match) {
  return (
    match.matchStage === "knockout" &&
    match.knockoutRound === "thirdPlace"
  );
}

function buildReminderMessage(match: Match) {
  const matchLabel = formatMatchLabel(match);

  if (isFinalMatch(match)) {
    return [
      "🏆 النهائي الكبير وصل!",
      "",
      matchLabel,
      "",
      "🔥 لا تفوّت أهم توقع في البطولة.",
      "قد يكون هذا التوقع هو الفارق في تتويج بطل التحدي.",
      "",
      "⏳ اعتمد توقعك قبل إغلاق باب التوقعات.",
      "",
      `🌐 ${PLATFORM_URL}`,
    ].join("\n");
  }

  if (isThirdPlaceMatch(match)) {
    return [
      "🥉 مواجهة المركز الثالث!",
      "",
      matchLabel,
      "",
      "🔥 فرصة أخيرة لحصد نقاط مهمة قبل ختام البطولة.",
      "",
      "⏳ اعتمد توقعك قبل إغلاق باب التوقعات.",
      "",
      `🌐 ${PLATFORM_URL}`,
    ].join("\n");
  }

  return buildMissingPredictionMessage(match);
}

export default function AdminMissingPredictionsPanel({ matches }: Props) {
  const availableMatches = useMemo(() => {
    return [...matches]
      .filter((match) => !match.resultCalculated)
      .sort(
        (a, b) =>
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      );
  }, [matches]);

  const [selectedMatchId, setSelectedMatchId] = useState(
    availableMatches[0]?.id || ""
  );
  const [members, setMembers] = useState<MissingPredictionMember[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedMatch =
    availableMatches.find((match) => match.id === selectedMatchId) || null;

  const message = selectedMatch ? buildReminderMessage(selectedMatch) : "";

  async function handleLoadMissingMembers() {
    if (!selectedMatchId) {
      alert("اختر المباراة أولًا");
      return;
    }

    try {
      setLoading(true);
      const data = await getMembersMissingPrediction(selectedMatchId);
      setMembers(data);
    } catch (error) {
      console.error("Missing predictions error:", error);
      alert("تعذر تحميل الأعضاء الذين لم يتوقعوا");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl md:p-5">
      <div className="mb-4">
        <h2 className="text-xl font-black md:text-2xl">
          📩 الأعضاء الذين لم يتوقعوا
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          اختر مباراة، ثم اعرض الأعضاء الذين لم يسجلوا توقعهم مع رسالة واتساب جاهزة.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="mb-2 block text-sm font-bold">اختر المباراة</span>
          <select
            value={selectedMatchId}
            onChange={(event) => {
              setSelectedMatchId(event.target.value);
              setMembers([]);
            }}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-amber-400"
          >
            {availableMatches.map((match) => (
              <option key={match.id} value={match.id}>
                {formatMatchLabel(match)} —{" "}
                {getPredictionTypeLabel(match.predictionType)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={handleLoadMissingMembers}
          disabled={loading || !selectedMatchId}
          className="self-end rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "جاري التحميل..." : "عرض غير المتوقّعين"}
        </button>
      </div>

      {selectedMatch && (
        <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-7 text-amber-100">
          نوع المباراة:{" "}
          <strong>
            {isFinalMatch(selectedMatch)
              ? "النهائي الكبير — رسالة خاصة"
              : isThirdPlaceMatch(selectedMatch)
                ? "مباراة المركز الثالث — رسالة خاصة"
                : getPredictionTypeMessageHint(selectedMatch.predictionType)}
          </strong>
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <div className="mb-2 text-sm font-black">نص الرسالة الجاهزة</div>
          <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
            {message}
          </pre>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
        <div className="mb-3 text-sm font-black">
          العدد: <span className="text-amber-300">{members.length}</span>
        </div>

        {members.length === 0 ? (
          <div className="text-sm text-slate-300">
            لم يتم عرض القائمة بعد، أو كل الأعضاء سجّلوا توقعهم.
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="font-black">{member.name}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {member.phone || "لا يوجد رقم جوال"}
                  </div>
                </div>

                <a
                  href={
                    member.phone
                      ? buildWhatsappUrl(member.phone, message)
                      : undefined
                  }
                  target="_blank"
                  rel="noreferrer"
                  className={`rounded-xl px-4 py-2 text-center text-sm font-black ${
                    member.phone
                      ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                      : "cursor-not-allowed bg-slate-700 text-slate-400"
                  }`}
                >
                  واتساب
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
