"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sendVocabularyVoiceSignal } from "@/lib/vocabularyChallengeClient";
import type { VocabularyChallengeRoom } from "@/types/vocabularyChallenge";

type VoiceConnectionState = "off" | "connecting" | "connected" | "error" | "unsupported";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function waitForIceGatheringComplete(pc: RTCPeerConnection, timeoutMs = 4200) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      pc.removeEventListener("icegatheringstatechange", handleState);
      window.clearTimeout(timeout);
      resolve();
    };
    const handleState = () => {
      if (pc.iceGatheringState === "complete") finish();
    };
    const timeout = window.setTimeout(finish, timeoutMs);
    pc.addEventListener("icegatheringstatechange", handleState);
  });
}

function voiceErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") return "تم رفض إذن الميكروفون. فعّله من إعدادات المتصفح ثم حاول مرة أخرى.";
  if (error instanceof DOMException && error.name === "NotFoundError") return "لم يتم العثور على ميكروفون على هذا الجهاز.";
  return error instanceof Error ? error.message : "تعذر تشغيل المحادثة الصوتية الآن.";
}

export function useVocabularyVoiceChat(room: VocabularyChallengeRoom | null, userId: string | undefined) {
  const supported = typeof window !== "undefined" && typeof RTCPeerConnection !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
  const [micEnabled, setMicEnabled] = useState(false);
  const [state, setState] = useState<VoiceConnectionState>(supported ? "off" : "unsupported");
  const [error, setError] = useState("");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const senderRef = useRef<RTCRtpSender | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const offerKeyRef = useRef("");
  const answerKeyRef = useRef("");
  const appliedAnswerRef = useRef("");
  const roomKeyRef = useRef("");

  const stopLocalMic = useCallback(async () => {
    const stream = localStreamRef.current;
    localStreamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());
    try {
      await senderRef.current?.replaceTrack(null);
    } catch {
      // Connection may already be closing.
    }
    setMicEnabled(false);
  }, []);

  const cleanup = useCallback(() => {
    void stopLocalMic();
    pcRef.current?.close();
    pcRef.current = null;
    senderRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }
    offerKeyRef.current = "";
    answerKeyRef.current = "";
    appliedAnswerRef.current = "";
    setState(supported ? "off" : "unsupported");
    setError("");
  }, [stopLocalMic, supported]);

  const ensurePeer = useCallback(() => {
    if (!supported) return null;
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const transceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
    senderRef.current = transceiver.sender;
    pc.ontrack = (event) => {
      const audio = remoteAudioRef.current || document.createElement("audio");
      audio.autoplay = true;
      audio.setAttribute("playsinline", "true");
      audio.volume = 1;
      audio.srcObject = event.streams[0] || new MediaStream([event.track]);
      remoteAudioRef.current = audio;
      void audio.play().catch(() => undefined);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setState("connected");
        setError("");
      } else if (pc.connectionState === "connecting" || pc.connectionState === "new") {
        setState("connecting");
      } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        setState("error");
        setError("تعذر تثبيت الاتصال الصوتي. جرّب إغلاق المايك وفتحه أو أعد المباراة.");
      }
    };
    pcRef.current = pc;
    setState("connecting");
    return pc;
  }, [supported]);

  useEffect(() => {
    if (!room || room.mode !== "duel" || room.status !== "playing" || !userId) {
      roomKeyRef.current = "";
      if (pcRef.current) cleanup();
      return;
    }

    const nextRoomKey = `${room.id}:${room.matchStartedAt || 0}`;
    if (roomKeyRef.current && roomKeyRef.current !== nextRoomKey) cleanup();
    roomKeyRef.current = nextRoomKey;

    const pc = ensurePeer();
    if (!pc) return;
    const isHost = room.hostId === userId;

    if (isHost) {
      const offerKey = `${room.id}:${room.matchStartedAt || 0}`;
      if (offerKeyRef.current !== offerKey) {
        offerKeyRef.current = offerKey;
        const sessionId = `${room.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        void (async () => {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await waitForIceGatheringComplete(pc);
            const sdp = pc.localDescription?.sdp || "";
            if (!sdp) throw new Error("تعذر تجهيز الاتصال الصوتي.");
            await sendVocabularyVoiceSignal(room.id, "offer", sessionId, sdp);
          } catch (voiceError) {
            offerKeyRef.current = "";
            setState("error");
            setError(voiceErrorMessage(voiceError));
          }
        })();
      }

      const answer = room.voiceAnswer;
      if (answer?.sdp && answer.sessionId && appliedAnswerRef.current !== answer.sessionId && pc.signalingState === "have-local-offer") {
        appliedAnswerRef.current = answer.sessionId;
        void pc.setRemoteDescription({ type: "answer", sdp: answer.sdp }).catch((voiceError) => {
          appliedAnswerRef.current = "";
          setState("error");
          setError(voiceErrorMessage(voiceError));
        });
      }
      return;
    }

    const offer = room.voiceOffer;
    if (!offer?.sdp || !offer.sessionId || answerKeyRef.current === offer.sessionId) return;
    answerKeyRef.current = offer.sessionId;
    void (async () => {
      try {
        if (pc.signalingState !== "stable") {
          cleanup();
          answerKeyRef.current = "";
          return;
        }
        await pc.setRemoteDescription({ type: "offer", sdp: offer.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await waitForIceGatheringComplete(pc);
        const sdp = pc.localDescription?.sdp || "";
        if (!sdp) throw new Error("تعذر تجهيز الرد الصوتي.");
        await sendVocabularyVoiceSignal(room.id, "answer", offer.sessionId, sdp);
      } catch (voiceError) {
        answerKeyRef.current = "";
        setState("error");
        setError(voiceErrorMessage(voiceError));
      }
    })();
  }, [cleanup, ensurePeer, room, userId]);

  useEffect(() => cleanup, [cleanup]);

  const toggleMic = useCallback(async () => {
    if (!supported) {
      setState("unsupported");
      setError("المحادثة الصوتية غير مدعومة في هذا المتصفح.");
      return;
    }
    const pc = ensurePeer();
    if (!pc) return;

    if (micEnabled) {
      await stopLocalMic();
      void remoteAudioRef.current?.play().catch(() => undefined);
      return;
    }

    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      const track = stream.getAudioTracks()[0];
      if (!track) throw new Error("لم يتم العثور على مسار صوتي.");
      localStreamRef.current = stream;
      await senderRef.current?.replaceTrack(track);
      track.enabled = true;
      setMicEnabled(true);
      if (pc.connectionState === "connected") setState("connected");
      else setState("connecting");
      void remoteAudioRef.current?.play().catch(() => undefined);
    } catch (voiceError) {
      await stopLocalMic();
      setState("error");
      setError(voiceErrorMessage(voiceError));
    }
  }, [ensurePeer, micEnabled, stopLocalMic, supported]);

  return {
    supported,
    micEnabled,
    state,
    error,
    toggleMic,
  };
}
