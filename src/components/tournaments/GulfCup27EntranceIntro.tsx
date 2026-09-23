"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const INTRO_SRC = "/tournaments/gulf-cup-27/intro-3039-v1.mp4";
const POSTER_SRC = "/tournaments/gulf-cup-27/intro-3039-poster.jpg";
const EXIT_MS = 180;
const SAFETY_TIMEOUT_MS = 5200;

/**
 * Exact Gulf Cup 27 entrance video.
 * Mounted only on the tournament home page, so it replays every time the user
 * enters /tournaments/gulf-cup-27 from another route. No session/local storage.
 */
export default function GulfCup27EntranceIntro() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const safetyTimerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setExiting(true);

    if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current);
    exitTimerRef.current = window.setTimeout(() => setVisible(false), EXIT_MS);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;

      const tryPlay = () => {
        const promise = video.play();
        if (promise) {
          promise.catch(() => {
            // Keep the poster visible briefly rather than flashing the page.
            // A safety timeout below always releases the overlay.
          });
        }
      };

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) tryPlay();
      else video.addEventListener("canplay", tryPlay, { once: true });
    }

    safetyTimerRef.current = window.setTimeout(finish, SAFETY_TIMEOUT_MS);

    return () => {
      if (safetyTimerRef.current !== null) window.clearTimeout(safetyTimerRef.current);
      if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current);
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, [finish]);

  useEffect(() => {
    if (!visible) {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[2147483647] overflow-hidden bg-black"
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
        poster={POSTER_SRC}
        onEnded={finish}
        className="h-[100dvh] w-full object-cover object-center"
        style={{ display: "block", background: "#000" }}
      >
        <source src={INTRO_SRC} type="video/mp4" />
      </video>
    </div>
  );
}
