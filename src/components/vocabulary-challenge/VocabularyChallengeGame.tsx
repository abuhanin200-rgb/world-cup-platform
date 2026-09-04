"use client";

import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Copy,
  Crown,
  DoorOpen,
  Gamepad2,
  Hand,
  Hash,
  History,
  Languages,
  LoaderCircle,
  LogOut,
  Medal,
  Mic,
  MicOff,
  Bot,
  RotateCcw,
  RefreshCw,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Swords,
  Trophy,
  UserCircle2,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import AuthGateCard from "@/components/auth/AuthGateCard";
import {
  VocabularyChallengeApiError,
  cancelVocabularyMatchmaking,
  createVocabularyChallenge,
  drawVocabularyCard,
  getVocabularyDictionaryOverrides,
  getVocabularyLeaderboard,
  matchmakeVocabularyChallenge,
  forfeitVocabularyChallenge,
  joinVocabularyChallenge,
  playVocabularyBotTurn,
  playVocabularyCard,
  processVocabularyTimeout,
  requestVocabularyRematch,
} from "@/lib/vocabularyChallengeClient";
import { playVocabularySound, prepareVocabularyAudio } from "@/lib/vocabularyChallengeAudio";
import { useVocabularyVoiceChat } from "@/lib/useVocabularyVoiceChat";
import { syncPlatformGameXp as syncPlatformGameXpClient } from "@/lib/platformGameXpClient";
import { hasVocabularyMoveWithOverrides } from "@/lib/vocabularyChallengeDictionary";
import type {
  VocabularyChallengeCard,
  VocabularyChallengeHand,
  VocabularyChallengePlayerSummary,
  VocabularyChallengeRoom,
  VocabularyDictionaryClientOverrides,
  VocabularyLeaderboard,
  VocabularyLeaderboardPeriod,
} from "@/types/vocabularyChallenge";

const CARD_TONES = [
  {
    shell: "from-emerald-300 via-emerald-500 to-emerald-700 border-emerald-100/50",
    face: "bg-emerald-950/22",
    accent: "text-emerald-50",
  },
  {
    shell: "from-sky-300 via-cyan-500 to-blue-700 border-sky-100/50",
    face: "bg-sky-950/22",
    accent: "text-sky-50",
  },
  {
    shell: "from-amber-200 via-amber-400 to-orange-600 border-amber-50/55",
    face: "bg-amber-950/18",
    accent: "text-amber-50",
  },
  {
    shell: "from-orange-300 via-orange-500 to-rose-700 border-orange-100/50",
    face: "bg-orange-950/20",
    accent: "text-orange-50",
  },
] as const;

function cardTone(letter: string, index = 0) {
  const code = Array.from(letter)[0]?.codePointAt(0) || 0;
  return CARD_TONES[(code + index) % CARD_TONES.length] || CARD_TONES[0];
}

function formatTimer(milliseconds: number) {
  const safe = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function initial(name: string) {
  return Array.from(name.trim())[0] || "ع";
}

function mapRoom(id: string, data: Record<string, unknown>): VocabularyChallengeRoom {
  return { id, ...(data as Omit<VocabularyChallengeRoom, "id">) };
}

function mapHand(data: Record<string, unknown>): VocabularyChallengeHand {
  return {
    userId: String(data.userId || ""),
    cards: Array.isArray(data.cards) ? data.cards as VocabularyChallengeCard[] : [],
    updatedAt: Number(data.updatedAt || 0),
  };
}

function CardFace({
  letter,
  index = 0,
  size = "hand",
  selected = false,
  disabled = false,
}: {
  letter: string;
  index?: number;
  size?: "hand" | "center" | "mini";
  selected?: boolean;
  disabled?: boolean;
}) {
  const tone = cardTone(letter, index);
  const dimensions = size === "center"
    ? "h-[92px] w-[66px] sm:h-[108px] sm:w-[78px]"
    : size === "mini"
      ? "h-[64px] w-[46px]"
      : "h-[68px] w-[48px] sm:h-[78px] sm:w-[54px]";
  const textSize = size === "center" ? "text-[31px] sm:text-[37px]" : size === "mini" ? "text-xl" : "text-2xl sm:text-[27px]";

  return (
    <div
      className={`relative ${dimensions} overflow-hidden rounded-[15px] border bg-gradient-to-br ${tone.shell} shadow-[0_12px_28px_rgba(0,0,0,.28)] transition ${selected ? "-translate-y-3 ring-2 ring-white/90 ring-offset-2 ring-offset-emerald-950" : ""} ${disabled ? "opacity-45 grayscale-[.25]" : ""}`}
      aria-hidden="true"
    >
      <div className={`absolute inset-[3px] rounded-[12px] border border-white/20 ${tone.face}`} />
      <div className="absolute inset-2 rounded-[10px] border border-white/15" />
      <div className="absolute left-1/2 top-1/2 h-[62%] w-[72%] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[18%] border border-white/20 bg-white/[0.08]" />
      <div className="absolute left-1/2 top-1/2 h-[42%] w-[50%] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[18%] border border-white/25 bg-black/[0.08]" />
      <span className={`absolute right-2 top-1 text-[10px] font-black ${tone.accent}`}>{letter}</span>
      <span className={`absolute inset-0 grid place-items-center font-black drop-shadow-md ${textSize} ${tone.accent}`}>{letter}</span>
    </div>
  );
}

function PlayerBadge({
  player,
  active,
  me = false,
  action = null,
}: {
  player: VocabularyChallengePlayerSummary | null;
  active: boolean;
  me?: boolean;
  action?: ReactNode;
}) {
  const name = player?.userName || (me ? "أنت" : "بانتظار لاعب");
  return (
    <div className="flex items-center gap-2.5">
      <div className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 text-base font-black shadow-lg ${active ? "border-lime-300 bg-emerald-500 text-white shadow-emerald-300/20" : "border-white/15 bg-black/25 text-white/65"}`}>
        {player?.isBot ? <Bot className="h-5 w-5" /> : player ? initial(name) : <UserRound className="h-5 w-5" />}
        {active ? <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-emerald-950 bg-lime-300" /> : null}
      </div>
      <div className="min-w-0">
        <div className="max-w-[170px] truncate text-[11px] font-black text-white/85 sm:text-xs">{name}</div>
        <div className="mt-1 flex items-center gap-1.5">
          <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/25 px-2 py-1 text-[10px] font-black text-white/75">
            <span className="grid h-4 w-4 place-items-center rounded bg-white/10 text-[9px]">▣</span>
            <span dir="ltr">{player?.cardCount ?? "—"}</span>
            <span className="font-semibold text-white/40">بطاقة</span>
          </div>
          {action}
        </div>
      </div>
    </div>
  );
}

function VoiceMicButton({
  enabled,
  supported,
  state,
  onClick,
}: {
  enabled: boolean;
  supported: boolean;
  state: "off" | "connecting" | "connected" | "error" | "unsupported";
  onClick: () => void;
}) {
  const stateRing = state === "connected"
    ? "border-lime-300/60 text-lime-200"
    : state === "connecting"
      ? "border-amber-300/55 text-amber-100 animate-pulse"
      : state === "error"
        ? "border-rose-300/55 text-rose-100"
        : "border-white/12 text-white/55";
  const label = !supported
    ? "المحادثة الصوتية غير مدعومة في هذا المتصفح"
    : enabled
      ? "كتم المايك"
      : "تشغيل المايك";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!supported}
      aria-label={label}
      title={label}
      aria-pressed={enabled}
      className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-lg border bg-black/25 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 ${stateRing}`}
    >
      {enabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      <span className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-emerald-950 ${state === "connected" ? "bg-lime-300" : state === "connecting" ? "bg-amber-300" : state === "error" ? "bg-rose-400" : "bg-white/30"}`} aria-hidden="true" />
    </button>
  );
}

function ModeCard({
  icon,
  title,
  description,
  accent,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  accent: "emerald" | "amber";
  onClick: () => void;
  disabled: boolean;
}) {
  const classes = accent === "emerald"
    ? "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-100 hover:bg-emerald-300/[0.12]"
    : "border-amber-300/25 bg-amber-300/[0.08] text-amber-100 hover:bg-amber-300/[0.12]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group min-h-[160px] rounded-[26px] border p-4 text-right transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55 ${classes}`}
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-black/20">{icon}</span>
      <h3 className="mt-4 text-lg font-black text-white">{title}</h3>
      <p className="mt-1 text-[11px] font-semibold leading-6 text-white/52">{description}</p>
    </button>
  );
}


