"use client";

// TAATVA Obsidian - home page (empty for now).
// It asks the backend "are you alive?" and shows the answer.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  // "checking" -> "ok" or "down"
  const [backend, setBackend] = useState<"checking" | "ok" | "down">("checking");

  function checkBackend() {
    setBackend("checking");
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((data) => setBackend(data.status === "ok" ? "ok" : "down"))
      .catch(() => setBackend("down"));
  }

  useEffect(checkBackend, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-white flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-black tracking-widest uppercase bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent">
          Obsidian
        </h1>
        <p className="mt-2 text-sm tracking-[0.4em] text-neutral-400 uppercase">by TAATVA</p>
        <p className="mt-6 text-neutral-300">Find. Show. Remove.</p>
      </div>

      {/* Backend light: green = alive, red = not reachable */}
      <div className="flex items-center gap-3 rounded-md border border-neutral-700 bg-neutral-900 px-5 py-3">
        <span
          className={
            "h-3 w-3 rounded-full " +
            (backend === "ok"
              ? "bg-green-400 shadow-[0_0_10px_#4ade80]"
              : backend === "down"
                ? "bg-red-500 shadow-[0_0_10px_#ef4444]"
                : "bg-neutral-500")
          }
        />
        <span className="text-neutral-200">
          Backend: {backend === "ok" ? "alive" : backend === "down" ? "not reachable" : "checking..."}
        </span>
        <Button variant="outline" size="sm" onClick={checkBackend}>
          Check again
        </Button>
      </div>
    </main>
  );
}
