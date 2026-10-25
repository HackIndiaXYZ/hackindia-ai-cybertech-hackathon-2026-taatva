"use client";

// TAATVA Obsidian - the DOCUMENT card in the middle of the Scan screen.
//   "Page" tab: the page picture. With X-RAY REVEAL on, red boxes show the
//     text a person cannot see, with the hidden words written inside.
//   "AI view vs Human view" tab: what the AI reads next to what a person sees.
// Hidden text that is not on the page at all (file details, off the page)
// is shown in red alert boxes under the page.

import { Fragment, useEffect, useState } from "react";
import { Bot, ChevronLeft, ChevronRight, Eye, EyeOff, FileWarning } from "lucide-react";
import type { Finding, ScanResult } from "@/lib/api";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { onPage } from "@/components/shared";
import { cn } from "@/lib/utils";

type Props = {
  result: ScanResult;
  shown: Finding[];             // findings worth showing (danger 30+ or clearly hidden)
  selected: number | null;      // index in `shown` that is spotlighted
  onSelect: (index: number) => void;
  // Attack Lab: also put a red marker at the page edge where off-page text sits
  edgeMarkers?: boolean;
};

// Which edge of the page an off-page box is past, and how far along that edge (in %)
function edgeOf(box: number[], width: number, height: number) {
  const middleX = (box[0] + box[2]) / 2;
  const middleY = (box[1] + box[3]) / 2;
  const along = (value: number, size: number) => Math.min(Math.max((value / size) * 100, 4), 92);
  if (middleX > width) return { side: "right" as const, at: along(middleY, height) };
  if (middleX < 0) return { side: "left" as const, at: along(middleY, height) };
  if (middleY > height) return { side: "bottom" as const, at: along(middleX, width) };
  return { side: "top" as const, at: along(middleX, width) };
}