function LeaderboardPanel({
  data,
  loading,
  error,
  period,
  onPeriodChange,
  onRefresh,
}: {
  data: VocabularyLeaderboard | null;
  loading: boolean;
  error: string;
  period: VocabularyLeaderboardPeriod;
  onPeriodChange: (period: VocabularyLeaderboardPeriod) => void;
  onRefresh: () => void;
}) {
  const entries = data?.entries || [];
  const periodLabel = period === "daily" ? "اليوم" : period === "weekly" ? "الأسبوع" : "الموسم";
  return (
    <div className="relative mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-black/20 p-4 backdrop-blur-xl md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-lime-200"><Crown className="h-4 w-4" /><span className="text-[10px] font-black">منافسة المفردات</span></div>
          <h2 className="mt-1 text-lg font-black text-white">الترتيب</h2>
          <p className="mt-1 text-[10px] font-semibold text-white/42">فوز التحدي 3 نقاط · إنهاء الفردي 2 · التعادل نقطة</p>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading} aria-label={`تحديث ترتيب ${periodLabel}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-white/55 transition hover:text-white disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl border border-white/[0.08] bg-black/15 p-1.5">
        {([['daily','اليومي'],['weekly','الأسبوعي'],['season','الموسمي']] as Array<[VocabularyLeaderboardPeriod,string]>).map(([value,label]) => (
          <button key={value} type="button" onClick={() => onPeriodChange(value)} className={`min-h-10 rounded-xl px-2 text-[10px] font-black transition ${period === value ? "bg-lime-300 text-emerald-950" : "text-white/48 hover:bg-white/[0.05] hover:text-white"}`}>{label}</button>
        ))}
      </div>

      {loading && !data ? (
        <div className="mt-4 flex min-h-[92px] items-center justify-center gap-2 text-xs font-black text-white/45"><LoaderCircle className="h-4 w-4 animate-spin" /> جاري تحميل ترتيب {periodLabel}…</div>
      ) : error && !data ? (
        <div className="mt-4 rounded-2xl border border-rose-200/15 bg-rose-400/[0.06] px-3 py-5 text-center text-xs font-semibold text-rose-100/70">{error}</div>
      ) : entries.length ? (
        <div className="mt-4 grid gap-2">
          {entries.map((entry) => {
            const isMe = data?.me?.userId === entry.userId;
            return (
              <div key={entry.userId} className={`grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border px-3 py-2.5 ${isMe ? "border-lime-200/25 bg-lime-300/[0.10]" : "border-white/[0.08] bg-white/[0.025]"}`}>
                <div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black ${entry.rank === 1 ? "bg-amber-300 text-amber-950" : entry.rank === 2 ? "bg-white/20 text-white" : entry.rank === 3 ? "bg-orange-300/75 text-orange-950" : "bg-black/20 text-white/55"}`}>{entry.rank <= 3 ? <Medal className="h-4 w-4" /> : entry.rank}</div>
                <div className="min-w-0"><div className="truncate text-xs font-black text-white">{entry.userName}{isMe ? <span className="mr-1 text-[9px] text-lime-200">أنت</span> : null}</div><div className="mt-0.5 flex flex-wrap gap-x-2 text-[9px] font-semibold text-white/38"><span>{entry.wins} فوز</span><span>{entry.words} كلمة</span>{entry.streak > 1 ? <span className="text-orange-200">🔥 {entry.streak} متتالية</span> : null}</div></div>
                <div className="text-left"><div className="text-base font-black text-lime-200" dir="ltr">{entry.score}</div><div className="text-[8px] font-bold text-white/35">نقطة</div></div>
              </div>
            );
          })}
          {data?.me && data.me.rank > entries.length ? (
            <div className="mt-1 grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-lime-200/20 bg-lime-300/[0.08] px-3 py-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-black/25 text-xs font-black text-lime-100">{data.me.rank}</div>
              <div className="min-w-0"><div className="truncate text-xs font-black text-white">{data.me.userName} <span className="text-[9px] text-lime-200">أنت</span></div><div className="mt-0.5 text-[9px] font-semibold text-white/38">ترتيبك الحالي خارج العشرة الأوائل</div></div>
              <div className="text-left"><div className="text-base font-black text-lime-200" dir="ltr">{data.me.score}</div><div className="text-[8px] font-bold text-white/35">نقطة</div></div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3 py-5 text-center text-xs font-semibold text-white/42">ما فيه نتائج في هذا الترتيب حتى الآن.</div>
      )}
    </div>
  );
}

