"use client";

// TAATVA Obsidian - the top bar on every page:
// logo on the left, SCAN / HISTORY / DEMO / LAB tabs in the middle,
// reader status, private mode, light/dark switch and sign out on the right.
// On a phone: logo and buttons on one row, the tabs in a "Menu" panel.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Hourglass, Lock, LockOpen, LogOut } from "lucide-react";
import { useSettings } from "./settings";
import { ThemeToggle } from "./theme";
import { MobileMenu } from "./visual/MobileMenu";
import { Tip } from "./ui/tooltip";
import { ObsidianLockup } from "./ObsidianLockup";
import { cn } from "@/lib/utils";

// What the History badge counts, in full words (for the tooltip and screen readers)
function waitingText(count: number) {
  return count === 1
    ? "1 Quarantine file is waiting for you to Approve or Reject it"
    : `${count} Quarantine files are waiting for you to Approve or Reject them`;
}

// The logo with the name (the "X-Ray Eye" lockup). On phones the small line under
// the name is hidden, so the top bar fits.
function Brand() {
  return <ObsidianLockup size={36} taglineClassName="max-sm:hidden" />;
}

// The glass bar at the top, with a thin beam line along its bottom edge
const BAR = "sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65";
const BEAM_LINE = "pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-beam/50 to-transparent";

export function Header() {
  const path = usePathname();
  const { email, signOut, privateMode, setPrivateMode, status, scanner, waitingCount } = useSettings();

  // The sign-in page only shows the logo and the light/dark switch
  if (path.startsWith("/login") || path.startsWith("/auth")) {
    return (
      <header className={BAR} data-scanner={scanner}>
        <div className="mx-auto flex max-w-content items-center justify-between px-4 py-3 md:px-8">
          <Brand />
          <ThemeToggle />
        </div>
        <span aria-hidden="true" className={BEAM_LINE} />
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
    <header className={BAR} data-scanner={scanner}>
      {/* ROW 1: the logo on the left; reader status, private mode, theme and account on the right */}
      <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2.5 md:px-8">
        <Link href="/" aria-label="Obsidian home" className="flex min-h-11 items-center">
          <Brand />
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Not the total number of scans: only Quarantine files still waiting
                      for Approve / Reject (the same number as "Waiting for you" on History) */}
          <Tip text={readers.tip} side="bottom">
            <span className="hidden items-center gap-2 rounded-full border bg-card/70 px-3 py-1.5 font-mono text-[11px] text-foreground lg:flex" tabIndex={0}>
              <span className={cn("h-2 w-2 rounded-full", readers.dot)} />
              {readers.text}
            </span>
          </Tip>
          <Tip text={`${readers.tip} Click to turn private mode ${privateMode ? "off" : "on"}.`} side="bottom">
            <button
              onClick={() => setPrivateMode(!privateMode)}
              className={cn(
                "lift flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1.5 font-mono text-[11px] [overflow-wrap:normal] max-lg:min-h-11 sm:px-3",
                privateMode ? "border-pass/40 bg-pass/10 text-pass" : "bg-card/70 text-foreground hover:border-primary/40",
              )}
              aria-pressed={privateMode}
            >
              <span className={cn("h-2 w-2 rounded-full lg:hidden", readers.dot)} />
              {privateMode ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Private mode: {privateMode ? "on" : "off"}</span>
              <span className="sm:hidden">{privateMode ? "Private" : "Online"}</span>
            </button>
          </Tip>
          <ThemeToggle />
          {email && (
            <div className="hidden items-center gap-2 border-l pl-3 md:flex">
              <Tip text={`Signed in as ${email}`} side="bottom">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 font-display text-[14px] font-semibold uppercase text-primary ring-1 ring-primary/30" tabIndex={0}>
                  {email[0]}
                </span>
              </Tip>
              <span className="hidden max-w-[160px] truncate text-[12px] text-muted-foreground 2xl:block">{email}</span>
              <button onClick={signOut} title="Sign out" aria-label="Sign out"
                className="lift flex items-center justify-center gap-1 rounded-full border bg-card/70 px-2.5 py-1.5 text-[11px] text-foreground hover:border-primary/40 max-lg:min-h-11">
                <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          )}
          {/* Phones: the page links and Sign out are in this menu */}
          <MobileMenu
            tabs={tabs.map((tab) => ({ ...tab, ariaLabel: tab.badge ? `${tab.label}: ${waitingText(tab.badge)}` : undefined }))}
            path={path}
            email={email}
            onSignOut={signOut}
            waiting={waitingCount}
            status={readers}
          />
        </div>
      </div>

      {/* THE PARTITION: a thin sharp line across the bar, with a soft deep glow */}
      <div aria-hidden="true" className="relative hidden h-px bg-border md:block">
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-beam/40 to-transparent" />
      </div>

      {/* ROW 2 (tablets and computers): SCAN / HISTORY / DEMO / LAB. On phones they are in the "Menu" panel.
          A lit bar on the partition line sits above the open page and slides when you change page. */}
      <nav className="mx-auto hidden max-w-content justify-center px-4 md:flex md:px-8">
        {tabs.map((tab) => {
          const active = path.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                // Tablets (touch screens): at least 44 px tall, easy to tap
                "group relative flex min-h-11 items-center justify-center gap-2 px-5 py-2.5 font-display text-[14px] font-semibold uppercase tracking-[0.16em] transition-colors duration-fast",
                active ? "text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground active:bg-accent",
              )}
              aria-label={tab.badge ? `${tab.label}: ${waitingText(tab.badge)}` : undefined}
            >
              {/* The lit bar for the open page, sitting on the partition line */}
              {active && (
                <motion.span layoutId="nav-bar" aria-hidden="true"
                  className="absolute inset-x-0 -top-px h-[2px] bg-primary shadow-[0_0_12px_hsl(var(--beam)/0.7)]"
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} />
              )}
              {/* Hover: a fainter bar grows on the partition line */}
              {!active && (
                <span aria-hidden="true" className="absolute inset-x-0 -top-px h-[2px] origin-left scale-x-0 bg-beam/50 transition-transform duration-base ease-out-soft group-hover:scale-x-100" />
              )}
              <span className="relative">{tab.label}</span>
              {/* Not the total number of scans: only Quarantine files still waiting
                  for Approve / Reject (the same number as "Waiting for you" on History) */}
              {!!tab.badge && (
                <span
                  className="relative flex h-5 items-center gap-1 whitespace-nowrap rounded-full bg-quarantine px-2 font-sans text-[11px] font-semibold normal-case tracking-normal text-white shadow-[0_0_12px_hsl(var(--quarantine)/0.45)] dark:text-neutral-950"
                  title={waitingText(tab.badge)}
                >
                  <Hourglass className="h-3 w-3" aria-hidden />
                  {tab.badge > 99 ? "99+" : tab.badge} waiting
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <span aria-hidden="true" className={BEAM_LINE} />
    </header>
  );
}
