"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import {
  isInteractionSoundEnabled,
  playInteractionFeedback,
  setInteractionSoundEnabled,
  subscribeInteractionSound,
} from "@/lib/interactionFeedback";

export default function InteractionSoundToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isInteractionSoundEnabled());
    return subscribeInteractionSound(setEnabled);
  }, []);

  function toggle() {
    const next = !enabled;
    setInteractionSoundEnabled(next);
    setEnabled(next);
    if (next) playInteractionFeedback("selection", { vibrate: false });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={enabled ? "إيقاف أصوات التفاعل" : "تشغيل أصوات التفاعل"}
      aria-pressed={enabled}
      title={enabled ? "أصوات التفاعل مفعلة" : "أصوات التفاعل متوقفة"}
      className="altahaddi-icon-button"
    >
      {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}