export default function VocabularyChallengeGame() {
  const { user, loading, isLoggedIn } = useAuth();
  const reduceMotion = useReducedMotion();
  const [roomId, setRoomId] = useState("");
  const [room, setRoom] = useState<VocabularyChallengeRoom | null>(null);
  const [hand, setHand] = useState<VocabularyChallengeHand | null>(null);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [leaderboard, setLeaderboard] = useState<VocabularyLeaderboard | null>(null);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<VocabularyLeaderboardPeriod>("daily");
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [dictionaryOverrides, setDictionaryOverrides] = useState<VocabularyDictionaryClientOverrides>({ enabledWords: [], disabledWords: [] });
  const [matchmaking, setMatchmaking] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error" | "info">("info");
  const [now, setNow] = useState(Date.now());
  const timeoutKeyRef = useRef("");
  const xpSyncKeyRef = useRef("");
  const matchStartSoundKeyRef = useRef("");
  const turnSoundKeyRef = useRef("");
  const countdownSoundKeyRef = useRef("");
  const resultSoundKeyRef = useRef("");
  const botTurnKeyRef = useRef("");
  const gameArenaRef = useRef<HTMLElement | null>(null);
  const voiceChat = useVocabularyVoiceChat(room, user?.id);

  async function refreshLeaderboard(period = leaderboardPeriod) {
    if (!isLoggedIn || !user) return;
    try {
      setLeaderboardLoading(true);
      setLeaderboardError("");
      setLeaderboard(await getVocabularyLeaderboard(period));
    } catch (error) {
      setLeaderboardError("تعذر تحميل ترتيب المفردات الآن. حاول التحديث بعد قليل.");
      console.warn("Vocabulary leaderboard load failed:", error);
    } finally {
      setLeaderboardLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoggedIn || !user) return;
    void refreshLeaderboard(leaderboardPeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user?.id, leaderboardPeriod]);

  useEffect(() => {
    if (!isLoggedIn || !user) return;
    void getVocabularyDictionaryOverrides().then(setDictionaryOverrides).catch((error) => {
      console.warn("Vocabulary dictionary overrides load failed:", error);
    });
  }, [isLoggedIn, user?.id]);

  useEffect(() => {
    if (!roomId) return;
    const jumpToArena = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      gameArenaRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    };
    jumpToArena();
    const frame = window.requestAnimationFrame(jumpToArena);
    return () => window.cancelAnimationFrame(frame);
  }, [roomId, room?.status]);

  useEffect(() => {
    if (!roomId || !user?.id) return;
    setRoom(null);
    setHand(null);
    const roomUnsubscribe = onSnapshot(
      doc(db, "vocabularyChallengeRooms", roomId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setMessageKind("error");
          setMessage("تعذر العثور على المباراة.");
          return;
        }
        setRoom(mapRoom(snapshot.id, snapshot.data()));
      },
      (error) => {
        console.error("Vocabulary room subscription error:", error);
        setMessageKind("error");
        setMessage("تعذر مزامنة المباراة. انشر قواعد Firestore المرفقة مع هذه النسخة.");
      },
    );
    const handUnsubscribe = onSnapshot(
      doc(db, "vocabularyChallengeRooms", roomId, "hands", user.id),
      (snapshot) => {
        if (snapshot.exists()) setHand(mapHand(snapshot.data()));
      },
      (error) => {
        console.error("Vocabulary hand subscription error:", error);
        setMessageKind("error");
        setMessage("تعذر تحميل بطاقاتك الآن.");
      },
    );
    return () => {
      roomUnsubscribe();
      handUnsubscribe();
    };
  }, [roomId, user?.id]);

  useEffect(() => {
    if (!matchmaking || roomId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const result = await matchmakeVocabularyChallenge();
        if (cancelled) return;
        if (result.roomId) {
          setMatchmaking(false);
          setRoomId(result.roomId);
          setMessage("");
          playVocabularySound("matchStart");
        }
      } catch (error) {
        if (cancelled) return;
        setMatchmaking(false);
        setFeedback("error", error instanceof Error ? error.message : "تعذر البحث عن منافس.");
        playVocabularySound("incorrect");
      }
    };
    void poll();
    const interval = window.setInterval(() => void poll(), 2200);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [matchmaking, roomId]);

  useEffect(() => {
    if (!room?.rematchRoomId || room.rematchRoomId === roomId) return;
    setSelectedCardId("");
    setMessage("");
    setRoomId(room.rematchRoomId);
  }, [room?.rematchRoomId, roomId]);

  useEffect(() => {
    if (room?.status !== "playing") return;
    const interval = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(interval);
  }, [room?.status]);

  useEffect(() => {
    if (!room || room.status !== "playing") return;
    const key = `${room.id}:${room.matchStartedAt || 0}`;
    if (matchStartSoundKeyRef.current === key) return;
    matchStartSoundKeyRef.current = key;
    prepareVocabularyAudio();
    playVocabularySound("matchStart");
  }, [room?.id, room?.matchStartedAt, room?.status]);

  useEffect(() => {
    if (!room || room.status !== "playing" || !user?.id || room.turnPlayerId !== user.id) return;
    if (room.turnStartedAt && room.matchStartedAt && room.turnStartedAt === room.matchStartedAt) return;
    const key = `${room.id}:${room.turnPlayerId}:${room.turnStartedAt || room.turnEndsAt || 0}`;
    if (turnSoundKeyRef.current === key) return;
    turnSoundKeyRef.current = key;
    playVocabularySound("yourTurn");
  }, [room?.id, room?.matchStartedAt, room?.status, room?.turnEndsAt, room?.turnPlayerId, room?.turnStartedAt, user?.id]);

  useEffect(() => {
    if (!room || room.status !== "playing" || !user?.id || room.turnPlayerId !== user.id) return;
    const seconds = Math.max(0, Math.ceil(((room.turnEndsAt || 0) - now) / 1000));
    if (seconds < 1 || seconds > 3) return;
    const key = `${room.id}:${room.turnEndsAt || 0}:${seconds}`;
    if (countdownSoundKeyRef.current === key) return;
    countdownSoundKeyRef.current = key;
    playVocabularySound(seconds === 1 ? "countdownFinal" : "countdownTick", { vibrate: seconds === 1 });
  }, [now, room?.id, room?.status, room?.turnEndsAt, room?.turnPlayerId, user?.id]);

  useEffect(() => {
    if (!room || room.status !== "finished" || !user?.id) return;
    const key = `${room.id}:${room.updatedAt}:${room.winnerId || "draw"}`;
    if (resultSoundKeyRef.current === key) return;
    resultSoundKeyRef.current = key;

    if (room.mode === "duel" && !room.winnerId) {
      playVocabularySound("drawResult");
    } else if (room.winnerId === user.id) {
      playVocabularySound("win");
    } else {
      playVocabularySound("lose");
    }
  }, [room?.id, room?.mode, room?.status, room?.updatedAt, room?.winnerId, user?.id]);

  useEffect(() => {
    if (!room || !user?.id || room.mode !== "solo" || room.status !== "playing" || room.turnPlayerId !== "vocabulary-bot") return;
    const key = `${room.id}:${room.turnStartedAt || room.updatedAt}`;
    if (botTurnKeyRef.current === key) return;
    botTurnKeyRef.current = key;
    const delay = window.setTimeout(() => {
      void playVocabularyBotTurn(room.id).catch((error) => {
        if (error instanceof VocabularyChallengeApiError && ["NOT_YOUR_TURN", "GAME_NOT_PLAYING"].includes(error.code)) return;
        botTurnKeyRef.current = "";
        console.warn("Vocabulary bot turn failed:", error);
      });
    }, reduceMotion ? 350 : 850);
    return () => window.clearTimeout(delay);
  }, [reduceMotion, room, user?.id]);

  useEffect(() => {
    if (!roomId || !room || room.status !== "playing") return;
    const dueAt = Math.min(
      room.turnEndsAt || Number.MAX_SAFE_INTEGER,
      room.matchEndsAt || Number.MAX_SAFE_INTEGER,
    );
    if (!Number.isFinite(dueAt) || now < dueAt) return;
    const key = `${room.id}:${room.turnEndsAt}:${room.matchEndsAt}`;
    if (timeoutKeyRef.current === key) return;
    timeoutKeyRef.current = key;
    void processVocabularyTimeout(roomId).catch((error) => {
      if (error instanceof VocabularyChallengeApiError && error.code === "GAME_NOT_PLAYING") return;
      console.warn("Vocabulary timeout processing failed:", error);
    });
  }, [now, room, roomId]);

  useEffect(() => {
    if (!room || room.status !== "finished" || !user?.id) return;
    const sourceResultId = room.resultIds?.[user.id];
    if (!sourceResultId) return;
    const key = `${room.id}:${sourceResultId}`;
    if (xpSyncKeyRef.current === key) return;
    xpSyncKeyRef.current = key;
    void syncPlatformGameXpClient({ gameId: "vocabulary", sourceResultId }).catch((error) => {
      xpSyncKeyRef.current = "";
      console.warn("Vocabulary XP fallback sync failed:", error);
    });
  }, [room, user?.id]);

  useEffect(() => {
    if (room?.status !== "finished") return;
    void refreshLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status, room?.id]);

  const me = user?.id && room?.players ? room.players[user.id] || null : null;
  const opponent = useMemo(() => {
    if (!room || !user?.id) return null;
    const id = room.playerOrder.find((playerId) => playerId !== user.id) || "";
    return id ? room.players[id] || null : null;
  }, [room, user?.id]);
  const isMyTurn = Boolean(room && user?.id && room.turnPlayerId === user.id);
  const turnRemainingMs = room?.turnEndsAt ? Math.max(0, room.turnEndsAt - now) : 0;
  const matchRemainingMs = room?.matchEndsAt ? Math.max(0, room.matchEndsAt - now) : 0;
  const turnSeconds = Math.max(0, Math.ceil(turnRemainingMs / 1000));
  const turnProgress = room?.turnDurationMs ? Math.min(100, Math.max(0, (turnRemainingMs / room.turnDurationMs) * 100)) : 0;
  const selectedCard = hand?.cards.find((card) => card.id === selectedCardId) || null;
  const canPlay = Boolean(room?.status === "playing" && isMyTurn && hand && !busy && turnRemainingMs > 0);
  const hasLegalMove = Boolean(room && hand && hasVocabularyMoveWithOverrides(room.currentWord, hand.cards.map((card) => card.letter), dictionaryOverrides));
  const canDraw = canPlay && !hasLegalMove;

  function setFeedback(kind: "success" | "error" | "info", text: string) {
    setMessageKind(kind);
    setMessage(text);
  }

  async function handleCreate(mode: "solo" | "duel") {
    try {
      prepareVocabularyAudio();
      playVocabularySound("cardSelect");
      setBusy(true);
      setMessage("");
      const result = await createVocabularyChallenge(mode);
      if (!result.roomId) throw new Error("تعذر إنشاء المباراة.");
      setRoomId(result.roomId);
      setSelectedCardId("");
      // Match-start audio is triggered when the room enters the playing state.
    } catch (error) {
      setFeedback("error", error instanceof Error ? error.message : "تعذر إنشاء المباراة.");
      playVocabularySound("incorrect");
    } finally {
      setBusy(false);
    }
  }

  async function handleMatchmaking() {
    prepareVocabularyAudio();
    setMessage("");
    setMatchmaking(true);
    playVocabularySound("cardSelect");
  }

  async function handleCancelMatchmaking() {
    setMatchmaking(false);
    await cancelVocabularyMatchmaking().catch(() => undefined);
    setFeedback("info", "تم إيقاف البحث عن منافس.");
  }

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    if (joinCode.replace(/\D/g, "").length !== 6) {
      setFeedback("error", "أدخل كود الغرفة المكوّن من 6 أرقام.");
      prepareVocabularyAudio();
      playVocabularySound("incorrect");
      return;
    }
    try {
      prepareVocabularyAudio();
      playVocabularySound("cardSelect");
      setBusy(true);
      setMessage("");
      const result = await joinVocabularyChallenge(joinCode);
      if (!result.roomId) throw new Error("تعذر الانضمام إلى الغرفة.");
      setRoomId(result.roomId);
      setSelectedCardId("");
      // Match-start audio is triggered for both players when play begins.
    } catch (error) {
      setFeedback("error", error instanceof Error ? error.message : "تعذر الانضمام إلى الغرفة.");
      playVocabularySound("incorrect");
    } finally {
      setBusy(false);
    }
  }

  async function handlePosition(position: number) {
    if (!room || !selectedCard || !canPlay) return;
    try {
      prepareVocabularyAudio();
      playVocabularySound("cardPlace");
      setBusy(true);
      const result = await playVocabularyCard(room.id, selectedCard.id, position);
      if (result.finished && !result.validWord) {
        setFeedback("info", "انتهى وقت المباراة وتم اعتماد النتيجة.");
      } else if (result.validWord) {
        setFeedback("success", `${result.validWord} — كلمة صحيحة ✓`);
        playVocabularySound("correct");
      }
      setSelectedCardId("");
    } catch (error) {
      const apiError = error instanceof VocabularyChallengeApiError ? error : null;
      setFeedback("error", error instanceof Error ? error.message : "تعذر تنفيذ الحركة.");
      playVocabularySound(apiError?.code === "TURN_EXPIRED" ? "countdownFinal" : "incorrect");
      if (apiError?.code === "TURN_EXPIRED") {
        void processVocabularyTimeout(room.id).catch(() => undefined);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDraw() {
    if (!room || !canPlay) return;
    try {
      setBusy(true);
      setMessage("");
      await drawVocabularyCard(room.id);
      setSelectedCardId("");
      setFeedback("info", room.mode === "duel" ? "سحبت بطاقة جديدة وانتقل الدور." : "سحبت بطاقة جديدة. حاول فتح مسار جديد.");
      playVocabularySound("drawCard");
    } catch (error) {
      setFeedback("error", error instanceof Error ? error.message : "تعذر سحب بطاقة.");
      playVocabularySound("incorrect");
    } finally {
      setBusy(false);
    }
  }

  async function handleForfeit() {
    if (!room) return;
    const label = room.status === "waiting" ? "إلغاء الغرفة" : room.mode === "duel" ? "الانسحاب من المباراة" : "إنهاء التحدي";
    if (!window.confirm(`هل تريد ${label}؟`)) return;
    try {
      setBusy(true);
      await forfeitVocabularyChallenge(room.id);
      playVocabularySound("cardSelect");
    } catch (error) {
      setFeedback("error", error instanceof Error ? error.message : "تعذر إنهاء المباراة.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRematch() {
    if (!room || busy) return;
    try {
      prepareVocabularyAudio();
      setBusy(true);
      const result = await requestVocabularyRematch(room.id);
      if (result.roomId) {
        setSelectedCardId("");
        setMessage("");
        setRoomId(result.roomId);
        playVocabularySound("matchStart");
      } else if (result.rematchWaiting) {
        setFeedback("info", "تم إرسال طلب الإعادة للخصم. بانتظار موافقته.");
        playVocabularySound("cardSelect", { vibrate: false });
      }
    } catch (error) {
      setFeedback("error", error instanceof Error ? error.message : "تعذر بدء إعادة المباراة.");
      playVocabularySound("incorrect");
    } finally {
      setBusy(false);
    }
  }

  function resetToMenu() {
    setRoomId("");
    setRoom(null);
    setHand(null);
    setSelectedCardId("");
    setMessage("");
    setJoinCode("");
    setMatchmaking(false);
    timeoutKeyRef.current = "";
    xpSyncKeyRef.current = "";
    matchStartSoundKeyRef.current = "";
    turnSoundKeyRef.current = "";
    countdownSoundKeyRef.current = "";
    resultSoundKeyRef.current = "";
    botTurnKeyRef.current = "";
    setNow(Date.now());
  }

  async function copyRoomCode() {
    if (!room?.roomCode) return;
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setFeedback("success", "تم نسخ كود الغرفة.");
      playVocabularySound("cardSelect", { vibrate: false });
    } catch {
      setFeedback("info", `كود الغرفة: ${room.roomCode}`);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto grid min-h-[420px] max-w-5xl place-items-center px-3 py-8">
        <div className="flex items-center gap-2 text-sm font-black text-white/55"><LoaderCircle className="h-5 w-5 animate-spin" /> جاري تجهيز تحدي المفردات…</div>
      </main>
    );
  }

  if (!isLoggedIn || !user) {
    return (
      <main className="mx-auto max-w-4xl px-3 py-6 sm:px-4 md:py-10">
        <Link href="/games" className="mb-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-white/60"><ArrowRight className="h-4 w-4" /> الألعاب</Link>
        <AuthGateCard
          returnTo="/vocabulary-challenge"
          title="سجّل الدخول لتحدي المفردات"
          description="كوّن كلمة صحيحة بتغيير حرف واحد، وتخلّص من بطاقاتك قبل انتهاء الوقت."
          benefit="يمكنك اللعب فرديًا أو إنشاء غرفة ومنافسة عضو آخر مباشرة."
        />
      </main>
    );
  }

  const cancelled = room?.status === "cancelled";
  const finished = room?.status === "finished";
  const didWin = Boolean(finished && room?.winnerId === user.id);
  const isDraw = Boolean(finished && !room?.winnerId);
  const didLose = Boolean(finished && room?.winnerId && room.winnerId !== user.id);
  const estimatedXp = room?.mode === "solo"
    ? (didWin ? Math.max(14, Math.min(28, 28 - (me?.draws || 0) * 2)) : 3)
    : (didWin ? 35 : isDraw ? 8 : 6);
  const finishLeaderboardLabel = leaderboardPeriod === "daily" ? "اليومي" : leaderboardPeriod === "weekly" ? "الأسبوعي" : "الموسمي";
  const rematchRequestedByMe = Boolean(room?.mode === "duel" && room?.rematchRequestedBy === user.id);
  const rematchRequestedByOpponent = Boolean(room?.mode === "duel" && room?.rematchRequestedBy && room.rematchRequestedBy !== user.id);

  return (
    <main dir="rtl" className="relative mx-auto max-w-7xl overflow-hidden px-3 pb-16 pt-3 sm:px-4 md:px-6 md:pb-20 md:pt-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[760px] bg-[radial-gradient(circle_at_20%_10%,rgba(52,211,153,.12),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(16,185,129,.10),transparent_30%)]" />

      <div className="mb-3 flex items-center justify-between gap-2">
        <Link href="/games" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-white/60 transition hover:bg-white/[0.07] hover:text-white"><ArrowRight className="h-4 w-4" /> الألعاب</Link>
        {room?.status === "waiting" ? (
          <button type="button" onClick={handleForfeit} disabled={busy || cancelled} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-red-200/10 bg-red-400/[0.055] px-3 text-[11px] font-black text-red-100/70 disabled:opacity-35"><LogOut className="h-4 w-4" /> إلغاء الغرفة</button>
        ) : !room ? (
          <div className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-emerald-200/10 bg-emerald-300/[0.05] px-3 text-[10px] font-black text-emerald-100/70"><ShieldCheck className="h-3.5 w-3.5" /> كلمات عربية معتمدة</div>
        ) : <span aria-hidden="true" />}
      </div>

      {!roomId ? (
        <section className="relative overflow-hidden rounded-[34px] border border-emerald-200/15 bg-[linear-gradient(155deg,#073c34_0%,#075640_46%,#063a32_100%)] p-4 shadow-[0_28px_90px_rgba(0,0,0,.32)] md:p-7">
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_50%_50%,rgba(255,255,255,.10)_0_1px,transparent_1.5px),linear-gradient(30deg,transparent_48%,rgba(255,255,255,.05)_49%_51%,transparent_52%),linear-gradient(-30deg,transparent_48%,rgba(255,255,255,.045)_49%_51%,transparent_52%)] [background-size:26px_26px,52px_45px,52px_45px]" />
          <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[80%] -translate-x-1/2 rounded-[50%] border border-emerald-100/10 bg-emerald-100/[0.025]" />

          <div className="relative grid gap-7 lg:grid-cols-[1fr_410px] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-lime-200/20 bg-lime-300/[0.08] px-3 py-1.5 text-[10px] font-black text-lime-100"><Languages className="h-4 w-4" /> لعبة لغوية تنافسية</div>
              <h1 className="mt-4 text-3xl font-black leading-[1.35] text-white md:text-5xl">تحدي المفردات</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-emerald-50/58 md:text-base">غيّر حرفًا واحدًا فقط من الكلمة الموجودة في الوسط لتصنع كلمة عربية صحيحة، وتخلّص من بطاقاتك قبل انتهاء الوقت.</p>

              <div className="mt-6 flex items-center gap-2" dir="rtl" aria-label="مثال على طريقة اللعب">
                {Array.from("ميم").map((letter, index) => <CardFace key={`${letter}-${index}`} letter={letter} index={index} size="mini" />)}
                <span className="mx-1 text-xl font-black text-lime-200">+</span>
                <CardFace letter="ر" index={3} size="mini" />
                <span className="mx-1 text-xl font-black text-lime-200">←</span>
                <div className="rounded-2xl border border-lime-200/20 bg-lime-300/[0.08] px-3 py-2 text-sm font-black text-lime-100">ريم ✓</div>
              </div>

              <div className="mt-6 grid max-w-xl grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl border border-white/10 bg-black/15 p-3"><Clock3 className="mx-auto h-4 w-4 text-lime-200" /><div className="mt-2 text-sm font-black">10 ثوانٍ</div><div className="mt-1 text-[9px] font-semibold text-white/38">لكل دور</div></div>
                <div className="rounded-2xl border border-white/10 bg-black/15 p-3"><Hand className="mx-auto h-4 w-4 text-lime-200" /><div className="mt-2 text-sm font-black">10 بطاقات</div><div className="mt-1 text-[9px] font-semibold text-white/38">عند البداية</div></div>
                <div className="rounded-2xl border border-white/10 bg-black/15 p-3"><Trophy className="mx-auto h-4 w-4 text-lime-200" /><div className="mt-2 text-sm font-black">أول من يخلّصها</div><div className="mt-1 text-[9px] font-semibold text-white/38">يفوز</div></div>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-black/20 p-4 backdrop-blur-xl md:p-5">
              <div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-black text-lime-200">اختر نمط اللعب</p><h2 className="mt-1 text-xl font-black">كيف تبي تلعب؟</h2></div><Gamepad2 className="h-6 w-6 text-lime-200" /></div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <ModeCard icon={<Bot className="h-5 w-5" />} title="العب بمفردك" description="واجه بوت التحدي الذكي وتخلّص من بطاقاتك قبله خلال 5 دقائق." accent="emerald" onClick={() => handleCreate("solo")} disabled={busy || matchmaking} />
                <ModeCard icon={<Swords className="h-5 w-5" />} title="لاعب ضد لاعب" description="أنشئ غرفة خاصة أو واجه خصمًا أونلاين، وأول من يتخلّص من بطاقاته يفوز." accent="amber" onClick={() => handleCreate("duel")} disabled={busy || matchmaking} />
              </div>

              <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-2 rounded-[22px] border border-cyan-200/15 bg-cyan-300/[0.055] p-3">
                <div className="min-w-0"><div className="flex items-center gap-2 text-xs font-black text-cyan-100"><Shuffle className="h-4 w-4" /> خصم عشوائي أونلاين</div><p className="mt-1 text-[10px] font-semibold leading-5 text-white/45">النظام يبحث لك عن عضو متاح ويبدأ المباراة تلقائيًا.</p></div>
                {matchmaking ? <button type="button" onClick={() => void handleCancelMatchmaking()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200/15 bg-rose-400/[0.08] px-3 text-[10px] font-black text-rose-100"><LoaderCircle className="h-4 w-4 animate-spin" /> إلغاء</button> : <button type="button" onClick={() => void handleMatchmaking()} disabled={busy} className="min-h-11 rounded-xl bg-cyan-200 px-3 text-[10px] font-black text-cyan-950 disabled:opacity-40">ابحث الآن</button>}
              </div>

              <form onSubmit={handleJoin} className="mt-3 rounded-[22px] border border-white/10 bg-white/[0.035] p-3">
                <label htmlFor="vocabulary-room-code" className="flex items-center gap-1.5 text-[10px] font-black text-white/55"><Hash className="h-3.5 w-3.5" /> عندك كود غرفة؟</label>
                <div className="mt-2 flex gap-2">
                  <input id="vocabulary-room-code" value={joinCode} onChange={(event) => setJoinCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" dir="ltr" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-center text-base font-black tracking-[.25em] text-white outline-none placeholder:text-white/20 focus:border-lime-300/50" />
                  <button type="submit" disabled={busy || joinCode.length !== 6} className="min-w-[88px] rounded-xl bg-lime-300 px-3 text-xs font-black text-emerald-950 transition disabled:opacity-45">انضم</button>
                </div>
              </form>

              <div className="mt-3 flex items-start gap-2 rounded-2xl border border-emerald-200/10 bg-emerald-300/[0.045] p-3 text-[10px] font-semibold leading-5 text-emerald-50/55"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-lime-200" /><span>بدّل حرفًا واحدًا ببطاقة من يدك لتصنع كلمة صحيحة من 3 أحرف. أول من يتخلّص من بطاقاته يفوز.</span></div>
              <Link href="/vocabulary-challenge/profile" className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-[10px] font-black text-white/65 transition hover:bg-white/[0.07] hover:text-white"><UserCircle2 className="h-4 w-4" /> ملفي في تحدي المفردات والإنجازات</Link>
            </div>
          </div>

          <LeaderboardPanel data={leaderboard} loading={leaderboardLoading} error={leaderboardError} period={leaderboardPeriod} onPeriodChange={setLeaderboardPeriod} onRefresh={() => void refreshLeaderboard(leaderboardPeriod)} />

          {message ? <div role="alert" className={`relative mt-4 rounded-2xl border px-3 py-2.5 text-xs font-bold ${messageKind === "error" ? "border-red-300/20 bg-red-400/[0.08] text-red-100" : messageKind === "success" ? "border-lime-300/20 bg-lime-300/[0.08] text-lime-100" : "border-white/10 bg-white/[0.04] text-white/70"}`}>{message}</div> : null}
        </section>
      ) : !room || !hand ? (
        <section className="grid min-h-[520px] place-items-center rounded-[34px] border border-emerald-200/12 bg-[#063f35]">
          <div className="text-center"><LoaderCircle className="mx-auto h-7 w-7 animate-spin text-lime-200" /><p className="mt-3 text-sm font-black text-white/65">جاري مزامنة المباراة…</p>{message ? <p className="mt-2 max-w-md text-xs font-semibold text-red-100/80">{message}</p> : null}</div>
        </section>
      ) : cancelled ? (
        <section className="grid min-h-[430px] place-items-center rounded-[34px] border border-white/10 bg-[#063f35] p-6 text-center">
          <div><DoorOpen className="mx-auto h-10 w-10 text-white/35" /><h1 className="mt-4 text-2xl font-black">تم إلغاء المباراة</h1><button type="button" onClick={resetToMenu} className="mt-5 inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-lime-300 px-5 text-sm font-black text-emerald-950"><RotateCcw className="h-4 w-4" /> تحدٍ جديد</button></div>
        </section>
      ) : room.status === "waiting" ? (
        <section className="relative overflow-hidden rounded-[34px] border border-emerald-200/15 bg-[linear-gradient(155deg,#073c34,#075c42_54%,#06362f)] p-5 text-center shadow-[0_28px_90px_rgba(0,0,0,.30)] md:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_50%_50%,rgba(255,255,255,.12)_0_1px,transparent_1.5px)] [background-size:22px_22px]" />
          <div className="relative mx-auto max-w-xl">
            <motion.div animate={reduceMotion ? undefined : { scale: [1, 1.05, 1] }} transition={{ duration: 2.2, repeat: Infinity }} className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-lime-200/20 bg-lime-300/[0.09]"><UsersRound className="h-8 w-8 text-lime-200" /></motion.div>
            <h1 className="mt-5 text-2xl font-black md:text-3xl">بانتظار اللاعب الثاني</h1>
            <p className="mt-2 text-sm font-semibold text-emerald-50/50">أرسل له كود الغرفة، وتبدأ المباراة تلقائيًا بعد دخوله.</p>
            <button type="button" onClick={copyRoomCode} className="mx-auto mt-6 flex min-h-[74px] min-w-[230px] items-center justify-center gap-3 rounded-[22px] border border-lime-200/20 bg-black/20 px-5 text-lime-100 shadow-inner">
              <span dir="ltr" className="text-3xl font-black tracking-[.22em]">{room.roomCode}</span><Copy className="h-5 w-5" />
            </button>
            <div className="mt-6 flex justify-center"><PlayerBadge player={me} active={false} me /></div>
            {message ? <div aria-live="polite" className="mt-4 text-xs font-bold text-lime-100/80">{message}</div> : null}
          </div>
        </section>
      ) : (
        <section ref={gameArenaRef} onPointerDown={() => voiceChat.unlockAudio()} className="relative mx-auto max-w-[620px] scroll-mt-2 overflow-hidden rounded-[30px] border border-emerald-100/20 bg-[linear-gradient(180deg,#064638_0%,#0b8060_38%,#086249_64%,#043b32_100%)] shadow-[0_28px_90px_rgba(0,0,0,.40)]">
          <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_50%_50%,rgba(255,255,255,.11)_0_1px,transparent_1.4px),linear-gradient(30deg,transparent_48%,rgba(255,255,255,.06)_49%_51%,transparent_52%),linear-gradient(-30deg,transparent_48%,rgba(255,255,255,.05)_49%_51%,transparent_52%)] [background-size:24px_24px,48px_42px,48px_42px]" />
          <div className="pointer-events-none absolute inset-x-[8%] -top-48 h-[330px] rounded-[50%] border-[2px] border-emerald-100/14 bg-black/[0.06]" />

          <div className="relative min-h-[520px] px-3 pb-3 pt-2.5 sm:min-h-[590px] sm:px-4 sm:pb-4 sm:pt-3">
            <div className="grid grid-cols-[58px_minmax(0,1fr)_58px_48px] items-center gap-1.5 sm:gap-2">
              <div className={`relative grid h-[58px] w-[58px] place-items-center rounded-full border-[3px] bg-black/45 shadow-[0_8px_24px_rgba(0,0,0,.25)] ${isMyTurn ? "border-lime-300/70" : "border-white/15"}`}>
                <svg className="absolute inset-[-4px] h-[62px] w-[62px] -rotate-90" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="31" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="4" /><circle cx="36" cy="36" r="31" fill="none" stroke={turnSeconds <= 3 ? "#fb7185" : "#bef264"} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${194.8 * turnProgress / 100} 194.8`} /></svg>
                <span dir="ltr" className={`relative text-lg font-black ${turnSeconds <= 3 ? "text-rose-200" : "text-lime-200"}`}>{turnSeconds}s</span>
              </div>

              <div className="mx-auto min-w-0 rounded-2xl border border-white/12 bg-black/22 px-5 py-2 text-center shadow-inner">
                <div className="text-[8px] font-black text-white/38">وقت المباراة</div>
                <div dir="ltr" className="mt-0.5 font-mono text-2xl font-black tracking-wider text-emerald-50 sm:text-[28px]">{formatTimer(matchRemainingMs)}</div>
              </div>

              <div className={`grid h-[58px] w-[58px] place-items-center rounded-2xl border text-center ${isMyTurn ? "border-lime-200/20 bg-lime-300/[0.10]" : "border-white/10 bg-black/18"}`}>
                <div><div className="text-base font-black text-white">{me?.cardCount ?? hand.cards.length}</div><div className="text-[8px] font-bold text-white/38">بطاقاتك</div></div>
              </div>

              <button
                type="button"
                onClick={handleForfeit}
                disabled={busy || finished || cancelled}
                aria-label={room.mode === "duel" ? "الانسحاب من المباراة" : "إنهاء التحدي"}
                title={room.mode === "duel" ? "الانسحاب من المباراة" : "إنهاء التحدي"}
                className="flex h-[58px] w-12 flex-col items-center justify-center gap-1 rounded-xl border border-rose-200/15 bg-rose-400/[0.08] text-rose-100/75 transition active:scale-95 disabled:opacity-30"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-[7px] font-black">إنهاء</span>
              </button>
            </div>

            <div className="mt-2 flex min-h-[54px] items-center justify-center">
              <PlayerBadge player={opponent} active={Boolean(opponent && room.turnPlayerId === opponent.userId)} />
            </div>

            {room.mode === "solo" ? (
              <div className="mx-auto mt-1 flex w-fit items-center gap-1.5 rounded-full border border-cyan-200/12 bg-cyan-300/[0.06] px-3 py-1 text-[8px] font-black text-cyan-100/70"><Bot className="h-3 w-3" /> البوت يختار حركاته بدون الاطلاع على بطاقاتك</div>
            ) : null}

            <div className={`mx-auto mt-1 w-fit rounded-full border px-3 py-1 text-[9px] font-black ${isMyTurn ? "border-lime-200/20 bg-lime-300/[0.11] text-lime-100" : "border-white/10 bg-black/15 text-white/52"}`}>{isMyTurn ? "حان دورك الآن" : room.mode === "duel" ? "دور الخصم" : "دور بوت التحدي"}</div>

            <div className="mt-2.5 flex items-center justify-center gap-2.5 sm:gap-3.5" dir="rtl">
              {Array.from(room.currentWord).map((letter, index) => (
                <button key={`${room.currentWord}-${index}`} type="button" disabled={!canPlay || !selectedCard} onClick={() => handlePosition(index)} aria-label={selectedCard ? `استبدال الحرف ${letter} بالحرف ${selectedCard.letter}` : `الحرف ${letter}`} className="relative min-h-0 min-w-0 rounded-[17px] disabled:cursor-default">
                  <CardFace letter={letter} index={index} size="center" />
                  {selectedCard && canPlay ? <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-lime-200/20 bg-emerald-950 px-2 py-0.5 text-[8px] font-black text-lime-200">ضع هنا</span> : null}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={`${messageKind}-${message || room.lastMove?.at || "idle"}`} initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -4 }} className="mx-auto mt-2.5 min-h-[36px] max-w-md">
                {message ? (
                  <div aria-live="polite" className={`flex min-h-[36px] items-center justify-center gap-2 rounded-xl border px-3 text-center text-[11px] font-black shadow-lg ${messageKind === "success" ? "border-lime-200/25 bg-lime-300/20 text-lime-50" : messageKind === "error" ? "border-rose-200/25 bg-rose-500/28 text-rose-50" : "border-white/10 bg-black/22 text-white/70"}`}>
                    {messageKind === "success" ? <CheckCircle2 className="h-4 w-4" /> : messageKind === "error" ? <XCircle className="h-4 w-4" /> : <CircleHelp className="h-4 w-4" />}{message}
                  </div>
                ) : room.lastMove ? (
                  <div className="flex min-h-[36px] items-center justify-center gap-2 rounded-xl border border-lime-200/18 bg-lime-300/[0.13] px-3 text-[11px] font-black text-lime-50"><CheckCircle2 className="h-4 w-4" /> {room.lastMove.afterWord}</div>
                ) : (
                  <div className="flex min-h-[36px] items-center justify-center text-[9px] font-semibold text-white/38">اختر بطاقة ثم اضغط على الحرف الذي تريد استبداله.</div>
                )}
              </motion.div>
            </AnimatePresence>

            {room.recentMoves?.length ? (
              <div className="mx-auto mt-2 flex max-w-full items-center justify-center gap-1.5 overflow-x-auto px-1 pb-1 hidden-scrollbar" dir="rtl" aria-label="آخر الكلمات">
                <History className="h-3.5 w-3.5 shrink-0 text-white/35" />
                {room.recentMoves.slice(-5).map((move, index) => <span key={`${move.at}-${index}`} className={`shrink-0 rounded-lg border px-2 py-1 text-[9px] font-black ${index === room.recentMoves!.slice(-5).length - 1 ? "border-lime-200/20 bg-lime-300/[0.10] text-lime-100" : "border-white/[0.08] bg-black/14 text-white/42"}`}>{move.afterWord}</span>)}
              </div>
            ) : null}

            <div className="mt-2.5 flex items-end justify-between gap-3">
              <button type="button" onClick={handleDraw} disabled={!canDraw} className="group flex w-[70px] shrink-0 flex-col items-center gap-1 disabled:opacity-35" title={hasLegalMove ? "لا يمكن السحب لأن لديك حركة صحيحة" : "اسحب بطاقة عند عدم وجود حركة صحيحة"}>
                <div className="relative h-[52px] w-[47px]" aria-hidden="true"><div className="absolute inset-0 translate-x-2 translate-y-2 rotate-6 rounded-lg border border-white/15 bg-[#173f38]" /><div className="absolute inset-0 translate-x-1 translate-y-1 rotate-3 rounded-lg border border-white/15 bg-[#1b4b41]" /><div className="absolute inset-0 grid place-items-center rounded-lg border border-white/20 bg-[linear-gradient(145deg,#173f38,#0c2926)] shadow-[0_8px_18px_rgba(0,0,0,.3)]"><Sparkles className="h-4 w-4 text-amber-200/70" /></div></div>
                <span className="text-[8px] font-black text-white/58">{!isMyTurn ? "انتظر دورك" : hasLegalMove ? "عندك حركة" : "اسحب"}</span>
              </button>

              <div className="flex-1 text-left" dir="ltr">
                <PlayerBadge
                  player={me}
                  active={isMyTurn}
                  me
                  action={room.mode === "duel" ? (
                    <VoiceMicButton
                      enabled={voiceChat.micEnabled}
                      supported={voiceChat.supported}
                      state={voiceChat.state}
                      onClick={() => void voiceChat.toggleMic()}
                    />
                  ) : null}
                />
              </div>
            </div>
            {room.mode === "duel" && voiceChat.error ? <div aria-live="polite" className="mx-auto mt-1 max-w-sm text-center text-[8px] font-semibold text-rose-100/75">{voiceChat.error}</div> : null}

            <div className="mt-1 overflow-x-auto pb-2 pt-3 hidden-scrollbar" dir="rtl">
              <div className="mx-auto flex min-w-max items-end justify-center px-2 pb-2">
                {hand.cards.map((card, index) => {
                  const selected = card.id === selectedCardId;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => {
                        if (!canPlay) return;
                        prepareVocabularyAudio();
                        setSelectedCardId(selected ? "" : card.id);
                        setMessage("");
                        playVocabularySound("cardSelect");
                      }}
                      disabled={!canPlay}
                      aria-pressed={selected}
                      aria-label={`بطاقة الحرف ${card.letter}`}
                      className="relative min-h-0 min-w-0 rounded-[15px] transition disabled:cursor-default"
                      style={{ marginInlineStart: index === 0 ? 0 : -12, zIndex: selected ? 50 : index + 1 }}
                    >
                      <CardFace letter={card.letter} index={index} selected={selected} disabled={!canPlay} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mx-auto mt-0 flex w-fit items-center gap-2 rounded-full border border-white/[0.07] bg-black/12 px-3 py-1.5 text-[8px] font-bold text-white/35"><ShieldCheck className="h-3 w-3 text-lime-200" /> السحب يتوقف تلقائيًا إذا كانت لديك حركة صحيحة</div>
          </div>

          {finished ? (
            <div className="absolute inset-0 z-50 grid place-items-center bg-[#032a24]/88 p-4 backdrop-blur-md">
              <motion.div initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="w-full max-w-sm rounded-[30px] border border-white/12 bg-[#073f35] p-5 text-center shadow-[0_30px_90px_rgba(0,0,0,.45)]">
                <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full border ${didWin ? "border-lime-200/25 bg-lime-300/[0.13] text-lime-200" : isDraw ? "border-amber-200/25 bg-amber-300/[0.10] text-amber-200" : "border-white/12 bg-white/[0.06] text-white/55"}`}>{didWin ? <Trophy className="h-7 w-7" /> : isDraw ? <UsersRound className="h-7 w-7" /> : <Swords className="h-7 w-7" />}</div>
                <h2 className="mt-4 text-2xl font-black">{didWin ? "فزت بالتحدي!" : isDraw ? "انتهت بالتعادل" : room.mode === "duel" && didLose ? "خسرت التحدي" : "فاز بوت التحدي"}</h2>
                <p className="mt-2 text-xs font-semibold leading-6 text-white/50">{room.finishReason === "cards" ? (didWin ? "تخلّصت من جميع بطاقاتك أولًا." : room.mode === "duel" ? "تخلّص خصمك من بطاقاته قبلك." : "تخلّص البوت من بطاقاته قبلك.") : room.finishReason === "forfeit" ? "تم حسم المباراة بالانسحاب." : isDraw ? "انتهت الخمس دقائق بالتساوي في عدد البطاقات." : "انتهت الخمس دقائق وتم الحسم بالأقل في عدد البطاقات."}</p>
                <div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-2xl border border-white/10 bg-black/15 p-3"><div className="text-xl font-black text-lime-200">{me?.cardCount ?? 0}</div><div className="mt-1 text-[9px] font-bold text-white/40">بطاقاتك</div></div><div className="rounded-2xl border border-white/10 bg-black/15 p-3"><div className="text-xl font-black">{me?.moves ?? 0}</div><div className="mt-1 text-[9px] font-bold text-white/40">كلمات صحيحة</div></div><div className="rounded-2xl border border-lime-200/15 bg-lime-300/[0.08] p-3"><div className="text-xl font-black text-lime-200" dir="ltr">+{estimatedXp}</div><div className="mt-1 text-[9px] font-bold text-white/40">XP</div></div></div>{leaderboard?.me ? <div className="mt-2 rounded-2xl border border-lime-200/15 bg-lime-300/[0.07] px-3 py-2 text-[10px] font-black text-lime-100">ترتيبك {finishLeaderboardLabel}: <span dir="ltr">#{leaderboard.me.rank}</span> · {leaderboard.me.score} نقطة</div> : null}
                {room.mode === "duel" && rematchRequestedByOpponent ? <div className="mt-3 rounded-2xl border border-amber-200/20 bg-amber-300/[0.08] px-3 py-2 text-[10px] font-black text-amber-100">خصمك طلب إعادة المباراة.</div> : null}
                <div className="mt-5 grid gap-2">
                  <button type="button" onClick={handleRematch} disabled={busy || rematchRequestedByMe} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-lime-300 px-3 text-xs font-black text-emerald-950 disabled:cursor-wait disabled:opacity-65">
                    {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    {room.mode === "solo" ? "العب مرة أخرى" : rematchRequestedByMe ? "بانتظار موافقة الخصم…" : rematchRequestedByOpponent ? "قبول إعادة المباراة" : "إعادة المباراة"}
                  </button>
                  <div className="grid grid-cols-2 gap-2"><button type="button" onClick={resetToMenu} className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 text-xs font-black text-white/72"><Gamepad2 className="h-4 w-4" /> القائمة</button><Link href="/games" className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 text-xs font-black text-white/70"><ArrowRight className="h-4 w-4" /> الألعاب</Link></div>
                </div>
              </motion.div>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}
