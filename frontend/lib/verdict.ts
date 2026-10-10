// TAATVA Obsidian - verdict colours and words, used on every screen.
import type { Verdict } from "./api";

export const FLAG_FROM = 30;
export const QUARANTINE_FROM = 70;

export function verdictFor(score: number): Verdict {
  if (score >= QUARANTINE_FROM) return "quarantine";
  if (score >= FLAG_FROM) return "flag";
  return "pass";
}

// Tailwind classes for each verdict: text colour, soft background, solid fill, border
export const VERDICT_STYLE: Record<Verdict, { text: string; soft: string; solid: string; border: string; hex: string }> = {
  pass: { text: "text-pass", soft: "bg-pass/10", solid: "bg-pass", border: "border-pass/30", hex: "#1f7a45" },
  flag: { text: "text-flag", soft: "bg-flag/10", solid: "bg-flag", border: "border-flag/30", hex: "#b7860b" },
  quarantine: { text: "text-quarantine", soft: "bg-quarantine/10", solid: "bg-quarantine", border: "border-quarantine/30", hex: "#b83236" },
};

// What each verdict means for the AI agent, in plain words
export const VERDICT_MEANING: Record<Verdict, string> = {
  pass: "Safe. The agent gets the clean text. Saved in history.",
  flag: "The agent gets the clean text, and a person is asked to take a look.",
  quarantine: "The agent gets nothing. The file waits for a person to approve or reject it.",
};
