"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, CalendarDays, MapPin, Trophy } from "lucide-react";
import TournamentStatusBadge from "@/components/tournaments/TournamentStatusBadge";
import {
  formatTournamentDateRange,
  getTournamentDisplayStatus,
  getTournamentHref,
  type Tournament,
} from "@/domain/tournaments";
import { playInteractionFeedback } from "@/lib/interactionFeedback";

type Props = { tournaments: Tournament[] };

function worldCupBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_17%_24%,rgba(34,211,238,.24),transparent_24%),radial-gradient(circle_at_88%_14%,rgba(251,191,36,.18),transparent_20%),linear-gradient(135deg,#07163d_0%,#0a2b68_48%,#071735_100%)]" />
      <div className="absolute -left-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full border border-cyan-200/15 sm:h-80 sm:w-80" />
      <div className="absolute -left-8 top-1/2 h-44 w-44 -translate-y-1/2 rounded-full border border-dashed border-white/10 sm:h-56 sm:w-56" />
      <div className="absolute left-6 top-7 text-[92px] font-black leading-none tracking-[-0.08em] text-white/[0.035] sm:text-[150px]">2026</div>
      <div className="absolute bottom-5 left-4 h-28 w-28 opacity-[0.10] sm:left-10 sm:h-40 sm:w-40">
        <img src="/wc2026-logo-black.png" alt="" className="h-full w-full object-contain invert" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,12,39,.12),rgba(3,12,39,.34)_46%,rgba(3,12,39,.90)_100%)]" />
    </div>
  );
}

