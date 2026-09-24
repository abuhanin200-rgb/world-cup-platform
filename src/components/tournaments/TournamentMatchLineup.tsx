"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  CircleAlert,
  RefreshCw,
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
  position: string;
  photo: string | null;
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

type PitchSlot = {
  player: LineupPlayer;
  x: number;
  y: number;
  rowSize: number;
};

const modalBackdropMotion: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.16, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: "easeIn" } },
};

const modalMotion: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.995 },
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
    transition: { duration: 0.13, ease: "easeIn" },
  },
};

function sourceLabel(source: TeamLineup["source"]) {
  if (source === "official") return "التشكيل الرسمي";
  if (source === "expected") return "التشكيل المتوقع";
  return "غير متاح";
}

function sourceClass(source: TeamLineup["source"]) {
  if (source === "official") {
    return "border-emerald-300/25 bg-emerald-300/12 text-emerald-100";
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
  return "لاعب";
}

function pitchPositionLabel(player: LineupPlayer, formation: string | null) {
  const grid = parseGrid(player.grid);
  const parts = formationParts(formation);
  if (!grid || !parts) return positionLabel(player.position);

  if (grid.row === 1) return "حارس مرمى";

  const lineIndex = grid.row - 2;
  const rowCount = parts[lineIndex];
  if (!rowCount) return positionLabel(player.position);

  if (lineIndex === 0) {
    if (rowCount >= 5 && (grid.column === 1 || grid.column === rowCount)) return "ظهير جناح";
    if (rowCount >= 4 && (grid.column === 1 || grid.column === rowCount)) return "ظهير";
    return "قلب دفاع";
  }

  if (lineIndex === parts.length - 1) {
    if (rowCount === 1) return "مهاجم صريح";
    if (rowCount >= 3 && (grid.column === 1 || grid.column === rowCount)) return "جناح";
    return "مهاجم";
  }

  if (rowCount === 2) return "محور";
  if (rowCount >= 4 && (grid.column === 1 || grid.column === rowCount)) return "وسط طرف";
  return "وسط";
}

function playerInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0] || "").join("") || "•";
}

function PlayerPhoto({
  player,
  size = "pitch",
}: {
  player: Pick<LineupPlayer, "id" | "name" | "number" | "photo">;
  size?: "pitch" | "pitchDense" | "bench" | "absence";
}) {
  const [failed, setFailed] = useState(false);
  const boxClass =
    size === "pitch"
      ? "h-[50px] w-[50px] sm:h-14 sm:w-14"
      : size === "pitchDense"
        ? "h-[43px] w-[43px] sm:h-12 sm:w-12"
        : size === "bench"
          ? "h-12 w-12"
          : "h-11 w-11";

  return (
    <div className={`relative ${boxClass} shrink-0 overflow-visible`}>
      <div
        className={`flex ${boxClass} items-center justify-center overflow-hidden rounded-full border-2 border-white/80 bg-slate-800 shadow-[0_5px_16px_rgba(0,0,0,0.35)]`}
      >
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
          <span className="text-[10px] font-black text-white/80">{playerInitials(player.name)}</span>
        )}
      </div>
      {player.number != null ? (
        <span
          dir="ltr"
          className="absolute -left-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-black/10 bg-white px-1 text-[9px] font-black text-slate-950 shadow-md [unicode-bidi:isolate]"
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
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/15 bg-white/5">
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
        <UsersRound className="h-5 w-5 text-white/45" aria-hidden="true" />
      )}
    </div>
  );
}

