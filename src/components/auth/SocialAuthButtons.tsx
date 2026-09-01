"use client";

import { Loader2 } from "lucide-react";
import type { SocialProvider } from "@/lib/users";

type Props = {
  loadingProvider?: SocialProvider | null;
  onSelect: (provider: SocialProvider) => void | Promise<void>;
  disabled?: boolean;
  compact?: boolean;
};

const PROVIDERS: Array<{ id: SocialProvider; label: string; short: string; className: string }> = [
  { id: "google", label: "Google", short: "G", className: "text-[#4285f4]" },
  { id: "apple", label: "Apple", short: "●", className: "text-white" },
  { id: "facebook", label: "Facebook", short: "f", className: "text-[#5f91ff]" },
];

export default function SocialAuthButtons({ loadingProvider = null, onSelect, disabled = false, compact = false }: Props) {
  return (
    <div className={`grid grid-cols-3 ${compact ? "gap-2" : "gap-2.5"}`}>
      {PROVIDERS.map((provider) => {
        const loading = loadingProvider === provider.id;
        return (
          <button
            key={provider.id}
            type="button"
            onClick={() => void onSelect(provider.id)}
            disabled={disabled || Boolean(loadingProvider)}
            className="altahaddi-social-button group"
            aria-label={`المتابعة بواسطة ${provider.label}`}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#ffc210]" />
            ) : (
              <span className={`grid h-7 w-7 place-items-center rounded-full bg-white/[0.07] text-[15px] font-black leading-none ${provider.className}`} aria-hidden="true">
                {provider.short}
              </span>
            )}
            <span className="hidden text-[10px] font-black text-white/72 sm:inline">{provider.label}</span>
          </button>
        );
      })}
    </div>
  );
}
