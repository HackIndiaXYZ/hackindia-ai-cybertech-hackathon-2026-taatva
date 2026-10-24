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

// Can this browser tell us "the person pressed Cancel in the picker"? (Chrome 113+, Safari 16.4+, Firefox 91+)
// Only then can we tell a Cancel apart from a file that got lost on the way.
const CAN_SEE_CANCEL = typeof HTMLElement !== "undefined" && "oncancel" in HTMLElement.prototype;

type DropZoneProps = {
  onFile: (file: File) => void;
  busy: boolean;
  big?: boolean;
  onFileLost?: () => void; // the picker closed, but no file and no Cancel arrived
};

export function DropZone({ onFile, busy, big = false, onFileLost }: DropZoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  // true from "picker opened" until a file or a Cancel arrives
  const waiting = useRef(false);

  function pick() {
    if (busy) return;
    waiting.current = true;
    openPicker(input.current);
  }

  // When the picker closes and this page is still alive, the page comes back into view.
  // Normally a file (or a Cancel) arrives within a moment. On phones low on memory,
  // Android can lose the file on the way ("Unable to complete previous operation due to
  // low memory"): then NOTHING arrives, and we explain what happened.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onBack = () => {
      if (document.visibilityState !== "visible" || !waiting.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        pickerDone();
        if (waiting.current && CAN_SEE_CANCEL) onFileLost?.();
        waiting.current = false;
      }, 3000);
    };
    window.addEventListener("focus", onBack);
    document.addEventListener("visibilitychange", onBack);
    // "Cancel" in the picker: the person changed their mind, nothing went wrong
    const field = input.current;
    const onCancel = () => {
      waiting.current = false;
      pickerDone();
    };
    field?.addEventListener("cancel", onCancel);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", onBack);
      document.removeEventListener("visibilitychange", onBack);
      field?.removeEventListener("cancel", onCancel);
    };
  }, [onFileLost]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={pick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && pick()}
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
          waiting.current = false;
          pickerDone();
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function UploadCard({ onFile, busy, onFileLost }: { onFile: (file: File) => void; busy: boolean; onFileLost?: () => void }) {
  return (
    <section className="panel p-5">
      <h2 className="section-title">Scan another file</h2>
      <div className="mt-4">
        <DropZone onFile={onFile} busy={busy} onFileLost={onFileLost} />
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
