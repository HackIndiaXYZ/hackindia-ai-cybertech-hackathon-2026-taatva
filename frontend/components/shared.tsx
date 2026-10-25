// TAATVA Obsidian - small building blocks used on both screens.

import type { Finding, PageSize, Verdict } from "@/lib/api";
import { VERDICT_STYLE, verdictFor } from "@/lib/verdict";
import { cn } from "@/lib/utils";

// Coloured pill: "● QUARANTINE"
export function VerdictPill({ verdict, size = "md" }: { verdict: Verdict; size?: "sm" | "md" }) {
  const style = VERDICT_STYLE[verdict];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-full border font-display font-semibold uppercase tracking-[0.14em] [overflow-wrap:normal]",
        style.text, style.soft, style.border,
        size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3.5 py-1 text-[14px]",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.solid)} />
      {verdict}
    </span>
  );
}

// Round score badge with a coloured ring, like the "98" in the findings list
export function ScoreRing({ danger, size = 52 }: { danger: number; size?: number }) {
  const verdict = verdictFor(danger);
  const radius = 21;
  const circle = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 52 52" width={size} height={size} className="shrink-0" aria-label={`Danger ${danger} out of 100`}>
      <circle cx="26" cy="26" r={radius} fill="hsl(var(--card))" stroke="hsl(var(--muted))" strokeWidth="5" />
      <circle
        cx="26" cy="26" r={radius} fill="none" stroke={VERDICT_STYLE[verdict].hex} strokeWidth="5"
        strokeDasharray={`${(circle * Math.min(danger, 100)) / 100} ${circle}`} strokeLinecap="butt"
        transform="rotate(-90 26 26)"
      />
      <text x="26" y="27" textAnchor="middle" dominantBaseline="middle"
        className="font-display" fontSize="18" fontWeight="700" fill={VERDICT_STYLE[verdict].hex}>
        {danger}
      </text>
    </svg>
  );
}

// Thin bar showing danger out of 100
export function DangerBar({ danger }: { danger: number }) {
  const verdict = verdictFor(danger);
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div className={cn("h-2 rounded-full", VERDICT_STYLE[verdict].solid)}
        style={{ width: `${Math.max(danger, danger > 0 ? 2 : 0)}%` }} />
    </div>
  );
}

// Little file icon with "PDF" / "HTML" / "EML" written on it
export function FileBadge({ type, className }: { type: string; className?: string }) {
  return (
    <div className={cn("relative grid h-10 w-9 shrink-0 place-items-end rounded-md border bg-card pb-1 shadow-sm", className)}>
      <span className="absolute left-2 right-2 top-2 h-0.5 rounded bg-muted" />
      <span className="absolute left-2 right-3 top-3.5 h-0.5 rounded bg-muted" />
      <span className="w-full text-center font-mono text-[8px] font-medium uppercase text-quarantine">{type}</span>
    </div>
  );
}

// Is this finding's box on the page? (Off-page text cannot be drawn on the page.)
export function onPage(finding: Finding, size?: PageSize) {
  const box = finding.where.box;
  if (!box || !size) return false;
  const middleX = (box[0] + box[2]) / 2;
  const middleY = (box[1] + box[3]) / 2;
  return middleX >= 0 && middleX <= size.width && middleY >= 0 && middleY <= size.height;
}

// A small sketch of a page: grey lines for normal text, red boxes where hidden text sat.
// We never keep the real page picture, so this sketch is drawn from the boxes only.
export function PageSchematic({ size, findings, className }: { size?: PageSize; findings: Finding[]; className?: string }) {
  const width = size?.width ?? 612;
  const height = size?.height ?? 792;
  const boxes = findings.filter((f) => onPage(f, size ?? { page: 1, width, height }));
  const lines = [10, 14, 22, 26, 30, 38, 42, 46, 54, 58, 66, 70, 74];
  return (
    <div className={cn("relative overflow-hidden rounded border bg-white shadow-md", className)}
      style={{ aspectRatio: `${width} / ${height}` }}>
      {lines.map((top, i) => (
        <span key={top} className="absolute h-[3%] rounded-sm bg-slate-200"
          style={{ top: `${top}%`, left: "12%", width: i % 3 === 0 ? "30%" : i % 2 ? "64%" : "72%", height: "2.2%" }} />
      ))}
      {boxes.map((f, i) => {
        const [x0, y0, x1, y1] = f.where.box!;
        return (
          <span key={i} className="absolute rounded-sm border-2 border-quarantine bg-quarantine/10"
            style={{
              left: `${(x0 / width) * 100}%`, top: `${(y0 / height) * 100}%`,
              width: `${Math.max(((x1 - x0) / width) * 100, 6)}%`,
              height: `${Math.max(((y1 - y0) / height) * 100, 3.5)}%`,
            }} />
        );
      })}
    </div>
  );
}

// "Today, 16:52" / "Yesterday, 18:20" / "3 Oct, 09:15"
export function friendlyTime(iso?: string) {
  if (!iso) return "just now";
  const date = new Date(iso);
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return `Today, ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString([], { day: "numeric", month: "short" })}, ${time}`;
}

export const FILE_KIND: Record<string, string> = { pdf: "PDF document", html: "HTML email", eml: "Email" };

// Findings that matter (danger 30 or more) vs harmless ones
export function importantFindings(findings: Finding[]) {
  return findings.filter((f) => f.danger >= 30);
}
