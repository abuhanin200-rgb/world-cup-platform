"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sendVocabularyVoiceSignal } from "@/lib/vocabularyChallengeClient";
import type { VocabularyChallengeRoom } from "@/types/vocabularyChallenge";

type VoiceConnectionState = "off" | "connecting" | "connected" | "error" | "unsupported";

function optionalTurnServer(): RTCIceServer | null {
  const rawUrls = process.env.NEXT_PUBLIC_VOCABULARY_TURN_URLS || "";
  const urls = rawUrls.split(",").map((value) => value.trim()).filter(Boolean);
  if (!urls.length) return null;
  const username = process.env.NEXT_PUBLIC_VOCABULARY_TURN_USERNAME || "";
  const credential = process.env.NEXT_PUBLIC_VOCABULARY_TURN_CREDENTIAL || "";
  return {
    urls,
    ...(username ? { username } : {}),
    ...(credential ? { credential } : {}),
  };
}

function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  const turn = optionalTurnServer();
  if (turn) servers.push(turn);
  return servers;
}

function waitForIceGatheringComplete(pc: RTCPeerConnection, timeoutMs = 6000) {
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
  if (error instanceof DOMException && ["NotAllowedError", "SecurityError"].includes(error.name)) return "تم رفض إذن الميكروفون. اسمح بالمايك من إعدادات المتصفح ثم اضغط الأيقونة مرة أخرى.";
  if (error instanceof DOMException && error.name === "NotFoundError") return "لم يتم العثور على ميكروفون على هذا الجهاز.";
  if (error instanceof DOMException && error.name === "NotReadableError") return "الميكروفون مستخدم من تطبيق آخر أو تعذر الوصول إليه.";
  if (error instanceof DOMException && error.name === "OverconstrainedError") return "تعذر تشغيل إعدادات الميكروفون على هذا الجهاز.";
  return error instanceof Error ? error.message : "تعذر تشغيل المحادثة الصوتية الآن.";
}

async function requestMicrophone() {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
      video: false,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "OverconstrainedError") {
      return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
    throw error;
  }
}

