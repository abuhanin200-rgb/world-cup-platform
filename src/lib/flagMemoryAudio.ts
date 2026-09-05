"use client";

import {
  isInteractionSoundEnabled,
  prepareInteractionAudio,
} from "@/lib/interactionFeedback";

type FlagMemorySound = "flip" | "start" | "match" | "mismatch" | "finish";

const SOURCES: Record<FlagMemorySound, string> = {
  flip: "/sounds/flag-memory/flip.wav",
  start: "/sounds/flag-memory/start.wav",
  match: "/sounds/flag-memory/match.wav",
  mismatch: "/sounds/flag-memory/mismatch.wav",
  finish: "/sounds/flag-memory/finish.wav",
};

const VOLUMES: Record<FlagMemorySound, number> = {
  flip: 0.22,
  start: 0.34,
  match: 0.42,
  mismatch: 0.4,
  finish: 0.5,
};

const VIBRATION: Partial<Record<FlagMemorySound, number | number[]>> = {
  flip: 8,
  start: 12,
  match: [12, 20, 18],
  mismatch: [28, 34, 30],
  finish: [16, 20, 18, 20, 30],
};

let prepared = false;
const audioCache = new Map<FlagMemorySound, HTMLAudioElement>();

function getAudio(kind: FlagMemorySound) {
  if (typeof window === "undefined") return null;
  const existing = audioCache.get(kind);
  if (existing) return existing;
  const audio = new Audio(SOURCES[kind]);
  audio.preload = "auto";
  audio.volume = VOLUMES[kind];
  audioCache.set(kind, audio);
  return audio;
}

function vibrate(kind: FlagMemorySound) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  const pattern = VIBRATION[kind];
  if (pattern) navigator.vibrate(pattern);
}

export function prepareFlagMemoryAudio() {
  if (typeof window === "undefined") return;
  prepareInteractionAudio();
  if (prepared) return;
  prepared = true;
  (Object.keys(SOURCES) as FlagMemorySound[]).forEach((kind) => {
    try {
      getAudio(kind)?.load();
    } catch {
      // Playback will initialize on the first real interaction.
    }
  });
}

export function playFlagMemorySound(kind: FlagMemorySound) {
  vibrate(kind);
  if (!isInteractionSoundEnabled()) return;
  prepareFlagMemoryAudio();
  const audio = getAudio(kind);
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
    const playback = audio.play();
    if (playback && typeof playback.catch === "function") void playback.catch(() => undefined);
  } catch {
    // Keep gameplay independent from audio support.
  }
}
