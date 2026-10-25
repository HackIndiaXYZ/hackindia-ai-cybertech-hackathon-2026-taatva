// TAATVA Obsidian - the footer at the bottom of every page: team TAATVA, the members,
// and quick links to the four pages (the same addresses as the top bar).

import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";

// ===================== TEAM: FILL IN THE LINKS HERE =====================
// Names and roles are from the team (25 Oct 2026).
// To add links: paste the full address between the quotes, for example
//   github: "https://github.com/your-name",
//   linkedin: "https://www.linkedin.com/in/your-name",
// Empty ("") = no link is shown. Never put a made-up link here.
const MEMBERS = [
  { name: "Chaarvi Saxena", role: "Team Lead & AI Architect", github: "", linkedin: "" },
  { name: "Yashi Savita", role: "Lead UI/UX Designer", github: "", linkedin: "" },
  { name: "Divyanshu Tripathi", role: "Frontend & API Integration", github: "", linkedin: "" },
  { name: "Ishan Singh Bhadoria", role: "Engine, Backend, & Database", github: "", linkedin: "" },
];
// ========================================================================

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
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 md:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_auto] md:px-8">
        {/* Team TAATVA */}
        <div>
          <p className="font-display text-[44px] font-bold uppercase leading-none tracking-[0.14em] text-foreground">TAATVA</p>
          <p className="mt-3 max-w-[40ch] text-[14px] leading-relaxed text-muted-foreground">
            The team behind Obsidian: a scanner that checks files before an AI agent reads them, and reveals what a person can&apos;t see.
          </p>
          <p className="mt-4 font-display text-[13px] font-semibold uppercase tracking-[0.22em] text-foreground">Find. Show. Remove.</p>
        </div>

        {/* The members */}
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">The team</p>
          <ul className="mt-4 grid gap-px border bg-border sm:grid-cols-2">
            {MEMBERS.map((m) => (
              <li key={m.name} className="group bg-card p-4 transition-colors duration-base hover:bg-accent/40">
                <p className="text-[15px] font-semibold text-foreground">{m.name}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{m.role}</p>
                {(m.github || m.linkedin) && (
                  <p className="mt-2 flex gap-4">
                    {m.github && (
                      <a href={m.github} target="_blank" rel="noopener noreferrer" className={FOOT_LINK} aria-label={`${m.name} on GitHub`}>
                        <ExternalLink className="h-4 w-4" /> GitHub<span aria-hidden="true" className={UNDERLINE} />
                      </a>
                    )}
                    {m.linkedin && (
                      <a href={m.linkedin} target="_blank" rel="noopener noreferrer" className={FOOT_LINK} aria-label={`${m.name} on LinkedIn`}>
                        <ExternalLink className="h-4 w-4" /> LinkedIn<span aria-hidden="true" className={UNDERLINE} />
                      </a>
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Quick links to the pages */}
        <nav aria-label="Footer">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Pages</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 md:grid-cols-1 md:gap-y-2">
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
        <div className="mx-auto flex max-w-[1440px] flex-col gap-1 px-4 py-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:flex-row sm:justify-between md:px-8">
          <span>Obsidian — built by team <span className="text-foreground">TAATVA</span> · 2026</span>
          <span>Old tools ask: does this sound bad? Obsidian asks: could a human even see this?</span>
        </div>
      </div>
    </footer>
  );
}
