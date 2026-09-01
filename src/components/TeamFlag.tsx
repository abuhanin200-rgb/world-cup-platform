"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flag } from "lucide-react";
import { findNationalTeamByName } from "@/lib/nationalTeams";

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

  const flagFileName = useMemo(() => {
    const direct = getFlagFileName(code);
    if (direct) return direct;
    const nationalTeam = name ? findNationalTeamByName(name) : null;
    return nationalTeam?.code.toLowerCase() || null;
  }, [code, name]);
  const altText = name ? `علم ${name}` : "علم المنتخب";

  if (!flagFileName || failed) {
    return (
      <motion.span
        aria-label={altText}
        title={name || undefined}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.14, ease: "easeOut" }}
        className={[
          "inline-flex shrink-0 transform-gpu items-center justify-center rounded-md border border-white/12 bg-white/[0.05] text-white/35",
          SIZE_CLASSES[size],
          className,
        ].join(" ")}
      >
        <Flag className="h-1/2 w-1/2" />
      </motion.span>
    );
  }

  return (
    <motion.img
      src={`/flags/${flagFileName}.svg`}
      alt={altText}
      title={name || undefined}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.14, ease: "easeOut" }}
      className={[
        "inline-block shrink-0 transform-gpu object-cover shadow-sm ring-1 ring-white/15",
        SIZE_CLASSES[size],
        className,
      ].join(" ")}
    />
  );
}
