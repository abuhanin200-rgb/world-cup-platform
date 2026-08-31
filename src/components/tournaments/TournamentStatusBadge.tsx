import {
  CheckCircle2,
  CircleDot,
  Clock3,
  EyeOff,
  PauseCircle,
  Pencil,
  TicketCheck,
} from "lucide-react";
import { getTournamentStatusLabel, type TournamentStatus } from "@/domain/tournaments";

type TournamentStatusBadgeProps = { status: TournamentStatus };

const STATUS_STYLES: Record<TournamentStatus, string> = {
  draft: "border-slate-300/25 bg-slate-300/10 text-slate-100",
  coming_soon: "border-sky-300/30 bg-sky-300/10 text-sky-100",
  registration_open: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  active: "border-emerald-300/35 bg-emerald-300/10 text-emerald-100",
  paused: "border-orange-300/35 bg-orange-300/10 text-orange-100",
  finished: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  hidden: "border-slate-400/25 bg-slate-400/10 text-slate-300",
};

const STATUS_ICONS = {
  draft: Pencil,
  coming_soon: Clock3,
  registration_open: TicketCheck,
  active: CircleDot,
  paused: PauseCircle,
  finished: CheckCircle2,
  hidden: EyeOff,
} satisfies Record<TournamentStatus, typeof CircleDot>;

export default function TournamentStatusBadge({ status }: TournamentStatusBadgeProps) {
  const Icon = STATUS_ICONS[status];
  return (
    <span className={`inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${STATUS_STYLES[status]}`}>
      <Icon className={`h-3.5 w-3.5 ${status === "active" ? "animate-pulse" : ""}`} aria-hidden="true" />
      {getTournamentStatusLabel(status)}
    </span>
  );
}
