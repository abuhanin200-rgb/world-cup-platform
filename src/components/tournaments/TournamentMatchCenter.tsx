"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  Activity,
  BarChart3,
  Clock3,
  Radio,
  RefreshCw,
  Star,
  X,
} from "lucide-react";
import TeamFlag from "@/components/TeamFlag";

type MatchCenterEvent = {
  minute: string;
  team: "home" | "away";
  type: string;
  detail: string;
  playerName: string;
  assistName: string | null;
};

type MatchCenterStat = {
  key: string;
  label: string;
  home: string;
  away: string;
};

type MatchCenterPlayer = {
  id: number;
  name: string;
  photo: string | null;
  position: string;
  number: number | null;
  rating: number | null;
  minutes: number | null;
  goals: number;
  assists: number;
  shots: number;
  passes: number;
  tackles: number;
  saves: number;
};

type MatchCenterData = {
  tournamentId: string;
  matchId: string;
  providerFixtureId: number;
  fetchedAt: number;
  kickoffAt: number;
  statusShort: string;
  statusLong: string;
  elapsed: number | null;
  isLive: boolean;
  isFinished: boolean;
  score: { home: number | null; away: number | null };
  home: { localTeamId: string; providerTeamId: number; name: string };
  away: { localTeamId: string; providerTeamId: number; name: string };
  events: MatchCenterEvent[];
  stats: MatchCenterStat[];
  players: { home: MatchCenterPlayer[]; away: MatchCenterPlayer[] };
};

type Props = {
  tournamentId: string;
  matchId: string;
  homeName: string;
  awayName: string;
  homeFlagCode: string;
  awayFlagCode: string;
  compact?: boolean;
};

const backdropMotion: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.16 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

const sheetMotion: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.995 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, y: 14, scale: 0.995, transition: { duration: 0.13 } },
};

function relativeUpdated(timestamp: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "الآن";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  return `منذ ${Math.floor(minutes / 60)} ساعة`;
}

function statusLabel(data: MatchCenterData) {
  if (data.isLive) {
    if (data.statusShort === "HT") return "بين الشوطين";
    if (data.elapsed != null) return `مباشر • ${data.elapsed}′`;
    return "مباشر";
  }
  if (data.isFinished) return "انتهت";
  if (data.statusShort === "PST") return "مؤجلة";
  if (data.statusShort === "CANC") return "ملغاة";
  return "المباراة";
}

function eventTone(type: string) {
  if (type.includes("هدف")) return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  if (type.includes("حمراء")) return "border-red-300/25 bg-red-300/10 text-red-100";
  if (type.includes("صفراء")) return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  return "border-white/10 bg-white/5 text-white/70";
}

