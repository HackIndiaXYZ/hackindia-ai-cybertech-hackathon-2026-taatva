// TAATVA Obsidian - QA test mode (ONLY on a developer's computer).
// Open a page with "?qa=1" while running `npm run dev`, and the pages use saved example
// results from /public/qa instead of Supabase and the scanner. This lets testers check
// every screen size without signing in.
// The live website is built in "production" mode, where this is ALWAYS off.

import type { ScanResult } from "./api";

export function qaMode(): boolean {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("qa");
}

async function fixture<T>(name: string): Promise<T> {
  const response = await fetch(`/qa/${name}.json?qa=1`); // "?qa=1": the gatekeeper lets it through in dev
  if (!response.ok) throw new Error(`QA example "${name}" not found. Run qa\\make_fixtures.py first.`);
  return response.json();
}

export const qaHistory = () => fixture<ScanResult[]>("history");
export const qaScan = (id: string) => fixture<ScanResult>(id);

// Pretend scan: waits a moment (so the "checking" screen shows), then returns an example
export async function qaScanFile(file: File): Promise<ScanResult> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const name = file.name.toLowerCase();
  const pick = name.includes("clean") ? "clean" : name.includes("eml") ? "email" : "white";
  return { ...(await qaScan(pick)), file_name: file.name };
}