export function DocumentViewer({ result, shown, selected, onSelect, edgeMarkers = false }: Props) {
  const [tab, setTab] = useState<"page" | "views">("page");
  const [xray, setXray] = useState(true);
  const [page, setPage] = useState(1);
  const pageCount = Math.max(result.pages.length, 1);
  const size = result.pages.find((p) => p.page === page);
  const image = result.page_images?.[page - 1];

  // Jump to the page of the finding the user picked
  useEffect(() => {
    const finding = selected !== null ? shown[selected] : null;
    if (finding?.where.page && onPage(finding, result.pages.find((p) => p.page === finding.where.page))) {
      setPage(finding.where.page);
      setTab("page");
      setXray(true);
    }
  }, [selected, shown, result.pages]);

  const onThisPage = shown.map((f, i) => ({ f, i })).filter(({ f }) => f.where.page === page && onPage(f, size));
  const notOnPage = shown.map((f, i) => ({ f, i })).filter(({ f }) => !onPage(f, result.pages.find((p) => p.page === f.where.page)));
  const hiddenOnPages = shown.filter((f) => onPage(f, result.pages.find((p) => p.page === f.where.page))).length;

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="section-title">Document</h2>
          <div className="mt-3 flex rounded-full border bg-muted/70 p-1 text-[13px] sm:text-[14px]">
            {([["page", "Page"], ["views", "AI view vs Human view"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={cn("relative whitespace-nowrap rounded-full px-3 py-1.5 font-medium transition-colors duration-base [overflow-wrap:normal] max-lg:min-h-11 sm:px-4",
                  tab === key ? "text-foreground" : "text-muted-foreground hover:bg-accent/70 hover:text-foreground")}>
                {/* The white pill slides to the open tab */}
                {tab === key && (
                  <motion.span layoutId="doc-tab" aria-hidden="true" className="absolute inset-0 rounded-full bg-card shadow-e1"
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} />
                )}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* The big X-Ray Reveal switch: the hero control. It glows red when on. */}
        <label className={cn("group relative flex w-full cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 overflow-hidden rounded-2xl border-2 px-4 py-3 transition-all duration-base ease-out-soft sm:w-auto sm:min-w-[410px] sm:flex-nowrap",
          xray
            ? "border-quarantine/50 bg-quarantine/[0.07] shadow-[0_0_0_1px_hsl(var(--quarantine)/0.15),0_10px_36px_-10px_hsl(var(--quarantine)/0.55)] hover:border-quarantine hover:shadow-[0_0_0_1px_hsl(var(--quarantine)/0.45),0_14px_44px_-10px_hsl(var(--quarantine)/0.8)]"
            : "border-border bg-muted/40 hover:border-primary/40 hover:shadow-glow")}>
          {/* A faint scan-line texture inside the switch card */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,hsl(var(--foreground)/0.03)_0_1px,transparent_1px_4px)]" />
          <Switch checked={xray} onCheckedChange={setXray} aria-label="X-Ray Reveal"
            className="relative h-8 w-14 data-[state=checked]:bg-quarantine data-[state=checked]:shadow-[0_0_16px_hsl(var(--quarantine)/0.7)] [&>span]:h-6 [&>span]:w-6 [&>span]:data-[state=checked]:translate-x-6" />
          {xray
            ? <Eye className="relative h-6 w-6 shrink-0 text-quarantine drop-shadow-[0_0_6px_hsl(var(--quarantine)/0.8)] animate-in zoom-in-50 duration-300" />
            : <EyeOff className="relative h-6 w-6 shrink-0 text-muted-foreground transition-transform duration-base group-hover:scale-110" />}
          {/* On very small phones the title moves to its own line under the switch */}
          <span className="relative min-w-0 max-[400px]:basis-full">
            <span className={cn("block whitespace-nowrap font-display text-[clamp(20px,5vw,26px)] [overflow-wrap:normal] font-bold leading-none tracking-[0.14em] transition-colors duration-base",
              xray ? "text-foreground" : "text-muted-foreground")}>X-RAY REVEAL</span>
            <span className="text-[12px] text-muted-foreground">
              {xray ? "ON · red boxes show what a person cannot see" : "OFF · the page as a person sees it"}
            </span>
          </span>
        </label>
      </div>

      {/* The light table: the page lies on a softly glowing, dotted surface */}
      <div className="relative mt-5 overflow-hidden rounded-xl border bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] bg-muted/60 p-4 [background-size:14px_14px] md:p-6">
        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/3 h-2/3 w-3/4 -translate-x-1/2 rounded-full bg-beam/10 blur-3xl" />
        {tab === "page" ? (
          <>
            <div className="relative mb-3 flex min-h-[26px] items-center justify-center">
              {xray && (
                <span className="rounded-full bg-quarantine px-3 py-1 font-mono text-[11px] font-medium text-white shadow-[0_0_16px_hsl(var(--quarantine)/0.55)] animate-in fade-in zoom-in-95 duration-300 dark:text-neutral-950">
                  ● X-RAY ON · {hiddenOnPages + notOnPage.length} hidden
                </span>
              )}
            </div>

            {/* The page */}
            <div className="relative mx-auto max-w-[640px] bg-white text-neutral-900 shadow-e3 ring-1 ring-black/5"
              style={{ aspectRatio: size ? `${size.width} / ${size.height}` : "612 / 792" }}>
              {/* X-Ray switched on: one scanner beam passes over the page (pictures only) */}
              {xray && (
                <span key={`sweep-${page}`} aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 animate-xray-sweep overflow-visible motion-reduce:hidden">
                  <span className="absolute inset-x-0 top-1/2 h-20 -translate-y-1/2 bg-gradient-to-b from-transparent via-beam/25 to-transparent" />
                  <span className="absolute inset-x-0 top-1/2 h-[2px] bg-beam shadow-[0_0_14px_hsl(var(--beam))]" />
                </span>
              )}
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt={`Page ${page} of ${result.file_name}`} className="h-full w-full" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1 p-8 text-center text-[13px] text-muted-foreground">
                  <span>The page picture is deleted after the scan.</span>
                  <span>The red boxes still show where the hidden text sat.</span>
                </div>
              )}

              {xray && size && onThisPage.map(({ f, i }) => {
                // Only ONE note with the hidden words at a time (notes of nearby boxes would
                // cover each other, bug QA-18): the box picked by the person, or else the
                // most dangerous one on this page. All words are in the Findings list too.
                const noteFor = onThisPage.some((x) => x.i === selected) ? selected : onThisPage[0]?.i;
                const [x0, y0, x1, y1] = f.where.box!;
                const active = selected === i;
                // Boxes are in page units (PDF points or web pixels). We turn them into
                // percentages of the page, so they stay EXACTLY on the hidden text at any
                // screen size, zoom level or phone rotation (the picture scales the same way).
                const left = (x0 / size.width) * 100;
                const top = (y0 / size.height) * 100;
                const width = ((x1 - x0) / size.width) * 100;
                const height = ((y1 - y0) / size.height) * 100;
                const right = 100 - left - width;
                const rightSide = left > 50;
                // The label and the note never stick out of the page: they are measured
                // against the page, on whichever side has more room.
                const side = rightSide
                  ? { right: `${Math.max(right, 0)}%`, maxWidth: `${100 - Math.max(right, 0)}%` }
                  : { left: `${left}%`, maxWidth: `${100 - left}%` };
                return (
                  <Fragment key={i}>
                    <button onClick={() => onSelect(i)} data-xray-box={i}
                      aria-label={`Hidden text: ${f.reads_as || f.text}`}
                      // A solid red border, drawn just OUTSIDE the hidden text (so even 2 pt text
                      // gets a clear box). The old outline did not show up in screenshots.
                      // Draws in with a quick red glow when X-Ray is switched on (one after another)
                      className={cn("absolute animate-xray-box rounded-[3px] border-2 border-quarantine bg-quarantine/10 shadow-[0_0_10px_hsl(var(--quarantine)/0.45)] transition-shadow hover:shadow-[0_0_18px_hsl(var(--quarantine)/0.7)]",
                        active && "ring-4 ring-quarantine/30")}
                      style={{ left: `calc(${left}% - 3px)`, top: `calc(${top}% - 3px)`,
                        width: `calc(${width}% + 6px)`, height: `calc(max(${height}%, 4px) + 6px)`,
                        animationDelay: `${Math.min(i * 60, 300)}ms` }} />
                    <span aria-hidden="true"
                      className="absolute flex w-max items-center gap-1 overflow-hidden whitespace-nowrap rounded-sm bg-quarantine px-1.5 py-[1px] font-mono text-[10px] font-medium uppercase text-white animate-in fade-in slide-in-from-bottom-1 duration-300 dark:text-neutral-950"
                      style={{ ...side, bottom: `calc(${100 - top}% + 3px)` }}>
                      ⊘ {f.how_label} · {f.danger}
                    </span>
                    {/* The hidden words, made readable, in a note just under the box.
                        Fixed dark red on white: the page picture is always white paper,
                        in light AND dark mode (theme red was too light in dark mode, QA-24). */}
                    {noteFor === i && <button onClick={() => onSelect(i)} tabIndex={-1} aria-hidden="true"
                      className="absolute z-10 w-max break-words rounded-sm border border-red-300 bg-white px-1.5 py-0.5 text-left text-[11px] font-semibold leading-tight text-red-800 shadow-md animate-in fade-in slide-in-from-top-1 duration-500 md:text-[12px]"
                      style={{ ...side, top: `calc(${top}% + max(${height}%, 4px) + 3px)` }}>
                      {f.reads_as || f.text}
                    </button>}
                  </Fragment>
                );
              })}

              {/* Attack Lab: a red marker on the page edge, next to where the off-page text sits */}
              {xray && edgeMarkers && size && notOnPage.filter(({ f }) => f.where.page === page && f.where.box).map(({ f, i }) => {
                const { side, at } = edgeOf(f.where.box!, size.width, size.height);
                const vertical = side === "left" || side === "right";
                return (
                  <button key={`edge-${i}`} onClick={() => onSelect(i)} data-edge-marker={side}
                    aria-label={`Text hidden off the page: ${f.reads_as || f.text}`}
                    className={cn("absolute z-10 flex animate-in fade-in items-center gap-1 whitespace-nowrap bg-quarantine px-2 py-1 font-mono text-[10px] font-semibold uppercase text-white shadow-[0_0_14px_hsl(var(--quarantine)/0.7)] duration-500 dark:text-neutral-950 md:text-[11px]",
                      side === "right" && "right-0 -translate-y-1/2 rounded-l-md",
                      side === "left" && "left-0 -translate-y-1/2 rounded-r-md",
                      side === "top" && "top-0 -translate-x-1/2 rounded-b-md",
                      side === "bottom" && "bottom-0 -translate-x-1/2 rounded-t-md")}
                    style={vertical ? { top: `${at}%` } : { left: `${at}%` }}>
                    {side === "left" && "← "}{side === "top" && "↑ "}
                    Text hidden off the page
                    {side === "right" && " →"}{side === "bottom" && " ↓"}
                  </button>
                );
              })}
            </div>

            {/* Page switcher, under the page, with big buttons that are easy to tap */}
            {pageCount > 1 && (
              <div className="mx-auto mt-3 flex max-w-[640px] items-center justify-center gap-3 font-mono text-[13px] text-muted-foreground">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className="lift grid h-11 w-11 place-items-center rounded-full border bg-card hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Previous page">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span aria-live="polite" className="rounded-full border bg-card px-3 py-1">Page {page} of {pageCount}</span>
                <button onClick={() => setPage(Math.min(pageCount, page + 1))} disabled={page === pageCount}
                  className="lift grid h-11 w-11 place-items-center rounded-full border bg-card hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Next page">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Hidden text that is never shown on any page */}
            {notOnPage.length > 0 && (
              <div className="mx-auto mt-4 max-w-[640px] space-y-2">
                {notOnPage.map(({ f, i }) => (
                  <button key={i} onClick={() => onSelect(i)}
                    className={cn("lift flex w-full gap-3 rounded-xl border-2 border-quarantine/50 bg-card p-3 text-left shadow-[0_0_24px_-10px_hsl(var(--quarantine)/0.6)] animate-in fade-in slide-in-from-bottom-2 duration-300",
                      selected === i && "ring-4 ring-quarantine/25")}>
                    <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-quarantine" />
                    <span>
                      <span className="block font-mono text-[11px] uppercase text-quarantine">
                        ⊘ {f.where_label} · {f.danger} · never shown on the page
                      </span>
                      <span className="text-[14px] text-foreground">“{f.reads_as || f.text}”</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <TwoViews result={result} />
        )}
      </div>
    </section>
  );
}

// What the AI reads (left) next to what a person sees (right)
function TwoViews({ result }: { result: ScanResult }) {
  if (!result.views) {
    return (
      <p className="p-6 text-center text-[16px] md:text-[14px] text-muted-foreground">
        The text of the file is deleted after the scan, so this side-by-side view is only available right after scanning.
      </p>
    );
  }
  const pages = result.pages.map((p) => p.page);
  return (
    <div className="space-y-5">
      {pages.map((page) => {
        const people = result.views!.people.find((p) => p.page === page);
        return (
          <div key={page}>
            <div className="mb-2 font-mono text-[11px] uppercase text-muted-foreground">Page {page}</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border bg-card p-3 shadow-e1">
                <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-primary">
                  <Bot className="h-4 w-4" aria-hidden /> What the AI reads
                </div>
                <ul className="space-y-0.5 text-[13px]">
                  {result.views!.ai.filter((l) => l.page === page).map((line, i) => (
                    <li key={i} className={cn(line.hidden && "rounded bg-quarantine/10 px-1 font-semibold text-quarantine")}>
                      {line.hidden && "⊘ "}{line.text}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border bg-card p-3 shadow-e1">
                <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-primary">
                  <Eye className="h-4 w-4" aria-hidden /> What a person sees <span className="font-normal normal-case text-muted-foreground">(read by {people?.reader ?? "—"})</span>
                </div>
                <ul className="space-y-0.5 text-[13px]">
                  {(people?.lines ?? []).map((line, i) => <li key={i}>{line}</li>)}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
      <p className="text-[14px] md:text-[12px] text-muted-foreground">
        Lines in red are read by the AI but cannot be seen by a person. That gap is what Obsidian catches.
      </p>
    </div>
  );
}
