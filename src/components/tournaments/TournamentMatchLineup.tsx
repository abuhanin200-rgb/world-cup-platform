"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  RefreshCw,
  ShieldCheck,
  Shirt,
  UsersRound,
  X,
} from "lucide-react";
import TeamFlag from "@/components/TeamFlag";

type LineupPlayer = {
  id: number;
  name: string;
  number: number | null;
  position: string;
  grid: string | null;
  photo: string | null;
};

type LineupAbsence = {
  id: number;
  name: string;
  photo: string | null;
  type: string;
  reason: string;
};

type TeamLineup = {
  side: "home" | "away";
  providerTeamId: number;
  localTeamId: string;
  name: string;
  logo: string | null;
  formation: string | null;
  source: "official" | "expected" | "unavailable";
  sourceFixtureId: number | null;
  sourceFixtureAt: number | null;
  coach: {
    id: number | null;
    name: string;
    photo: string | null;
  } | null;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
  absences: LineupAbsence[];
};

type MatchLineupData = {
  tournamentId: string;
  matchId: string;
  providerFixtureId: number;
  kickoffAt: number;
  fetchedAt: number;
  expiresAt: number;
  schemaVersion: number;
  officialAvailable: boolean;
  home: TeamLineup;
  away: TeamLineup;
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

type Side = "home" | "away";

const modalBackdropMotion: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.16, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.14, ease: "easeIn" } },
};

const modalMotion: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.995 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: 12,
    scale: 0.995,
    transition: { duration: 0.14, ease: "easeIn" },
  },
};

function sourceLabel(source: TeamLineup["source"]) {
  if (source === "official") return "التشكيل الرسمي";
  if (source === "expected") return "التشكيل المتوقع";
  return "التشكيل غير متاح";
}

function sourceClass(source: TeamLineup["source"]) {
  if (source === "official") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }
  if (source === "expected") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }
  return "border-white/10 bg-white/5 text-white/45";
}

function positionLabel(position: string) {
  const value = position.trim().toUpperCase();
  if (value === "G" || value.includes("GOAL")) return "حارس مرمى";
  if (value === "D" || value.includes("DEF")) return "مدافع";
  if (value === "M" || value.includes("MID")) return "وسط";
  if (value === "F" || value.includes("ATT") || value.includes("FOR")) return "مهاجم";
  return position || "لاعب";
}

function playerInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "•";
}

function PlayerPhoto({ player, size = "md" }: { player: LineupPlayer; size?: "sm" | "md" }) {
  const [failed, setFailed] = useState(false);
  const boxClass = size === "md" ? "h-14 w-14" : "h-11 w-11";

  return (
    <div className={`relative ${boxClass} shrink-0 overflow-visible`}>
      <div className={`flex ${boxClass} items-center justify-center overflow-hidden rounded-full border-2 border-white/75 bg-slate-800 shadow-lg shadow-black/25`}>
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
          <span className="text-xs font-black text-white/80">{playerInitials(player.name)}</span>
        )}
      </div>
      {player.number != null ? (
        <span
          dir="ltr"
          className="absolute -left-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border border-black/10 bg-white px-1 text-[9px] font-black text-slate-950 shadow-md [unicode-bidi:isolate]"
        >
          {player.number}
        </span>
      ) : null}
    </div>
  );
}

function CoachPhoto({ name, photo }: { name: string; photo: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/5">
      {photo && !failed ? (
        <img
          src={photo}
          alt={name}
          className="h-full w-full object-cover object-top"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <UsersRound className="h-5 w-5 text-white/50" aria-hidden="true" />
      )}
    </div>
  );
}

