// TAATVA Obsidian - the logo with the name next to it (the "lockup"):
//   [logo]  OBSIDIAN
//           BY TEAM TAATVA · HIDDEN-ORDER SCANNER
// "OBSIDIAN" uses Big Shoulders Display (800), the line below uses JetBrains Mono (500).
// Colours: the team's exact colours in dark mode (#f4f5f7 and #8b9099). In light mode the
// page is light stone, so the same words use the theme's dark ink, or they would be invisible.

import { Big_Shoulders_Display, JetBrains_Mono } from "next/font/google";
import { ObsidianLogo } from "@/components/ObsidianLogo";
import { cn } from "@/lib/utils";

const wordmark = Big_Shoulders_Display({ subsets: ["latin"], weight: ["800"], display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], display: "swap" });

export function ObsidianLockup({ size = 40, showTagline = true, className, taglineClassName }: {
  size?: number;              // size of the logo mark in pixels
  showTagline?: boolean;      // the small line under the name
  className?: string;
  taglineClassName?: string;  // e.g. "max-sm:hidden" to hide the small line on phones
}) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <ObsidianLogo size={size} decorative className="shrink-0" />
      <span className="min-w-0">
        <span
          className={cn(wordmark.className,
            "block whitespace-nowrap uppercase leading-none tracking-[0.12em] text-[#15130F] [overflow-wrap:normal] dark:text-[#f4f5f7]")}
          style={{ fontSize: Math.round(size * 0.72), fontWeight: 800 }}
        >
          Obsidian
        </span>
        {showTagline && (
          <span className={cn(mono.className,
            "mt-1 block whitespace-nowrap text-[10px] uppercase leading-none tracking-[0.24em] text-[#57524A] [overflow-wrap:normal] dark:text-[#8b9099]",
            taglineClassName)}
            style={{ fontWeight: 500 }}>
            By team TAATVA · Hidden-order scanner
          </span>
        )}
      </span>
    </span>
  );
}
