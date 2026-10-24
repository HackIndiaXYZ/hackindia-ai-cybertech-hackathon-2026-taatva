// TAATVA Obsidian - can the company part of an email (after the @) receive emails?
// We ask the internet's address book (DNS) for its "mail server" record.
// Answer: { ok: true } = can receive, { ok: false } = cannot, { ok: null } = could not tell.
// "Could not tell" never blocks anyone: the sign-up page lets them continue.

import { promises as dns } from "dns";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// "This name does not exist" or "it has no such record"
const NOT_FOUND = new Set(["ENOTFOUND", "ENODATA", "NXDOMAIN"]);

// Give the address book at most 4 seconds
function withTimeout<T>(work: Promise<T>): Promise<T> {
  return Promise.race([
    work,
    new Promise<T>((_, reject) => setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "TIMEOUT" })), 4_000)),
  ]);
}

// true = has it, false = surely does not, null = could not tell
async function has(lookup: () => Promise<unknown[]>): Promise<boolean | null> {
  try {
    return (await withTimeout(lookup())).length > 0;
  } catch (error) {
    return NOT_FOUND.has((error as { code?: string }).code ?? "") ? false : null;
  }
}

export async function POST(request: Request) {
  let email = "";
  try {
    email = String((await request.json()).email ?? "");
  } catch {}
  const domain = email.slice(email.lastIndexOf("@") + 1).trim().toLowerCase();
  if (!email.includes("@") || !domain || domain.length > 253) return NextResponse.json({ ok: false });

  // 1. Mail server record. A record that says "." means "this name never takes emails".
  try {
    const servers = await withTimeout(dns.resolveMx(domain));
    if (servers.length > 0) return NextResponse.json({ ok: !servers.every((s) => s.exchange === "" || s.exchange === ".") });
  } catch (error) {
    if (!NOT_FOUND.has((error as { code?: string }).code ?? "")) return NextResponse.json({ ok: null });
  }

  // 2. No mail server record: by the email rules, mail may still go to the website's own address
  const [v4, v6] = await Promise.all([has(() => dns.resolve4(domain)), has(() => dns.resolve6(domain))]);
  if (v4 || v6) return NextResponse.json({ ok: true });
  if (v4 === null || v6 === null) return NextResponse.json({ ok: null });
  return NextResponse.json({ ok: false });
}
