"use client";

// TAATVA Obsidian - the "Download report" button (Scan screen and History).
// Makes a PDF report from the result already on screen (see lib/report.ts).

import { useState } from "react";
import { Check, FileDown, Loader2 } from "lucide-react";
import type { ScanResult } from "@/lib/api";

export function DownloadReportButton({ result, className }: { result: ScanResult; className?: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function download() {
    setState("busy");
    try {
      const { downloadReport } = await import("@/lib/report");
      await downloadReport(result);
      setState("done");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
    }
  }

  return (
    <div className={className}>
      <button onClick={download} disabled={state === "busy"}
        className="lift group flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/60 bg-card px-4 py-3 font-display text-[16px] font-semibold uppercase tracking-[0.14em] text-primary hover:bg-primary/5 disabled:cursor-wait disabled:opacity-50">
        {state === "busy" ? <Loader2 className="h-5 w-5 animate-spin" /> : state === "done" ? <Check className="h-5 w-5" /> : <FileDown className="h-5 w-5" />}
        {state === "busy" ? "Making report…" : state === "done" ? "Report saved" : "Download report"}
      </button>
      {state === "error" && (
        <p className="mt-2 text-[13px] text-quarantine" role="alert">Could not make the report. Please try again.</p>
      )}
    </div>
  );
}
