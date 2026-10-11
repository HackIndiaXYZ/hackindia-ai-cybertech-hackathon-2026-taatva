// TAATVA Obsidian - after signing in, which page do we open?
// Only pages inside THIS website. Anything else becomes /scan.
// (Bug QA-09: "/\evil.com" looked like a local page, but browsers read it as another website.)

export function safeNextPage(next: string | null, origin: string): string {
  if (!next || next.includes("\\")) return "/scan";
  try {
    const url = new URL(next, origin);
    if (url.origin !== origin) return "/scan";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/scan";
  }
}
