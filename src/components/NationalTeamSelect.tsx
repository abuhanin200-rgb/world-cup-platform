"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { getNationalTeams, type NationalTeamOption } from "@/lib/nationalTeams";

export default function NationalTeamSelect({
  value,
  onChange,
  disabled = false,
  placeholder = "اختر المنتخب المفضل",
}: {
  value: string;
  onChange: (value: string, team: NationalTeamOption | null) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const teams = useMemo(() => getNationalTeams(), []);
  const selected = useMemo(() => teams.find((team) => team.nameAr === value || team.nameEn === value) || null, [teams, value]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, []);

  const filtered = useMemo(() => {
    const clean = query.trim().toLocaleLowerCase("ar");
    if (!clean) return teams;
    return teams.filter((team) =>
      team.nameAr.toLocaleLowerCase("ar").includes(clean) ||
      team.nameEn.toLowerCase().includes(clean) ||
      team.code.toLowerCase().includes(clean),
    );
  }, [query, teams]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="altahaddi-input flex min-h-[48px] w-full items-center gap-3 text-right disabled:opacity-55"
      >
        {selected ? (
          <img
            src={selected.flagPath}
            alt={`علم ${selected.nameAr}`}
            className="h-5 w-7 shrink-0 rounded-[4px] object-cover ring-1 ring-white/15"
          />
        ) : (
          <span className="h-5 w-7 shrink-0 rounded-[4px] border border-white/12 bg-white/[0.05]" />
        )}
        <span className={`min-w-0 flex-1 truncate text-xs font-bold ${selected ? "text-white" : "text-white/40"}`}>
          {selected?.nameAr || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/35 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && !disabled ? (
        <div className="altahaddi-glass-strong absolute inset-x-0 top-[calc(100%+8px)] z-[120] overflow-hidden rounded-2xl border border-white/12 shadow-[0_22px_55px_rgba(0,0,0,.45)]">
          <div className="border-b border-white/10 p-2.5">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoFocus
                placeholder="ابحث عن دولة أو منتخب"
                className="altahaddi-input min-h-[42px] pr-10 text-xs"
              />
            </div>
          </div>
          <div role="listbox" className="max-h-72 overflow-y-auto overscroll-contain p-1.5">
            {filtered.map((team) => {
              const active = team.nameAr === selected?.nameAr;
              return (
                <button
                  key={team.code}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(team.nameAr, team);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-right transition ${active ? "bg-[var(--brand-yellow)]/[0.12] text-white" : "text-white/75 hover:bg-white/[0.06]"}`}
                >
                  <img src={team.flagPath} alt="" className="h-5 w-7 shrink-0 rounded-[4px] object-cover ring-1 ring-white/15" />
                  <span className="min-w-0 flex-1 truncate text-xs font-bold">{team.nameAr}</span>
                  {active ? <Check className="h-4 w-4 shrink-0 text-[var(--brand-yellow)]" /> : null}
                </button>
              );
            })}
            {!filtered.length ? <div className="p-5 text-center text-xs font-bold text-white/35">لا توجد نتائج</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
