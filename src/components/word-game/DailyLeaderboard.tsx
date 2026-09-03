import type { ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import { Clock3, Flame, ListChecks, Medal, Trophy } from "lucide-react";
import type { WordGameLeaderboardItem } from "@/types/wordGame";
import { formatDurationMs } from "@/lib/wordGameLogic";

type DailyLeaderboardProps = {
  items: WordGameLeaderboardItem[];
};

const scrollOnceViewport = {
  once: true,
  amount: 0.18,
} as const;

const sectionMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
    scale: 0.99,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.32,
      ease: "easeOut",
    },
  },
};

const rowMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
    scale: 0.99,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.24,
      ease: "easeOut",
      staggerChildren: 0.025,
    },
  },
};

const statMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 6,
    scale: 0.99,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
};

function getRankLabel(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
}

function getRankClass(rank: number) {
  if (rank === 1) {
    return "border-amber-300/45 bg-gradient-to-br from-amber-300 to-yellow-500 text-slate-950 shadow-amber-400/20";
  }

  if (rank === 2) {
    return "border-slate-100/40 bg-gradient-to-br from-slate-100 to-slate-400 text-slate-950 shadow-slate-300/15";
  }

  if (rank === 3) {
    return "border-orange-300/40 bg-gradient-to-br from-orange-300 to-orange-600 text-slate-950 shadow-orange-400/15";
  }

  return "border-amber-400/30 bg-amber-400/10 text-white shadow-slate-950/15";
}

function getCardClass(rank: number) {
  if (rank === 1) {
    return "border-amber-300/30 bg-gradient-to-br from-amber-400/16 via-slate-950/45 to-yellow-500/10";
  }

  if (rank === 2) {
    return "border-slate-200/20 bg-gradient-to-br from-slate-200/12 via-slate-950/45 to-white/5";
  }

  if (rank === 3) {
    return "border-orange-300/20 bg-gradient-to-br from-orange-400/14 via-slate-950/45 to-orange-500/8";
  }

  return "border-white/10 bg-slate-950/45";
}

function getStatusLabel(won: boolean) {
  return won ? "فاز" : "خسر";
}

function getStatusClass(won: boolean) {
  return won
    ? "border-amber-300/35 bg-gradient-to-br from-emerald-500/20 to-amber-400/15 text-amber-200"
    : "border-red-400/45 bg-red-500/20 text-red-200";
}

function StatBox({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  className: string;
}) {
  return (
    <motion.div
      variants={statMotion}
      className={`relative overflow-hidden rounded-xl border p-2 text-center ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />

      <div className="relative">
        <div className="mx-auto mb-0.5 flex h-5 w-5 items-center justify-center rounded-lg bg-white/10">
          {icon}
        </div>

        <div className="text-[9px] font-bold opacity-80">{label}</div>

        <div className="mt-0.5 text-[13px] font-black tabular-nums">
          {value}
        </div>
      </div>
    </motion.div>
  );
}

export default function DailyLeaderboard({ items }: DailyLeaderboardProps) {
  return (
    <motion.section
      variants={sectionMotion}
      initial="hidden"
      whileInView="show"
      viewport={scrollOnceViewport}
      className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.09] p-3 shadow-lg shadow-slate-950/25 backdrop-blur-sm md:p-4"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-amber-300/10" />
      <div className="pointer-events-none absolute -right-20 top-8 h-40 w-40 rounded-full bg-amber-300/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-20 bottom-8 h-40 w-40 rounded-full bg-cyan-300/10 blur-2xl" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

      <div className="relative mb-4 text-center">
        <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-100 shadow-md shadow-amber-950/10">
          <Trophy className="h-5 w-5" />
        </div>

        <h2 className="altahaddi-section-title font-black text-white">
          ترتيب تحدي خمن كلمة اليوم
        </h2>

        <p className="altahaddi-body-copy mt-1.5 font-semibold text-slate-300">
          حسب الفوز ثم الأسرع وقتًا، ثم الأقل محاولات.
        </p>
      </div>

      {items.length === 0 ? (
        <motion.div
          variants={rowMotion}
          className="relative rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-center text-[14px] font-bold text-slate-300 shadow-inner"
        >
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Medal className="h-5 w-5 text-slate-300" />
          </div>

          لا يوجد نتائج مكتملة حتى الآن.
        </motion.div>
      ) : (
        <motion.div variants={sectionMotion} className="relative space-y-2.5">
          {items.map((item) => (
            <motion.div
              key={item.userId}
              variants={rowMotion}
              whileTap={{ scale: 0.99 }}
              className={`relative overflow-hidden rounded-[18px] border p-3 shadow-md shadow-slate-950/20 ${getCardClass(
                item.rank
              )}`}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />

              {item.rank <= 3 && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-10 -top-10 h-24 w-24 rounded-full bg-amber-300/10 blur-2xl"
                />
              )}

              <div className="relative mb-3 flex items-start justify-between gap-2.5">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-base font-black shadow-md ${getRankClass(
                    item.rank
                  )}`}
                >
                  {getRankLabel(item.rank)}
                </div>

                <div className="min-w-0 flex-1 text-right">
                  <div className="text-[10px] font-bold text-slate-400">
                    العضو
                  </div>

                  <div className="mt-0.5 whitespace-normal break-words text-[15px] font-black leading-5 text-white md:text-[16px]">
                    {item.userName}
                  </div>
                </div>
              </div>

              <motion.div
                variants={sectionMotion}
                className="relative grid grid-cols-4 gap-1.5"
              >
                <StatBox
                  label="النتيجة"
                  value={getStatusLabel(item.won)}
                  icon={
                    item.won ? (
                      <Trophy className="h-3.5 w-3.5" />
                    ) : (
                      <Medal className="h-3.5 w-3.5" />
                    )
                  }
                  className={getStatusClass(item.won)}
                />

                <StatBox
                  label="الوقت"
                  value={formatDurationMs(item.durationMs)}
                  icon={<Clock3 className="h-3.5 w-3.5" />}
                  className="border-white/10 bg-white/5 text-white"
                />

                <StatBox
                  label="المحاولات"
                  value={`${item.attemptsUsed}/6`}
                  icon={<ListChecks className="h-3.5 w-3.5" />}
                  className="border-white/10 bg-white/5 text-white"
                />

                <StatBox
                  label="التصنيف"
                  value={item.categoryLabel ?? "عامّة"}
                  icon={<Flame className="h-3.5 w-3.5" />}
                  className="border-emerald-300/15 bg-emerald-400/10 text-emerald-200"
                />
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.section>
  );
}
