"use client";

import {
  isInteractionSoundEnabled,
  prepareInteractionAudio,
} from "@/lib/interactionFeedback";

type TenSecondsSound = "start" | "tick" | "stop" | "near" | "miss" | "exact";

const SOURCES: Record<TenSecondsSound, string> = {
  start: "/sounds/ten-seconds/start.wav",
  tick: "/sounds/ten-seconds/tick.wav",
  stop: "/sounds/ten-seconds/stop.wav",
  near: "/sounds/ten-seconds/near.wav",
  miss: "/sounds/ten-seconds/miss.wav",
  exact: "/sounds/ten-seconds/exact.wav",
};

const VOLUMES: Record<TenSecondsSound, number> = {
  start: 0.34,
  tick: 0.19,
  stop: 0.3,
  near: 0.34,
  miss: 0.4,
  exact: 0.5,
};

const VIBRATION: Partial<Record<TenSecondsSound, number | number[]>> = {
  start: 10,
  stop: 12,
  near: [12, 22, 12],
  miss: [28, 36, 28],
  exact: [14, 20, 18, 20, 30],
};

let prepared = false;
const audioCache = new Map<TenSecondsSound, HTMLAudioElement>();

function getAudio(kind: TenSecondsSound) {
  if (typeof window === "undefined") return null;
  const existing = audioCache.get(kind);
  if (existing) return existing;
  const audio = new Audio(SOURCES[kind]);
  audio.preload = "auto";
  audio.volume = VOLUMES[kind];
  audioCache.set(kind, audio);
  return audio;
}

function vibrate(kind: TenSecondsSound) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  const pattern = VIBRATION[kind];
  if (pattern) navigator.vibrate(pattern);
}

export function prepareTenSecondsAudio() {
  if (typeof window === "undefined") return;
  prepareInteractionAudio();
  if (prepared) return;
  prepared = true;
  (Object.keys(SOURCES) as TenSecondsSound[]).forEach((kind) => {
    try {
      getAudio(kind)?.load();
    } catch {
      // Playback will initialize on the first user gesture.
    }
  });
}

export function playTenSecondsSound(kind: TenSecondsSound) {
  vibrate(kind);
  if (!isInteractionSoundEnabled()) return;
  prepareTenSecondsAudio();
  const audio = getAudio(kind);
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
    const playback = audio.play();
    if (playback && typeof playback.catch === "function") void playback.catch(() => undefined);
  } catch {
    // Gameplay must continue if audio is unavailable.
  }
}
