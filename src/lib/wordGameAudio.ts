"use client";

import {
  isInteractionSoundEnabled,
  playWordGameFeedback,
  prepareInteractionAudio,
} from "@/lib/interactionFeedback";

type WordGameSound =
  | "key"
  | "delete"
  | "submit"
  | "reveal"
  | "invalid"
  | "win"
  | "lose";

const SOURCES: Record<WordGameSound, string> = {
  key: "/sounds/word-game/key.wav",
  delete: "/sounds/word-game/delete.wav",
  submit: "/sounds/word-game/submit.wav",
  reveal: "/sounds/word-game/reveal.wav",
  invalid: "/sounds/word-game/invalid.wav",
  win: "/sounds/word-game/win.wav",
  lose: "/sounds/word-game/lose.wav",
};

const VOLUMES: Record<WordGameSound, number> = {
  key: 0.22,
  delete: 0.22,
  submit: 0.28,
  reveal: 0.34,
  invalid: 0.42,
  win: 0.5,
  lose: 0.4,
};

const VIBRATION: Partial<Record<WordGameSound, number | number[]>> = {
  key: 7,
  delete: 9,
  submit: 12,
  reveal: [10, 22, 12],
  invalid: [30, 36, 34],
  win: [16, 22, 18, 22, 30],
  lose: [28, 40, 28],
};

let prepared = false;
const audioCache = new Map<WordGameSound, HTMLAudioElement>();

function vibrate(kind: WordGameSound) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  const pattern = VIBRATION[kind];
  if (pattern) navigator.vibrate(pattern);
}

function getAudio(kind: WordGameSound) {
  if (typeof window === "undefined") return null;
  const existing = audioCache.get(kind);
  if (existing) return existing;

  const audio = new Audio(SOURCES[kind]);
  audio.preload = "auto";
  audio.volume = VOLUMES[kind];
  audioCache.set(kind, audio);
  return audio;
}

export function prepareWordGameAudio() {
  if (typeof window === "undefined") return;
  prepareInteractionAudio();
  if (prepared) return;
  prepared = true;
  (Object.keys(SOURCES) as WordGameSound[]).forEach((kind) => {
    const audio = getAudio(kind);
    try {
      audio?.load();
    } catch {
      // The first actual user interaction will still initialize playback.
    }
  });
}

export function playWordGameSound(kind: WordGameSound) {
  vibrate(kind);
  if (!isInteractionSoundEnabled()) return;

  prepareWordGameAudio();
  const audio = getAudio(kind);
  if (!audio) return;

  try {
    audio.pause();
    audio.currentTime = 0;
    const result = audio.play();
    if (result && typeof result.catch === "function") {
      void result.catch(() => {
        if (kind === "win") playWordGameFeedback("correct");
        if (kind === "invalid" || kind === "lose" || kind === "reveal") {
          playWordGameFeedback("incorrect");
        }
      });
    }
  } catch {
    if (kind === "win") playWordGameFeedback("correct");
    if (kind === "invalid" || kind === "lose" || kind === "reveal") {
      playWordGameFeedback("incorrect");
    }
  }
}
