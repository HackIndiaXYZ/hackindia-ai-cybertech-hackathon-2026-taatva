"use client";

// TAATVA Obsidian - the SCAN screen.
// Drop a file -> POST /scan -> see the verdict, the page with X-Ray Reveal,
// the findings, and what the AI agent gets.
// /scan?id=... opens a saved report from History.

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { getScan, scanFile, type ScanResult } from "@/lib/api";
import { useSettings } from "@/components/settings";
import { Stepper } from "@/components/scan/stepper";
import { VerdictCard } from "@/components/scan/verdict-card";
import { DropZone, UploadCard } from "@/components/scan/upload-card";
import { DocumentViewer } from "@/components/scan/document-viewer";
import { AgentCard, FindingsList } from "@/components/scan/findings-list";

export default function ScanPage() {
  return (
    <Suspense>
      <ScanScreen />
    </Suspense>
  );
}

function ScanScreen() {
  const { privateMode, refreshWaiting } = useSettings();
  const params = useSearchParams();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  // Open a saved report from History
  useEffect(() => {
    const id = params.get("id");
    if (id) getScan(id).then(setResult).catch((e) => setError(e.message));
  }, [params]);

  async function scan(newFile: File) {
    setFile(newFile);
    setScanning(true);
    setError(null);
    setResult(null);
    setSelected(null);
    try {
      setResult(await scanFile(newFile, privateMode));
      refreshWaiting();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setScanning(false);
    }
  }

  // Findings worth showing: they matter (danger 30+) or are clearly hidden on purpose
  const shown = useMemo(() => (result?.findings ?? []).filter((f) => f.danger >= 30 || f.hidden_points >= 40), [result]);
  const harmless = useMemo(() => (result?.findings ?? []).filter((f) => !shown.includes(f)), [result, shown]);

  return (
    <div className="space-y-6">
      <Stepper result={result} scanning={scanning} fileName={file?.name} fileSize={file?.size} />

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-quarantine/30 bg-quarantine/5 p-4 text-[14px] text-quarantine">
          <AlertTriangle className="h-5 w-5" />
          Could not check the file: {error}. Is the backend running?
        </div>
      )}

      {/* 3 columns on wide screens; on medium screens the right column moves underneath */}
      <div className="grid gap-6 lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_340px]">
        {/* Left column */}
        <div className="space-y-6">
          <VerdictCard result={result} scanning={scanning} />
          <UploadCard onFile={scan} busy={scanning} />
        </div>

        {/* Middle column */}
        <div>
          {result ? (
            <DocumentViewer result={result} shown={shown} selected={selected} onSelect={setSelected} />
          ) : (
            <section className="panel p-5">
              <h2 className="section-title">Document</h2>
              <div className="mt-5">
                <DropZone onFile={scan} busy={scanning} big />
              </div>
              <p className="mt-4 text-center text-[13px] text-muted-foreground">
                Obsidian reads the file the way an AI would, and the way a person would.
                Anything the AI reads but a person cannot see is hidden, and gets caught.
              </p>
            </section>
          )}
        </div>

        {/* Right column */}
        <div className="grid content-start gap-6 lg:col-span-2 lg:grid-cols-2 xl:col-span-1 xl:grid-cols-1">
          {result ? (
            <>
              <FindingsList shown={shown} harmless={harmless} selected={selected} onSelect={setSelected} />
              <AgentCard result={result} />
            </>
          ) : (
            <section className="panel p-5">
              <h2 className="section-title">Findings</h2>
              <p className="mt-2 text-[13px] text-muted-foreground">Hidden text will be listed here after a scan.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
