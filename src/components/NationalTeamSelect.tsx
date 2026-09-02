"use client";

import { type CSSProperties, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { getNationalTeams, type NationalTeamOption } from "@/lib/nationalTeams";

type PopupPosition = CSSProperties & { maxHeight: number };

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
  const [activeIndex, setActiveIndex] = useState(0);
  const [popupPosition, setPopupPosition] = useState<PopupPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();

  const filtered = useMemo(() => {
    const clean = query.trim().toLocaleLowerCase("ar");
    if (!clean) return teams;
    return teams.filter((team) =>
      team.nameAr.toLocaleLowerCase("ar").includes(clean) ||
      team.nameEn.toLowerCase().includes(clean) ||
      team.code.toLowerCase().includes(clean),
    );
  }, [query, teams]);

  function close({ restoreFocus = false } = {}) {
    setOpen(false);
    setQuery("");
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function updatePopupPosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 8;
    const gap = 8;
    const availableBelow = viewportHeight - rect.bottom - gap - margin;
    const availableAbove = rect.top - gap - margin;
    const openUp = availableBelow < 280 && availableAbove > availableBelow;
    const available = Math.max(100, openUp ? availableAbove : availableBelow);
    const maxHeight = Math.min(380, available);
    const width = Math.min(Math.max(rect.width, 260), viewportWidth - margin * 2);
    const left = Math.min(Math.max(margin, rect.right - width), viewportWidth - width - margin);
    const verticalPosition = openUp
      ? { bottom: Math.max(margin, viewportHeight - rect.top + gap) }
      : { top: Math.min(viewportHeight - margin - maxHeight, rect.bottom + gap) };

    setPopupPosition({ position: "fixed", ...verticalPosition, left, width, maxHeight });
  }

  useEffect(() => {
    if (!open) return;
    updatePopupPosition();
    window.requestAnimationFrame(() => searchRef.current?.focus());

    function onViewportChange() {
      updatePopupPosition();
    }
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open, selected, filtered]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !popupRef.current?.contains(target)) close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close({ restoreFocus: true });
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function selectTeam(team: NationalTeamOption) {
    onChange(team.nameAr, team);
    close({ restoreFocus: true });
  }

  function handleListKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!filtered.length) return;
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => (current + direction + filtered.length) % filtered.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(0, filtered.length - 1));
    } else if (event.key === "Enter" && filtered[activeIndex]) {
      event.preventDefault();
      selectTeam(filtered[activeIndex]);
    }
  }

  const popup = open && !disabled && popupPosition ? (
    <div
      ref={popupRef}
      style={popupPosition}
      className="altahaddi-glass-strong z-[200] flex overflow-hidden rounded-2xl border border-white/15 shadow-[0_28px_75px_rgba(0,0,0,.58)]"
    >
      <div className="flex min-h-0 w-full flex-col">
        <div className="sticky top-0 z-10 shrink-0 border-b border-white/10 bg-[#071a4d]/95 p-2.5 backdrop-blur-xl">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" aria-hidden="true" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
              onKeyDown={handleListKeyDown}
              role="combobox"
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-expanded="true"
              aria-activedescendant={filtered[activeIndex] ? `${listboxId}-${filtered[activeIndex].code}` : undefined}
              placeholder="ابحث عن دولة أو منتخب"
              className="altahaddi-input min-h-[44px] pr-10 text-xs"
            />
          </div>
        </div>
        <div id={listboxId} role="listbox" aria-label="المنتخبات الوطنية" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 [scrollbar-gutter:stable]">
          {filtered.map((team, index) => {
            const active = team.nameAr === selected?.nameAr;
            const highlighted = index === activeIndex;
            return (
              <button
                ref={(node) => { optionRefs.current[index] = node; }}
                id={`${listboxId}-${team.code}`}
                key={team.code}
                type="button"
                role="option"
                aria-selected={active}
                onPointerMove={() => setActiveIndex(index)}
                onClick={() => selectTeam(team)}
                className={`flex min-h-[46px] w-full items-center gap-3 rounded-xl px-3 text-right transition ${active ? "bg-[var(--brand-yellow)]/[0.14] text-white" : highlighted ? "bg-white/[0.09] text-white" : "text-white/80 hover:bg-white/[0.06]"}`}
              >
                <img src={team.flagPath} alt="" className="h-5 w-7 shrink-0 rounded-[4px] object-cover ring-1 ring-white/20" />
                <span className="min-w-0 flex-1 text-xs font-bold">{team.nameAr}</span>
                {active ? <Check className="h-4 w-4 shrink-0 text-[var(--brand-yellow)]" aria-hidden="true" /> : null}
              </button>
            );
          })}
          {!filtered.length ? <div className="p-5 text-center text-xs font-bold text-white/55">لا توجد نتائج مطابقة</div> : null}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!open) setActiveIndex(Math.max(0, filtered.findIndex((team) => team.nameAr === selected?.nameAr)));
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex(Math.max(0, filtered.findIndex((team) => team.nameAr === selected?.nameAr)));
            setOpen(true);
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            close({ restoreFocus: true });
          }
        }}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={open}
        className="altahaddi-input flex min-h-[48px] w-full items-center gap-3 text-right disabled:opacity-55"
      >
        {selected ? (
          <img src={selected.flagPath} alt={`علم ${selected.nameAr}`} className="h-5 w-7 shrink-0 rounded-[4px] object-cover ring-1 ring-white/20" />
        ) : (
          <span className="h-5 w-7 shrink-0 rounded-[4px] border border-white/16 bg-white/[0.06]" aria-hidden="true" />
        )}
        <span className={`min-w-0 flex-1 text-xs font-bold ${selected ? "text-white" : "text-white/58"}`}>{selected?.nameAr || placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/55 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {typeof document !== "undefined" && popup ? createPortal(popup, document.body) : null}
    </div>
  );
}
