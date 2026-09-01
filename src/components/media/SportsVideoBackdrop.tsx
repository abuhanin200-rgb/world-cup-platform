"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

const DEFAULT_VIDEO = "https://videos.pexels.com/video-files/3722209/3722209-hd_1920_1080_25fps.mp4";

type Props = {
  className?: string;
  videoUrl?: string;
  poster?: string;
  opacity?: number;
  overlayClassName?: string;
  fixed?: boolean;
};

export default function SportsVideoBackdrop({
  className = "",
  videoUrl = DEFAULT_VIDEO,
  poster = "/og-image.png",
  opacity = 0.5,
  overlayClassName = "",
  fixed = false,
}: Props) {
  const reduceMotion = useReducedMotion();
  const firstRef = useRef<HTMLVideoElement>(null);
  const secondRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState<0 | 1>(0);
  const switchingRef = useRef(false);

  useEffect(() => {
    if (reduceMotion) return;
    const first = firstRef.current;
    const second = secondRef.current;
    if (!first || !second) return;

    const videos = [first, second] as const;
    const current = videos[active];
    const standby = videos[active === 0 ? 1 : 0];

    const start = async () => {
      try {
        current.muted = true;
        standby.muted = true;
        await current.play();
      } catch {
        // Browsers may delay autoplay until the element is visible; poster remains available.
      }
    };

    void start();

    const onTimeUpdate = () => {
      if (!Number.isFinite(current.duration) || current.duration <= 2) return;
      const remaining = current.duration - current.currentTime;
      if (remaining > 1.15 || switchingRef.current) return;

      switchingRef.current = true;
      const nextIndex = active === 0 ? 1 : 0;
      try {
        standby.currentTime = 0.05;
      } catch {
        // Ignore seek failures until metadata is ready.
      }
      void standby.play().catch(() => undefined);
      setActive(nextIndex);

      window.setTimeout(() => {
        current.pause();
        try {
          current.currentTime = 0;
        } catch {
          // No-op.
        }
        switchingRef.current = false;
      }, 1050);
    };

    current.addEventListener("timeupdate", onTimeUpdate);
    return () => current.removeEventListener("timeupdate", onTimeUpdate);
  }, [active, reduceMotion]);

  if (reduceMotion) {
    return (
      <div className={`${fixed ? "fixed" : "absolute"} inset-0 overflow-hidden ${className}`} aria-hidden="true">
        <img src={poster} alt="" className="h-full w-full object-cover opacity-30" />
        <div className={`absolute inset-0 ${overlayClassName}`} />
      </div>
    );
  }

  return (
    <div className={`${fixed ? "fixed" : "absolute"} inset-0 overflow-hidden bg-[#04133a] ${className}`} aria-hidden="true">
      {[0, 1].map((index) => (
        <video
          key={index}
          ref={index === 0 ? firstRef : secondRef}
          muted
          playsInline
          preload="auto"
          poster={poster}
          className="absolute inset-0 h-full w-full scale-[1.035] object-cover transition-opacity duration-1000 ease-linear"
          style={{ opacity: active === index ? opacity : 0 }}
          tabIndex={-1}
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      ))}
      <div className={`absolute inset-0 ${overlayClassName}`} />
    </div>
  );
}
