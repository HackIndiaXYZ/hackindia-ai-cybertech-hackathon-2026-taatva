"use client";

// TAATVA Obsidian - Attack Lab result: the split view.
//   LEFT  "Old Way: words only": our phrase list on the plain text. It only asks
//         "does this sound bad?", so the most it can give is 50 (it can never go red).
//   RIGHT "Obsidian": the full existing scan. It first asks "could a person even see this?".
//         That gap is Delta 4. Every number here comes from the real scan, nothing is made up.

import { useMemo, useState } from "react";
import { CheckCircle2, Info, Lock, Send, ShieldAlert, XCircle } from "lucide-react";
import type { LabResult, ScanResult } from "@/lib/api";
import { VERDICT_STYLE } from "@/lib/verdict";
import { ScoreRing, VerdictPill } from "@/components/shared";
import { DocumentViewer } from "@/components/scan/document-viewer";
import { TRICKS } from "./lab-form";
import { cn } from "@/lib/utils";

const NOTHING = "NOTHING - file held for a human";

// The existing X-Ray viewer expects a scan result: give it the Lab's real scan
function asScan(lab: LabResult): ScanResult {
  const o = lab.obsidian;
  return {
    id: "", file_name: "made-up resume (Taylor Quinn)", file_type: "pdf",
    score: o.score, verdict: o.verdict, reasons: o.reasons, findings: o.findings, worst_finding: "",
    clean_copy: null, pages: o.pages, page_images: o.page_images, views: o.views, timings: {},
    total_time: o.total_time, witness_agreement: null, private_mode: o.private_mode, decision: "sent",
  };
}

export function LabResultView({ lab }: { lab: LabResult }) {
  const scan = useMemo(() => asScan(lab), [lab]);
  // Same rule as the Scan screen: findings that matter or are clearly hidden on purpose
  const shown = useMemo(() => scan.findings.filter((f) => f.danger >= 30 || f.hidden_points >= 40), [scan]);
  const [selected, setSelected] = useState<number | null>(null);
  const trick = TRICKS.find((t) => t.key === lab.answer_key.trick);

  return (
    <div className="space-y-5">
      {/* CAUGHT or ESCAPED: escapes are never hidden */}
      <section className={cn("panel flex flex-wrap items-center gap-x-5 gap-y-3 p-4 sm:p-5",
        lab.caught ? "border-pass/50" : "border-quarantine/60")} role="status" data-caught={lab.caught}>
        {lab.caught
          ? <CheckCircle2 className="neon h-10 w-10 shrink-0 text-pass" />
          : <XCircle className="neon h-10 w-10 shrink-0 text-quarantine" />}
        <div className="min-w-0 flex-1 max-sm:basis-[calc(100%-60px)]">
          {/* [overflow-wrap:normal]: a big word like CAUGHT must never be split over two lines */}
          <div className={cn("neon font-display text-[34px] font-bold uppercase leading-none tracking-[0.14em] [overflow-wrap:normal] sm:text-[42px]",
            lab.caught ? "text-pass" : "text-quarantine")}>
            {lab.caught ? "Caught" : "Escaped"}
          </div>
          <p className="mt-1 text-[15px] text-foreground">{lab.plain_line}</p>
        </div>
        <span className="tag max-sm:ml-[60px]">trick: {trick?.label ?? lab.answer_key.trick}</span>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <OldWay lab={lab} />
        <div className="space-y-5">
          <ObsidianSide lab={lab} />
          <DocumentViewer result={scan} shown={shown} selected={selected} onSelect={setSelected} edgeMarkers />
          <FindingLines lab={lab} shown={shown} />
          <AgentReceives lab={lab} />
        </div>
      </div>
    </div>
  );
}

// LEFT: the words-only checker
function OldWay({ lab }: { lab: LabResult }) {
  const old = lab.old_way;
  return (
    <section className="panel h-fit p-4 sm:p-5 lg:sticky lg:top-24" data-side="old-way">
      <h2 className="font-display text-[24px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Old Way: words only</h2>
      <p className="text-[14px] text-muted-foreground">Reads the words. Only asks: “does this sound bad?”</p>
      {old ? (
        <>
          <div className="mt-4 flex items-center gap-4">
            <ScoreRing danger={old.score} size={84} />
            <div className="space-y-2">
              <VerdictPill verdict={old.verdict} />
              <div className="font-mono text-[12px] text-muted-foreground">score {old.score} / 100 · bossy {old.bossy.toFixed(2)} × 50</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Words it noticed</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {old.phrases.length ? old.phrases.map((p) => <span key={p} className="tag">{p}</span>)
                : <span className="text-[14px] text-muted-foreground">Nothing sounded bad.</span>}
            </div>
          </div>
          <div className="mt-4 flex gap-2.5 rounded-xl border bg-muted/40 p-3 text-[14px] text-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              It never asks if a person could even <b>see</b> the text, so the most it can give is 50: it can never go red.
              On Pass or Flag the agent still reads every word, <b>including your hidden sentence</b>.
            </span>
          </div>
        </>
      ) : (
        <p className="mt-4 text-[14px] text-muted-foreground">The words-only check could not run for this try.</p>
      )}
    </section>
  );
}

