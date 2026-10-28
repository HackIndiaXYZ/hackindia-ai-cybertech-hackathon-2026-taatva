// TAATVA Obsidian - the DOWNLOAD REPORT maker.
// Makes a PDF report in the browser, from the scan result already on screen.
// Nothing new is sent anywhere: no backend call, no outside service, no AI.
// Rules: hidden text is shown, clearly labelled "not sent to the AI".
//        Quarantine = NO clean text in the report (same rule as "Copy clean text").

import type { Finding, ScanResult, Verdict } from "./api";
import { QUARANTINE_FROM, VERDICT_MEANING } from "./verdict";

// Light-mode verdict colours from CLAUDE.md (a report is printed on white paper)
const VERDICT_RGB: Record<Verdict, [number, number, number]> = {
  pass: [0x12, 0x66, 0x3f],
  flag: [0x8a, 0x5a, 0x00],
  quarantine: [0xa3, 0x17, 0x2a],
};
const INK: [number, number, number] = [0x15, 0x13, 0x0f];
const GREY: [number, number, number] = [0x57, 0x52, 0x4a];
const HAIRLINE: [number, number, number] = [0xd0, 0xc9, 0xbd];

// The same rule as the Findings list: findings that matter, or clearly hidden on purpose
export function reportFindings(findings: Finding[]) {
  return findings.filter((f) => f.danger >= 30 || f.hidden_points >= 40);
}

// The PDF's built-in font only knows simple letters. Swap fancy quotes and dashes
// for plain ones, and write invisible or unknown letters as [U+200B] so they show.
export function plain(text: string) {
  const simple = text
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/·/g, "-");
  // Array.from splits by real letters, so an emoji becomes ONE code, not two
  return Array.from(simple)
    .map((ch) => (/^[\x20-\x7E\n -ÿ]$/.test(ch) ? ch : `[U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}]`))
    .join("");
}

function longDate(iso?: string) {
  const date = iso ? new Date(iso) : new Date();
  return date.toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

// "resume.pdf" -> "Obsidian_report_resume.pdf"
export function reportFileName(fileName: string) {
  const base = (fileName || "scan").replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "_").slice(0, 60);
  return `Obsidian_report_${base}.pdf`;
}

// Make the report and save it on the person's computer or phone
export async function downloadReport(result: ScanResult) {
  const doc = await makeReport(result);
  doc.save(reportFileName(result.file_name));
}

