"use client";

import { useMemo, useState } from "react";

type TeamFlagSize = "xs" | "sm" | "md" | "lg";

type TeamFlagProps = {
  code?: string | null;
  emoji?: string | null;
  name?: string | null;
  size?: TeamFlagSize;
  className?: string;
};

const FLAG_CODE_TO_FILE: Record<string, string> = {
  // أمثلة مؤكدة من نظامك
  ARG: "ar",
  AUS: "au",
  EGY: "eg",
  KSA: "sa",
  SAU: "sa",
  BEL: "be",
  USA: "us",
  MAR: "ma",
  MOR: "ma",
  NED: "nl",
  PAR: "py",
  PRY: "py",

  // أكواد شائعة إضافية لتقليل احتمالية fallback
  QAT: "qa",
  CAN: "ca",
  MEX: "mx",
  BRA: "br",
  ENG: "gb-eng",
  IRN: "ir",
  SEN: "sn",
  ECU: "ec",
  WAL: "gb-wls",
  FRA: "fr",
  DEN: "dk",
  TUN: "tn",
  ESP: "es",
  GER: "de",
  JPN: "jp",
  CRC: "cr",
  CRO: "hr",
  SRB: "rs",
  SUI: "ch",
  CMR: "cm",
  POR: "pt",
  GHA: "gh",
  URU: "uy",
  KOR: "kr",
  POL: "pl",
  MLI: "ml",
  CIV: "ci",
  NGA: "ng",
  RSA: "za",
  NZL: "nz",
  JAM: "jm",
  PAN: "pa",
  COL: "co",
  CHI: "cl",
  PER: "pe",
  BOL: "bo",
  VEN: "ve",
  ITA: "it",
  UKR: "ua",
  TUR: "tr",
  AUT: "at",
  SWE: "se",
  NOR: "no",
  SCO: "gb-sct",
  ALG: "dz",
  IRQ: "iq",
  UAE: "ae",
  OMA: "om",
  JOR: "jo",
  BHR: "bh",
  KUW: "kw",
  SYR: "sy",
  LBN: "lb",
};

const SIZE_CLASSES: Record<TeamFlagSize, string> = {
  xs: "h-4 w-4 rounded-[4px]",
  sm: "h-5 w-5 rounded-[5px]",
  md: "h-7 w-7 rounded-md",
  lg: "h-10 w-10 rounded-lg",
};

const EMOJI_SIZE_CLASSES: Record<TeamFlagSize, string> = {
  xs: "text-[14px]",
  sm: "text-[18px]",
  md: "text-[24px]",
  lg: "text-[34px]",
};

function normalizeTeamCode(code?: string | null) {
  return String(code || "")
    .trim()
    .toUpperCase();
}

function getFlagFileName(code?: string | null) {
  const normalizedCode = normalizeTeamCode(code);

  if (!normalizedCode) return null;

  return FLAG_CODE_TO_FILE[normalizedCode] || normalizedCode.toLowerCase();
}

export default function TeamFlag({
  code,
  emoji,
  name,
  size = "md",
  className = "",
}: TeamFlagProps) {
  const [failed, setFailed] = useState(false);

  const flagFileName = useMemo(() => getFlagFileName(code), [code]);
  const safeEmoji = emoji || "🏳️";
  const altText = name ? `علم ${name}` : "علم المنتخب";

  if (!flagFileName || failed) {
    return (
      <span
        aria-label={altText}
        title={name || undefined}
        className={[
          "inline-flex shrink-0 items-center justify-center leading-none",
          EMOJI_SIZE_CLASSES[size],
          className,
        ].join(" ")}
      >
        {safeEmoji}
      </span>
    );
  }

  return (
    <img
      src={`/flags/${flagFileName}.svg`}
      alt={altText}
      title={name || undefined}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      className={[
        "inline-block shrink-0 object-cover shadow-sm ring-1 ring-white/15",
        SIZE_CLASSES[size],
        className,
      ].join(" ")}
    />
  );
}