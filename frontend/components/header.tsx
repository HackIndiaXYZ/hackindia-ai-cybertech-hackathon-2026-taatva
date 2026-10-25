"use client";

// TAATVA Obsidian - the top bar on every page:
// logo on the left, SCAN / HISTORY / DEMO / LAB tabs in the middle,
// reader status, private mode, light/dark switch and sign out on the right.
// On a phone: logo and buttons on the first row, the tabs on a second row.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hourglass, Lock, LockOpen, LogOut } from "lucide-react";
import { useSettings } from "./settings";
import { ThemeToggle } from "./theme";
import { cn } from "@/lib/utils";

// What the History badge counts, in full words (for the tooltip and screen readers)
function waitingText(count: number) {
  return count === 1
    ? "1 Quarantine file is waiting for you to Approve or Reject it"
    : `${count} Quarantine files are waiting for you to Approve or Reject them`;
}

// The Obsidian logo: a dark cut gemstone (with a silver edge in dark mode)
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <polygon points="20,3 37,15 31,36 9,36 3,15" fill="#1b2433" className="stroke-transparent dark:stroke-slate-400" strokeWidth="1.2" />
      <polygon points="20,3 26,17 20,36 14,17" fill="#3b4a63" />
      <polygon points="3,15 14,17 9,36" fill="#2a364b" />
      <polygon points="37,15 26,17 31,36" fill="#0f1623" />
      <polyline points="3,15 14,17 26,17 37,15" fill="none" stroke="#8fa0b8" strokeWidth="0.8" />
      <polyline points="20,3 14,17 9,36" fill="none" stroke="#8fa0b8" strokeWidth="0.6" />
      <polyline points="20,3 26,17 31,36" fill="none" stroke="#8fa0b8" strokeWidth="0.6" />
    </svg>
  );
}

function Brand({ small = false }: { small?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 sm:gap-3">
      <Logo className={small ? "h-8 w-8" : "h-8 w-8 sm:h-10 sm:w-10"} />
      <span>
        <span className="block font-display text-[22px] font-bold leading-none tracking-[0.2em] text-foreground sm:text-[28px] sm:tracking-[0.22em]">
          OBSIDIAN
        </span>
        <span className="mt-1 hidden font-mono text-[10px] tracking-[0.18em] text-muted-foreground sm:block">
          BY TEAM TAATVA · HIDDEN-ORDER SCANNER
        </span>
      </span>
    </span>
  );
}

