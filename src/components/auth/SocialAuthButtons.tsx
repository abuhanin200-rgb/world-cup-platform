"use client";

import { Loader2 } from "lucide-react";
import type { SocialProvider } from "@/lib/users";

type Props = {
  loadingProvider?: SocialProvider | null;
  onSelect: (provider: SocialProvider) => void | Promise<void>;
  disabled?: boolean;
  compact?: boolean;
};

function GoogleIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.23-.2-1.78H12v3.4h5.52a4.69 4.69 0 0 1-2.05 3.08l-.02.11 2.97 2.3.2.02c1.84-1.7 2.98-4.2 2.98-7.13Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.89 6.62-2.64l-3.15-2.43c-.84.57-1.96.97-3.47.97a6.02 6.02 0 0 1-5.69-4.16l-.1.01-3.1 2.4-.04.1A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.31 13.74A6.17 6.17 0 0 1 6 11.99c0-.61.11-1.2.3-1.75v-.12L3.18 7.68l-.1.05A10 10 0 0 0 2 11.99c0 1.53.35 2.98 1.07 4.26l3.24-2.51Z"/><path fill="#EA4335" d="M12 6.1c1.88 0 3.14.81 3.86 1.48l2.83-2.76A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.93 5.73l3.23 2.51A6.04 6.04 0 0 1 12 6.1Z"/></svg>;
}

function AppleIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true"><path d="M17.05 12.54c-.03-3.05 2.49-4.53 2.6-4.6a5.58 5.58 0 0 0-4.4-2.38c-1.85-.2-3.65 1.11-4.59 1.11-.96 0-2.42-1.09-3.98-1.05a5.82 5.82 0 0 0-4.89 2.98c-2.13 3.69-.54 9.12 1.5 12.1 1.03 1.46 2.22 3.1 3.78 3.04 1.53-.06 2.1-.98 3.95-.98 1.83 0 2.37.98 3.96.94 1.64-.02 2.67-1.47 3.66-2.95a12.1 12.1 0 0 0 1.67-3.4 5.24 5.24 0 0 1-3.26-4.81ZM14.04 3.6A5.3 5.3 0 0 0 15.25 0a5.4 5.4 0 0 0-3.49 1.71 5.06 5.06 0 0 0-1.25 3.46 4.45 4.45 0 0 0 3.53-1.57Z"/></svg>;
}

function FacebookIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1877F2"/><path fill="#fff" d="m13.6 22 .03-8.9h3l.45-3.47h-3.45V7.41c0-1 .28-1.69 1.72-1.69h1.84v-3.1a24.7 24.7 0 0 0-2.68-.14c-2.65 0-4.46 1.62-4.46 4.58v2.57h-3v3.47h3V22h3.55Z"/></svg>;
}

const PROVIDERS = [
  { id: "google", label: "Google", icon: <GoogleIcon /> },
  { id: "apple", label: "Apple", icon: <AppleIcon /> },
  { id: "facebook", label: "Facebook", icon: <FacebookIcon /> },
] satisfies Array<{ id: SocialProvider; label: string; icon: React.ReactNode }>;

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
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.08] text-white" aria-hidden="true">
                {provider.icon}
              </span>
            )}
            <span className="hidden text-[10px] font-black text-white/72 sm:inline">{provider.label}</span>
          </button>
        );
      })}
    </div>
  );
}
