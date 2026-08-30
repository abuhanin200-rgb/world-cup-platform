import { getTournamentStatusLabel, type TournamentStatus } from "@/domain/tournaments";

type TournamentStatusBadgeProps = {
  status: TournamentStatus;
};

const STATUS_STYLES: Record<TournamentStatus, string> = {
  draft: "border-slate-300/25 bg-slate-300/10 text-slate-100",
  coming_soon: "border-violet-300/30 bg-violet-300/10 text-violet-100",
  registration_open: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  active: "border-emerald-300/35 bg-emerald-300/10 text-emerald-100",
  paused: "border-orange-300/35 bg-orange-300/10 text-orange-100",
  finished: "border-slate-300/25 bg-slate-300/10 text-slate-100",
  hidden: "border-slate-400/25 bg-slate-400/10 text-slate-300",
};

export default function TournamentStatusBadge({
  status,
}: TournamentStatusBadgeProps) {
  return (
    <span
      className={`inline-flex min-h-[32px] items-center justify-center rounded-full border px-3 py-1 text-xs font-black ${STATUS_STYLES[status]}`}
    >
      {status === "active" && (
        <span
          aria-hidden="true"
          className="ml-2 h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]"
        />
      )}
      {getTournamentStatusLabel(status)}
    </span>
  );
}