function parseGrid(grid: string | null) {
  if (!grid) return null;
  const [rowText, columnText] = grid.split(":");
  const row = Number(rowText);
  const column = Number(columnText);
  if (!Number.isInteger(row) || row <= 0 || !Number.isInteger(column) || column <= 0) {
    return null;
  }
  return { row, column };
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

function perspectiveX(x: number, y: number) {
  // الملعب أضيق بصريًا في الأعلى بسبب المنظور، لذلك نضغط مواقع اللاعبين
  // نحو الوسط كلما اقتربوا من مرمى الخصم.
  const inset = Math.max(0, 11 * (1 - y / 100));
  return inset + (x / 100) * (100 - inset * 2);
}

function distributeRow(players: LineupPlayer[], y: number): PitchSlot[] {
  if (!players.length) return [];
  const count = players.length;
  const edge = count >= 5 ? 7 : count === 4 ? 11 : count === 3 ? 20 : count === 2 ? 34 : 50;
  const end = count === 1 ? 50 : 100 - edge;
  return players.map((player, index) => {
    const rawX = count === 1 ? 50 : edge + ((end - edge) * index) / Math.max(1, count - 1);
    return {
      player,
      x: perspectiveX(rawX, y),
      y,
      rowSize: count,
    };
  });
}

function role(player: LineupPlayer) {
  const value = player.position.trim().toUpperCase();
  if (value === "G" || value.includes("GOAL")) return "G";
  if (value === "D" || value.includes("DEF")) return "D";
  if (value === "M" || value.includes("MID")) return "M";
  return "F";
}

function lineupSlots(players: LineupPlayer[], formation: string | null): PitchSlot[] {
  if (!players.length) return [];

  const parsed = players
    .map((player) => ({ player, grid: parseGrid(player.grid) }))
    .filter((item): item is { player: LineupPlayer; grid: { row: number; column: number } } => Boolean(item.grid));

  if (parsed.length >= 10) {
    const grouped = new Map<number, Array<{ player: LineupPlayer; column: number }>>();
    parsed.forEach(({ player, grid }) => {
      const current = grouped.get(grid.row) || [];
      current.push({ player, column: grid.column });
      grouped.set(grid.row, current);
    });

    const rows = [...grouped.keys()].sort((a, b) => a - b);
    if (rows.length >= 3) {
      const maxIndex = rows.length - 1;
      return rows.flatMap((row, index) => {
        const items = [...(grouped.get(row) || [])]
          .sort((a, b) => a.column - b.column)
          .map((item) => item.player);
        const y = 88 - (index / Math.max(1, maxIndex)) * 71;
        return distributeRow(items, y);
      });
    }
  }

  const parts = formationParts(formation) || [4, 4, 2];
  const remaining = [...players];
  const takeRole = (targetRole: "G" | "D" | "M" | "F", count: number) => {
    const chosen: LineupPlayer[] = [];
    for (let index = 0; index < remaining.length && chosen.length < count; ) {
      if (role(remaining[index]) === targetRole) {
        chosen.push(remaining[index]);
        remaining.splice(index, 1);
      } else {
        index += 1;
      }
    }
    while (chosen.length < count && remaining.length) chosen.push(remaining.shift()!);
    return chosen;
  };

  const rows: LineupPlayer[][] = [takeRole("G", 1)];
  parts.forEach((count, index) => {
    const wantedRole = index === 0 ? "D" : index === parts.length - 1 ? "F" : "M";
    rows.push(takeRole(wantedRole, count));
  });

  const maxIndex = rows.length - 1;
  return rows.flatMap((rowPlayers, index) =>
    distributeRow(rowPlayers, 88 - (index / Math.max(1, maxIndex)) * 71),
  );
}

function PitchPlayer({
  player,
  x,
  y,
  rowSize,
  formation,
}: PitchSlot & { formation: string | null }) {
  const dense = rowSize >= 5;
  return (
    <div
      className={`absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center ${
        dense ? "w-[62px] sm:w-[70px]" : "w-[72px] sm:w-[82px]"
      }`}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <PlayerPhoto player={player} size={dense ? "pitchDense" : "pitch"} />
      <div
        title={player.name}
        dir="rtl"
        className={`mt-1 line-clamp-2 w-full min-h-[22px] break-words font-black leading-[11px] text-white ${
          dense ? "text-[7.5px] sm:text-[8.5px]" : "text-[8.5px] sm:text-[9.5px]"
        }`}
        style={{ textShadow: "0 2px 5px rgba(0,0,0,.98)" }}
      >
        {player.name}
      </div>
      <div
        dir="rtl"
        className="mt-0.5 max-w-full truncate text-[7px] font-bold leading-3 text-emerald-50/85 sm:text-[8px]"
        style={{ textShadow: "0 1px 4px rgba(0,0,0,.98)" }}
      >
        {pitchPositionLabel(player, formation)}
      </div>
    </div>
  );
}

function FootballPitch({ players, formation }: { players: LineupPlayer[]; formation: string | null }) {
  const slots = useMemo(() => lineupSlots(players, formation), [players, formation]);

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-emerald-300/20 bg-[#03150c] px-2 pb-2 pt-3 shadow-[0_20px_55px_rgba(0,0,0,0.38)]">
      <div className="relative mx-auto aspect-[0.74/1] min-h-[520px] w-full max-w-[500px] sm:min-h-[620px]">
        <div
          className="absolute inset-[1%_1.5%_1%] overflow-hidden rounded-[22px] border border-emerald-100/15 shadow-[inset_0_0_70px_rgba(0,0,0,.24)]"
          style={{
            clipPath: "polygon(11% 0,89% 0,100% 100%,0 100%)",
            background:
              "repeating-linear-gradient(0deg,rgba(255,255,255,.032) 0 8.33%,rgba(0,0,0,.025) 8.33% 16.66%),linear-gradient(180deg,#369d53 0%,#2f9149 50%,#287b40 100%)",
          }}
        >
          <div className="absolute inset-[3.5%_5%] border-2 border-white/52" />
          <div className="absolute left-[5%] right-[5%] top-1/2 border-t-2 border-white/52" />
          <div className="absolute left-1/2 top-1/2 h-[14%] w-[29%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/52" />
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />

          <div className="absolute left-1/2 top-[3.5%] h-[14%] w-[46%] -translate-x-1/2 border-x-2 border-b-2 border-white/52" />
          <div className="absolute left-1/2 top-[3.5%] h-[6.5%] w-[21%] -translate-x-1/2 border-x-2 border-b-2 border-white/52" />
          <div className="absolute bottom-[3.5%] left-1/2 h-[14%] w-[46%] -translate-x-1/2 border-x-2 border-t-2 border-white/52" />
          <div className="absolute bottom-[3.5%] left-1/2 h-[6.5%] w-[21%] -translate-x-1/2 border-x-2 border-t-2 border-white/52" />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/10" />
        </div>

        <div
          className="pointer-events-none absolute inset-x-[4%] bottom-[-1%] h-[9%] bg-black/40 blur-xl"
          style={{ clipPath: "polygon(0 0,100% 0,92% 100%,8% 100%)" }}
        />

        {slots.length ? (
          slots.map((slot) => (
            <PitchPlayer key={slot.player.id} {...slot} formation={formation} />
          ))
        ) : (
          <div className="absolute inset-0 z-20 flex items-center justify-center text-sm font-black text-white/55">
            لم يصدر التشكيل بعد
          </div>
        )}

        {formation ? (
          <span
            dir="ltr"
            className="absolute bottom-3 right-3 z-30 rounded-full border border-white/15 bg-slate-950/72 px-3 py-1 text-[11px] font-black text-white shadow-lg [unicode-bidi:isolate]"
          >
            {formation}
          </span>
        ) : null}
      </div>
    </section>
  );
}

function CoachCard({ team }: { team: TeamLineup }) {
  if (!team.coach?.name) return null;
  return (
    <section className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[0.045] p-3.5">
      <div className="min-w-0">
        <div className="text-[10px] font-bold text-white/40">المدرب</div>
        <div className="mt-1 truncate text-sm font-black text-white">{team.coach.name}</div>
      </div>
      <CoachPhoto name={team.coach.name} photo={team.coach.photo} />
    </section>
  );
}

function Bench({ players }: { players: LineupPlayer[] }) {
  if (!players.length) return null;
  return (
    <section className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04]">
      <div className="border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-black text-white">مقاعد البدلاء</h3>
      </div>
      <div className="grid grid-cols-3 px-2 py-4 sm:grid-cols-4">
        {players.map((player, index) => (
          <div
            key={player.id}
            className={`min-w-0 px-1.5 py-2 text-center ${
              index % 3 !== 2 ? "border-l border-white/[0.07] sm:border-l-0" : ""
            }`}
          >
            <div className="flex justify-center">
              <PlayerPhoto player={player} size="bench" />
            </div>
            <div className="mt-1.5 line-clamp-2 min-h-[30px] text-[10px] font-black leading-[15px] text-white">
              {player.name}
            </div>
            <div className="mt-0.5 text-[9px] font-bold text-white/40">
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
    <section className="overflow-hidden rounded-[24px] border border-rose-300/15 bg-rose-300/[0.035]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <CircleAlert className="h-4 w-4 text-rose-200" aria-hidden="true" />
        <h3 className="text-sm font-black text-white">الغيابات</h3>
      </div>
      <div className="divide-y divide-white/[0.07]">
        {players.map((player) => (
          <div key={player.id} className="flex items-center gap-3 px-4 py-3">
            <PlayerPhoto player={{ ...player, number: null }} size="absence" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-black text-white">{player.name}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] font-bold text-white/40">
                <span>{positionLabel(player.position)}</span>
                <span>•</span>
                <span className="text-rose-100/75">{player.reason}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
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

  useEffect(() => setIsMounted(true), []);

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
                className="flex max-h-[calc(100svh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] border border-amber-300/15 bg-slate-950 shadow-xl shadow-black/50 md:max-h-[92vh] md:rounded-[2rem]"
                onClick={(event) => event.stopPropagation()}
              >
                <header className="relative shrink-0 border-b border-white/10 bg-[#0b1020]/98 px-4 py-3 backdrop-blur">
                  <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/15 md:hidden" />
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black text-amber-100">
                        <Shirt className="h-3.5 w-3.5" aria-hidden="true" />
                        التشكيل
                      </div>
                      <h2 className="mt-1 text-lg font-black text-white">{activeTeam?.source === "official" ? "التشكيل الرسمي" : "التشكيل المتوقع"}</h2>
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

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-5 pt-3 sm:px-4">
                  {loading && !data ? (
                    <div className="py-16 text-center text-white/55">
                      <RefreshCw className="mx-auto h-7 w-7 animate-spin text-amber-200" aria-hidden="true" />
                      <p className="mt-3 text-xs font-black">جاري تحميل التشكيل...</p>
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
                              ? "bg-sky-500 text-white shadow-lg shadow-sky-950/25"
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
                              ? "bg-sky-500 text-white shadow-lg shadow-sky-950/25"
                              : "text-white/55 hover:bg-white/5"
                          }`}
                        >
                          <TeamFlag code={awayFlagCode} name={awayDisplay} size="xs" />
                          <span className="truncate">{awayDisplay}</span>
                        </button>
                      </div>

                      {activeTeam ? (
                        <>
                          <div className="flex items-center justify-between gap-2 px-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${sourceClass(activeTeam.source)}`}>
                                {sourceLabel(activeTeam.source)}
                              </span>
                              {activeTeam.absences?.length ? (
                                <span className="rounded-full border border-rose-300/20 bg-rose-300/[0.08] px-2.5 py-1.5 text-[10px] font-black text-rose-100">
                                  {activeTeam.absences.length} غياب
                                </span>
                              ) : null}
                            </div>
                            {activeTeam.formation ? (
                              <span dir="ltr" className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-black text-white/75 [unicode-bidi:isolate]">
                                {activeTeam.formation}
                              </span>
                            ) : null}
                          </div>

                          <FootballPitch players={activeTeam.startXI} formation={activeTeam.formation} />
                          <CoachCard team={activeTeam} />
                          <Bench players={activeTeam.substitutes} />
                          <Absences players={activeTeam.absences || []} />
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div
                  className="shrink-0 border-t border-white/10 bg-slate-950/98 p-3"
                  style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-950/20 transition hover:bg-amber-200 active:scale-[0.99]"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    إغلاق التشكيل
                  </button>
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
        className={`inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-amber-300/35 bg-amber-300/[0.08] font-black text-amber-50 transition hover:border-amber-300/55 hover:bg-amber-300/[0.13] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 ${
          compact ? "w-full px-2.5 text-[10px] sm:px-3 sm:text-[11px]" : "w-full px-3 text-[11px] sm:px-4 sm:text-xs"
        }`}
      >
        <Shirt className="h-4 w-4 shrink-0 text-amber-200" aria-hidden="true" />
        <span className="truncate">التشكيل المتوقع</span>
      </button>
      {modal}
    </>
  );
}
