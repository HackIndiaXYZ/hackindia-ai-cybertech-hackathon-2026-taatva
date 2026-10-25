"use client";

// TAATVA Obsidian - Attack Lab counter: "N tried, X caught, Y escaped".
// Every try by everyone counts. Escapes are always shown, never hidden.

import type { LabCounter as Numbers } from "@/lib/api";
import { cn } from "@/lib/utils";

export function LabCounter({ numbers }: { numbers: Numbers | null }) {
  return (
    <section className="panel p-4 sm:p-5" aria-live="polite" data-counter>
      <h2 className="section-title">Scoreboard</h2>
      {numbers ? (
        <>
          <p className="mt-2 font-display text-[26px] font-bold uppercase leading-tight tracking-[0.08em] text-foreground [overflow-wrap:normal] sm:text-[30px]">
            <span data-tried>{numbers.tried}</span> tried,{" "}
            <span className="neon text-pass" data-caught-count>{numbers.caught}</span> caught,{" "}
            <span className={cn(numbers.escaped > 0 ? "neon text-quarantine" : "text-muted-foreground")} data-escaped>
              {numbers.escaped}
            </span>{" "}
            escaped
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Every try counts, also the ones that escape. Only the trick, score, verdict and time are kept, never the sentence.
            {numbers.saved_in === "local file" && " Kept on this server for now, so it starts again from 0 when the server restarts."}
          </p>
        </>
      ) : (
        <p className="mt-2 text-[14px] text-muted-foreground">The scoreboard is loading…</p>
      )}
    </section>
  );
}
