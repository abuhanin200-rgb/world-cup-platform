"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  AudioLines, Check, ChevronLeft, Clock3, Coffee, Copy, Crown, Dices, DoorOpen, Eye, EyeOff,
  HandHelping, Hourglass, Lightbulb, ListChecks, LoaderCircle, Medal, Mic, MicOff, Pause, Play, Radio,
  RefreshCw, RotateCcw, RotateCw, ShieldCheck, Sparkles, Swords, Trophy, UsersRound, Volume2, VolumeX, Wifi, X,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import styles from "./MajlisGame.module.css";
import { useAuth } from "@/context/AuthContext";
import {
  createMajlisOnlineRoom, getMajlisOnlineRoom, heartbeatMajlisOnlineRoom, joinMajlisOnlineRoom,
  leaveMajlisOnlineRoom, closeMajlisOnlineRoom, setMajlisOnlineTeam, startMajlisOnlineGame,
  syncMajlisOnlineState, updateMajlisOnlineLobby,
} from "@/lib/majlisClient";
import { useMajlisVoiceChat } from "@/lib/useMajlisVoiceChat";
import {
  isMajlisSoundEnabled, majlisHaptic, playMajlisSound, preloadMajlisSounds, setMajlisSoundEnabled,
} from "@/lib/majlisAudio";
import type {
  MajlisCategory, MajlisClientQuestion, MajlisGameStartResponse, MajlisOnlinePublicState, MajlisOnlineRoom,
  MajlisPlayMode, MajlisReveal, MajlisSettings, MajlisVoiceMode,
} from "@/types/majlisGame";

type CategorySummary = MajlisCategory & { totalQuestions: number; activeQuestions: number; easy: number; medium: number; hard: number; audio: number };
type Team = { id: string; name: string; score: number; accent: string; assists: { hint: boolean; time: boolean; double: boolean; options: boolean } };
type PersistedState = { savedAt: number; session: MajlisGameStartResponse; teams: Team[]; currentTeamIndex: number; usedQuestionIds: string[]; phase: "board" | "finished" };

const STORAGE_KEY = "altahaddi_majlis_session_v2";
const TEAM_COLORS = ["#d6b16b", "#7fb3a8", "#c77a62", "#8f9fc9"];

function cn(...values: Array<string | false | null | undefined>) { return values.filter(Boolean).join(" "); }
function formatNumber(value: number) { return new Intl.NumberFormat("en-US").format(value); }
function difficultyLabel(value: MajlisClientQuestion["difficulty"]) { return value === "hard" ? "صعب" : value === "medium" ? "متوسط" : "سهل"; }
function sameTeam(room: MajlisOnlineRoom, a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  return Boolean(room.players[a]?.teamId && room.players[a]?.teamId === room.players[b]?.teamId);
}

async function enterGamePresentation() {
  if (typeof window === "undefined") return;
  try {
    const root = document.documentElement as HTMLElement & { requestFullscreen?: () => Promise<void> };
    if (!document.fullscreenElement && root.requestFullscreen) {
      await root.requestFullscreen().catch(() => undefined);
    }
  } catch {}
  try {
    const orientation = (screen as Screen & { orientation?: ScreenOrientation & { lock?: (value: string) => Promise<void> } }).orientation;
    await orientation?.lock?.("landscape").catch(() => undefined);
  } catch {}
}

async function exitGamePresentation() {
  if (typeof window === "undefined") return;
  try {
    const orientation = (screen as Screen & { orientation?: ScreenOrientation & { unlock?: () => void } }).orientation;
    orientation?.unlock?.();
  } catch {}
  try {
    if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen().catch(() => undefined);
  } catch {}
}

function LoadingBlock() {
  return <div className="grid min-h-[320px] place-items-center p-6 text-center"><div><LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[#d6b16b]"/><p className="mt-3 text-sm font-black text-[#f7efdc]/70">نجهّز مجلس التحدي وبنك الأسئلة…</p></div></div>;
}

function AudioQuestionPlayer({ question }: { question: MajlisClientQuestion }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => () => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    audioRef.current?.pause();
  }, []);

  function createAudio(url: string) {
    const audio = new Audio(url);
    audio.preload = "auto";
    audio.setAttribute("playsinline", "true");
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    return audio;
  }

  async function playFrom(url: string) {
    const audio = createAudio(url);
    audioRef.current = audio;
    const startAt = Math.max(0, question.audioStartSeconds || 0);
    await new Promise<void>((resolve) => {
      if (audio.readyState >= 1) return resolve();
      const done = () => { audio.removeEventListener("loadedmetadata", done); resolve(); };
      audio.addEventListener("loadedmetadata", done, { once: true });
      window.setTimeout(done, 2500);
    });
    try { if (startAt > 0 && Number.isFinite(audio.duration) && audio.duration > startAt + 2) audio.currentTime = startAt; } catch {}
    await audio.play();
    setPlaying(true);
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => { audio.pause(); setPlaying(false); }, Math.max(8, question.audioMaxSeconds || 15) * 1000);
  }

  async function toggle() {
    if (!question.audioUrl) return;
    setError("");
    if (playing && audioRef.current) { audioRef.current.pause(); setPlaying(false); return; }
    try {
      await playFrom(usingFallback && question.audioFallbackUrl ? question.audioFallbackUrl : question.audioUrl);
    } catch {
      if (!usingFallback && question.audioFallbackUrl) {
        try { setUsingFallback(true); await playFrom(question.audioFallbackUrl); return; } catch {}
      }
      setError("تعذر تشغيل هذا المقطع. جرّب مرة أخرى أو اختر سؤالًا آخر.");
      setPlaying(false);
    }
  }

  const isReciter = question.categoryId === "reciter";
  const isHumanLanguage = question.categoryId === "dialects" || question.categoryId === "languages";
  const mediaCaption = isReciter
    ? "مقطع تلاوة بشري يصل إلى 15 ثانية"
    : isHumanLanguage
      ? "تسجيل بشري حقيقي من Wikimedia Commons / Lingua Libre — بدون صوت مولّد"
      : "مقطع صوتي للسؤال";
  return <div className={styles.mediaPlayer}>
    <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[#d6b16b]/25 bg-[#d6b16b]/10 text-[#ead8ad]"><AudioLines className="h-6 w-6"/></div>
    <p className="mt-2 text-[11px] font-black text-[#f7efdc]/60">{mediaCaption}</p>
    <button type="button" onClick={toggle} className="mx-auto mt-3 inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-[#d6b16b] px-5 text-sm font-black text-[#173b35]">{playing?<Pause className="h-4 w-4"/>:<Play className="h-4 w-4"/>}{playing?"إيقاف":"تشغيل المقطع"}</button>
    {error?<p role="alert" className="mt-2 text-[11px] font-bold text-rose-200">{error}</p>:null}
  </div>;
}