function numericPercent(value: string) {
  const parsed = Number(value.replace("%", ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : null;
}

function PlayerPhoto({ player }: { player: MatchCenterPlayer }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative h-11 w-11 shrink-0">
      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5">
        {player.photo && !failed ? (
          <img
            src={player.photo}
            alt={player.name}
            className="h-full w-full object-cover object-top"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="text-[10px] font-black text-white/45">{player.name.slice(0, 1)}</span>
        )}
      </div>
      {player.number != null ? (
        <span dir="ltr" className="absolute -left-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[9px] font-black text-slate-950">
          {player.number}
        </span>
      ) : null}
    </div>
  );
}

function PlayerRow({ player }: { player: MatchCenterPlayer }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/15 px-3 py-2.5">
      <PlayerPhoto player={player} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-black text-white">{player.name}</div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] font-bold text-white/40">
          <span>{player.position}</span>
          {player.minutes != null ? <><span>•</span><span>{player.minutes} د</span></> : null}
          {player.goals > 0 ? <><span>•</span><span className="text-emerald-200">{player.goals} هدف</span></> : null}
          {player.assists > 0 ? <><span>•</span><span className="text-cyan-200">{player.assists} صناعة</span></> : null}
        </div>
      </div>
      {player.rating != null ? (
        <div className="shrink-0 text-center">
          <div className="flex items-center gap-1 text-[10px] font-black text-amber-100">
            <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span dir="ltr">{player.rating.toFixed(1)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function TournamentMatchCenter({
  tournamentId,
  matchId,
  homeName,
  awayName,
  homeFlagCode,
  awayFlagCode,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<MatchCenterData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const load = useCallback(async (forceVisual = false) => {
    if (loading) return;
    if (forceVisual) setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ tournamentId, matchId });
      const response = await fetch(`/api/tournaments/match-center?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        data?: MatchCenterData;
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error || "تعذر تحميل مركز المباراة");
      }
      setData(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل مركز المباراة");
    } finally {
      if (forceVisual) setLoading(false);
    }
  }, [loading, matchId, tournamentId]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    if (!data) void load(true);
  }, [data, load]);

  useEffect(() => {
    if (!open || !data?.isLive) return;
    const timer = window.setInterval(() => void load(false), 60_000);
    return () => window.clearInterval(timer);
  }, [data?.isLive, load, open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const topHome = useMemo(() => (data?.players.home || []).slice(0, 5), [data]);
  const topAway = useMemo(() => (data?.players.away || []).slice(0, 5), [data]);

  const modal = mounted
    ? createPortal(
        <AnimatePresence>
          {open ? (
            <motion.div
              variants={backdropMotion}
              initial="hidden"
              animate="show"
              exit="exit"
              className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm md:items-center md:p-4"
              onClick={() => setOpen(false)}
            >
              <motion.section
                variants={sheetMotion}
                dir="rtl"
                role="dialog"
                aria-modal="true"
                aria-label={`مركز مباراة ${homeName} و${awayName}`}
                className="flex max-h-[calc(100svh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] border border-cyan-300/15 bg-slate-950 shadow-xl shadow-black/50 md:max-h-[92vh] md:rounded-[2rem]"
                onClick={(event) => event.stopPropagation()}
              >
                <header className="shrink-0 border-b border-white/10 bg-[#081321]/98 px-4 py-3">
                  <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/15 md:hidden" />
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black text-cyan-100">
                        <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                        مركز المباراة
                      </div>
                      <h2 className="mt-1 text-lg font-black text-white">تفاصيل المباراة</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/20"
                      aria-label="إغلاق"
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-5 pt-3 sm:px-4">
                  {loading && !data ? (
                    <div className="py-16 text-center text-white/55">
                      <RefreshCw className="mx-auto h-7 w-7 animate-spin text-cyan-200" aria-hidden="true" />
                      <p className="mt-3 text-xs font-black">جاري تحميل المباراة...</p>
                    </div>
                  ) : error && !data ? (
                    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] p-4 text-center text-xs font-black text-amber-50">
                      {error}
                      <button type="button" onClick={() => void load(true)} className="mt-3 min-h-10 rounded-xl border border-white/10 bg-white/10 px-4 text-white">
                        إعادة المحاولة
                      </button>
                    </div>
                  ) : data ? (
                    <div className="space-y-4">
                      <section className="rounded-[26px] border border-white/10 bg-gradient-to-b from-cyan-300/[0.07] to-white/[0.025] p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${data.isLive ? "border-red-300/25 bg-red-300/10 text-red-100" : "border-white/10 bg-white/5 text-white/60"}`}>
                            {statusLabel(data)}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-white/35">
                            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                            {relativeUpdated(data.fetchedAt)}
                          </span>
                        </div>

                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                          <div className="min-w-0">
                            <TeamFlag code={homeFlagCode} name={homeName} size="lg" />
                            <div className="mt-2 truncate text-sm font-black text-white">{data.home.name || homeName}</div>
                          </div>
                          <div dir="ltr" className="rounded-2xl border border-white/10 bg-black/25 px-4 py-2 text-3xl font-black tabular-nums text-white [unicode-bidi:isolate]">
                            {data.score.home ?? 0} - {data.score.away ?? 0}
                          </div>
                          <div className="min-w-0">
                            <TeamFlag code={awayFlagCode} name={awayName} size="lg" />
                            <div className="mt-2 truncate text-sm font-black text-white">{data.away.name || awayName}</div>
                          </div>
                        </div>
                      </section>

                      {data.events.length ? (
                        <section className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.035]">
                          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                            <Activity className="h-4 w-4 text-cyan-200" aria-hidden="true" />
                            <h3 className="text-sm font-black text-white">أحداث المباراة</h3>
                          </div>
                          <div className="divide-y divide-white/[0.06]">
                            {data.events.slice(0, 18).map((event, index) => (
                              <div key={`${event.minute}-${event.playerName}-${index}`} className="grid grid-cols-[46px_1fr] items-center gap-3 px-4 py-3">
                                <span dir="ltr" className="text-center text-xs font-black tabular-nums text-white/55">{event.minute}</span>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${eventTone(event.type)}`}>{event.type}</span>
                                    <span className="truncate text-xs font-black text-white">{event.playerName}</span>
                                  </div>
                                  {event.assistName ? <div className="mt-1 text-[9px] font-bold text-white/35">صناعة: {event.assistName}</div> : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      ) : null}

                      {data.stats.length ? (
                        <section className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.035]">
                          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                            <BarChart3 className="h-4 w-4 text-cyan-200" aria-hidden="true" />
                            <h3 className="text-sm font-black text-white">إحصائيات المباراة</h3>
                          </div>
                          <div className="space-y-3 p-4">
                            {data.stats.map((stat) => {
                              const homePercent = numericPercent(stat.home);
                              const awayPercent = numericPercent(stat.away);
                              const percentSum = (homePercent ?? 0) + (awayPercent ?? 0);
                              const showBar = homePercent != null && awayPercent != null && percentSum > 0;
                              const homeBar = showBar ? Math.round((homePercent! / percentSum) * 100) : 0;
                              const awayBar = showBar ? Math.max(0, 100 - homeBar) : 0;
                              return (
                                <div key={stat.key} className="rounded-2xl border border-white/[0.06] bg-black/15 p-3">
                                  <div className="grid grid-cols-[54px_1fr_54px] items-center gap-2 text-center">
                                    <span dir="ltr" className="text-xs font-black text-emerald-100">{stat.home}</span>
                                    <span className="text-[10px] font-bold text-white/50">{stat.label}</span>
                                    <span dir="ltr" className="text-xs font-black text-sky-100">{stat.away}</span>
                                  </div>
                                  {showBar ? (
                                    <div dir="ltr" className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/5">
                                      <span className="bg-emerald-400/85" style={{ width: `${homeBar}%` }} />
                                      <span className="bg-sky-400/85" style={{ width: `${awayBar}%` }} />
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      ) : null}

                      {(topHome.length || topAway.length) ? (
                        <section className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <Star className="h-4 w-4 text-amber-200" aria-hidden="true" />
                            <h3 className="text-sm font-black text-white">أبرز اللاعبين</h3>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <div className="mb-2 text-xs font-black text-emerald-100">{data.home.name}</div>
                              <div className="space-y-2">{topHome.map((player) => <PlayerRow key={player.id} player={player} />)}</div>
                            </div>
                            <div>
                              <div className="mb-2 text-xs font-black text-sky-100">{data.away.name}</div>
                              <div className="space-y-2">{topAway.map((player) => <PlayerRow key={player.id} player={player} />)}</div>
                            </div>
                          </div>
                        </section>
                      ) : null}

                      {!data.events.length && !data.stats.length && !topHome.length && !topAway.length ? (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 text-center text-xs font-bold text-white/45">
                          تفاصيل المباراة ستظهر هنا عند توفرها.
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </motion.section>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.08] font-black text-cyan-50 transition hover:bg-cyan-300/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 ${compact ? "w-full px-3 text-[11px]" : "w-full px-4 text-xs"}`}
      >
        <Radio className="h-4 w-4" aria-hidden="true" />
        مركز المباراة
      </button>
      {modal}
    </>
  );
}