function parseGridRow(grid: string | null) {
  if (!grid) return null;
  const [row] = grid.split(":");
  const parsed = Number(row);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseGridColumn(grid: string | null) {
  if (!grid) return null;
  const [, column] = grid.split(":");
  const parsed = Number(column);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function formationParts(value: string | null) {
  if (!value) return null;
  const parts = value
    .split("-")
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
  return parts.length >= 2 && parts.reduce((sum, item) => sum + item, 0) === 10
    ? parts
    : null;
}

function playerRole(player: LineupPlayer) {
  const value = player.position.trim().toUpperCase();
  if (value === "G" || value.includes("GOAL")) return "G";
  if (value === "D" || value.includes("DEF")) return "D";
  if (value === "M" || value.includes("MID")) return "M";
  return "F";
}

type PitchSlot = {
  player: LineupPlayer;
  x: number;
  y: number;
};

function distributeRow(players: LineupPlayer[], y: number): PitchSlot[] {
  const count = players.length;
  if (!count) return [];
  const minX = count === 1 ? 50 : 13;
  const maxX = count === 1 ? 50 : 87;
  return players.map((player, index) => ({
    player,
    x: count === 1 ? 50 : minX + ((maxX - minX) * index) / Math.max(1, count - 1),
    y,
  }));
}

function lineupSlots(players: LineupPlayer[], formation: string | null): PitchSlot[] {
  if (!players.length) return [];

  const validGrid = players.filter(
    (player) => parseGridRow(player.grid) != null && parseGridColumn(player.grid) != null,
  );
  const gridRows = new Map<number, LineupPlayer[]>();
  validGrid.forEach((player) => {
    const row = parseGridRow(player.grid)!;
    const list = gridRows.get(row) || [];
    list.push(player);
    gridRows.set(row, list);
  });

  // API-FOOTBALL: 1 = حارس، ثم الدفاع، ثم خطوط الوسط، ثم الهجوم.
  // نستخدم الـgrid فقط إذا كان كاملًا ومنطقيًا، وإلا نعيد توزيع اللاعبين حسب الخطة والمركز.
  if (validGrid.length >= 10 && gridRows.size >= 3) {
    const maxRow = Math.max(...gridRows.keys());
    const slots: PitchSlot[] = [];
    [...gridRows.entries()]
      .sort((a, b) => a[0] - b[0])
      .forEach(([row, rowPlayers]) => {
        const sorted = [...rowPlayers].sort(
          (a, b) => (parseGridColumn(a.grid) || 99) - (parseGridColumn(b.grid) || 99),
        );
        const y = maxRow <= 1 ? 50 : 88 - ((row - 1) / (maxRow - 1)) * 70;
        slots.push(...distributeRow(sorted, y));
      });
    return slots;
  }

  const parts = formationParts(formation) || [4, 3, 3];
  const goalkeeper = players.filter((player) => playerRole(player) === "G").slice(0, 1);
  const defenders = players.filter((player) => playerRole(player) === "D");
  const midfielders = players.filter((player) => playerRole(player) === "M");
  const forwards = players.filter((player) => playerRole(player) === "F");

  const used = new Set<number>();
  const take = (source: LineupPlayer[], count: number) => {
    const result = source.filter((player) => !used.has(player.id)).slice(0, count);
    result.forEach((player) => used.add(player.id));
    return result;
  };

  const rows: LineupPlayer[][] = [];
  rows.push(take(goalkeeper.length ? goalkeeper : players, 1));
  rows.push(take(defenders, parts[0] || 4));

  const midfieldLines = parts.slice(1, -1);
  midfieldLines.forEach((count) => rows.push(take(midfielders, count)));
  rows.push(take(forwards, parts[parts.length - 1] || 1));

  const leftovers = players.filter((player) => !used.has(player.id));
  leftovers.forEach((player) => {
    const role = playerRole(player);
    const target = role === "D" ? 1 : role === "M" ? Math.min(2, rows.length - 2) : rows.length - 1;
    rows[Math.max(0, target)].push(player);
  });

  const maxRow = rows.length;
  return rows.flatMap((rowPlayers, index) => {
    const y = maxRow <= 1 ? 50 : 88 - (index / (maxRow - 1)) * 70;
    return distributeRow(rowPlayers, y);
  });
}

function PitchPlayer({ player, x, y }: PitchSlot) {
  return (
    <div
      className="absolute z-20 flex w-[70px] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center sm:w-[82px]"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className="relative">
        <PlayerPhoto player={player} size="sm" />
      </div>
      <div className="mt-1 flex min-h-[24px] w-full items-start justify-center px-0.5 text-center text-[8px] font-black leading-[11px] text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.95)] sm:text-[9px] sm:leading-3">
        <span className="line-clamp-2">{player.name}</span>
      </div>
      <div className="mt-0.5 max-w-full truncate text-[7px] font-bold leading-3 text-white/75 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)] sm:text-[8px]">
        {positionLabel(player.position)}
      </div>
    </div>
  );
}

function FootballPitch({ players, formation }: { players: LineupPlayer[]; formation: string | null }) {
  const slots = useMemo(() => lineupSlots(players, formation), [players, formation]);

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-emerald-300/25 bg-[#06120b] p-2 shadow-[0_18px_55px_rgba(0,0,0,0.38)]">
      <div className="relative mx-auto aspect-[0.68/1] min-h-[520px] w-full max-w-[470px] overflow-hidden rounded-[24px] sm:min-h-[620px]">
        {/* أرضية 3D */}
        <div
          className="absolute inset-[2%_1.5%_1%] origin-bottom overflow-hidden rounded-[22px] border border-white/15 shadow-[inset_0_0_80px_rgba(0,0,0,0.30)]"
          style={{
            clipPath: "polygon(11% 0%, 89% 0%, 100% 100%, 0% 100%)",
            background:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 10%, rgba(0,0,0,0.04) 10% 20%), linear-gradient(180deg,#2f9a4f 0%,#257f40 50%,#1e7138 100%)",
          }}
        >
          <div className="absolute inset-[4%_5%] border-2 border-white/55" />
          <div className="absolute left-[5%] right-[5%] top-1/2 border-t-2 border-white/55" />
          <div className="absolute left-1/2 top-1/2 h-[15%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/55" />
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/65" />

          <div className="absolute left-1/2 top-[4%] h-[14%] w-[47%] -translate-x-1/2 border-x-2 border-b-2 border-white/55" />
          <div className="absolute left-1/2 top-[4%] h-[6%] w-[22%] -translate-x-1/2 border-x-2 border-b-2 border-white/55" />
          <div className="absolute bottom-[4%] left-1/2 h-[14%] w-[47%] -translate-x-1/2 border-x-2 border-t-2 border-white/55" />
          <div className="absolute bottom-[4%] left-1/2 h-[6%] w-[22%] -translate-x-1/2 border-x-2 border-t-2 border-white/55" />
        </div>

        {/* ظل جانبي يعطي عمقًا للملعب */}
        <div
          className="pointer-events-none absolute inset-x-[2%] bottom-[0.4%] h-[11%] bg-black/30 blur-xl"
          style={{ clipPath: "polygon(0 0,100% 0,92% 100%,8% 100%)" }}
        />

        {slots.length ? (
          slots.map((slot) => <PitchPlayer key={slot.player.id} {...slot} />)
        ) : (
          <div className="absolute inset-0 z-20 flex items-center justify-center text-sm font-black text-white/70">
            التشكيل غير متاح حاليًا
          </div>
        )}

        {formation ? (
          <span
            dir="ltr"
            className="absolute bottom-3 right-3 z-30 rounded-full border border-white/20 bg-black/55 px-3 py-1 text-[11px] font-black text-white shadow-lg [unicode-bidi:isolate]"
          >
            {formation}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Bench({ players }: { players: LineupPlayer[] }) {
  if (!players.length) return null;
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
      <h3 className="text-sm font-black text-white">مقاعد البدلاء</h3>
      <div className="mt-4 grid grid-cols-3 gap-x-2 gap-y-5 sm:grid-cols-4">
        {players.map((player) => (
          <div key={player.id} className="min-w-0 text-center">
            <div className="flex justify-center">
              <PlayerPhoto player={player} size="sm" />
            </div>
            <div className="mt-1 truncate text-[10px] font-black text-white">{player.name}</div>
            <div className="mt-0.5 truncate text-[9px] font-bold text-white/35">
              {positionLabel(player.position)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Absences({ players }: { players: LineupAbsence[] }) {
  if (!players.length) return null;
  return (
    <section className="rounded-[24px] border border-rose-300/15 bg-rose-300/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-white">الغيابات</h3>
        <span className="rounded-full border border-rose-300/15 bg-rose-300/10 px-2.5 py-1 text-[9px] font-black text-rose-100">
          {players.length}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {players.map((player) => (
          <div key={player.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/15 p-2.5">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/5">
              {player.photo ? (
                <img src={player.photo} alt={player.name} className="h-full w-full object-cover object-top" loading="lazy" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-white/40">{playerInitials(player.name)}</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-black text-white">{player.name}</div>
              <div className="mt-1 truncate text-[9px] font-bold text-rose-100/70">
                {player.reason || player.type || "غير متاح"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CoachCard({ team }: { team: TeamLineup }) {
  if (!team.coach?.name) return null;
  return (
    <section className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[0.035] p-3">
      <div className="min-w-0">
        <div className="text-[10px] font-bold text-white/40">المدرب</div>
        <div className="mt-1 truncate text-sm font-black text-white">{team.coach.name}</div>
      </div>
      <CoachPhoto name={team.coach.name} photo={team.coach.photo} />
    </section>
  );
}

export default function TournamentMatchLineup({
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
  const [data, setData] = useState<MatchLineupData | null>(null);
  const [activeSide, setActiveSide] = useState<Side>("home");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const load = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ tournamentId, matchId });
      const response = await fetch(`/api/tournaments/match-lineup?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        data?: MatchLineupData;
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error || "تعذر تحميل التشكيل");
      }
      setData(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل التشكيل");
    } finally {
      setLoading(false);
    }
  }, [loading, matchId, tournamentId]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setActiveSide("home");
    queueMicrotask(() => void load());
  }, [load]);

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

  const activeTeam = data ? data[activeSide] : null;
  const activeFlagCode = activeSide === "home" ? homeFlagCode : awayFlagCode;
  const homeDisplay = data?.home.name || homeName;
  const awayDisplay = data?.away.name || awayName;

  const modal = isMounted
    ? createPortal(
        <AnimatePresence>
          {open ? (
            <motion.div
              variants={modalBackdropMotion}
              initial="hidden"
              animate="show"
              exit="exit"
              className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm md:items-center md:p-4"
              onClick={() => setOpen(false)}
            >
              <motion.section
                variants={modalMotion}
                dir="rtl"
                role="dialog"
                aria-modal="true"
                aria-label={`تشكيل ${homeName} و${awayName}`}
                className="flex max-h-[calc(100svh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] border border-amber-300/15 bg-slate-950 shadow-xl shadow-slate-950/45 md:max-h-[90vh] md:rounded-[2rem]"
                onClick={(event) => event.stopPropagation()}
              >
                <header className="relative shrink-0 border-b border-white/10 bg-white/[0.055] px-4 py-3">
                  <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/20 md:hidden" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black text-amber-100">
                        <Shirt className="h-3.5 w-3.5" aria-hidden="true" />
                        LINEUP
                      </div>
                      <h2 className="text-lg font-black text-white">التشكيل</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
                      aria-label="إغلاق"
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                  {loading && !data ? (
                    <div className="py-16 text-center text-white/55">
                      <RefreshCw className="mx-auto h-7 w-7 animate-spin text-amber-200" aria-hidden="true" />
                      <p className="mt-3 text-xs font-black">جاري تجهيز التشكيل...</p>
                    </div>
                  ) : error && !data ? (
                    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] p-4 text-center text-xs font-black leading-6 text-amber-50">
                      {error}
                      <button
                        type="button"
                        onClick={() => void load()}
                        className="mx-auto mt-3 flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-[11px] text-white"
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        إعادة المحاولة
                      </button>
                    </div>
                  ) : data ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 rounded-[22px] border border-white/10 bg-white/[0.035] p-2">
                        <button
                          type="button"
                          onClick={() => setActiveSide("home")}
                          className={`flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-3 text-sm font-black transition ${
                            activeSide === "home"
                              ? "bg-amber-300 text-slate-950 shadow-lg shadow-amber-950/15"
                              : "text-white/55 hover:bg-white/5"
                          }`}
                        >
                          <TeamFlag code={homeFlagCode} name={homeDisplay} size="xs" />
                          <span className="truncate">{homeDisplay}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSide("away")}
                          className={`flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-3 text-sm font-black transition ${
                            activeSide === "away"
                              ? "bg-amber-300 text-slate-950 shadow-lg shadow-amber-950/15"
                              : "text-white/55 hover:bg-white/5"
                          }`}
                        >
                          <TeamFlag code={awayFlagCode} name={awayDisplay} size="xs" />
                          <span className="truncate">{awayDisplay}</span>
                        </button>
                      </div>

                      {activeTeam ? (
                        <>
                          <section className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[0.035] p-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <TeamFlag code={activeFlagCode} name={activeTeam.name} size="md" />
                              <div className="min-w-0">
                                <div className="truncate text-base font-black text-white">{activeTeam.name}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black ${sourceClass(activeTeam.source)}`}>
                                    {sourceLabel(activeTeam.source)}
                                  </span>
                                  {activeTeam.formation ? (
                                    <span dir="ltr" className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-black text-white/55 [unicode-bidi:isolate]">
                                      {activeTeam.formation}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                            {activeTeam.source === "official" ? (
                              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-200" aria-label="رسمي" />
                            ) : null}
                          </section>

                          {activeTeam.source === "expected" ? (
                            <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.055] px-3 py-2 text-center text-[10px] font-bold leading-5 text-amber-50/75">
                              التشكيل المتوقع حاليًا، ويتحدث تلقائيًا عند صدور التشكيل الرسمي.
                            </div>
                          ) : null}

                          {activeTeam.startXI.length ? (
                            <FootballPitch players={activeTeam.startXI} formation={activeTeam.formation} />
                          ) : (
                            <div className="rounded-[24px] border border-white/10 bg-white/[0.035] px-4 py-12 text-center text-sm font-black text-white/45">
                              لم تتوفر بيانات التشكيل لهذا المنتخب حاليًا.
                            </div>
                          )}

                          <CoachCard team={activeTeam} />
                          <Bench players={activeTeam.substitutes} />
                          <Absences players={activeTeam.absences || []} />
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <footer
                  className="shrink-0 border-t border-white/10 bg-slate-950/95 p-3"
                  style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-950/15 transition hover:bg-amber-200 active:scale-[0.99]"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    إغلاق التشكيل
                  </button>
                </footer>
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
        className={`inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-amber-300/50 bg-gradient-to-r from-amber-300/18 via-yellow-300/12 to-amber-300/18 font-black text-amber-50 shadow-lg shadow-amber-950/20 transition hover:border-amber-200/70 hover:bg-amber-300/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 ${
          compact ? "w-full px-3 text-[11px]" : "w-full px-4 text-xs"
        }`}
      >
        <Shirt className="h-4 w-4 text-amber-200" aria-hidden="true" />
        التشكيل المتوقع
      </button>
      {modal}
    </>
  );
}
