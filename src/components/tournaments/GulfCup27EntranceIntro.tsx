"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const FALLBACK_HIDE_MS = 4500;
const EXIT_MS = 180;

export default function GulfCup27EntranceIntro() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackRef = useRef<number | null>(null);
  const exitRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  const finish = useCallback(() => {
    setExiting(true);
    if (exitRef.current !== null) window.clearTimeout(exitRef.current);
    exitRef.current = window.setTimeout(() => setVisible(false), EXIT_MS);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.overflow = "hidden";

    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      const playPromise = video.play();
      if (playPromise) playPromise.catch(() => finish());
    }

    fallbackRef.current = window.setTimeout(finish, FALLBACK_HIDE_MS);

    return () => {
      if (fallbackRef.current !== null) window.clearTimeout(fallbackRef.current);
      if (exitRef.current !== null) window.clearTimeout(exitRef.current);
      root.style.overflow = "";
    };
  }, [finish]);

  useEffect(() => {
    if (!visible) document.documentElement.style.overflow = "";
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[99999] bg-black"
      style={{
        opacity: exiting ? 0 : 1,
        transition: `opacity ${EXIT_MS}ms ease-out`,
        pointerEvents: exiting ? "none" : "auto",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
        className="h-full w-full object-cover object-center"
      >
        <source src="/tournaments/gulf-cup-27/intro-reference.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
