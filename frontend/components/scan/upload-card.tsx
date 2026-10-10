"use client";

// TAATVA Obsidian - "Scan another file": drag a file here or click to pick one.
// The file goes to POST /scan. It is checked in memory and never saved.

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export const ACCEPTED = ".pdf,.html,.htm,.eml";

export function DropZone({ onFile, busy, big = false }: { onFile: (file: File) => void; busy: boolean; big?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !busy && input.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && input.current?.click()}
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
