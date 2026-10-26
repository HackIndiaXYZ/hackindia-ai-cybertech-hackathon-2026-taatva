import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { SettingsProvider } from "@/components/settings";
import { THEME_SCRIPT } from "@/components/theme";
import { UpdateBar } from "@/components/update-check";
import { AnimatedBackground } from "@/components/visual/AnimatedBackground";
import { Footer } from "@/components/visual/Footer";
import { MotionProvider } from "@/components/motion/MotionProvider";

// Three fonts ("Forensic Light Table"): Space Grotesk for titles, Inter for reading,
// and JetBrains Mono for technical text (scores, file names, hidden text).
// Only the weights we use (each weight is one more file to download on phones)
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const sans = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });
// The technical font is only used for small tags: it may load a moment later (faster first view on phones)
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", preload: false });

// The "X-Ray Eye" logo everywhere outside the page itself:
// - browser tab icon: app/icon.svg, Apple home-screen icon: app/apple-icon.png (Next.js adds both)
// - app icons for phones: app/manifest.ts
// - the picture shown when the link is shared (WhatsApp, LinkedIn, X...): public/brand/og-image.png
const SHARE_IMAGE = { url: "/brand/og-image.png", width: 1200, height: 630, alt: "Obsidian by team TAATVA: the X-Ray Eye logo" };

export const metadata: Metadata = {
  // The live website address, so shared links can find the picture
  metadataBase: new URL("https://obsidian-taatva.vercel.app"),
  title: "Obsidian by TAATVA",
  description: "Find, show and remove hidden instructions before an AI agent reads a file.",
  openGraph: {
    title: "Obsidian by TAATVA",
    description: "Find, show and remove hidden instructions before an AI agent reads a file.",
    siteName: "Obsidian",
    images: [SHARE_IMAGE],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Obsidian by TAATVA",
    description: "Find, show and remove hidden instructions before an AI agent reads a file.",
    images: [SHARE_IMAGE.url],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the theme script changes <html> before React starts
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${display.variable} ${sans.variable} ${mono.variable} flex min-h-screen flex-col`}>
        {/* The calm scanner-beam background behind every page (pictures only, no clicks) */}
        <AnimatedBackground />
        <MotionProvider>
          <SettingsProvider>
            <Header />
            <UpdateBar />
            <main className="mx-auto w-full max-w-content flex-1 px-gutter pb-16 pt-4 md:pt-6">{children}</main>
            <Footer />
          </SettingsProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
