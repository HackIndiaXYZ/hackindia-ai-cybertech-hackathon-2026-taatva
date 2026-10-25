// TAATVA Obsidian - talking to the backend and to Supabase, and the shapes of their answers.
//   Scanning goes to our backend (with the person's sign-in token).
//   History is read and decided straight from Supabase. Row level security
//   there means each person only ever gets their own scans.

import { supabase } from "./supabase";
import { qaHistory, qaMode, qaScan, qaScanFile } from "./qa";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Verdict = "pass" | "flag" | "quarantine";

export type Finding = {
  text: string;
  reads_as?: string;
  where: { page?: number | null; box?: number[]; place?: string };
  how_hidden: string[];
  hidden_points: number;
  bossy_points: number;
  bossy_score: number;
  danger: number;
  phrase_score?: number;              // our phrase list (0-1)
  prompt_guard_score?: number | null; // Prompt Guard's second opinion (0-1), null = not used
  // Plain words made by the backend for this dashboard
  title: string;
  explain: string;
  how_label: string;
  where_label: string;
};

export type PageSize = { page: number; width: number; height: number };

export type ScanResult = {
  id: string;
  file_name: string;
  file_type: "pdf" | "html" | "eml";
  score: number;
  verdict: Verdict;
  reasons: string[];
  findings: Finding[];
  worst_finding: string;
  clean_copy?: string | null;
  pages: PageSize[];
  page_images?: string[]; // only right after a scan, never saved
  views?: {
    ai: { page: number; text: string; hidden: boolean }[];
    people: { page: number; reader: string; lines: string[] }[];
  } | null;
  timings: Record<string, number>;
  total_time: number;
  witness_agreement: number | null;
  private_mode: boolean;
  scanned_at?: string;
  decision: "waiting" | "sent" | "approved" | "rejected";
  decided_at?: string | null;
  decided_by?: string | null;
  user_email?: string;
  save_error?: string;
  notes?: string[]; // e.g. "Gemini was busy, read by Tesseract only"
};

export class SignInNeeded extends Error {}

export type Status = { gemini: boolean; private_mode_default: boolean; prompt_guard: string };

async function ask<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) throw new SignInNeeded(body.detail ?? "Please sign in again.");
    // Plain words when the scanner itself is down or broken (QA-20)
    throw new Error(body.detail ?? (response.status >= 500
      ? "The scanner is not working right now. Please try again in a minute."
      : `The scanner refused this request (code ${response.status}).`));
  }
  return response.json();
}

export async function scanFile(file: File, privateMode: boolean) {
  if (qaMode()) return qaScanFile(file); // developer test mode only
  // Send the person's sign-in token, so the backend knows who is scanning
  const { data } = await supabase().auth.getSession();
  if (!data.session) throw new SignInNeeded("Please sign in again.");
  const form = new FormData();
  form.append("file", file);
  form.append("private_mode", String(privateMode));
  return ask<ScanResult>("/scan", {
    method: "POST",
    body: form,
    headers: { Authorization: `Bearer ${data.session.access_token}` },
  });
}

// Give up after 10 seconds, so a sleeping scanner never makes the page hang
export const getStatus = () => ask<Status>("/status", { signal: AbortSignal.timeout(10_000) });

// ----- The "AI recruiter" demo -----

export type DemoResult = {
  mode: "original" | "obsidian";
  ranking: { rank: number; resume: number; file_name: string; candidate: string; reason: string }[];
  obsidian: { resume: number; file_name: string; score: number; verdict: Verdict; worst_finding: string; held: boolean }[];
  sent: { resume: number; file_name: string; text: string }[];
};

export async function runDemo(files: File[], mode: "original" | "obsidian", job: string, privateMode: boolean) {
  const { data } = await supabase().auth.getSession();
  if (!data.session) throw new SignInNeeded("Please sign in again.");
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  form.append("mode", mode);
  form.append("job", job);
  form.append("private_mode", String(privateMode));
  return ask<DemoResult>("/demo/rank", {
    method: "POST",
    body: form,
    headers: { Authorization: `Bearer ${data.session.access_token}` },
  });
}

// ----- Attack Lab: hide a sentence in a made-up resume, then scan it live -----

export type LabTrick = "white" | "tiny" | "offpage";

export type LabResult = {
  // The full existing Obsidian scan of the made-up resume
  obsidian: Pick<ScanResult, "score" | "verdict" | "reasons" | "findings" | "pages" | "page_images" | "views" | "total_time" | "private_mode"> & {
    notes: string[];
    prompt_guard: string | null; // "ready" = Prompt Guard gave its second opinion
  };
  // "Old Way: words only" (our phrase list on the plain text). null = it could not run.
  old_way: { score: number; verdict: Verdict; bossy: number; phrases: string[] } | null;
  caught: boolean;
  match: number; // how alike the found words are to the sentence (0-100)
  answer_key: { trick: LabTrick; page: number; sentence: string; box: number[]; page_size: number[] };
  plain_line: string;
  finding_lines: string[];
  agent_receives: string; // the clean copy, or "NOTHING - file held for a human"
  counter: LabCounter | null;
};

// "N tried, X caught, Y escaped" for everyone together (numbers only, never sentences)
export type LabCounter = {
  tried: number;
  caught: number;
  escaped: number;
  saved_in: "supabase" | "local file";
  since: string | null; // first try in the local file
};

async function labToken() {
  const { data } = await supabase().auth.getSession();
  // Developer test mode only: no sign-in on this computer. The real backend still
  // refuses this, so it only works with a local test backend. Results are always real scans.
  const token = qaMode() ? "qa-local-test" : data.session?.access_token;
  if (!token) throw new SignInNeeded("Please sign in again.");
  return token;
}

export async function tryLab(sentence: string, trick: LabTrick, privateMode: boolean) {
  return ask<LabResult>("/lab/try", {
    method: "POST",
    body: JSON.stringify({ sentence, trick, private_mode: privateMode }),
    headers: { Authorization: `Bearer ${await labToken()}`, "Content-Type": "application/json" },
  });
}

export async function getLabCounter() {
  return ask<LabCounter>("/lab/counter", {
    headers: { Authorization: `Bearer ${await labToken()}` },
    signal: AbortSignal.timeout(15_000),
  });
}

// ----- History, straight from Supabase (only your own scans) -----

export async function getHistory(): Promise<ScanResult[]> {
  if (qaMode()) return qaHistory(); // developer test mode only
  const { data, error } = await supabase().from("scans").select("*").order("scanned_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as ScanResult[];
}

export async function getScan(id: string): Promise<ScanResult> {
  if (qaMode()) return qaScan(id); // developer test mode only
  const { data, error } = await supabase().from("scans").select("*").eq("id", id).single();
  if (error) throw new Error(error.code === "PGRST116" ? "Scan not found." : error.message);
  return data as ScanResult;
}

export async function decideScan(id: string, decision: "approved" | "rejected"): Promise<ScanResult> {
  if (qaMode()) return { ...(await qaScan(id)), decision, decided_at: new Date().toISOString(), decided_by: "qa tester" };
  // The database only allows this on your own Quarantine files that are still waiting
  const { data, error } = await supabase().from("scans").update({ decision }).eq("id", id).select("*");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("This file can no longer be changed.");
  return data[0] as ScanResult;
}
