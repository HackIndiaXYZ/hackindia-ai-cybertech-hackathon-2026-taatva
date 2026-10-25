"use client";

// TAATVA Obsidian - motion settings for the whole website.
// reducedMotion="user": if the computer or phone has "reduce motion" turned on,
// framer-motion skips the sliding and lifting (things simply appear).
// Also turns on the hover notes (tooltips) everywhere.

import { MotionConfig } from "framer-motion";
import { TooltipProvider } from "@/components/ui/tooltip";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
      <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
    </MotionConfig>
  );
}
