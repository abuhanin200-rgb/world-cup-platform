"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  BadgeCheck,
  CheckCircle2,
  PartyPopper,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  CelebrationPrediction,
  getExactCelebrationsForUser,
} from "@/lib/celebrations";

const STORAGE_PREFIX = "worldcup_2026_exact_celebration_seen_";

type CelebrationPredictionWithType = CelebrationPrediction & {
  predictionType?: "normal" | "golden";
};

const overlayMotion: Variants = {
  hidden: {
    opacity: 0,
  },
  show: {
    opacity: 1,
    transition: {
      duration: 0.22,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.18,
      ease: "easeIn",
    },
  },
};

const cardMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.92,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.36,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.06,
    },
  },
  exit: {
    opacity: 0,
    y: 18,
    scale: 0.96,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

const itemMotion: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
    scale: 0.98,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.24,
      ease: "easeOut",
    },
  },
};

function getStorageKey(predictionId: string) {
  return `${STORAGE_PREFIX}${predictionId}`;
}

function hasSeenCelebration(predictionId: string) {
  if (typeof window === "undefined") return true;

  return localStorage.getItem(getStorageKey(predictionId)) === "true";
}

function markCelebrationAsSeen(predictionId: string) {
  if (typeof window === "undefined") return;

  localStorage.setItem(getStorageKey(predictionId), "true");
}

function buildConfettiPieces() {
  return Array.from({ length: 58 }).map((_, index) => {
    const left = (index * 37) % 100;
    const delay = (index % 11) * 0.1;
    const duration = 2.8 + (index % 7) * 0.18;
    const size = 6 + (index % 5);
    const rotate = (index * 29) % 360;

    return {
      id: index,
      left,
      delay,
      duration,
      size,
      rotate,
    };
  });
}

function isGoldenPrediction(prediction: CelebrationPredictionWithType) {
  return prediction.predictionType === "golden";
}

