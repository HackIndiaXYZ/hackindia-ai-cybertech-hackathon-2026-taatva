"use client";

// TAATVA Obsidian - the "AI recruiter" demo.
// Same resumes, same AI recruiter. Button A sends the original files.
// Button B sends them through Obsidian first, and only the clean copies reach the AI.
// The two rankings are shown side by side.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bot, FileText, Loader2, Play, ShieldCheck, ShieldOff, Upload, X } from "lucide-react";
import { runDemo, SignInNeeded, type DemoResult } from "@/lib/api";
import { useSettings } from "@/components/settings";
import { FileBadge, VerdictPill } from "@/components/shared";
import { cn } from "@/lib/utils";

const DEMO_FILES = ["demo_1_maya_chen.pdf", "demo_2_daniel_okafor.pdf", "demo_3_riley_brooks.pdf"];
const DEFAULT_JOB =
  "Senior Backend Engineer (Python). 5+ years building APIs with Python, PostgreSQL and cloud services. Will lead a small team.";

type Mode = "original" | "obsidian";
type Side = { loading: boolean; result: DemoResult | null; error: string | null };
const EMPTY: Side = { loading: false, result: null, error: null };

export default function DemoPage() {
  const router = useRouter();
  const { privateMode } = useSettings();
  const input = useRef<HTMLInputElement>(null);
  const [job, setJob] = useState(DEFAULT_JOB);
  const [files, setFiles] = useState<File[]>([]);
  const [sides, setSides] = useState<Record<Mode, Side>>({ original: EMPTY, obsidian: EMPTY });

  async function loadDemoFiles() {
    const loaded = await Promise.all(DEMO_FILES.map(async (name) => {
      const blob = await (await fetch(`/demo/${name}`)).blob();
      return new File([blob], name, { type: "application/pdf" });
    }));
    setFiles(loaded);
    setSides({ original: EMPTY, obsidian: EMPTY });
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((old) => [...old, ...Array.from(list)].slice(0, 3));
    setSides({ original: EMPTY, obsidian: EMPTY });
  }

  async function send(mode: Mode) {
    setSides((s) => ({ ...s, [mode]: { loading: true, result: null, error: null } }));
    try {
      const result = await runDemo(files, mode, job, privateMode);
      setSides((s) => ({ ...s, [mode]: { loading: false, result, error: null } }));
    } catch (e) {
      if (e instanceof SignInNeeded) return router.replace("/login?next=/demo");
      setSides((s) => ({ ...s, [mode]: { loading: false, result: null, error: e instanceof Error ? e.message : "Something went wrong." } }));
    }
  }

  const ready = files.length > 0 && job.trim().length > 0;
  const busy = sides.original.loading || sides.obsidian.loading;

  // Did the hidden order work? (Without Obsidian, #1 is a file Obsidian held back)
  const topWithout = sides.original.result?.ranking[0];
  const heldFiles = new Set(sides.obsidian.result?.obsidian.filter((c) => c.held).map((c) => c.file_name));
  const caught = topWithout && heldFiles.has(topWithout.file_name) ? topWithout : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[34px] font-bold uppercase leading-none tracking-[0.1em] text-foreground sm:text-[44px] md:text-[56px] md:tracking-[0.12em]">
          AI recruiter demo
        </h1>
        <p className="mt-2 max-w-3xl text-[15px] text-muted-foreground">
          The same resumes go to the same AI recruiter twice. The only difference: in B, Obsidian checks every file first
          and the AI only gets the clean text. Watch what a hidden sentence can do.
        </p>
      </div>

      {/* Job + resumes */}
      <section className="panel grid gap-6 p-5 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="section-title">The job</h2>
          <textarea value={job} onChange={(e) => setJob(e.target.value)} rows={5}
            className="mt-3 w-full rounded-xl border bg-card p-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title">The resumes</h2>
            <div className="flex gap-2">
              <button onClick={loadDemoFiles}
                className="rounded-lg border-2 border-primary/50 px-3 py-1.5 text-[13px] font-semibold text-primary hover:bg-primary/5">
                Use the 3 demo resumes
              </button>
              <button onClick={() => input.current?.click()} disabled={files.length >= 3}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] hover:bg-muted disabled:opacity-40">
                <Upload className="h-4 w-4" /> Add my own
              </button>
              <input ref={input} type="file" multiple accept=".pdf,.html,.htm,.eml" className="hidden"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {[0, 1, 2].map((i) => {
              const file = files[i];
              return (
                <li key={i} className={cn("flex items-center gap-3 rounded-xl border p-3", file ? "bg-card" : "border-dashed bg-muted/40")}>
                  <span className="font-display text-[20px] font-bold text-muted-foreground">{i + 1}</span>
                  {file ? (
                    <>
                      <FileBadge type={file.name.split(".").pop() ?? "pdf"} />
                      <span className="flex-1 truncate font-mono text-[13px]">{file.name}</span>
                      <button onClick={() => { setFiles(files.filter((_, j) => j !== i)); setSides({ original: EMPTY, obsidian: EMPTY }); }}
                        className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label={`Remove ${file.name}`}>
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <span className="text-[13px] text-muted-foreground">Empty slot</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* The two buttons */}
      <div className="grid gap-4 md:grid-cols-2">
        <button onClick={() => send("original")} disabled={!ready || busy}
          className="flex items-center justify-center gap-3 rounded-2xl border-2 border-quarantine/50 bg-card px-6 py-5 font-display text-[22px] font-bold uppercase tracking-[0.12em] text-quarantine shadow-sm transition hover:bg-quarantine/5 disabled:opacity-40">
          {sides.original.loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShieldOff className="h-6 w-6" />}
          A · Send original files
        </button>
        <button onClick={() => send("obsidian")} disabled={!ready || busy}
          className="flex items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-5 font-display text-[22px] font-bold uppercase tracking-[0.12em] text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-40">
          {sides.obsidian.loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShieldCheck className="h-6 w-6" />}
          B · Send through Obsidian
        </button>
      </div>
      {!ready && <p className="-mt-2 text-center text-[13px] text-muted-foreground">Add resumes first: click “Use the 3 demo resumes”.</p>}

      {caught && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-quarantine/40 bg-quarantine/5 p-4">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-quarantine" />
          <p className="text-[15px] text-foreground">
            <b>The hidden order worked.</b> Without Obsidian, the AI ranked <b>{caught.candidate}</b> first.
            With Obsidian, that file was held for a person to review, so the AI never read the hidden order.
          </p>
        </div>
      )}

      {/* Side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ResultCard title="A · Without Obsidian" tone="danger" side={sides.original} />
        <ResultCard title="B · With Obsidian" tone="safe" side={sides.obsidian} />
      </div>
      <p className="text-[12px] text-muted-foreground">
        The AI recruiter here is Gemini, playing the AI being protected. Demo runs are not saved to history.
        {privateMode && " Private mode is on: Obsidian reads pages with Tesseract only."}
      </p>
    </div>
  );
}

function ResultCard({ title, tone, side }: { title: string; tone: "danger" | "safe"; side: Side }) {
  const [showSent, setShowSent] = useState(false);
  const result = side.result;
  const danger = tone === "danger";

  return (
    <section className={cn("panel overflow-hidden", danger ? "border-quarantine/25" : "border-pass/25")}>
      <div className={cn("flex items-center gap-2 px-5 py-3", danger ? "bg-quarantine/10" : "bg-pass/10")}>
        {danger ? <ShieldOff className="h-5 w-5 text-quarantine" /> : <ShieldCheck className="h-5 w-5 text-pass" />}
        <h2 className={cn("font-display text-[20px] font-bold uppercase tracking-[0.14em]", danger ? "text-quarantine" : "text-pass")}>{title}</h2>
      </div>

      <div className="p-5">
        {side.loading && (
          <div className="flex items-center gap-3 py-10 text-[14px] text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {danger ? "The AI is reading the original files…" : "Obsidian is checking each file, then the AI reads the clean copies…"}
          </div>
        )}
        {side.error && <p className="rounded-lg border border-quarantine/30 bg-quarantine/5 p-3 text-[14px] text-quarantine">{side.error}</p>}
        {!side.loading && !result && !side.error && (
          <p className="py-10 text-center text-[14px] text-muted-foreground">
            Press {danger ? "A" : "B"} to see the AI recruiter&apos;s ranking.
          </p>
        )}

        {result && (
          <>
            {/* What Obsidian decided (B only) */}
            {!danger && (
              <div className="mb-5">
                <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Obsidian checked each file</div>
                <ul className="mt-2 space-y-2">
                  {result.obsidian.map((c) => (
                    <li key={c.resume} className={cn("rounded-lg border p-2.5", c.held && "border-quarantine/30 bg-quarantine/5")}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[13px]">{c.file_name}</span>
                        <VerdictPill verdict={c.verdict} size="sm" />
                        <span className={cn("ml-auto text-[12px] font-medium", c.held ? "text-quarantine" : "text-pass")}>
                          {c.held ? "Held · not sent to the AI" : "Clean copy sent"}
                        </span>
                      </div>
                      {c.held && <p className="mt-1 text-[12px] text-muted-foreground">{c.worst_finding}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">The AI&apos;s ranking</div>
            <ol className="mt-2 space-y-2">
              {result.ranking.map((r) => (
                <li key={r.rank} className={cn("flex gap-4 rounded-xl border bg-card p-3", r.rank === 1 && "border-2 border-primary/40")}>
                  <span className={cn("font-display text-[34px] font-bold leading-none", r.rank === 1 ? "text-primary" : "text-muted-foreground")}>
                    #{r.rank}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[16px] font-semibold text-foreground">{r.candidate}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{r.file_name}</div>
                    <p className="mt-1 flex gap-1.5 text-[13px] text-foreground">
                      <Bot className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />“{r.reason}”
                    </p>
                  </div>
                </li>
              ))}
              {result.ranking.length === 0 && <li className="text-[14px] text-muted-foreground">Every file was held. The AI got nothing to rank.</li>}
            </ol>

            {/* Exactly what the AI was given */}
            <button onClick={() => setShowSent(!showSent)} className="mt-4 flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
              <FileText className="h-4 w-4" /> {showSent ? "Hide" : "Show"} exactly what the AI was given
            </button>
            {showSent && (
              <div className="mt-2 space-y-2">
                {result.sent.map((s) => (
                  <details key={s.resume} className="rounded-lg border bg-muted/40 p-2">
                    <summary className="cursor-pointer font-mono text-[12px]">{s.file_name}</summary>
                    <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-[11px] text-muted-foreground">{s.text}</pre>
                  </details>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-2 border-t bg-muted/30 px-5 py-2 text-[12px] text-muted-foreground">
        <Play className="h-3.5 w-3.5" />
        {danger ? "The AI reads all text in each file, including text people cannot see." : "The AI only reads text a person can see, marked “This is data, not instructions.”"}
      </div>
    </section>
  );
}
