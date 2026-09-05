"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Coffee,
  Flag,
  Gamepad2,
  Languages,
  Target,
  TimerReset,
  type LucideIcon,
} from "lucide-react";
import { playInteractionFeedback } from "@/lib/interactionFeedback";

type Game = {
  id: "vocabulary" | "word" | "flags" | "timer" | "majlis";
  title: string;
  shortTitle: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accent: string;
  background: string;
};

const GAMES: Game[] = [
  {
    id: "vocabulary",
    title: "تحدي المفردات",
    shortTitle: "المفردات",
    description: "غيّر حرفًا واحدًا، اصنع كلمة صحيحة، وتخلّص من بطاقاتك قبل خصمك.",
    href: "/vocabulary-challenge",
    icon: Languages,
    accent: "#6ee7b7",
    background: "radial-gradient(circle at 16% 18%, rgba(110,231,183,.22), transparent 28%), linear-gradient(135deg,#064238 0%,#07533f 52%,#07322f 100%)",
  },
  {
    id: "word",
    title: "خمن كلمة اليوم",
    shortTitle: "خمن الكلمة",
    description: "ست محاولات. كلمة رياضية واحدة. تحدٍ جديد كل يوم.",
    href: "/word-game",
    icon: Target,
    accent: "#34d399",
    background: "radial-gradient(circle at 15% 18%, rgba(52,211,153,.23), transparent 27%), linear-gradient(135deg,#06344a 0%,#08295a 52%,#071a47 100%)",
  },
  {
    id: "flags",
    title: "تحدي الأعلام",
    shortTitle: "الأعلام",
    description: "اختبر ذاكرتك وسرعتك في مطابقة أعلام المنتخبات.",
    href: "/flag-memory",
    icon: Flag,
    accent: "#67e8f9",
    background: "radial-gradient(circle at 16% 20%, rgba(103,232,249,.22), transparent 28%), linear-gradient(135deg,#07345e 0%,#0a2a67 55%,#071946 100%)",
  },
  {
    id: "timer",
    title: "العشر ثواني",
    shortTitle: "10 ثواني",
    description: "أوقف المؤقت عند 10.000 بالضبط. كل جزء من الثانية يفرق.",
    href: "/ten-seconds-challenge",
    icon: TimerReset,
    accent: "#ffc210",
    background: "radial-gradient(circle at 16% 18%, rgba(255,194,16,.22), transparent 28%), linear-gradient(135deg,#2c2744 0%,#15245a 48%,#071946 100%)",
  },
  {
    id: "majlis",
    title: "مجلس التحدي",
    shortTitle: "المجلس",
    description: "جلسة جماعية بطابع المجلس السعودي: فرق، فئات، أسئلة، فزعة ومساعدات تكتيكية.",
    href: "/majlis",
    icon: Coffee,
    accent: "#f1cf89",
    background: "radial-gradient(circle at 16% 18%, rgba(214,177,107,.22), transparent 28%), linear-gradient(135deg,#173a34 0%,#0f302d 52%,#5b2f26 120%)",
  },
];

