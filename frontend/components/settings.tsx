"use client";

// TAATVA Obsidian - settings shared by every page: who is signed in,
// private mode, and how many files are waiting for a decision (HISTORY badge).

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getHistory, getStatus, type Status } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { qaMode } from "@/lib/qa";

type Settings = {
  email: string | null;
  signOut: () => Promise<void>;
  privateMode: boolean;
  setPrivateMode: (on: boolean) => void;
  status: Status | null;
  scanner: ScannerState;
  waitingCount: number;
  refreshWaiting: () => void;
};

export type ScannerState = "checking" | "waking" | "online" | "offline";

const SettingsContext = createContext<Settings | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [privateMode, setPrivateModeState] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  // "checking" at first, "waking" while the scanner starts up, then "online" or "offline"
  const [scanner, setScanner] = useState<ScannerState>("checking");
  const [waitingCount, setWaitingCount] = useState(0);

  const refreshWaiting = useCallback(() => {
    getHistory()
      .then((rows) => setWaitingCount(rows.filter((r) => r.decision === "waiting").length))
      .catch(() => setWaitingCount(0));
  }, []);

  // Who is signed in? Keep it up to date when they sign in or out.
  useEffect(() => {
    supabase().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data } = supabase().auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // QA test mode has no sign-in, but testers still need to see the History badge
    if (email || qaMode()) refreshWaiting();
  }, [email, path, refreshWaiting]);

  useEffect(() => {
    // Keep asking the scanner (backend) "are you there?".
    // On the free Render plan the scanner falls asleep after 15 quiet minutes and
    // needs about a minute to wake up. So: while it is not answering, we say
    // "waking up" and ask again every 5 seconds. Only after 2 minutes of silence
    // do we say "offline" (and we still keep asking, every 15 seconds).
    // Once it answers, we check again every minute (this also keeps it awake).
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let firstFailure: number | null = null;
    let privateModeChosen = false;

    async function check() {
      try {
        const s = await getStatus();
        if (stopped) return;
        setStatus(s);
        setScanner("online");
        firstFailure = null;
        if (!privateModeChosen) {
          // Remember the private mode choice (only the first time)
          privateModeChosen = true;
          let saved: string | null = null;
          try {
            saved = localStorage.getItem("obsidian-private-mode");
          } catch {}
          setPrivateModeState(saved === null ? s.private_mode_default : saved === "true");
        }
        timer = setTimeout(check, 60_000);
      } catch {
        if (stopped) return;
        firstFailure ??= Date.now();
        const longTime = Date.now() - firstFailure > 120_000;
        setScanner(longTime ? "offline" : "waking");
        timer = setTimeout(check, longTime ? 15_000 : 5_000);
      }
    }

    // Check straight away when someone comes back to this browser tab
    function onFocus() {
      clearTimeout(timer);
      check();
    }

    check();
    window.addEventListener("focus", onFocus);
    return () => {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  function setPrivateMode(on: boolean) {
    setPrivateModeState(on);
    try {
      localStorage.setItem("obsidian-private-mode", String(on));
    } catch {}
  }

  async function signOut() {
    await supabase().auth.signOut();
    setEmail(null);
    router.replace("/login");
    router.refresh();
  }

  return (
    <SettingsContext.Provider
      value={{ email, signOut, privateMode, setPrivateMode, status, scanner, waitingCount, refreshWaiting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error("useSettings must be inside SettingsProvider");
  return settings;
}
