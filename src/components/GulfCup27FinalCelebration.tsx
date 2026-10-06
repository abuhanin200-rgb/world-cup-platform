"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Award,
  Check,
  Crown,
  Loader2,
  Medal,
  Share2,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  GULF_CUP_27_TOURNAMENT_ID,
  type TournamentUserStatsV2,
} from "@/domain/tournaments";
import {
  getTournamentLeaderboardV2,
  getTournamentMatchesV2,
} from "@/lib/tournamentV2Firestore";
import { db } from "@/lib/firebase";

const NOTICE_KEY = "gulfCup27FinalCelebrationV1" as const;
const LOCAL_KEY_PREFIX = "altahaddi:gulf27-final-celebration-v1";
const FINAL_MATCH_ID = "g27-final";
const TOURNAMENT_LABEL = "خليجي الديار العربية 27";

type CelebrationContextValue = {
  isAvailable: boolean;
  champion: TournamentUserStatsV2 | null;
  replay: () => void;
};

const CelebrationContext = createContext<CelebrationContextValue | null>(null);

export function useGulfCup27FinalCelebration() {
  const context = useContext(CelebrationContext);
  if (!context) throw new Error("حفل التتويج غير متاح خارج واجهة المنصة");
  return context;
}

const CONFETTI = [
  [7, 10, -18, 0.15], [14, 28, 14, 0.35], [22, 8, -10, 0.05], [31, 19, 18, 0.55],
  [41, 6, -15, 0.2], [51, 16, 12, 0.7], [61, 7, -12, 0.42], [70, 23, 16, 0.1],
  [79, 9, -14, 0.62], [88, 20, 10, 0.28], [94, 7, -8, 0.5], [4, 37, 15, 0.8],
] as const;

function localKey(userId: string) {
  return `${LOCAL_KEY_PREFIX}:${userId}`;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawStat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  label: string,
  value: number,
) {
  roundedRect(ctx, x, y, width, 150, 34);
  ctx.fillStyle = "rgba(255,255,255,.075)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.12)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.direction = "rtl";
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 48px Alexandria, Arial, sans-serif";
  ctx.fillText(String(value), x + width / 2, y + 64);
  ctx.fillStyle = "rgba(255,255,255,.65)";
  ctx.font = "700 25px Alexandria, Arial, sans-serif";
  ctx.fillText(label, x + width / 2, y + 112);
}

async function createChampionCard(champion: TournamentUserStatsV2) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تعذر إنشاء بطاقة التتويج");

  const background = ctx.createLinearGradient(0, 0, 1080, 1350);
  background.addColorStop(0, "#061a4d");
  background.addColorStop(0.58, "#071538");
  background.addColorStop(1, "#020817");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1080, 1350);

  const glow = ctx.createRadialGradient(540, 330, 20, 540, 330, 470);
  glow.addColorStop(0, "rgba(255,194,16,.28)");
  glow.addColorStop(1, "rgba(255,194,16,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 850);

  ctx.strokeStyle = "rgba(255,194,16,.35)";
  ctx.lineWidth = 4;
  roundedRect(ctx, 48, 48, 984, 1254, 54);
  ctx.stroke();

  try {
    const logo = await loadImage("/brand/altahaddi-logo-white.png");
    const ratio = logo.width / logo.height;
    const logoHeight = 112;
    const logoWidth = logoHeight * ratio;
    ctx.drawImage(logo, 540 - logoWidth / 2, 88, logoWidth, logoHeight);
  } catch {
    // البطاقة تبقى صالحة حتى لو تعذر تحميل الشعار.
  }

  ctx.textAlign = "center";
  ctx.direction = "rtl";
  ctx.fillStyle = "#ffc210";
  ctx.font = "900 34px Alexandria, Arial, sans-serif";
  ctx.fillText("لحظة التتويج", 540, 270);

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 46px Alexandria, Arial, sans-serif";
  ctx.fillText(`بطل توقعات ${TOURNAMENT_LABEL}`, 540, 340);

  ctx.font = "900 118px Arial, sans-serif";
  ctx.fillText("🏆", 540, 505);

  ctx.fillStyle = "#ffc210";
  ctx.font = "900 58px Alexandria, Arial, sans-serif";
  ctx.fillText(champion.fullName, 540, 605);

  ctx.fillStyle = "rgba(255,255,255,.72)";
  ctx.font = "800 29px Alexandria, Arial, sans-serif";
  ctx.fillText("المركز الأول في الترتيب النهائي", 540, 657);

  roundedRect(ctx, 315, 700, 450, 118, 42);
  const pointsGradient = ctx.createLinearGradient(315, 700, 765, 818);
  pointsGradient.addColorStop(0, "#ffd85a");
  pointsGradient.addColorStop(1, "#ffc210");
  ctx.fillStyle = pointsGradient;
  ctx.fill();
  ctx.fillStyle = "#04133a";
  ctx.font = "900 48px Alexandria, Arial, sans-serif";
  ctx.fillText(`${champion.points} نقطة`, 540, 774);

  const gap = 22;
  const statWidth = (888 - gap * 2) / 3;
  drawStat(ctx, 96, 875, statWidth, "التوقعات", champion.played);
  drawStat(ctx, 96 + statWidth + gap, 875, statWidth, "بالملي", champion.exact);
  drawStat(ctx, 96 + (statWidth + gap) * 2, 875, statWidth, "فائز صحيح", champion.correctOutcome);

  ctx.fillStyle = "rgba(255,255,255,.82)";
  ctx.font = "800 29px Alexandria, Arial, sans-serif";
  ctx.fillText("قراءة للمباريات · توقعات موفقة · والصدارة من نصيبه", 540, 1105);

  ctx.fillStyle = "rgba(255,255,255,.45)";
  ctx.font = "700 23px Alexandria, Arial, sans-serif";
  ctx.fillText("منصة التحدي · توقعات · بطولات · ألعاب", 540, 1215);
  ctx.fillStyle = "#ffc210";
  ctx.fillRect(420, 1252, 240, 5);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("تعذر تجهيز بطاقة التتويج"));
    }, "image/png", 1);
  });
}

