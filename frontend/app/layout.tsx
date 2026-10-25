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

export const metadata: Metadata = {
  title: "Obsidian by TAATVA",
  description: "Find, show and remove hidden instructions before an AI agent reads a file.",
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
