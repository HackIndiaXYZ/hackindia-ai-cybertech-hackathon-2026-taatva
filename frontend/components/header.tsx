"use client";

// TAATVA Obsidian - the top bar on every page:
// logo on the left, SCAN / HISTORY tabs in the middle, reader status and private mode on the right.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, LockOpen, LogOut } from "lucide-react";
import { useSettings } from "./settings";
import { cn } from "@/lib/utils";

// The Obsidian logo: a dark cut gemstone
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <polygon points="20,3 37,15 31,36 9,36 3,15" fill="#1b2433" />
      <polygon points="20,3 26,17 20,36 14,17" fill="#3b4a63" />
      <polygon points="3,15 14,17 9,36" fill="#2a364b" />
      <polygon points="37,15 26,17 31,36" fill="#0f1623" />
      <polyline points="3,15 14,17 26,17 37,15" fill="none" stroke="#8fa0b8" strokeWidth="0.8" />
      <polyline points="20,3 14,17 9,36 M20,3 26,17 31,36" fill="none" stroke="#8fa0b8" strokeWidth="0.6" />
    </svg>
  );
}

export function Header() {
  const path = usePathname();
  const { email, signOut, privateMode, setPrivateMode, status, backendDown, waitingCount } = useSettings();

  // The sign-in page only shows the logo
  if (path.startsWith("/login")) {
    return (
      <header className="border-b bg-white/90">
        <div className="mx-auto flex max-w-[1440px] items-center px-4 py-3 md:px-8">
          <Logo className="h-9 w-9" />
          <span className="ml-3 font-display text-[22px] font-bold tracking-[0.22em]">OBSIDIAN</span>
        </div>
      </header>
    );
  }

  const tabs = [
    { href: "/scan", label: "Scan" },
    { href: "/history", label: "History", badge: waitingCount },
    { href: "/demo", label: "Demo" },
  ];

  // What reads the pages right now
  const readers = backendDown
    ? { dot: "bg-quarantine", text: "Backend offline" }
    : privateMode
      ? { dot: "bg-pass", text: "Tesseract only · nothing leaves" }
      : status && !status.gemini
        ? { dot: "bg-flag", text: "Tesseract only · no Gemini key" }
        : { dot: "bg-pass", text: "Gemini + Tesseract live" };

  return (
    <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <Link href="/scan" className="flex items-center gap-3">
          <Logo className="h-10 w-10" />
          <div>
            <div className="font-display text-[28px] font-bold leading-none tracking-[0.22em] text-foreground">
              OBSIDIAN
            </div>
            <div className="mt-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
              BY TEAM TAATVA · HIDDEN-ORDER SCANNER
            </div>
          </div>
        </Link>

        <nav className="order-3 flex w-full justify-center md:order-none md:w-auto">
          <div className="flex rounded-xl border bg-muted p-1">
            {tabs.map((tab) => {
              const active = path.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-5 py-2 font-display text-[17px] font-semibold uppercase tracking-[0.16em] transition",
                    active ? "bg-primary text-white shadow" : "text-foreground hover:bg-white",
                  )}
                >
                  {tab.label}
                  {!!tab.badge && (
                    <span
                      className={cn(
                        "grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-mono text-[11px] tracking-normal",
                        active ? "bg-white text-primary" : "bg-quarantine text-white",
                      )}
                      title={`${tab.badge} files waiting for your decision`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 font-mono text-[11px] text-foreground">
            <span className={cn("h-2 w-2 rounded-full", readers.dot)} />
            {readers.text}
          </span>
          <button
            onClick={() => setPrivateMode(!privateMode)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] transition",
              privateMode ? "border-pass/40 bg-pass/10 text-pass" : "bg-white text-foreground hover:bg-muted",
            )}
            title="Private mode: pages are read only on this computer (Tesseract). Nothing is sent to Gemini."
            aria-pressed={privateMode}
          >
            {privateMode ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
            Private mode: {privateMode ? "on" : "off"}
          </button>
          {email && (
            <div className="flex items-center gap-2 border-l pl-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 font-display text-[14px] font-semibold uppercase text-primary"
                title={`Signed in as ${email}`}>
                {email[0]}
              </span>
              <span className="hidden max-w-[160px] truncate text-[12px] text-muted-foreground xl:block">{email}</span>
              <button onClick={signOut} title="Sign out"
                className="flex items-center gap-1 rounded-full border bg-white px-2.5 py-1.5 text-[11px] text-foreground hover:bg-muted">
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