function PodiumMini({ rows }: { rows: TournamentUserStatsV2[] }) {
  const podium = rows.slice(0, 3);
  if (podium.length < 2) return null;
  const order = [podium[1], podium[0], podium[2]].filter(
    (row): row is TournamentUserStatsV2 => Boolean(row),
  );

  return (
    <div className="mt-4 grid grid-cols-3 items-end gap-2" aria-label="منصة الثلاثة الأوائل">
      {order.map((row) => {
        const rank = row.rank || 0;
        const first = rank === 1;
        return (
          <div key={row.userId} className={`rounded-2xl border px-2 py-3 text-center ${first ? "border-amber-300/35 bg-amber-300/10" : "border-white/10 bg-white/[0.045]"}`}>
            <div className={`mx-auto grid rounded-full place-items-center ${first ? "h-10 w-10 bg-amber-300 text-slate-950" : "h-8 w-8 bg-white/10 text-white"}`}>
              {first ? <Crown className="h-5 w-5" /> : <Medal className="h-4 w-4" />}
            </div>
            <div className="mt-2 text-[10px] font-black text-white/50">المركز {rank}</div>
            <div className="mt-1 truncate text-[11px] font-black text-white">{row.fullName}</div>
            <div dir="ltr" className={`mt-1 text-xs font-black tabular-nums ${first ? "text-amber-200" : "text-white/70"}`}>{row.points} نقطة</div>
          </div>
        );
      })}
    </div>
  );
}

