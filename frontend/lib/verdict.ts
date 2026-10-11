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
  pass: { text: "text-pass", soft: "bg-pass/10", solid: "bg-pass", border: "border-pass/30", hex: "hsl(var(--pass))" },
  flag: { text: "text-flag-ink", soft: "bg-flag/10", solid: "bg-flag", border: "border-flag/30", hex: "hsl(var(--flag))" },
  quarantine: { text: "text-quarantine", soft: "bg-quarantine/10", solid: "bg-quarantine", border: "border-quarantine/30", hex: "hsl(var(--quarantine))" },
};

// Plain explanations of the two halves of the danger score (shown on hover)
export const HIDDEN_TIP = "How hidden (0–50): how hard it is for a person to see this text. 0 = in plain view, 50 = completely invisible.";
export const BOSSY_TIP = "How bossy (0–50): how much the text sounds like an order to an AI, like “ignore your rules” or “rank me first”.";
export const DANGER_TIP = "Danger (0–100) = how hidden + how bossy. 0–29 Pass, 30–69 Flag, 70–100 Quarantine.";

// What each verdict means for the AI agent, in plain words
export const VERDICT_MEANING: Record<Verdict, string> = {
  pass: "Safe. The agent gets the clean text. Saved in history.",
  flag: "The agent gets the clean text, and a person is asked to take a look.",
  quarantine: "The agent gets nothing. The file waits for a person to approve or reject it.",
};
