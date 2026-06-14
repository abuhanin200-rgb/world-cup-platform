"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  CelebrationPrediction,
  getExactCelebrationsForUser,
} from "@/lib/celebrations";

const STORAGE_PREFIX = "worldcup_2026_exact_celebration_seen_";

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
  return Array.from({ length: 42 }).map((_, index) => {
    const left = (index * 37) % 100;
    const delay = (index % 9) * 0.14;
    const duration = 2.6 + (index % 6) * 0.22;
    const size = 7 + (index % 5);
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

export default function ExactPredictionCelebration() {
  const { user, isLoggedIn, loading } = useAuth();

  const [prediction, setPrediction] = useState<CelebrationPrediction | null>(
    null
  );
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
        });

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

  if (!visible || !prediction) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confettiPieces.map((piece) => (
          <span
            key={piece.id}
            className="celebration-confetti absolute top-[-20px] rounded-sm"
            style={{
              left: `${piece.left}%`,
              width: `${piece.size}px`,
              height: `${piece.size * 1.5}px`,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              transform: `rotate(${piece.rotate}deg)`,
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-amber-300/30 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 p-5 text-center text-white shadow-2xl">
        <div className="absolute -top-16 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="relative">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border border-amber-300/40 bg-amber-300/15 text-5xl shadow-xl">
            🎉
          </div>

          <h2 className="text-2xl font-black text-amber-300">
            جبتها بالملي!
          </h2>

          <p className="mt-2 text-sm leading-7 text-slate-200">
            مبروك يا {prediction.userName || user?.fullName}، توقّعك طلع صحيح
            بالملي وحصلت على 3 نقاط.
          </p>

          <div className="mt-5 rounded-3xl border border-white/10 bg-white/10 p-4">
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-200">
              <span>
                {prediction.homeTeamEmoji} {prediction.homeTeamName}
              </span>

              <span className="rounded-xl bg-slate-950 px-3 py-1 text-lg font-black text-amber-300">
                {prediction.homeScore} - {prediction.awayScore}
              </span>

              <span>
                {prediction.awayTeamName} {prediction.awayTeamEmoji}
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm font-black text-emerald-100">
            +3 نقاط تمت إضافتها لرصيدك ✅
          </div>

          <button
            type="button"
            onClick={closeCelebration}
            className="mt-5 w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300"
          >
            يلا نكمل التحدي
          </button>
        </div>
      </div>

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

        .celebration-confetti {
          animation-name: celebrationFall;
          animation-timing-function: linear;
          animation-iteration-count: 2;
          opacity: 0;
        }

        @keyframes celebrationFall {
          0% {
            transform: translateY(-40px) rotate(0deg);
            opacity: 0;
          }

          10% {
            opacity: 1;
          }

          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}