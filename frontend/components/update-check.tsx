"use client";

// TAATVA Obsidian - notices when this open page is an OLD version of the website.
// Phones keep tabs open for days (or reopen a saved copy), so a person can be using
// last week's website with last week's bugs. We ask the server which version is live:
// when coming back to the tab, and every 5 minutes. If it is newer, a bar says
// "Refresh now". The Scan page also checks just before every scan.

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const MY_VERSION = process.env.NEXT_PUBLIC_BUILD_ID;
let outdated = false;
const listeners = new Set<(old: boolean) => void>();

// true = a newer website is live. If the check itself fails (no signal), we say false.
export async function pageIsOutdated(): Promise<boolean> {
  if (outdated) return true;
  try {
    const answer = await fetch("/api/version", { cache: "no-store", signal: AbortSignal.timeout(5_000) });
    if (!answer.ok) return false;
    const { version } = (await answer.json()) as { version?: string };
    if (version && MY_VERSION && version !== MY_VERSION) {
      outdated = true;
      listeners.forEach((tell) => tell(true));
    }
  } catch {}
  return outdated;
}

export function UpdateBar() {
  const [old, setOld] = useState(outdated);

  useEffect(() => {
    listeners.add(setOld);
    const check = () => document.visibilityState === "visible" && pageIsOutdated();
    check();
    const timer = setInterval(check, 5 * 60_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      listeners.delete(setOld);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  if (!old) return null;
  return (
    <div className="border-b border-primary/30 bg-primary/10" role="status">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-[15px] md:text-[14px] text-foreground sm:px-4 md:px-8">
        <span><b>A newer version of Obsidian is ready.</b> Refresh to use it (this page is out of date).</span>
        <button onClick={() => window.location.reload()}
          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 max-md:min-h-11 font-display text-[14px] font-semibold uppercase tracking-[0.14em] text-primary-foreground hover:bg-primary/90">
          <RefreshCw className="h-4 w-4" /> Refresh now
        </button>
      </div>
    </div>
  );
}
