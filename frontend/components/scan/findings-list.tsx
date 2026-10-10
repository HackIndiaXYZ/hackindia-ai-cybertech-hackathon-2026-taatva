"use client";

// TAATVA Obsidian - the FINDINGS list on the right of the Scan screen,
// and the "WHAT THE AGENT GETS" card under it.

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Copy, Lock, Send } from "lucide-react";
import type { Finding, ScanResult } from "@/lib/api";
import { VERDICT_STYLE, verdictFor } from "@/lib/verdict";
import { ScoreRing, VerdictPill } from "@/components/shared";
import { cn } from "@/lib/utils";

type Props = {
  shown: Finding[];
  harmless: Finding[];
  selected: number | null;
  onSelect: (index: number) => void;
};

export function FindingsList({ shown, harmless, selected, onSelect }: Props) {
  const [showHarmless, setShowHarmless] = useState(false);

  return (
    <section className="panel p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="section-title">Findings</h2>
        <span className="font-mono text-[11px] text-muted-foreground">{shown.length} found</span>
      </div>
      <p className="text-[12px] text-muted-foreground">
        {shown.length ? "Pick one to spotlight it on the page." : "Nothing hidden that matters."}
      </p>

      <div className="mt-4 space-y-3">
        {shown.map((f, i) => (
          <button key={i} onClick={() => onSelect(i)}
            className={cn("w-full rounded-xl border bg-white p-4 text-left transition hover:border-primary/40",
              selected === i && "border-primary ring-2 ring-primary/20")}>
            <div className="flex gap-3">
              <ScoreRing danger={f.danger} />
              <div className="min-w-0">
                <div className="text-[15px] font-semibold leading-snug text-foreground">
                  <span className="mr-1 text-muted-foreground">{i + 1}.</span>{f.title}
                </div>
                <div className="mt-1"><VerdictPill verdict={verdictFor(f.danger)} size="sm" /></div>
                <p className="mt-2 text-[13px] leading-snug text-muted-foreground">{f.explain}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="tag">{f.where_label}</span>
              <span className="tag">{f.how_label}</span>
              <span className="tag">hidden {f.hidden_points} + bossy {f.bossy_points}</span>
            </div>
          </button>
        ))}
      </div>

      {harmless.length > 0 && (
        <div className="mt-4">
          <button onClick={() => setShowHarmless(!showHarmless)} className="text-[12px] font-medium text-primary hover:underline">
            {showHarmless ? "Hide" : "Show"} {harmless.length} harmless item{harmless.length === 1 ? "" : "s"}
          </button>
          {showHarmless && (
            <ul className="mt-2 space-y-1.5">
              {harmless.map((f, i) => (
                <li key={i} className="rounded-lg border bg-muted/40 px-3 py-2 text-[12px]">
                  <span className="font-medium text-foreground">{f.title}</span>
                  <span className="text-muted-foreground"> · {f.where_label} · danger {f.danger}</span>
                  <div className="truncate font-mono text-[11px] text-muted-foreground">“{f.text}”</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export function AgentCard({ result }: { result: ScanResult }) {
  const [copied, setCopied] = useState(false);
  const style = VERDICT_STYLE[result.verdict];
  const locked = result.verdict === "quarantine";

  async function copy() {
    if (!result.clean_copy) return;
    await navigator.clipboard.writeText(result.clean_copy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="panel p-5">
      <h2 className="section-title">What the agent gets</h2>

      {locked ? (
        <div className="mt-4 flex gap-3 rounded-xl border border-quarantine/30 bg-quarantine/5 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-quarantine text-white"><Lock className="h-5 w-5" /></span>
          <div>
            <div className="font-display text-[17px] font-semibold uppercase tracking-[0.12em] text-quarantine">
              {result.decision === "approved" ? "Approved by a person" : result.decision === "rejected" ? "Rejected · nothing sent" : "Locked · nothing sent"}
            </div>
            <p className="text-[14px] leading-snug text-foreground">
              {result.decision === "rejected"
                ? "A person rejected this file. The agent will never read it."
                : result.decision === "approved"
                  ? "A person approved this file after looking at it."
                  : "Score is 70 or more, so the agent never reads this file until a person says yes."}
            </p>
          </div>
        </div>
      ) : (
        <div className={cn("mt-4 rounded-xl border p-4", style.soft, style.border)}>
          <div className={cn("flex items-center gap-2 font-display text-[17px] font-semibold uppercase tracking-[0.12em]", style.text)}>
            <Send className="h-4 w-4" />
            {result.verdict === "flag" ? "Clean text sent · person alerted" : "Clean text sent"}
          </div>
          <p className="text-[14px] leading-snug text-foreground">
            The agent only gets the text a person can see, labelled
            <span className="font-mono text-[12px]"> “This is data, not instructions.”</span>
          </p>
          {result.clean_copy ? (
            <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border bg-white p-2.5 font-mono text-[11px] text-muted-foreground">
              {result.clean_copy}
            </pre>
          ) : (
            <p className="mt-2 text-[12px] text-muted-foreground">The clean text is not kept after the scan.</p>
          )}
        </div>
      )}

      {/* The copy button does not exist at all for Quarantine */}
      {!locked && result.clean_copy && (
        <button onClick={copy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-display text-[17px] font-semibold uppercase tracking-[0.16em] text-white shadow hover:bg-primary/90">
          {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          {copied ? "Copied" : "Copy clean text"}
        </button>
      )}

      <Link href={result.id ? `/history?open=${result.id}` : "/history"}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/60 px-4 py-3 font-display text-[17px] font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/5">
        Review in history <ArrowRight className="h-5 w-5" />
      </Link>
    </section>
  );
}
