"use client";

// TAATVA Obsidian - the SCAN HISTORY screen.
// Every file gets a score, a reason and a saved record. Files themselves are
// deleted after the scan; only the results are kept.
// Quarantined files wait here for a person to Approve or Reject them.

import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, ChevronDown, ChevronRight, Search, Send, X } from "lucide-react";
import { decideScan, getHistory, type ScanResult, type Verdict } from "@/lib/api";
import { VERDICT_STYLE } from "@/lib/verdict";
import { useSettings } from "@/components/settings";
import { Input } from "@/components/ui/input";
import { DangerBar, FILE_KIND, FileBadge, PageSchematic, VerdictPill, friendlyTime } from "@/components/shared";
import { cn } from "@/lib/utils";

type Filter = "all" | Verdict;

export default function HistoryPage() {
  return (
    <Suspense>
      <HistoryScreen />
    </Suspense>
  );
}

function HistoryScreen() {
  const { refreshWaiting } = useSettings();
  const params = useSearchParams();
  const [rows, setRows] = useState<ScanResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    getHistory()
      .then((data) => {
        setRows(data);
        // Open a row when coming from "Review in history", otherwise open the files waiting for you
        const wanted = params.get("open");
        setOpen(new Set(wanted ? [wanted] : data.filter((r) => r.decision === "waiting").slice(0, 2).map((r) => r.id)));
      })
      .catch((e) => setError(`Could not load history: ${e.message}`));
  }, [params]);

  async function decide(id: string, decision: "approved" | "rejected") {
    try {
      // Saved in Supabase. The database only allows this for your own waiting Quarantine files.
      const updated = await decideScan(id, decision);
      setRows((old) => old?.map((r) => (r.id === id ? { ...r, ...updated } : r)) ?? null);
      refreshWaiting();
    } catch (e) {
      setError(`Could not save your decision: ${e instanceof Error ? e.message : "unknown problem"}`);
    }
  }

  const counts = useMemo(() => {
    const all = rows ?? [];
    return {
      all: all.length,
      pass: all.filter((r) => r.verdict === "pass").length,
      flag: all.filter((r) => r.verdict === "flag").length,
      quarantine: all.filter((r) => r.verdict === "quarantine").length,
      waiting: all.filter((r) => r.decision === "waiting").length,
      approved: all.filter((r) => r.decision === "approved").length,
      rejected: all.filter((r) => r.decision === "rejected").length,
    };
  }, [rows]);

  const visible = (rows ?? []).filter((r) =>
    (filter === "all" || r.verdict === filter) &&
    (r.file_name ?? "").toLowerCase().includes(search.toLowerCase()));

  const percent = (n: number) => (counts.all ? Math.round((n / counts.all) * 100) : 0);

  return (
    <div className="space-y-6">
      {/* Title and search */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[44px] font-bold uppercase leading-none tracking-[0.12em] text-foreground md:text-[56px]">
            Scan history
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Every file gets a score, a reason and a saved record. Files are deleted after the scan; only results are kept.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files…"
            className="h-12 rounded-xl bg-white pl-10 text-[15px]" />
        </div>
      </div>

      {error && <p className="rounded-xl border border-quarantine/30 bg-quarantine/5 p-4 text-quarantine">{error}</p>}

      {/* 4 number cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard dot="bg-primary" glow="bg-primary/10" label="Files scanned" value={counts.all} note="resumes and emails" />
        <StatCard dot="bg-pass" glow="bg-pass/10" label="Passed" value={counts.pass} note="clean text sent, saved" valueClass="text-pass" />
        <StatCard dot="bg-flag" glow="bg-flag/10" label="Flagged" value={counts.flag} note="clean text sent, reviewer alerted" valueClass="text-flag" />
        <StatCard dot="bg-quarantine" glow="bg-quarantine/10" label="Waiting for you" value={counts.waiting}
          note={`${counts.approved} approved · ${counts.rejected} rejected so far`} valueClass="text-quarantine" alert={counts.waiting > 0} />
      </div>

      {/* Where files landed */}
      <section className="panel p-5">
        <div className="flex justify-between text-[14px]">
          <span className="font-semibold text-foreground">Where files landed</span>
          <span className="text-muted-foreground">{counts.all} files</span>
        </div>
        <div className="mt-3 flex h-3.5 gap-0.5 overflow-hidden rounded-full bg-muted">
          {(["pass", "flag", "quarantine"] as const).map((v) =>
            counts[v] > 0 && <div key={v} className={VERDICT_STYLE[v].solid} style={{ width: `${percent(counts[v])}%` }} />)}
        </div>
        <div className="mt-3 flex flex-wrap gap-5 text-[13px] text-muted-foreground">
          {(["pass", "flag", "quarantine"] as const).map((v) => (
            <span key={v} className="flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-sm", VERDICT_STYLE[v].solid)} />
              <span className="capitalize">{v}</span>
              <span className="font-semibold text-foreground">{percent(counts[v])}%</span>
            </span>
          ))}
        </div>
      </section>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap rounded-xl border bg-muted p-1">
          {(["all", "quarantine", "flag", "pass"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("flex items-center gap-2 rounded-lg px-4 py-2 font-display text-[15px] font-semibold uppercase tracking-[0.14em] transition",
                filter === f ? "bg-white text-foreground shadow-sm" : "text-foreground/80 hover:bg-white/60")}>
              <span className={cn("h-1.5 w-1.5 rounded-full", f === "all" ? "bg-muted-foreground" : VERDICT_STYLE[f].solid)} />
              {f}
              <span className="rounded-full border bg-white px-1.5 font-mono text-[10px] tracking-normal">{counts[f]}</span>
            </button>
          ))}
        </div>
        <span className="text-[13px] text-muted-foreground">Tip: open a row to see the hidden text and where it sat.</span>
      </div>

      {/* The table */}
      <section className="panel overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead>
            <tr className="border-b bg-muted/30 font-display text-[14px] uppercase tracking-[0.16em] text-primary">
              <th className="py-3 pl-5 pr-2" />
              <th className="px-2 py-3">File</th>
              <th className="px-2 py-3">Scanned</th>
              <th className="px-2 py-3">Danger</th>
              <th className="px-2 py-3">Verdict</th>
              <th className="px-2 py-3">Worst finding</th>
              <th className="px-2 py-3 pr-5">Decision</th>
            </tr>
          </thead>
          <tbody>
            {rows === null && !error && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {rows !== null && visible.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">
                {rows.length ? "No files match." : <>No files scanned yet. <Link href="/scan" className="text-primary underline">Scan one</Link>.</>}
              </td></tr>
            )}
            {visible.map((row) => {
              const isOpen = open.has(row.id);
              const toggle = () => setOpen((old) => {
                const next = new Set(old);
                if (next.has(row.id)) next.delete(row.id); else next.add(row.id);
                return next;
              });
              return (
                <Fragment key={row.id}>
                  <tr className={cn("border-b align-middle", row.decision === "waiting" && "bg-quarantine/[0.03]", isOpen && "border-b-0")}>
                    <td className="py-4 pl-5 pr-2">
                      <button onClick={toggle} aria-label={isOpen ? "Close row" : "Open row"} aria-expanded={isOpen}
                        className="grid h-9 w-9 place-items-center rounded-lg border bg-white text-primary hover:bg-muted">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-2 py-4">
                      <div className="flex items-center gap-3">
                        <FileBadge type={row.file_type ?? "pdf"} />
                        <div>
                          <div className="font-mono text-[14px] text-foreground">{row.file_name}</div>
                          <div className="text-[12px] text-muted-foreground">{FILE_KIND[row.file_type ?? "pdf"]}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-4 text-[14px] text-muted-foreground">{friendlyTime(row.scanned_at)}</td>
                    <td className="px-2 py-4">
                      <div className="flex items-center gap-3">
                        <span className={cn("w-10 font-display text-[26px] font-bold", VERDICT_STYLE[row.verdict].text)}>{row.score}</span>
                        <div className="w-24"><DangerBar danger={row.score} /></div>
                      </div>
                    </td>
                    <td className="px-2 py-4"><VerdictPill verdict={row.verdict} /></td>
                    <td className="max-w-[320px] px-2 py-4 text-[14px] text-foreground">{row.worst_finding}</td>
                    <td className="px-2 py-4 pr-5"><DecisionCell row={row} onDecide={decide} /></td>
                  </tr>
                  {isOpen && <ExpandedRow row={row} />}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </section>
      <p className="text-[12px] text-muted-foreground">
        Pass (0–29) and Flag (30–69) send the clean text to the agent automatically. Quarantine (70–100) waits for a person.
      </p>
    </div>
  );
}

function StatCard({ dot, glow, label, value, note, valueClass, alert }: {
  dot: string; glow: string; label: string; value: number; note: string; valueClass?: string; alert?: boolean;
}) {
  return (
    <div className={cn("panel relative overflow-hidden p-5", alert && "border-quarantine/30")}>
      <span className={cn("absolute -right-6 -top-10 h-28 w-28 rounded-full", glow)} />
      <div className="relative flex items-center gap-2 text-[14px] font-semibold text-foreground">
        <span className={cn("h-2.5 w-2.5 rounded-full", dot)} />{label}
      </div>
      <div className={cn("relative mt-2 font-display text-[48px] font-bold leading-none text-primary", valueClass)}>{value}</div>
      <div className="relative mt-2 text-[12px] text-muted-foreground">{note}</div>
    </div>
  );
}

function DecisionCell({ row, onDecide }: { row: ScanResult; onDecide: (id: string, d: "approved" | "rejected") => void }) {
  const [busy, setBusy] = useState(false);
  const act = async (d: "approved" | "rejected") => {
    setBusy(true);
    try { await onDecide(row.id, d); } finally { setBusy(false); }
  };

  if (row.decision === "waiting") {
    return (
      <div className="flex gap-2">
        <button disabled={busy} onClick={() => act("approved")}
          className="flex items-center gap-1.5 rounded-lg bg-pass px-3.5 py-2 font-display text-[15px] font-semibold uppercase tracking-[0.14em] text-white shadow hover:bg-pass/90 disabled:opacity-50">
          <Check className="h-4 w-4" strokeWidth={3} />Approve
        </button>
        <button disabled={busy} onClick={() => act("rejected")}
          className="flex items-center gap-1.5 rounded-lg border-2 border-quarantine/40 bg-white px-3.5 py-2 font-display text-[15px] font-semibold uppercase tracking-[0.14em] text-quarantine hover:bg-quarantine/5 disabled:opacity-50">
          <X className="h-4 w-4" strokeWidth={3} />Reject
        </button>
      </div>
    );
  }
  if (row.decision === "approved") {
    return (
      <span className="flex flex-col text-[13px] font-medium text-pass">
        <span className="flex items-center gap-1.5"><Check className="h-4 w-4" />Approved · {friendlyTime(row.decided_at ?? undefined)}</span>
        {row.decided_by && <span className="pl-5 text-[11px] font-normal text-muted-foreground">by {row.decided_by}</span>}
      </span>
    );
  }
  if (row.decision === "rejected") {
    return (
      <span className="flex flex-col text-[13px] font-medium text-quarantine">
        <span className="flex items-center gap-1.5"><X className="h-4 w-4" />Rejected · never sent · {friendlyTime(row.decided_at ?? undefined)}</span>
        {row.decided_by && <span className="pl-5 text-[11px] font-normal text-muted-foreground">by {row.decided_by}</span>}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
      <Send className="h-4 w-4" />Sent · {row.verdict === "flag" ? "reviewer alerted" : "saved"}
    </span>
  );
}

function ExpandedRow({ row }: { row: ScanResult }) {
  const worst = row.findings.find((f) => f.danger >= 30 || f.hidden_points >= 40) ?? row.findings[0];
  const page = worst?.where.page ?? 1;
  const pageSize = row.pages.find((p) => p.page === page) ?? row.pages[0];
  const boxes = row.findings.filter((f) => (f.where.page ?? 0) === page && (f.danger >= 30 || f.hidden_points >= 40));

  return (
    <tr className={cn("border-b", row.decision === "waiting" && "bg-quarantine/[0.03]")}>
      <td />
      <td colSpan={6} className="px-2 pb-6 pr-5">
        <div className="flex flex-wrap items-start gap-6">
          <PageSchematic size={pageSize} findings={boxes} className="w-[100px] shrink-0" />
          <div className="min-w-[280px] flex-1">
            <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">What was hidden</div>
            {worst && (worst.danger >= 30 || worst.hidden_points >= 40) ? (
              <>
                <div className="mt-2 rounded-lg border bg-white px-3 py-2.5 font-mono text-[14px] text-quarantine">
                  {worst.reads_as || worst.text}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="tag">where: {worst.where_label}</span>
                  <span className="tag">how: {worst.how_label}</span>
                  <span className="tag">hidden {worst.hidden_points} + bossy {worst.bossy_points} = {worst.danger}</span>
                </div>
              </>
            ) : (
              <p className="mt-2 text-[14px] text-muted-foreground">
                {row.findings.length === 0 && row.verdict === "quarantine" ? row.reasons[0] : "Nothing hidden that matters. Only normal file details."}
              </p>
            )}
          </div>
          <Link href={`/scan?id=${row.id}`}
            className="flex items-center gap-2 self-center rounded-xl border-2 border-primary/60 bg-white px-5 py-3 font-display text-[16px] font-semibold uppercase tracking-[0.14em] text-primary hover:bg-primary/5">
            Open full report <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </td>
    </tr>
  );
}
