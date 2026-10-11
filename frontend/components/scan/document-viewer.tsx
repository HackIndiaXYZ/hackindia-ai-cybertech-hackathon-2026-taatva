"use client";

// TAATVA Obsidian - the DOCUMENT card in the middle of the Scan screen.
//   "Page" tab: the page picture. With X-RAY REVEAL on, red boxes show the
//     text a person cannot see, with the hidden words written inside.
//   "AI view vs Human view" tab: what the AI reads next to what a person sees.
// Hidden text that is not on the page at all (file details, off the page)
// is shown in red alert boxes under the page.

import { Fragment, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, FileWarning } from "lucide-react";
import type { Finding, ScanResult } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { onPage } from "@/components/shared";
import { cn } from "@/lib/utils";

type Props = {
  result: ScanResult;
  shown: Finding[];             // findings worth showing (danger 30+ or clearly hidden)
  selected: number | null;      // index in `shown` that is spotlighted
  onSelect: (index: number) => void;
};

export function DocumentViewer({ result, shown, selected, onSelect }: Props) {
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
          <div className="mt-3 flex rounded-lg border bg-muted p-1 text-[14px]">
            {([["page", "Page"], ["views", "AI view vs Human view"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={cn("rounded-md px-3 py-1.5 font-medium transition max-md:min-h-11",
                  tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* The big X-Ray Reveal switch */}
        <label className={cn("flex cursor-pointer items-center gap-4 rounded-xl border-2 px-4 py-3 transition",
          xray ? "border-quarantine/40 bg-quarantine/5" : "border-border bg-muted/40")}>
          <Switch checked={xray} onCheckedChange={setXray} aria-label="X-Ray Reveal"
            className="h-8 w-14 data-[state=checked]:bg-quarantine [&>span]:h-6 [&>span]:w-6 [&>span]:data-[state=checked]:translate-x-6" />
          {xray ? <Eye className="h-5 w-5 text-quarantine" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}
          <span>
            <span className="block font-display text-[26px] font-bold leading-none tracking-[0.16em] text-foreground">X-RAY REVEAL</span>
            <span className="text-[12px] text-muted-foreground">
              {xray ? "ON · red boxes show what a person cannot see" : "OFF · the page as a person sees it"}
            </span>
          </span>
        </label>
      </div>

      <div className="mt-5 rounded-xl border bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] bg-muted/60 p-4 [background-size:14px_14px] md:p-6">
        {tab === "page" ? (
          <>
            <div className="mb-3 flex items-center justify-center">
              {xray && (
                <span className="rounded-full bg-quarantine px-3 py-1 font-mono text-[11px] font-medium text-white dark:text-neutral-950 shadow">
                  ● X-RAY ON · {hiddenOnPages + notOnPage.length} hidden
                </span>
              )}
            </div>

            {/* The page */}
            <div className="relative mx-auto max-w-[640px] bg-white text-neutral-900 shadow-xl"
              style={{ aspectRatio: size ? `${size.width} / ${size.height}` : "612 / 792" }}>
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
                      className={cn("absolute rounded-[2px] outline outline-2 outline-quarantine bg-quarantine/[0.08] transition",
                        active && "ring-4 ring-quarantine/30")}
                      style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `max(${height}%, 4px)` }} />
                    <span aria-hidden="true"
                      className="absolute flex w-max items-center gap-1 overflow-hidden whitespace-nowrap rounded-sm bg-quarantine px-1.5 py-[1px] font-mono text-[10px] font-medium uppercase text-white dark:text-neutral-950"
                      style={{ ...side, bottom: `calc(${100 - top}% + 3px)` }}>
                      ⊘ {f.how_label} · {f.danger}
                    </span>
                    {/* The hidden words, made readable, in a note just under the box.
                        Fixed dark red on white: the page picture is always white paper,
                        in light AND dark mode (theme red was too light in dark mode, QA-24). */}
                    {noteFor === i && <button onClick={() => onSelect(i)} tabIndex={-1} aria-hidden="true"
                      className="absolute z-10 w-max break-words rounded-sm border border-red-300 bg-white px-1.5 py-0.5 text-left text-[11px] font-semibold leading-tight text-red-800 shadow-sm md:text-[12px]"
                      style={{ ...side, top: `calc(${top}% + max(${height}%, 4px) + 3px)` }}>
                      {f.reads_as || f.text}
                    </button>}
                  </Fragment>
                );
              })}
            </div>

            {/* Page switcher, under the page, with big buttons that are easy to tap */}
            {pageCount > 1 && (
              <div className="mx-auto mt-3 flex max-w-[640px] items-center justify-center gap-3 font-mono text-[13px] text-muted-foreground">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className="grid h-11 w-11 place-items-center rounded-lg border bg-card hover:bg-muted disabled:opacity-30" aria-label="Previous page">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span aria-live="polite">Page {page} of {pageCount}</span>
                <button onClick={() => setPage(Math.min(pageCount, page + 1))} disabled={page === pageCount}
                  className="grid h-11 w-11 place-items-center rounded-lg border bg-card hover:bg-muted disabled:opacity-30" aria-label="Next page">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Hidden text that is never shown on any page */}
            {notOnPage.length > 0 && (
              <div className="mx-auto mt-4 max-w-[640px] space-y-2">
                {notOnPage.map(({ f, i }) => (
                  <button key={i} onClick={() => onSelect(i)}
                    className={cn("flex w-full gap-3 rounded-lg border-2 border-quarantine/50 bg-quarantine/5 p-3 text-left",
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
              <div className="rounded-lg border bg-card p-3">
                <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-primary">What the AI reads</div>
                <ul className="space-y-0.5 text-[13px]">
                  {result.views!.ai.filter((l) => l.page === page).map((line, i) => (
                    <li key={i} className={cn(line.hidden && "rounded bg-quarantine/10 px-1 font-semibold text-quarantine")}>
                      {line.hidden && "⊘ "}{line.text}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-pass">
                  What a person sees <span className="font-normal normal-case text-muted-foreground">(read by {people?.reader ?? "—"})</span>
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
