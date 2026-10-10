// TAATVA Obsidian - talking to the backend and to Supabase, and the shapes of their answers.
//   Scanning goes to our backend (with the person's sign-in token).
//   History is read and decided straight from Supabase. Row level security
//   there means each person only ever gets their own scans.

import { supabase } from "./supabase";

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
};

export class SignInNeeded extends Error {}

export type Status = { gemini: boolean; private_mode_default: boolean; prompt_guard: string };

async function ask<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) throw new SignInNeeded(body.detail ?? "Please sign in again.");
    throw new Error(body.detail ?? `The backend said ${response.status}`);
  }
  return response.json();
}

export async function scanFile(file: File, privateMode: boolean) {
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

export const getStatus = () => ask<Status>("/status");

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

// ----- History, straight from Supabase (only your own scans) -----

export async function getHistory(): Promise<ScanResult[]> {
  const { data, error } = await supabase().from("scans").select("*").order("scanned_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as ScanResult[];
}

export async function getScan(id: string): Promise<ScanResult> {
  const { data, error } = await supabase().from("scans").select("*").eq("id", id).single();
  if (error) throw new Error(error.code === "PGRST116" ? "Scan not found." : error.message);
  return data as ScanResult;
}

export async function decideScan(id: string, decision: "approved" | "rejected"): Promise<ScanResult> {
  // The database only allows this on your own Quarantine files that are still waiting
  const { data, error } = await supabase().from("scans").update({ decision }).eq("id", id).select("*");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("This file can no longer be changed.");
  return data[0] as ScanResult;
}
