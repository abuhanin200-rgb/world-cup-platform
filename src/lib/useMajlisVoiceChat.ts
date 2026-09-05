"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getMajlisVoiceIce,
  getMajlisVoiceSignals,
  sendMajlisVoiceSignal,
  setMajlisVoiceMode,
} from "@/lib/majlisClient";
import type { MajlisOnlineRoom, MajlisVoiceMode, MajlisVoiceSignal } from "@/types/majlisGame";

type PeerEntry = {
  pc: RTCPeerConnection;
  sender: RTCRtpSender | null;
  clonedTrack: MediaStreamTrack | null;
  sessionId: string;
  makingOffer: boolean;
};

type VoiceState = "idle" | "connecting" | "connected" | "error";

function randomSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function waitForIce(pc: RTCPeerConnection, timeoutMs = 5000) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      pc.removeEventListener("icegatheringstatechange", check);
      clearTimeout(timer);
      resolve();
    };
    const check = () => {
      if (pc.iceGatheringState === "complete") finish();
    };
    const timer = setTimeout(finish, timeoutMs);
    pc.addEventListener("icegatheringstatechange", check);
  });
}

function sameTeam(room: MajlisOnlineRoom, a: string, b: string) {
  const first = room.players[a]?.teamId;
  const second = room.players[b]?.teamId;
  return Boolean(first && second && first === second);
}