export function useVocabularyVoiceChat(room: VocabularyChallengeRoom | null, userId: string | undefined) {
  const supported = typeof window !== "undefined"
    && window.isSecureContext
    && typeof RTCPeerConnection !== "undefined"
    && Boolean(navigator.mediaDevices?.getUserMedia);
  const [micEnabled, setMicEnabled] = useState(false);
  const [state, setState] = useState<VoiceConnectionState>(supported ? "off" : "unsupported");
  const [error, setError] = useState("");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const senderRef = useRef<RTCRtpSender | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackUnlockedRef = useRef(false);
  const offerKeyRef = useRef("");
  const answerKeyRef = useRef("");
  const appliedAnswerRef = useRef("");
  const roomKeyRef = useRef("");

  const ensureRemoteAudio = useCallback(() => {
    if (typeof document === "undefined") return null;
    if (remoteAudioRef.current) return remoteAudioRef.current;
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.preload = "auto";
    audio.controls = false;
    audio.muted = false;
    audio.volume = 1;
    audio.setAttribute("playsinline", "true");
    audio.setAttribute("webkit-playsinline", "true");
    audio.setAttribute("aria-hidden", "true");
    audio.style.position = "fixed";
    audio.style.width = "1px";
    audio.style.height = "1px";
    audio.style.opacity = "0.001";
    audio.style.pointerEvents = "none";
    audio.style.left = "-10px";
    audio.style.bottom = "0";
    document.body.appendChild(audio);
    remoteAudioRef.current = audio;
    return audio;
  }, []);

  const unlockAudio = useCallback(() => {
    playbackUnlockedRef.current = true;
    const audio = ensureRemoteAudio();
    if (!audio?.srcObject) return;
    void audio.play().then(() => {
      setError((current) => current.includes("صوت الخصم") ? "" : current);
    }).catch(() => {
      // Safari may require the next direct tap on the mic icon; keep the game usable.
    });
  }, [ensureRemoteAudio]);

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
      remoteAudioRef.current.remove();
      remoteAudioRef.current = null;
    }
    playbackUnlockedRef.current = false;
    offerKeyRef.current = "";
    answerKeyRef.current = "";
    appliedAnswerRef.current = "";
    setState(supported ? "off" : "unsupported");
    setError("");
  }, [stopLocalMic, supported]);

  const ensurePeer = useCallback(() => {
    if (!supported) return null;
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({
      iceServers: buildIceServers(),
      iceCandidatePoolSize: 4,
      bundlePolicy: "max-bundle",
    });
    const transceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
    senderRef.current = transceiver.sender;

    pc.ontrack = (event) => {
      const audio = ensureRemoteAudio();
      if (!audio) return;
      const stream = event.streams[0] || new MediaStream([event.track]);
      audio.srcObject = stream;
      audio.muted = false;
      audio.volume = 1;
      event.track.onunmute = () => {
        void audio.play().catch(() => {
          if (!playbackUnlockedRef.current) {
            setError("اضغط أيقونة المايك مرة واحدة لتفعيل صوت الخصم في هذا المتصفح.");
          }
        });
      };
      void audio.play().then(() => {
        setError("");
      }).catch(() => {
        if (!playbackUnlockedRef.current) {
          setError("اضغط أيقونة المايك مرة واحدة لتفعيل صوت الخصم في هذا المتصفح.");
        }
      });
    };

    const syncConnectionState = () => {
      const connectionState = pc.connectionState;
      const iceState = pc.iceConnectionState;
      if (connectionState === "connected" || iceState === "connected" || iceState === "completed") {
        setState("connected");
        setError("");
      } else if (["connecting", "new"].includes(connectionState) || ["checking", "new"].includes(iceState)) {
        setState("connecting");
      } else if (connectionState === "failed" || iceState === "failed") {
        setState("error");
        setError(optionalTurnServer()
          ? "تعذر تثبيت الاتصال الصوتي. أغلق المايك وافتحه مرة أخرى."
          : "تعذر ربط الصوت على هذه الشبكة. دعم TURN اختياري للشبكات المقيدة.");
      } else if (connectionState === "disconnected") {
        setState("connecting");
      }
    };
    pc.onconnectionstatechange = syncConnectionState;
    pc.oniceconnectionstatechange = syncConnectionState;
    pc.onicecandidateerror = () => {
      if (pc.iceConnectionState === "failed") syncConnectionState();
    };

    pcRef.current = pc;
    setState("connecting");
    return pc;
  }, [ensureRemoteAudio, supported]);

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
    unlockAudio();
    if (!supported) {
      setState("unsupported");
      setError(window.isSecureContext
        ? "المحادثة الصوتية غير مدعومة في هذا المتصفح."
        : "الميكروفون يحتاج اتصال HTTPS آمن.");
      return;
    }
    const pc = ensurePeer();
    if (!pc) return;

    if (micEnabled) {
      await stopLocalMic();
      const audio = ensureRemoteAudio();
      void audio?.play().catch(() => undefined);
      return;
    }

    try {
      setError("");
      setState("connecting");
      const stream = await requestMicrophone();
      const track = stream.getAudioTracks()[0];
      if (!track) throw new Error("لم يتم العثور على مسار صوتي.");
      track.enabled = true;
      localStreamRef.current = stream;
      await senderRef.current?.replaceTrack(track);
      setMicEnabled(true);
      if (pc.connectionState === "connected" || ["connected", "completed"].includes(pc.iceConnectionState)) setState("connected");
      const audio = ensureRemoteAudio();
      if (audio?.srcObject) {
        await audio.play().catch(() => {
          setError("اضغط أيقونة المايك مرة أخرى إذا لم تسمع صوت الخصم.");
        });
      }
    } catch (voiceError) {
      await stopLocalMic();
      setState("error");
      setError(voiceErrorMessage(voiceError));
    }
  }, [ensurePeer, ensureRemoteAudio, micEnabled, stopLocalMic, supported, unlockAudio]);

  return {
    supported,
    micEnabled,
    state,
    error,
    toggleMic,
    unlockAudio,
  };
}
