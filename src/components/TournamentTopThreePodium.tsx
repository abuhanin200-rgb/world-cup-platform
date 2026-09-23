"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Crown,
  Loader2,
  Medal,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getTournamentSectionHref,
  type Tournament,
  type TournamentUserStatsV2,
} from "@/domain/tournaments";
import { getTournamentLeaderboardV2 } from "@/lib/tournamentV2Firestore";
import MemberProfileLink from "@/components/members/MemberProfileLink";

type Props = {
  tournament: Tournament;
};

type PodiumPlace = {
  rank: 1 | 2 | 3;
  row: TournamentUserStatsV2 | null;
};

const PLACE_STYLES: Record<1 | 2 | 3, { card: string; badge: string; name: string; label: string }> = {
  1: {
    card: "border-amber-300/30 bg-gradient-to-b from-amber-300/16 via-amber-300/[0.08] to-white/[0.045] shadow-amber-500/10",
    badge: "bg-gradient-to-br from-yellow-200 via-amber-300 to-amber-500 text-slate-950 ring-1 ring-yellow-100/50",
    name: "text-amber-100",
    label: "الأول",
  },
  2: {
    card: "border-slate-200/20 bg-gradient-to-b from-slate-200/12 via-slate-100/[0.055] to-white/[0.035] shadow-slate-300/5",
    badge: "bg-gradient-to-br from-white via-slate-200 to-slate-400 text-slate-950 ring-1 ring-white/40",
    name: "text-slate-100",
    label: "الثاني",
  },
  3: {
    card: "border-orange-300/20 bg-gradient-to-b from-orange-400/12 via-orange-300/[0.055] to-white/[0.035] shadow-orange-400/5",
    badge: "bg-gradient-to-br from-orange-200 via-orange-400 to-orange-600 text-slate-950 ring-1 ring-orange-100/35",
    name: "text-orange-100",
    label: "الثالث",
  },
};