export function useMajlisVoiceChat(room: MajlisOnlineRoom | null, userId?: string | null) {
  const [micMode, setMicModeState] = useState<MajlisVoiceMode>("off");
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState("");
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const [turnEnabled, setTurnEnabled] = useState(false);
  const peersRef = useRef(new Map<string, PeerEntry>());
  const remoteAudioRef = useRef(new Map<string, HTMLAudioElement>());
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceServersRef = useRef<RTCIceServer[]>([]);
  const processedSignalsRef = useRef(new Set<string>());
  const lastSignalAtRef = useRef(0);
  const roomRef = useRef<MajlisOnlineRoom | null>(room);

  roomRef.current = room;

  const supported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices !== "undefined" &&
    typeof navigator.mediaDevices.getUserMedia === "function" &&
    typeof window.RTCPeerConnection !== "undefined";

  const myPlayer = userId && room ? room.players[userId] : null;
  const teammates = useMemo(() => {
    if (!room || !userId) return [];
    return Object.values(room.players).filter((player) => player.userId !== userId && sameTeam(room, userId, player.userId));
  }, [room, userId]);

  const allPeers = useMemo(() => {
    if (!room || !userId) return [];
    return Object.values(room.players).filter((player) => player.userId !== userId);
  }, [room, userId]);

  useEffect(() => {
    if (myPlayer?.micMode) setMicModeState(myPlayer.micMode);
  }, [myPlayer?.micMode]);

  const canSendTo = useCallback((targetUserId: string, mode = micMode) => {
    const currentRoom = roomRef.current;
    if (!currentRoom || !userId) return false;
    if (mode === "all") return true;
    if (mode === "team") return sameTeam(currentRoom, userId, targetUserId);
    return false;
  }, [micMode, userId]);

  const applyTrackModes = useCallback((mode = micMode) => {
    for (const [targetUserId, entry] of peersRef.current) {
      if (entry.clonedTrack) entry.clonedTrack.enabled = canSendTo(targetUserId, mode);
    }
  }, [canSendTo, micMode]);

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    if (!supported) throw new Error("هذا المتصفح لا يدعم المحادثة الصوتية.");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
      video: false,
    });
    localStreamRef.current = stream;
    return stream;
  }, [supported]);

  const playRemoteAudios = useCallback(async () => {
    let blocked = false;
    for (const audio of remoteAudioRef.current.values()) {
      try { await audio.play(); } catch { blocked = true; }
    }
    setNeedsAudioUnlock(blocked);
  }, []);

  const ensureIce = useCallback(async () => {
    if (!room?.id) return [] as RTCIceServer[];
    if (iceServersRef.current.length) return iceServersRef.current;
    try {
      const config = await getMajlisVoiceIce(room.id);
      iceServersRef.current = config.iceServers;
      setTurnEnabled(config.turnEnabled);
      return config.iceServers;
    } catch {
      const fallback = [
        { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] },
      ];
      iceServersRef.current = fallback;
      setTurnEnabled(false);
      return fallback;
    }
  }, [room?.id]);

  const negotiate = useCallback(async (targetUserId: string) => {
    const currentRoom = roomRef.current;
    const entry = peersRef.current.get(targetUserId);
    if (!currentRoom || !userId || !entry || entry.makingOffer || entry.pc.signalingState === "closed") return;
    try {
      entry.makingOffer = true;
      entry.sessionId = randomSessionId();
      const offer = await entry.pc.createOffer({ iceRestart: entry.pc.iceConnectionState === "failed" });
      await entry.pc.setLocalDescription(offer);
      await waitForIce(entry.pc);
      const sdp = entry.pc.localDescription?.sdp;
      if (!sdp) return;
      await sendMajlisVoiceSignal(currentRoom.id, targetUserId, "offer", entry.sessionId, sdp);
      setState("connecting");
    } catch (cause) {
      console.warn("Majlis voice negotiate failed", cause);
      setState("error");
      setError("تعذر بدء الاتصال الصوتي. حاول مرة أخرى.");
    } finally {
      entry.makingOffer = false;
    }
  }, [userId]);

  const ensurePeer = useCallback(async (targetUserId: string) => {
    const currentRoom = roomRef.current;
    if (!currentRoom || !userId || targetUserId === userId) return null;
    const existing = peersRef.current.get(targetUserId);
    if (existing && existing.pc.signalingState !== "closed") {
      if (localStreamRef.current && !existing.sender) {
        const sourceTrack = localStreamRef.current.getAudioTracks()[0];
        if (sourceTrack) {
          const clone = sourceTrack.clone();
          clone.enabled = canSendTo(targetUserId);
          existing.clonedTrack = clone;
          existing.sender = existing.pc.addTrack(clone, new MediaStream([clone]));
          void negotiate(targetUserId);
        }
      }
      return existing;
    }

    const pc = new RTCPeerConnection({ iceServers: await ensureIce(), iceCandidatePoolSize: 4 });
    const entry: PeerEntry = { pc, sender: null, clonedTrack: null, sessionId: randomSessionId(), makingOffer: false };
    peersRef.current.set(targetUserId, entry);

    const sourceTrack = localStreamRef.current?.getAudioTracks()[0];
    if (sourceTrack) {
      const clone = sourceTrack.clone();
      clone.enabled = canSendTo(targetUserId);
      entry.clonedTrack = clone;
      entry.sender = pc.addTrack(clone, new MediaStream([clone]));
    } else {
      pc.addTransceiver("audio", { direction: "recvonly" });
    }

    pc.ontrack = (event) => {
      let audio = remoteAudioRef.current.get(targetUserId);
      if (!audio) {
        audio = document.createElement("audio");
        audio.autoplay = true;
        audio.setAttribute("playsinline", "true");
        remoteAudioRef.current.set(targetUserId, audio);
      }
      audio.srcObject = event.streams[0] || new MediaStream([event.track]);
      void audio.play().then(() => setNeedsAudioUnlock(false)).catch(() => setNeedsAudioUnlock(true));
    };

    pc.onconnectionstatechange = () => {
      const states = [...peersRef.current.values()].map((item) => item.pc.connectionState);
      if (states.includes("connected")) {
        setState("connected");
        setError("");
      } else if (states.includes("connecting") || states.includes("new")) {
        setState("connecting");
      } else if (states.length && states.every((item) => item === "failed" || item === "closed" || item === "disconnected")) {
        setState("error");
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed") void negotiate(targetUserId);
    };

    return entry;
  }, [canSendTo, ensureIce, negotiate, userId]);

  const handleSignal = useCallback(async (signal: MajlisVoiceSignal) => {
    const currentRoom = roomRef.current;
    if (!currentRoom || !userId || signal.targetUserId !== userId || signal.fromUserId === userId) return;
    if (processedSignalsRef.current.has(signal.id)) return;
    processedSignalsRef.current.add(signal.id);
    lastSignalAtRef.current = Math.max(lastSignalAtRef.current, signal.createdAt || 0);

    if (signal.kind === "reset") {
      const existing = peersRef.current.get(signal.fromUserId);
      existing?.clonedTrack?.stop();
      existing?.pc.close();
      peersRef.current.delete(signal.fromUserId);
      return;
    }

    const entry = await ensurePeer(signal.fromUserId);
    if (!entry || !signal.sdp) return;

    try {
      if (signal.kind === "offer") {
        if (entry.pc.signalingState !== "stable") {
          try { await entry.pc.setLocalDescription({ type: "rollback" }); } catch { /* browser may not support rollback */ }
        }
        await entry.pc.setRemoteDescription({ type: "offer", sdp: signal.sdp });
        const answer = await entry.pc.createAnswer();
        await entry.pc.setLocalDescription(answer);
        await waitForIce(entry.pc);
        const sdp = entry.pc.localDescription?.sdp;
        if (sdp) await sendMajlisVoiceSignal(currentRoom.id, signal.fromUserId, "answer", signal.sessionId, sdp);
      } else if (signal.kind === "answer" && entry.pc.signalingState === "have-local-offer") {
        await entry.pc.setRemoteDescription({ type: "answer", sdp: signal.sdp });
      }
    } catch (cause) {
      console.warn("Majlis voice signal failed", cause);
      setState("error");
      setError("تعذر إكمال الاتصال الصوتي مع أحد أعضاء المجلس.");
    }
  }, [ensurePeer, userId]);

  useEffect(() => {
    if (!room?.id || !userId || room.status === "closed") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const result = await getMajlisVoiceSignals(room.id, Math.max(0, lastSignalAtRef.current - 1000));
        for (const signal of result.signals) {
          if (cancelled) return;
          await handleSignal(signal);
        }
      } catch (cause) {
        if (!cancelled) console.warn("Majlis voice polling failed", cause);
      } finally {
        if (!cancelled) timer = setTimeout(poll, 850);
      }
    };
    void poll();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [handleSignal, room?.id, room?.status, userId]);

  useEffect(() => {
    if (!room || !userId) return;
    const currentIds = new Set(Object.keys(room.players).filter((id) => id !== userId));
    for (const [targetUserId, entry] of peersRef.current) {
      if (!currentIds.has(targetUserId)) {
        entry.clonedTrack?.stop();
        entry.pc.close();
        peersRef.current.delete(targetUserId);
        const audio = remoteAudioRef.current.get(targetUserId);
        if (audio) { audio.pause(); audio.srcObject = null; remoteAudioRef.current.delete(targetUserId); }
      }
    }
    applyTrackModes();
  }, [applyTrackModes, room, userId]);

  const setMode = useCallback(async (mode: MajlisVoiceMode) => {
    const currentRoom = roomRef.current;
    if (!currentRoom || !userId) return;
    try {
      setError("");
      if (mode !== "off") await ensureLocalStream();
      setMicModeState(mode);
      await setMajlisVoiceMode(currentRoom.id, mode);
      for (const player of Object.values(currentRoom.players)) {
        if (player.userId === userId) continue;
        await ensurePeer(player.userId);
      }
      applyTrackModes(mode);
      if (mode !== "off") {
        setState(peersRef.current.size ? "connecting" : "idle");
        for (const targetUserId of peersRef.current.keys()) void negotiate(targetUserId);
      }
      await playRemoteAudios();
    } catch (cause) {
      setMicModeState("off");
      applyTrackModes("off");
      setState("error");
      const message = cause instanceof Error && /permission|denied|notallowed/i.test(cause.message)
        ? "اسمح للمتصفح باستخدام الميكروفون ثم جرّب مرة أخرى."
        : "تعذر تشغيل الميكروفون على هذا الجهاز.";
      setError(message);
    }
  }, [applyTrackModes, ensureLocalStream, ensurePeer, negotiate, playRemoteAudios, userId]);

  useEffect(() => () => {
    for (const entry of peersRef.current.values()) {
      entry.clonedTrack?.stop();
      entry.pc.close();
    }
    peersRef.current.clear();
    for (const audio of remoteAudioRef.current.values()) { audio.pause(); audio.srcObject = null; }
    remoteAudioRef.current.clear();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
  }, []);

  return {
    supported,
    micMode,
    state,
    error,
    needsAudioUnlock,
    turnEnabled,
    teammates,
    peers: allPeers,
    setMode,
    unlockAudio: playRemoteAudios,
  };
}