export default function ExactPredictionCelebration() {
  const { user, isLoggedIn, loading } = useAuth();

  const [prediction, setPrediction] =
    useState<CelebrationPredictionWithType | null>(null);

  const [visible, setVisible] = useState(false);
  const [checking, setChecking] = useState(false);

  const confettiPieces = useMemo(() => buildConfettiPieces(), []);

  useEffect(() => {
    async function checkCelebration() {
      if (loading || !isLoggedIn || !user?.id || checking) return;

      try {
        setChecking(true);

        const exactPredictions = await getExactCelebrationsForUser(user.id);

        const unseenPrediction = exactPredictions.find((item) => {
          return !hasSeenCelebration(item.id);
        }) as CelebrationPredictionWithType | undefined;

        if (!unseenPrediction) return;

        setPrediction(unseenPrediction);
        setVisible(true);
        markCelebrationAsSeen(unseenPrediction.id);
      } catch (error) {
        console.error("Exact celebration error:", error);
      } finally {
        setChecking(false);
      }
    }

    checkCelebration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isLoggedIn, user?.id]);

  function closeCelebration() {
    setVisible(false);
  }

  if (!prediction) return null;

  const golden = isGoldenPrediction(prediction);
  const points = golden ? 10 : 3;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          dir="rtl"
          variants={overlayMotion}
          initial="hidden"
          animate="show"
          exit="exit"
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-slate-950/85 p-4 backdrop-blur-md"
        >
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            animate={{
              background: golden
                ? [
                    "radial-gradient(circle at 50% 22%, rgba(217,70,239,0.20), transparent 32%), radial-gradient(circle at 15% 85%, rgba(251,191,36,0.16), transparent 30%)",
                    "radial-gradient(circle at 55% 18%, rgba(251,191,36,0.22), transparent 34%), radial-gradient(circle at 85% 80%, rgba(192,38,211,0.16), transparent 28%)",
                    "radial-gradient(circle at 50% 22%, rgba(217,70,239,0.20), transparent 32%), radial-gradient(circle at 15% 85%, rgba(251,191,36,0.16), transparent 30%)",
                  ]
                : [
                    "radial-gradient(circle at 50% 22%, rgba(251,191,36,0.18), transparent 32%), radial-gradient(circle at 15% 85%, rgba(56,189,248,0.14), transparent 30%)",
                    "radial-gradient(circle at 55% 18%, rgba(52,211,153,0.16), transparent 34%), radial-gradient(circle at 85% 80%, rgba(96,165,250,0.13), transparent 28%)",
                    "radial-gradient(circle at 50% 22%, rgba(251,191,36,0.18), transparent 32%), radial-gradient(circle at 15% 85%, rgba(56,189,248,0.14), transparent 30%)",
                  ],
            }}
            transition={{
              duration: 5.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {confettiPieces.map((piece) => (
              <span
                key={piece.id}
                className={`celebration-confetti absolute top-[-24px] rounded-sm ${
                  golden ? "golden-confetti" : ""
                }`}
                style={{
                  left: `${piece.left}%`,
                  width: `${piece.size}px`,
                  height: `${piece.size * 1.45}px`,
                  animationDelay: `${piece.delay}s`,
                  animationDuration: `${piece.duration}s`,
                  transform: `rotate(${piece.rotate}deg)`,
                }}
              />
            ))}
          </div>

          <motion.div
            variants={cardMotion}
            initial="hidden"
            animate="show"
            exit="exit"
            className={`relative w-full max-w-md overflow-hidden rounded-[2rem] p-5 text-center text-white shadow-2xl ${
              golden
                ? "border border-fuchsia-300/45 bg-gradient-to-br from-fuchsia-500/25 via-slate-950 to-amber-500/25 shadow-fuchsia-500/20"
                : "border border-amber-300/30 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 shadow-slate-950/40"
            }`}
          >
            <div
              className={`absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full blur-3xl ${
                golden ? "bg-fuchsia-300/25" : "bg-amber-300/20"
              }`}
            />

            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {golden && (
              <motion.div
                className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-fuchsia-400 via-amber-300 to-yellow-400"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}

            <div className="relative">
              <motion.div
                variants={itemMotion}
                className={`mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border shadow-xl ${
                  golden
                    ? "border-fuchsia-200/60 bg-fuchsia-400/20 text-amber-100 shadow-fuchsia-400/25"
                    : "border-amber-300/40 bg-amber-300/15 text-amber-300"
                }`}
                animate={{
                  scale: [1, 1.08, 1],
                  rotate: golden ? [0, -4, 4, 0] : [0, -3, 3, 0],
                }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {golden ? (
                  <Trophy className="h-10 w-10" />
                ) : (
                  <PartyPopper className="h-10 w-10" />
                )}
              </motion.div>

              {golden && (
                <motion.div
                  variants={itemMotion}
                  className="mx-auto mb-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-fuchsia-200/50 bg-gradient-to-l from-fuchsia-400 via-amber-300 to-yellow-400 px-4 py-1 text-xs font-black text-slate-950 shadow-lg shadow-fuchsia-500/20"
                >
                  <Star className="h-3.5 w-3.5" />
                  <span>السوبر ذهبي</span>
                </motion.div>
              )}

              <motion.h2
                variants={itemMotion}
                className={`text-2xl font-black ${
                  golden ? "text-fuchsia-100" : "text-amber-300"
                }`}
              >
                {golden ? "جبتها سوبر ذهبية بالملي!" : "جبتها بالملي!"}
              </motion.h2>

              <motion.p
                variants={itemMotion}
                className="mt-2 text-sm font-medium leading-7 text-slate-200"
              >
                مبروك يا {prediction.userName || user?.fullName}،{" "}
                {golden
                  ? "توقّعك السوبر ذهبي طلع صحيح بالملي"
                  : "توقّعك طلع صحيح بالملي"}{" "}
                وحصلت على {points} نقاط.
              </motion.p>

              <motion.div
                variants={itemMotion}
                className={`mt-5 overflow-hidden rounded-3xl border p-4 ${
                  golden
                    ? "border-fuchsia-300/30 bg-fuchsia-400/10"
                    : "border-white/10 bg-white/10"
                }`}
              >
                <div className="grid grid-cols-[1fr_74px_1fr] items-center gap-2 text-center">
                  <div className="min-w-0">
                    <div className="text-2xl leading-none">
                      {prediction.homeTeamEmoji}
                    </div>

                    <div className="mt-1 truncate text-xs font-bold text-slate-200">
                      {prediction.homeTeamName}
                    </div>
                  </div>

                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      delay: 0.3,
                      type: "spring",
                      stiffness: 280,
                      damping: 18,
                    }}
                    className={`rounded-2xl px-3 py-2 text-lg font-black shadow-lg ${
                      golden
                        ? "bg-gradient-to-l from-fuchsia-400 via-amber-300 to-yellow-400 text-slate-950 shadow-fuchsia-500/20"
                        : "bg-slate-950 text-amber-300 shadow-slate-950/30"
                    }`}
                  >
                    {prediction.homeScore} - {prediction.awayScore}
                  </motion.div>

                  <div className="min-w-0">
                    <div className="text-2xl leading-none">
                      {prediction.awayTeamEmoji}
                    </div>

                    <div className="mt-1 truncate text-xs font-bold text-slate-200">
                      {prediction.awayTeamName}
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={itemMotion}
                className={`mt-4 rounded-2xl border p-3 text-sm font-black ${
                  golden
                    ? "border-fuchsia-300/30 bg-fuchsia-400/15 text-fuchsia-100"
                    : "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                }`}
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>+{points} نقاط تمت إضافتها لرصيدك</span>
                </span>
              </motion.div>

              <motion.button
                variants={itemMotion}
                type="button"
                onClick={closeCelebration}
                whileTap={{ scale: 0.96 }}
                className={`group relative mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-4 py-3 text-sm font-black text-slate-950 shadow-lg transition ${
                  golden
                    ? "bg-gradient-to-l from-fuchsia-400 via-amber-300 to-yellow-400 shadow-fuchsia-500/20 hover:brightness-110"
                    : "bg-amber-400 shadow-amber-500/20 hover:bg-amber-300"
                }`}
              >
                <span className="pointer-events-none absolute inset-0 translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition duration-700 group-hover:translate-x-[-120%]" />
                <Sparkles className="relative h-4 w-4" />
                <span className="relative">يلا نكمل التحدي</span>
              </motion.button>

              <motion.div
                variants={itemMotion}
                className="mt-3 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400"
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                <span>تم تسجيل الاحتفالية ولن تظهر مرة أخرى لهذا التوقع</span>
              </motion.div>
            </div>
          </motion.div>

          <style jsx>{`
            .celebration-confetti:nth-child(5n + 1) {
              background: #fbbf24;
            }

            .celebration-confetti:nth-child(5n + 2) {
              background: #34d399;
            }

            .celebration-confetti:nth-child(5n + 3) {
              background: #60a5fa;
            }

            .celebration-confetti:nth-child(5n + 4) {
              background: #f472b6;
            }

            .celebration-confetti:nth-child(5n + 5) {
              background: #fb7185;
            }

            .celebration-confetti.golden-confetti:nth-child(5n + 1) {
              background: #fbbf24;
            }

            .celebration-confetti.golden-confetti:nth-child(5n + 2) {
              background: #d946ef;
            }

            .celebration-confetti.golden-confetti:nth-child(5n + 3) {
              background: #fde68a;
            }

            .celebration-confetti.golden-confetti:nth-child(5n + 4) {
              background: #a855f7;
            }

            .celebration-confetti.golden-confetti:nth-child(5n + 5) {
              background: #fff7ed;
            }

            .celebration-confetti {
              animation-name: celebrationFall;
              animation-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1);
              animation-iteration-count: 2;
              opacity: 0;
            }

            @keyframes celebrationFall {
              0% {
                transform: translateY(-50px) rotate(0deg);
                opacity: 0;
              }

              8% {
                opacity: 1;
              }

              70% {
                opacity: 1;
              }

              100% {
                transform: translateY(112vh) rotate(780deg);
                opacity: 0;
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
