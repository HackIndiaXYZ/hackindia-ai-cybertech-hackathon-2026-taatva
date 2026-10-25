"use client";

// TAATVA Obsidian - the pop-up that says "this email address is not valid"
// (or "is there a typo?") on the sign-up page.

import { useEffect, useRef } from "react";
import { MailWarning, TriangleAlert } from "lucide-react";
import type { EmailProblem } from "@/lib/email-check";

type Props = {
  problem: EmailProblem;
  onClose: () => void;              // "Fix my email"
  onUseSuggestion: () => void;      // "Use name@gmail.com"
  onKeepTyped: () => void;          // "Keep what I typed" (typos only)
};

export function EmailPopup({ problem, onClose, onUseSuggestion, onKeepTyped }: Props) {
  const firstButton = useRef<HTMLButtonElement>(null);
  const typo = Boolean(problem.suggestion);

  useEffect(() => {
    // Put the keyboard on the main button, and let Escape close the pop-up
    firstButton.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const button = "lift w-full rounded-xl px-4 py-3 max-md:min-h-11 font-display text-[15px] font-semibold uppercase tracking-[0.14em]";

  return (
    // A blurred, darker background; the pop-up zooms in softly
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="email-popup-title" aria-describedby="email-popup-text"
        onClick={(e) => e.stopPropagation()}
        className={`panel w-full max-w-sm border-2 p-6 text-center shadow-e3 animate-in fade-in zoom-in-95 duration-300 ${typo ? "border-flag/60" : "border-quarantine/60"}`}>
        {typo
          ? <MailWarning className="mx-auto h-10 w-10 text-flag" />
          : <TriangleAlert className="mx-auto h-10 w-10 text-quarantine" />}
        <h2 id="email-popup-title" className="mt-3 font-display text-[20px] font-bold uppercase tracking-[0.1em] text-foreground">
          {problem.title}
        </h2>
        <p id="email-popup-text" className="mt-2 break-words text-[16px] md:text-[14px] text-foreground">{problem.message}</p>

        <div className="mt-5 space-y-2">
          {typo ? (
            <>
              <button ref={firstButton} onClick={onUseSuggestion}
                className={`${button} break-all bg-primary text-primary-foreground shadow hover:bg-primary/90`}>
                Use <span className="normal-case tracking-normal">{problem.suggestion}</span>
              </button>
              <button onClick={onKeepTyped}
                className={`${button} border-2 border-primary/60 text-primary hover:bg-primary/5`}>
                Keep what I typed
              </button>
            </>
          ) : (
            <button ref={firstButton} onClick={onClose}
              className={`${button} bg-primary text-primary-foreground shadow hover:bg-primary/90`}>
              Fix my email
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