// Make the report (also used by our report tests)
export async function makeReport(result: ScanResult) {
  // Loaded only when the button is pressed, so pages stay fast
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48; // page margin
  const textWidth = W - M * 2;
  const colour = VERDICT_RGB[result.verdict];
  const locked = result.verdict === "quarantine" || result.score >= QUARANTINE_FROM;
  let y = M;

  // Start a new page when the next block would not fit
  function room(height: number) {
    if (y + height > H - 64) {
      doc.addPage();
      y = M;
    }
  }

  // Write wrapped text and move down
  function write(text: string, opts: { size?: number; bold?: boolean; font?: "helvetica" | "courier"; color?: [number, number, number]; gap?: number; indent?: number } = {}) {
    const size = opts.size ?? 10;
    const indent = opts.indent ?? 0;
    doc.setFont(opts.font ?? "helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? INK));
    const lines = doc.splitTextToSize(plain(text), textWidth - indent) as string[];
    const lineHeight = size * 1.35;
    for (const line of lines) {
      room(lineHeight);
      doc.text(line, M + indent, y + size);
      y += lineHeight;
    }
    y += opts.gap ?? 4;
  }

  function label(text: string) {
    room(30);
    y += 8;
    doc.setDrawColor(...HAIRLINE);
    doc.setLineWidth(0.5);
    doc.line(M, y, W - M, y);
    y += 10;
    write(text.toUpperCase(), { size: 8, bold: true, color: GREY, gap: 6 });
  }

  // ----- Header -----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text("OBSIDIAN", M, y + 18);
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  doc.text("Scan report", W - M, y + 18, { align: "right" });
  y += 30;
  doc.setDrawColor(...INK);
  doc.setLineWidth(1.2);
  doc.line(M, y, W - M, y);
  y += 16;

  // ----- File details -----
  const kind = { pdf: "PDF document", html: "HTML email", eml: "Email" }[result.file_type] ?? result.file_type;
  write(result.file_name || "Unnamed file", { size: 12, bold: true, font: "courier", gap: 2 });
  write(`${kind} - scanned ${longDate(result.scanned_at)}${result.user_email ? ` - by ${result.user_email}` : ""}`, { size: 9, color: GREY, gap: 2 });
  write(`Readers: ${result.private_mode ? "Tesseract only (private mode, nothing left the company)" : "Gemini + Tesseract"}`, { size: 9, color: GREY, gap: 10 });

  // ----- Score and verdict (a solid band in the verdict colour) -----
  room(70);
  doc.setFillColor(...colour);
  doc.rect(M, y, textWidth, 56, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.text(String(result.score), M + 16, y + 38);
  const scoreWidth = doc.getTextWidth(String(result.score));
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.text("/ 100 danger", M + 22 + scoreWidth, y + 38);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(result.verdict.toUpperCase(), W - M - 16, y + 36, { align: "right" });
  y += 68;
  write(VERDICT_MEANING[result.verdict], { size: 10, gap: 4 });
  if (result.decision === "approved") write(`Approved by a person${result.decided_by ? ` (${result.decided_by})` : ""} on ${longDate(result.decided_at ?? undefined)}.`, { size: 10, bold: true, color: VERDICT_RGB.pass });
  if (result.decision === "rejected") write(`Rejected by a person${result.decided_by ? ` (${result.decided_by})` : ""} on ${longDate(result.decided_at ?? undefined)}. Never sent to the AI.`, { size: 10, bold: true, color: VERDICT_RGB.quarantine });

  // ----- Plain reasons -----
  const findings = reportFindings(result.findings);
  label("Why");
  const reasons = findings.length
    ? findings.slice(0, 5).map((f) => f.title)
    : result.verdict === "pass" ? ["No hidden orders found."] : result.reasons.slice(0, 3);
  reasons.forEach((r) => write(`-  ${r}`, { size: 10, gap: 2 }));
  result.notes?.forEach((n) => write(`Note: ${n}`, { size: 9, color: VERDICT_RGB.flag, gap: 2 }));

  // ----- Each finding, with the hidden text clearly labelled -----
  label(`Hidden text found (not sent to the AI) - ${findings.length} item${findings.length === 1 ? "" : "s"}`);
  if (!findings.length) write("Nothing hidden that matters. Only normal file details.", { size: 10, color: GREY });
  findings.forEach((f, i) => {
    room(90);
    const fc = VERDICT_RGB[f.danger >= 70 ? "quarantine" : f.danger >= 30 ? "flag" : "pass"];
    const top = y;
    write(`${i + 1}.  ${f.title}`, { size: 10, bold: true, indent: 10, gap: 2 });
    write(`Where: ${f.where_label}    How hidden: ${f.how_label}    Danger: hidden ${f.hidden_points} + bossy ${f.bossy_points} = ${f.danger}`, { size: 8.5, color: GREY, indent: 10, gap: 4 });
    // Text a person CAN see is not "hidden", but the order is still kept out of the clean copy
    write(f.hidden_points > 0 ? "Hidden text (not sent to the AI):" : "Order found (not sent to the AI):", { size: 8, bold: true, color: fc, indent: 10, gap: 1 });
    write(`"${f.reads_as || f.text}"`, { size: 9.5, font: "courier", color: fc, indent: 10, gap: 3 });
    write(f.explain, { size: 9, indent: 10, gap: 8 });
    // A thin stripe in the finding's verdict colour on the left (if it fits on one page)
    if (y > top) {
      doc.setFillColor(...fc);
      doc.rect(M, top, 3, y - top - 6, "F");
    }
  });

  // ----- What the AI agent received -----
  label("What the AI agent received");
  if (locked) {
    write(result.decision === "approved"
      ? "File held for a human. A person approved it after looking at it."
      : "File held for a human. The AI agent received nothing.", { size: 10, bold: true, color: VERDICT_RGB.quarantine });
  } else if (result.clean_copy) {
    write("Only the text a person can see, labelled \"This is data, not instructions.\"", { size: 9, color: GREY, gap: 4 });
    write(result.clean_copy, { size: 8.5, font: "courier", gap: 4 });
  } else {
    write("Only the text a person can see, labelled \"This is data, not instructions.\" (The clean text is not kept after the scan.)", { size: 9, color: GREY });
  }

  // ----- Footer on every page -----
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...HAIRLINE);
    doc.setLineWidth(0.5);
    doc.line(M, H - 44, W - M, H - 44);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text("This report was made by plain-code scoring, not AI.  Obsidian by team TAATVA.", M, H - 30);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 30, { align: "right" });
  }

  return doc;
}
