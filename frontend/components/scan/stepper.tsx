"use client";

// TAATVA Obsidian - the strip at the top of the Scan screen:
// the file, the 6 steps with how long each took, and 3 quick numbers.

import { Check, Loader2 } from "lucide-react";
import type { ScanResult } from "@/lib/api";
import { importantFindings, FileBadge, friendlyTime } from "@/components/shared";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "open", label: "Open safely", sub: "type + size check", tool: "Checks the file type and size. Never runs anything inside the file." },
  { key: "ai_view", label: "AI view", sub: "what the AI reads", tool: "PyMuPDF reads every piece of text, with its size, colour and position." },
  { key: "human_view", label: "Human view", sub: "what a person sees", tool: "Gemini + Tesseract copy only the text a person can see on the page picture." },
  { key: "compare", label: "Compare", sub: "AI vs person", tool: "RapidFuzz compares both views. Text only the computer sees is hidden." },
  { key: "order_check", label: "Order check", sub: "sounds like an order?", tool: "Phrase list (+ Prompt Guard) scores how much the text sounds like an order to an AI." },
  { key: "score_clean", label: "Score + clean", sub: "plain math", tool: "Danger = how hidden + how bossy. Plain code, never AI." },
];

type Props = { result: ScanResult | null; scanning: boolean; fileName?: string; fileSize?: number };

export function Stepper({ result, scanning, fileName, fileSize }: Props) {
  const hiddenItems = result ? importantFindings(result.findings).length : null;
  const failedAt = result && result.verdict === "quarantine" && result.findings.length === 0
    ? STEPS.findIndex((s) => result.timings[s.key] === undefined) : -1;

  return (
    <section className="panel flex flex-col gap-5 p-5 lg:flex-row lg:items-center">
      {/* The file */}
      <div className="flex min-w-[220px] items-center gap-3">
        <FileBadge type={result?.file_type ?? "pdf"} className="h-12 w-11" />
        <div className="min-w-0">
          <div className="truncate font-mono text-[14px] text-foreground">{result?.file_name ?? fileName ?? "No file yet"}</div>
          <div className="text-[12px] text-muted-foreground">
            {result
              ? `${result.pages.length || "?"} page${result.pages.length === 1 ? "" : "s"}${fileSize ? ` · ${Math.round(fileSize / 1024)} KB` : ""} · scanned`
              : scanning ? "checking now…" : "drop a file to start"}
          </div>
          {result && <div className="text-[12px] text-muted-foreground">{friendlyTime(result.scanned_at)}</div>}
        </div>
      </div>

      {/* The 6 steps */}
      <ol className="grid flex-1 grid-cols-3 gap-y-4 md:grid-cols-6">
        {STEPS.map((step, i) => {
          const time = result?.timings[step.key];
          const done = time !== undefined;
          const failed = i === failedAt;
          return (
            <li key={step.key} className="relative flex flex-col items-center text-center" title={step.tool}>
              {i > 0 && <span className={cn("absolute right-1/2 top-5 h-0.5 w-full", done || scanning ? "bg-primary" : "bg-border")} />}
              <span
                className={cn(
                  "relative z-10 grid h-10 w-10 place-items-center rounded-full border-[3px] border-white shadow ring-2",
                  failed ? "bg-quarantine ring-quarantine/40" : done ? "bg-primary ring-primary/30" : scanning ? "bg-white ring-primary/40" : "bg-muted ring-border",
                )}
              >
                {failed ? <span className="font-bold text-white">!</span>
                  : done ? <Check className="h-4 w-4 text-white" strokeWidth={3} />
                  : scanning ? <Loader2 className="h-4 w-4 animate-spin text-primary" style={{ animationDelay: `${i * 120}ms` }} />
                  : null}
              </span>
              <span className="mt-2 text-[13px] font-semibold text-foreground">{step.label}</span>
              <span className="text-[11px] text-muted-foreground">{step.sub}</span>
              <span className="mt-1 font-mono text-[11px] text-primary">{done ? `${time!.toFixed(1)} s` : "—"}</span>
            </li>
          );
        })}
      </ol>

      {/* 3 quick numbers */}
      <div className="flex gap-2">
        <Metric value={hiddenItems ?? "—"} label="hidden items" alert={!!hiddenItems} />
        <Metric value={result ? result.total_time.toFixed(1) : "—"} unit={result ? "s" : ""} label="total time" />
        <Metric
          value={result?.witness_agreement ?? "—"}
          unit={result?.witness_agreement != null ? "%" : ""}
          label={result?.private_mode ? "readers agree (1 reader)" : "readers agree"}
        />
      </div>
    </section>
  );
}

function Metric({ value, unit, label, alert }: { value: React.ReactNode; unit?: string; label: string; alert?: boolean }) {
  return (
    <div className={cn("w-[82px] rounded-xl border p-2.5", alert ? "border-quarantine/30 bg-quarantine/10" : "bg-muted/40")}>
      <div className={cn("font-display text-[28px] font-bold leading-none", alert ? "text-quarantine" : "text-foreground")}>
        {value}
        <span className="text-[14px]">{unit}</span>
      </div>
      <div className="mt-1 text-[11px] leading-tight text-muted-foreground">{label}</div>
    </div>
  );
}
