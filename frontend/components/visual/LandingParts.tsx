"use client";

// TAATVA Obsidian - animated pieces for the home page (pictures only, no app logic).
// They animate once when they scroll into view. With "reduce motion" on they simply appear.

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEW = { once: true, margin: "0px 0px -10% 0px" } as const;

// A sharp line that draws itself from left to right (connects the pipeline steps)
export function DrawLine({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.span
      aria-hidden="true"
      className={cn("block h-px origin-left bg-foreground/40", className)}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={VIEW}
      transition={{ duration: 0.6, delay, ease: EASE }}
    />
  );
}

// Delta 4: two bars fill up (4/10 and 8/10), then "8 - 4 = Δ4" appears
export function DeltaBars() {
  const rows = [
    { label: "Old tools ask: “does this sound bad?”", value: 4, tone: "bg-muted-foreground/60", text: "text-muted-foreground" },
    { label: "Obsidian asks: “could a human even see this?”", value: 8, tone: "bg-primary", text: "text-foreground" },
  ];
  return (
    <div className="space-y-6">
      {rows.map((row, i) => (
        <div key={row.value}>
          <div className="flex items-baseline justify-between gap-4">
            <p className={cn("text-[15px] font-medium md:text-[16px]", row.text)}>{row.label}</p>
            <p className={cn("shrink-0 font-display text-[28px] font-bold tabular-nums leading-none", row.text)}>
              {row.value}<span className="text-[15px] text-muted-foreground">/10</span>
            </p>
          </div>
          {/* 10 sharp segments; the bar fills to the score */}
          <div className="relative mt-2 h-3 border bg-muted/60">
            <motion.div
              className={cn("absolute inset-y-0 left-0", row.tone)}
              initial={{ width: 0 }}
              whileInView={{ width: `${row.value * 10}%` }}
              viewport={VIEW}
              transition={{ duration: 0.8, delay: 0.15 + i * 0.25, ease: EASE }}
            />
            <div aria-hidden="true" className="absolute inset-0 grid grid-cols-10">
              {Array.from({ length: 10 }, (_, k) => <span key={k} className="border-r border-background/70 last:border-r-0" />)}
            </div>
          </div>
        </div>
      ))}
      <motion.p
        className="flex items-center justify-end gap-3 font-display text-[22px] font-bold text-foreground md:text-[26px]"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VIEW}
        transition={{ duration: 0.35, delay: 0.9, ease: EASE }}
      >
        <span className="tabular-nums text-muted-foreground">8 − 4 =</span>
        <span className="border-2 border-primary px-3 py-1 shadow-glow">Δ4</span>
      </motion.p>
    </div>
  );
}
