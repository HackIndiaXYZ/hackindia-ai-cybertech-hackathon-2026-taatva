"use client";

// TAATVA Obsidian - the phone menu (only on small screens).
// A "Menu" button at the top right opens a panel from the side with the
// SCAN / HISTORY / DEMO / LAB links and Sign out. It only SHOWS things:
// the links and the sign-out action come from the header, unchanged.

import Link from "next/link";
import { Hourglass, LogOut, Menu } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Tab = { href: string; label: string; badge?: number; ariaLabel?: string };

export function MobileMenu({ tabs, path, email, onSignOut, waiting, status }: {
  tabs: Tab[];
  path: string;
  email?: string | null;
  onSignOut: () => void;
  waiting: number;
  status: { dot: string; text: string };
}) {
  return (
    <Sheet>
      <SheetTrigger
        className="lift relative flex min-h-11 min-w-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border bg-card px-3 text-[13px] font-medium text-foreground [overflow-wrap:normal] hover:border-primary/40 md:hidden"
        aria-label={waiting ? `Open menu (${waiting} waiting)` : "Open menu"}
      >
        <Menu className="h-4 w-4" />
        {/* Very small phones: icon only (the button still says "Open menu" to screen readers) */}
        <span className="max-[359px]:hidden">Menu</span>
        {/* The History badge stays visible on phones: only Quarantine files still waiting */}
        {!!waiting && (
          <span className="flex h-5 items-center gap-1 whitespace-nowrap rounded-full bg-quarantine px-1.5 text-[11px] font-semibold text-white dark:text-neutral-950">
            <Hourglass className="h-3 w-3" aria-hidden />
            {waiting > 99 ? "99+" : waiting} waiting
          </span>
        )}
      </SheetTrigger>
      <SheetContent>
        <SheetTitle className="font-display text-[13px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Menu</SheetTitle>
        <SheetDescription className="sr-only">Pages of Obsidian by team TAATVA</SheetDescription>

        {/* The partition line above the page buttons (same idea as the top bar) */}
        <div aria-hidden="true" className="relative h-px bg-border">
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-beam/50 to-transparent" />
        </div>
        <nav className="grid gap-1.5">
          {tabs.map((tab) => {
            const active = path.startsWith(tab.href);
            return (
              <SheetClose asChild key={tab.href}>
                <Link
                  href={tab.href}
                  aria-label={tab.ariaLabel}
                  className={cn(
                    "lift flex min-h-12 items-center justify-between rounded-xl border px-4 font-display text-[18px] font-semibold uppercase tracking-[0.14em]",
                    active ? "border-primary bg-card text-foreground shadow-[inset_3px_0_0_hsl(var(--primary))]" : "bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground",
                  )}
                >
                  {tab.label}
                  {!!tab.badge && (
                    <span className={cn("flex h-6 items-center gap-1 rounded-full px-2 font-sans text-[12px] font-semibold normal-case tracking-normal",
                      "bg-quarantine text-white dark:text-neutral-950")}>
                      <Hourglass className="h-3 w-3" aria-hidden />
                      {tab.badge > 99 ? "99+" : tab.badge} waiting
                    </span>
                  )}
                </Link>
              </SheetClose>
            );
          })}
        </nav>

        {/* Who reads the pages right now */}
        <p className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 font-mono text-[12px] text-foreground">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", status.dot)} />
          {status.text}
        </p>

        <div className="mt-auto" />
        {email && (
          <div className="space-y-2 border-t pt-4">
            <p className="truncate text-[13px] text-muted-foreground">Signed in as <b className="text-foreground">{email}</b></p>
            <button onClick={onSignOut}
              className="lift flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border bg-card text-[14px] font-medium text-foreground hover:bg-muted">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        )}
        <p className="text-center font-mono text-[10px] tracking-[0.18em] text-muted-foreground">BUILT BY TEAM TAATVA</p>
      </SheetContent>
    </Sheet>
  );
}
