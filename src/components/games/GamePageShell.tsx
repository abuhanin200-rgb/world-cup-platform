import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Gamepad2, Sparkles } from "lucide-react";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  visual?: ReactNode;
  children: ReactNode;
};

export default function GamePageShell({ eyebrow, title, description, icon, visual, children }: Props) {
  return (
    <main dir="rtl" className="relative mx-auto max-w-6xl overflow-hidden px-3 pb-14 pt-4 sm:px-4 md:px-6 md:pb-20 md:pt-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_80%_10%,rgba(255,194,16,.09),transparent_27%),radial-gradient(circle_at_16%_24%,rgba(47,117,255,.14),transparent_32%)]" />

      <Link href="/games" className="mb-3 inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-[11px] font-black text-white/60 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-yellow)] md:mb-5">
        <ArrowRight className="h-4 w-4" /> الألعاب
      </Link>

      <section className="altahaddi-glass-strong relative overflow-hidden rounded-[28px] p-4 md:rounded-[36px] md:p-7">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.045),transparent_42%),radial-gradient(circle_at_12%_18%,rgba(255,194,16,.10),transparent_24%)]" />
        <div className="relative grid gap-5 md:grid-cols-[1fr_270px] md:items-center">
          <div>
            <div className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-[var(--brand-yellow)]/20 bg-[var(--brand-yellow)]/[0.07] px-2.5 text-[10px] font-black text-[var(--brand-yellow)] md:text-xs">
              <Sparkles className="h-3.5 w-3.5" /> {eyebrow}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-[var(--brand-yellow)] md:h-14 md:w-14">{icon}</div>
              <div>
                <h1 className="text-2xl font-black md:text-4xl">{title}</h1>
                <p className="mt-1 max-w-2xl text-xs font-semibold leading-6 text-white/48 md:text-sm">{description}</p>
              </div>
            </div>
          </div>

          <div className="relative hidden min-h-[120px] overflow-hidden rounded-[24px] border border-white/10 bg-black/15 md:grid md:place-items-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,194,16,.10),transparent_34%)]" />
            <div className="relative">{visual ?? <Gamepad2 className="h-14 w-14 text-[var(--brand-yellow)]" />}</div>
          </div>
        </div>
      </section>

      <div className="mt-4 md:mt-6">{children}</div>
    </main>
  );
}
