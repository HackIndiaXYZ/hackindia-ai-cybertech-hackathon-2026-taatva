"use client";

// TAATVA Obsidian - small motion pieces for the scan RESULTS (pictures only).
// Rules: they never change a number or a word, they never hide a result for long
// (everything is on screen within ~0.6 s), and with "reduce motion" on they show
// the final state at once.

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

// A number that counts up from 0 and ALWAYS ends on the exact real value.
// (The real value is also in the gauge's aria-label from the very start,
// so screen readers and tests never see a wrong number.)
export function CountUp({ value, duration = 0.7 }: { value: number; duration?: number }) {
  const calm = useReducedMotion();
  const [shown, setShown] = useState(calm ? value : 0);
  const from = useRef(0);

  useEffect(() => {
    if (calm) {
      setShown(value);
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => setShown(Math.round(v)),
      onComplete: () => {
        setShown(value); // land exactly on the real value
        from.current = value;
      },
    });
    return () => controls.stop();
  }, [value, duration, calm]);

  return <>{shown}</>;
}

// An SVG line that draws itself in (used for the gauge arc)
export function DrawPath(props: React.SVGProps<SVGPathElement> & { delay?: number }) {
  const { delay = 0, ...rest } = props;
  return (
    <motion.path
      {...(rest as React.ComponentProps<typeof motion.path>)}
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    />
  );
}

// The verdict badge springs in (a little bounce), replayed when the verdict changes
export function SpringIn({ children, className, replay }: { children: React.ReactNode; className?: string; replay?: string }) {
  return (
    <motion.div
      key={replay}
      className={className}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

// Fades in and slides up a little on first show; `delay` makes lists appear one by one
export function Appear({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(delay, 0.3), ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

// Opens and closes smoothly (the "Show harmless items" list). Shown only while open.
export function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
