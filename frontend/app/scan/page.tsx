"use client";

// TAATVA Obsidian - the SCAN screen.
// Drop a file -> POST /scan -> see the verdict, the page with X-Ray Reveal,
// the findings, and what the AI agent gets.
// /scan?id=... opens a saved report from History.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Loader2, Smartphone } from "lucide-react";
import { getScan, getStatus, scanFile, SignInNeeded, type ScanResult } from "@/lib/api";
import { pageIsOutdated } from "@/components/update-check";
import { useSettings } from "@/components/settings";
import { Stepper } from "@/components/scan/stepper";
import { VerdictCard } from "@/components/scan/verdict-card";
import { closedWhilePicking, DropZone, UploadCard } from "@/components/scan/upload-card";
import dynamic from "next/dynamic";

// The result parts are only needed once a file is scanned, so phones download them
// later and the empty Scan page opens faster (Lighthouse, QA-24).
const DocumentViewer = dynamic(() => import("@/components/scan/document-viewer").then((m) => m.DocumentViewer));
const FindingsList = dynamic(() => import("@/components/scan/findings-list").then((m) => m.FindingsList));
const AgentCard = dynamic(() => import("@/components/scan/findings-list").then((m) => m.AgentCard));

const MAX_MB = 20;
const KINDS = [".pdf", ".html", ".htm", ".eml"];
const CONNECTION_HELP =
  "The scanner stopped answering while checking this file. This can happen if it was waking up, " +
  "if the file was very large, or if the phone switched apps or lost signal during the scan. " +
  "Please keep this page open and try again.";

// Problems we can spot before uploading (size and type)
function checkFileFirst(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!KINDS.some((kind) => name.endsWith(kind))) {
    return "Obsidian checks PDF files, web pages (.html) and saved emails (.eml). Please choose one of those.";
  }
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_MB * 1024 * 1024) {
    return `This file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_MB} MB.`;
  }
  return null;
}

// "Failed to fetch" and similar: the connection broke, there was no real answer
function isConnectionProblem(e: unknown) {
  return e instanceof TypeError || (e instanceof Error && /failed to fetch|network|load failed/i.test(e.message));
}