function tournamentBackdrop(tournament: Tournament) {
  const artwork = tournament.branding.coverUrl || tournament.branding.heroUrl || tournament.branding.backgroundUrl;
  if (tournament.id === "wc2026") return worldCupBackdrop();

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {artwork ? (
        <motion.img
          key={artwork}
          initial={{ scale: 1.025, opacity: 0.72 }}
          animate={{ scale: 1, opacity: 0.84 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          src={artwork}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : null}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, rgba(3,12,39,.16), rgba(3,12,39,.48) 48%, rgba(3,12,39,.94) 100%), radial-gradient(circle at 18% 18%, ${tournament.branding.accentColor}28, transparent 24%)`,
        }}
      />
    </div>
  );
}

export default function TournamentShowcase({ tournaments }: Props) {
  const [activeId, setActiveId] = useState(tournaments[0]?.id ?? "");
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  const active = useMemo(
    () => tournaments.find((item) => item.id === activeId) ?? tournaments[0],
    [activeId, tournaments],
  );

  useEffect(() => {
    if (paused || reduceMotion || tournaments.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveId((current) => {
        const index = Math.max(0, tournaments.findIndex((item) => item.id === current));
        return tournaments[(index + 1) % tournaments.length]?.id ?? current;
      });
    }, 7200);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion, tournaments]);

  if (!active) return null;

  const date = formatTournamentDateRange(active);
  const location = [active.hostCountry, active.hostCities?.[0]].filter(Boolean).join(" · ");
  const status = getTournamentDisplayStatus(active);

  function select(tournament: Tournament) {
    setActiveId(tournament.id);
    setPaused(true);
    playInteractionFeedback("selection");
  }

  return (
    <section aria-labelledby="home-tournaments-title">
      <div className="mb-4 flex items-end justify-between gap-3 md:mb-5">
        <div>
          <p className="altahaddi-eyebrow font-black text-[#ffc210]">بطولات التحدي</p>
          <h2 id="home-tournaments-title" className="altahaddi-section-title mt-1 font-black">اختر البطولة وابدأ المنافسة</h2>
        </div>
        <Link href="/tournaments" className="hidden min-h-[42px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-xs font-black text-white/62 transition hover:bg-white/[0.08] hover:text-white sm:inline-flex">
          جميع البطولات <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      <div
        className="altahaddi-glass overflow-hidden rounded-[30px] md:rounded-[38px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="relative min-h-[340px] sm:min-h-[390px] md:min-h-[430px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.995 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.32, ease: "easeOut" }}
              className="absolute inset-0"
            >
              {tournamentBackdrop(active)}
            </motion.div>
          </AnimatePresence>

          <div className="absolute inset-0 altahaddi-showcase-lines opacity-40" aria-hidden="true" />

          <div className="relative flex min-h-[340px] flex-col justify-end px-4 pb-5 pt-16 sm:min-h-[390px] sm:px-6 sm:pb-6 md:min-h-[430px] md:px-8 md:pb-8 lg:px-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${active.id}-content`}
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: reduceMotion ? 0 : 0.3, ease: "easeOut" }}
                className="max-w-[660px]"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {active.branding.logoUrl ? (
                    <div className="flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-[22px] border border-white/20 bg-white/[0.94] p-2 shadow-[0_18px_45px_rgba(0,0,0,.22)] sm:h-20 sm:w-20 sm:rounded-[24px]">
                      <img src={active.branding.logoUrl} alt={`شعار ${active.name}`} className="h-full w-full object-contain" />
                    </div>
                  ) : null}
                  <div className="min-w-0 pt-0.5">
                    <TournamentStatusBadge status={status} />
                    <h3 className="altahaddi-feature-title mt-2 font-black text-white">{active.shortName}</h3>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-white/88 md:text-sm">
                  {location ? <span className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-white/14 bg-[#031039]/52 px-2.5 py-1.5 shadow-[0_10px_28px_rgba(0,0,0,.16)] backdrop-blur-xl"><MapPin className="h-3.5 w-3.5 text-[#ffc210] sm:h-4 sm:w-4" />{location}</span> : null}
                  {date ? <span className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-white/14 bg-[#031039]/52 px-2.5 py-1.5 shadow-[0_10px_28px_rgba(0,0,0,.16)] backdrop-blur-xl"><CalendarDays className="h-3.5 w-3.5 text-[#ffc210] sm:h-4 sm:w-4" />{date}</span> : null}
                </div>

                <Link
                  href={getTournamentHref(active)}
                  onClick={() => playInteractionFeedback("selection")}
                  className="mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-[16px] bg-[#ffc210] px-4 text-sm font-black text-[#04133a] shadow-[0_14px_38px_rgba(255,194,16,.18)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(255,194,16,.24)]"
                >
                  <Trophy className="h-4 w-4" /> دخول البطولة <ArrowLeft className="h-4 w-4" />
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 border-t border-white/[0.10] bg-[#04143d]/44 p-2 backdrop-blur-2xl sm:gap-2 sm:p-3">
          {tournaments.map((tournament) => {
            const selected = tournament.id === active.id;
            const tournamentStatus = getTournamentDisplayStatus(tournament);
            return (
              <button
                key={tournament.id}
                type="button"
                onClick={() => select(tournament)}
                aria-pressed={selected}
                className={`group relative flex min-h-[78px] min-w-0 items-center gap-2 overflow-hidden rounded-[18px] border px-2.5 py-2 text-right transition sm:min-h-[86px] sm:px-3 ${selected ? "border-[#ffc210]/38 bg-[#ffc210]/[0.10] shadow-[inset_0_0_0_1px_rgba(255,194,16,.06)]" : "border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.05]"}`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] p-1.5 sm:h-12 sm:w-12 ${tournament.id === "wc2026" ? "bg-white/95" : "bg-white/90"}`}>
                  {tournament.branding.logoUrl ? <img src={tournament.branding.logoUrl} alt="" className="h-full w-full object-contain" /> : null}
                </div>
                <div className="min-w-0">
                  <div className={`line-clamp-2 text-[10px] font-black leading-4 sm:text-xs ${selected ? "text-white" : "text-white/64"}`}>{tournament.shortName}</div>
                  <div className={`mt-1 text-[8px] font-black sm:text-[9px] ${tournamentStatus === "active" ? "text-emerald-300" : tournamentStatus === "finished" ? "text-rose-300" : "text-[#ffc210]"}`}>
                    {tournamentStatus === "active" ? "جارية" : tournamentStatus === "finished" ? "منتهية" : "قريبًا"}
                  </div>
                </div>
                {selected ? <motion.span layoutId="tournament-selector-active" className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#ffc210]" /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
