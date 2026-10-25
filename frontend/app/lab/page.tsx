"use client";

// TAATVA Obsidian - ATTACK LAB.
// A judge hides a sentence in a made-up resume with one of 3 tricks, and Obsidian
// scans it live. Left: the Old Way (words only). Right: Obsidian (could a person see it?).
// Every result is a real scan of a resume built a moment before. Nothing is faked.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { getLabCounter, SignInNeeded, tryLab, type LabCounter as Numbers, type LabResult, type LabTrick } from "@/lib/api";
import { useSettings } from "@/components/settings";
import { pageIsOutdated } from "@/components/update-check";
import { LabForm } from "@/components/lab/lab-form";
import { LabResultView } from "@/components/lab/lab-result";
import { LabCounter } from "@/components/lab/lab-counter";
import { LabQr } from "@/components/lab/lab-qr";
import { ScanBeam } from "@/components/visual/ScanBeam";

export default function LabPage() {
  const router = useRouter();
  const { privateMode } = useSettings();
  const [trick, setTrick] = useState<LabTrick>("white");
  const [sentence, setSentence] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LabResult | null>(null);
  const [numbers, setNumbers] = useState<Numbers | null>(null);
  const resultBox = useRef<HTMLDivElement>(null);

  // The scoreboard when the page opens (if it cannot load, the page still works)
  useEffect(() => {
    getLabCounter().then(setNumbers).catch(() => {});
  }, []);
  // Only one try at a time, even after a double-click
  const running = useRef(false);

  async function build() {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      // No attack from an old copy of this page
      if (await pageIsOutdated()) {
        setError("Obsidian was updated since this page was opened. Press “Refresh now” at the top, then try again.");
        return;
      }
      const answer = await tryLab(sentence, trick, privateMode);
      setResult(answer);
      if (answer.counter) setNumbers(answer.counter);
      // On a phone the result is further down: bring it into view
      setTimeout(() => resultBox.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e) {
      if (e instanceof SignInNeeded) return router.replace("/login?next=/lab");
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  return (
    // "dark" + "lab": this page is always dark metal with neon verdict colours
    // (edge to edge on phones: the page gutter is 16px, so -mx-4 / px-4)
    <div className="dark lab relative -mx-4 overflow-hidden rounded-none border-y border-white/5 px-4 py-5 shadow-e3 md:mx-0 md:rounded-3xl md:border md:p-6 lg:p-8">
      {/* A thin neon beam line along the top of the lab */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-beam to-transparent" />
      <div className="relative space-y-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Live · made-up resume · real scan</p>
          <h1 className="mt-2 font-display text-display-md font-bold uppercase tracking-[0.08em] text-foreground">
            Attack Lab
          </h1>
          <p className="mt-2 max-w-3xl text-[15px] text-muted-foreground">
            Hide a sentence in a made-up resume. Obsidian builds the PDF and scans it live.
            The Old Way only asks “does this sound bad?”. Obsidian first asks “could a person even see this?”.
            That is our <b className="text-foreground">Delta 4</b>.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <LabCounter numbers={numbers} />
          <LabQr />
        </div>

        <LabForm trick={trick} sentence={sentence} busy={busy}
          onTrick={setTrick} onSentence={setSentence} onBuild={build} />

        {busy && (
          // While building and scanning: the scanner beam slides over this box (pictures only)
          <div className="panel relative flex items-center gap-3 overflow-hidden border-beam/40 p-4 text-[15px] text-foreground shadow-glow" role="status">
            <ScanBeam />
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
            Building the made-up resume, hiding your sentence, and running the full Obsidian scan…
            (usually 5 to 20 seconds)
          </div>
        )}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-quarantine/40 bg-quarantine/10 p-4 text-[15px] text-foreground animate-in fade-in slide-in-from-top-2" role="alert" data-lab-error>
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-quarantine" />
            <span><b className="text-quarantine">Could not run this try.</b> {error}</span>
          </div>
        )}

        <div ref={resultBox} className="scroll-mt-28">
          {result && <div className="animate-in fade-in slide-in-from-bottom-3 duration-500"><LabResultView lab={result} /></div>}
        </div>
      </div>
    </div>
  );
}