export default function GulfCup27FinalCelebration({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<TournamentUserStatsV2[]>([]);
  const [isAvailable, setIsAvailable] = useState(false);
  const [closing, setClosing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  const champion = rows[0] || null;
  const memberRow = useMemo(
    () => rows.find((row) => row.userId === user?.id) || null,
    [rows, user?.id],
  );
  const isChampion = Boolean(champion && user && champion.userId === user.id);

  const noticeSeen = Boolean(user?.seenNotices?.[NOTICE_KEY]);

  useEffect(() => {
    let cancelled = false;
    setIsAvailable(false);
    setRows([]);
    setOpen(false);

    async function checkCelebration() {
      if (authLoading || !user?.id) return;

      try {
        const [matches, leaderboard] = await Promise.all([
          getTournamentMatchesV2(GULF_CUP_27_TOURNAMENT_ID, { fallback: false }),
          getTournamentLeaderboardV2(GULF_CUP_27_TOURNAMENT_ID),
        ]);
        if (cancelled) return;

        const finalMatch = matches.find((match) => match.id === FINAL_MATCH_ID);
        const finalCalculated =
          finalMatch?.status === "finished" &&
          finalMatch.calculationStatus === "calculated" &&
          finalMatch.result.homeScore != null &&
          finalMatch.result.awayScore != null;

        // لا يظهر الزر ولا النافذة قبل احتساب النهائي واعتماد الترتيب.
        if (!finalCalculated || leaderboard.length === 0) return;

        setRows(leaderboard);
        setIsAvailable(true);

        // إغلاق النافذة التلقائية لا يمنع إعادة فتحها يدويًا من الرئيسية.
        if (!noticeSeen && localStorage.getItem(localKey(user.id)) !== "1") {
          setOpen(true);
        }
      } catch (error) {
        console.error("Gulf Cup 27 final celebration check failed:", error);
      }
    }

    void checkCelebration();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, noticeSeen]);

  function replayCelebration() {
    if (!isAvailable || !champion) return;
    setShareMessage("");
    setOpen(true);
  }

  const contextValue: CelebrationContextValue = {
    isAvailable,
    champion: isAvailable ? champion : null,
    replay: replayCelebration,
  };

  async function handleClose() {
    if (!user?.id || closing) return;
    setClosing(true);
    const previouslyDismissed = noticeSeen || localStorage.getItem(localKey(user.id)) === "1";
    localStorage.setItem(localKey(user.id), "1");
    setOpen(false);

    // إعادة مشاهدة الحفل لا تكرر عمليات الكتابة في Firestore.
    if (previouslyDismissed) {
      setClosing(false);
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.id), {
        [`seenNotices.${NOTICE_KEY}`]: true,
        updatedAt: new Date().toISOString(),
      });
      await refreshUser();
    } catch (error) {
      console.error("Gulf Cup 27 celebration dismissal failed:", error);
    } finally {
      setClosing(false);
    }
  }

  async function handleShare() {
    if (!champion || sharing) return;
    setSharing(true);
    setShareMessage("");

    try {
      const blob = await createChampionCard(champion);
      const file = new File([blob], "altahaddi-gulf27-champion.png", { type: "image/png" });
      const text = `🏆 بطل توقعات ${TOURNAMENT_LABEL}\n${champion.fullName}\n${champion.points} نقطة · ${champion.exact} بالملي\nمنصة التحدي`;

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `بطل ${TOURNAMENT_LABEL}`,
          text,
          files: [file],
        });
        setShareMessage("بطاقة التتويج جاهزة للمشاركة عبر واتساب");
        return;
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "altahaddi-gulf27-champion.png";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      setShareMessage("تم حفظ البطاقة وفتح واتساب للمشاركة");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Champion card share failed:", error);
      setShareMessage("تعذر فتح المشاركة الآن، حاول مرة أخرى");
    } finally {
      setSharing(false);
    }
  }

  return (
    <CelebrationContext.Provider value={contextValue}>
      {children}
      <AnimatePresence>
      {open && champion ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-[#020817]/92 px-3 py-[max(18px,env(safe-area-inset-top))] backdrop-blur-xl"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="gulf27-champion-title"
        >
          {!reduceMotion ? (
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              {CONFETTI.map(([left, top, rotate, delay], index) => (
                <motion.span
                  key={`${left}-${top}`}
                  className={`absolute h-2.5 w-1.5 rounded-sm ${index % 3 === 0 ? "bg-emerald-400" : index % 3 === 1 ? "bg-amber-300" : "bg-white"}`}
                  style={{ left: `${left}%`, top: `${top}%` }}
                  initial={{ y: -30, opacity: 0, rotate: 0 }}
                  animate={{ y: [0, 36, 82], opacity: [0, 1, 0], rotate: rotate + 220 }}
                  transition={{ duration: 2.7, delay, repeat: Infinity, repeatDelay: 1.4 }}
                />
              ))}
            </div>
          ) : null}

          <motion.section
            className="relative my-auto w-full max-w-[560px] overflow-hidden rounded-[32px] border border-amber-300/30 bg-gradient-to-b from-[#0b2458] via-[#07183f] to-[#030b20] p-4 text-white shadow-[0_30px_100px_rgba(0,0,0,.65),0_0_70px_rgba(255,194,16,.10)] sm:p-6"
            initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_50%_0%,rgba(255,194,16,.24),transparent_68%)]" />
            <button
              type="button"
              onClick={() => void handleClose()}
              disabled={closing}
              aria-label="إغلاق احتفالية التتويج"
              className="absolute left-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-black/20 text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              {closing ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5" />}
            </button>

            <div className="relative text-center">
              <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black text-amber-100 sm:text-xs">
                <Sparkles className="h-3.5 w-3.5" /> انتهى التحدي.. وحان وقت التتويج
              </div>

              <motion.div
                className="mx-auto mt-4 grid h-20 w-20 place-items-center rounded-full border border-amber-200/30 bg-gradient-to-br from-amber-200 via-[#ffc210] to-amber-500 text-[#04133a] shadow-[0_0_50px_rgba(255,194,16,.28)]"
                animate={reduceMotion ? undefined : { y: [0, -5, 0], rotate: [0, -2, 2, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              >
                <Trophy className="h-10 w-10" strokeWidth={2.4} />
              </motion.div>

              <p className="mt-3 text-[11px] font-black text-amber-200/75">بطل توقعات {TOURNAMENT_LABEL}</p>
              <h2 id="gulf27-champion-title" className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                {isChampion ? "أنت بطل التحدي!" : champion.fullName}
              </h2>
              {isChampion ? <p className="mt-1 text-sm font-black text-amber-200">مبروك يا {champion.fullName} 🏆</p> : null}

              <div className="mx-auto mt-4 grid max-w-[430px] grid-cols-4 gap-1.5">
                <div className="col-span-4 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-3 py-3">
                  <div className="text-[10px] font-bold text-amber-100/65">المركز الأول · المجموع</div>
                  <div dir="ltr" className="mt-0.5 text-3xl font-black tabular-nums text-amber-200">{champion.points} نقطة</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.05] px-1 py-2"><div className="text-[8px] font-bold text-white/45">التوقعات</div><div className="mt-1 text-sm font-black">{champion.played}</div></div>
                <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.07] px-1 py-2"><div className="text-[8px] font-bold text-emerald-100/60">بالملي</div><div className="mt-1 text-sm font-black text-emerald-200">{champion.exact}</div></div>
                <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.07] px-1 py-2"><div className="text-[8px] font-bold text-amber-100/60">فائز</div><div className="mt-1 text-sm font-black text-amber-200">{champion.correctOutcome}</div></div>
                <div className="rounded-xl border border-red-300/15 bg-red-300/[0.06] px-1 py-2"><div className="text-[8px] font-bold text-red-100/55">خطأ</div><div className="mt-1 text-sm font-black text-red-200">{champion.wrong}</div></div>
              </div>

              <p className="mx-auto mt-4 max-w-md text-[11px] font-bold leading-6 text-white/65 sm:text-xs">
                قراءة للمباريات، توقعات موفقة، والصدارة كانت من نصيبه. مبروك بطل خليجي 27.
              </p>

              <PodiumMini rows={rows} />

              {memberRow && !isChampion ? (
                <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2.5 text-[11px] font-black text-emerald-100">
                  <Award className="h-4 w-4" />
                  وأنت أنهيت البطولة في المركز {memberRow.rank} بـ {memberRow.points} نقطة
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void handleShare()}
                disabled={sharing}
                className="mt-4 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 text-sm font-black text-[#041b0c] shadow-lg shadow-emerald-950/20 transition hover:brightness-105 disabled:opacity-60"
              >
                {sharing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Share2 className="h-5 w-5" />}
                {sharing ? "جاري تجهيز البطاقة..." : "مشاركة بطاقة التتويج عبر واتساب"}
              </button>

              {shareMessage ? (
                <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-200">
                  <Check className="h-3.5 w-3.5" /> {shareMessage}
                </div>
              ) : null}

              <a
                href="/tournaments/gulf-cup-27/leaderboard"
                onClick={() => void handleClose()}
                className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-4 text-xs font-black text-white/80 transition hover:bg-white/10"
              >
                <Medal className="h-4 w-4 text-amber-200" /> عرض الترتيب النهائي
              </a>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
      </AnimatePresence>
    </CelebrationContext.Provider>
  );
}
