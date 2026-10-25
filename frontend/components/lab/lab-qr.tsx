"use client";

// TAATVA Obsidian - QR code to open the Attack Lab on a phone.
// A phone cannot open "localhost" (that name means "this same device"). So on the
// team laptop the code points to the LIVE website instead, and says so.

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone } from "lucide-react";

const LIVE_SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://obsidian-taatva.vercel.app").replace(/\/$/, "");

function isLocal(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname.endsWith(".localhost");
}

export function LabQr() {
  // Worked out in the browser only (the server does not know the address bar)
  const [link, setLink] = useState<{ url: string; local: boolean } | null>(null);
  useEffect(() => {
    const local = isLocal(window.location.hostname);
    setLink({ url: `${local ? LIVE_SITE : window.location.origin}/lab`, local });
  }, []);

  return (
    // Hidden on phones: there you already have the page open (the code is for the laptop screen)
    <section className="panel flex items-center gap-4 p-4 max-sm:hidden sm:p-5" data-qr={link?.url}>
      <div className="shrink-0 rounded-lg bg-white p-2">
        {link ? <QRCodeSVG value={link.url} size={112} level="M" marginSize={0} title="QR code to open the Attack Lab" />
          : <div className="h-[112px] w-[112px]" />}
      </div>
      <div className="min-w-0">
        <h2 className="section-title flex items-center gap-2"><Smartphone className="h-4 w-4" /> Try it on your phone</h2>
        <p className="mt-1 text-[14px] text-foreground">Scan to open the Attack Lab. You sign in, then hide your own sentence.</p>
        {link && <p className="mt-1 break-all font-mono text-[12px] text-muted-foreground">{link.url}</p>}
        {link?.local && (
          <p className="mt-1 text-[12px] text-muted-foreground">
            This laptop&apos;s address (localhost) only works on this laptop, so the code opens the live website.
            The live website reads orders with the phrase list only (Prompt Guard runs on this laptop).
          </p>
        )}
      </div>
    </section>
  );
}