export function Header() {
  const path = usePathname();
  const { email, signOut, privateMode, setPrivateMode, status, scanner, waitingCount } = useSettings();

  // The sign-in page only shows the logo and the light/dark switch
  if (path.startsWith("/login") || path.startsWith("/auth")) {
    return (
      <header className="border-b bg-card/90" data-scanner={scanner}>
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-3 py-3 sm:px-4 md:px-8">
          <Brand />
          <ThemeToggle />
        </div>
      </header>
    );
  }

  const tabs = [
    { href: "/scan", label: "Scan" },
    { href: "/history", label: "History", badge: waitingCount },
    { href: "/demo", label: "Demo" },
    { href: "/lab", label: "Lab" },
  ];

  // Who reads the pages right now, in plain words
  const readers = scanner === "offline"
    ? { dot: "bg-quarantine", text: "Scanner offline",
        tip: "The scanner has not answered for 2 minutes. We keep trying every 15 seconds. If this lasts, check the backend on Render." }
    : scanner === "waking" || scanner === "checking"
      ? { dot: "bg-flag animate-pulse", text: scanner === "waking" ? "Waking up scanner…" : "Checking scanner…",
          tip: "The scanner sleeps when nobody has used it for a while. It takes about a minute to wake up. This updates by itself." }
    : privateMode
      ? { dot: "bg-pass", text: "Tesseract only · nothing leaves",
          tip: "Private mode: pages are read only on this computer. Nothing is sent to Google." }
      : status && !status.gemini
        ? { dot: "bg-flag", text: "Tesseract only · no Gemini key",
            tip: "Only the reader on this computer is used, because no Google Gemini key is set up." }
        : { dot: "bg-pass", text: "Gemini + Tesseract live",
            tip: "Every page is read by two page readers: Google's Gemini (online) and Tesseract (on this computer)." };

  return (
    <header className="sticky top-0 z-30 border-b bg-card md:bg-card/90 md:backdrop-blur" data-scanner={scanner}>
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4 md:px-8 md:py-3">
        <Link href="/scan" aria-label="Obsidian home" className="flex min-h-11 items-center">
          <Brand />
        </Link>

        {/* SCAN / HISTORY / DEMO: centered. On a phone they get their own row. */}
        <nav className="order-3 flex w-full justify-center lg:order-none lg:w-auto">
          <div className="flex w-full rounded-xl border bg-muted p-1 sm:w-auto">
            {tabs.map((tab) => {
              const active = path.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    // On a phone the "waiting" note sits under the word, so the three tabs still fit
                    "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2 max-md:min-h-11 font-display text-[15px] font-semibold uppercase tracking-[0.14em] transition sm:flex-none sm:flex-row sm:gap-2 sm:px-5 sm:text-[17px] sm:tracking-[0.16em]",
                    active ? "bg-primary text-primary-foreground shadow" : "text-foreground hover:bg-card",
                  )}
                  aria-label={tab.badge ? `${tab.label}: ${waitingText(tab.badge)}` : undefined}
                >
                  {tab.label}
                  {/* Not the total number of scans: only Quarantine files still waiting
                      for Approve / Reject (the same number as "Waiting for you" on History) */}
                  {!!tab.badge && (
                    <span
                      className={cn(
                        "flex h-5 items-center gap-1 whitespace-nowrap rounded-full px-2 font-sans text-[11px] font-semibold normal-case tracking-normal",
                        active ? "bg-primary-foreground text-primary" : "bg-quarantine text-white dark:text-neutral-950",
                      )}
                      title={waitingText(tab.badge)}
                    >
                      <Hourglass className="h-3 w-3" aria-hidden />
                      {tab.badge > 99 ? "99+" : tab.badge} waiting
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="hidden items-center gap-2 rounded-full border bg-card px-3 py-1.5 font-mono text-[11px] text-foreground 2xl:flex"
            title={readers.tip}>
            <span className={cn("h-2 w-2 rounded-full", readers.dot)} />
            {readers.text}
          </span>
          <button
            onClick={() => setPrivateMode(!privateMode)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-mono text-[11px] transition max-md:min-h-11 sm:px-3",
              privateMode ? "border-pass/40 bg-pass/10 text-pass" : "bg-card text-foreground hover:bg-muted",
            )}
            title={`${readers.tip} Click to turn private mode ${privateMode ? "off" : "on"}.`}
            aria-pressed={privateMode}
          >
            <span className={cn("h-2 w-2 rounded-full 2xl:hidden", readers.dot)} />
            {privateMode ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Private mode: {privateMode ? "on" : "off"}</span>
            <span className="sm:hidden">{privateMode ? "Private" : "Online"}</span>
          </button>
          <ThemeToggle />
          {email && (
            <div className="flex items-center gap-1.5 border-l pl-2 sm:gap-2 sm:pl-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 font-display text-[14px] font-semibold uppercase text-primary"
                title={`Signed in as ${email}`}>
                {email[0]}
              </span>
              <span className="hidden max-w-[160px] truncate text-[12px] text-muted-foreground 2xl:block">{email}</span>
              <button onClick={signOut} title="Sign out" aria-label="Sign out"
                className="flex items-center justify-center gap-1 rounded-full border bg-card px-2 py-1.5 text-[11px] text-foreground hover:bg-muted max-md:min-h-11 max-md:min-w-11 sm:px-2.5">
                <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