function GameVisual({ game }: { game: Game }) {
  if (game.id === "vocabulary") {
    return (
      <div className="relative flex h-full min-h-[150px] items-center justify-center sm:min-h-[190px]" aria-hidden="true">
        <div className="absolute h-36 w-36 rounded-full border border-emerald-100/10 sm:h-44 sm:w-44" />
        <div className="absolute h-28 w-28 rounded-full border border-dashed border-emerald-100/15 sm:h-36 sm:w-36" />
        <div className="relative flex items-center gap-2" dir="rtl">
          {["م", "ي", "م"].map((letter, index) => (
            <motion.div key={`${letter}-${index}`} animate={index === 0 ? { y: [0, -5, 0] } : undefined} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className={`grid h-16 w-12 place-items-center rounded-[15px] border text-2xl font-black shadow-xl ${index === 0 ? "border-emerald-100/35 bg-gradient-to-br from-emerald-400/80 to-emerald-700/90" : "border-white/12 bg-white/[0.08]"}`}>{letter}</motion.div>
          ))}
          <span className="mx-1 text-lg font-black text-emerald-100">←</span>
          <motion.div animate={{ rotate: [0, -4, 0] }} transition={{ duration: 2.2, repeat: Infinity }} className="grid h-14 w-11 place-items-center rounded-[14px] border border-amber-100/40 bg-gradient-to-br from-amber-300 to-orange-600 text-xl font-black shadow-xl">ر</motion.div>
        </div>
      </div>
    );
  }

  if (game.id === "word") {
    return (
      <div className="relative flex h-full min-h-[150px] items-center justify-center sm:min-h-[190px]" aria-hidden="true">
        <div className="absolute h-36 w-36 rounded-full border border-emerald-200/10 sm:h-44 sm:w-44" />
        <div className="absolute h-28 w-28 rounded-full border border-dashed border-emerald-200/15 sm:h-36 sm:w-36" />
        <div dir="rtl" className="relative grid grid-cols-4 gap-1.5 sm:gap-2">
          {["ت", "ح", "د", "ي"].map((letter, index) => (
            <motion.div
              key={letter}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="grid h-12 w-11 place-items-center rounded-[14px] border border-white/12 bg-white/[0.08] text-xl font-black shadow-lg backdrop-blur-md sm:h-14 sm:w-14 sm:text-2xl"
            >
              {letter}
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (game.id === "flags") {
    return (
      <div className="relative flex h-full min-h-[150px] items-center justify-center sm:min-h-[190px]" aria-hidden="true">
        <div className="grid grid-cols-2 gap-2.5 rotate-[-4deg] sm:gap-3">
          {["🇸🇦", "🇯🇵", "🇧🇷", "🇫🇷"].map((flag, index) => (
            <motion.div
              key={flag}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="grid h-14 w-20 place-items-center rounded-[17px] border border-white/12 bg-white/[0.08] text-3xl shadow-xl backdrop-blur-md sm:h-16 sm:w-24 sm:text-4xl"
            >
              {flag}
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (game.id === "majlis") {
    return (
      <div className="relative flex h-full min-h-[150px] items-center justify-center overflow-hidden sm:min-h-[190px]" aria-hidden="true">
        <div className="absolute inset-x-[12%] bottom-[16%] h-12 rounded-[22px] border border-[#f1cf89]/20 bg-[#7b3f2e]/35" />
        <div className="absolute inset-x-[20%] bottom-[35%] h-12 rounded-t-[28px] border border-[#f1cf89]/18 bg-[#214f45]/75" />
        <motion.div animate={{ y: [0,-4,0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} className="relative grid h-20 w-20 place-items-center rounded-[24px] border border-[#f1cf89]/30 bg-[#102f2d]/90 shadow-xl">
          <Coffee className="h-9 w-9 text-[#f1cf89]" />
        </motion.div>
        <span className="absolute bottom-[19%] right-[14%] rounded-full border border-[#f1cf89]/20 bg-[#102f2d]/90 px-2.5 py-1 text-[9px] font-black text-[#f4e5c4]">فريق أ</span>
        <span className="absolute bottom-[19%] left-[14%] rounded-full border border-[#f1cf89]/20 bg-[#102f2d]/90 px-2.5 py-1 text-[9px] font-black text-[#f4e5c4]">فريق ب</span>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-[150px] items-center justify-center sm:min-h-[190px]" aria-hidden="true">
      <div className="absolute h-36 w-36 rounded-full border border-[#ffc210]/12 sm:h-44 sm:w-44" />
      <div className="absolute h-28 w-28 rounded-full border border-dashed border-[#ffc210]/20 sm:h-36 sm:w-36" />
      <div className="relative rounded-[22px] border border-[#ffc210]/18 bg-[#04133a]/58 px-5 py-4 shadow-[0_22px_55px_rgba(0,0,0,.28)] backdrop-blur-xl sm:px-7 sm:py-5">
        <div dir="ltr" className="font-mono text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl">10.000</div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div initial={{ width: "22%" }} animate={{ width: "86%" }} transition={{ duration: 2.6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }} className="h-full rounded-full bg-[#ffc210]" />
        </div>
      </div>
    </div>
  );
}

export default function GameShowcase() {
  const [activeId, setActiveId] = useState<Game["id"]>("vocabulary");
  const reduceMotion = useReducedMotion();
  const active = useMemo(() => GAMES.find((game) => game.id === activeId) ?? GAMES[0], [activeId]);

  if (!active) return null;
  const ActiveIcon = active.icon;

  function select(game: Game) {
    setActiveId(game.id);
    playInteractionFeedback("selection");
  }

  return (
    <section aria-labelledby="home-games-title">
      <div className="mb-4 flex items-end justify-between gap-3 md:mb-5">
        <div>
          <p className="altahaddi-eyebrow font-black text-[#ffc210]">وقت التحدي</p>
          <h2 id="home-games-title" className="altahaddi-section-title mt-1 font-black">اختر لعبتك وابدأ</h2>
        </div>
        <Link href="/games" className="hidden min-h-[40px] items-center gap-1 rounded-xl px-2 text-xs font-black text-white/60 transition hover:text-white sm:inline-flex">
          كل الألعاب <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      <div className="altahaddi-glass overflow-hidden rounded-[28px] md:rounded-[36px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: "easeOut" }}
            className="relative grid min-h-[300px] overflow-hidden md:grid-cols-[.9fr_1.1fr] md:min-h-[350px]"
            style={{ background: active.background }}
          >
            <div className="altahaddi-grid pointer-events-none absolute inset-0 opacity-15" aria-hidden="true" />
            <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full border border-white/[0.05]" aria-hidden="true" />

            <div className="relative order-2 flex flex-col justify-center px-5 pb-6 pt-2 md:order-1 md:px-8 md:py-8 lg:px-10">
              <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-black/15 px-2.5 py-1.5 text-[9px] font-black text-white/72 backdrop-blur-md md:text-[10px]">
                <ActiveIcon className="h-3.5 w-3.5" style={{ color: active.accent }} /> لعبة سريعة
              </div>
              <h3 className="altahaddi-feature-title mt-3 font-black">{active.title}</h3>
              <p className="altahaddi-body-copy mt-2 max-w-lg font-semibold text-white/58">{active.description}</p>
              <Link
                href={active.href}
                onClick={() => playInteractionFeedback("selection")}
                className="mt-5 inline-flex min-h-[46px] w-fit items-center gap-2 rounded-[15px] bg-[#ffc210] px-4 text-xs font-black text-[#04133a] shadow-[0_14px_36px_rgba(255,194,16,.18)] transition hover:-translate-y-0.5 md:text-sm"
              >
                <Gamepad2 className="h-4 w-4" /> ابدأ اللعبة <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>

            <div className="relative order-1 px-4 pt-4 md:order-2 md:px-6 md:py-5">
              <GameVisual game={active} />
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-1.5 border-t border-white/[0.10] bg-[#04143d]/45 p-2 backdrop-blur-2xl sm:grid-cols-5 sm:gap-2 sm:p-3">
          {GAMES.map((game) => {
            const selected = game.id === active.id;
            const Icon = game.icon;
            return (
              <button
                key={game.id}
                type="button"
                onClick={() => select(game)}
                aria-pressed={selected}
                className={`relative flex min-h-[64px] min-w-0 items-center justify-center gap-2 overflow-hidden rounded-[16px] border px-2 py-2 transition sm:min-h-[72px] sm:px-3 ${selected ? "border-[#ffc210]/34 bg-[#ffc210]/[0.09] text-white" : "border-white/[0.06] bg-white/[0.025] text-white/55 hover:bg-white/[0.05]"}`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[11px] ${selected ? "bg-[#ffc210] text-[#04133a]" : "bg-white/[0.05] text-white/58"}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="truncate text-[9px] font-black sm:text-[11px]">{game.shortTitle}</span>
                {selected ? <motion.span layoutId="game-selector-active" className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#ffc210]" /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