// Ask the scanner "are you there?" every 3 seconds, for up to `limit` milliseconds
async function waitForScanner(limit: number) {
  const until = Date.now() + limit;
  while (Date.now() < until) {
    try {
      await getStatus();
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  return false;
}

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
  const router = useRouter();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // A note when the phone lost the chosen file: it reloaded the page, or lost the file on the way
  const [phoneNote, setPhoneNote] = useState<"reloaded" | "lost" | null>(null);
  const phoneNoteBox = useRef<HTMLDivElement>(null);
  const fileLost = useCallback(() => setPhoneNote("lost"), []);
  // Only ONE scan at a time, even after a double-click or picking two files fast
  const busy = useRef(false);

  // While a scan runs, refreshing or going back would lose the result on screen:
  // the browser asks "Leave this page?" first (the result is still saved in History).
  useEffect(() => {
    if (!scanning) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [scanning]);

  // Did the phone close this page while a file was being chosen? Then explain, kindly.
  // (Only ever switches the note ON: in developer mode this runs twice, and the 2nd run finds nothing)
  useEffect(() => {
    if (closedWhilePicking()) setPhoneNote("reloaded");
  }, []);
  // Bring the note into view: on a phone the person is further down, at the upload box
  useEffect(() => {
    if (phoneNote) phoneNoteBox.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [phoneNote]);

  // Open a saved report from History
  useEffect(() => {
    const id = params.get("id");
    if (id) getScan(id).then(setResult).catch((e) => setError(e.message));
  }, [params]);

  async function scan(newFile: File) {
    if (busy.current) return;
    setFile(newFile);
    setPhoneNote(null);
    setError(null);
    setResult(null);
    setSelected(null);

    // Check the file on the phone/computer first, so we never upload something we cannot scan
    const problem = checkFileFirst(newFile);
    if (problem) return setError(problem);

    busy.current = true;
    setScanning(true);
    try {
      // An old copy of this page may have old bugs: ask for a refresh before scanning
      if (await pageIsOutdated()) {
        setError("Obsidian was updated since this page was opened. Press “Refresh now” at the top, then choose your file again.");
        return;
      }
      setResult(await scanWithOneRetry(newFile));
      refreshWaiting();
    } catch (e) {
      if (e instanceof SignInNeeded) {
        router.replace("/login?next=/scan");
        return;
      }
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      busy.current = false;
      setScanning(false);
    }
  }

  // If the connection breaks (for example the scanner restarted or was waking up),
  // wait until the scanner answers again, then try ONE more time.
  async function scanWithOneRetry(newFile: File) {
    try {
      return await scanFile(newFile, privateMode);
    } catch (e) {
      if (!isConnectionProblem(e)) throw e;
      setNotice("The scanner did not answer. Waiting for it to be ready, then trying once more…");
      const ready = await waitForScanner(90_000);
      setNotice(null);
      if (!ready) throw new Error(CONNECTION_HELP);
      try {
        return await scanFile(newFile, privateMode);
      } catch (again) {
        throw isConnectionProblem(again) ? new Error(CONNECTION_HELP) : again;
      }
    }
  }

  // Findings worth showing: they matter (danger 30+) or are clearly hidden on purpose
  const shown = useMemo(() => (result?.findings ?? []).filter((f) => f.danger >= 30 || f.hidden_points >= 40), [result]);
  const harmless = useMemo(() => (result?.findings ?? []).filter((f) => !shown.includes(f)), [result, shown]);

  return (
    <div className="space-y-6">
      <Stepper result={result} scanning={scanning} fileName={file?.name} fileSize={file?.size} />

      {phoneNote && (
        <div ref={phoneNoteBox} className="flex items-start gap-3 rounded-xl border border-flag/30 bg-flag/10 p-4 text-[14px] text-foreground" role="status">
          <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-flag-ink" />
          {phoneNote === "reloaded" ? (
            <span>
              <b>Your phone reloaded this page to save memory</b> while you were choosing a file, so the file did not arrive.
              Please choose it again. If this keeps happening, close a few other apps or browser tabs first.
            </span>
          ) : (
            <span>
              <b>Your phone was low on memory, so the file you chose did not reach Obsidian.</b> Nothing was scanned.
              Close a few other apps or browser tabs, then choose the file again. Tip: picking it from <b>Downloads</b> or <b>Files</b> uses
              less memory than Google Drive or WhatsApp.
            </span>
          )}
          <button onClick={() => setPhoneNote(null)} className="ml-auto text-[12px] text-muted-foreground underline max-md:min-h-11 max-md:min-w-11">OK</button>
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-3 rounded-xl border border-flag/30 bg-flag/10 p-4 text-[14px] text-foreground" role="status">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-flag-ink" />
          {notice}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-quarantine/30 bg-quarantine/5 p-4 text-[14px] text-foreground" role="alert">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-quarantine" />
          <span><b className="text-quarantine">Could not check the file.</b> {error}</span>
        </div>
      )}
      {result?.save_error && (
        <div className="flex items-center gap-3 rounded-xl border border-flag/30 bg-flag/10 p-4 text-[14px] text-flag-ink">
          <AlertTriangle className="h-5 w-5" />
          {result.save_error} The verdict below still stands.
        </div>
      )}

      {/* 3 columns on wide screens; on medium screens the right column moves underneath */}
      <div className="grid gap-6 lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_340px]">
        {/* Left column */}
        <div className="space-y-6">
          <VerdictCard result={result} scanning={scanning} />
          <UploadCard onFile={scan} busy={scanning} onFileLost={fileLost} />
        </div>

        {/* Middle column */}
        <div>
          {result ? (
            <DocumentViewer result={result} shown={shown} selected={selected} onSelect={setSelected} />
          ) : (
            <section className="panel p-5">
              <h2 className="section-title">Document</h2>
              <div className="mt-5">
                <DropZone onFile={scan} busy={scanning} big onFileLost={fileLost} />
              </div>
              <p className="mt-4 text-center text-[15px] md:text-[13px] text-muted-foreground">
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
              <p className="mt-2 text-[15px] md:text-[13px] text-muted-foreground">Hidden text will be listed here after a scan.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
