"use client";

// TAATVA Obsidian - small motion wrappers (pictures only, no app logic).
// <FadeIn>  : the content fades in and slides up a little when it comes into view.
// <Stagger> + <StaggerItem> : a list whose items appear one after another.
// With "reduce motion" on, things simply appear (see MotionProvider).
// Content is always in the page from the start (screen readers and tests see it at once).

import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export function FadeIn({ children, delay = 0, className, as = "div" }: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.4, delay, ease: EASE }}
    >
      {children}
    </Tag>
  );
}

export function Stagger({ children, className, gap = 0.06 }: { children: React.ReactNode; className?: string; gap?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{ hidden: { opacity: 0, y: 12 }, shown: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } } }}
    >
      {children}
    </motion.div>
  );
}
