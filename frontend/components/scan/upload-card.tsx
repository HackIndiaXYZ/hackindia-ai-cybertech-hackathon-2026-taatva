"use client";

// TAATVA Obsidian - "Scan another file": drag a file here or click to pick one.
// The file goes to POST /scan. It is checked in memory and never saved.

import { useEffect, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

// File types, by name AND by type, so phones open their simple document picker (not the camera)
export const ACCEPTED = ".pdf,.html,.htm,.eml,application/pdf,text/html,message/rfc822";

// Phones with little free memory sometimes close this page while the file picker is open.
// We note when the picker opens; if the page comes back without a file, we can explain why.
const PICKING = "obsidian-picking-file";

function openPicker(input: HTMLInputElement | null) {
  try {
    localStorage.setItem(PICKING, String(Date.now()));
  } catch {}
  input?.click();
}

function pickerDone() {
  try {
    localStorage.removeItem(PICKING);
  } catch {}
}

// True if the page was closed (by the phone) while a file was being chosen, in the last 5 minutes
export function closedWhilePicking() {
  try {
    const started = Number(localStorage.getItem(PICKING) || 0);
    localStorage.removeItem(PICKING);
    return started > 0 && Date.now() - started < 5 * 60_000;
  } catch {
    return false;
  }
}

export function DropZone({ onFile, busy, big = false }: { onFile: (file: File) => void; busy: boolean; big?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  // When the picker closes (file chosen OR cancelled) and this page is still alive,
  // focus comes back here: then nothing went wrong, so forget the note.
  useEffect(() => {
    const onFocus = () => setTimeout(pickerDone, 1500);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !busy && openPicker(input.current)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && openPicker(input.current)}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files[0];
        if (file && !busy) onFile(file);
      }}
      className={cn(
        "flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed p-4 transition",
        over ? "border-primary bg-primary/5" : "border-border bg-muted/40 hover:border-primary/50",
        big && "flex-col justify-center py-14 text-center",
        busy && "cursor-wait opacity-80",
      )}
    >
      <span className={cn("grid shrink-0 place-items-center rounded-full bg-primary/10 text-primary", big ? "h-16 w-16" : "h-12 w-12")}>
        {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
      </span>
      <div>
        <div className={cn("font-semibold text-foreground", big ? "text-[20px]" : "text-[16px]")}>
          {busy ? "Checking the file…" : "Drop a resume or email"}
        </div>
        <div className="text-[13px] text-muted-foreground">
          {busy ? "Reading every page the way an AI and a person would." : (
            <>PDF, HTML or .eml · up to 20 MB · <span className="text-primary underline">browse</span></>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          pickerDone();
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function UploadCard({ onFile, busy }: { onFile: (file: File) => void; busy: boolean }) {
  return (
    <section className="panel p-5">
      <h2 className="section-title">Scan another file</h2>
      <div className="mt-4">
        <DropZone onFile={onFile} busy={busy} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="tag">PDF</span>
        <span className="tag" title="Web pages and HTML emails, opened safely in a real browser with scripts off">HTML email</span>
        <span className="tag" title="Saved emails (.eml), opened safely in a real browser with scripts off">.eml</span>
        <span className="tag">deleted after scan</span>
      </div>
    </section>
  );
}
