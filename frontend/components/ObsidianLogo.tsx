"use client";

// TAATVA Obsidian - THE logo ("X-Ray Eye"): a steel hexagon, an eye, and the red
// X-Ray Reveal corners. This is the ONLY place the logo is drawn in the website:
// every other file imports it. (The same drawing is saved as a plain file in
// public/brand/obsidian-logo.svg for the README, icons and anything outside React.)
// useId gives each copy its own gradient name, so several logos on one page never clash.

import { useId } from "react";

export function ObsidianLogo({ size = 40, className, decorative = false }: {
  size?: number;
  className?: string;
  decorative?: boolean; // true when the name "Obsidian" is written right next to it
}) {
  const steel = `steel-${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": "Obsidian logo" })}
    >
      <defs>
        <linearGradient id={steel} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#eef0f3" />
          <stop offset="0.45" stopColor="#8a919b" />
          <stop offset="0.6" stopColor="#c9ced6" />
          <stop offset="1" stopColor="#4a5058" />
        </linearGradient>
      </defs>
      {/* steel hexagon */}
      <polygon points="100,14 174,57 174,143 100,186 26,143 26,57"
        fill="#15171a" stroke={`url(#${steel})`} strokeWidth="8" strokeLinejoin="round" />
      {/* the eye */}
      <path d="M42,100 Q100,46 158,100 Q100,154 42,100 Z"
        fill="#0a0b0c" stroke="#e6e9ee" strokeWidth="4" strokeLinejoin="round" />
      {/* the pupil */}
      <circle cx="100" cy="100" r="21" fill={`url(#${steel})`} />
      <circle cx="100" cy="100" r="8" fill="#0a0b0c" />
      {/* red X-Ray Reveal corners */}
      <path d="M66,80 V66 H80 M120,66 H134 V80 M134,120 V134 H120 M80,134 H66 V120"
        fill="none" stroke="#FF3B3B" strokeWidth="5" strokeLinecap="square" />
    </svg>
  );
}