function PodiumCard({ place, currentUserId }: { place: PodiumPlace; currentUserId?: string | null }) {
  const style = PLACE_STYLES[place.rank];
  const isLeader = place.rank === 1;
  const isCurrentUser = Boolean(place.row && currentUserId === place.row.userId);

  return (
    <article
      className={`relative h-[196px] min-w-0 overflow-hidden rounded-[20px] border px-2.5 py-3 text-center shadow-lg backdrop-blur-sm transition-transform md:h-[214px] md:rounded-[24px] md:px-3 md:py-4 ${style.card} ${
        isLeader ? "z-10 -translate-y-4 md:-translate-y-6" : "translate-y-0"
      } ${isCurrentUser ? "ring-2 ring-[var(--tournament-primary)]/35" : ""}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/[0.08] to-transparent" />
      {isLeader ? (
        <>
          <div className="pointer-events-none absolute -top-8 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-amber-300/15 blur-2xl" />
          <div className="pointer-events-none absolute inset-x-5 bottom-2 h-px bg-gradient-to-r from-transparent via-amber-300/30 to-transparent" />
        </>
      ) : null}
      <div className="relative flex h-full flex-col items-center">
        <div className="mx-auto flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/30 px-2.5 py-1 text-[9px] font-black text-white/65 md:text-[10px]">
          {isLeader ? <Crown className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" /> : <Medal className="h-3.5 w-3.5" aria-hidden="true" />}
          {style.label}
        </div>

        <div className={`mx-auto mt-2.5 grid h-11 w-11 shrink-0 place-items-center rounded-full text-base font-black shadow-md md:mt-3 md:h-[52px] md:w-[52px] md:text-lg ${style.badge}`}>
          {place.rank}
        </div>

        {place.row ? (
          <>
            <h3 className={`mt-2 flex h-[34px] w-full items-center justify-center overflow-hidden px-0.5 text-[11px] font-black leading-[17px] md:h-[38px] md:text-[13px] md:leading-[19px] ${style.name}`}>
              <span className="line-clamp-2 max-w-full break-words">
                <MemberProfileLink userId={place.row.userId}>{place.row.fullName}</MemberProfileLink>
              </span>
            </h3>
            {isCurrentUser ? <span className="mt-1 inline-flex rounded-full bg-[var(--tournament-primary)]/15 px-2 py-0.5 text-[8px] font-black text-[var(--tournament-primary)]">أنت</span> : null}
            <div className="mt-auto flex items-end justify-center gap-1 pt-1">
              <span dir="ltr" className="text-xl font-black tabular-nums text-white [unicode-bidi:isolate] md:text-2xl">{place.row.points}</span>
              <span className="pb-0.5 text-[8px] font-bold text-white/45 md:text-[9px]">نقطة</span>
            </div>
            <div className="mt-1 text-[8px] font-bold text-white/45 md:text-[9px]">
              {place.row.exact} بالملي · {place.row.played} توقع
            </div>
          </>
        ) : (
          <div className="mt-auto mb-auto rounded-xl border border-dashed border-white/10 bg-slate-950/20 px-2 py-4 text-[9px] font-bold text-white/40 md:text-[10px]">
            بانتظار المنافسة
          </div>
        )}
      </div>
    </article>
  );
}

function MotivationCard({ rows, tournament, currentUserId }: { rows: TournamentUserStatsV2[]; tournament: Tournament; currentUserId?: string | null }) {
  const current = currentUserId ? rows.find((row) => row.userId === currentUserId) || null : null;
  const leader = rows[0] || null;
  const third = rows[2] || null;

  let title = "ادخل المنافسة من أول توقع";
  let body = "كل نقطة قد تغيّر ترتيبك. توقع المباريات وراقب صعودك في لوحة الصدارة.";

  if (current) {
    const rank = current.rank || rows.findIndex((row) => row.userId === current.userId) + 1;
    if (rank === 1) {
      title = "أنت في الصدارة 👑";
      body = "حافظ على المركز الأول؛ كل جولة جديدة قد تغيّر ترتيب المنافسة.";
    } else if (rank <= 3) {
      const gap = Math.max(0, (leader?.points || current.points) - current.points);
      title = "أنت على منصة التتويج 🏆";
      body = gap > 0 ? `الفارق الحالي عن المتصدر ${gap} نقطة فقط.` : "أنت قريب جدًا من الصدارة؛ واصل التوقع.";
    } else if (third) {
      const gap = Math.max(0, third.points - current.points);
      title = `مركزك الحالي ${rank}`;
      body = gap > 0 ? `الفارق الحالي عن المركز الثالث ${gap} نقطة. المنافسة ما زالت مفتوحة.` : "أنت قريب من الثلاثة الأوائل؛ توقعات الجولة القادمة قد تغيّر مركزك.";
    } else {
      title = `مركزك الحالي ${rank}`;
      body = "استمر بالتوقع؛ الترتيب يتغير بعد كل مباراة محتسبة.";
    }
  } else if (tournament.status === "coming_soon") {
    title = "استعد للصدارة من البداية";
    body = "مع فتح توقعات البطولة ستبدأ المنافسة، وستظهر المراكز الثلاثة الأولى هنا مباشرة.";
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-[18px] border border-white/10 bg-white/[0.05] p-3 sm:flex-row sm:items-center sm:justify-between md:rounded-[22px] md:p-4">
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--tournament-primary)]/20 bg-[var(--tournament-primary)]/10 text-[var(--tournament-primary)]">
          <Target className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-black text-white md:text-base">{title}</h3>
          <p className="mt-1 text-[10px] font-semibold leading-5 text-white/50 md:text-[11px]">{body}</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {tournament.status !== "coming_soon" ? (
          <Link href={getTournamentSectionHref(tournament, "predictions")} className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-[var(--tournament-primary)] px-3 text-[10px] font-black text-slate-950 transition hover:brightness-105">
            توقّع الآن <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : null}
        <Link href={getTournamentSectionHref(tournament, "leaderboard")} className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-3 text-[10px] font-black text-white/75 transition hover:bg-white/10">
          الترتيب الكامل
        </Link>
      </div>
    </div>
  );
}

export default function TournamentTopThreePodium({ tournament }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<TournamentUserStatsV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    getTournamentLeaderboardV2(tournament.id)
      .then((nextRows) => {
        if (!active) return;
        setRows(nextRows);
      })
      .catch((loadError) => {
        console.error("Tournament overview podium error:", loadError);
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tournament.id]);

  const places = useMemo<PodiumPlace[]>(() => {
    const byRank = [...rows].sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
    return [
      { rank: 2 as const, row: byRank[1] || null },
      { rank: 1 as const, row: byRank[0] || null },
      { rank: 3 as const, row: byRank[2] || null },
    ];
  }, [rows]);

  return (
    <section className="relative mt-3 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.055] p-3 shadow-xl shadow-black/10 md:mt-4 md:rounded-[28px] md:p-5">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,.08),transparent_35%),linear-gradient(135deg,transparent,rgba(255,255,255,.025))]" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[9px] font-black text-[var(--tournament-accent)] md:text-[10px]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              سباق الصدارة
            </div>
            <h2 className="mt-1 text-[17px] font-black text-white md:text-xl">الثلاثة الأوائل الآن</h2>
            <p className="mt-1 text-[9px] font-semibold text-white/45 md:text-[10px]">يتحدث تلقائيًا بعد كل احتساب.</p>
          </div>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-300">
            <Trophy className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        {loading ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/25 py-7 text-center text-[11px] font-bold text-white/50">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" aria-hidden="true" />
            جاري تحميل المنافسة...
          </div>
        ) : error ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/25 py-6 text-center text-[11px] font-bold text-white/45">
            تعذر تحميل المراكز الآن. سيظهر الترتيب عند تحديث الصفحة.
          </div>
        ) : (
          <>
            <div className="relative mt-7 grid grid-cols-3 items-end gap-2 pt-4 md:mt-9 md:gap-3 md:pt-6">
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-[8%] bottom-0 h-16 rounded-[50%] bg-gradient-to-t from-black/20 to-transparent blur-xl" />
              {places.map((place) => <PodiumCard key={place.rank} place={place} currentUserId={user?.id} />)}
            </div>
            <MotivationCard rows={rows} tournament={tournament} currentUserId={user?.id} />
          </>
        )}
      </div>
    </section>
  );
}
