"use client";

// TAATVA Obsidian - a card with a soft steel light that follows the mouse
// (like a torch on the light table). Only on computers with a mouse; on phones
// it is a normal card. Pictures only: it never changes what the card does.

import { useRef } from "react";
import { cn } from "@/lib/utils";

export function SpotlightCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function move(event: React.PointerEvent) {
    if (event.pointerType !== "mouse" || !ref.current) return;
    const box = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--x", `${event.clientX - box.left}px`);
    ref.current.style.setProperty("--y", `${event.clientY - box.top}px`);
  }

  return (
    <div
      ref={ref}
      onPointerMove={move}
      className={cn(
        "group panel relative overflow-hidden hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-e2",
        className,
      )}
    >
      {/* The torch light (hidden until the mouse is over the card) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-base group-hover:opacity-100"
        style={{ background: "radial-gradient(320px circle at var(--x, 50%) var(--y, 50%), hsl(var(--beam) / 0.10), transparent 70%)" }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
