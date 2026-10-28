// TAATVA Obsidian - the footer at the bottom of every page: team TAATVA, the members,
// and quick links to the four pages (the same addresses as the top bar).

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

// The team: names and roles from the team (25 Oct 2026). No personal links (team decision).
const MEMBERS = [
  { name: "Chaarvi Saxena", role: "Team Lead & AI Architect" },
  { name: "Yashi Savita", role: "Lead UI/UX Designer" },
  { name: "Divyanshu Tripathi", role: "Frontend & API Integration" },
  { name: "Ishan Singh Bhadoria", role: "Engine, Backend, & Database" },
];

const PAGES = [
  { href: "/scan", label: "Scan" },
  { href: "/history", label: "History" },
  { href: "/demo", label: "Demo" },
  { href: "/lab", label: "Lab" },
];

// Links in the footer: a sharp underline grows on hover, text brightens
const FOOT_LINK =
  "group relative inline-flex min-h-11 min-w-11 items-center gap-1 text-[14px] text-muted-foreground transition-colors duration-fast hover:text-foreground lg:min-h-0 lg:min-w-0";
const UNDERLINE =
  "absolute inset-x-0 bottom-2 h-px origin-left scale-x-0 bg-foreground transition-transform duration-base ease-out-soft group-hover:scale-x-100 lg:-bottom-0.5";

export function Footer() {
  return (
    <footer className="relative mt-8 border-t bg-card">
      {/* A thin line along the top edge with a soft deep glow */}
      <span aria-hidden="true" className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-foreground/50 to-transparent" />
      <div className="mx-auto grid max-w-content gap-6 px-4 py-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_auto] md:px-8">
        {/* Team TAATVA */}
        <div>
          <p className="font-display text-[32px] font-bold uppercase leading-none tracking-[0.14em] text-foreground">TAATVA</p>
          <p className="mt-2 max-w-[52ch] text-[14px] leading-snug text-muted-foreground">
            The team behind Obsidian: a scanner that checks files before an AI agent reads them, and reveals what a person can&apos;t see.
          </p>
          <p className="mt-2 font-display text-[13px] font-semibold uppercase tracking-[0.22em] text-foreground">Find. Show. Remove.</p>
        </div>

        {/* The members */}
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">The team</p>
          <ul className="mt-3 grid grid-cols-2 gap-px border bg-border xl:grid-cols-4">
            {MEMBERS.map((m) => (
              <li key={m.name} className="group bg-card px-3 py-2.5 transition-colors sm:px-4 duration-base hover:bg-accent/40">
                <p className="text-[14px] font-semibold text-foreground sm:text-[15px]">{m.name}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground sm:text-[13px]">{m.role}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick links to the pages */}
        <nav aria-label="Footer">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Pages</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 min-[360px]:grid-cols-4 md:grid-cols-2 md:gap-x-6 lg:gap-y-1.5">
            {PAGES.map((p) => (
              <li key={p.href}>
                <Link href={p.href} className={FOOT_LINK}>
                  {p.label}
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-base group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  <span aria-hidden="true" className={UNDERLINE} />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Bottom line: project and year */}
      <div className="border-t">
        <div className="mx-auto flex max-w-content flex-col gap-1 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:flex-row sm:justify-between md:px-8">
          <span>Obsidian — built by team <span className="text-foreground">TAATVA</span> · 2026</span>
          <span>Old tools ask: does this sound bad? Obsidian asks: could a human even see this?</span>
        </div>
      </div>
    </footer>
  );
}
