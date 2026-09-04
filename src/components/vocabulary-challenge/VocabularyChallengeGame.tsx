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
  Languages,
  LoaderCircle,
  LogOut,
  Medal,
  RotateCcw,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  UserRound,
  UsersRound,
  XCircle,
  Zap,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import AuthGateCard from "@/components/auth/AuthGateCard";
import {
  VocabularyChallengeApiError,
  createVocabularyChallenge,
  drawVocabularyCard,
  getVocabularyDailyLeaderboard,
  forfeitVocabularyChallenge,
  joinVocabularyChallenge,
  playVocabularyCard,
  processVocabularyTimeout,
} from "@/lib/vocabularyChallengeClient";
import { playVocabularySound, prepareVocabularyAudio } from "@/lib/vocabularyChallengeAudio";
import { syncPlatformGameXp as syncPlatformGameXpClient } from "@/lib/platformGameXpClient";
import { hasVocabularyMove } from "@/lib/vocabularyChallengeDictionary";
import type {
  VocabularyChallengeCard,
  VocabularyChallengeHand,
  VocabularyChallengePlayerSummary,
  VocabularyChallengeRoom,
  VocabularyDailyLeaderboard,
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
    ? "h-[116px] w-[82px] sm:h-[136px] sm:w-[96px]"
    : size === "mini"
      ? "h-[68px] w-[48px]"
      : "h-[82px] w-[56px] sm:h-[92px] sm:w-[62px]";
  const textSize = size === "center" ? "text-[38px] sm:text-[46px]" : size === "mini" ? "text-xl" : "text-2xl sm:text-[28px]";

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
}: {
  player: VocabularyChallengePlayerSummary | null;
  active: boolean;
  me?: boolean;
}) {
  const name = player?.userName || (me ? "أنت" : "بانتظار لاعب");
  return (
    <div className="flex items-center gap-2.5">
      <div className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 text-base font-black shadow-lg ${active ? "border-lime-300 bg-emerald-500 text-white shadow-emerald-300/20" : "border-white/15 bg-black/25 text-white/65"}`}>
        {player ? initial(name) : <UserRound className="h-5 w-5" />}
        {active ? <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-emerald-950 bg-lime-300" /> : null}
      </div>
      <div className="min-w-0">
        <div className="max-w-[170px] truncate text-[11px] font-black text-white/85 sm:text-xs">{name}</div>
        <div className="mt-1 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/25 px-2 py-1 text-[10px] font-black text-white/75">
          <span className="grid h-4 w-4 place-items-center rounded bg-white/10 text-[9px]">▣</span>
          <span dir="ltr">{player?.cardCount ?? "—"}</span>
          <span className="font-semibold text-white/40">بطاقة</span>
        </div>
      </div>
    </div>
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


function DailyLeaderboardPanel({
  data,
  loading,
  error,
  onRefresh,
}: {
  data: VocabularyDailyLeaderboard | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
}) {
  const entries = data?.entries || [];
  return (
    <div className="relative mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-black/20 p-4 backdrop-blur-xl md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-lime-200"><Crown className="h-4 w-4" /><span className="text-[10px] font-black">منافسة يومية</span></div>
          <h2 className="mt-1 text-lg font-black text-white">ترتيب اليوم</h2>
          <p className="mt-1 text-[10px] font-semibold text-white/42">يتجدد يوميًا بتوقيت السعودية · فوز التحدي 3 نقاط · إنهاء الفردي 2 نقطة</p>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading} aria-label="تحديث ترتيب اليوم" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-white/55 transition hover:text-white disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
      </div>

      {loading && !data ? (
        <div className="mt-4 flex min-h-[92px] items-center justify-center gap-2 text-xs font-black text-white/45"><LoaderCircle className="h-4 w-4 animate-spin" /> جاري تحميل ترتيب اليوم…</div>
      ) : error && !data ? (
        <div className="mt-4 rounded-2xl border border-rose-200/15 bg-rose-400/[0.06] px-3 py-5 text-center text-xs font-semibold text-rose-100/70">{error}</div>
      ) : entries.length ? (
        <div className="mt-4 grid gap-2">
          {entries.map((entry) => {
            const isMe = data?.me?.userId === entry.userId;
            return (
              <div key={entry.userId} className={`grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border px-3 py-2.5 ${isMe ? "border-lime-200/25 bg-lime-300/[0.10]" : "border-white/[0.08] bg-white/[0.025]"}`}>
                <div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black ${entry.rank === 1 ? "bg-amber-300 text-amber-950" : entry.rank === 2 ? "bg-white/20 text-white" : entry.rank === 3 ? "bg-orange-300/75 text-orange-950" : "bg-black/20 text-white/55"}`}>{entry.rank <= 3 ? <Medal className="h-4 w-4" /> : entry.rank}</div>
                <div className="min-w-0"><div className="truncate text-xs font-black text-white">{entry.userName}{isMe ? <span className="mr-1 text-[9px] text-lime-200">أنت</span> : null}</div><div className="mt-0.5 text-[9px] font-semibold text-white/38">{entry.wins} فوز · {entry.words} كلمة</div></div>
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
        <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3 py-5 text-center text-xs font-semibold text-white/42">ما فيه نتائج اليوم حتى الآن. كن أول لاعب في الترتيب.</div>
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
  const [leaderboard, setLeaderboard] = useState<VocabularyDailyLeaderboard | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error" | "info">("info");
  const [now, setNow] = useState(Date.now());
  const timeoutKeyRef = useRef("");
  const xpSyncKeyRef = useRef("");
  const matchStartSoundKeyRef = useRef("");
  const turnSoundKeyRef = useRef("");
  const countdownSoundKeyRef = useRef("");
  const resultSoundKeyRef = useRef("");

  async function refreshLeaderboard() {
    if (!isLoggedIn || !user) return;
    try {
      setLeaderboardLoading(true);
      setLeaderboardError("");
      setLeaderboard(await getVocabularyDailyLeaderboard());
    } catch (error) {
      setLeaderboardError("تعذر تحميل ترتيب اليوم الآن. حاول التحديث بعد قليل.");
      console.warn("Vocabulary leaderboard load failed:", error);
    } finally {
      setLeaderboardLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoggedIn || !user) return;
    void refreshLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user?.id]);

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
    if (!room || room.mode !== "duel" || !user?.id) return null;
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
  const hasLegalMove = Boolean(room && hand && hasVocabularyMove(room.currentWord, hand.cards.map((card) => card.letter)));
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

  function resetToMenu() {
    setRoomId("");
    setRoom(null);
    setHand(null);
    setSelectedCardId("");
    setMessage("");
    setJoinCode("");
    timeoutKeyRef.current = "";
    xpSyncKeyRef.current = "";
    matchStartSoundKeyRef.current = "";
    turnSoundKeyRef.current = "";
    countdownSoundKeyRef.current = "";
    resultSoundKeyRef.current = "";
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
  const isDraw = Boolean(finished && room?.mode === "duel" && !room?.winnerId);

  return (
    <main dir="rtl" className="relative mx-auto max-w-7xl overflow-hidden px-3 pb-16 pt-3 sm:px-4 md:px-6 md:pb-20 md:pt-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[760px] bg-[radial-gradient(circle_at_20%_10%,rgba(52,211,153,.12),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(16,185,129,.10),transparent_30%)]" />

      <div className="mb-3 flex items-center justify-between gap-2">
        <Link href="/games" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-white/60 transition hover:bg-white/[0.07] hover:text-white"><ArrowRight className="h-4 w-4" /> الألعاب</Link>
        {room ? (
          <button type="button" onClick={handleForfeit} disabled={busy || finished || cancelled} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-red-200/10 bg-red-400/[0.055] px-3 text-[11px] font-black text-red-100/70 disabled:opacity-35"><LogOut className="h-4 w-4" /> {room.status === "waiting" ? "إلغاء الغرفة" : "إنهاء"}</button>
        ) : (
          <div className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-emerald-200/10 bg-emerald-300/[0.05] px-3 text-[10px] font-black text-emerald-100/70"><ShieldCheck className="h-3.5 w-3.5" /> كلمات عربية معتمدة</div>
        )}
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
                <ModeCard icon={<UserRound className="h-5 w-5" />} title="العب بمفردك" description="تخلّص من بطاقاتك خلال 5 دقائق، وبدّل حرفًا واحدًا في كل حركة." accent="emerald" onClick={() => handleCreate("solo")} disabled={busy} />
                <ModeCard icon={<Swords className="h-5 w-5" />} title="تحدَّ لاعبًا" description="أنشئ غرفة خاصة، شارك الكود مع صديق، وأول من يتخلّص من بطاقاته يفوز." accent="amber" onClick={() => handleCreate("duel")} disabled={busy} />
              </div>

              <form onSubmit={handleJoin} className="mt-3 rounded-[22px] border border-white/10 bg-white/[0.035] p-3">
                <label htmlFor="vocabulary-room-code" className="flex items-center gap-1.5 text-[10px] font-black text-white/55"><Hash className="h-3.5 w-3.5" /> عندك كود غرفة؟</label>
                <div className="mt-2 flex gap-2">
                  <input id="vocabulary-room-code" value={joinCode} onChange={(event) => setJoinCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" dir="ltr" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-center text-base font-black tracking-[.25em] text-white outline-none placeholder:text-white/20 focus:border-lime-300/50" />
                  <button type="submit" disabled={busy || joinCode.length !== 6} className="min-w-[88px] rounded-xl bg-lime-300 px-3 text-xs font-black text-emerald-950 transition disabled:opacity-45">انضم</button>
                </div>
              </form>

              <div className="mt-3 flex items-start gap-2 rounded-2xl border border-emerald-200/10 bg-emerald-300/[0.045] p-3 text-[10px] font-semibold leading-5 text-emerald-50/55"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-lime-200" /><span>بدّل حرفًا واحدًا ببطاقة من يدك لتصنع كلمة صحيحة من 3 أحرف. أول من يتخلّص من بطاقاته يفوز.</span></div>
            </div>
          </div>

          <DailyLeaderboardPanel data={leaderboard} loading={leaderboardLoading} error={leaderboardError} onRefresh={() => void refreshLeaderboard()} />

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
        <section className="relative mx-auto max-w-[820px] overflow-hidden rounded-[38px] border border-emerald-100/20 bg-[linear-gradient(180deg,#064638_0%,#0b8060_38%,#086249_64%,#043b32_100%)] shadow-[0_34px_110px_rgba(0,0,0,.42)]">
          <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_50%_50%,rgba(255,255,255,.11)_0_1px,transparent_1.4px),linear-gradient(30deg,transparent_48%,rgba(255,255,255,.06)_49%_51%,transparent_52%),linear-gradient(-30deg,transparent_48%,rgba(255,255,255,.05)_49%_51%,transparent_52%)] [background-size:24px_24px,48px_42px,48px_42px]" />
          <div className="pointer-events-none absolute inset-x-[8%] -top-44 h-[330px] rounded-[50%] border-[2px] border-emerald-100/14 bg-black/[0.06] shadow-[inset_0_-20px_50px_rgba(255,255,255,.025)]" />
          <div className="pointer-events-none absolute left-[8%] top-28 h-24 w-24 -translate-x-1/2 rounded-full border border-emerald-100/10" />
          <div className="pointer-events-none absolute right-[8%] top-28 h-24 w-24 translate-x-1/2 rounded-full border border-emerald-100/10" />

          <div className="relative min-h-[760px] px-3 pb-5 pt-4 sm:min-h-[820px] sm:px-5 sm:pb-7">
            <div className="mx-auto flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-black/18 px-3 py-1.5 shadow-inner">
              <Clock3 className="h-4 w-4 text-lime-200" /><span dir="ltr" className="font-mono text-xl font-black tracking-wider text-emerald-50 sm:text-2xl">{formatTimer(matchRemainingMs)}</span>
            </div>

            <div className="mt-5 flex min-h-[72px] items-center justify-center">
              {room.mode === "duel" ? <PlayerBadge player={opponent} active={Boolean(opponent && room.turnPlayerId === opponent.userId)} /> : (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/18 px-4 py-2 text-[11px] font-black text-white/65"><Sparkles className="h-4 w-4 text-lime-200" /> الوضع الفردي</div>
              )}
            </div>

            <div className="mt-1 grid place-items-center">
              <div className={`relative grid h-16 w-16 place-items-center rounded-full border-[3px] bg-black/45 shadow-[0_10px_30px_rgba(0,0,0,.28)] ${isMyTurn ? "border-lime-300/70" : "border-white/15"}`}>
                <svg className="absolute inset-[-5px] h-[70px] w-[70px] -rotate-90" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="31" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="4" /><circle cx="36" cy="36" r="31" fill="none" stroke={turnSeconds <= 3 ? "#fb7185" : "#bef264"} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${194.8 * turnProgress / 100} 194.8`} /></svg>
                <span dir="ltr" className={`relative text-xl font-black ${turnSeconds <= 3 ? "text-rose-200" : "text-lime-200"}`}>{turnSeconds}s</span>
              </div>
              <div className={`mt-2 rounded-full border px-3 py-1 text-[10px] font-black ${isMyTurn ? "border-lime-200/20 bg-lime-300/[0.11] text-lime-100" : "border-white/10 bg-black/15 text-white/52"}`}>{isMyTurn ? "حان دورك الآن" : room.mode === "duel" ? "دور الخصم" : "استعد"}</div>
            </div>

            <div className="mt-7 flex items-center justify-center gap-2.5 sm:gap-4" dir="rtl">
              {Array.from(room.currentWord).map((letter, index) => (
                <button key={`${room.currentWord}-${index}`} type="button" disabled={!canPlay || !selectedCard} onClick={() => handlePosition(index)} aria-label={selectedCard ? `استبدال الحرف ${letter} بالحرف ${selectedCard.letter}` : `الحرف ${letter}`} className="relative min-h-0 min-w-0 rounded-[17px] disabled:cursor-default">
                  <CardFace letter={letter} index={index} size="center" />
                  {selectedCard && canPlay ? <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-lime-200/20 bg-emerald-950 px-2 py-0.5 text-[8px] font-black text-lime-200">ضع هنا</span> : null}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={`${messageKind}-${message || room.lastMove?.at || "idle"}`} initial={reduceMotion ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -5 }} className="mx-auto mt-5 min-h-[42px] max-w-md">
                {message ? (
                  <div aria-live="polite" className={`flex min-h-[42px] items-center justify-center gap-2 rounded-xl border px-3 text-center text-xs font-black shadow-lg ${messageKind === "success" ? "border-lime-200/25 bg-lime-300/20 text-lime-50" : messageKind === "error" ? "border-rose-200/25 bg-rose-500/28 text-rose-50" : "border-white/10 bg-black/22 text-white/70"}`}>
                    {messageKind === "success" ? <CheckCircle2 className="h-4 w-4" /> : messageKind === "error" ? <XCircle className="h-4 w-4" /> : <CircleHelp className="h-4 w-4" />}{message}
                  </div>
                ) : room.lastMove ? (
                  <div className="flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-lime-200/18 bg-lime-300/[0.13] px-3 text-xs font-black text-lime-50"><CheckCircle2 className="h-4 w-4" /> {room.lastMove.afterWord}</div>
                ) : (
                  <div className="flex min-h-[42px] items-center justify-center text-[10px] font-semibold text-white/38">اختر بطاقة من يدك ثم اضغط على الحرف الذي تريد استبداله.</div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex items-end justify-between gap-3">
              <button type="button" onClick={handleDraw} disabled={!canDraw} className="group flex w-[74px] shrink-0 flex-col items-center gap-1.5 disabled:opacity-35">
                <div className="relative h-[58px] w-[52px]" aria-hidden="true"><div className="absolute inset-0 translate-x-2 translate-y-2 rotate-6 rounded-lg border border-white/15 bg-[#173f38]" /><div className="absolute inset-0 translate-x-1 translate-y-1 rotate-3 rounded-lg border border-white/15 bg-[#1b4b41]" /><div className="absolute inset-0 grid place-items-center rounded-lg border border-white/20 bg-[linear-gradient(145deg,#173f38,#0c2926)] shadow-[0_10px_22px_rgba(0,0,0,.3)]"><Sparkles className="h-5 w-5 text-amber-200/70" /></div></div>
                <span className="text-[9px] font-black text-white/58">{!isMyTurn ? "انتظر دورك" : hasLegalMove ? "عندك حركة صحيحة" : "اسحب عند التعذر"}</span>
              </button>

              <div className="flex-1 text-left" dir="ltr"><PlayerBadge player={me} active={isMyTurn} me /></div>
            </div>

            <div className="mt-4 overflow-x-auto pb-3 pt-4 hidden-scrollbar" dir="rtl">
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
                      style={{ marginInlineStart: index === 0 ? 0 : -13, zIndex: selected ? 50 : index + 1 }}
                    >
                      <CardFace letter={card.letter} index={index} selected={selected} disabled={!canPlay} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-1 grid grid-cols-3 gap-2 text-center text-[9px] font-bold text-white/42">
              <div className="rounded-xl border border-white/[0.08] bg-black/12 px-2 py-2"><Zap className="mx-auto mb-1 h-3.5 w-3.5 text-lime-200" />غيّر حرفًا واحدًا</div>
              <div className="rounded-xl border border-white/[0.08] bg-black/12 px-2 py-2"><ShieldCheck className="mx-auto mb-1 h-3.5 w-3.5 text-lime-200" />كلمة معتمدة فقط</div>
              <div className="rounded-xl border border-white/[0.08] bg-black/12 px-2 py-2"><Trophy className="mx-auto mb-1 h-3.5 w-3.5 text-lime-200" />تخلّص من البطاقات</div>
            </div>
          </div>

          {finished ? (
            <div className="absolute inset-0 z-50 grid place-items-center bg-[#032a24]/88 p-4 backdrop-blur-md">
              <motion.div initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="w-full max-w-sm rounded-[30px] border border-white/12 bg-[#073f35] p-5 text-center shadow-[0_30px_90px_rgba(0,0,0,.45)]">
                <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full border ${didWin ? "border-lime-200/25 bg-lime-300/[0.13] text-lime-200" : isDraw ? "border-amber-200/25 bg-amber-300/[0.10] text-amber-200" : "border-white/12 bg-white/[0.06] text-white/55"}`}>{didWin ? <Trophy className="h-7 w-7" /> : isDraw ? <UsersRound className="h-7 w-7" /> : <Swords className="h-7 w-7" />}</div>
                <h2 className="mt-4 text-2xl font-black">{didWin ? "فزت بالتحدي!" : isDraw ? "انتهت بالتعادل" : room.mode === "solo" ? "انتهى الوقت" : "انتهت المباراة"}</h2>
                <p className="mt-2 text-xs font-semibold leading-6 text-white/50">{room.finishReason === "cards" ? "تم حسم المباراة بعد التخلص من جميع البطاقات." : room.finishReason === "forfeit" ? "تم حسم المباراة بالانسحاب." : "انتهت الخمس دقائق وتم الحسم بعدد البطاقات المتبقية."}</p>
                <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-2xl border border-white/10 bg-black/15 p-3"><div className="text-xl font-black text-lime-200">{me?.cardCount ?? 0}</div><div className="mt-1 text-[9px] font-bold text-white/40">بطاقاتك المتبقية</div></div><div className="rounded-2xl border border-white/10 bg-black/15 p-3"><div className="text-xl font-black">{me?.moves ?? 0}</div><div className="mt-1 text-[9px] font-bold text-white/40">كلمات صحيحة</div></div></div>{leaderboard?.me ? <div className="mt-2 rounded-2xl border border-lime-200/15 bg-lime-300/[0.07] px-3 py-2 text-[10px] font-black text-lime-100">ترتيبك اليوم: <span dir="ltr">#{leaderboard.me.rank}</span> · {leaderboard.me.score} نقطة</div> : null}
                <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={resetToMenu} className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-lime-300 px-3 text-xs font-black text-emerald-950"><RotateCcw className="h-4 w-4" /> تحدٍ جديد</button><Link href="/games" className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 text-xs font-black text-white/70"><ArrowRight className="h-4 w-4" /> الألعاب</Link></div>
              </motion.div>
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}
