"use client";

type FeedbackKind = "selection" | "success" | "error" | "warning";
type WordGameFeedbackKind = "correct" | "incorrect";

const SOUND_KEY = "altahaddi_interaction_sound";
const CHANGE_EVENT = "altahaddi:sound-preference";
let audioContext: AudioContext | null = null;

function getContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  return audioContext;
}

export function prepareInteractionAudio() {
  const context = getContext();
  if (context?.state === "suspended") void context.resume();
}

export function isInteractionSoundEnabled() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(SOUND_KEY) !== "off";
}

export function setInteractionSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: enabled }));
}

export function subscribeInteractionSound(callback: (enabled: boolean) => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => callback(isInteractionSoundEnabled());
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function tone(frequency: number, duration: number, gainValue: number, startOffset = 0) {
  const context = getContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume();

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + startOffset;
  const end = start + duration;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(end + 0.015);
}

function vibrate(kind: FeedbackKind) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  const pattern: Record<FeedbackKind, number | number[]> = {
    selection: 8,
    success: [18, 28, 24],
    warning: [18, 36, 14],
    error: [32, 42, 32],
  };
  navigator.vibrate(pattern[kind]);
}

function vibrateWordGame(kind: WordGameFeedbackKind) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  navigator.vibrate(kind === "correct" ? [14, 26, 20, 26, 28] : [26, 34, 38]);
}

function playErrorSqueak() {
  const context = getContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime;
  const end = start + 0.19;

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(330, start);
  oscillator.frequency.exponentialRampToValueAtTime(155, end);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.034, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}

function playApplauseBurst(startOffset: number) {
  const context = getContext();
  if (!context) return;

  const duration = 0.105;
  const frameCount = Math.ceil(context.sampleRate * duration);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < frameCount; index += 1) {
    samples[index] = (Math.random() * 2 - 1) * (1 - index / frameCount);
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const start = context.currentTime + startOffset;
  const end = start + duration;

  source.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1450, start);
  filter.Q.setValueAtTime(0.65, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.028, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(start);
  source.stop(end + 0.015);
}

export function playWordGameFeedback(kind: WordGameFeedbackKind) {
  vibrateWordGame(kind);
  if (!isInteractionSoundEnabled()) return;

  prepareInteractionAudio();

  if (kind === "incorrect") {
    playErrorSqueak();
    return;
  }

  playApplauseBurst(0);
  playApplauseBurst(0.1);
  playApplauseBurst(0.2);
  tone(660, 0.09, 0.022, 0.035);
  tone(880, 0.12, 0.02, 0.125);
}

export function playInteractionFeedback(kind: FeedbackKind, options?: { vibrate?: boolean }) {
  if (options?.vibrate !== false) vibrate(kind);
  if (!isInteractionSoundEnabled()) return;

  if (kind === "selection") {
    tone(420, 0.055, 0.018);
    tone(560, 0.045, 0.012, 0.035);
    return;
  }

  if (kind === "success") {
    tone(520, 0.08, 0.03);
    tone(720, 0.09, 0.025, 0.07);
    tone(920, 0.08, 0.018, 0.145);
    return;
  }

  if (kind === "warning") {
    tone(310, 0.085, 0.022);
    tone(260, 0.075, 0.017, 0.07);
    return;
  }

  tone(205, 0.085, 0.028);
  tone(145, 0.1, 0.022, 0.065);
}