// RIGHT, top: the full Obsidian scan
function ObsidianSide({ lab }: { lab: LabResult }) {
  const o = lab.obsidian;
  const style = VERDICT_STYLE[o.verdict];
  const guardOn = o.prompt_guard === "ready";
  return (
    <section className={cn("panel p-4 sm:p-5", style.border)} data-side="obsidian">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[24px] font-bold uppercase tracking-[0.14em] text-foreground">Obsidian</h2>
          <p className="text-[14px] text-muted-foreground">First asks: “could a person even see this?”</p>
        </div>
        <span className={cn("neon-box rounded-full px-3 py-1 font-display text-[16px] font-bold uppercase tracking-[0.16em] [overflow-wrap:normal]", style.text, style.soft)}>
          {o.verdict}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <ScoreRing danger={o.score} size={84} />
        <div className="space-y-1.5">
          <div className={cn("neon font-display text-[30px] font-bold leading-none", style.text)}>{o.score} / 100</div>
          <div className="font-mono text-[12px] text-muted-foreground">danger = how hidden + how bossy</div>
          {lab.old_way && (
            <div className="font-mono text-[12px] text-foreground">Old Way {lab.old_way.score} → Obsidian {o.score}</div>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className={cn("tag", guardOn && "border-pass/40 text-pass")}>
          {guardOn ? "Second opinion: Prompt Guard ON (runs on this laptop)" : "Prompt Guard is off · phrase list only"}
        </span>
        <span className="tag">{o.private_mode ? "pages read by Tesseract only" : "pages read by Gemini + Tesseract"}</span>
        {o.total_time != null && <span className="tag">{o.total_time} s</span>}
      </div>
      {o.notes.map((note) => (
        <p key={note} className="mt-3 rounded-lg border border-flag/30 bg-flag/10 p-2.5 text-[14px] text-foreground">{note}</p>
      ))}
    </section>
  );
}

// RIGHT: one plain-English line under each finding (fixed templates from the backend, no AI)
function FindingLines({ lab, shown }: { lab: LabResult; shown: LabResult["obsidian"]["findings"] }) {
  if (!shown.length) return null;
  return (
    <section className="panel p-4 sm:p-5">
      <h2 className="section-title">What Obsidian found</h2>
      <ul className="mt-3 space-y-3">
        {shown.map((f, i) => (
          <li key={i} className="flex gap-3 rounded-xl border bg-muted/30 p-3">
            <ScoreRing danger={f.danger} size={44} />
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-foreground">{f.title}</div>
              <p className="mt-0.5 text-[14px] leading-snug text-muted-foreground">{f.explain}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="tag">{f.where_label}</span>
                <span className="tag">hidden {f.hidden_points} + bossy {f.bossy_points}</span>
                {f.phrase_score != null && (
                  <span className="tag">
                    phrase list {f.phrase_score.toFixed(2)}
                    {f.prompt_guard_score != null && ` · Prompt Guard ${f.prompt_guard_score.toFixed(2)}`}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {lab.obsidian.findings.length > shown.length && (
        <p className="mt-3 text-[13px] text-muted-foreground">
          {lab.obsidian.findings.length - shown.length} more harmless item(s), like normal file details.
        </p>
      )}
    </section>
  );
}

// RIGHT, bottom: what the AI agent would get. Quarantine = nothing, and no copy button.
function AgentReceives({ lab }: { lab: LabResult }) {
  const held = lab.obsidian.verdict === "quarantine" || lab.agent_receives === NOTHING;
  return (
    <section className="panel p-4 sm:p-5" data-agent={held ? "nothing" : "clean-copy"}>
      <h2 className="section-title">The agent would receive:</h2>
      {held ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl border-2 border-quarantine/60 bg-quarantine/10 p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-quarantine text-white dark:text-neutral-950"><Lock className="h-5 w-5" /></span>
          <div>
            <div className="neon font-display text-[22px] font-bold uppercase tracking-[0.12em] text-quarantine">{NOTHING}</div>
            <p className="text-[14px] text-foreground">The AI agent never reads this file unless a person approves it.</p>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-pass/40 bg-pass/5 p-3">
          <div className="flex items-center gap-2 font-display text-[17px] font-semibold uppercase tracking-[0.12em] text-pass">
            <Send className="h-4 w-4" /> Clean copy only · your hidden sentence removed
          </div>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border bg-background/60 p-2.5 font-mono text-[12px] text-muted-foreground">
            {lab.agent_receives}
          </pre>
        </div>
      )}
      <p className="mt-3 flex items-center gap-2 text-[13px] text-muted-foreground">
        <ShieldAlert className="h-4 w-4 shrink-0" /> Attack Lab never sends anything to a real AI agent.
      </p>
    </section>
  );
}
