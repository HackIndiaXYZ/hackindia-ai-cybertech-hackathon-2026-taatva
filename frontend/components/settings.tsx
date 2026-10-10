"use client";

// TAATVA Obsidian - settings shared by every page: private mode, and
// how many files are waiting for a decision (for the HISTORY badge).

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getHistory, getStatus, type Status } from "@/lib/api";

type Settings = {
  privateMode: boolean;
  setPrivateMode: (on: boolean) => void;
  status: Status | null;
  backendDown: boolean;
  waitingCount: number;
  refreshWaiting: () => void;
};

const SettingsContext = createContext<Settings | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [privateMode, setPrivateModeState] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [backendDown, setBackendDown] = useState(false);
  const [waitingCount, setWaitingCount] = useState(0);

  const refreshWaiting = useCallback(() => {
    getHistory()
      .then((rows) => setWaitingCount(rows.filter((r) => r.decision === "waiting").length))
      .catch(() => {});
  }, []);

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
    refreshWaiting();
  }, [refreshWaiting]);

  function setPrivateMode(on: boolean) {
    setPrivateModeState(on);
    try {
      localStorage.setItem("obsidian-private-mode", String(on));
    } catch {}
  }

  return (
    <SettingsContext.Provider value={{ privateMode, setPrivateMode, status, backendDown, waitingCount, refreshWaiting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error("useSettings must be inside SettingsProvider");
  return settings;
}
