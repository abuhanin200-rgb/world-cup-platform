"use client";

import { isInteractionSoundEnabled, prepareInteractionAudio } from "@/lib/interactionFeedback";

export type VocabularySoundKind =
  | "cardSelect"
  | "cardPlace"
  | "correct"
  | "incorrect"
  | "drawCard"
  | "countdownTick"
  | "countdownFinal"
  | "yourTurn"
  | "matchStart"
  | "win"
  | "lose"
  | "drawResult";

type SoundDefinition = {
  src: string;
  volume: number;
  poolSize: number;
  vibration?: number | number[];
};

const SOUNDS: Record<VocabularySoundKind, SoundDefinition> = {
  cardSelect: { src: "/sounds/vocabulary/card-select.wav", volume: 0.42, poolSize: 3, vibration: 7 },
  cardPlace: { src: "/sounds/vocabulary/card-place.wav", volume: 0.52, poolSize: 3, vibration: 11 },
  correct: { src: "/sounds/vocabulary/correct.wav", volume: 0.58, poolSize: 2, vibration: [15, 24, 20] },
  incorrect: { src: "/sounds/vocabulary/incorrect.wav", volume: 0.67, poolSize: 2, vibration: [30, 34, 38] },
  drawCard: { src: "/sounds/vocabulary/draw-card.wav", volume: 0.48, poolSize: 2, vibration: 12 },
  countdownTick: { src: "/sounds/vocabulary/countdown-tick.wav", volume: 0.38, poolSize: 2 },
  countdownFinal: { src: "/sounds/vocabulary/countdown-final.wav", volume: 0.58, poolSize: 2, vibration: [18, 28, 24] },
  yourTurn: { src: "/sounds/vocabulary/your-turn.wav", volume: 0.48, poolSize: 2, vibration: 12 },
  matchStart: { src: "/sounds/vocabulary/match-start.wav", volume: 0.52, poolSize: 2, vibration: [12, 18, 14] },
  win: { src: "/sounds/vocabulary/win.wav", volume: 0.68, poolSize: 1, vibration: [18, 26, 24, 28, 35] },
  lose: { src: "/sounds/vocabulary/lose.wav", volume: 0.48, poolSize: 1, vibration: [24, 38, 24] },
  drawResult: { src: "/sounds/vocabulary/draw-result.wav", volume: 0.48, poolSize: 1, vibration: [16, 24, 16] },
};

const pools = new Map<VocabularySoundKind, HTMLAudioElement[]>();
const poolIndexes = new Map<VocabularySoundKind, number>();
let prepared = false;
function prepareVocabularyMediaSession() {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: "تحدي المفردات",
      artist: "ألعاب التحدي",
      album: "منصة التحدي",
      artwork: [
        { src: "/app-icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/app-icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    });
  } catch {
    // Media Session metadata is a progressive enhancement only.
  }
}


function vibrate(pattern?: number | number[]) {
  if (!pattern || typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  navigator.vibrate(pattern);
}

function ensurePool(kind: VocabularySoundKind) {
  if (typeof window === "undefined") return [];
  const existing = pools.get(kind);
  if (existing) return existing;

  const definition = SOUNDS[kind];
  const pool = Array.from({ length: definition.poolSize }, () => {
    const audio = new Audio(definition.src);
    audio.preload = "auto";
    audio.volume = definition.volume;
    return audio;
  });
  pools.set(kind, pool);
  poolIndexes.set(kind, 0);
  return pool;
}

export function prepareVocabularyAudio() {
  if (typeof window === "undefined") return;
  prepareInteractionAudio();
  prepareVocabularyMediaSession();
  if (prepared) return;
  prepared = true;

  (Object.keys(SOUNDS) as VocabularySoundKind[]).forEach((kind) => {
    const pool = ensurePool(kind);
    pool.forEach((audio) => {
      try {
        audio.load();
      } catch {
        // Some mobile browsers defer loading until playback. That is safe.
      }
    });
  });
}

export function playVocabularySound(
  kind: VocabularySoundKind,
  options?: { vibrate?: boolean; volumeScale?: number },
) {
  if (typeof window === "undefined") return;

  const definition = SOUNDS[kind];
  if (options?.vibrate !== false) vibrate(definition.vibration);
  if (!isInteractionSoundEnabled()) return;

  prepareVocabularyAudio();
  const pool = ensurePool(kind);
  if (!pool.length) return;

  const index = poolIndexes.get(kind) || 0;
  const audio = pool[index % pool.length];
  poolIndexes.set(kind, (index + 1) % pool.length);

  try {
    audio.pause();
    audio.currentTime = 0;
    const volumeScale = Math.min(1.25, Math.max(0, options?.volumeScale ?? 1));
    audio.volume = Math.min(1, definition.volume * volumeScale);
    void audio.play().catch(() => undefined);
  } catch {
    // Audio feedback must never block the game action.
  }
}