function SpeechQuestionPlayer({ question }: { question: MajlisClientQuestion }) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  function speak() {
    if (!question.speechText || typeof window === "undefined" || !("speechSynthesis" in window)) { setError("هذا الجهاز لا يدعم تشغيل النطق الآلي."); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(question.speechText);
    utterance.lang = question.speechLang || "ar";
    utterance.rate = .88;
    const voices = window.speechSynthesis.getVoices();
    const base = utterance.lang.toLowerCase().split("-")[0];
    const voice = voices.find((item) => item.lang.toLowerCase() === utterance.lang.toLowerCase()) || voices.find((item) => item.lang.toLowerCase().startsWith(base));
    if (voice) utterance.voice = voice;
    utterance.onstart = () => { setPlaying(true); setError(""); };
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => { setPlaying(false); setError("تعذر تشغيل النطق على هذا الجهاز."); };
    window.speechSynthesis.speak(utterance);
  }
  return <div className={styles.mediaPlayer}>
    <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[#7fb3a8]/25 bg-[#7fb3a8]/10 text-[#bfe2d8]"><Volume2 className="h-6 w-6"/></div>
    <p className="mt-2 text-[11px] font-black text-[#f7efdc]/60">استمع أولًا، ثم جاوب بدون ظهور الاختيارات</p>
    <button type="button" onClick={speak} className="mx-auto mt-3 inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-[#7fb3a8] px-5 text-sm font-black text-[#102d2b]">{playing?<Volume2 className="h-4 w-4"/>:<Play className="h-4 w-4"/>}{playing?"جاري التشغيل":"تشغيل الصوت"}</button>
    {error?<p role="alert" className="mt-2 text-[11px] font-bold text-amber-100">{error}</p>:null}
  </div>;
}

function VoiceControls({ room, userId, compact = false }: { room: MajlisOnlineRoom; userId?: string | null; compact?: boolean }) {
  const voice = useMajlisVoiceChat(room, userId);
  const modes: Array<{ mode: MajlisVoiceMode; label: string; icon: typeof Mic }> = [
    { mode: "off", label: "مغلق", icon: MicOff }, { mode: "team", label: "فريقي", icon: UsersRound }, { mode: "all", label: "عام", icon: Radio },
  ];
  if(compact)return <div className={styles.voiceCompact} aria-label="التحكم بصوت المجلس">{modes.map(({mode,label,icon:Icon})=><button key={mode} type="button" title={label} aria-label={`المايك: ${label}`} aria-pressed={voice.micMode===mode} onClick={()=>void voice.setMode(mode)} className={voice.micMode===mode?styles.voiceCompactActive:""}><Icon/></button>)}{voice.needsAudioUnlock?<button type="button" title="تشغيل الصوت" onClick={()=>void voice.unlockAudio()}><Volume2/></button>:null}</div>;
  return <div className={cn("rounded-[22px] border border-[#ead8ad]/10 bg-black/18", "p-3.5")}>
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
      <div className="min-w-0"><div className="flex items-center gap-1.5 text-[10px] font-black text-[#ead8ad]"><Mic className="h-3.5 w-3.5"/> صوت المجلس</div>{!compact?<p className="mt-1 text-[9px] font-bold leading-5 text-[#f7efdc]/38">«فريقي» يسمعه أعضاء فريقك فقط، و«عام» يسمعه جميع الموجودين.</p>:null}</div>
      <div className="flex items-center gap-1 text-[9px] font-black text-[#f7efdc]/40"><Wifi className="h-3.5 w-3.5"/>{voice.turnEnabled?"TURN متصل":"اتصال مباشر"}</div>
    </div>
    <div className="mt-2 grid grid-cols-3 gap-1.5">
      {modes.map(({mode,label,icon:Icon})=><button key={mode} type="button" onClick={()=>void voice.setMode(mode)} aria-pressed={voice.micMode===mode} className={cn("min-h-11 rounded-xl border px-2 text-[10px] font-black transition active:scale-[.98]",voice.micMode===mode?"border-[#d6b16b]/45 bg-[#d6b16b] text-[#173b35]":"border-[#ead8ad]/10 bg-white/[0.035] text-[#f7efdc]/58")}><Icon className="mx-auto mb-0.5 h-4 w-4"/>{label}</button>)}
    </div>
    {voice.needsAudioUnlock?<button type="button" onClick={()=>void voice.unlockAudio()} className="mt-2 min-h-10 w-full rounded-xl bg-[#7fb3a8] text-[10px] font-black text-[#102d2b]">تشغيل صوت اللاعبين</button>:null}
    {voice.error?<p role="alert" className="mt-2 text-[9px] font-bold leading-5 text-rose-200">{voice.error}</p>:null}
    {!compact?<div className="mt-2 flex flex-wrap gap-1.5">{(Object.values(room.players) as Array<MajlisOnlineRoom["players"][string]>).map(player=><span key={player.userId} className={cn("rounded-full border px-2 py-1 text-[9px] font-black", player.userId===userId?"border-[#d6b16b]/25 bg-[#d6b16b]/8 text-[#ead8ad]":"border-white/8 bg-white/[.025] text-[#f7efdc]/42")}><span className="ml-1">{player.micMode==="all"?"📢":player.micMode==="team"?"🎙️":"🔇"}</span>{player.userName}</span>)}</div>:null}
  </div>;
}

export default function MajlisGame() {
  const reduceMotion = useReducedMotion();
  const { user, isLoggedIn, secureSession } = useAuth();
  const [categories,setCategories]=useState<CategorySummary[]>([]); const [settings,setSettings]=useState<MajlisSettings|null>(null); const [totalQuestions,setTotalQuestions]=useState(0); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  const [playMode,setPlayMode]=useState<MajlisPlayMode>("local"); const [onlineRoom,setOnlineRoom]=useState<MajlisOnlineRoom|null>(null); const [roomCodeInput,setRoomCodeInput]=useState(""); const [onlineBusy,setOnlineBusy]=useState(false);
  const [phase,setPhase]=useState<"setup"|"board"|"finished">("setup"); const [teamCount,setTeamCount]=useState(2); const [teamNames,setTeamNames]=useState(["الفريق الأول","الفريق الثاني","الفريق الثالث","الفريق الرابع"]); const [selectedCategoryIds,setSelectedCategoryIds]=useState<string[]>([]);
  const [session,setSession]=useState<MajlisGameStartResponse|null>(null); const [teams,setTeams]=useState<Team[]>([]); const [currentTeamIndex,setCurrentTeamIndex]=useState(0); const [usedQuestionIds,setUsedQuestionIds]=useState<string[]>([]);
  const [activeQuestion,setActiveQuestion]=useState<MajlisClientQuestion|null>(null); const [questionOwnerIndex,setQuestionOwnerIndex]=useState(0); const [answeringTeamIndex,setAnsweringTeamIndex]=useState(0); const [secondsLeft,setSecondsLeft]=useState(0); const [timerPaused,setTimerPaused]=useState(false); const [questionDeadlineAt,setQuestionDeadlineAt]=useState<number|null>(null);
  const [revealing,setRevealing]=useState(false); const [reveal,setReveal]=useState<MajlisReveal|null>(null); const [hintVisible,setHintVisible]=useState(false); const [optionsVisible,setOptionsVisible]=useState(false); const [doubleActive,setDoubleActive]=useState(false); const [timeBonusActive,setTimeBonusActive]=useState(false); const [stealMode,setStealMode]=useState(false); const [soundOn,setSoundOn]=useState(true); const [starting,setStarting]=useState(false); const [isLandscape,setIsLandscape]=useState(true); const [finishReason,setFinishReason]=useState<"complete"|"manual">("complete");

  const onlineHost = Boolean(user?.id && onlineRoom?.hostId === user.id);
  const canControl = playMode === "local" || onlineHost;
  const totalBoardQuestions=useMemo(()=>session?(Object.values(session.board) as MajlisClientQuestion[][]).reduce((sum,list)=>sum+list.length,0):0,[session]);
  const currentTeam=teams[currentTeamIndex]||null; const answeringTeam=teams[answeringTeamIndex]||null; const usedSet=useMemo(()=>new Set(usedQuestionIds),[usedQuestionIds]);

  const loadCatalog=useCallback(async()=>{try{setLoading(true);setError("");const response=await fetch("/api/games/majlis",{cache:"no-store"});const payload=await response.json().catch(()=>({})) as {categories?:CategorySummary[];settings?:MajlisSettings;totalQuestions?:number;error?:string};if(!response.ok)throw new Error(payload.error||"تعذر تحميل اللعبة.");const list=payload.categories||[];setCategories(list);setSettings(payload.settings||null);setTotalQuestions(payload.totalQuestions||0);const count=payload.settings?.categoriesPerGame||6;setSelectedCategoryIds(current=>current.length?current:list.slice(0,count).map(item=>item.id));}catch(e){setError(e instanceof Error?e.message:"تعذر تحميل اللعبة.");}finally{setLoading(false);}},[]);

  useEffect(()=>{preloadMajlisSounds();setSoundOn(isMajlisSoundEnabled());void loadCatalog();try{const saved=localStorage.getItem(STORAGE_KEY);if(!saved)return;const parsed=JSON.parse(saved) as PersistedState;if(!parsed?.session||Date.now()-Number(parsed.savedAt||0)>8*60*60*1000){localStorage.removeItem(STORAGE_KEY);return;}setSession(parsed.session);setTeams(parsed.teams||[]);setCurrentTeamIndex(parsed.currentTeamIndex||0);setUsedQuestionIds(parsed.usedQuestionIds||[]);setPhase(parsed.phase||"board");}catch{localStorage.removeItem(STORAGE_KEY);}},[loadCatalog]);
  useEffect(()=>{if(playMode!=="local"||!session||!teams.length||phase==="setup")return;localStorage.setItem(STORAGE_KEY,JSON.stringify({savedAt:Date.now(),session,teams,currentTeamIndex,usedQuestionIds,phase} satisfies PersistedState));},[playMode,session,teams,currentTeamIndex,usedQuestionIds,phase]);

  useEffect(()=>{
    if(typeof window==="undefined")return;
    const media=window.matchMedia("(orientation: landscape)");
    const update=()=>setIsLandscape(media.matches||window.innerWidth>=768);
    update(); media.addEventListener?.("change",update); window.addEventListener("resize",update);
    if(phase!=="setup"){
      const orientation=(screen as Screen & {orientation?:ScreenOrientation & {lock?:(value:string)=>Promise<void>}}).orientation;
      void orientation?.lock?.("landscape").catch(()=>undefined);
    }
    return()=>{media.removeEventListener?.("change",update);window.removeEventListener("resize",update);};
  },[phase]);

  // Accurate shared timer: a deadline is synced instead of writing once every second.
  useEffect(()=>{if(phase==="finished")void exitGamePresentation();},[phase]);

  useEffect(()=>{if(!activeQuestion||timerPaused||reveal||!questionDeadlineAt)return;const tick=()=>setSecondsLeft(Math.max(0,Math.ceil((questionDeadlineAt-Date.now())/1000)));tick();const timer=setInterval(tick,250);return()=>clearInterval(timer);},[activeQuestion,timerPaused,reveal,questionDeadlineAt]);
  useEffect(()=>{if(!activeQuestion||timerPaused||reveal)return;if(secondsLeft>0&&secondsLeft<=5)playMajlisSound("timer");},[secondsLeft,activeQuestion,timerPaused,reveal]);

  // Online room polling + heartbeat.
  useEffect(()=>{if(playMode!=="online"||!onlineRoom?.id||!user?.id)return;let cancelled=false;let pollTimer:ReturnType<typeof setTimeout>|null=null;let heartbeatTimer:ReturnType<typeof setInterval>|null=null;const roomId=onlineRoom.id;const poll=async()=>{try{const {room}=await getMajlisOnlineRoom(roomId);if(cancelled)return;setOnlineRoom(room);setTeamCount(room.teamCount);setTeamNames(current=>current.map((name,i)=>room.teamNames[i]||name));if(!onlineHost)setSelectedCategoryIds(room.selectedCategoryIds);if(!onlineHost&&room.session&&room.publicState){const ps=room.publicState;setSession(room.session);setTeams(ps.teams);setCurrentTeamIndex(ps.currentTeamIndex);setUsedQuestionIds(ps.usedQuestionIds);setActiveQuestion(ps.activeQuestion);setQuestionOwnerIndex(ps.questionOwnerIndex);setAnsweringTeamIndex(ps.answeringTeamIndex);setSecondsLeft(ps.secondsLeft);setTimerPaused(ps.timerPaused);setQuestionDeadlineAt(ps.questionDeadlineAt);setReveal(ps.reveal);setHintVisible(ps.hintVisible);setOptionsVisible(ps.optionsVisible);setDoubleActive(ps.doubleActive);setTimeBonusActive(ps.timeBonusActive);setStealMode(ps.stealMode);setFinishReason(ps.finishReason);setPhase(ps.phase);}if(room.status==="closed"){cancelled=true;void exitGamePresentation();setOnlineRoom(null);setSession(null);setTeams([]);setPhase("setup");setError("انتهى المجلس.");return;}}catch(e){const message=e instanceof Error?e.message:"";if(!cancelled&&/(غير موجود|انتهى|صلاحية|إغلاق|closed)/i.test(message)){cancelled=true;void exitGamePresentation();setOnlineRoom(null);setSession(null);setTeams([]);setActiveQuestion(null);setReveal(null);setHintVisible(false);setOptionsVisible(false);setPhase("setup");setError("انتهى المجلس. ابدأ مجلسًا جديدًا.");return;}if(!cancelled)console.warn("Majlis room poll",e);}finally{if(!cancelled)pollTimer=setTimeout(poll,900);}};void poll();heartbeatTimer=setInterval(()=>void heartbeatMajlisOnlineRoom(roomId).catch(()=>{}),12000);return()=>{cancelled=true;if(pollTimer)clearTimeout(pollTimer);if(heartbeatTimer)clearInterval(heartbeatTimer);};},[playMode,onlineRoom?.id,user?.id,onlineHost]);

  // Host publishes only authoritative state. Debounced; the deadline makes timers deterministic on all devices.
  useEffect(()=>{if(playMode!=="online"||!onlineRoom?.id||!onlineHost||!session||phase==="setup"||onlineRoom.status!=="playing")return;const publicState:MajlisOnlinePublicState={phase:phase==="finished"?"finished":"board",teams,currentTeamIndex,usedQuestionIds,activeQuestion,questionOwnerIndex,answeringTeamIndex,secondsLeft,timerPaused,questionDeadlineAt,reveal,hintVisible,optionsVisible,doubleActive,timeBonusActive,stealMode,finishReason,updatedAt:Date.now()};const timer=setTimeout(()=>void syncMajlisOnlineState(onlineRoom.id,publicState).catch(e=>console.warn("Majlis state sync",e)),180);return()=>clearTimeout(timer);},[playMode,onlineRoom?.id,onlineRoom?.status,onlineHost,session,phase,teams,currentTeamIndex,usedQuestionIds,activeQuestion,questionOwnerIndex,answeringTeamIndex,timerPaused,questionDeadlineAt,reveal,hintVisible,optionsVisible,doubleActive,timeBonusActive,stealMode,finishReason]);

  // Keep online lobby settings visible to everyone before the host starts.
  useEffect(()=>{if(playMode!=="online"||!onlineRoom?.id||!onlineHost||onlineRoom.status!=="lobby")return;const timer=setTimeout(()=>void updateMajlisOnlineLobby(onlineRoom.id,teamCount,teamNames.slice(0,teamCount),selectedCategoryIds).catch(()=>{}),450);return()=>clearTimeout(timer);},[playMode,onlineRoom?.id,onlineRoom?.status,onlineHost,teamCount,teamNames,selectedCategoryIds]);

  function toggleSound(){const next=!soundOn;setSoundOn(next);setMajlisSoundEnabled(next);if(next)playMajlisSound("tap");}
  function setMode(mode:MajlisPlayMode){if(phase!=="setup"||onlineRoom)return;setPlayMode(mode);setError("");playMajlisSound("tap");}
  function toggleCategory(id:string){if(!settings||(playMode==="online"&&onlineRoom&&!onlineHost))return;playMajlisSound("tap");majlisHaptic();setSelectedCategoryIds(current=>{if(current.includes(id))return current.filter(item=>item!==id);if(current.length>=settings.categoriesPerGame)return current;return[...current,id];});}

  async function createOnline(){if(!isLoggedIn||!secureSession){setError("سجّل الدخول بحسابك أولًا لاستخدام مجلس التحدي أونلاين.");return;}try{setOnlineBusy(true);setError("");const {room}=await createMajlisOnlineRoom(teamCount,teamNames.slice(0,teamCount));setOnlineRoom(room);setSelectedCategoryIds(current=>current.slice(0,settings?.categoriesPerGame||6));playMajlisSound("start");}catch(e){setError(e instanceof Error?e.message:"تعذر إنشاء المجلس.");}finally{setOnlineBusy(false);}}
  async function joinOnline(){if(!isLoggedIn||!secureSession){setError("سجّل الدخول بحسابك أولًا للانضمام إلى مجلس أونلاين.");return;}const code=roomCodeInput.replace(/\D/g,"").slice(0,6);if(code.length!==6){setError("اكتب كود المجلس المكوّن من 6 أرقام.");return;}try{setOnlineBusy(true);setError("");const {room}=await joinMajlisOnlineRoom(code);setOnlineRoom(room);setTeamCount(room.teamCount);setTeamNames(current=>current.map((name,i)=>room.teamNames[i]||name));setSelectedCategoryIds(room.selectedCategoryIds);if(room.session&&room.publicState){setSession(room.session);setPhase(room.publicState.phase);}playMajlisSound("start");}catch(e){setError(e instanceof Error?e.message:"تعذر دخول المجلس.");}finally{setOnlineBusy(false);}}
  async function leaveOnline(){if(!onlineRoom)return;try{if(onlineHost)await closeMajlisOnlineRoom(onlineRoom.id);else await leaveMajlisOnlineRoom(onlineRoom.id);}catch{}void exitGamePresentation();setOnlineRoom(null);setSession(null);setTeams([]);setPhase("setup");setError("");}
  async function chooseOnlineTeam(teamId:string){if(!onlineRoom)return;try{const {room}=await setMajlisOnlineTeam(onlineRoom.id,teamId);setOnlineRoom(room);playMajlisSound("tap");}catch(e){setError(e instanceof Error?e.message:"تعذر تغيير الفريق.");}}

  function createdTeamsFor(count=teamCount,names=teamNames):Team[]{return Array.from({length:count},(_,index)=>({id:`team-${index+1}`,name:names[index]?.trim()||`الفريق ${index+1}`,score:0,accent:TEAM_COLORS[index],assists:{hint:true,time:true,double:true,options:true}}));}
  async function startGame(){if(!settings||selectedCategoryIds.length!==settings.categoriesPerGame)return;const presentationPromise=enterGamePresentation();try{setStarting(true);setError("");let payload:MajlisGameStartResponse;if(playMode==="online"){if(!onlineRoom||!onlineHost)throw new Error("بدء المجلس متاح للمضيف فقط.");const result=await startMajlisOnlineGame(onlineRoom.id,selectedCategoryIds,teamCount,teamNames.slice(0,teamCount));payload=result.session;setOnlineRoom(result.room);setTeams(result.room.publicState?.teams||createdTeamsFor());}else{const response=await fetch("/api/games/majlis",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"start",categoryIds:selectedCategoryIds})});const result=await response.json().catch(()=>({})) as MajlisGameStartResponse&{error?:string};if(!response.ok)throw new Error(result.error||"تعذر بدء المجلس.");payload=result;setTeams(createdTeamsFor());}setSession(payload);setCurrentTeamIndex(0);setUsedQuestionIds([]);setPhase("board");setFinishReason("complete");playMajlisSound("start");majlisHaptic("success");void presentationPromise;window.setTimeout(()=>document.getElementById("majlis-board")?.scrollIntoView({behavior:reduceMotion?"auto":"smooth",block:"start"}),80);}catch(e){void exitGamePresentation();setError(e instanceof Error?e.message:"تعذر بدء المجلس.");}finally{setStarting(false);}}

  function openQuestion(question:MajlisClientQuestion){if(!canControl||!session||usedSet.has(question.id)||!currentTeam)return;playMajlisSound("question");majlisHaptic();const seconds=session.settings.questionSeconds;setQuestionOwnerIndex(currentTeamIndex);setAnsweringTeamIndex(currentTeamIndex);setActiveQuestion(question);setSecondsLeft(seconds);setTimerPaused(false);setQuestionDeadlineAt(Date.now()+seconds*1000);setReveal(null);setHintVisible(false);setOptionsVisible(false);setDoubleActive(false);setTimeBonusActive(false);setStealMode(false);}
  async function revealAnswer(){if(!canControl||!activeQuestion||!session||reveal)return;try{setRevealing(true);setTimerPaused(true);setQuestionDeadlineAt(null);const response=await fetch("/api/games/majlis",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"reveal",sessionId:session.sessionId,questionId:activeQuestion.id})});const payload=await response.json().catch(()=>({})) as MajlisReveal&{error?:string};if(!response.ok)throw new Error(payload.error||"تعذر إظهار الإجابة.");setReveal(payload);playMajlisSound("reveal");}catch(e){setError(e instanceof Error?e.message:"تعذر إظهار الإجابة.");}finally{setRevealing(false);}}
  function toggleTimerPause(){if(!canControl||!activeQuestion||reveal)return;if(timerPaused){setQuestionDeadlineAt(Date.now()+secondsLeft*1000);setTimerPaused(false);}else{setQuestionDeadlineAt(null);setTimerPaused(true);}}
  function useAssist(type:keyof Team["assists"]){if(!canControl||!activeQuestion||!answeringTeam||reveal||stealMode||!answeringTeam.assists[type])return;playMajlisSound("tap");majlisHaptic();setTeams(current=>current.map((team,index)=>index===answeringTeamIndex?{...team,assists:{...team.assists,[type]:false}}:team));if(type==="hint")setHintVisible(true);if(type==="options")setOptionsVisible(true);if(type==="time"){setTimeBonusActive(true);setSecondsLeft(value=>value+15);setQuestionDeadlineAt(deadline=>deadline?deadline+15000:Date.now()+(secondsLeft+15)*1000);}if(type==="double")setDoubleActive(true);}
  function offerSteal(){if(!canControl||!activeQuestion||!session?.settings.allowSteal||reveal||teams.length<2)return;const next=(answeringTeamIndex+1)%teams.length;const secs=session.settings.stealSeconds;setAnsweringTeamIndex(next);setStealMode(true);setDoubleActive(false);setTimeBonusActive(false);setHintVisible(false);setOptionsVisible(false);setSecondsLeft(secs);setTimerPaused(false);setQuestionDeadlineAt(Date.now()+secs*1000);playMajlisSound("steal");majlisHaptic();}
  function closeQuestionAfterResult(correct:boolean){if(!canControl||!activeQuestion)return;const award=correct?activeQuestion.points*(doubleActive?2:1):0;if(award>0){setTeams(current=>current.map((team,index)=>index===answeringTeamIndex?{...team,score:team.score+award}:team));playMajlisSound("correct");majlisHaptic("success");}else{playMajlisSound("wrong");majlisHaptic("error");}const nextUsed=[...usedQuestionIds,activeQuestion.id];setUsedQuestionIds(nextUsed);setCurrentTeamIndex((questionOwnerIndex+1)%teams.length);setActiveQuestion(null);setReveal(null);setHintVisible(false);setOptionsVisible(false);setDoubleActive(false);setTimeBonusActive(false);setStealMode(false);setTimerPaused(false);setQuestionDeadlineAt(null);if(nextUsed.length>=totalBoardQuestions){setFinishReason("complete");setPhase("finished");playMajlisSound("finish");}}
  async function closeLocalServerSession(sessionId?: string | null){if(!sessionId)return;await fetch("/api/games/majlis",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"closeSession",sessionId})}).catch(()=>undefined);}
  async function finishNow(){
    if(!canControl)return;
    if(!window.confirm("إنهاء مجلس التحدي؟ ستُحذف الجلسة الحالية وتعود مباشرة لإعداد مجلس جديد."))return;
    try{
      if(playMode==="online"&&onlineRoom&&onlineHost)await closeMajlisOnlineRoom(onlineRoom.id);
      else if(playMode==="local")await closeLocalServerSession(session?.sessionId);
    }catch{}
    await exitGamePresentation();
    localStorage.removeItem(STORAGE_KEY);setOnlineRoom(null);setSession(null);setTeams([]);setUsedQuestionIds([]);setCurrentTeamIndex(0);setActiveQuestion(null);setReveal(null);setHintVisible(false);setOptionsVisible(false);setPhase("setup");setFinishReason("complete");setQuestionDeadlineAt(null);playMajlisSound("tap");
    window.setTimeout(()=>document.getElementById("majlis-setup")?.scrollIntoView({behavior:reduceMotion?"auto":"smooth",block:"start"}),50);
  }
  async function resetSession(){
    if(playMode==="local")await closeLocalServerSession(session?.sessionId);
    else if(playMode==="online"&&onlineRoom)await leaveOnline();
    await exitGamePresentation();
    localStorage.removeItem(STORAGE_KEY);setSession(null);setTeams([]);setUsedQuestionIds([]);setCurrentTeamIndex(0);setActiveQuestion(null);setQuestionOwnerIndex(0);setAnsweringTeamIndex(0);setSecondsLeft(0);setTimerPaused(false);setQuestionDeadlineAt(null);setReveal(null);setHintVisible(false);setOptionsVisible(false);setDoubleActive(false);setTimeBonusActive(false);setStealMode(false);setPhase("setup");setFinishReason("complete");playMajlisSound("tap");window.setTimeout(()=>document.getElementById("majlis-setup")?.scrollIntoView({behavior:reduceMotion?"auto":"smooth",block:"start"}),50);
  }

  const sortedTeams=useMemo(()=>[...teams].sort((a,b)=>b.score-a.score),[teams]); const topScore=sortedTeams[0]?.score??0; const winners=sortedTeams.filter(team=>team.score===topScore); const progress=totalBoardQuestions?Math.round((usedQuestionIds.length/totalBoardQuestions)*100):0;
  const onlinePlayers: Array<MajlisOnlineRoom["players"][string]> = onlineRoom ? Object.values(onlineRoom.players) as Array<MajlisOnlineRoom["players"][string]> : []; const myOnlinePlayer=user?.id&&onlineRoom?onlineRoom.players[user.id]:null;

  if(loading&&!categories.length&&!session)return <section className={styles.shell}><LoadingBlock/></section>;
  return <section className={styles.shell} dir="rtl">
    <div className={cn(styles.saduBand,"h-2 w-full opacity-80")} aria-hidden="true"/>
    <div className="p-3 sm:p-4 md:p-6">
      <div className="flex min-w-0 items-center justify-between gap-3 rounded-[22px] border border-[#ead8ad]/10 bg-black/15 px-3 py-2.5 sm:px-4">
        <div className="min-w-0"><div className="flex items-center gap-2 text-[#d6b16b]"><Coffee className="h-4 w-4"/><span className="text-[10px] font-black">مجلس التحدي</span>{playMode==="online"?<span className="rounded-full bg-[#7fb3a8]/10 px-2 py-0.5 text-[8px] text-[#bfe2d8]">أونلاين</span>:null}</div><p className="mt-0.5 truncate text-xs font-bold text-[#f7efdc]/52">{phase==="setup"?`${formatNumber(totalQuestions)} سؤال في البنك`: `${usedQuestionIds.length} / ${totalBoardQuestions} سؤال`}</p></div>
        <div className="flex shrink-0 items-center gap-1.5"><button type="button" onClick={toggleSound} aria-label={soundOn?"إيقاف أصوات اللعبة":"تشغيل أصوات اللعبة"} className="grid h-11 w-11 place-items-center rounded-2xl border border-[#ead8ad]/10 bg-white/[0.04] text-[#ead8ad]">{soundOn?<Volume2 className="h-4 w-4"/>:<VolumeX className="h-4 w-4"/>}</button>{phase!=="setup"&&canControl?<button type="button" onClick={finishNow} className="inline-flex min-h-11 items-center gap-1.5 rounded-2xl border border-rose-200/15 bg-rose-400/[0.06] px-3 text-[10px] font-black text-rose-100"><X className="h-4 w-4"/> إنهاء</button>:null}{onlineRoom?<button type="button" onClick={()=>void leaveOnline()} aria-label="الخروج من المجلس" className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/50"><DoorOpen className="h-4 w-4"/></button>:null}</div>
      </div>
      {error?<div role="alert" className="mt-3 rounded-2xl border border-rose-200/15 bg-rose-400/[0.08] p-3 text-xs font-bold leading-6 text-rose-100">{error}</div>:null}

      {phase==="setup"?<div id="majlis-setup" className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-[22px] border border-[#ead8ad]/10 bg-black/15 p-2">
          <button type="button" disabled={Boolean(onlineRoom)} onClick={()=>setMode("local")} className={cn("min-h-12 rounded-2xl border text-xs font-black",playMode==="local"?"border-[#d6b16b]/45 bg-[#d6b16b] text-[#173b35]":"border-transparent bg-white/[.03] text-[#f7efdc]/52")}><Coffee className="mx-auto mb-1 h-4 w-4"/>مجلس محلي</button>
          <button type="button" disabled={Boolean(onlineRoom)} onClick={()=>setMode("online")} className={cn("min-h-12 rounded-2xl border text-xs font-black",playMode==="online"?"border-[#7fb3a8]/45 bg-[#7fb3a8] text-[#102d2b]":"border-transparent bg-white/[.03] text-[#f7efdc]/52")}><Wifi className="mx-auto mb-1 h-4 w-4"/>مجلس أونلاين</button>
        </div>

        {playMode==="online"&&!onlineRoom?<div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-[26px] border border-[#7fb3a8]/18 bg-[#7fb3a8]/[.055] p-4"><div className="flex items-center gap-2 text-[#bfe2d8]"><UsersRound className="h-5 w-5"/><h3 className="font-black">أنشئ مجلسًا</h3></div><p className="mt-2 text-[10px] font-bold leading-5 text-[#f7efdc]/42">أنت المضيف: تختار الفئات، تدير الأسئلة والنتيجة، ويشارك كل لاعب من جهازه.</p><button type="button" disabled={onlineBusy||!isLoggedIn||!secureSession} onClick={()=>void createOnline()} className="mt-3 min-h-12 w-full rounded-2xl bg-[#7fb3a8] text-xs font-black text-[#102d2b] disabled:opacity-35">{onlineBusy?"جاري الإنشاء…":"إنشاء مجلس أونلاين"}</button></div>
          <div className="rounded-[26px] border border-[#d6b16b]/18 bg-[#d6b16b]/[.05] p-4"><div className="flex items-center gap-2 text-[#ead8ad]"><Radio className="h-5 w-5"/><h3 className="font-black">انضم بكود</h3></div><input inputMode="numeric" dir="ltr" value={roomCodeInput} onChange={e=>setRoomCodeInput(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000" className="mt-3 h-12 w-full rounded-2xl border border-[#ead8ad]/10 bg-black/20 px-4 text-center text-xl font-black tracking-[.28em] text-[#f7efdc] outline-none"/><button type="button" disabled={onlineBusy||roomCodeInput.length!==6||!isLoggedIn||!secureSession} onClick={()=>void joinOnline()} className="mt-2 min-h-12 w-full rounded-2xl bg-[#d6b16b] text-xs font-black text-[#173b35] disabled:opacity-35">دخول المجلس</button></div>
          {!isLoggedIn||!secureSession?<p className="lg:col-span-2 rounded-2xl border border-amber-200/10 bg-amber-300/[.05] p-3 text-[10px] font-bold text-amber-100/70">الأونلاين يحتاج تسجيل دخول آمن حتى نعرف كل لاعب ونفصل صوت فريقه.</p>:null}
        </div>:null}

        {playMode==="online"&&onlineRoom?<div className="space-y-3">
          <div className="rounded-[26px] border border-[#d6b16b]/18 bg-black/18 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[9px] font-black text-[#d6b16b]">كود المجلس</p><div className="mt-1 flex items-center gap-2"><strong dir="ltr" className="text-2xl font-black tracking-[.16em] text-[#f7efdc]">{onlineRoom.roomCode}</strong><button type="button" onClick={()=>void navigator.clipboard?.writeText(onlineRoom.roomCode)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/50"><Copy className="h-4 w-4"/></button></div></div><div className="rounded-full border border-[#7fb3a8]/15 bg-[#7fb3a8]/[.07] px-3 py-1.5 text-[9px] font-black text-[#bfe2d8]">{onlinePlayers.length} لاعب</div></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">{Array.from({length:onlineRoom.teamCount},(_,index)=>{const id=`team-${index+1}`;const players=onlinePlayers.filter(p=>p.teamId===id);const mine=myOnlinePlayer?.teamId===id;return <button type="button" key={id} disabled={onlineRoom.status!=="lobby"} onClick={()=>void chooseOnlineTeam(id)} className={cn("min-h-[76px] rounded-[18px] border p-3 text-right",mine?"border-[#d6b16b]/42 bg-[#d6b16b]/[.09]":"border-white/8 bg-white/[.025]")}><div className="flex items-center justify-between gap-2"><strong className="text-xs font-black text-[#f7efdc]">{onlineRoom.teamNames[index]}</strong>{mine?<Check className="h-4 w-4 text-[#d6b16b]"/>:null}</div><p className="mt-1 truncate text-[9px] font-bold text-[#f7efdc]/38">{players.length?players.map(p=>p.userName).join(" · "):"بانتظار لاعبين"}</p></button>})}</div>
          </div>
          <VoiceControls room={onlineRoom} userId={user?.id}/>
          {!onlineHost?<div className="rounded-[22px] border border-[#ead8ad]/10 bg-black/15 p-4 text-center"><LoaderCircle className="mx-auto h-5 w-5 animate-spin text-[#d6b16b]"/><p className="mt-2 text-xs font-black text-[#f7efdc]/58">بانتظار المضيف يجهّز الفئات ويبدأ المجلس…</p></div>:null}
        </div>:null}

        {(playMode==="local"||onlineHost)?<div className="grid gap-3 lg:grid-cols-[.8fr_1.2fr]">
          <div className="rounded-[28px] border border-[#ead8ad]/12 bg-black/15 p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black text-[#d6b16b]">أهل المجلس</p><h2 className="mt-1 text-xl font-black text-[#f7efdc]">جهّز الفرق</h2></div><Swords className="h-6 w-6 text-[#ead8ad]/70"/></div><div className="mt-4 grid grid-cols-3 gap-2">{[2,3,4].map(count=><button key={count} type="button" onClick={()=>{setTeamCount(count);playMajlisSound("tap");}} className={cn("min-h-11 rounded-2xl border text-xs font-black",teamCount===count?"border-[#d6b16b]/45 bg-[#d6b16b] text-[#173b35]":"border-[#ead8ad]/10 bg-white/[0.035] text-[#f7efdc]/55")}>{count} فرق</button>)}</div><div className="mt-3 space-y-2">{Array.from({length:teamCount},(_,index)=><label key={index} className="flex items-center gap-2 rounded-2xl border border-[#ead8ad]/10 bg-black/15 p-2"><span className="h-8 w-1.5 rounded-full" style={{background:TEAM_COLORS[index]}}/><input value={teamNames[index]} onChange={e=>setTeamNames(current=>current.map((name,i)=>i===index?e.target.value.slice(0,24):name))} className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm font-black text-[#f7efdc] outline-none" aria-label={`اسم الفريق ${index+1}`}/></label>)}</div><div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">{[{icon:Lightbulb,label:"مشورة",text:"تلميح"},{icon:Hourglass,label:"مهلة",text:"+15ث"},{icon:Crown,label:"الدبل",text:"×2"},{icon:ListChecks,label:"اختيارات",text:"مرة واحدة"}].map(item=><div key={item.label} className="rounded-2xl border border-[#ead8ad]/10 bg-white/[0.035] p-2.5"><item.icon className="mx-auto h-4 w-4 text-[#d6b16b]"/><div className="mt-1 text-[10px] font-black text-[#f7efdc]">{item.label}</div><div className="text-[9px] font-bold text-[#f7efdc]/35">{item.text} مرة</div></div>)}</div></div>
          <div className="rounded-[28px] border border-[#ead8ad]/12 bg-black/15 p-4 sm:p-5"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-[10px] font-black text-[#d6b16b]">مجالات المجلس</p><h2 className="mt-1 text-xl font-black text-[#f7efdc]">اختر {settings?.categoriesPerGame||6} فئات</h2></div><div className="rounded-full border border-[#ead8ad]/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black text-[#ead8ad]">{selectedCategoryIds.length}/{settings?.categoriesPerGame||6}</div></div><div className="mt-4 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">{categories.map(category=>{const selected=selectedCategoryIds.includes(category.id);return <button key={category.id} type="button" onClick={()=>toggleCategory(category.id)} aria-pressed={selected} className={cn("relative min-h-[112px] min-w-0 overflow-hidden rounded-[22px] border p-3 text-right active:scale-[.985]",selected?"border-[#d6b16b]/45 bg-[#d6b16b]/[0.10]":"border-[#ead8ad]/10 bg-white/[0.03]")}><div className="flex items-start justify-between gap-2"><span className="text-2xl">{category.icon}</span>{selected?<span className="grid h-6 w-6 place-items-center rounded-full bg-[#d6b16b] text-[#173b35]"><Check className="h-3.5 w-3.5"/></span>:null}</div><div className="mt-2 truncate text-xs font-black text-[#f7efdc] sm:text-sm">{category.title}</div><div className="mt-1 text-[9px] font-bold text-[#f7efdc]/36" dir="ltr">{category.activeQuestions}+ سؤال</div></button>})}</div><button type="button" onClick={startGame} disabled={starting||!settings||selectedCategoryIds.length!==settings.categoriesPerGame} className="mt-4 inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[20px] bg-[#d6b16b] px-5 text-sm font-black text-[#173b35] disabled:opacity-40">{starting?<LoaderCircle className="h-5 w-5 animate-spin"/>:<Dices className="h-5 w-5"/>}{starting?"جاري تجهيز الأسئلة…":"ابدأ مجلس التحدي"}</button></div>
        </div>:null}
      </div>:null}

      {phase==="board"&&session?<div id="majlis-board" className={styles.gameViewport}>
        {!isLandscape?<div className={styles.rotateOverlay}><div className={styles.rotateCard}><RotateCw className="mx-auto h-10 w-10 text-[#d6b16b]"/><h2>لف الجهاز بالعرض</h2><p>لوحة مجلس التحدي مصممة لتظهر الفئات الست كاملة في شاشة واحدة.</p><button type="button" onClick={()=>void enterGamePresentation()} className="mt-4 min-h-11 rounded-2xl bg-[#d6b16b] px-5 text-xs font-black text-[#173b35]">فتح ملء الشاشة</button></div></div>:null}
        <div className={styles.gameHud}>
          <div className={styles.hudBrand}><Coffee className="h-4 w-4"/><strong>مجلس التحدي</strong><span>{currentTeam?.name} يختار</span></div>
          <div className={styles.scoreStrip}>{teams.map((team,index)=><div key={team.id} className={cn(styles.scoreChip,index===currentTeamIndex&&styles.scoreChipActive)} style={{"--team":team.accent} as CSSProperties}><span>{team.name}</span><b dir="ltr">{formatNumber(team.score)}</b></div>)}</div>
          <div className={styles.hudActions}><button type="button" onClick={toggleSound} aria-label={soundOn?"إيقاف الصوت":"تشغيل الصوت"}>{soundOn?<Volume2/>:<VolumeX/>}</button>{canControl?<button type="button" onClick={()=>void finishNow()} className={styles.endButton}><X/> <span>إنهاء</span></button>:null}</div>
        </div>
        {playMode==="online"&&onlineRoom?<div className={styles.voiceDock}><VoiceControls room={onlineRoom} userId={user?.id} compact/></div>:null}
        <div className={styles.boardGrid}>{session.categories.map(category=>{const questions=session.board[category.id]||[];const remaining=questions.filter(q=>!usedSet.has(q.id)).length;return <article key={category.id} className={styles.boardCategory} style={{"--category":category.accent} as CSSProperties}><div className={styles.categoryHead}><span>{category.icon}</span><div><h3>{category.title}</h3><small>باقي {remaining}</small></div></div><div className={styles.questionTiles}>{questions.map(question=>{const used=usedSet.has(question.id);return <button key={question.id} type="button" disabled={used||!canControl} onClick={()=>openQuestion(question)} className={cn(styles.questionTile,question.difficulty==="hard"&&styles.questionTileHard,used&&styles.questionTileUsed)}>{used?<Check className="h-4 w-4"/>:<span dir="ltr">{formatNumber(question.points)}</span>}</button>})}</div></article>})}</div>
        <div className={styles.progressLine}><span style={{width:`${progress}%`}}/></div>
      </div>:null}

      {phase==="finished"?<div className="mt-4 overflow-hidden rounded-[30px] border border-[#d6b16b]/25 bg-black/20 p-5 text-center sm:p-7"><Trophy className="mx-auto h-10 w-10 text-[#d6b16b]"/><p className="mt-2 text-[10px] font-black text-[#d6b16b]">{finishReason==="complete"?"اكتملت أسئلة مجلس التحدي":"انتهى المجلس"}</p><h2 className="mt-2 text-2xl font-black text-[#f7efdc] sm:text-3xl">{winners.length===1?`الفائز: ${winners[0]?.name}`:"تعادل في الصدارة"}</h2><div className="mx-auto mt-5 grid max-w-2xl gap-2 sm:grid-cols-2">{sortedTeams.map((team,index)=><div key={team.id} className={cn("flex items-center justify-between rounded-[20px] border p-3 text-right",index===0?"border-[#d6b16b]/35 bg-[#d6b16b]/[0.08]":"border-[#ead8ad]/10 bg-white/[0.03]")}><div className="flex items-center gap-2">{index===0?<Crown className="h-4 w-4 text-[#d6b16b]"/>:<Medal className="h-4 w-4 text-[#f7efdc]/35"/>}<span className="text-xs font-black text-[#f7efdc]">{team.name}</span></div><span dir="ltr" className="text-lg font-black text-[#d6b16b]">{formatNumber(team.score)}</span></div>)}</div>{canControl?<button type="button" onClick={()=>void resetSession()} className="mt-5 inline-flex min-h-[50px] items-center gap-2 rounded-[18px] bg-[#d6b16b] px-6 text-sm font-black text-[#173b35]"><RotateCcw className="h-4 w-4"/> مجلس جديد</button>:<p className="mt-4 text-xs font-black text-[#f7efdc]/42">بانتظار المضيف لبدء مجلس جديد.</p>}</div>:null}
    </div>

    <AnimatePresence>{activeQuestion&&session?<motion.div className={styles.questionOverlay} initial={reduceMotion?false:{opacity:0}} animate={{opacity:1}} exit={reduceMotion?undefined:{opacity:0}}><motion.div className={styles.questionPanel} initial={reduceMotion?false:{y:20,scale:.985}} animate={{y:0,scale:1}} exit={reduceMotion?undefined:{y:12,scale:.99}} transition={{duration:.22}}><div className={cn(styles.saduBand,"h-2 w-full opacity-75")}/><div className="p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#ead8ad]/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black text-[#f7efdc]/55">{difficultyLabel(activeQuestion.difficulty)}</span><span className="rounded-full border border-[#d6b16b]/20 bg-[#d6b16b]/[0.08] px-2.5 py-1 text-[10px] font-black text-[#d6b16b]" dir="ltr">{activeQuestion.points}{doubleActive?" ×2":""}</span>{stealMode?<span className="rounded-full border border-[#7fb3a8]/20 bg-[#7fb3a8]/[0.08] px-2.5 py-1 text-[9px] font-black text-[#bfe2d8]">فزعة للفريق التالي</span>:null}</div><p className="mt-2 text-xs font-black text-[#f7efdc]/52">الدور الآن: <span className="text-[#ead8ad]">{answeringTeam?.name}</span></p></div><div className={cn(styles.timerRing,"relative grid h-16 w-16 shrink-0 place-items-center rounded-full p-[5px]")} style={{"--ring-progress":`${Math.max(0,Math.min(100,(secondsLeft/(stealMode?session.settings.stealSeconds:session.settings.questionSeconds+(timeBonusActive?15:0)))*100))}%`,"--ring-color":secondsLeft<=5?"#c77a62":"#d2aa61"} as CSSProperties}><div className="grid h-full w-full place-items-center rounded-full bg-[#102d2b] text-lg font-black text-[#f7efdc]" dir="ltr">{secondsLeft}</div></div></div>
      <div className={styles.questionBody}>
        <h2 className={styles.questionTitle}>{activeQuestion.prompt}</h2>
        {activeQuestion.quoteText?<blockquote className={styles.quranQuote}>{activeQuestion.quoteText}</blockquote>:null}
        {activeQuestion.type==="audio"?<div className="mt-3"><AudioQuestionPlayer question={activeQuestion}/></div>:null}
        {activeQuestion.type==="speech"?<div className="mt-3"><SpeechQuestionPlayer question={activeQuestion}/></div>:null}
        {optionsVisible&&activeQuestion.options?.length?<div className={styles.optionsGrid}>{activeQuestion.options.map((option,index)=><div key={`${option}-${index}`} className={styles.optionCard}><span dir="ltr">{index+1}</span>{option}</div>)}</div>:null}
        {hintVisible&&activeQuestion.hint?<div className={styles.hintBox}><Lightbulb className="ml-1 inline h-4 w-4"/> {activeQuestion.hint}</div>:null}
      </div>
      {!canControl&&!reveal?<div className="mt-3 rounded-[18px] border border-[#7fb3a8]/15 bg-[#7fb3a8]/[.06] p-3 text-center text-[10px] font-black text-[#bfe2d8]">المضيف يدير السؤال والمؤقت. تشاور مع فريقك بالمايك «فريقي» بدون أن يسمعكم الفريق المقابل.</div>:null}
      {canControl&&!reveal?<><div className="mt-3 grid grid-cols-4 gap-2">{[{key:"hint" as const,icon:Lightbulb,label:"مشورة",disabled:!answeringTeam?.assists.hint||!activeQuestion.hint},{key:"time" as const,icon:Hourglass,label:"+15 ثانية",disabled:!answeringTeam?.assists.time},{key:"double" as const,icon:Crown,label:"دبل",disabled:!answeringTeam?.assists.double||doubleActive},{key:"options" as const,icon:ListChecks,label:"اختيارات",disabled:!answeringTeam?.assists.options||!activeQuestion.options?.length||optionsVisible}].map(assist=><button key={assist.key} type="button" disabled={assist.disabled||stealMode} onClick={()=>useAssist(assist.key)} className="min-h-[50px] rounded-[16px] border border-[#ead8ad]/10 bg-white/[0.035] px-2 text-[10px] font-black text-[#f7efdc]/65 disabled:opacity-25"><assist.icon className="mx-auto mb-1 h-4 w-4 text-[#d6b16b]"/>{assist.label}</button>)}</div><div className="mt-3 grid gap-2 sm:grid-cols-2"><button type="button" onClick={revealAnswer} disabled={revealing} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] bg-[#d6b16b] px-4 text-sm font-black text-[#173b35]">{revealing?<LoaderCircle className="h-4 w-4 animate-spin"/>:<Eye className="h-4 w-4"/>} إظهار الإجابة</button>{session.settings.allowSteal&&teams.length>1&&!stealMode?<button type="button" onClick={offerSteal} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] border border-[#7fb3a8]/22 bg-[#7fb3a8]/[0.08] px-4 text-sm font-black text-[#bfe2d8]"><HandHelping className="h-4 w-4"/> فزعة للفريق التالي</button>:null}</div><button type="button" onClick={toggleTimerPause} className="mx-auto mt-2 flex min-h-10 items-center gap-1.5 px-3 text-[10px] font-black text-[#f7efdc]/38">{timerPaused?<Play className="h-3.5 w-3.5"/>:<Pause className="h-3.5 w-3.5"/>}{timerPaused?"استئناف المؤقت":"إيقاف المؤقت مؤقتًا"}</button></>:null}
      {reveal?<div className="mt-4"><div className="rounded-[24px] border border-[#d6b16b]/24 bg-[#d6b16b]/[0.08] p-4 sm:p-5"><div className="flex items-center gap-2 text-[10px] font-black text-[#d6b16b]"><EyeOff className="h-4 w-4"/> الإجابة</div><div className="mt-2 text-xl font-black text-[#f7efdc] sm:text-2xl">{reveal.answer}</div>{session.settings.showExplanations&&reveal.explanation?<p className="mt-2 text-xs font-semibold leading-6 text-[#f7efdc]/52">{reveal.explanation}</p>:null}{reveal.sourceLabel?<p className="mt-2 text-[9px] font-bold text-[#f7efdc]/28">المصدر: {reveal.sourceLabel}</p>:null}</div>{canControl?<div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={()=>closeQuestionAfterResult(true)} className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-[18px] bg-[#7fb3a8] px-4 text-sm font-black text-[#102d2b]"><Check className="h-5 w-5"/> إجابة صحيحة</button><button type="button" onClick={()=>closeQuestionAfterResult(false)} className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-[18px] bg-[#8d4939] px-4 text-sm font-black text-[#f7efdc]"><X className="h-5 w-5"/> إجابة خاطئة</button></div>:null}</div>:null}
    </div></motion.div></motion.div>:null}</AnimatePresence>
  </section>;
}
