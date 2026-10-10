"use client";

// TAATVA Obsidian - settings shared by every page: who is signed in,
// private mode, and how many files are waiting for a decision (HISTORY badge).

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getHistory, getStatus, type Status } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type Settings = {
  email: string | null;
  signOut: () => Promise<void>;
  privateMode: boolean;
  setPrivateMode: (on: boolean) => void;
  status: Status | null;
  backendDown: boolean;
  waitingCount: number;
  refreshWaiting: () => void;
};

const SettingsContext = createContext<Settings | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [privateMode, setPrivateModeState] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [backendDown, setBackendDown] = useState(false);
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
    if (email) refreshWaiting();
  }, [email, path, refreshWaiting]);

  useEffect(() => {
    // Ask the backend which readers are on. Remember the private mode choice.
    getStatus()
      .then((s) => {
        setStatus(s);
        let saved: string | null = null;
        try {
          saved = localStorage.getItem("obsidian-private-mode");
        } catch {}
        setPrivateModeState(saved === null ? s.private_mode_default : saved === "true");
      })
      .catch(() => setBackendDown(true));
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
      value={{ email, signOut, privateMode, setPrivateMode, status, backendDown, waitingCount, refreshWaiting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error("useSettings must be inside SettingsProvider");
  return settings;
}
