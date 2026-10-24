// TAATVA Obsidian - "which version of the website is live right now?"
// An open page compares this with its own version. Different = the page is old,
// so it asks the person to refresh (an old page may have old bugs, like "Failed to fetch").

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { version: process.env.NEXT_PUBLIC_BUILD_ID },
    { headers: { "Cache-Control": "no-store" } }, // never keep an old answer
  );
}
