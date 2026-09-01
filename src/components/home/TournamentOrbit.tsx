"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, Trophy } from "lucide-react";
import TournamentStatusBadge from "@/components/tournaments/TournamentStatusBadge";
import {
  formatTournamentDateRange,
  getTournamentDisplayStatus,
  getTournamentHref,
  type Tournament,
} from "@/domain/tournaments";
import { playInteractionFeedback } from "@/lib/interactionFeedback";

type Props = {
  tournaments: Tournament[];
};

function normalizedOffset(index: number, active: number, length: number) {
  let offset = index - active;
  if (offset > length / 2) offset -= length;
  if (offset < -length / 2) offset += length;
  return offset;
}

export default function TournamentOrbit({ tournaments }: Props) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  const current = tournaments[active];
  const artwork = current?.branding.coverUrl || current?.branding.heroUrl;

  useEffect(() => {
    if (paused || reduceMotion || tournaments.length < 2) return;
    const timer = window.setInterval(() => {
      setActive((value) => (value + 1) % tournaments.length);
    }, 5600);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion, tournaments.length]);

  const positions = useMemo(
    () => tournaments.map((_, index) => normalizedOffset(index, active, tournaments.length)),
    [active, tournaments],
  );

  function go(next: number) {
    setActive((next + tournaments.length) % tournaments.length);
    playInteractionFeedback("selection");
  }

  if (!current) return null;

  return (
    <section
      className="relative isolate overflow-hidden rounded-[30px] border border-white/10 bg-[#06194a] shadow-[0_30px_80px_rgba(0,0,0,.28)] md:rounded-[40px]"
      aria-labelledby="home-tournaments-title"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <motion.div
        key={artwork || current.id}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
        className="absolute inset-0"
        aria-hidden="true"
      >
        {artwork ? <img src={artwork} alt="" className="h-full w-full object-cover opacity-25" /> : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(255,194,16,.10),transparent_28%),linear-gradient(180deg,rgba(4,19,58,.62),rgba(4,19,58,.98))]" />
      </motion.div>
      <div className="altahaddi-grid absolute inset-0 opacity-30" aria-hidden="true" />

      <div className="relative px-4 pb-5 pt-5 sm:px-5 md:px-8 md:pb-8 md:pt-7">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-[#ffc210]/20 bg-[#ffc210]/[0.08] px-2.5 text-[10px] font-black text-[#ffc210] md:text-xs">
              <Trophy className="h-3.5 w-3.5" /> مواسم المنافسة
            </div>
            <h2 id="home-tournaments-title" className="mt-2 text-xl font-black md:text-3xl">اختر بطولتك</h2>
            <p className="mt-1 max-w-xl text-[11px] font-semibold leading-6 text-white/45 md:text-sm">مرّر بين البطولات ثم ادخل إلى المباريات والتوقعات والترتيب بهوية كل بطولة.</p>
          </div>
          <Link href="/tournaments" className="hidden min-h-[42px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-xs font-black text-white/65 transition hover:bg-white/[0.09] hover:text-white sm:inline-flex">
            عرض الكل <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        <div className="relative mt-3 h-[330px] overflow-visible sm:h-[360px] md:mt-5 md:h-[410px]" style={{ perspective: "1200px" }}>
          {tournaments.map((tournament, index) => {
            const offset = positions[index] ?? 0;
            const isActive = offset === 0;
            const abs = Math.abs(offset);
            const cardArtwork = tournament.branding.coverUrl || tournament.branding.heroUrl;
            const status = getTournamentDisplayStatus(tournament);
            const date = formatTournamentDateRange(tournament);
            const xPercent = offset * 50;

            return (
              <div key={tournament.id} className="pointer-events-none absolute inset-0 grid place-items-center">
                <motion.div
                  className="w-[76%] max-w-[320px] md:max-w-[360px]"
                  animate={{
                    x: `${xPercent}%`,
                    y: isActive ? -8 : 9,
                    scale: isActive ? 1 : abs === 1 ? 0.82 : 0.68,
                    rotateY: isActive ? 0 : offset < 0 ? 24 : -24,
                    opacity: abs > 1 ? 0 : isActive ? 1 : 0.46,
                    zIndex: isActive ? 30 : 20 - abs,
                  }}
                  transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 190, damping: 24, mass: 0.9 }}
                  style={{ transformStyle: "preserve-3d", pointerEvents: abs > 1 ? "none" : "auto", position: "relative" }}
                >
                {isActive ? (
                  <Link
                    href={getTournamentHref(tournament)}
                    className="group relative block aspect-[4/5] overflow-hidden rounded-[28px] border border-white/15 bg-[#071d54] shadow-[0_28px_70px_rgba(0,0,0,.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffc210]"
                  >
                    {cardArtwork ? <img src={cardArtwork} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]" /> : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#031039] via-[#04184a]/55 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                      <div className="mb-3 flex items-end justify-between gap-3">
                        <div className="min-w-0">
                          <TournamentStatusBadge status={status} />
                          <h3 className="mt-2 truncate text-2xl font-black md:text-3xl">{tournament.shortName}</h3>
                        </div>
                        {tournament.branding.logoUrl ? (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/90 p-1.5 shadow-xl md:h-16 md:w-16">
                            <img src={tournament.branding.logoUrl} alt={`شعار ${tournament.name}`} className="h-full w-full object-contain" />
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-white/68 md:text-xs">
                        {tournament.hostCountry ? <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[#ffc210]" />{tournament.hostCountry}</span> : null}
                        {date ? <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-[#ffc210]" />{date}</span> : null}
                      </div>
                      <div className="mt-4 flex min-h-[44px] items-center justify-between rounded-2xl border border-white/14 bg-black/25 px-3.5 text-xs font-black backdrop-blur-xl">
                        <span>دخول البطولة</span><ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
                      </div>
                    </div>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => go(index)}
                    aria-label={`عرض ${tournament.name}`}
                    className="relative block aspect-[4/5] w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#071d54] shadow-[0_20px_50px_rgba(0,0,0,.35)]"
                  >
                    {cardArtwork ? <img src={cardArtwork} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
                    <div className="absolute inset-0 bg-[#031039]/35" />
                    <div className="absolute inset-x-0 bottom-0 p-4 text-right">
                      <div className="text-lg font-black">{tournament.shortName}</div>
                    </div>
                  </button>
                )}
                </motion.div>
              </div>
            );
          })}
        </div>

        <div className="mt-1 flex items-center justify-center gap-3">
          <button type="button" onClick={() => go(active - 1)} aria-label="البطولة السابقة" className="altahaddi-carousel-button"><ArrowRight className="h-4 w-4" /></button>
          <div className="flex items-center gap-1.5" aria-label="مؤشر البطولات">
            {tournaments.map((tournament, index) => (
              <button
                key={tournament.id}
                type="button"
                onClick={() => go(index)}
                aria-label={`عرض ${tournament.shortName}`}
                aria-current={index === active ? "true" : undefined}
                className={`h-1.5 rounded-full transition-all ${index === active ? "w-7 bg-[#ffc210]" : "w-1.5 bg-white/25 hover:bg-white/45"}`}
              />
            ))}
          </div>
          <button type="button" onClick={() => go(active + 1)} aria-label="البطولة التالية" className="altahaddi-carousel-button"><ArrowLeft className="h-4 w-4" /></button>
        </div>
      </div>
    </section>
  );
}
