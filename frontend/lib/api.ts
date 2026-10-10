// TAATVA Obsidian - talking to the backend, and the shapes of its answers.

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
};

export type Status = { gemini: boolean; private_mode_default: boolean; prompt_guard: string };

async function ask<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail ?? `The backend said ${response.status}`);
  }
  return response.json();
}

export function scanFile(file: File, privateMode: boolean) {
  const form = new FormData();
  form.append("file", file);
  form.append("private_mode", String(privateMode));
  return ask<ScanResult>("/scan", { method: "POST", body: form });
}

export const getHistory = () => ask<ScanResult[]>("/history");
export const getScan = (id: string) => ask<ScanResult>(`/history/${id}`);
export const getStatus = () => ask<Status>("/status");

export function decideScan(id: string, decision: "approved" | "rejected") {
  return ask<ScanResult>(`/history/${id}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision }),
  });
}
