"use client";

// TAATVA Obsidian - the strip at the top of the Scan screen:
// the file, the 6 steps with how long each took, and 3 quick numbers.

import { Check, Loader2 } from "lucide-react";
import type { ScanResult } from "@/lib/api";
import { importantFindings, FileBadge, friendlyTime } from "@/components/shared";
import { cn } from "@/lib/utils";
import { ScanBeam } from "@/components/visual/ScanBeam";

const STEPS = [
  { key: "open", label: "Open safely", sub: "type + size check",
    tool: "Checks the file is really what it says it is and not too big. Nothing inside the file is ever run." },
  { key: "ai_view", label: "AI view", sub: "what the AI reads",
    tool: "Collects every bit of text an AI tool would read, including text people cannot see." },
  { key: "human_view", label: "Human view", sub: "what a person sees",
    tool: "Takes a picture of each page and writes down only the text a person can actually see." },
  { key: "compare", label: "Compare", sub: "AI vs person",
    tool: "Puts both views side by side. Text the AI reads but a person cannot see is hidden." },
  { key: "order_check", label: "Order check", sub: "sounds like an order?",
    tool: "Checks if any text sounds like an order to an AI, such as “ignore your rules” or “rank me first”." },
  { key: "score_clean", label: "Score + clean", sub: "plain math",
    tool: "Danger = how hidden + how bossy, worked out with simple fixed rules (never by AI). Then makes the clean copy." },
];

type Props = { result: ScanResult | null; scanning: boolean; fileName?: string; fileSize?: number };

export function Stepper({ result, scanning, fileName, fileSize }: Props) {
  const hiddenItems = result ? importantFindings(result.findings).length : null;
  // Which step stopped the scan? A file refused at the start (too big, not a PDF...) only has
  // the "open" time, so "Open safely" is the step that held it (QA-19).
  const timed = result ? Object.keys(result.timings) : [];
  const failedAt = result && result.verdict === "quarantine" && result.findings.length === 0
    ? (timed.length <= 1 ? 0 : STEPS.findIndex((s) => result.timings[s.key] === undefined)) : -1;

  return (
    <section className={cn("panel relative flex flex-col gap-5 overflow-hidden p-5 lg:flex-row lg:items-center", scanning && "border-beam/40 shadow-glow")}>
      {/* While checking: a scanner beam slides over the strip (pictures only) */}
      {scanning && <ScanBeam />}
      {/* The file */}
      <div className="relative flex min-w-[220px] items-center gap-3">
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
      <ol className="relative grid flex-1 grid-cols-3 gap-y-4 md:grid-cols-6">
        {STEPS.map((step, i) => {
          const time = result?.timings[step.key];
          const done = time !== undefined;
          const failed = i === failedAt;
          return (
            <li key={step.key} className="group relative flex flex-col items-center text-center" title={step.tool}>
              {i > 0 && <span className={cn("absolute right-1/2 top-5 h-0.5 w-full", i === 3 && "max-md:hidden",
                done ? "bg-primary" : scanning ? "animate-pulse bg-primary/60" : "bg-border")} />}
              <span
                className={cn(
                  "relative z-10 grid h-10 w-10 place-items-center rounded-full border-[3px] border-card shadow ring-2 transition-transform duration-base ease-out-soft group-hover:scale-110",
                  failed ? "bg-quarantine ring-quarantine/40" : done ? "bg-primary shadow-glow ring-primary/30" : scanning ? "bg-card ring-primary/40" : "bg-muted ring-border",
                )}
              >
                {failed ? <span className="font-bold text-white dark:text-neutral-950" aria-label="This step held the file">!</span>
                  : done ? <Check className="h-4 w-4 text-primary-foreground" />
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
      <div className="relative flex gap-2">
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
    <div className={cn("min-w-[86px] flex-1 rounded-xl border p-2.5 lg:flex-none", alert ? "border-quarantine/30 bg-quarantine/10" : "bg-muted/40")}>
      <div className={cn("whitespace-nowrap font-display text-[28px] font-bold leading-none tabular-nums", alert ? "text-quarantine" : "text-foreground")}>
        {value}
        <span className="ml-0.5 text-[14px] font-medium text-muted-foreground">{unit}</span>
      </div>
      <div className="mt-1 text-[11px] leading-tight text-muted-foreground">{label}</div>
    </div>
  );
}
