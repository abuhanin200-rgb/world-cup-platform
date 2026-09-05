"use client";

export type MajlisSound = "tap" | "start" | "question" | "reveal" | "correct" | "wrong" | "timer" | "steal" | "finish";

const SOURCES: Record<MajlisSound, string> = {
  tap: "/sounds/majlis/tap.wav",
  start: "/sounds/majlis/start.wav",
  question: "/sounds/majlis/question.wav",
  reveal: "/sounds/majlis/reveal.wav",
  correct: "/sounds/majlis/correct.wav",
  wrong: "/sounds/majlis/wrong.wav",
  timer: "/sounds/majlis/timer.wav",
  steal: "/sounds/majlis/steal.wav",
  finish: "/sounds/majlis/finish.wav",
};

const cache = new Map<MajlisSound, HTMLAudioElement>();

function soundEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("majlis_sound") !== "off";
}

export function isMajlisSoundEnabled() {
  return soundEnabled();
}

export function setMajlisSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("majlis_sound", enabled ? "on" : "off");
}

export function preloadMajlisSounds() {
  if (typeof window === "undefined") return;
  (Object.keys(SOURCES) as MajlisSound[]).forEach((name) => {
    if (cache.has(name)) return;
    const audio = new Audio(SOURCES[name]);
    audio.preload = "auto";
    audio.volume = name === "wrong" ? 0.55 : 0.48;
    cache.set(name, audio);
  });
}

export function playMajlisSound(name: MajlisSound) {
  if (!soundEnabled() || typeof window === "undefined") return;
  let audio = cache.get(name);
  if (!audio) {
    audio = new Audio(SOURCES[name]);
    audio.preload = "auto";
    cache.set(name, audio);
  }
  try {
    audio.pause();
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  } catch {
    // Browser audio policies may block playback until the next user gesture.
  }
}

export function majlisHaptic(kind: "light" | "success" | "error" = "light") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  if (kind === "success") navigator.vibrate([18, 20, 26]);
  else if (kind === "error") navigator.vibrate([35, 24, 35]);
  else navigator.vibrate(12);
}
